import React, { useState } from 'react';
import { 
  signInWithGoogleBitsathy, 
  signInWithEmailPassword,
  getSupabaseClient
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 9999, // Ensure it covers everything
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      overflow: 'hidden'
    }}>
      <style>
        {`
          @keyframes orbit1 {
            0% { transform: rotate(0deg) translateX(250px) rotate(0deg); }
            100% { transform: rotate(360deg) translateX(250px) rotate(-360deg); }
          }
          @keyframes orbit2 {
            0% { transform: rotate(180deg) translateX(300px) rotate(-180deg); }
            100% { transform: rotate(540deg) translateX(300px) rotate(-540deg); }
          }
          @keyframes ballBounce1 {
            0% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(140px, -120px) scale(1.2); }
            66% { transform: translate(-90px, 160px) scale(0.85); }
            100% { transform: translate(60px, -70px) scale(1.05); }
          }
          @keyframes ballBounce2 {
            0% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(-160px, 110px) scale(0.9); }
            66% { transform: translate(110px, -130px) scale(1.15); }
            100% { transform: translate(-50px, 80px) scale(1); }
          }
          @keyframes ballBounce3 {
            0% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(180px, 140px) scale(1.1); }
            66% { transform: translate(-130px, -100px) scale(0.95); }
            100% { transform: translate(70px, -90px) scale(1.05); }
          }
          @keyframes ballBounce4 {
            0% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(-120px, -160px) scale(1.25); }
            66% { transform: translate(150px, 90px) scale(0.8); }
            100% { transform: translate(-80px, 50px) scale(1); }
          }
          .animated-line-1 {
            stroke-dasharray: 600;
            stroke-dashoffset: 1200;
            animation: dashFlow 16s linear infinite;
          }
          .animated-line-2 {
            stroke-dasharray: 400;
            stroke-dashoffset: 800;
            animation: dashFlowReverse 20s linear infinite;
          }
          .animated-line-3 {
            stroke-dasharray: 500;
            stroke-dashoffset: 1000;
            animation: dashFlow 24s linear infinite;
          }
          @keyframes dashFlow {
            from { stroke-dashoffset: 1200; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes dashFlowReverse {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: 1200; }
          }
        `}
      </style>
      
      {/* Dot Grid Background */}
      <div className="bg-pattern"></div>

      {/* Background Animated Orbs */}
      <div style={{
        position: 'absolute',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(29,114,254,0.12) 0%, rgba(29,114,254,0) 70%)',
        filter: 'blur(40px)',
        animation: 'orbit1 25s linear infinite',
        zIndex: 1
      }}></div>
      <div style={{
        position: 'absolute',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(148,163,184,0.15) 0%, rgba(148,163,184,0) 70%)',
        filter: 'blur(40px)',
        animation: 'orbit2 30s linear infinite',
        zIndex: 1
      }}></div>

      {/* Dynamic Animated Glowing Balls Moving in Random Directions */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '10%',
        width: '110px',
        height: '110px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(29,114,254,0.4), rgba(96,165,250,0.7))',
        filter: 'blur(12px)',
        boxShadow: '0 0 30px rgba(29,114,254,0.3)',
        animation: 'ballBounce1 18s ease-in-out infinite alternate',
        zIndex: 1
      }}></div>

      <div style={{
        position: 'absolute',
        top: '65%',
        left: '16%',
        width: '85px',
        height: '85px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(16,185,129,0.4), rgba(52,211,153,0.7))',
        filter: 'blur(10px)',
        boxShadow: '0 0 25px rgba(16,185,129,0.3)',
        animation: 'ballBounce2 22s ease-in-out infinite alternate',
        zIndex: 1
      }}></div>

      <div style={{
        position: 'absolute',
        top: '20%',
        right: '12%',
        width: '95px',
        height: '95px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(192,132,252,0.7))',
        filter: 'blur(12px)',
        boxShadow: '0 0 25px rgba(139,92,246,0.3)',
        animation: 'ballBounce3 20s ease-in-out infinite alternate',
        zIndex: 1
      }}></div>

      <div style={{
        position: 'absolute',
        bottom: '15%',
        right: '15%',
        width: '130px',
        height: '130px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(59,130,246,0.35), rgba(6,182,212,0.6))',
        filter: 'blur(14px)',
        boxShadow: '0 0 35px rgba(6,182,212,0.3)',
        animation: 'ballBounce4 25s ease-in-out infinite alternate',
        zIndex: 1
      }}></div>

      {/* Dynamic Animated Vector Lines */}
      <svg style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }}>
        <defs>
          <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1d72fe" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d="M -100 200 C 300 50, 400 600, 900 300 C 1300 50, 1600 500, 2000 200"
          fill="none"
          stroke="url(#lineGrad1)"
          strokeWidth="3"
          className="animated-line-1"
        />
        <path
          d="M 2000 800 C 1400 950, 1100 400, 600 700 C 200 1000, -100 600, -300 800"
          fill="none"
          stroke="url(#lineGrad2)"
          strokeWidth="2.5"
          className="animated-line-2"
        />
        <path
          d="M 100 -100 C 500 400, 200 800, 800 1100"
          fill="none"
          stroke="url(#lineGrad3)"
          strokeWidth="2"
          className="animated-line-3"
        />
      </svg>

      {/* Central Login Card */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '3.5rem',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
        border: '1px solid #e2e8f0',
        width: '100%',
        maxWidth: '440px',
        position: 'relative',
        zIndex: 10
      }}>
        
        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div style={{ width: '48px', height: '48px', background: '#1d72fe', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 16px rgba(29,114,254,0.2)' }}>
              <GraduationCap size={28} />
            </div>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>
            AssessPro.
          </h1>
          <p style={{ fontSize: '1rem', color: '#64748b', margin: 0 }}>
            Sign in to your account
          </p>
        </div>

        {errorMsg && (
          <div style={{ padding: '0.85rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          style={{
            width: '100%',
            padding: '0.85rem',
            backgroundColor: '#ffffff',
            color: '#334155',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '2rem',
            transition: 'all 0.2s',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.14C3.26 21.36 7.33 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.59H1.27C.46 8.21 0 10.05 0 12s.46 3.79 1.27 5.41l4.01-3.14z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.27 6.59l4.01 3.14c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          {googleLoading ? 'Connecting...' : 'Continue with Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
          <span style={{ padding: '0 1rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 }}>or email</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
        </div>

        <form onSubmit={handleEmailSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'all 0.2s',
                boxSizing: 'border-box',
                background: '#f8fafc',
                color: '#0f172a'
              }}
              onFocus={(e) => { e.target.style.borderColor = '#1d72fe'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(29,114,254,0.1)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  paddingRight: '3rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  background: '#f8fafc',
                  color: '#0f172a'
                }}
                onFocus={(e) => { e.target.style.borderColor = '#1d72fe'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(29,114,254,0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            style={{
              width: '100%',
              padding: '0.85rem',
              backgroundColor: '#1d72fe',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px rgba(29,114,254,0.2)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#1661df'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#1d72fe'; }}
          >
            {loading ? 'Signing in...' : 'Sign in manually'}
          </button>
        </form>

      </div>
    </div>
  );
}
