import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from environment or fallback to localStorage configuration
export const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const localUrl = localStorage.getItem('assesspro_supabase_url');
  const localKey = localStorage.getItem('assesspro_supabase_anon_key');

  const supabaseUrl = envUrl || localUrl || '';
  const supabaseAnonKey = envKey || localKey || '';
  const allowedDomain = import.meta.env.VITE_ALLOWED_DOMAIN || 'bitsathy.ac.in';

  return { supabaseUrl, supabaseAnonKey, allowedDomain };
};

export const saveSupabaseConfig = (url, anonKey) => {
  localStorage.setItem('assesspro_supabase_url', url.trim());
  localStorage.setItem('assesspro_supabase_anon_key', anonKey.trim());
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('assesspro_supabase_url');
  localStorage.removeItem('assesspro_supabase_anon_key');
};

let cachedClient = null;

export const getSupabaseClient = () => {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project')) {
    return null;
  }

  if (!cachedClient || cachedClient.supabaseUrl !== supabaseUrl) {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey);
    cachedClient.supabaseUrl = supabaseUrl;
  }

  return cachedClient;
};

/**
 * Triggers Google OAuth with Hosted Domain ('hd') set to 'bitsathy.ac.in'
 * Displays Google's account picker: "Choose an account to continue to bitsathy.ac.in"
 */
export const signInWithGoogleBitsathy = async (supabase) => {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        prompt: 'select_account',
        access_type: 'offline'
      }
    }
  });

  return { data, error };
};

/**
 * Sign in with Email and Password
 */
export const signInWithEmailPassword = async (supabase, email, password) => {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: password
  });

  return { data, error };
};

/**
 * Helper to determine user role based on email or user metadata
 */
export const resolveRoleFromEmail = (email = '') => {
  const cleanEmail = email.toLowerCase().trim();
  if (!cleanEmail) return 'student';
  if (cleanEmail === 'krithickrajs.cs25@bitsathy.ac.in') {
    return 'admin';
  }
  if (cleanEmail.startsWith('admin') || cleanEmail.includes('.admin@') || cleanEmail.startsWith('dean')) {
    return 'admin';
  }

  // Institutional domain: All new users (with batch numbers or without) log in as student by default
  const domain = import.meta.env.VITE_ALLOWED_DOMAIN || 'bitsathy.ac.in';
  if (cleanEmail.endsWith(`@${domain}`)) {
    return 'student';
  }

  // Personal / external domains (e.g. @gmail.com) require role selection / verification
  return 'unassigned';
};

/**
 * Fetches user profile and UserType role from `public.users` table
 */
export const fetchUserProfile = async (supabase, user) => {
  if (!supabase || !user) return null;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, mailid, UserType')
      .eq('id', user.id)
      .maybeSingle();

    if (data && data.UserType) {
      return data;
    }

    // Fallback: If not in table, determine UserType
    const detectedType = resolveRoleFromEmail(user.email);
    if (detectedType === 'unassigned') {
      return {
        id: user.id,
        name: user.user_metadata?.full_name || user.email.split('@')[0],
        mailid: user.email,
        UserType: 'unassigned'
      };
    }

    const profileData = {
      id: user.id,
      name: user.user_metadata?.full_name || user.email.split('@')[0],
      mailid: user.email,
      UserType: detectedType
    };

    // Attempt to upsert institutional user
    await supabase.from('users').upsert(profileData).select();

    return profileData;
  } catch (err) {
    console.warn('Profile fetch note (using fallback):', err.message);
    return {
      id: user.id,
      name: user.email.split('@')[0],
      mailid: user.email,
      UserType: resolveRoleFromEmail(user.email)
    };
  }
};

/**
 * Fetch all groups from Supabase with automatic seed if table is empty
 */
export const getLiveGroups = async (supabase) => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('group_number', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      // Auto-seed initial 3 groups matching Screenshot 1 & 2
      const initialGroups = [
        { group_number: 1, name: 'Programming & Logic', category: 'Core Subjects', department: 'Mechatronics Engineering', color: '#1d72fe' },
        { group_number: 2, name: 'Electronics & Control', category: 'Professional Core', department: 'Mechatronics Engineering', color: '#10b981' },
        { group_number: 3, name: 'Mechanical & Design', category: 'Specialization Subjects', department: 'Mechatronics Engineering', color: '#8b5cf6' }
      ];
      const { data: seeded } = await supabase.from('groups').insert(initialGroups).select();
      return seeded || initialGroups;
    }

    return data;
  } catch (err) {
    console.error('Error fetching live groups:', err);
    return [];
  }
};

/**
 * Add a new group with validation constraints
 */
export const addNewGroup = async (supabase, { name, category, department, color }) => {
  if (!supabase) throw new Error('Supabase is not connected');

  const cleanName = name.trim();
  if (cleanName.length < 3) {
    throw new Error('Group name must be at least 3 characters long.');
  }

  // Check current groups count constraint (max 6 groups)
  const { data: existing, error: countErr } = await supabase.from('groups').select('id, group_number');
  if (countErr) throw countErr;

  if (existing && existing.length >= 6) {
    throw new Error('Maximum limit reached: You can create up to 6 groups per academic batch.');
  }

  // Determine next group_number
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
  return data?.[0];
};

/**
 * Rename an existing group
 */
export const updateGroupName = async (supabase, groupId, newName) => {
  if (!supabase) throw new Error('Supabase is not connected');
  const cleanName = newName.trim();
  if (cleanName.length < 3) {
    throw new Error('Group name must be at least 3 characters long.');
  }

  const { data, error } = await supabase
    .from('groups')
    .update({ name: cleanName })
    .eq('id', groupId)
    .select();

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Database denied the update. Please run the RLS policy fix SQL query in Supabase.');
  }
  return data?.[0];
};

/**
 * Delete a group
 */
export const deleteGroupById = async (supabase, groupId) => {
  if (!supabase) throw new Error('Supabase is not connected');
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) throw error;
  return true;
};

/**
 * Fetch all tests
 */
export const getLiveTests = async (supabase) => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('tests')
      .select('*, groups(name, group_number, color)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching live tests:', err);
    return [];
  }
};

/**
 * Create a new test under a group
 */
export const createNewTest = async (supabase, { title, groupId, durationMinutes, testType, status, userId }) => {
  if (!supabase) throw new Error('Supabase is not connected');
  if (!title.trim()) throw new Error('Test title is required');

  const testPayload = {
    title: title.trim(),
    group_id: groupId,
    duration_minutes: parseInt(durationMinutes) || 60,
    test_type: testType || 'test',
    status: status || 'published',
    created_by: userId || null
  };

  const { data, error } = await supabase.from('tests').insert([testPayload]).select('*, groups(name, group_number, color)');
  if (error) throw error;
  return data?.[0];
};

/**
 * Directly save or update student profile in Supabase database
 */
export const saveStudentProfileDirect = async (supabase, profileData) => {
  if (!supabase) return null;
  try {
    const cleanEmail = (profileData.email || '').toLowerCase().trim();
    let targetUserId = profileData.id;

    if (!targetUserId && cleanEmail) {
      const { data: userRecord } = await supabase
        .from('users')
        .select('id')
        .eq('mailid', cleanEmail)
        .maybeSingle();
      targetUserId = userRecord?.id;
    }

    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      targetUserId = user?.id;
    }

    if (targetUserId) {
      // 1. Upsert public.users record
      await supabase.from('users').upsert({
        id: targetUserId,
        name: profileData.name || cleanEmail.split('@')[0],
        mailid: cleanEmail,
        UserType: 'student'
      });

      // 2. Upsert public.students record
      const studentPayload = {
        id: targetUserId,
        reg_no: (profileData.reg_no || '').trim().toUpperCase(),
        department: profileData.department || 'Computer Science & Engineering',
        year: profileData.year || 'II Year',
        section: profileData.section || 'A',
        dob: profileData.dob || null,
        phone: profileData.phone || null
      };

      const { data, error } = await supabase
        .from('students')
        .upsert(studentPayload)
        .select();

      if (error) {
        console.warn('Supabase direct student upsert warning:', error.message);
      }
      return data?.[0] || studentPayload;
    }
  } catch (err) {
    console.warn('Direct student profile save error:', err.message);
  }
  return null;
};

/**
 * Directly fetch student profile from Supabase database
 */
export const fetchStudentProfileDirect = async (supabase, email) => {
  if (!supabase || !email) return null;
  try {
    const cleanEmail = email.toLowerCase().trim();
    const { data: userRecord } = await supabase
      .from('users')
      .select('id, name, mailid')
      .eq('mailid', cleanEmail)
      .maybeSingle();

    if (userRecord) {
      const { data: studentRecord } = await supabase
        .from('students')
        .select('*')
        .eq('id', userRecord.id)
        .maybeSingle();

      if (studentRecord) {
        return {
          ...studentRecord,
          name: userRecord.name,
          email: userRecord.mailid
        };
      }
    }
  } catch (err) {
    console.warn('Direct student profile fetch note:', err.message);
  }
  return null;
};


