import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

/**
 * Fullscreen offline overlay.
 * Shown automatically whenever the browser loses network connectivity.
 * Hides automatically when the connection is restored.
 */
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [retrying, setRetrying] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    const goOffline = () => { setIsOffline(true); setFadeIn(false); setTimeout(() => setFadeIn(true), 30); };
    const goOnline  = () => setIsOffline(false);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);

    // Trigger fade-in on initial mount if already offline
    if (!navigator.onLine) setTimeout(() => setFadeIn(true), 30);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
    };
  }, []);

  if (!isOffline) return null;

  const handleRetry = () => {
    setRetrying(true);
    // Try fetching a tiny resource to confirm connectivity
    fetch('https://www.gstatic.com/generate_204', { mode: 'no-cors', cache: 'no-store' })
      .then(() => { setIsOffline(false); setRetrying(false); })
      .catch(() => { setRetrying(false); });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      {/* Animated wifi icon */}
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: 24,
          background: 'rgba(239, 68, 68, 0.15)',
          border: '2px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'off-shake 2.5s ease-in-out infinite',
        }}
      >
        <WifiOff size={40} color="#ef4444" />
      </div>

      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontWeight: 800, fontSize: '1.6rem', color: '#f1f5f9', letterSpacing: '-0.03em', margin: 0 }}>
          No Internet Connection
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginTop: '0.6rem', maxWidth: 320 }}>
          AssessPro needs an internet connection to function. Please check your network and try again.
        </p>
      </div>

      <button
        onClick={handleRetry}
        disabled={retrying}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.75rem 2rem',
          borderRadius: 12,
          border: 'none',
          background: retrying ? '#475569' : '#3b82f6',
          color: '#fff',
          fontWeight: 700,
          fontSize: '0.95rem',
          cursor: retrying ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
          boxShadow: '0 4px 20px rgba(59, 130, 246, 0.35)',
        }}
      >
        <RefreshCw size={17} style={{ animation: retrying ? 'off-spin 0.7s linear infinite' : 'none' }} />
        {retrying ? 'Checking...' : 'Retry Connection'}
      </button>

      <div style={{ color: '#475569', fontSize: '0.78rem', marginTop: '0.25rem' }}>
        The page will reload automatically when connection is restored.
      </div>

      <style>{'@keyframes off-shake { 0%,100%{transform:translateY(0)} 10%,30%,50%{transform:translateY(-6px)} 20%,40%{transform:translateY(6px)} 60%{transform:translateY(0)} } @keyframes off-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
