import express from 'express';
import { supabase, SUPER_ADMIN_EMAIL, ALLOWED_DOMAIN } from '../config/db.js';
import { verifyAuth, requireRoles, requireOwnEmail } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 3. USER PROFILE & ROLE AUTHENTICATION ENDPOINTS
// -------------------------------------------------------------
router.get('/api/user/profile', verifyAuth, async (req, res) => {
  try {
    const user = req.user;
    const cleanEmail = (user.email || '').toLowerCase().trim();

    if (req.userRole === 'deleted') {
      return res.json({ user, profile: null, role: 'deleted', isDeletedOrNew: true });
    }

    // 1. Super Admin is always admin
    if (cleanEmail === SUPER_ADMIN_EMAIL) {
      let adminProf = {
        id: user.id,
        name: user.user_metadata?.full_name || cleanEmail.split('@')[0],
        mailid: cleanEmail,
        UserType: 'admin'
      };
      if (supabase) {
        try {
          const { data } = await supabase.from('users').select('*').eq('mailid', cleanEmail).maybeSingle();
          if (data) adminProf = data;
          else await supabase.from('users').upsert(adminProf, { onConflict: 'id' });
        } catch (e) {}
      }
      return res.json({ user, profile: adminProf, role: 'admin' });
    }

    // 2. Query Supabase users table — query by email first (most reliable unique key)
    let profile = null;
    if (supabase) {
      try {
        // Try by email first
        const { data: byEmail } = await supabase
          .from('users')
          .select('*')
          .eq('mailid', cleanEmail)
          .maybeSingle();
        if (byEmail) {
          profile = byEmail;
        } else if (user.id) {
          // Fall back to UUID if email lookup yields nothing
          const { data: byId } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          profile = byId || null;
        }
      } catch (err) {
        console.warn('Profile read warning:', err.message);
      }
    }

    // 2b. Handle personal/external emails (e.g. @gmail.com):
    // Even if Supabase PostgreSQL trigger created a row with UserType: 'student',
    // personal/external users MUST explicitly choose Student or Staff if they are new or have not completed their profile!
    if (!cleanEmail.endsWith(`@${ALLOWED_DOMAIN}`) && cleanEmail !== SUPER_ADMIN_EMAIL) {
      // Check if user has explicit approved staff request
      const staffReq = await getStaffRequestFromDB(cleanEmail);
      const approvedReq = staffReq?.status === 'approved' ? staffReq : null;
      if (approvedReq || profile?.UserType === 'staff') {
        if (profile?.UserType !== 'staff' && supabase) {
          try { await supabase.from('users').update({ UserType: 'staff' }).eq('mailid', cleanEmail); } catch (e) {}
        }
        return res.json({ user, profile: { ...profile, UserType: 'staff' }, role: 'staff' });
      }

      // Check if user has pending staff request
      const pendingReq = staffReq?.status === 'pending' ? staffReq : null;
      if (pendingReq || profile?.UserType === 'pending_staff') {
        return res.json({ user, profile: null, role: 'pending_staff' });
      }

      // Check if user has a verified real student profile in public.students (not empty, not GUEST)
      let hasRealStudentProfile = false;
      if (supabase && profile) {
        try {
          const { data: st } = await supabase
            .from('students')
            .select('reg_no, department')
            .eq('id', profile.id)
            .maybeSingle();
          if (st && st.reg_no && !st.reg_no.startsWith('GUEST-')) {
            hasRealStudentProfile = true;
          }
        } catch (e) {}
      }

      // Only treat as verified student if they have completed their profile or selected student in this session
      if (hasRealStudentProfile || userRoleOverrides.get(cleanEmail) === 'student') {
        return res.json({ user, profile, role: 'student' });
      }

      // Check if the user explicitly chose to be a student
      if (profile?.UserType === 'student') {
        // If they already chose student, let them be a student
        return res.json({ user, profile, role: 'student' });
      }

      // If they already have ANY valid role assigned (e.g. set via Admin Console), respect it!
      if (profile?.UserType && profile.UserType !== 'unassigned') {
        return res.json({ user, profile, role: profile.UserType });
      }

      // User exists in DB but has not yet made a role choice (truly new/unclassified external user)
      // Do NOT overwrite to 'unassigned' if they haven't chosen yet — just prompt them
      // NOTE: do NOT return isDeletedOrNew:true here; that causes App.jsx to wipe all localStorage
      return res.json({
        user,
        profile: null,
        role: 'unassigned'
      });
    }

    // 3. User is NOT found in users table (e.g. was deleted or new sign-up)
    if (!profile) {
      // PURGE ANY STALE IN-MEMORY OVERRIDES FOR THIS USER

      // Institutional emails (@bitsathy.ac.in) auto-enroll as student
      if (cleanEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
        const institutionalRole = 'student';
        profile = {
          id: user.id,
          name: user.user_metadata?.full_name || cleanEmail.split('@')[0],
          mailid: cleanEmail,
          UserType: institutionalRole
        };
        try {
          await supabase.from('users').upsert(profile, { onConflict: 'id' });
        } catch (upsertErr) {}
        return res.json({
          user,
          profile,
          role: institutionalRole,
          isNew: true
        });
      }

      // Check if user has an approved or pending staff request
      const staffReq = await getStaffRequestFromDB(cleanEmail);
      const approvedReq = staffReq?.status === 'approved' ? staffReq : null;
      if (approvedReq) {
        profile = {
          id: user.id,
          name: approvedReq.name || user.user_metadata?.full_name || cleanEmail.split('@')[0],
          mailid: cleanEmail,
          UserType: 'staff'
        };
        try {
          await supabase.from('users').upsert(profile, { onConflict: 'id' });
        } catch (e) {}
        return res.json({ user, profile, role: 'staff' });
      }

      const pendingReq = staffReq?.status === 'pending' ? staffReq : null;
      if (pendingReq) {
        return res.json({ user, profile: null, role: 'pending_staff' });
      }

      // For ANY external email (e.g. @gmail.com):
      // NEVER auto-upsert into database!
      // Must prompt role verification / selection
      return res.json({
        user,
        profile: null,
        role: 'unassigned',
        isDeletedOrNew: true
      });
    }

    // 4. User exists in database
    res.json({
      user,
      profile,
      role: profile.UserType || 'unassigned'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve user profile', details: err.message });
  }
});

// Role Choice Endpoint (called from RoleSelectionModal)
router.post('/api/auth/role-choice', verifyAuth, async (req, res) => {
  try {
    const user = req.user;
    const cleanEmail = (user.email || '').toLowerCase().trim();
    const name = req.body.name || user.user_metadata?.full_name || cleanEmail.split('@')[0];
    const role = req.body.role; // 'student' | 'staff'

    if (!cleanEmail) {
      return res.status(400).json({ error: 'Email parameter required' });
    }

    if (role === 'student') {
      const userId = user.id;
      if (supabase) {
        try {
          // Remove any pending staff request for this email
          await supabase.from('staff_requests').delete().eq('email', cleanEmail);
          if (userId) {
             const { error } = await supabase.from('users').upsert({ id: userId, name, mailid: cleanEmail, UserType: 'student' }, { onConflict: 'id' });
             if (error) console.error('Upsert student role error:', error);
          }
        } catch (e) { console.error(e); }
      }
      // Persist in-memory override (also persisted to DB above)
      userRoleOverrides.set(cleanEmail, 'student');
      return res.json({ success: true, role: 'student', status: 'approved' });
    } else if (role === 'staff') {
      if (supabase) {
        try {
          // Try upsert first; if it fails due to missing unique constraint, use delete+insert
          const { error: upsertErr } = await supabase
            .from('staff_requests')
            .upsert({ email: cleanEmail, name, status: 'pending' }, { onConflict: 'email' });
          if (upsertErr) {
            // Fallback: delete old record then insert fresh
            await supabase.from('staff_requests').delete().eq('email', cleanEmail);
            const { error: insertErr } = await supabase
              .from('staff_requests')
              .insert({ email: cleanEmail, name, status: 'pending' });
            if (insertErr) console.warn('staff_requests insert error:', insertErr.message);
          }
        } catch (dbErr) {
          console.warn('staff_requests upsert error:', dbErr.message);
        }
      }
      return res.json({
        success: true, role: 'pending_staff', status: 'pending',
        message: 'Staff request submitted to administrator for approval.'
      });
    } else {
      return res.status(400).json({ error: 'Invalid role choice' });
    }

  } catch (err) {
    res.status(500).json({ error: 'Failed to process role choice', details: err.message });
  }
});

// Staff Request Status (polling from RoleSelectionModal)
router.get('/api/auth/staff-request-status', verifyAuth, requireOwnEmail, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not connected' });
  const cleanEmail = (req.query.email || '').toLowerCase().trim();
  if (!cleanEmail) return res.status(400).json({ error: 'Email parameter required' });

  try {
    const { data: dbReq } = await supabase
      .from('staff_requests').select('status').eq('email', cleanEmail).maybeSingle();

    if (dbReq?.status === 'approved') return res.json({ role: 'staff', status: 'approved' });
    if (dbReq?.status === 'pending')  return res.json({ role: 'pending_staff', status: 'pending' });
    if (dbReq?.status === 'rejected') return res.json({ role: 'unassigned', status: 'rejected' });

    const { data: dbUser } = await supabase
      .from('users').select('id, UserType').eq('mailid', cleanEmail).maybeSingle();

    if (dbUser?.UserType === 'staff')   return res.json({ role: 'staff', status: 'approved' });
    if (dbUser?.UserType === 'student') {
      if (cleanEmail.endsWith(`@${ALLOWED_DOMAIN}`)) return res.json({ role: 'student', status: 'approved' });

      const { data: st } = await supabase.from('students').select('reg_no').eq('id', dbUser.id).maybeSingle();
      if (st?.reg_no && !st.reg_no.startsWith('GUEST-')) {
        return res.json({ role: 'student', status: 'approved' });
      }
      // UserType is student but no verified profile yet — still treat as student
      return res.json({ role: 'student', status: 'approved' });
    }
  } catch (e) {}

  res.json({ role: 'unassigned', status: 'none' });
});


// Admin: Staff Requests List & Actions
router.get('/api/admin/staff-requests', verifyAuth, requireRoles('admin'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not connected' });
  try {
    // Try ordering by created_at; fall back without order if column missing
    let data, error;
    ({ data, error } = await supabase.from('staff_requests').select('*').order('created_at', { ascending: false }));
    if (error) {
      console.warn('staff_requests order error, retrying without order:', error.message);
      ({ data, error } = await supabase.from('staff_requests').select('*'));
    }
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Failed to fetch staff requests:', err.message);
    res.status(500).json({ error: 'Failed to fetch staff requests', details: err.message });
  }
});

router.post('/api/admin/staff-requests/:id/approve', verifyAuth, requireRoles('admin'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not connected' });
  const { id } = req.params;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const queryStr = isUUID ? `id.eq.${id},email.eq.${id.toLowerCase()}` : `email.eq.${id.toLowerCase()}`;

  const { data: targetReq } = await supabase.from('staff_requests')
    .select('*').or(queryStr).maybeSingle();
  if (!targetReq) return res.status(404).json({ error: 'Staff request not found' });

  const cleanEmail = targetReq.email.toLowerCase().trim();
  const { error: approvalError } = await supabase
    .from('staff_requests')
    .update({ status: 'approved' })
    .eq('id', targetReq.id);
  if (approvalError) {
    return res.status(500).json({ error: 'Failed to approve staff request', details: approvalError.message });
  }
  try {
    let userId = null;
    try {
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const authMatch = users?.find(u => u.email.toLowerCase() === cleanEmail);
      if (authMatch) userId = authMatch.id;
    } catch (e) {}
    if (!userId) {
      const { data: ex } = await supabase.from('users').select('id').eq('mailid', cleanEmail).maybeSingle();
      if (ex) userId = ex.id;
    }
    if (userId) {
      await supabase.from('users').upsert({ id: userId, name: targetReq.name, mailid: cleanEmail, UserType: 'staff' }, { onConflict: 'id' });
    }
  } catch (e) {}

  res.json({ success: true, message: `Staff privileges approved for ${targetReq.email}` });
});


router.post('/api/admin/staff-requests/:id/reject', verifyAuth, requireRoles('admin'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not connected' });
  const { id } = req.params;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const queryStr = isUUID ? `id.eq.${id},email.eq.${id.toLowerCase()}` : `email.eq.${id.toLowerCase()}`;

  const { data: targetReq } = await supabase.from('staff_requests')
    .select('*').or(queryStr).maybeSingle();
  if (!targetReq) return res.status(404).json({ error: 'Staff request not found' });

  const cleanEmail = targetReq.email.toLowerCase().trim();
  await supabase.from('staff_requests').update({ status: 'rejected' }).eq('id', targetReq.id);
  try { await supabase.from('users').update({ UserType: 'unassigned' }).eq('mailid', cleanEmail); } catch (e) {}

  res.json({ success: true, message: `Staff request rejected for ${targetReq.email}` });
});


// Student Profile Endpoints
router.get('/api/student/profile', verifyAuth, requireOwnEmail, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not connected' });
  const email = (req.query.email || '').toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'Email parameter required' });

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
        return res.json({ ...studentRecord, name: userRecord.name, email: userRecord.mailid });
      }
    }
  } catch (dbErr) {
    console.warn('Student profile lookup error:', dbErr.message);
  }

  return res.json(null);
});


router.post('/api/student/profile', verifyAuth, requireOwnEmail, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not connected' });
  const { id, email, name, reg_no, department, year, section, dob, phone } = req.body;
  if (!email || !reg_no) {
    return res.status(400).json({ error: 'Email and Register Number are required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  userRoleOverrides.set(cleanEmail, 'student');

  let { data: userRecord } = await supabase.from('users').select('id').eq('mailid', cleanEmail).maybeSingle();
  let targetUserId = userRecord?.id || req.user.id;

  if (!targetUserId) {
    // Must have the auth user id to create the FK-linked users row
    const authUserId = id || req.user.id;
    if (authUserId) {
      const { error: uErr } = await supabase.from('users').upsert({
        id: authUserId, name: name || cleanEmail.split('@')[0], mailid: cleanEmail, UserType: 'student'
      });
      if (!uErr) targetUserId = authUserId;
    }
  } else {
    // Update name if changed
    try {
      await supabase.from('users').update({ name: name || cleanEmail.split('@')[0] }).eq('id', targetUserId);
    } catch (e) {}
  }

  if (!targetUserId) {
    return res.status(400).json({ error: 'Could not locate or create user account' });
  }

  const { error } = await supabase.from('students').upsert({
    id: targetUserId,
    reg_no: reg_no.trim().toUpperCase(),
    department: department || 'Computer Science & Engineering',
    year: year || 'II Year',
    section: section || 'A',
    dob: dob || null,
    phone: phone || null
  });

  if (error) return res.status(500).json({ error: 'Failed to save student profile: ' + error.message });
  res.status(200).json({ message: 'Profile saved successfully', role: 'student' });
});


// -------------------------------------------------------------
// 3.5. STAFF PROFILE ENDPOINTS
// Supabase-only — no file I/O
// -------------------------------------------------------------

router.get('/api/staff/profile', verifyAuth, requireOwnEmail, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not connected' });
  const email = (req.query.email || '').toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'Email parameter required' });

  try {
    const { data: userRecord } = await supabase
      .from('users').select('id, name, mailid').eq('mailid', email).maybeSingle();

    if (userRecord) {
      const { data: staffRecord } = await supabase
        .from('staff').select('*').eq('id', userRecord.id).maybeSingle();

      if (staffRecord) {
        return res.json({ ...staffRecord, name: userRecord.name, email: userRecord.mailid });
      }
    }
  } catch (dbErr) {
    console.warn('Staff profile lookup error:', dbErr.message);
  }

  return res.json(null);
});

router.post('/api/staff/profile', verifyAuth, requireOwnEmail, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not connected' });
  const { id, email, name, staff_code, department, designation, phone, institution, specialization, office_location } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const cleanEmail = email.toLowerCase().trim();
  const sc = staff_code ? staff_code.trim().toUpperCase() : `FAC-${Date.now().toString().slice(-4)}`;

  let { data: userRecord } = await supabase.from('users').select('id').eq('mailid', cleanEmail).maybeSingle();
  let targetUserId = userRecord?.id || req.user.id;

  if (!targetUserId && id) {
    const { error: uErr } = await supabase.from('users').upsert({
      id, name: name || cleanEmail.split('@')[0], mailid: cleanEmail, UserType: 'staff'
    });
    if (!uErr) targetUserId = id;
  } else if (targetUserId) {
    await supabase.from('users').update({ name: name || cleanEmail.split('@')[0] }).eq('id', targetUserId);
  }

  if (!targetUserId) {
    return res.status(400).json({ error: 'Could not locate or create staff account' });
  }

  const { error } = await supabase.from('staff').upsert({
    id: targetUserId,
    staff_code: sc,
    department: department || 'Computer Science and Engineering',
    designation: designation || 'Assistant Professor',
    phone: phone || null,
    specialization: specialization || null,
    office_location: office_location || null,
    institution: institution || null
  });

  if (error) return res.status(500).json({ error: 'Failed to save staff profile: ' + error.message });
  res.json({ success: true, profile: { id: targetUserId, email: cleanEmail, name, staff_code: sc, department, designation } });
});


// -------------------------------------------------------------
// 4. GROUPS CRUD ENDPOINTS
// -------------------------------------------------------------
router.get('/api/groups', verifyAuth, async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Database client not connected' });
  }

  try {
    const creatorFilter = req.query.staff_id || req.query.created_by || '';

    let query = supabase
      .from('groups')
      .select('*')
      .order('group_number', { ascending: true });

    // Scope: staff sees own groups (unless all=true is passed), admin sees all, students see all (frontend filters based on effective tests)
    if (creatorFilter) {
      query = query.eq('created_by', creatorFilter);
    } else if (req.userRole === 'staff' && req.query.all !== 'true') {
      query = query.eq('created_by', req.user.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Auto-seed default groups for this staff member if they have none yet
    if ((!data || data.length === 0) && req.userRole === 'staff') {
      const defaultGroups = [
        { group_number: 1, name: 'Group 1', category: 'Core Subjects', department: 'General', color: '#1d72fe', created_by: req.user.id },
        { group_number: 2, name: 'Group 2', category: 'Professional Core', department: 'General', color: '#10b981', created_by: req.user.id },
        { group_number: 3, name: 'Group 3', category: 'Specialization Subjects', department: 'General', color: '#8b5cf6', created_by: req.user.id }
      ];
      const { data: seeded, error: seedErr } = await supabase.from('groups').insert(defaultGroups).select();
      if (!seedErr && seeded) {
        return res.json(seeded);
      }
    }

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch groups', details: err.message });
  }
});

router.post('/api/groups', verifyAuth, requireRoles('staff', 'admin'), async (req, res) => {
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
      .select('id, group_number')
      .eq('created_by', req.user.id);
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
      department: department || 'General',
      color: assignedColor,
      created_by: req.user.id
    };

    const { data, error } = await supabase.from('groups').insert([newGroup]).select();
    if (error) throw error;

    res.status(201).json(data?.[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create group', details: err.message });
  }
});

router.put('/api/groups/:id', verifyAuth, requireRoles('staff', 'admin'), async (req, res) => {
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
    let updateQuery = supabase
      .from('groups')
      .update({ name: cleanName })
      .eq('id', id);
    // Ownership: staff can only rename their own groups
    if (req.userRole !== 'admin') {
      updateQuery = updateQuery.eq('created_by', req.user.id);
    }
    const { data, error } = await updateQuery.select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Group not found or update not permitted' });
    }

    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update group name', details: err.message });
  }
});

router.delete('/api/groups/:id', verifyAuth, requireRoles('staff', 'admin'), async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Database client not connected' });
  }

  const { id } = req.params;
  try {
    let delQuery = supabase.from('groups').delete().eq('id', id);
    if (req.userRole !== 'admin') {
      delQuery = delQuery.eq('created_by', req.user.id);
    }
    const { error } = await delQuery;
    if (error) throw error;
    res.json({ success: true, message: 'Group removed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete group', details: err.message });
  }
});

// -------------------------------------------------------------
// 5. TESTS & ASSESSMENTS ENDPOINTS
// Supabase-only storage — no file I/O (required for Vercel serverless)
// -------------------------------------------------------------
router.get('/api/tests', verifyAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not connected' });
  try {
    const studentEmail = (req.query.student_email || '').toLowerCase().trim();
    const staffEmail   = (req.query.staff_email   || '').toLowerCase().trim();
    const staffId      = req.query.staff_id || '';

    const { data, error } = await supabase
      .from('tests')
      .select('*, groups(name, group_number, color)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!Array.isArray(data)) return res.json([]);

    let avgMap = {};
    try {
      const testIds = data.map(t => t.id);
      if (testIds.length > 0) {
        let globalStudentCount = 1;
        try {
          const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('UserType', 'student');
          if (count) globalStudentCount = count;
        } catch (e) {}

        const { data: subsData } = await supabase
          .from('test_submissions')
          .select('test_id, score, max_score')
          .in('test_id', testIds);
        if (subsData) {
          const aggs = {};
          subsData.forEach(s => {
             if (!aggs[s.test_id]) aggs[s.test_id] = { totalPct: 0, count: 0 };
             const pct = s.max_score > 0 ? (s.score / s.max_score) * 100 : 0;
             aggs[s.test_id].totalPct += pct;
             aggs[s.test_id].count++;
          });
          for (const tId in aggs) {
             const tObj = data.find(t => t.id === tId);
             const isUniversal = !tObj || !tObj.assigned_students || tObj.assigned_students.length === 0;
             const denominator = isUniversal ? globalStudentCount : tObj.assigned_students.length;
             avgMap[tId] = denominator > 0 ? Math.round(aggs[tId].totalPct / denominator) : 0;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to compute test averages', e);
    }

    const canSeeAnswers = ['staff', 'admin'].includes(req.userRole);
    let list = data.map(t => ({
      ...t,
      avg: avgMap[t.id] || 0,
      assigned_students: Array.isArray(t.assigned_students) ? t.assigned_students : [],
      questions: Array.isArray(t.questions) ? t.questions.map(q => canSeeAnswers ? q : (({ correct_index, ...safeQuestion }) => safeQuestion)(q)) : [],
      total_questions: Array.isArray(t.questions) ? t.questions.length : (t.total_questions || 0),
      uploadedFileName: t.uploaded_file_name || '',
      start_time: t.start_time || t.scheduled_date,
    }));

    if (staffEmail || staffId) {
      list = list.filter(t => {
        const byEmail = staffEmail && (t.created_by_email || '').toLowerCase() === staffEmail;
        const byId    = staffId    && String(t.created_by) === String(staffId);
        return byEmail || byId;
      });
    }

    if (studentEmail) {
      list = list.filter(t => {
        if (!t.assigned_students || t.assigned_students.length === 0) return true;
        return t.assigned_students.map(e => (typeof e === 'string' ? e : e?.email || '').toLowerCase()).includes(studentEmail);
      });
    }

    return res.json(list);
  } catch (err) {
    console.error('GET /api/tests error:', err.message);
    res.status(500).json({ error: 'Failed to fetch tests', details: err.message });
  }
});


// Single test by ID
router.get('/api/tests/:id', verifyAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not connected' });
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('tests')
      .select('*, groups(name, group_number, color)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Test not found', id });

    const canSeeAnswers = ['staff', 'admin'].includes(req.userRole);
    return res.json({
      ...data,
      questions: Array.isArray(data.questions) ? data.questions.map(q => canSeeAnswers ? q : (({ correct_index, ...safeQuestion }) => safeQuestion)(q)) : [],
      total_questions: Array.isArray(data.questions) ? data.questions.length : (data.total_questions || 0),
      assigned_students: Array.isArray(data.assigned_students) ? data.assigned_students : [],
      start_time: data.start_time || data.scheduled_date,
      uploadedFileName: data.uploaded_file_name || ''
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch test', details: err.message });
  }
});


// Create new test
router.post('/api/tests', verifyAuth, requireRoles('staff', 'admin'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not connected' });
  try {
    const {
      title, groupId, testNumber, durationMinutes, testType, status,
      startTime, endTime, questions, maxScore, userId, assignedStudents,
      allowLatecomers, lateLimitMinutes, uploaded_file_name, uploadedFileName, created_by_email, userEmail,
      auto_launch
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Test title is required' });
    }

    const isValidUUID = (str) => typeof str === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
    const cleanGroupId  = isValidUUID(groupId) ? groupId : null;
    const cleanUserId   = isValidUUID(userId)  ? userId  : null;
    const cleanQuestions = Array.isArray(questions) && questions.length > 0 ? questions : [];
    const totalScore    = parseInt(maxScore) || (cleanQuestions.length * 10) || 100;
    const duration      = parseInt(durationMinutes) || 45;
    const assignedList  = Array.isArray(assignedStudents) ? assignedStudents : [];
    const creatorEmail  = (created_by_email || userEmail || req.user?.email || '').toLowerCase().trim() || null;
    const filename      = uploaded_file_name || uploadedFileName || null;

    const payload = {
      title: title.trim(),
      group_id: cleanGroupId,
      duration_minutes: duration,
      test_type: testType || 'test',
      status: status || 'published',
      max_score: totalScore,
      scheduled_date: startTime || new Date().toISOString(),
      start_time: startTime || new Date().toISOString(),
      end_time: endTime || new Date(Date.now() + 86400000).toISOString(),
      allow_latecomers: allowLatecomers !== false,
      late_limit_minutes: lateLimitMinutes,
      questions: cleanQuestions,
      total_questions: cleanQuestions.length,
      assigned_students: assignedList,
      created_by_email: creatorEmail,
      uploaded_file_name: filename,
      test_number: parseInt(testNumber) || 1,
      auto_launch: auto_launch || false
    };
    if (cleanUserId) payload.created_by = cleanUserId;

    const { data: created, error } = await supabase
      .from('tests')
      .insert([payload])
      .select('*, groups(name, group_number, color)');

    if (error) throw error;
    const newTest = created?.[0];
    if (!newTest) throw new Error('Insert returned no data');

    console.log(`[Supabase] Created test ${newTest.id} (${newTest.title})`);
    return res.status(201).json({
      ...newTest,
      uploadedFileName: newTest.uploaded_file_name || '',
      assigned_students: Array.isArray(newTest.assigned_students) ? newTest.assigned_students : []
    });
  } catch (err) {
    console.error('Create test error:', err.message);
    return res.status(500).json({ error: 'Failed to create test: ' + err.message });
  }
});


// Update test
router.put('/api/tests/:id', verifyAuth, requireRoles('staff', 'admin'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { id } = req.params;
    const u = req.body;

    const payload = {};
    if (u.title           !== undefined) payload.title            = u.title;
    if (u.groupId         !== undefined) payload.group_id         = u.groupId;
    if (u.durationMinutes !== undefined) payload.duration_minutes = u.durationMinutes;
    if (u.testType        !== undefined) payload.test_type        = u.testType;
    if (u.status          !== undefined) payload.status           = u.status;
    if (u.maxScore        !== undefined) payload.max_score        = u.maxScore;
    if (u.startTime       !== undefined) payload.start_time       = u.startTime;
    if (u.startTime       !== undefined) payload.scheduled_date   = u.startTime;
    if (u.endTime         !== undefined) payload.end_time         = u.endTime;
    if (u.allowLatecomers !== undefined) payload.allow_latecomers = u.allowLatecomers;
    if (u.lateLimitMinutes!== undefined) payload.late_limit_minutes = u.lateLimitMinutes;
    if (u.auto_launch     !== undefined) payload.auto_launch      = u.auto_launch;
    if (u.assignedStudents!== undefined) payload.assigned_students= u.assignedStudents;
    if (u.questions       !== undefined) payload.questions        = u.questions;
    if (u.questions       !== undefined) payload.total_questions  = u.questions.length;
    if (u.uploaded_file_name || u.uploadedFileName) payload.uploaded_file_name = u.uploaded_file_name || u.uploadedFileName;
    if (u.created_by_email  !== undefined) payload.created_by_email = u.created_by_email;
    if (u.userEmail !== undefined && !payload.created_by_email) payload.created_by_email = u.userEmail;

    const { data, error } = await supabase
      .from('tests')
      .update(payload)
      .eq('id', id)
      .select('*, groups(name, group_number, color)')
      .maybeSingle();

    if (error) throw error;
    return res.json(data || { id, ...u });
  } catch (err) {
    console.error('Update test error:', err.message);
    res.status(500).json({ error: 'Failed to update test: ' + err.message });
  }
});


// Delete test
router.delete('/api/tests/:id', verifyAuth, requireRoles('staff', 'admin'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not connected' });
  const { id } = req.params;
  const keepData = req.query.keepData === 'true' || req.body?.keepData === true;
  try {
    if (!keepData) {
      await supabase.from('test_submissions').delete().eq('test_id', id);
    }
    const { error } = await supabase.from('tests').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, keepData });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete test', details: err.message });
  }
});


// Submit a test
router.post('/api/tests/:id/submit', verifyAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not connected' });
  const { id } = req.params;
  const { answers = {}, tabSwitchCount = 0, timeTakenSeconds = 0 } = req.body;
  const cleanEmail = String(req.user.email || '').toLowerCase().trim();
  if (!cleanEmail) return res.status(400).json({ error: 'Authenticated student email is required' });

  let testRow;
  try {
    const result = await supabase
      .from('tests')
      .select('id, questions, max_score, start_time, end_time, allow_latecomers, assigned_students')
      .eq('id', id)
      .maybeSingle();
    if (result.error) throw result.error;
    testRow = result.data;
  } catch (_) {
    return res.status(500).json({ error: 'Failed to load assessment' });
  }

  if (!testRow) return res.status(404).json({ error: 'Assessment not found' });
  const now = Date.now();
  const start = testRow.start_time ? new Date(testRow.start_time).getTime() : null;
  const end = testRow.end_time ? new Date(testRow.end_time).getTime() : null;
  if (start && now < start) return res.status(400).json({ error: 'Assessment has not started' });
  if (end && now > end && testRow.allow_latecomers === false) return res.status(400).json({ error: 'Assessment is closed' });

  const assigned = Array.isArray(testRow.assigned_students) ? testRow.assigned_students : [];
  const assignedEmails = assigned
    .map(item => String(typeof item === 'string' ? item : item?.email || '').toLowerCase().trim())
    .filter(Boolean);
  if (assignedEmails.length > 0 && !assignedEmails.includes(cleanEmail)) {
    return res.status(403).json({ error: 'You are not assigned to this assessment' });
  }

  const questions = Array.isArray(testRow.questions) ? testRow.questions : [];
  const maxScore = Number(testRow.max_score) || 100;
  const totalQuestions = questions.length;
  const pointsPerQ = totalQuestions > 0 ? maxScore / totalQuestions : 0;
  let score = 0;
  let correctCount = 0;
  questions.forEach((q, idx) => {
    const choice = answers[q.id] !== undefined ? answers[q.id] : answers[idx];
    if (choice !== undefined && Number(choice) === Number(q.correct_index)) {
      correctCount++;
      score += Number(q.marks) || pointsPerQ;
    }
  });
  score = Math.min(maxScore, Math.round(score));
  const percentage = maxScore > 0 ? Math.min(100, Math.round((score / maxScore) * 100)) : 0;

  // Verify this user has a row in public.students before setting the FK
  // External/Gmail users who haven't completed student profile will not have one
  let studentFkId = null;
  try {
    const { data: stRow } = await supabase
      .from('students')
      .select('id')
      .eq('id', req.user.id)
      .maybeSingle();
    if (stRow) studentFkId = req.user.id;
  } catch (e) {}

  const subPayload = {
    test_id: id,
    student_id: studentFkId,   // null if student profile doesn't exist yet (avoids FK violation)
    student_name: req.user.user_metadata?.full_name || cleanEmail.split('@')[0] || 'Student',
    student_email: cleanEmail,
    score, max_score: maxScore, answers,
    tab_switch_count: parseInt(tabSwitchCount) || 0,
    time_taken_seconds: parseInt(timeTakenSeconds) || 0,
    correct_count: correctCount,
    total_questions: totalQuestions,
    status: 'completed'
  };

  await supabase.from('test_submissions').delete().match({ test_id: id, student_email: cleanEmail });
  
  const { data: inserted, error: subErr } = await supabase
    .from('test_submissions')
    .insert(subPayload)
    .select().maybeSingle();

  if (subErr) {
    console.error('Submission insert error:', subErr.message);
    return res.status(500).json({ error: 'Failed to save submission: ' + subErr.message });
  }

  res.status(201).json(inserted || { ...subPayload, id: 'sub-' + Date.now(), percentage });
});

// All submissions for a test (staff view)
router.get('/api/tests/:id/submissions', verifyAuth, requireRoles('staff', 'admin'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not connected' });
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('test_submissions')
      .select('*')
      .eq('test_id', id)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    // Deduplicate: keep latest per student
    const map = new Map();
    (data || []).forEach(s => {
      const key = (s.student_email || s.student_id || s.id).toLowerCase();
      if (!map.has(key)) map.set(key, s);
    });
    res.json(Array.from(map.values()));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch submissions', details: err.message });
  }
});

// All submissions for a student (student view)
router.get('/api/student/submissions', verifyAuth, requireRoles('student', 'staff', 'admin'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not connected' });
  const { email } = req.query;
  try {
    let query = supabase.from('test_submissions').select('*').order('submitted_at', { ascending: false });
    if (email) query = query.eq('student_email', email.toLowerCase().trim());
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch student submissions', details: err.message });
  }
});


// -------------------------------------------------------------
// 6. ADMIN & USER MANAGEMENT ENDPOINTS
// -------------------------------------------------------------
router.get('/api/admin/users', verifyAuth, requireRoles('admin'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users', details: err.message });
  }
});

// Admin: Update Student Profile (service-role bypasses RLS — BUG 1 FIX)
router.put('/api/admin/students/:id', verifyAuth, requireRoles('admin'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not connected' });
  const { id } = req.params;
  const { name, reg_no, department, year, dob, assigned_staff_id, assigned_staff_name } = req.body;

  try {
    // Update users table (name)
    if (name) {
      await supabase.from('users').update({ name }).eq('id', id);
    }

    // Build students payload — only include fields that are provided
    const studentPayload = { id };
    if (reg_no !== undefined) studentPayload.reg_no = reg_no;
    if (department !== undefined) studentPayload.department = department;
    if (year !== undefined) studentPayload.year = year;
    if (dob !== undefined) studentPayload.dob = dob || null;
    if (assigned_staff_id !== undefined) studentPayload.assigned_staff_id = assigned_staff_id || null;
    if (assigned_staff_name !== undefined) studentPayload.assigned_staff_name = assigned_staff_name || null;

    const { error } = await supabase.from('students').upsert(studentPayload, { onConflict: 'id' });
    if (error) throw error;

    res.json({ success: true, message: 'Student profile updated' });
  } catch (err) {
    console.error('Admin student update error:', err.message);
    res.status(500).json({ error: 'Failed to update student: ' + err.message });
  }
});

// Admin: Update Staff Profile (service-role bypasses RLS — BUG 2 FIX)
router.put('/api/admin/staff/:id', verifyAuth, requireRoles('admin'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not connected' });
  const { id } = req.params;
  const { name } = req.body;

  try {
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const { error } = await supabase.from('users').update({ name }).eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Staff name updated' });
  } catch (err) {
    console.error('Admin staff update error:', err.message);
    res.status(500).json({ error: 'Failed to update staff: ' + err.message });
  }
});

router.put('/api/admin/users/:id/role', verifyAuth, requireRoles('admin'), async (req, res) => {
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

router.delete('/api/admin/users/:id', verifyAuth, requireRoles('admin'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not connected' });
  const { id } = req.params;
  const emailQuery = (req.query.email || '').toLowerCase().trim();

  try {
    let targetId = id;
    let targetEmail = emailQuery;

    // Resolve email from DB if not provided
    if (!targetEmail) {
      const { data: u } = await supabase.from('users').select('id, mailid').eq('id', id).maybeSingle();
      if (u) targetEmail = (u.mailid || '').toLowerCase();
    }

    // Guard: never delete Super Admin
    if (targetEmail === SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Super Admin account cannot be deleted' });
    }

    const errors = [];

    // 1. Delete from students table
    if (targetId && !targetId.startsWith('dyn-')) {
      const { error: stErr } = await supabase.from('students').delete().eq('id', targetId);
      if (stErr) errors.push('students: ' + stErr.message);

      const { error: sfErr } = await supabase.from('staff').delete().eq('id', targetId);
      if (sfErr) errors.push('staff: ' + sfErr.message);

      const { error: uErr } = await supabase.from('users').delete().eq('id', targetId);
      if (uErr) errors.push('users(id): ' + uErr.message);
    }

    // Also delete by email in case id differs
    if (targetEmail) {
      await supabase.from('users').delete().eq('mailid', targetEmail);
      await supabase.from('staff_requests').delete().eq('email', targetEmail);
    }

    // 2. Try auth.admin.deleteUser — only works with SERVICE_ROLE key
    const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (hasServiceRole && targetId && !targetId.startsWith('dyn-')) {
      try {
        const { error: authErr } = await supabase.auth.admin.deleteUser(targetId);
        if (authErr) errors.push('auth: ' + authErr.message);
      } catch (authEx) {
        errors.push('auth: ' + authEx.message);
      }
    }

    // 3. Clear in-memory role overrides
    if (targetEmail) userRoleOverrides.delete(targetEmail);

    if (errors.length > 0) {
      console.warn('User deletion partial errors:', errors);
      // Still return success if users table was cleaned (auth deletion needs service role)
      return res.json({
        success: true,
        message: `User ${targetEmail || id} removed from database. Note: ${errors.join('; ')}`,
        warnings: errors
      });
    }

    res.json({ success: true, message: `User ${targetEmail || id} completely deleted.` });
  } catch (err) {
    console.error('Delete user error:', err.message);
    res.status(500).json({ error: 'Failed to delete user', details: err.message });
  }
});

router.post('/api/admin/reset-database', verifyAuth, requireRoles('admin'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not connected' });
  try {
    await supabase.from('test_submissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('tests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    try { await supabase.from('staff_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch (_) {}

    res.json({ message: 'Database reset successfully. Only Super Admin retained.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset database', details: err.message });
  }
});

// Start Express Server (only in local dev, not on Vercel serverless)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`AssessPro Backend API running on http://localhost:${PORT}`);
    console.log(`Allowed Domain Enforcement: @${ALLOWED_DOMAIN}`);
  });
}

// Export for Vercel serverless
export default app;


export default router;
