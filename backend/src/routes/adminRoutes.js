import express from 'express';
import { supabase, SUPER_ADMIN_EMAIL, ALLOWED_DOMAIN } from '../config/db.js';
import { verifyAuth, requireRoles, requireOwnEmail } from '../middlewares/authMiddleware.js';
import { resolveRoleFromEmail } from '../middlewares/authMiddleware.js';

import { userRoleOverrides } from '../config/store.js';

const router = express.Router();

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


// Ban a user
router.post('/api/admin/ban', verifyAuth, requireRoles('admin'), async (req, res) => {
  const { email, ban_type } = req.body;
  if (!email || !ban_type) return res.status(400).json({ error: 'Missing email or ban_type' });
  
  try {
    const { error: banErr } = await supabase
      .from('banned_users')
      .upsert({ email: email.toLowerCase().trim(), ban_type, request_state: 'none' });
      
    if (banErr) throw banErr;

    if (ban_type === 'suspended_hard') {
      // Find user ID
      const { data: user } = await supabase.from('users').select('id').eq('mailid', email).maybeSingle();
      if (user) {
        // We delete from public.users which triggers CASCADE to students and test_submissions
        // But the user remains in auth.users so they can login and see the banned screen!
        await supabase.from('users').delete().eq('id', user.id);
      }
    }
    
    res.json({ message: 'User banned successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to ban user', details: err.message });
  }
});

// Get student reinstatement requests
router.get('/api/admin/student-requests', verifyAuth, requireRoles('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('banned_users')
      .select('*')
      .neq('request_state', 'none');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests', details: err.message });
  }
});

// Handle student reinstatement request
router.post('/api/admin/student-requests/resolve', verifyAuth, requireRoles('admin'), async (req, res) => {
  const { email, action } = req.body; // action: 'approve' or 'deny'
  try {
    if (action === 'approve') {
      await supabase.from('banned_users').delete().eq('email', email);
    } else {
      await supabase.from('banned_users').update({ request_state: 'denied' }).eq('email', email);
    }
    res.json({ message: 'Request resolved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve request', details: err.message });
  }
});

export default router;
