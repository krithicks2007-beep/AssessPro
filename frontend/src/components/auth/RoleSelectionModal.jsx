import React, { useState, useEffect } from 'react';
import { GraduationCap, Users, Clock, CheckCircle2, ArrowRight, ShieldAlert, LogOut } from 'lucide-react';
import api from '../../api';

export default function RoleSelectionModal({ user, onRoleConfirmed, onSignOut }) {
  const [loading, setLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const email = (user?.email || '').toLowerCase().trim();
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || email.split('@')[0];

  // Check if there is already an approved or pending staff request
  useEffect(() => {
    let timer;
    const checkStatus = async () => {
      try {
        const res = await api.checkStaffRequestStatus(email);
        if (res?.role === 'staff' || res?.status === 'approved') {
          clearInterval(timer);
          onRoleConfirmed('staff');
          return;
        } else if (res?.status === 'pending' || res?.role === 'pending_staff') {
          setIsPending(true);
        }
      } catch (_e) {}
    };

    checkStatus();

    // Always poll every 3 seconds so approval is detected quickly without a page reload
    timer = setInterval(checkStatus, 3000);

    return () => {
      clearInterval(timer);
    };
  }, [email, onRoleConfirmed]);

  const handleSelectStudent = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.selectRoleChoice(email, userName, 'student');
      onRoleConfirmed('student');
    } catch (err) {
      setErrorMsg('Failed to set role: ' + err.message);
      setLoading(false);
    }
  };

  const handleSelectStaff = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.selectRoleChoice(email, userName, 'staff');
      setIsPending(true);
    } catch (err) {
      setErrorMsg('Failed to request staff role: ' + err.message);
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
        maxWidth: '560px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1d72fe 0%, #2563eb 100%)',
          padding: '1.75rem 2rem',
          color: '#ffffff',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🎓</span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Welcome to AssessPro
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', opacity: 0.9 }}>
            Signed in with <strong>{email}</strong>
          </p>
        </div>

        {/* Content Body */}
        <div style={{ padding: '2rem' }}>
          {errorMsg && (
            <div style={{
              background: '#fee2e2',
              color: '#b91c1c',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              fontSize: '0.84rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <ShieldAlert size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {isPending ? (
            /* Pending Approval Screen */
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                boxShadow: '0 4px 14px rgba(217, 119, 6, 0.2)'
              }}>
                <Clock size={34} style={{ animation: 'spin 4s linear infinite' }} />
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
                Staff Approval Request Sent
              </h3>
              
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                margin: '1.25rem 0',
                fontSize: '0.88rem',
                color: '#1e40af',
                lineHeight: 1.5
              }}>
                Your request to gain <strong>Staff / Faculty privileges</strong> has been transmitted to the Administrator.
                <div style={{ marginTop: '0.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
                  Listening live for Administrator approval...
                </div>
              </div>

              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem' }}>
                As soon as the Administrator clicks <strong>Approve</strong> in the admin panel, your screen will automatically switch to your fresh Staff Portal!
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button
                  onClick={handleSelectStudent}
                  disabled={loading}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer'
                  }}
                >
                  Switch to Student Access
                </button>
                <button
                  onClick={onSignOut}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#f1f5f9',
                    color: '#dc2626',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            /* Role Selection Screen */
            <div>
              <p style={{ fontSize: '0.92rem', color: '#475569', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Please choose your role to configure your AssessPro workspace:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
                {/* Option 1: Student */}
                <div
                  onClick={handleSelectStudent}
                  style={{
                    border: '2px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    background: '#f8fafc'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#1d72fe';
                    e.currentTarget.style.background = '#eff6ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.background = '#f8fafc';
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#dbeafe',
                    color: '#1d72fe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <GraduationCap size={26} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>I am a Student</h4>
                      <span style={{
                        background: '#dcfce7',
                        color: '#15803d',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '20px'
                      }}>Instant Access</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
                      Directly enter the student dashboard to take assessments, track group performance, and build your score record without waiting.
                    </p>
                  </div>
                  <ArrowRight size={18} color="#1d72fe" />
                </div>

                {/* Option 2: Staff */}
                <div
                  onClick={handleSelectStaff}
                  style={{
                    border: '2px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    background: '#f8fafc'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.background = '#f0fdf4';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.background = '#f8fafc';
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#d1fae5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Users size={26} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>I am Faculty / Staff</h4>
                      <span style={{
                        background: '#fef3c7',
                        color: '#b45309',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '20px'
                      }}>Requires Admin Approval</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
                      Create tests, assign tests to specific students, manage groups, and track student submissions. A request will be sent to the administrator.
                    </p>
                  </div>
                  <ArrowRight size={18} color="#059669" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={onSignOut}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <LogOut size={13} />
                  <span>Cancel & Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
