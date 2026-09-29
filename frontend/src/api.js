import { getSupabaseClient } from './supabaseClient';

/**
 * AssessPro Frontend API Client
 * Communicates with the Express Backend (http://localhost:5000 via Vite proxy '/api')
 */

let API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
if (!API_BASE.endsWith('/api')) {
  API_BASE += '/api';
}

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


const fetchWithTimeout = async (url, options = {}, timeout = 8000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    if (response.status === 401 && !url.includes('/auth/login')) {
      console.error('API returned 401 Unauthorized. Dispatching session-expired. URL:', url);
      window.dispatchEvent(new CustomEvent('session-expired'));
    }
    return response;
  } catch (err) {
    clearTimeout(id);
    throw new Error(err.name === 'AbortError' ? 'Request timed out' : err.message);
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
      const res = await fetchWithTimeout(`${API_BASE}/health`);
      return await safeJson(res);
    } catch (err) {
      console.error('API health check error:', err);
      return { status: 'error', message: err.message };
    }
  },

  // 2. Authentication
  async login(email, password) {
    const res = await fetchWithTimeout(`${API_BASE}/auth/login`, {
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
    const res = await fetchWithTimeout(`${API_BASE}/user/profile`, { headers });
    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch profile');
    }
    return data;
  },

  // 3b. Active Sessions Heartbeat
  async sendHeartbeat(email, name, role, status = 'Online - Active', testId = null) {
    if (!email) return;
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase
          .from('active_sessions')
          .upsert({
            user_email: email,
            user_name: name,
            role: role,
            status: status,
            test_id: testId,
            last_heartbeat: new Date().toISOString()
          }, { onConflict: 'user_email' });
      }
    } catch (err) {
      console.warn('Heartbeat failed:', err.message);
    }
  },

  // 4. Groups
  async getGroups() {
    let serverGroups = [];
    try {
      const res = await fetchWithTimeout(`${API_BASE}/groups`, {
        headers: getAuthHeaders()
      });
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
      const res = await fetchWithTimeout(`${API_BASE}/groups`, {
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
      const res = await fetchWithTimeout(`${API_BASE}/groups/${id}`, {
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
      await fetchWithTimeout(`${API_BASE}/groups/${id}`, {
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
  async updateTest(id, testPayload) {
    let updated = null;
    try {
      const res = await fetchWithTimeout(`${API_BASE}/tests/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(testPayload)
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (data && (data.id || data.title)) updated = data;
      }
    } catch (err) {
      console.warn('API updateTest note (proceeding with fallback sync):', err.message);
    }

    // Direct Supabase update fallback
    if (!updated) {
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          const payload = {};
          if (testPayload.title !== undefined) payload.title = testPayload.title;
          if (testPayload.status !== undefined) payload.status = testPayload.status;
          if (testPayload.durationMinutes !== undefined) payload.duration_minutes = testPayload.durationMinutes;
          if (testPayload.totalQuestions !== undefined) payload.total_questions = testPayload.totalQuestions;
          if (testPayload.maxScore !== undefined) payload.max_score = testPayload.maxScore;
          if (testPayload.assignedStudents !== undefined) payload.assigned_students = testPayload.assignedStudents;

          const { data } = await supabase
            .from('tests')
            .update(payload)
            .eq('id', id)
            .select()
            .maybeSingle();

          if (data) updated = data;
        }
      } catch (e) {}
    }

    // Local storage persistence fallback
    try {
      const stored = localStorage.getItem('assesspro_custom_tests');
      const list = stored ? JSON.parse(stored) : [];
      const idx = list.findIndex(t => String(t.id) === String(id));
      const testRecord = {
        id,
        ...testPayload,
        questions: testPayload.questions || (idx !== -1 ? list[idx].questions : []),
        uploaded_file_name: testPayload.uploaded_file_name || testPayload.uploadedFileName || (idx !== -1 ? list[idx].uploaded_file_name : ''),
        uploadedFileName: testPayload.uploadedFileName || testPayload.uploaded_file_name || (idx !== -1 ? list[idx].uploadedFileName : ''),
        total_questions: testPayload.questions ? testPayload.questions.length : (idx !== -1 ? list[idx].total_questions : 0)
      };

      if (idx !== -1) {
        list[idx] = { ...list[idx], ...testRecord };
      } else {
        list.unshift(testRecord);
      }
      localStorage.setItem('assesspro_custom_tests', JSON.stringify(list));
      if (!updated) updated = testRecord;
    } catch (e) {}

    if (!updated) {
      updated = { id, ...testPayload };
    }

    return updated;
  },

  async getTests(options = {}) {
    let studentEmail = '';
    let staffEmail = '';
    let staffId = '';
    if (typeof options === 'string') {
      studentEmail = options;
    } else if (options && typeof options === 'object') {
      studentEmail = options.studentEmail || '';
      staffEmail = options.staffEmail || '';
      staffId = options.staffId || '';
    }

    const queryParams = new URLSearchParams();
    if (studentEmail) queryParams.set('student_email', studentEmail);
    if (staffEmail) queryParams.set('staff_email', staffEmail);
    if (staffId) queryParams.set('staff_id', staffId);

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

    try {
      const res = await fetchWithTimeout(`${API_BASE}/tests${queryString}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (Array.isArray(data)) {
          return data;
        }
      }
    } catch (err) {
      console.warn('API getTests network note:', err.message);
    }

    // Direct Supabase fallback only if Express backend is unreachable
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('tests')
          .select('*, groups(name, group_number, color)')
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          const stored = localStorage.getItem('assesspro_custom_tests');
          const localList = stored ? JSON.parse(stored) : [];
          let list = data.map(dbTest => {
            const local = localList.find(l => String(l.id) === String(dbTest.id) || l.title === dbTest.title);
            const mergedQuestions = (local?.questions && local.questions.length > 0) ? local.questions : (dbTest.questions || []);
            const filename = local?.uploaded_file_name || local?.uploadedFileName || dbTest.uploaded_file_name || (mergedQuestions.length > 0 ? (dbTest.title ? `${dbTest.title} (Saved Assessment File)` : `Saved Questions (${mergedQuestions.length} MCQs)`) : '');
            return {
              ...dbTest,
              questions: mergedQuestions,
              created_by_email: local?.created_by_email || local?.userEmail || dbTest.created_by_email,
              uploaded_file_name: filename,
              uploadedFileName: filename,
              total_questions: mergedQuestions.length || dbTest.total_questions || 0,
              assigned_students: local?.assignedStudents || local?.assigned_students || dbTest.assigned_students || []
            };
          });

          if (staffEmail || staffId) {
            list = list.filter(t => {
              const matchesEmail = staffEmail && (
                (t.created_by_email && t.created_by_email.toLowerCase() === staffEmail.toLowerCase()) ||
                (t.userEmail && t.userEmail.toLowerCase() === staffEmail.toLowerCase())
              );
              const matchesId = staffId && String(t.created_by) === String(staffId);
              return matchesEmail || matchesId;
            });
          }

          if (studentEmail) {
            list = list.filter(t => {
              if (!t.assigned_students || t.assigned_students.length === 0) return true;
              return t.assigned_students.map(e => (typeof e === 'string' ? e : e?.email || '').toLowerCase()).includes(studentEmail.toLowerCase());
            });
          }

          return list;
        }
      }
    } catch (err) {
      console.warn('Direct Supabase getTests note:', err.message);
    }

    return [];
  },

  async getTestById(id) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/tests/${id}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (data && data.id) return data;
      }
      if (res.status === 404) return null; // explicitly not found
    } catch (e) {}
    const all = await this.getTests();
    return all.find(t => String(t.id) === String(id)) || null; // null, not all[0]
  },

  async createTest(testData) {
    let created = null;

    // 1. Try Express backend
    try {
      const res = await fetchWithTimeout(`${API_BASE}/tests`, {
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
          
          let cleanGId = isValidUUID(testData.groupId) ? testData.groupId : null;
          if (!cleanGId) {
            const { data: gList } = await supabase.from('groups').select('id').order('group_number', { ascending: true }).limit(1);
            if (gList && gList[0]) cleanGId = gList[0].id;
          }

          const payload = {
            title: (testData.title || '').trim(),
            group_id: cleanGId,
            duration_minutes: parseInt(testData.durationMinutes) || 45,
            test_type: testData.testType || 'test',
            status: testData.status || 'published',
            max_score: parseInt(testData.maxScore) || 100,
            scheduled_date: testData.startTime || new Date().toISOString(),
            assigned_students: Array.isArray(testData.assignedStudents) ? testData.assignedStudents : []
          };
          if (isValidUUID(testData.userId)) {
            const { data: u } = await supabase.from('users').select('id').eq('id', testData.userId).maybeSingle();
            if (u) payload.created_by = testData.userId;
          }

          let { data: dbCreated, error: dbErr } = await supabase.from('tests').insert([payload]).select('*, groups(name, group_number, color)');
          if (dbErr && (dbErr.message?.includes('assigned_students') || dbErr.code === '42703')) {
            delete payload.assigned_students;
            const retry = await supabase.from('tests').insert([payload]).select('*, groups(name, group_number, color)');
            dbCreated = retry.data;
            dbErr = retry.error;
          }
          if (dbCreated && dbCreated[0]) {
            created = {
              ...dbCreated[0],
              questions: testData.questions || [],
              start_time: testData.startTime || new Date().toISOString(),
              end_time: testData.endTime || new Date(Date.now() + 86400000).toISOString(),
              allow_latecomers: testData.allowLatecomers !== false,
              is_demo: false,
              assigned_students: Array.isArray(testData.assignedStudents) ? testData.assignedStudents : []
            };
          } else if (dbErr) {
            console.warn('Direct Supabase test creation warning:', dbErr.message);
          }
        }
      } catch (err) {
        console.warn('Direct Supabase creation error:', err.message);
      }
    }

    if (!created) {
      throw new Error('Assessment could not be saved. Please try again.');
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

  async deleteTest(testId, keepData = false) {
    // 1. Remove from localStorage immediately so it never resurrects
    try {
      const stored = localStorage.getItem('assesspro_custom_tests');
      if (stored) {
        const list = JSON.parse(stored);
        const filtered = list.filter(t => String(t.id) !== String(testId));
        localStorage.setItem('assesspro_custom_tests', JSON.stringify(filtered));
      }
    } catch (e) {}

    // 2. Local storage sync: purge submission records if keepData is false
    if (!keepData) {
      try {
        const stored = localStorage.getItem('assesspro_all_submissions');
        if (stored) {
          const subs = JSON.parse(stored);
          const filtered = subs.filter(s => String(s.test_id) !== String(testId));
          localStorage.setItem('assesspro_all_submissions', JSON.stringify(filtered));
        }
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('assesspro_subs_')) {
            const subs = JSON.parse(localStorage.getItem(key) || '[]');
            const filtered = subs.filter(s => String(s.test_id) !== String(testId));
            localStorage.setItem(key, JSON.stringify(filtered));
          }
        }
      } catch (e) {}
    }

    // 3. Call backend API
    try {
      await fetchWithTimeout(`${API_BASE}/tests/${testId}?keepData=${keepData}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    } catch (err) {
      console.warn('Backend deleteTest note (proceeding with local sync):', err.message);
    }

    // 4. Direct Supabase deletion fallback
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const isValidUUID = (str) => typeof str === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
        if (isValidUUID(testId)) {
          if (!keepData) {
            await supabase.from('test_submissions').delete().eq('test_id', testId);
          }
          await supabase.from('tests').delete().eq('id', testId);
        }
      }
    } catch (e) {}

    return true;
  },

  async submitTest(testId, submissionData) {
    let submitted = null;
    try {
      const res = await fetchWithTimeout(`${API_BASE}/tests/${testId}/submit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(submissionData)
      }, 5000);

      if (res.ok) {
        const data = await safeJson(res);
        if (data && (data.id || data.score !== undefined)) {
          submitted = data;
        }
      } else {
        const errData = await safeJson(res);
        const serverError = errData?.error || await res.text();
        throw new Error(serverError || 'Submission was not confirmed by the server');
      }
    } catch (err) {
      throw new Error(`Submission could not be saved: ${err.message}`);
    }

    if (!submitted) {
      throw new Error('Submission was not confirmed by the server');
    }

    // Persist in localStorage for student & faculty view
    try {
      const studentEmail = (submitted.student_email || submissionData.studentEmail || '').toLowerCase().trim();
      if (studentEmail) {
        const studentKey = 'assesspro_subs_' + studentEmail;
        const existingStudentSubs = JSON.parse(localStorage.getItem(studentKey) || '[]');
        const filteredStudentSubs = existingStudentSubs.filter(s => String(s.test_id) !== String(testId));
        filteredStudentSubs.unshift(submitted);
        localStorage.setItem(studentKey, JSON.stringify(filteredStudentSubs));
      }

      const allKey = 'assesspro_all_submissions';
      const existingAllSubs = JSON.parse(localStorage.getItem(allKey) || '[]');
      const filteredAllSubs = existingAllSubs.filter(s => !(String(s.test_id) === String(testId) && (s.student_email || '').toLowerCase().trim() === studentEmail));
      filteredAllSubs.unshift(submitted);
      localStorage.setItem(allKey, JSON.stringify(filteredAllSubs));
    } catch (e) {}

    return submitted;
  },

  async getTestSubmissions(testId) {
    let list = [];
    try {
      const res = await fetchWithTimeout(`${API_BASE}/tests/${testId}/submissions`, {
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
          matching.forEach(s => list.push(s));
        }
      }
    } catch (e) {}

    // Deduplicate by student email so each student only appears once per test
    const subMap = new Map();
    list.forEach(s => {
      const email = (s.student_email || s.email || '').toLowerCase().trim();
      const key = email || String(s.id || Math.random());
      if (!subMap.has(key)) {
        subMap.set(key, s);
      }
    });

    return Array.from(subMap.values());
  },

  async getStudentSubmissions(email) {
    const cleanEmail = (email || '').toLowerCase().trim();
    try {
      const res = await fetchWithTimeout(`${API_BASE}/student/submissions?email=${encodeURIComponent(cleanEmail)}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (Array.isArray(data)) return data;
      }
    } catch (err) {
      console.warn('Backend getStudentSubmissions network note:', err.message);
    }

    // Direct Supabase fallback
    try {
      const supabase = getSupabaseClient();
      if (supabase && cleanEmail) {
        const { data, error } = await supabase
          .from('test_submissions')
          .select('*')
          .eq('student_email', cleanEmail)
          .order('submitted_at', { ascending: false });
        if (!error && Array.isArray(data)) return data;
      }
    } catch (e) {}

    return [];
  },

  async getStudentProfile(email) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/student/profile?email=${encodeURIComponent(email || '')}`, {
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
    const res = await fetchWithTimeout(`${API_BASE}/student/profile`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData)
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || `Profile save failed (${res.status})`);
    return data;
  },

  // 6. Admin Users
  async getAdminUsers() {
    // 1. Try backend API route
    try {
      const res = await fetchWithTimeout(`${API_BASE}/admin/users`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (e) {
      console.warn('Backend getAdminUsers error:', e.message);
    }

    // 2. Direct Supabase fallback (works even if backend env vars are missing)
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: users, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (!error && Array.isArray(users)) {
          // Fetch real live sessions
          const { data: sessions } = await supabase
            .from('active_sessions')
            .select('*')
            .gte('last_heartbeat', new Date(Date.now() - 5 * 60000).toISOString()); // active in last 5 mins
            
          const sessionMap = new Map();
          if (sessions) {
            sessions.forEach(s => sessionMap.set(s.user_email, s));
          }
          
          return users.map(u => {
            const email = u.mailid || u.email;
            const liveSession = sessionMap.get(email);
            return {
              ...u,
              live_status: liveSession ? liveSession.status : 'Offline',
              last_heartbeat: liveSession ? liveSession.last_heartbeat : null,
              active_test_id: liveSession ? liveSession.test_id : null
            };
          });
        }
        if (error) throw new Error('Supabase: ' + error.message);
      }
    } catch (e) {
      console.warn('Direct Supabase getAdminUsers error:', e.message);
      throw e; // Surface to AdminLayout so it shows an error instead of blank page
    }

    return [];
  },

  async updateUserRole(id, role) {
    const res = await fetchWithTimeout(`${API_BASE}/admin/users/${id}/role`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role })
    });

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update user role');
    }
    return data;
  },

  // 7. Role Selection & Staff Requests Workflow
  async selectRoleChoice(email, name, role) {
    // 1. Try backend API first
    try {
      const res = await fetchWithTimeout(`${API_BASE}/auth/role-choice`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email, name, role })
      });
      const data = await safeJson(res);
      if (res.ok) return data;
      console.warn('Backend selectRoleChoice note:', data.error);
    } catch (e) {
      console.warn('Backend selectRoleChoice network note:', e.message);
    }

    // 2. Direct Supabase fallback
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        if (role === 'student') {
          await supabase.from('users').update({ UserType: 'student' }).eq('mailid', email.toLowerCase());
          localStorage.setItem(`assesspro_role_${email}`, 'student');
          return { role: 'student', status: 'approved' };
        } else if (role === 'staff') {
          // Delete any stale request, then insert fresh
          await supabase.from('staff_requests').delete().eq('email', email.toLowerCase());
          const { error } = await supabase.from('staff_requests').insert({
            email: email.toLowerCase(),
            name: name,
            status: 'pending'
          });
          if (error) console.warn('Direct staff_requests insert error:', error.message);
          localStorage.setItem(`assesspro_role_${email}`, 'pending_staff');
          return { role: 'pending_staff', status: 'pending', message: 'Staff request submitted to admin' };
        }
      }
    } catch (sbErr) {
      console.warn('Direct Supabase selectRoleChoice error:', sbErr.message);
    }

    // 3. Final localStorage-only fallback
    if (role === 'student') {
      localStorage.setItem(`assesspro_role_${email}`, 'student');
      return { role: 'student', status: 'approved' };
    } else {
      const reqs = JSON.parse(localStorage.getItem('assesspro_staff_requests') || '[]');
      const newReq = { id: 'req-' + Date.now(), email, name, status: 'pending', created_at: new Date().toISOString() };
      reqs.unshift(newReq);
      localStorage.setItem('assesspro_staff_requests', JSON.stringify(reqs));
      localStorage.setItem(`assesspro_role_${email}`, 'pending_staff');
      return { role: 'pending_staff', status: 'pending', message: 'Staff request submitted to admin' };
    }
  },

  async checkStaffRequestStatus(email) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/auth/staff-request-status?email=${encodeURIComponent(email)}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (data) return data;
      }
    } catch (e) {}

    return { status: 'none', role: 'unassigned' };
  },

  async getStaffRequests() {
    // 1. Try backend API route
    try {
      const res = await fetchWithTimeout(`${API_BASE}/admin/staff-requests`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (Array.isArray(data)) return data;
      }
    } catch (e) {
      console.warn('Backend getStaffRequests error:', e.message);
    }

    // 2. Direct Supabase fallback
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('staff_requests')
          .select('*');
        if (!error && Array.isArray(data)) return data;
      }
    } catch (e) {
      console.warn('Direct Supabase getStaffRequests error:', e.message);
    }

    // 3. LocalStorage fallback (offline / no DB)
    return JSON.parse(localStorage.getItem('assesspro_staff_requests') || '[]');
  },

  async approveStaffRequest(id, email) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/admin/staff-requests/${id}/approve`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return await safeJson(res);
      }
    } catch (e) {
      console.warn('Backend approveStaffRequest error:', e.message);
    }

    // Direct Supabase fallback
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const cleanEmail = (email || '').toLowerCase().trim();
        // Update staff_requests table
        await supabase.from('staff_requests').update({ status: 'approved' }).eq('email', cleanEmail);
        
        // Upsert into users table as staff
        const { data: exUser } = await supabase.from('users').select('id, name').eq('mailid', cleanEmail).maybeSingle();
        if (exUser?.id) {
           await supabase.from('users').update({ UserType: 'staff' }).eq('id', exUser.id);
        } else {
           await supabase.from('users').update({ UserType: 'staff' }).eq('mailid', cleanEmail);
        }
      }
    } catch (sbErr) {
      console.warn('Direct Supabase approve error:', sbErr.message);
    }
    
    // Local fallback update
    const reqs = JSON.parse(localStorage.getItem('assesspro_staff_requests') || '[]');
    const updated = reqs.map(r => (r.id === id || r.email === email) ? { ...r, status: 'approved' } : r);
    localStorage.setItem('assesspro_staff_requests', JSON.stringify(updated));
    if (email) {
      localStorage.setItem(`assesspro_role_${(email || '').toLowerCase().trim()}`, 'staff');
    }
    
    return { success: true };
  },

  async rejectStaffRequest(id, email) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/admin/staff-requests/${id}/reject`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) return await safeJson(res);
    } catch (e) {
      console.warn('Backend rejectStaffRequest error:', e.message);
    }

    // Direct Supabase fallback
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const cleanEmail = (email || '').toLowerCase().trim();
        await supabase.from('staff_requests').update({ status: 'rejected' }).eq('email', cleanEmail);
        await supabase.from('users').update({ UserType: 'unassigned' }).eq('mailid', cleanEmail);
      }
    } catch (sbErr) {
      console.warn('Direct Supabase reject error:', sbErr.message);
    }

    const reqs = JSON.parse(localStorage.getItem('assesspro_staff_requests') || '[]');
    const updated = reqs.map(r => (r.id === id || r.email === email) ? { ...r, status: 'rejected' } : r);
    localStorage.setItem('assesspro_staff_requests', JSON.stringify(updated));
    return { success: true };
  },

  // 8. Students Registry & Staff Mapping
  async getAllStudents() {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/students`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await safeJson(res);
        if (Array.isArray(data)) return data;
      }
    } catch (e) {
      console.warn('API /students fetch warning:', e.message);
    }

    // Direct Supabase fallback
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: dbUsers, error: usersErr } = await supabase
          .from('users')
          .select('*');

        if (!usersErr && Array.isArray(dbUsers)) {
          const studentUsers = dbUsers.filter(u => (u.UserType || u.usertype || '').toLowerCase() === 'student');
          const { data: dbStudents } = await supabase.from('students').select('*');
          const profileMap = new Map();
          if (Array.isArray(dbStudents)) {
            dbStudents.forEach(st => profileMap.set(st.id, st));
          }

          const localMap = JSON.parse(localStorage.getItem('assesspro_staff_student_mapping') || '{}');

          return studentUsers.map(u => {
            const cleanEmail = (u.mailid || u.email || '').toLowerCase().trim();
            const prof = profileMap.get(u.id) || {};
            const assigned = localMap[cleanEmail] || {};
            return {
              id: u.id,
              name: u.name || (cleanEmail ? cleanEmail.split('@')[0] : 'Student'),
              email: cleanEmail,
              reg_no: prof.reg_no || null,
              department: prof.department || null,
              year: prof.year || null,
              section: prof.section || null,
              assigned_staff_id: prof.assigned_staff_id || assigned.staffId || null,
              assigned_staff_name: prof.assigned_staff_name || assigned.staffName || null
            };
          });
        }
      }
    } catch (e) {
      console.warn('Direct Supabase fetch for students failed:', e.message);
    }

    return [];
  },

  async assignStudentsToStaff(staffId, staffName, studentEmails) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/staff/assign-students`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ staffId, staffName, studentEmails })
      });
      if (res.ok) return await safeJson(res);
    } catch (e) {}

    const localMap = JSON.parse(localStorage.getItem('assesspro_staff_student_mapping') || '{}');
    studentEmails.forEach(em => {
      localMap[em.toLowerCase().trim()] = {
        staffId,
        staffName,
        assigned_staff_id: staffId,
        assigned_staff_name: staffName
      };
    });
    localStorage.setItem('assesspro_staff_student_mapping', JSON.stringify(localMap));
    return { success: true };
  },

  async getAssignedStaff(email) {
    if (!email) return { assigned_staff_name: null, assigned_staff_id: null, staffName: null, staffId: null };
    const cleanEmail = email.toLowerCase().trim();
    try {
      const res = await fetchWithTimeout(`${API_BASE}/student/assigned-staff?email=${encodeURIComponent(cleanEmail)}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (data && (data.assigned_staff_name || data.staffName)) {
          const name = data.assigned_staff_name || data.staffName || null;
          const id = data.assigned_staff_id || data.staffId || null;
          return {
            assigned_staff_name: name,
            assigned_staff_id: id,
            staffName: name,
            staffId: id
          };
        }
      }
    } catch (e) {
      console.warn('API getAssignedStaff error:', e.message);
    }

    return { assigned_staff_name: null, assigned_staff_id: null, staffName: null, staffId: null };
  },

  async getStaffProfile(email) {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();
    try {
      const res = await fetchWithTimeout(`${API_BASE}/staff/profile?email=${encodeURIComponent(cleanEmail)}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (data && (data.department || data.staff_code || data.name)) {
          return data;
        }
      }
    } catch (e) {}

    // Check direct Supabase
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: u } = await supabase.from('users').select('id, name, mailid').eq('mailid', cleanEmail).maybeSingle();
        if (u) {
          const { data: s } = await supabase.from('staff').select('*').eq('id', u.id).maybeSingle();
          if (s) {
            return {
              ...s,
              name: u.name,
              email: u.mailid
            };
          }
        }
      }
    } catch (e) {}

    // LocalStorage fallback
    try {
      const stored = localStorage.getItem(`assesspro_staff_prof_${cleanEmail}`);
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    return null;
  },

  async saveStaffProfile(profileData) {
    let saved = null;
    try {
      const res = await fetchWithTimeout(`${API_BASE}/staff/profile`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (data?.profile) saved = data.profile;
      }
    } catch (e) {}

    const cleanEmail = (profileData.email || '').toLowerCase().trim();
    if (cleanEmail) {
      try {
        localStorage.setItem(`assesspro_staff_prof_${cleanEmail}`, JSON.stringify(profileData));
      } catch (e) {}
    }

    // Direct Supabase upsert fallback
    try {
      const supabase = getSupabaseClient();
      if (supabase && profileData.id) {
        await supabase.from('users').update({ name: profileData.name }).eq('id', profileData.id);
        await supabase.from('staff').upsert({
          id: profileData.id,
          staff_code: profileData.staff_code || `FAC-${Date.now().toString().slice(-4)}`,
          department: profileData.department || 'Computer Science and Engineering',
          designation: profileData.designation || 'Assistant Professor'
        });
      }
    } catch (e) {}

    return saved || profileData;
  },

  async deleteUserCompletely(id, email) {
    const cleanEmail = (email || '').toLowerCase().trim();

    // Step 1: Always delete directly from Supabase DB tables (works with anon key + RLS)
    // This is the primary path — backend is only for auth.users deletion (needs service role)
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const deleteErrors = [];

      if (id && !id.startsWith('dyn-')) {
        const { error: e1 } = await supabase.from('students').delete().eq('id', id);
        if (e1) deleteErrors.push('students: ' + e1.message);

        const { error: e2 } = await supabase.from('staff').delete().eq('id', id);
        if (e2) deleteErrors.push('staff: ' + e2.message);

        const { error: e3 } = await supabase.from('users').delete().eq('id', id);
        if (e3) deleteErrors.push('users(id): ' + e3.message);
      }

      if (cleanEmail) {
        await supabase.from('users').delete().eq('mailid', cleanEmail);
        await supabase.from('staff_requests').delete().eq('email', cleanEmail);
      }

      // Clear all local caches for this user
      if (cleanEmail) {
        localStorage.removeItem(`assesspro_student_prof_${cleanEmail}`);
        localStorage.removeItem(`assesspro_role_${cleanEmail}`);
        localStorage.removeItem(`assesspro_subs_${cleanEmail}`);
      }

      if (deleteErrors.length > 0) {
        console.warn('Partial delete errors (RLS may restrict some tables):', deleteErrors);
      }
    } catch (sbErr) {
      throw new Error('Failed to delete user: ' + sbErr.message);
    }

    // Step 2: Also try backend API to delete from auth.users (requires service role key)
    // Non-fatal — if this fails, user is still removed from the app DB
    try {
      await fetchWithTimeout(`${API_BASE}/admin/users/${id}?email=${encodeURIComponent(cleanEmail)}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    } catch (apiErr) {
      console.warn('Backend auth deletion skipped (user removed from DB):', apiErr.message);
    }

    return { success: true };
  }
};

export default api;

