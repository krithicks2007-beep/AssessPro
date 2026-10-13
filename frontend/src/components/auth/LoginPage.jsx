import React, { useState } from 'react';
import { 
  signInWithGoogleBitsathy, 
  getSupabaseClient
} from '../../supabaseClient';
import { 
  GraduationCap, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Mail, 
  Lock, 
  Globe, 
  KeyRound, 
  ArrowRight 
} from 'lucide-react';
import api from '../../api';

export default function LoginPage({ onLoginSuccess, onEnterDemo }) {
  const [activeTab, setActiveTab] = useState('google'); // 'google' | 'email'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle Email / Password Login via Backend API
  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const data = await api.login(email, password);
      if (data?.user) {
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to sign in. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google OAuth Sign In for any email address.
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    const supabase = getSupabaseClient();

    if (!supabase) {
      setErrorMsg('Supabase client is not connected.');
      return;
    }

    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogleBitsathy(supabase);
      if (error) throw error;
    } catch (err) {
      setErrorMsg(err.message || 'Failed to initialize Google Sign In.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="login-screen">
      {/* Soft Ambient Background Light */}
      <div className="login-bg-glow" />

      {/* Main Login Card */}
      <div className="login-card">
        {/* Portal Header */}
        <div className="login-header">
          <div className="login-brand-icon">
            <GraduationCap size={26} strokeWidth={2.2} />
          </div>
          <h1 className="login-title">AssessPro</h1>
          <p className="login-subtitle">Institutional Assessment Workspace</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Segmented Tab Switcher */}
        <div className="login-tab-group" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'google'}
            onClick={() => { setActiveTab('google'); setErrorMsg(''); }}
            className={`login-tab-btn ${activeTab === 'google' ? 'active' : ''}`}
          >
            <Globe size={15} />
            <span>Single Sign-On</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'email'}
            onClick={() => { setActiveTab('email'); setErrorMsg(''); }}
            className={`login-tab-btn ${activeTab === 'email' ? 'active' : ''}`}
          >
            <KeyRound size={15} />
            <span>Credentials</span>
          </button>
        </div>

        {/* Tab Content Container with Smooth Switch Animation */}
        <div key={activeTab} className="login-tab-content-enter">
          {activeTab === 'google' ? (
            <div className="login-sso-container">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="login-google-hero-btn"
              >
                <div className="google-icon-pill">
                  <svg viewBox="0 0 24 24" width="18" height="18" className="google-icon-svg">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.14C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.59H1.27C.46 8.21 0 10.05 0 12s.46 3.79 1.27 5.41l4.01-3.14z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.27 6.59l4.01 3.14c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                </div>
                <span>{googleLoading ? 'Redirecting to Google...' : 'Continue with Google Workspace'}</span>
              </button>
              <p className="login-sso-note">Sign in using your college email address</p>
            </div>
          ) : (
            /* Tab Content 2: Email & Password Form */
            <form onSubmit={handleEmailSignIn} className="login-form">
              <div className="login-field">
                <label htmlFor="login-email" className="login-label">
                  Institutional Email
                </label>
                <div className="login-input-group">
                  <span className="login-input-icon">
                    <Mail size={17} />
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@institution.edu"
                    required
                    className="login-input login-input-with-icon"
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="login-password" className="login-label">
                  Account Password
                </label>
                <div className="login-input-group">
                  <span className="login-input-icon">
                    <Lock size={17} />
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="login-input login-input-with-icon"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-eye-btn"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="login-submit-btn"
              >
                {loading ? 'Authenticating...' : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer Security Badge */}
        <div className="login-footer-badge">
          <ShieldCheck size={14} style={{ color: 'var(--green-primary)' }} />
          <span>Secure Institutional Single Sign-On Gateway</span>
        </div>
      </div>
    </div>
  );
}
