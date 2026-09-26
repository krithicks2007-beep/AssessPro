import React, { useState } from 'react';
import { 
  signInWithGoogleBitsathy, 
  signInWithEmailPassword,
  getSupabaseClient, 
  getSupabaseConfig 
} from '../../supabaseClient';
import { GraduationCap, AlertCircle, Eye, EyeOff } from 'lucide-react';

import api from '../../api';

export default function LoginPage({ onLoginSuccess, onEnterDemo }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { allowedDomain } = getSupabaseConfig();

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

  // Handle Google OAuth Sign In (@bitsathy.ac.in)
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
    <div className="login-card-wrapper">
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="login-badge-icon">
            <GraduationCap size={28} />
          </div>
          <h1 className="login-title">Sign in to AssessPro</h1>
          <p className="login-subtitle">
            Enter your institutional <strong>@{allowedDomain}</strong> credentials
          </p>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="alert alert-error">
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* Mail ID & Password Form */}
        <form onSubmit={handleEmailSignIn}>
          <div className="form-group">
            <label className="form-label">Mail ID</label>
            <input
              type="email"
              className="form-input"
              placeholder={`name@${allowedDomain}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-submit"
            disabled={loading || googleLoading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="divider">
          <span>or</span>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          className="btn-google-light"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
        >
          <svg 
            className="google-icon-svg" 
            viewBox="0 0 24 24" 
            width="20" 
            height="20" 
            style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px', flexShrink: 0 }}
          >
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.14C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.59H1.27C.46 8.21 0 10.05 0 12s.46 3.79 1.27 5.41l4.01-3.14z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.27 6.59l4.01 3.14c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>{googleLoading ? 'Connecting...' : 'Sign in with Google'}</span>
        </button>

      </div>
    </div>
  );
}
