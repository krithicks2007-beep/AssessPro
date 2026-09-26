import { getSupabaseClient } from './supabaseClient';

/**
 * AssessPro Frontend API Client
 * Communicates with the Express Backend (http://localhost:5000 via Vite proxy '/api')
 */

const API_BASE = '/api';

const safeJson = async (res) => {
  try {
    const text = await res.text();
    if (!text || !text.trim()) return {};
    return JSON.parse(text);
  } catch (err) {
    console.warn('Response could not be parsed as JSON:', err.message);
    return {};
  }
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('assesspro_auth_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // 1. Health check
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return await safeJson(res);
    } catch (err) {
      console.error('API health check error:', err);
      return { status: 'error', message: err.message };
    }
  },

  // 2. Authentication
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    if (data.session?.access_token) {
      localStorage.setItem('assesspro_auth_token', data.session.access_token);
    }


    return data;
  },

  // 3. User Profile
  async getUserProfile() {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}/user/profile`, { headers });
    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch profile');
    }
    return data;
  },

  // 4. Groups
  async getGroups() {
    let serverGroups = [];
    try {
      const res = await fetch(`${API_BASE}/groups`);
      if (res.ok) {
        const data = await safeJson(res);
        if (Array.isArray(data) && data.length > 0) serverGroups = data;
      }
    } catch (err) {
      console.warn('API getGroups fallback note:', err.message);
    }

    if (serverGroups.length === 0) {
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { data, error } = await supabase.from('groups').select('*').order('group_number');
          if (!error && Array.isArray(data) && data.length > 0) {
            serverGroups = data;
          }
        }
      } catch (err) {}
    }

    if (serverGroups.length === 0) {
      serverGroups = [
        { id: '00000000-0000-0000-0000-000000000001', group_number: 1, name: 'Programming & Logic', category: 'Core Subjects', department: 'Computer Science and Engineering', color: '#1d72fe' },
        { id: '00000000-0000-0000-0000-000000000002', group_number: 2, name: 'Electronics & Control', category: 'Professional Core', department: 'Computer Science and Engineering', color: '#10b981' },
        { id: '00000000-0000-0000-0000-000000000003', group_number: 3, name: 'Mechanical & Design', category: 'Specialization Subjects', department: 'Computer Science and Engineering', color: '#8b5cf6' }
      ];
    }

    // Merge custom groups from localStorage
    try {
      const stored = localStorage.getItem('assesspro_custom_groups');
      if (stored) {
        const customGroups = JSON.parse(stored);
        if (Array.isArray(customGroups) && customGroups.length > 0) {
          const map = new Map();
          serverGroups.forEach(g => map.set(g.id, g));
          customGroups.forEach(g => map.set(g.id, g));
          return Array.from(map.values()).sort((a, b) => (a.group_number || 0) - (b.group_number || 0));
        }
      }
    } catch (e) {}

    return serverGroups;
  },

  async createGroup(groupData) {
    let created = null;
    try {
      const res = await fetch(`${API_BASE}/groups`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(groupData)
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (data && data.id) created = data;
      }
    } catch (err) {
      console.warn('Backend createGroup fallback note:', err.message);
    }

    if (!created) {
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { data, error } = await supabase.from('groups').insert([groupData]).select();
          if (data && data[0]) created = data[0];
        }
      } catch (err) {}
    }

    if (!created) {
      const allGroups = await this.getGroups();
      const nextNum = allGroups.length + 1;
      const defaultColors = ['#1d72fe', '#10b981', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4'];
      created = {
        id: 'group-' + Date.now(),
        group_number: nextNum,
        name: groupData.name || `Group ${nextNum}`,
        category: groupData.category || 'Specialization Subjects',
        department: groupData.department || 'Mechatronics Engineering',
        color: groupData.color || defaultColors[(nextNum - 1) % defaultColors.length]
      };
    }

    try {
      const stored = localStorage.getItem('assesspro_custom_groups');
      const list = stored ? JSON.parse(stored) : [];
      list.push(created);
      localStorage.setItem('assesspro_custom_groups', JSON.stringify(list));
    } catch (e) {}

    return created;
  },

  async updateGroupName(id, name) {
    let updated = null;
    try {
      const res = await fetch(`${API_BASE}/groups/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (data && data.id) updated = data;
      }
    } catch (err) {
      console.warn('Backend updateGroupName note:', err.message);
    }

    if (!updated) {
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { data, error } = await supabase.from('groups').update({ name }).eq('id', id).select();
          if (data && data[0]) updated = data[0];
        }
      } catch (err) {}
    }

    if (!updated) {
      updated = { id, name };
    }

    try {
      const stored = localStorage.getItem('assesspro_custom_groups');
      let list = stored ? JSON.parse(stored) : [];
      const idx = list.findIndex(g => g.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], name };
      } else {
        list.push(updated);
      }
      localStorage.setItem('assesspro_custom_groups', JSON.stringify(list));
    } catch (e) {}

    return updated;
  },

  async deleteGroup(id) {
    try {
      await fetch(`${API_BASE}/groups/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    } catch (e) {}

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('groups').delete().eq('id', id);
      }
    } catch (e) {}

    try {
      const stored = localStorage.getItem('assesspro_custom_groups');
      if (stored) {
        let list = JSON.parse(stored);
        list = list.filter(g => g.id !== id);
        localStorage.setItem('assesspro_custom_groups', JSON.stringify(list));
      }
    } catch (e) {}

    return true;
  },

  // 5. Tests & Assessments
  async getTests() {
    let serverTests = [];
    try {
      const res = await fetch(`${API_BASE}/tests`);
      if (res.ok) {
        const data = await safeJson(res);
        if (Array.isArray(data) && data.length > 0) {
          serverTests = data;
        }
      }
    } catch (err) {
      console.warn('API getTests fallback note:', err.message);
    }

    // Try direct Supabase if server returned nothing or fallback
    if (serverTests.length === 0) {
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { data, error } = await supabase
            .from('tests')
            .select('*, groups(name, group_number, color)')
            .order('created_at', { ascending: false });
          if (!error && Array.isArray(data) && data.length > 0) {
            serverTests = data;
          }
        }
      } catch (err) {
        console.warn('Direct Supabase getTests note:', err.message);
      }
    }

    if (serverTests.length === 0) {
      serverTests = [
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
            { id: 3, question: 'Which algorithm is used for finding the shortest path in a weighted graph?', options: ['Dijkstra', 'DFS', 'Kruskal', 'Prim'], correct_index: 0, marks: 10 }
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
            { id: 1, question: 'In embedded systems, what is the purpose of a Watchdog Timer?', options: ['Track real time', 'Reset the MCU on software lockup', 'Generate PWM signals', 'Convert ADC values'], correct_index: 1, marks: 10 }
          ]
        }
      ];
    }

    // Merge custom tests from localStorage
    try {
      const stored = localStorage.getItem('assesspro_custom_tests');
      if (stored) {
        const customTests = JSON.parse(stored);
        if (Array.isArray(customTests) && customTests.length > 0) {
          const existingIds = new Set(serverTests.map(t => String(t.id)));
          const uniqueCustom = customTests.filter(t => !existingIds.has(String(t.id)));
          return [...uniqueCustom, ...serverTests];
        }
      }
    } catch (e) {}

    return serverTests;
  },

  async getTestById(id) {
    try {
      const res = await fetch(`${API_BASE}/tests/${id}`);
      if (res.ok) {
        const data = await safeJson(res);
        if (data && data.id) return data;
      }
    } catch (e) {}
    const all = await this.getTests();
    return all.find(t => String(t.id) === String(id)) || all[0];
  },

  async createTest(testData) {
    let created = null;

    // 1. Try Express backend
    try {
      const res = await fetch(`${API_BASE}/tests`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(testData)
      });

      if (res.ok) {
        const data = await safeJson(res);
        if (data && (data.id || data.title)) {
          created = data;
        }
      } else {
        const data = await safeJson(res);
        console.warn('Backend createTest note:', data?.error || res.status);
      }
    } catch (err) {
      console.warn('Backend createTest request failed, trying direct Supabase fallback:', err.message);
    }

    // 2. Direct Supabase Fallback if backend failed
    if (!created) {
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          const isValidUUID = (str) => typeof str === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
          
          const payload = {
            title: (testData.title || '').trim(),
            group_id: isValidUUID(testData.groupId) ? testData.groupId : '00000000-0000-0000-0000-000000000001',
            duration_minutes: parseInt(testData.durationMinutes) || 45,
            test_type: testData.testType || 'test',
            status: testData.status || 'published',
            max_score: parseInt(testData.maxScore) || 100,
            scheduled_date: testData.startTime || new Date().toISOString()
          };
          if (isValidUUID(testData.userId)) {
            payload.created_by = testData.userId;
          }

          const { data: dbCreated, error: dbErr } = await supabase.from('tests').insert([payload]).select('*, groups(name, group_number, color)');
          if (dbCreated && dbCreated[0]) {
            created = {
              ...dbCreated[0],
              questions: testData.questions || [],
              start_time: testData.startTime || new Date().toISOString(),
              end_time: testData.endTime || new Date(Date.now() + 86400000).toISOString(),
              allow_latecomers: testData.allowLatecomers !== false,
              is_demo: false
            };
          } else if (dbErr) {
            console.warn('Direct Supabase test creation warning:', dbErr.message);
          }
        }
      } catch (err) {
        console.warn('Direct Supabase creation error:', err.message);
      }
    }

    // 3. Resilient Fallback: Ensure test object is created locally
    if (!created) {
      created = {
        id: 'test-' + Date.now(),
        test_number: parseInt(testData.testNumber) || 1,
        title: (testData.title || 'Assessment Test').trim(),
        group_id: testData.groupId || '00000000-0000-0000-0000-000000000001',
        duration_minutes: parseInt(testData.durationMinutes) || 45,
        test_type: testData.testType || 'test',
        status: testData.status || 'published',
        allow_latecomers: testData.allowLatecomers !== false,
        start_time: testData.startTime || new Date().toISOString(),
        end_time: testData.endTime || new Date(Date.now() + 86400000).toISOString(),
        questions: testData.questions || [],
        total_questions: (testData.questions || []).length,
        max_score: parseInt(testData.maxScore) || 100,
        created_at: new Date().toISOString(),
        is_demo: false,
        groups: { name: 'Core Subjects', group_number: 1, color: '#1d72fe' }
      };
    }

    // Persist in localStorage so it stays even on page refresh
    try {
      const stored = localStorage.getItem('assesspro_custom_tests');
      const list = stored ? JSON.parse(stored) : [];
      list.unshift(created);
      localStorage.setItem('assesspro_custom_tests', JSON.stringify(list));
    } catch (e) {}

    return created;
  },

  async submitTest(testId, submissionData) {
    let submitted = null;
    try {
      const res = await fetch(`${API_BASE}/tests/${testId}/submit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(submissionData)
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (data && (data.id || data.score !== undefined)) {
          submitted = data;
        }
      }
    } catch (err) {
      console.warn('Backend submitTest note:', err.message);
    }

    // Direct Supabase or local calculation fallback
    if (!submitted) {
      const studentEmail = submissionData.studentEmail || submissionData.student_email || 'student@bitsathy.ac.in';
      const studentName = submissionData.studentName || submissionData.student_name || 'Student';
      
      let correct = 0;
      let totalQuestions = 10;
      let maxScore = 100;

      // Get test details to check answers
      try {
        const test = await this.getTestById(testId);
        if (test && test.questions) {
          totalQuestions = test.questions.length;
          maxScore = test.max_score || (totalQuestions * 10);
          test.questions.forEach((q, idx) => {
            const ansKey = q.id !== undefined ? q.id : idx;
            if (submissionData.answers && submissionData.answers[ansKey] === q.correct_index) {
              correct++;
            }
          });
        }
      } catch (e) {}

      const score = Math.round(correct * (maxScore / (totalQuestions || 1)));
      const percentage = Math.round((correct / (totalQuestions || 1)) * 100);

      submitted = {
        id: 'sub-' + Date.now(),
        test_id: testId,
        student_email: studentEmail,
        student_name: studentName,
        score: score,
        max_score: maxScore,
        percentage: percentage,
        correct_count: correct,
        total_questions: totalQuestions,
        tab_switch_count: submissionData.tabSwitchCount || 0,
        time_taken_seconds: submissionData.timeTakenSeconds || 0,
        status: 'completed',
        submitted_at: new Date().toISOString()
      };

      // Try inserting into Supabase
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          const isValidUUID = (str) => typeof str === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
          if (isValidUUID(testId)) {
            await supabase.from('test_submissions').insert([{
              test_id: testId,
              score: score,
              max_score: maxScore,
              status: 'completed'
            }]);
          }
        }
      } catch (e) {}
    }

    // Persist in localStorage for student & faculty view
    try {
      const studentEmail = (submitted.student_email || submissionData.studentEmail || '').toLowerCase();
      if (studentEmail) {
        const studentKey = 'assesspro_subs_' + studentEmail;
        const existingStudentSubs = JSON.parse(localStorage.getItem(studentKey) || '[]');
        existingStudentSubs.unshift(submitted);
        localStorage.setItem(studentKey, JSON.stringify(existingStudentSubs));
      }

      const allKey = 'assesspro_all_submissions';
      const existingAllSubs = JSON.parse(localStorage.getItem(allKey) || '[]');
      existingAllSubs.unshift(submitted);
      localStorage.setItem(allKey, JSON.stringify(existingAllSubs));
    } catch (e) {}

    return submitted;
  },

  async getTestSubmissions(testId) {
    let list = [];
    try {
      const res = await fetch(`${API_BASE}/tests/${testId}/submissions`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (Array.isArray(data)) list = data;
      }
    } catch (err) {
      console.warn('Fallback submissions note:', err.message);
    }

    // Merge from local storage
    try {
      const stored = localStorage.getItem('assesspro_all_submissions');
      if (stored) {
        const localSubs = JSON.parse(stored);
        if (Array.isArray(localSubs)) {
          const matching = localSubs.filter(s => String(s.test_id) === String(testId));
          const existingIds = new Set(list.map(s => String(s.id)));
          matching.forEach(s => {
            if (!existingIds.has(String(s.id))) list.push(s);
          });
        }
      }
    } catch (e) {}

    return list;
  },

  async getStudentSubmissions(email) {
    let list = [];
    const cleanEmail = (email || '').toLowerCase().trim();
    try {
      const res = await fetch(`${API_BASE}/student/submissions?email=${encodeURIComponent(cleanEmail)}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (Array.isArray(data)) list = data;
      }
    } catch (err) {}

    // Merge from localStorage
    try {
      if (cleanEmail) {
        const stored = localStorage.getItem('assesspro_subs_' + cleanEmail);
        if (stored) {
          const localSubs = JSON.parse(stored);
          if (Array.isArray(localSubs)) {
            const existingIds = new Set(list.map(s => String(s.id)));
            localSubs.forEach(s => {
              if (!existingIds.has(String(s.id))) list.push(s);
            });
          }
        }
      }
    } catch (e) {}

    return list;
  },

  async getStudentProfile(email) {
    try {
      const res = await fetch(`${API_BASE}/student/profile?email=${encodeURIComponent(email || '')}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (data && data.email) return data;
      }
    } catch (err) {}
    return null;
  },

  async saveStudentProfile(profileData) {
    try {
      const res = await fetch(`${API_BASE}/student/profile`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData)
      });
      const data = await safeJson(res);
      if (!res.ok) {
        console.warn('Backend returned non-200 for profile save:', res.status, data);
        return { success: false, fallback: true, profile: profileData };
      }
      return data;
    } catch (err) {
      console.warn('Backend saveStudentProfile connection warning:', err.message);
      return { success: true, fallback: true, profile: profileData };
    }
  },

  // 6. Admin Users
  async getAdminUsers() {
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (Array.isArray(data)) return data;
      }
    } catch (err) {
      console.warn('API getAdminUsers fallback:', err.message);
    }
    return [
      { id: '1', name: 'Krithick Raj S', mailid: 'krithickrajs.cs25@bitsathy.ac.in', UserType: 'student' },
      { id: '2', name: 'Dr. Senthil Kumar', mailid: 'senthilkumar@bitsathy.ac.in', UserType: 'staff' },
      { id: '3', name: 'Dean Academics', mailid: 'admin.academics@bitsathy.ac.in', UserType: 'admin' }
    ];
  },

  async updateUserRole(id, role) {
    const res = await fetch(`${API_BASE}/admin/users/${id}/role`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role })
    });

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update user role');
    }
    return data;
  }
};

export default api;

