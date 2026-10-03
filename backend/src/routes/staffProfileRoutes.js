import express from 'express';
import { supabase, SUPER_ADMIN_EMAIL, ALLOWED_DOMAIN } from '../config/db.js';
import { verifyAuth, requireRoles, requireOwnEmail } from '../middlewares/authMiddleware.js';
import { resolveRoleFromEmail } from '../middlewares/authMiddleware.js';

import { userRoleOverrides } from '../config/store.js';

const router = express.Router();

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

export default router;
