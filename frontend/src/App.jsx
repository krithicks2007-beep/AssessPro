import React, { useState, useEffect, useCallback } from 'react';
import { 
  getSupabaseClient, 
  resolveRoleFromEmail,
  saveStudentProfileDirect,
  fetchStudentProfileDirect
} from './supabaseClient';
import api from './api';
import LoginPage from './components/auth/LoginPage';
import StudentLayout from './components/student/StudentLayout';
import StaffLayout from './components/staff/StaffLayout';
import AdminLayout from './components/admin/AdminLayout';
import AuthErrorModal from './components/auth/AuthErrorModal';
import StudentOnboardingModal from './components/student/StudentOnboardingModal';
import RoleSelectionModal from './components/auth/RoleSelectionModal';
import DeletedUserScreen from './components/auth/DeletedUserScreen';
import { isMasterAccount, parseBitEmail } from './utils/studentParser';
import { GraduationCap, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState(null); // 'student' | 'staff' | 'admin'
  const [studentProfile, setStudentProfile] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [authError, setAuthError] = useState('');
  const [banDetails, setBanDetails] = useState(null);
  const [appActionSuccess, setAppActionSuccess] = useState('');
  const [appActionError, setAppActionError] = useState('');
  
  // Impersonation state
  const [impersonatedUser, setImpersonatedUser] = useState(null);
  const [impersonatedRole, setImpersonatedRole] = useState(null);

  const validateAndSetSession = useCallback(async (currentSession) => {
    console.log('validateAndSetSession called for user:', currentSession?.user?.email);
    if (!currentSession?.user) {
      console.log('No user in session, returning early');
      return;
    }

    const user = currentSession.user;
    const email = (user?.email || '').toLowerCase().trim();

    // Save auth token for backend API requests
    if (currentSession.access_token) {
      localStorage.setItem('assesspro_auth_token', currentSession.access_token);
    }

    setAuthError('');
    setSession(currentSession);
    setCurrentUser(user);

    // Determine verified role securely from the backend API
    let targetRole = 'unassigned';
    let isDeletedOrNew = false;
    try {
      console.log('Fetching user profile from backend...');
      const profileInfo = await api.getUserProfile();
      console.log('Profile info received:', profileInfo);
      if (profileInfo) {
        if (profileInfo.role) targetRole = profileInfo.role;
        if (profileInfo.isDeletedOrNew) isDeletedOrNew = true;
      }
    } catch (e) {
      if (e.message === 'ACCOUNT_BANNED') {
        targetRole = 'banned';
      } else if (e.message === 'ACCOUNT_DELETED') {
        targetRole = 'deleted';
      } else {
        console.warn('Failed to securely fetch role from backend, falling back to client logic.', e);
        targetRole = resolveRoleFromEmail(email);
      }
      
      if (targetRole === 'unassigned' || targetRole === 'pending_staff') {
        try {
          const statusRes = await api.checkStaffRequestStatus(email);
          if (statusRes?.role === 'staff' || statusRes?.status === 'approved') {
            targetRole = 'staff';
          } else if (statusRes?.role === 'student') {
            targetRole = 'student';
          } else if (statusRes?.status === 'pending' || statusRes?.role === 'pending_staff') {
            targetRole = 'pending_staff';
          }
        } catch (_err) {}
      }
    }

    const cleanEmail = email.toLowerCase().trim();
    console.log('Determined targetRole:', targetRole, 'isDeletedOrNew:', isDeletedOrNew);

    // If role is unassigned or profile is marked deleted/new/banned:
    if (targetRole === 'unassigned' || isDeletedOrNew || targetRole === 'deleted' || targetRole === 'banned') {
      console.log('Clearing local storage cache because role is unassigned, deleted, banned, or profile is new');
      localStorage.removeItem(`assesspro_student_prof_${cleanEmail}`);
      localStorage.removeItem(`assesspro_role_${cleanEmail}`);
      localStorage.removeItem(`assesspro_subs_${cleanEmail}`);
      localStorage.removeItem('assesspro_staff_student_mapping');
      localStorage.removeItem('assesspro_staff_requests');
      setStudentProfile(null);
      if (targetRole !== 'deleted' && targetRole !== 'banned') {
        targetRole = 'unassigned';
      }
    }

    if (cleanEmail === 'krithickrajs.cs25@bitsathy.ac.in') {
      targetRole = 'admin';
    }

    console.log('Setting currentRole to:', targetRole);
    setCurrentRole(targetRole);

    // Fetch student profile in background (never blocks or redirects)
    if (targetRole === 'student') {
      try {
        let existingProf = null;

        // 1. Try direct Supabase lookup
        const supabase = getSupabaseClient();
        if (supabase) {
          existingProf = await fetchStudentProfileDirect(supabase, cleanEmail);
        }

        // 2. Try cached profile in localStorage ONLY IF not deleted or new
        if (!existingProf && !isDeletedOrNew) {
          try {
            const cached = localStorage.getItem(`assesspro_student_prof_${cleanEmail}`);
            if (cached) existingProf = JSON.parse(cached);
          } catch {}
        }

        if (existingProf) {
          setStudentProfile(existingProf);
        } else {
          setStudentProfile(null);
          // For any new student without a completed profile: open profile form
          setShowOnboarding(true);
        }
      } catch (err) {
        console.warn('Student profile check note:', err);
      }
    }
  }, []);

  // Listen to Supabase auth state changes and initial session
  useEffect(() => {
    // 1. Check if OAuth returned an error in URL hash (#error=...)
    if (window.location.hash && window.location.hash.includes('error=')) {
      console.log('OAuth error detected in hash:', window.location.hash);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const errorDesc = hashParams.get('error_description') || hashParams.get('error') || 'Authentication failed';
      setTimeout(() => setAuthError(`Sign-in rejected: ${decodeURIComponent(errorDesc)}`), 0);
      window.history.replaceState(null, '', window.location.pathname);
    }

    // 2. Check if OAuth returned an error in query string (?error=...)
    if (window.location.search && window.location.search.includes('error=')) {
      console.log('OAuth error detected in search query:', window.location.search);
      const searchParams = new URLSearchParams(window.location.search);
      const errorDesc = searchParams.get('error_description') || searchParams.get('error') || 'OAuth state expired or invalid';
      const cleanDesc = decodeURIComponent(errorDesc).replace(/\+/g, ' ');
      setTimeout(() => setAuthError(`Google Sign-In failed: ${cleanDesc}. Please click 'Continue with Google' again to retry.`), 0);
      window.history.replaceState(null, '', window.location.pathname);
    }

    const supabase = getSupabaseClient();
    if (!supabase) return;

    let isMounted = true;

    // Subscribe to auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('onAuthStateChange fired with event:', event, 'session user:', session?.user?.email);
      if (!isMounted) return;
      if (event === 'SIGNED_OUT') {
        console.log('SIGNED_OUT event received, clearing session');
        setSession(null);
        setCurrentUser(null);
        setCurrentRole(null);
        localStorage.removeItem('assesspro_auth_token');
        return;
      }
      if (session?.user) {
        validateAndSetSession(session);
      }
    });

    // Check current active session on load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      if (session?.user) {
        validateAndSetSession(session);
      } else {
        // Fallback for manual logins where session is only in localStorage
        const token = localStorage.getItem('assesspro_auth_token');
        if (token) {
          try {
            const profileInfo = await api.getUserProfile();
            if (profileInfo && profileInfo.user) {
              validateAndSetSession({ user: profileInfo.user, access_token: token });
            } else {
              localStorage.removeItem('assesspro_auth_token');
            }
          } catch (e) {
            console.warn('Manual session restore failed:', e.message);
          }
        }
      }
    });

    const handleSessionExpired = async () => {
      setAuthError('Your session has expired. Please log in again.');
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Silent signout failure during session expiry:', err.message);
      }
      setSession(null);
      setCurrentUser(null);
      setCurrentRole(null);
      localStorage.removeItem('assesspro_auth_token');
    };
    
    const handleAccountDeleted = () => {
      setCurrentRole('deleted');
      setLoading(false);
    };

    const handleAccountBanned = (e) => {
      setBanDetails(e.detail);
      setCurrentRole('banned');
      setLoading(false);
    };

    window.addEventListener('session-expired', handleSessionExpired);
    window.addEventListener('account-deleted', handleAccountDeleted);
    window.addEventListener('account-banned', handleAccountBanned);

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      window.removeEventListener('session-expired', handleSessionExpired);
      window.removeEventListener('account-deleted', handleAccountDeleted);
      window.removeEventListener('account-banned', handleAccountBanned);
    };
  }, [validateAndSetSession]);

  // Global Presence Heartbeat
  useEffect(() => {
    if (!currentUser || !currentRole || currentRole === 'unassigned') return;
    
    const sendPing = () => {
      const email = currentUser.email;
      const name = currentUser.user_metadata?.full_name || studentProfile?.name || email.split('@')[0];
      const activeTestId = sessionStorage.getItem('active_exam_id');
      const status = activeTestId ? 'In Exam' : 'Online - Active';
      
      api.sendHeartbeat(email, name, currentRole, status, activeTestId);
    };

    // Send immediately on login/role change
    sendPing();

    // Then ping every 60 seconds
    const interval = setInterval(sendPing, 60000);
    return () => clearInterval(interval);
  }, [currentUser, currentRole, studentProfile]);

  const handleSignOut = async () => {
    localStorage.removeItem('assesspro_auth_token');
    const cleanEmail = (currentUser?.email || '').toLowerCase().trim();
    if (cleanEmail) {
      localStorage.removeItem(`assesspro_role_${cleanEmail}`);
      localStorage.removeItem(`assesspro_student_prof_${cleanEmail}`);
      localStorage.removeItem(`assesspro_subs_${cleanEmail}`);
    }
    localStorage.removeItem('assesspro_staff_student_mapping');
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {}
    }
    setSession(null);
    setCurrentUser(null);
    setCurrentRole(null);
    setStudentProfile(null);
    setShowOnboarding(false);
    setImpersonatedUser(null);
    setImpersonatedRole(null);
  };

  const handleEnterDemo = (role) => {
    setCurrentRole(role);
    if (role === 'student') {
      const demoEmail = 'krithickrajs.cs25@bitsathy.ac.in';
      setCurrentUser({
        email: demoEmail,
        user_metadata: { full_name: 'Krithick Raj S' }
      });
      setStudentProfile({
        name: 'Krithick Raj S',
        email: demoEmail,
        reg_no: '7376251CS101',
        department: 'Computer Science and Engineering',
        year: 'II Year (Second Year)',
        section: 'A',
        dob: '2005-08-12',
        phone: '9876543210'
      });
    } else if (role === 'staff') {
      setCurrentUser({
        email: 'bitsenthil@bitsathy.ac.in',
        user_metadata: { full_name: 'Dr. Senthilkumar P' }
      });
    } else {
      setCurrentUser({
        email: 'admin@bitsathy.ac.in',
        user_metadata: { full_name: 'System Admin' }
      });
    }
  };

  // If user is logged in, show their dedicated full-screen dashboard matching the screenshots
  if (currentUser) {
    const activeRole = impersonatedRole || currentRole;
    const activeUser = impersonatedUser || currentUser;

    const isSuperAdmin = isMasterAccount(currentUser?.email);
    const userEmail = (activeUser?.email || '').toLowerCase().trim();
    const isBitDomain = userEmail.endsWith('@bitsathy.ac.in');
    const parsedBit = isBitDomain ? parseBitEmail(userEmail) : null;

    // Student profile fallback
    const effectiveStudentProfile = studentProfile || {
      name: activeUser?.user_metadata?.full_name || activeUser?.user_metadata?.name || userEmail.split('@')[0],
      email: activeUser?.email,
      institution: isBitDomain ? 'Bannari Amman Institute of Technology' : '',
      reg_no: isBitDomain ? (parsedBit?.predictedRegNo || activeUser?.reg_no || '') : '',
      department: isBitDomain ? (parsedBit?.department || activeUser?.department || '') : '',
      year: isBitDomain ? (parsedBit?.academicYear || activeUser?.year || '') : '',
      section: '',
      dob: '',
      phone: ''
    };

    return (
      <div style={{ position: 'relative', width: '100%', minHeight: '100vh', paddingTop: impersonatedUser ? '40px' : '0' }}>
        {impersonatedUser && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#ef4444', color: '#fff', zIndex: 999999, padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>
            ⚠️ You are currently viewing AssessPro as {activeRole}: {activeUser?.user_metadata?.full_name || activeUser?.name || activeUser?.email}. 
            <button onClick={() => { setImpersonatedUser(null); setImpersonatedRole(null); }} style={{ marginLeft: '10px', padding: '4px 12px', cursor: 'pointer', background: '#fff', color: '#ef4444', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Return to Admin</button>
          </div>
        )}
        
        {/* Prominent Super Admin Switcher Bar */}
        {isSuperAdmin && (
          <div style={{
            position: 'fixed',
            top: '12px',
            right: '20px',
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '30px',
            padding: '4px 10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 800, paddingLeft: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>👑</span> Super Admin:
            </span>
            <button
              onClick={() => setCurrentRole('student')}
              style={{
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: 700,
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                background: currentRole === 'student' ? '#1d72fe' : 'rgba(255,255,255,0.12)',
                color: '#fff',
                transition: 'all 0.2s'
              }}
            >
              Student View
            </button>
            <button
              onClick={() => setCurrentRole('staff')}
              style={{
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: 700,
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                background: currentRole === 'staff' ? '#10b981' : 'rgba(255,255,255,0.12)',
                color: '#fff',
                transition: 'all 0.2s'
              }}
            >
              Faculty View
            </button>
            <button
              onClick={() => setCurrentRole('admin')}
              style={{
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: 700,
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                background: currentRole === 'admin' ? '#8b5cf6' : 'rgba(255,255,255,0.12)',
                color: '#fff',
                transition: 'all 0.2s'
              }}
            >
              Admin Console
            </button>
          </div>
        )}

        {(currentRole === 'unassigned' || currentRole === 'pending_staff') && (
          <RoleSelectionModal
            user={currentUser}
            onRoleConfirmed={(role) => {
              setCurrentRole(role);
              if (role === 'student') {
                const cleanEmail = (currentUser?.email || '').toLowerCase().trim();
                localStorage.removeItem(`assesspro_student_prof_${cleanEmail}`);
                setStudentProfile(null);
                setShowOnboarding(true);
              }
            }}
            onSignOut={handleSignOut}
          />
        )}

        {(currentRole === 'deleted' || currentRole === 'banned') && (
          <DeletedUserScreen 
            user={currentUser} 
            role={currentRole} 
            banDetails={banDetails} 
            onSignOut={handleSignOut} 
          />
        )}

        {activeRole === 'student' && (
          <StudentLayout 
            user={activeUser} 
            studentProfile={effectiveStudentProfile}
            onRequestEditProfile={() => setShowOnboarding(true)}
            onSignOut={handleSignOut} 
          />
        )}
        {activeRole === 'staff' && (
          <StaffLayout user={activeUser} onSignOut={handleSignOut} initialTab="Dashboard" />
        )}
        {activeRole === 'admin' && (
          <AdminLayout 
            user={activeUser} 
            onSignOut={handleSignOut} 
            onImpersonate={(u, r) => { setImpersonatedUser(u); setImpersonatedRole(r); }}
          />
        )}

        {/* Student Onboarding & Profile Modal */}
        <StudentOnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          user={currentUser}
          studentProfile={studentProfile}
          onProfileSaved={async (savedData) => {
            try {
              const fullData = {
                ...savedData,
                id: currentUser?.id,
                email: currentUser?.email || savedData.email
              };

              // 1. Try to persist through the authenticated API first.
              try {
                await api.saveStudentProfile(fullData);
              } catch (apiErr) {
                console.warn('Backend profile save failed (falling back to direct DB):', apiErr.message);
              }

              // 2. Direct Supabase Fallback
              const supabase = getSupabaseClient();
              let fallbackSuccess = false;
              if (supabase) {
                try {
                  const saved = await saveStudentProfileDirect(supabase, fullData);
                  if (saved) fallbackSuccess = true;
                } catch (sbErr) {
                  console.warn('Direct Supabase profile save failed:', sbErr.message);
                }
              }

              // 3. Local storage cache for instant offline & page reload persistence
              if (fullData.email) {
                localStorage.setItem(
                  `assesspro_student_prof_${fullData.email.toLowerCase()}`, 
                  JSON.stringify(fullData)
                );
              }

              setStudentProfile(fullData);
              setShowOnboarding(false);
              setAppActionSuccess('Profile updated successfully!');
              setTimeout(() => setAppActionSuccess(''), 3000);
            } catch (err) {
              console.error('Profile save failed:', err);
              setAppActionError(err.message || 'Profile could not be saved.');
              setTimeout(() => setAppActionError(''), 4000);
            }
          }}
        />

        {/* Global Floating Toasts for App-level actions (like student profile) */}
        {appActionSuccess && (
          <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, background: '#10b981', color: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
            <CheckCircle2 size={20} />
            <span>{appActionSuccess}</span>
          </div>
        )}
        {appActionError && (
          <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, background: '#ef4444', color: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
            <AlertCircle size={20} />
            <span>{appActionError}</span>
          </div>
        )}
      </div>
    );
  }

  // Not logged in: Show the clean centered Login view with top bar
  return (
    <div className="app-container">
      {/* Light Navbar */}
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">
            <GraduationCap size={20} />
          </div>
          <div className="brand-info">
            <span className="brand-title">AssessPro</span>
            <span className="brand-subtitle">Bannari Amman Institute of Technology</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="domain-pill">
            <span className="domain-dot" />
            <span>Google Single Sign-On</span>
          </div>
        </div>
      </header>

      {/* Main Content (Centered Login Card) */}
      <main className="main-content">
        <AuthErrorModal
          isOpen={Boolean(authError)}
          onClose={() => setAuthError('')}
          error={authError}
        />

        <LoginPage
          onLoginSuccess={(user) => {
            const token = localStorage.getItem('assesspro_auth_token');
            validateAndSetSession({ user, access_token: token });
          }}
          onEnterDemo={handleEnterDemo}
        />
      </main>

      {/* Clean Light Footer */}
      <footer className="footer">
        AssessPro &bull; Continuous Assessment Portal
      </footer>
    </div>
  );
}
