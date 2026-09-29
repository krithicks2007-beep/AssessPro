import React from 'react';
import { ShieldAlert, X, ArrowRight, Lock } from 'lucide-react';

export default function AuthErrorModal({ isOpen, onClose, error }) {
  if (!isOpen) return null;

  // Format raw or technical errors into a concise, user-friendly explanation.
  const getFriendlyMessage = (rawError = '') => {
    const lower = rawError.toLowerCase();
    if (lower.includes('database error') || lower.includes('saving new user') || lower.includes('access denied') || lower.includes('not authorized') || lower.includes('domain')) {
      return {
        title: 'Sign-in Could Not Be Completed',
        description: 'Please check your credentials and try again. Any valid email account supported by the configured authentication provider can sign in.',
        hint: 'Use a valid email account and try again.'
      };
    }
    return {
      title: 'Authentication Failed',
      description: rawError || 'An error occurred during authentication. Please verify your credentials and try again.',
      hint: 'Use a valid email account and try again.'
    };
  };

  const { title, description, hint } = getFriendlyMessage(error);

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #fee2e2',
          animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Top Accent Strip */}
        <div style={{ height: '5px', background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)' }} />

        <div style={{ padding: '1.75rem 1.75rem 1.5rem 1.75rem' }}>
          {/* Header with Icon and Close */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626'
            }}>
              <ShieldAlert size={26} strokeWidth={2.2} />
            </div>

            <button 
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#9ca3af',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#374151'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
            >
              <X size={20} />
            </button>
          </div>

          {/* Title & Description */}
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: '#111827',
            marginBottom: '0.6rem',
            lineHeight: 1.3
          }}>
            {title}
          </h3>

          <p style={{
            fontSize: '0.9rem',
            color: '#4b5563',
            lineHeight: 1.55,
            marginBottom: '1.25rem'
          }}>
            {description}
          </p>

          {/* Hint Card */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}>
            <Lock size={16} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.45 }}>
              {hint}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '0.8rem 1.25rem',
              backgroundColor: '#1d72fe',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(29, 114, 254, 0.25)',
              transition: 'background-color 0.15s ease, transform 0.1s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#155bd5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1d72fe'}
          >
            <span>Understood &bull; Try Again</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
