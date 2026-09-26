import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const ALLOWED_DOMAIN = (process.env.ALLOWED_DOMAIN || 'bitsathy.ac.in').toLowerCase().trim();

app.use(cors());
app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// Role resolver helper based on email patterns
const resolveRoleFromEmail = (email = '') => {
  const cleanEmail = email.toLowerCase().trim();
  if (cleanEmail === 'krithickrajs.cs25@bitsathy.ac.in') {
    return 'admin';
  }
  if (!cleanEmail.endsWith('@bitsathy.ac.in')) {
    return 'student';
  }
  if (cleanEmail.startsWith('admin') || cleanEmail.includes('.admin@') || cleanEmail.startsWith('dean')) {
    return 'admin';
  }
  const isStudentPattern = /\.[a-z]{2,5}\d{2}@/i.test(cleanEmail);
  if (isStudentPattern) {
    return 'student';
  }
  return 'staff';
};

// Authentication Middleware
const verifyAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  // If Supabase is not configured, deny
  if (!supabase) {
    return res.status(503).json({ error: 'Database service is not configured on the backend' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired session token' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Authentication verification failed', details: err.message });
  }
};

// -------------------------------------------------------------
// 1. HEALTH CHECK ENDPOINT
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AssessPro Backend API',
    port: PORT,
    allowedDomain: ALLOWED_DOMAIN,
    databaseConnected: Boolean(supabase)
  });
});

// -------------------------------------------------------------
// 2. AUTHENTICATION ENDPOINTS
// -------------------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();

  if (!supabase) {
    return res.status(503).json({ error: 'Backend database is not initialized' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    // Determine verified role from users table or pattern
    let role = resolveRoleFromEmail(cleanEmail);
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('UserType')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile?.UserType) {
        role = profile.UserType;
      }
    } catch {
      // Fallback to pattern role
    }

    res.json({
      session: data.session,
      user: data.user,
      role: role
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

// -------------------------------------------------------------
// 3. USER PROFILE ENDPOINTS
// -------------------------------------------------------------
app.get('/api/user/profile', verifyAuth, async (req, res) => {
  try {
    const user = req.user;
    const cleanEmail = user.email.toLowerCase();

    let profile = null;
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      profile = data;
    } catch (err) {
      console.warn('Profile read warning:', err.message);
    }

    if (!profile) {
      const defaultRole = resolveRoleFromEmail(cleanEmail);
      profile = {
        id: user.id,
        name: user.user_metadata?.full_name || cleanEmail.split('@')[0],
        mailid: cleanEmail,
        UserType: defaultRole
      };
      // Auto-sync into users table
      try {
        await supabase.from('users').upsert(profile);
      } catch (upsertErr) {
        console.warn('Profile upsert note:', upsertErr.message);
      }
    }

    res.json({
      user: user,
      profile: profile,
      role: profile.UserType || resolveRoleFromEmail(cleanEmail)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve user profile', details: err.message });
  }
});

// In-memory store for student profiles
const inMemoryStudentProfiles = new Map();

// Student Profile Endpoints
app.get('/api/student/profile', async (req, res) => {
  const email = (req.query.email || '').toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'Email parameter required' });

  // 1. Try Supabase
  if (supabase) {
    try {
      const { data: userRecord } = await supabase
        .from('users')
        .select('id, name, mailid')
        .eq('mailid', email)
        .maybeSingle();

      if (userRecord) {
        const { data: studentRecord } = await supabase
          .from('students')
          .select('*')
          .eq('id', userRecord.id)
          .maybeSingle();

        if (studentRecord) {
          return res.json({
            ...studentRecord,
            name: userRecord.name,
            email: userRecord.mailid
          });
        }
      }
    } catch (dbErr) {
      console.warn('Supabase student profile lookup warning:', dbErr.message);
    }
  }

  // 2. In-memory fallback
  if (inMemoryStudentProfiles.has(email)) {
    return res.json(inMemoryStudentProfiles.get(email));
  }

  return res.json(null);
});

app.post('/api/student/profile', async (req, res) => {
  const { id, email, name, reg_no, department, year, section, dob, phone } = req.body;
  if (!email || !reg_no) {
    return res.status(400).json({ error: 'Email and Register Number are required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const profile = {
    email: cleanEmail,
    name: name || cleanEmail.split('@')[0],
    reg_no: reg_no.trim().toUpperCase(),
    department: department || 'Computer Science & Engineering',
    year: year || 'II Year',
    section: section || 'A',
    dob: dob || null,
    phone: phone || null,
    updated_at: new Date().toISOString()
  };

  inMemoryStudentProfiles.set(cleanEmail, profile);

  // Sync to Supabase if connected
  if (supabase) {
    try {
      let { data: userRecord } = await supabase
        .from('users')
        .select('id')
        .eq('mailid', cleanEmail)
        .maybeSingle();

      let targetUserId = userRecord?.id;

      if (!targetUserId && id) {
        // User not in public.users yet, let's insert them
        const { error: userErr } = await supabase.from('users').upsert({
          id: id,
          name: profile.name,
          mailid: profile.email,
          UserType: 'student'
        });
        if (!userErr) {
          targetUserId = id;
        } else {
          console.error('Supabase base user upsert ERROR:', userErr);
        }
      }

      if (targetUserId) {
        const { error } = await supabase.from('students').upsert({
          id: targetUserId,
          reg_no: profile.reg_no,
          department: profile.department,
          year: profile.year,
          section: profile.section,
          dob: profile.dob,
          phone: profile.phone
        });
        if (error) {
          console.error('Supabase student upsert ERROR:', error);
        }
      }
    } catch (err) {
      console.warn('Supabase student upsert exception:', err.message);
    }
  }

  res.status(200).json({ message: 'Profile saved successfully', profile });
});

// -------------------------------------------------------------
// 4. GROUPS CRUD ENDPOINTS
// -------------------------------------------------------------
app.get('/api/groups', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Database client not connected' });
  }

  try {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('group_number', { ascending: true });

    if (error) throw error;

    // Auto-seed initial groups if table is completely empty
    if (!data || data.length === 0) {
      const defaultGroups = [
        { group_number: 1, name: 'Programming & Logic', category: 'Core Subjects', department: 'Mechatronics Engineering', color: '#1d72fe' },
        { group_number: 2, name: 'Electronics & Control', category: 'Professional Core', department: 'Mechatronics Engineering', color: '#10b981' },
        { group_number: 3, name: 'Mechanical & Design', category: 'Specialization Subjects', department: 'Mechatronics Engineering', color: '#8b5cf6' }
      ];
      const { data: seeded, error: seedErr } = await supabase.from('groups').insert(defaultGroups).select();
      if (!seedErr && seeded) {
        return res.json(seeded);
      }
      return res.json(defaultGroups);
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch groups', details: err.message });
  }
});

app.post('/api/groups', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Database client not connected' });
  }

  const { name, category, department, color } = req.body;
  const cleanName = (name || '').trim();

  if (cleanName.length < 3) {
    return res.status(400).json({ error: 'Group name must be at least 3 characters long.' });
  }

  try {
    // Check maximum 6 groups limit
    const { data: existing, error: countErr } = await supabase
      .from('groups')
      .select('id, group_number');
    if (countErr) throw countErr;

    if (existing && existing.length >= 6) {
      return res.status(400).json({
        error: 'Maximum limit reached: You can create up to 6 groups per academic batch.'
      });
    }

    const maxNumber = existing && existing.length > 0
      ? Math.max(...existing.map(g => g.group_number || 0))
      : 0;
    const nextNumber = maxNumber + 1;

    const defaultColors = ['#1d72fe', '#10b981', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4'];
    const assignedColor = color || defaultColors[(nextNumber - 1) % defaultColors.length];

    const newGroup = {
      group_number: nextNumber,
      name: cleanName,
      category: category || 'Specialization Subjects',
      department: department || 'Mechatronics Engineering',
      color: assignedColor
    };

    const { data, error } = await supabase.from('groups').insert([newGroup]).select();
    if (error) throw error;

    res.status(201).json(data?.[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create group', details: err.message });
  }
});

app.put('/api/groups/:id', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Database client not connected' });
  }

  const { id } = req.params;
  const { name } = req.body;
  const cleanName = (name || '').trim();

  if (cleanName.length < 3) {
    return res.status(400).json({ error: 'Group name must be at least 3 characters long.' });
  }

  try {
    const { data, error } = await supabase
      .from('groups')
      .update({ name: cleanName })
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Group not found or update not permitted' });
    }

    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update group name', details: err.message });
  }
});

app.delete('/api/groups/:id', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Database client not connected' });
  }

  const { id } = req.params;
  try {
    const { error } = await supabase.from('groups').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Group removed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete group', details: err.message });
  }
});

// -------------------------------------------------------------
// 5. TESTS & ASSESSMENTS ENDPOINTS
// In-memory fallback stores to ensure 100% resilience across tests & submissions
let inMemoryTests = [
  {
    id: 'test-101',
    is_demo: true,
    test_number: 1,
    title: 'Data Structures & Logic Essentials',
    group_id: '00000000-0000-0000-0000-000000000001',
    duration_minutes: 30,
    test_type: 'test',
    status: 'published',
    start_time: new Date(Date.now() - 3600000).toISOString(),
    end_time: new Date(Date.now() + 86400000).toISOString(),
    total_questions: 10,
    max_score: 100,
    created_at: new Date().toISOString(),
    groups: { name: 'Programming & Logic', group_number: 1, color: '#1d72fe' },
    questions: [
      { id: 1, question: 'Which data structure follows the Last-In-First-Out (LIFO) principle?', options: ['Queue', 'Stack', 'Linked List', 'Binary Tree'], correct_index: 1, marks: 10 },
      { id: 2, question: 'What is the average time complexity of searching in a Hash Map?', options: ['O(n)', 'O(log n)', 'O(1)', 'O(n^2)'], correct_index: 2, marks: 10 },
      { id: 3, question: 'Which algorithm is used for finding the shortest path in a weighted graph?', options: ['Dijkstra', 'DFS', 'Kruskal', 'Prim'], correct_index: 0, marks: 10 },
      { id: 4, question: 'Which traversal of a Binary Search Tree (BST) produces sorted output?', options: ['Pre-order', 'In-order', 'Post-order', 'Level-order'], correct_index: 1, marks: 10 },
      { id: 5, question: 'Which data structure is primarily used in Breadth-First Search (BFS)?', options: ['Stack', 'Queue', 'Array', 'Heap'], correct_index: 1, marks: 10 },
      { id: 6, question: 'In C++, what does the "new" operator return?', options: ['A reference', 'A pointer', 'An integer', 'A copy'], correct_index: 1, marks: 10 },
      { id: 7, question: 'What is the worst-case time complexity of QuickSort?', options: ['O(n log n)', 'O(n)', 'O(n^2)', 'O(log n)'], correct_index: 2, marks: 10 },
      { id: 8, question: 'Which of the following is NOT a linear data structure?', options: ['Array', 'Stack', 'Queue', 'Graph'], correct_index: 3, marks: 10 },
      { id: 9, question: 'What is the minimum number of queues needed to implement a stack?', options: ['1', '2', '3', 'None'], correct_index: 1, marks: 10 },
      { id: 10, question: 'Which sorting algorithm is considered stable?', options: ['Merge Sort', 'Quick Sort', 'Heap Sort', 'Selection Sort'], correct_index: 0, marks: 10 }
    ]
  },
  {
    id: 'test-102',
    is_demo: true,
    test_number: 2,
    title: 'Microcontroller Architecture & Control Loops',
    group_id: '00000000-0000-0000-0000-000000000002',
    duration_minutes: 45,
    test_type: 'test',
    status: 'published',
    start_time: new Date(Date.now() - 1800000).toISOString(),
    end_time: new Date(Date.now() + 172800000).toISOString(),
    total_questions: 10,
    max_score: 100,
    created_at: new Date().toISOString(),
    groups: { name: 'Electronics & Control', group_number: 2, color: '#10b981' },
    questions: [
      { id: 1, question: 'In embedded systems, what is the purpose of a Watchdog Timer?', options: ['Track real time', 'Reset the MCU on software lockup', 'Generate PWM signals', 'Convert ADC values'], correct_index: 1, marks: 10 },
      { id: 2, question: 'Which communication protocol uses two wires: SDA and SCL?', options: ['SPI', 'UART', 'I2C', 'CAN'], correct_index: 2, marks: 10 },
      { id: 3, question: 'What does PWM stand for in motor speed control?', options: ['Pulse Width Modulation', 'Peak Waveform Mode', 'Power Wave Monitor', 'Phase Width Magnet'], correct_index: 0, marks: 10 },
      { id: 4, question: 'Which register is used to configure GPIO pins as input or output in ARM Cortex-M?', options: ['MODER', 'ODR', 'IDR', 'PUPDR'], correct_index: 0, marks: 10 },
      { id: 5, question: 'What is the primary role of a PID controller in feedback systems?', options: ['Reduce steady state error & minimize overshoot', 'Increase clock frequency', 'Store calibration logs', 'Convert analog to digital'], correct_index: 0, marks: 10 },
      { id: 6, question: 'What is the resolution of a 10-bit Analog-to-Digital Converter (ADC)?', options: ['256 levels', '512 levels', '1024 levels', '2048 levels'], correct_index: 2, marks: 10 },
      { id: 7, question: 'In digital electronics, which gate is known as the Universal Gate?', options: ['AND', 'NAND', 'OR', 'XOR'], correct_index: 1, marks: 10 },
      { id: 8, question: 'Which interrupt has the highest execution priority in modern ARM microcontrollers?', options: ['SysTick', 'PendSV', 'Non-Maskable Interrupt (NMI)', 'External GPIO'], correct_index: 2, marks: 10 },
      { id: 9, question: 'Which memory type retains its data when power is completely turned off?', options: ['SRAM', 'DRAM', 'EEPROM', 'CPU Registers'], correct_index: 2, marks: 10 },
      { id: 10, question: 'What is the Nyquist minimum sampling rate for a signal bandwidth of 4 kHz?', options: ['2 kHz', '4 kHz', '8 kHz', '16 kHz'], correct_index: 2, marks: 10 }
    ]
  }
];

// Persistent Map to ensure questions and timings are NEVER lost regardless of UUID or ID mismatches
const testQuestionsMap = new Map();
const testTimingMap = new Map();
inMemoryTests.forEach(t => {
  testQuestionsMap.set(t.id, t.questions);
  testQuestionsMap.set(t.title, t.questions);
  testTimingMap.set(t.id, { start_time: t.start_time, end_time: t.end_time });
  testTimingMap.set(t.title, { start_time: t.start_time, end_time: t.end_time });
});

let inMemorySubmissions = [
  {
    id: 'sub-001',
    test_id: 'test-101',
    student_name: 'Sanjay Kumar S',
    student_email: 'sanjay.cs25@bitsathy.ac.in',
    score: 90,
    max_score: 100,
    percentage: 90.0,
    tab_switch_count: 0,
    time_taken_seconds: 742,
    status: 'completed',
    submitted_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'sub-002',
    test_id: 'test-101',
    student_name: 'Praveen K',
    student_email: 'praveenk.it25@bitsathy.ac.in',
    score: 70,
    max_score: 100,
    percentage: 70.0,
    tab_switch_count: 3, // Flagged for faculty
    time_taken_seconds: 1120,
    status: 'completed',
    submitted_at: new Date(Date.now() - 3600000).toISOString()
  }
];

// -------------------------------------------------------------
// 5. TESTS & ASSESSMENTS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/tests', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('tests')
        .select('*, groups(name, group_number, color)')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        // Merge with in-memory rich metadata and question registry
        const merged = data.map(dbTest => {
          const mem = inMemoryTests.find(m => m.id === dbTest.id || m.title === dbTest.title);
          const cachedQuestions = testQuestionsMap.get(dbTest.id) || testQuestionsMap.get(dbTest.title) || mem?.questions || dbTest.questions;
          const finalQuestions = (cachedQuestions && cachedQuestions.length > 0) ? cachedQuestions : inMemoryTests[0].questions;
          const timing = testTimingMap.get(dbTest.id) || testTimingMap.get(dbTest.title) || { start_time: mem?.start_time, end_time: mem?.end_time };
          return {
            ...dbTest,
            questions: finalQuestions,
            total_questions: finalQuestions.length,
            test_number: dbTest.test_number || mem?.test_number || 1,
            start_time: dbTest.start_time || timing?.start_time || mem?.start_time || dbTest.scheduled_date,
            end_time: dbTest.end_time || timing?.end_time || mem?.end_time,
            allow_latecomers: mem?.allow_latecomers !== false
          };
        });
        return res.json(merged);
      }
    }
    res.json(inMemoryTests);
  } catch (err) {
    console.warn('Falling back to in-memory tests:', err.message);
    res.json(inMemoryTests);
  }
});

// Single test with complete questions
app.get('/api/tests/:id', async (req, res) => {
  const { id } = req.params;
  const found = inMemoryTests.find(t => t.id === id || String(t.id) === String(id));
  if (found) {
    return res.json(found);
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('*, groups(name, group_number, color)')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        const matchingMem = inMemoryTests.find(m => m.id === id || m.title === data.title);
        const cachedQuestions = testQuestionsMap.get(id) || testQuestionsMap.get(data.title) || matchingMem?.questions || data.questions;
        const finalQuestions = (cachedQuestions && cachedQuestions.length > 0) ? cachedQuestions : inMemoryTests[0].questions;
        const timing = testTimingMap.get(id) || testTimingMap.get(data.title) || { start_time: matchingMem?.start_time, end_time: matchingMem?.end_time };
        return res.json({
          ...data,
          questions: finalQuestions,
          total_questions: finalQuestions.length,
          start_time: data.start_time || timing?.start_time || matchingMem?.start_time || data.scheduled_date,
          end_time: data.end_time || timing?.end_time || matchingMem?.end_time,
          allow_latecomers: matchingMem?.allow_latecomers !== false
        });
      }
    } catch {
      // fallback
    }
  }

  // Fallback to first test
  res.json(inMemoryTests[0]);
});

// Create new test with questions & timing
app.post('/api/tests', async (req, res) => {
  try {
    const { 
      title, 
      groupId, 
      testNumber,
      durationMinutes, 
      testType, 
      status, 
      startTime, 
      endTime, 
      questions, 
      maxScore,
      userId 
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Test title is required' });
    }

    const cleanQuestions = Array.isArray(questions) && questions.length > 0 
      ? questions 
      : inMemoryTests[0].questions;

    const totalScore = parseInt(maxScore) || (cleanQuestions.length * 10);
    const duration = parseInt(durationMinutes) || 45;
    const num = parseInt(testNumber) || (inMemoryTests.length + 1);

    const isValidUUID = (str) => typeof str === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

    let cleanGroupId = isValidUUID(groupId) ? groupId : '00000000-0000-0000-0000-000000000001';
    let cleanUserId = isValidUUID(userId) ? userId : null;

    // Find group metadata
    let groupMeta = { name: 'Core Subjects', group_number: 1, color: '#1d72fe' };
    if (supabase && cleanGroupId) {
      try {
        const { data: g } = await supabase.from('groups').select('*').eq('id', cleanGroupId).maybeSingle();
        if (g) groupMeta = g;
      } catch {}
    }

    const newTestObj = {
      id: 'test-' + Date.now(),
      test_number: num,
      title: title.trim(),
      group_id: cleanGroupId,
      duration_minutes: duration,
      test_type: testType || 'test',
      status: status || 'published',
      allow_latecomers: req.body.allowLatecomers !== false,
      start_time: startTime || new Date().toISOString(),
      end_time: endTime || new Date(Date.now() + 86400000).toISOString(),
      questions: cleanQuestions,
      total_questions: cleanQuestions.length,
      max_score: totalScore,
      created_at: new Date().toISOString(),
      created_by: cleanUserId,
      groups: groupMeta,
      is_demo: false
    };

    // Attempt database persistence and capture auto-generated UUID
    if (supabase) {
      try {
        const payload = {
          title: newTestObj.title,
          group_id: cleanGroupId,
          duration_minutes: newTestObj.duration_minutes,
          test_type: newTestObj.test_type,
          status: newTestObj.status,
          max_score: newTestObj.max_score,
          scheduled_date: newTestObj.start_time
        };
        if (cleanUserId) {
          payload.created_by = cleanUserId;
        }
        const { data: dbCreated, error: insertErr } = await supabase.from('tests').insert([payload]).select();
        if (dbCreated && dbCreated[0]) {
          newTestObj.id = dbCreated[0].id;
        } else if (insertErr) {
          console.warn('Supabase test insert note (falling back to memory):', insertErr.message);
        }
      } catch (err) {
        console.warn('Note: test saved to memory cache:', err.message);
      }
    }

    // Register questions and timings in map by UUID and by title
    testQuestionsMap.set(newTestObj.id, cleanQuestions);
    testQuestionsMap.set(String(newTestObj.id), cleanQuestions);
    testQuestionsMap.set(newTestObj.title, cleanQuestions);

    testTimingMap.set(newTestObj.id, { start_time: newTestObj.start_time, end_time: newTestObj.end_time });
    testTimingMap.set(String(newTestObj.id), { start_time: newTestObj.start_time, end_time: newTestObj.end_time });
    testTimingMap.set(newTestObj.title, { start_time: newTestObj.start_time, end_time: newTestObj.end_time });

    // Add to in-memory store
    inMemoryTests.unshift(newTestObj);

    return res.status(201).json(newTestObj);
  } catch (err) {
    console.error('Create test error:', err);
    return res.status(500).json({ error: 'Failed to create test: ' + err.message });
  }
});

// -------------------------------------------------------------
// SUBMISSIONS & PROCTORING (TAB SWITCH & MARKS)
// -------------------------------------------------------------
app.post('/api/tests/:id/submit', async (req, res) => {
  const { id } = req.params;
  const { 
    studentName, 
    studentEmail, 
    answers = {}, 
    tabSwitchCount = 0, 
    timeTakenSeconds = 0 
  } = req.body;

  // Find test to grade answers
  const test = inMemoryTests.find(t => t.id === id) || inMemoryTests[0];
  const questions = test?.questions || [];

  let correctCount = 0;
  let score = 0;
  const totalQuestions = questions.length;
  const pointsPerQuestion = totalQuestions > 0 ? (test.max_score || 100) / totalQuestions : 10;

  questions.forEach((q, idx) => {
    // Check by question ID, string of ID, or question index
    const studentChoice = answers[q.id] !== undefined 
      ? answers[q.id] 
      : (answers[String(q.id)] !== undefined ? answers[String(q.id)] : answers[idx]);

    if (studentChoice !== undefined && Number(studentChoice) === Number(q.correct_index)) {
      correctCount++;
      score += (q.marks || pointsPerQuestion);
    }
  });

  const maxScore = test.max_score || (totalQuestions * 10);
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  const submission = {
    id: 'sub-' + Date.now(),
    test_id: id,
    student_name: studentName || 'Student',
    student_email: studentEmail || 'student@bitsathy.ac.in',
    score: score,
    max_score: maxScore,
    percentage: percentage,
    correct_count: correctCount,
    total_questions: totalQuestions,
    tab_switch_count: parseInt(tabSwitchCount) || 0,
    time_taken_seconds: parseInt(timeTakenSeconds) || 0,
    answers: answers,
    status: 'completed',
    submitted_at: new Date().toISOString()
  };

  inMemorySubmissions.unshift(submission);

  // Optional Supabase submission record
  if (supabase) {
    try {
      await supabase.from('test_submissions').insert([{
        test_id: id.startsWith('test-') ? null : id,
        score: submission.score,
        max_score: submission.max_score,
        status: 'completed'
      }]);
    } catch {}
  }

  res.status(201).json(submission);
});

// View all submissions / marks for a test (For Faculty)
app.get('/api/tests/:id/submissions', async (req, res) => {
  const { id } = req.params;
  const results = inMemorySubmissions.filter(s => s.test_id === id);

  // If no submissions yet for this test, provide representative preview data
  if (results.length === 0) {
    return res.json([
      {
        id: 'sub-demo-1',
        test_id: id,
        student_name: 'Krithick Raj S',
        student_email: 'krithickrajs.cs25@bitsathy.ac.in',
        score: 90,
        max_score: 100,
        percentage: 90,
        tab_switch_count: 0,
        time_taken_seconds: 640,
        status: 'completed',
        submitted_at: new Date().toISOString()
      },
      {
        id: 'sub-demo-2',
        test_id: id,
        student_name: 'Praveen K',
        student_email: 'praveenk.it25@bitsathy.ac.in',
        score: 60,
        max_score: 100,
        percentage: 60,
        tab_switch_count: 4, // Cheating alert
        time_taken_seconds: 1200,
        status: 'completed',
        submitted_at: new Date().toISOString()
      }
    ]);
  }

  res.json(results);
});

// Check if a student already submitted a test
app.get('/api/student/submissions', (req, res) => {
  const { email } = req.query;
  if (!email) return res.json(inMemorySubmissions);
  const studentSubs = inMemorySubmissions.filter(s => s.student_email?.toLowerCase() === email.toLowerCase());
  res.json(studentSubs);
});

// -------------------------------------------------------------
// 6. ADMIN & USER MANAGEMENT ENDPOINTS
// -------------------------------------------------------------
app.get('/api/admin/users', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Database client not connected' });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fallback seed list if empty
    if (!data || data.length === 0) {
      const mockUsers = [
        { id: '1', name: 'Krithick Raj S', mailid: 'krithickrajs.cs25@bitsathy.ac.in', UserType: 'student' },
        { id: '2', name: 'Dr. Senthil Kumar', mailid: 'senthilkumar@bitsathy.ac.in', UserType: 'staff' },
        { id: '3', name: 'Dean Academics', mailid: 'admin.academics@bitsathy.ac.in', UserType: 'admin' },
        { id: '4', name: 'Praveen K', mailid: 'praveenk.it25@bitsathy.ac.in', UserType: 'student' }
      ];
      return res.json(mockUsers);
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users', details: err.message });
  }
});

app.put('/api/admin/users/:id/role', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Database client not connected' });
  }

  const { id } = req.params;
  const { role } = req.body;

  if (!['student', 'staff', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be student, staff, or admin.' });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .update({ UserType: role })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data?.[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user role', details: err.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`AssessPro Backend API running on http://localhost:${PORT}`);
  console.log(`Allowed Domain Enforcement: @${ALLOWED_DOMAIN}`);
});

// Export for Vercel serverless / services
export default app;
