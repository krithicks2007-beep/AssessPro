import { supabase, ALLOWED_DOMAIN, SUPER_ADMIN_EMAIL } from '../config/db.js';

export const resolveRoleFromEmail = (email = '') => {
  const cleanEmail = (email || '').toLowerCase().trim();
  if (!cleanEmail) return 'student';

  if (cleanEmail === SUPER_ADMIN_EMAIL) {
    return 'admin';
  }
  if (cleanEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
    const localPart = cleanEmail.split('@')[0];
    if (/\d/.test(localPart)) {
      return 'student';
    }
    return 'staff';
  }
  return 'unassigned';
};

export const verifyAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 'AUTH_REQUIRED', error: 'Authentication required' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return res.status(401).json({ code: 'AUTH_REQUIRED', error: 'Authentication required' });
  if (!supabase) return res.status(503).json({ code: 'SERVICE_UNAVAILABLE', error: 'Authentication service is not configured' });

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ code: 'TOKEN_EXPIRED', error: 'Invalid or expired session' });
    }

    req.user = user;

    // Check ban status first
    const { data: banData, error: banErr } = await supabase
      .from('banned_users')
      .select('*')
      .eq('email', user.email.toLowerCase().trim())
      .maybeSingle();

    console.log(`[verifyAuth] Checking ban for ${user.email.toLowerCase().trim()} ->`, banData, banErr);

    if (banData && banData.request_state !== 'approved') {
      return res.status(401).json({ 
        code: 'ACCOUNT_BANNED', 
        error: 'Your admin removed you from Assess Pro.',
        banDetails: banData 
      });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('UserType')
      .eq('id', user.id)
      .maybeSingle();
    
    if (!profile && user.email !== SUPER_ADMIN_EMAIL) {
      return res.status(401).json({ code: 'ACCOUNT_DELETED', error: 'Account has been deleted' });
    }

    req.userRole = String(profile?.UserType || resolveRoleFromEmail(user.email)).toLowerCase().trim();
    return next();
  } catch (err) {
    return res.status(401).json({ code: 'TOKEN_EXPIRED', error: 'Unable to verify session' });
  }
};

export const requireRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.userRole)) {
    return res.status(403).json({ code: 'PERMISSION_DENIED', error: 'You do not have permission to perform this action' });
  }
  return next();
};

export const requireOwnEmail = (req, res, next) => {
  const requestedEmail = String(req.body?.email || req.query?.email || '').toLowerCase().trim();
  const authenticatedEmail = String(req.user?.email || '').toLowerCase().trim();
  if (requestedEmail && requestedEmail !== authenticatedEmail && req.userRole !== 'admin') {
    return res.status(403).json({ code: 'ACCESS_DENIED', error: 'You can only access your own account' });
  }
  return next();
};
