import React, { useState } from 'react';
import { ShieldAlert, ArrowRight, CheckCircle2, LogOut } from 'lucide-react';
import api from '../../api';

export default function DeletedUserScreen({ user, role, banDetails, onSignOut }) {
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const email = (user?.email || '').toLowerCase().trim();
  
  const requestState = banDetails?.request_state || (requested ? 'pending' : 'none');

  const handleRequestAccess = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await api.requestReinstatement(email);
      setRequested(true);
    } catch (err) {
      setErrorMsg('Failed to send request: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '1.5rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        textAlign: 'center'
      }}>
        <div style={{
          background: requestState === 'denied' ? '#7f1d1d' : '#fee2e2',
          padding: '2rem',
          color: requestState === 'denied' ? '#fecaca' : '#ef4444',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <ShieldAlert size={48} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: requestState === 'denied' ? '#fff' : '#991b1b' }}>
            {requestState === 'denied' ? 'Access Denied' : 'Access Suspended'}
          </h2>
        </div>
        
        <div style={{ padding: '2rem' }}>
          <p style={{ color: '#475569', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            {requestState === 'denied' 
              ? `Your reinstatement request was not approved by the administrator.`
              : `Your admin removed you from Assess Pro. Please contact krithickrajs.cs25@bitsathy.ac.in.`
            }
          </p>

          {errorMsg && (
            <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {errorMsg}
            </div>
          )}

          {requestState === 'pending' ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1.5rem', borderRadius: '12px', color: '#166534', marginBottom: '1.5rem' }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>Request Sent!</h3>
              <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.9 }}>
                Your reinstatement request is currently pending admin review.
              </p>
            </div>
          ) : requestState === 'none' ? (
            <button
              onClick={handleRequestAccess}
              disabled={loading}
              style={{
                background: '#1d72fe',
                color: 'white',
                border: 'none',
                padding: '1rem',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                marginBottom: '1.5rem'
              }}
            >
              {loading ? 'Sending...' : 'Send Reinstatement Request'} <ArrowRight size={20} />
            </button>
          ) : null}

          <button
            onClick={onSignOut}
            style={{
              background: '#f8fafc',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              padding: '1rem',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              transition: 'all 0.2s'
            }}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
