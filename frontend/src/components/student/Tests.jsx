import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Lock
} from 'lucide-react';

/**
 * Student Tests Tab
 * Shows all scheduled assessments with live countdown, status badges, and launch buttons.
 */
export default function Tests({
  tests,
  studentSubmissions,
  currentTime,
  onLaunchTest
}) {
  return (
    <div className="dashboard-content">
      <div style={{
        background: '#ffffff',
        padding: '1.25rem 1.75rem',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Scheduled Assessments & Tests
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            Take active MCQ examinations, view live countdown timer, and avoid tab switching to maintain academic integrity.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <div style={{
            background: '#eff6ff',
            border: '1px solid #dbeafe',
            color: '#1d72fe',
            padding: '0.4rem 0.85rem',
            borderRadius: '10px',
            fontSize: '0.78rem',
            fontWeight: 700
          }}>
            {tests.length} Total Tests
          </div>
        </div>
      </div>

      {/* Tests Grid or Clean Empty State */}
      {tests.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          padding: '3.5rem 2rem',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#eff6ff',
            color: '#1d72fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <Clock size={28} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem' }}>
            No Assessments Scheduled Yet
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>
            There are currently no active or upcoming tests scheduled for your department. Once your faculty schedules and publishes a test, it will appear here automatically.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {tests.map(test => {
          const submission = studentSubmissions.find(s => 
            (s.test_id && String(s.test_id).trim() === String(test.id).trim()) ||
            (s.test_title && test.title && s.test_title.trim().toLowerCase() === test.title.trim().toLowerCase())
          );
          const isCompleted = Boolean(submission);

          const hasStartTime = Boolean(test.start_time);
          const hasEndTime = Boolean(test.end_time);
          const startTimeMs = hasStartTime ? new Date(test.start_time).getTime() : 0;
          const endTimeMs = hasEndTime ? new Date(test.end_time).getTime() : Infinity;

          const isUpcoming = hasStartTime && currentTime < startTimeMs;
          const isExpired = hasEndTime && currentTime > endTimeMs;
          const isOngoing = !isUpcoming && !isExpired;

          const secondsUntilStart = Math.max(0, Math.floor((startTimeMs - currentTime) / 1000));
          const formatCountdown = (secs) => {
            const h = Math.floor(secs / 3600);
            const m = Math.floor((secs % 3600) / 60);
            const s = secs % 60;
            if (h > 0) return `${h}h ${m}m ${s}s`;
            if (m > 0) return `${m}m ${s}s`;
            return `${s}s`;
          };

          return (
            <div key={test.id} style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '14px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '20px',
                    background: isCompleted ? '#dcfce7' : isOngoing ? '#dbeafe' : isUpcoming ? '#fef3c7' : '#f1f5f9',
                    color: isCompleted ? '#15803d' : isOngoing ? '#1d72fe' : isUpcoming ? '#d97706' : '#64748b'
                  }}>
                    {isCompleted ? 'Completed' : isUpcoming ? 'Scheduled' : isExpired ? 'Closed' : 'Active Now'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {test.duration_minutes || 60} mins
                  </span>
                </div>

                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.4rem' }}>
                  {test.title}
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem' }}>
                  <span>Max Score: <strong>{test.max_score || 100}</strong></span>
                  <span>Questions: <strong>{test.questions?.length || 10}</strong></span>
                </div>

                {/* Scheduled Time Window Info */}
                {(hasStartTime || hasEndTime) && (
                  <div style={{
                    background: isUpcoming ? '#fffbeb' : '#f8fafc',
                    border: isUpcoming ? '1px solid #fde68a' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.74rem',
                    color: isUpcoming ? '#92400e' : '#64748b',
                    marginBottom: '1rem'
                  }}>
                    {hasStartTime && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: hasEndTime ? '0.2rem' : 0 }}>
                        <Clock size={12} color={isUpcoming ? '#d97706' : '#64748b'} />
                        <span>Starts: <strong>{new Date(test.start_time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</strong></span>
                      </div>
                    )}
                    {hasEndTime && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <AlertCircle size={12} color="#64748b" />
                        <span>Closes: <strong>{new Date(test.end_time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isCompleted ? (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#16a34a', fontSize: '0.82rem', fontWeight: 700 }}>
                    <CheckCircle2 size={16} />
                    <span>Submitted</span>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#15803d' }}>
                    {submission.score} / {submission.max_score} ({submission.percentage}%)
                  </span>
                </div>
              ) : isUpcoming ? (
                <button
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: '1px solid #fde68a',
                    background: '#fffbeb',
                    color: '#b45309',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Lock size={15} />
                  <span>Opens in {formatCountdown(secondsUntilStart)}</span>
                </button>
              ) : isExpired ? (
                <button
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#94a3b8',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Clock size={15} />
                  <span>Assessment Closed</span>
                </button>
              ) : (test.allow_latecomers === false && currentTime > startTimeMs) ? (
                <button
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: '1px solid #fca5a5',
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <AlertCircle size={15} />
                  <span>Late Entry Not Allowed</span>
                </button>
              ) : (
                <button
                  onClick={() => onLaunchTest(test)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#1d72fe',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(29, 114, 254, 0.25)'
                  }}
                >
                  <Play size={16} fill="#ffffff" />
                  <span>Launch Test</span>
                </button>
              )}
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}
