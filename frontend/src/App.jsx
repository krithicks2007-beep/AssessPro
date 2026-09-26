import React, { useState, useEffect } from 'react';
import { 
  getSupabaseClient, 
  getSupabaseConfig, 
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
import { isMasterAccount, parseBitEmail } from './utils/studentParser';
import { GraduationCap, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState(null); // 'student' | 'staff' | 'admin'
  const [studentProfile, setStudentProfile] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [appActionSuccess, setAppActionSuccess] = useState('');
  const [appActionError, setAppActionError] = useState('');

  const { allowedDomain } = getSupabaseConfig();

  // Listen to Supabase auth state changes and initial session
  useEffect(() => {
    // 1. Check if OAuth returned an error in URL hash (#error=...)
    if (window.location.hash && window.location.hash.includes('error=')) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const errorDesc = hashParams.get('error_description') || hashParams.get('error') || 'Authentication failed';
      setAuthError(`Sign-in rejected: ${decodeURIComponent(errorDesc)}`);
      window.history.replaceState(null, '', window.location.pathname);
    }

    // 2. Check if OAuth returned an error in query string (?error=...)
    if (window.location.search && window.location.search.includes('error=')) {
      const searchParams = new URLSearchParams(window.location.search);
      const errorDesc = searchParams.get('error_description') || searchParams.get('error') || 'OAuth state expired or invalid';
      const cleanDesc = decodeURIComponent(errorDesc).replace(/\+/g, ' ');
      setAuthError(`Google Sign-In Session: ${cleanDesc}. Please click 'Continue with Google' again or use the Demo Faculty button below.`);
      window.history.replaceState(null, '', window.location.pathname);
    }

    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Get current active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      validateAndSetSession(session);
    });

    // Subscribe to auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      validateAndSetSession(session);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const validateAndSetSession = async (currentSession) => {
    if (!currentSession?.user) {
      setSession(null);
      setCurrentUser(null);
      setCurrentRole(null);
      localStorage.removeItem('assesspro_auth_token');
      return;
    }

    const user = currentSession.user;
    const email = (user.email || '').toLowerCase().trim();
    const cleanDomain = (allowedDomain || 'bitsathy.ac.in').toLowerCase().trim();

    // Strict Domain Validation for @bitsathy.ac.in
    if (!email.endsWith(`@${cleanDomain}`)) {
      console.warn(`[Security Alert] Rejected non-institutional account: ${email}`);
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.error('Signout error:', e);
        }
      }
      localStorage.removeItem('assesspro_auth_token');
      
      // Wipe OAuth hash tokens from browser bar so it won't loop
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      setAuthError(
        `Access Denied: The account "${email}" is not authorized. You must sign in using your official institutional @${cleanDomain} account.`
      );
      setSession(null);
      setCurrentUser(null);
      setCurrentRole(null);
      return;
    }

    // Save auth token for backend API requests
    if (currentSession.access_token) {
      localStorage.setItem('assesspro_auth_token', currentSession.access_token);
    }

    setAuthError('');
    setSession(currentSession);
    setCurrentUser(user);

    // Fetch verified profile & role from Backend API
    setLoadingProfile(true);
    let targetRole = resolveRoleFromEmail(email);
    try {
      const result = await api.getUserProfile();
      if (result?.role) {
        targetRole = result.role;
      }
    } catch (err) {
      console.warn('Backend profile fetch note:', err.message);
    } finally {
      setCurrentRole(targetRole);
      setLoadingProfile(false);
    }

    // Check student profile setup
    if (targetRole === 'student') {
      try {
        const cleanEmail = email.toLowerCase().trim();
        let existingProf = null;

        // 1. Try direct Supabase lookup
        const supabase = getSupabaseClient();
        if (supabase) {
          existingProf = await fetchStudentProfileDirect(supabase, cleanEmail);
        }

        // 2. Try backend API lookup
        if (!existingProf) {
          existingProf = await api.getStudentProfile(cleanEmail);
        }

        // 3. Try cached profile in localStorage
        if (!existingProf) {
          try {
            const cached = localStorage.getItem(`assesspro_student_prof_${cleanEmail}`);
            if (cached) existingProf = JSON.parse(cached);
          } catch {}
        }

        if (existingProf) {
          setStudentProfile(existingProf);
          if (!existingProf.reg_no || !existingProf.dob) {
            setShowOnboarding(true);
          }
        } else if (!isMasterAccount(email)) {
          // New student: pop open onboarding form
          setShowOnboarding(true);
        } else {
          // Default profile for master account
          setStudentProfile({
            name: user.user_metadata?.full_name || 'Krithick Raj S',
            email: email,
            reg_no: '7376251CS101',
            department: 'Computer Science and Engineering',
            year: 'II Year (Second Year)',
            section: 'A',
            dob: '2005-08-12',
            phone: '9876543210'
          });
        }
      } catch (err) {
        console.warn('Student profile check error:', err);
      }
    }
  };

  const handleSignOut = async () => {
    localStorage.removeItem('assesspro_auth_token');
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setCurrentUser(null);
    setCurrentRole(null);
    setStudentProfile(null);
    setShowOnboarding(false);
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
    return (
      <div style={{ position: 'relative', width: '100%', minHeight: '100vh' }}>
        {/* Floating Master Switcher: Strictly rendered ONLY for master account (krithickrajs.cs25@bitsathy.ac.in) */}
        {isMasterAccount(currentUser?.email) && (
          <div style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            zIndex: 100,
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '30px',
            padding: '4px 8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 600, paddingLeft: '4px' }}>
              Master Admin:
            </span>
            <button
              onClick={() => setCurrentRole('student')}
              style={{
                padding: '3px 8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                background: currentRole === 'student' ? '#1d72fe' : '#f3f4f6',
                color: currentRole === 'student' ? '#fff' : '#374151'
              }}
            >
              Student
            </button>
            <button
              onClick={() => setCurrentRole('staff')}
              style={{
                padding: '3px 8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                background: currentRole === 'staff' ? '#1d72fe' : '#f3f4f6',
                color: currentRole === 'staff' ? '#fff' : '#374151'
              }}
            >
              Faculty
            </button>
            <button
              onClick={() => setCurrentRole('admin')}
              style={{
                padding: '3px 8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                background: currentRole === 'admin' ? '#1d72fe' : '#f3f4f6',
                color: currentRole === 'admin' ? '#fff' : '#374151'
              }}
            >
              Admin
            </button>
          </div>
        )}

        {currentRole === 'student' && (
          <StudentLayout 
            user={currentUser} 
            studentProfile={studentProfile}
            onRequestEditProfile={() => setShowOnboarding(true)}
            onSignOut={handleSignOut} 
          />
        )}
        {currentRole === 'staff' && (
          <StaffLayout user={currentUser} onSignOut={handleSignOut} initialTab="Tests" />
        )}
        {currentRole === 'admin' && (
          <AdminLayout user={currentUser} onSignOut={handleSignOut} />
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

              // 1. Direct Supabase save (highest reliability)
              const supabase = getSupabaseClient();
              if (supabase) {
                await saveStudentProfileDirect(supabase, fullData);
              }

              // 2. Local storage cache for instant offline & page reload persistence
              if (fullData.email) {
                localStorage.setItem(
                  `assesspro_student_prof_${fullData.email.toLowerCase()}`, 
                  JSON.stringify(fullData)
                );
              }

              // 3. Safe backend sync
              await api.saveStudentProfile(fullData);

              setStudentProfile(fullData);
              setShowOnboarding(false);
              setAppActionSuccess('Profile updated successfully!');
              setTimeout(() => setAppActionSuccess(''), 3000);
            } catch (err) {
              console.error('Profile save note:', err);
              setStudentProfile(savedData);
              setShowOnboarding(false);
              setAppActionSuccess('Profile updated!');
              setTimeout(() => setAppActionSuccess(''), 3000);
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
            <span>@{allowedDomain}</span>
          </div>
        </div>
      </header>

      {/* Main Content (Centered Login Card) */}
      <main className="main-content">
        <AuthErrorModal
          isOpen={Boolean(authError)}
          onClose={() => setAuthError('')}
          error={authError}
          allowedDomain={allowedDomain}
        />

        <LoginPage
          onLoginSuccess={(user) => {
            const email = (user?.email || '').toLowerCase().trim();
            const cleanDomain = (allowedDomain || 'bitsathy.ac.in').toLowerCase().trim();
            if (!email.endsWith(`@${cleanDomain}`)) {
              setAuthError(`Access Denied: The account "${email}" is not authorized. Only official @${cleanDomain} accounts are permitted.`);
              return;
            }
            setCurrentUser(user);
            setCurrentRole(resolveRoleFromEmail(user.email));
          }}
          onEnterDemo={handleEnterDemo}
        />
      </main>

      {/* Clean Light Footer */}
      <footer className="footer">
        AssessPro &bull; Bannari Amman Institute of Technology &bull; @bitsathy.ac.in
      </footer>
    </div>
  );
}
