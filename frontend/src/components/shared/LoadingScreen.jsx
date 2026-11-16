import React from 'react';

const ACCENT = {
  student: '#1d72fe',
  staff: '#10b981',
  admin: '#8b5cf6',
};

export default function LoadingScreen({ message = 'Loading...', role = 'student' }) {
  const accent = ACCENT[role] || ACCENT.student;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f4ff 0%, #f8faff 100%)',
        gap: '1.5rem',
        fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 12px 32px ${accent}44`,
          animation: 'ap-pulse 1.6s ease-in-out infinite',
        }}
      >
        <svg width={32} height={32} viewBox="0 0 32 32" fill="none">
          <rect x={4} y={4} width={11} height={11} rx={3} fill="white" fillOpacity={0.95} />
          <rect x={17} y={4} width={11} height={11} rx={3} fill="white" fillOpacity={0.6} />
          <rect x={4} y={17} width={11} height={11} rx={3} fill="white" fillOpacity={0.6} />
          <rect x={17} y={17} width={11} height={11} rx={3} fill="white" fillOpacity={0.3} />
        </svg>
      </div>

      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '3.5px solid #e2e8f0',
          borderTopColor: accent,
          animation: 'ap-spin 0.75s linear infinite',
        }}
      />

      <div style={{ textAlign: 'center', lineHeight: 1.5 }}>
        <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#111827', letterSpacing: '-0.02em' }}>
          AssessPro
        </div>
        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
          {message}
        </div>
      </div>

      <style>{`@keyframes ap-spin { to { transform: rotate(360deg); } } @keyframes ap-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.07); } }`}</style>
    </div>
  );
}
