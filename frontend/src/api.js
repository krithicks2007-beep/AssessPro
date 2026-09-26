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
    try {
      const res = await fetch(`${API_BASE}/groups`);
      if (!res.ok) {
        throw new Error('Failed to fetch groups from backend');
      }
      return await safeJson(res);
    } catch (err) {
      console.warn('API getGroups fallback:', err.message);
      return [
        { group_number: 1, name: 'Programming & Logic', category: 'Core Subjects', department: 'Mechatronics Engineering', color: '#1d72fe' },
        { group_number: 2, name: 'Electronics & Control', category: 'Professional Core', department: 'Mechatronics Engineering', color: '#10b981' },
        { group_number: 3, name: 'Mechanical & Design', category: 'Specialization Subjects', department: 'Mechatronics Engineering', color: '#8b5cf6' }
      ];
    }
  },

  async createGroup(groupData) {
    const res = await fetch(`${API_BASE}/groups`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(groupData)
    });

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create group');
    }
    return data;
  },

  async updateGroupName(id, name) {
    const res = await fetch(`${API_BASE}/groups/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name })
    });

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update group');
    }
    return data;
  },

  async deleteGroup(id) {
    const res = await fetch(`${API_BASE}/groups/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete group');
    }
    return data;
  },

  // 5. Tests & Assessments
  async getTests() {
    try {
      const res = await fetch(`${API_BASE}/tests`);
      if (!res.ok) throw new Error('Failed to fetch tests');
      return await safeJson(res);
    } catch (err) {
      console.warn('API getTests fallback:', err.message);
      return [];
    }
  },

  async getTestById(id) {
    const res = await fetch(`${API_BASE}/tests/${id}`);
    if (!res.ok) throw new Error('Failed to fetch test details');
    return await safeJson(res);
  },

  async createTest(testData) {
    const res = await fetch(`${API_BASE}/tests`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(testData)
    });

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create test');
    }
    return data;
  },

  async submitTest(testId, submissionData) {
    const res = await fetch(`${API_BASE}/tests/${testId}/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(submissionData)
    });

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to submit test');
    }
    return data;
  },

  async getTestSubmissions(testId) {
    try {
      const res = await fetch(`${API_BASE}/tests/${testId}/submissions`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch submissions');
      return await safeJson(res);
    } catch (err) {
      console.warn('Fallback submissions:', err.message);
      return [];
    }
  },

  async getStudentSubmissions(email) {
    try {
      const res = await fetch(`${API_BASE}/student/submissions?email=${encodeURIComponent(email || '')}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch student submissions');
      return await safeJson(res);
    } catch (err) {
      return [];
    }
  },

  async getStudentProfile(email) {
    try {
      const res = await fetch(`${API_BASE}/student/profile?email=${encodeURIComponent(email || '')}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return null;
      return await safeJson(res);
    } catch (err) {
      return null;
    }
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
      if (!res.ok) throw new Error('Failed to fetch users');
      return await safeJson(res);
    } catch (err) {
      console.warn('API getAdminUsers fallback:', err.message);
      return [];
    }
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

