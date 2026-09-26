import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Award, 
  Search, 
  Download,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import api from '../../api';

export default function ViewSubmissionsModal({ isOpen, onClose, test }) {
  if (!isOpen || !test) return null;

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'flagged' | 'clean'

  useEffect(() => {
    loadSubmissions();
  }, [test.id]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const data = await api.getTestSubmissions(test.id);
      setSubmissions(data || []);
    } catch (err) {
      console.error('Error loading submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = submissions.filter(s => {
    const matchesSearch = s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.student_email.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterType === 'flagged') return (s.tab_switch_count || 0) > 0;
    if (filterType === 'clean') return (s.tab_switch_count || 0) === 0;
    return true;
  });

  const flaggedCount = submissions.filter(s => (s.tab_switch_count || 0) > 0).length;
  const avgScore = submissions.length > 0
    ? Math.round(submissions.reduce((acc, s) => acc + (s.percentage || 0), 0) / submissions.length)
    : 0;

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
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1.5rem'
      }}
    >
      <div 
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fafafa'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
              <span style={{
                background: test.groups?.color ? `${test.groups.color}20` : '#eff6ff',
                color: test.groups?.color || '#1d72fe',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.72rem',
                fontWeight: 700
              }}>
                Group {test.groups?.group_number || 1}: {test.groups?.name || 'Subject'}
              </span>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                {test.title} - Student Marks & Integrity Report
              </h2>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
              Duration: {test.duration_minutes || 30} mins &bull; Total MCQs: {test.total_questions || 10} &bull; Max Marks: {test.max_score || 100}
            </p>
          </div>

          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick KPI stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
          padding: '1.25rem 1.75rem',
          background: '#f8fafc',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{ background: '#fff', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Total Submissions</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827' }}>{submissions.length}</div>
          </div>

          <div style={{ background: '#fff', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Batch Average</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1d72fe' }}>{avgScore}%</div>
          </div>

          <div style={{ background: '#fff', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Clean Submissions</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981' }}>
              {submissions.length - flaggedCount}
            </div>
          </div>

          <div style={{ background: '#fff', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #fee2e2' }}>
            <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700 }}>Tab Switch Violations</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#dc2626' }}>{flaggedCount} Flagged</div>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{
          padding: '0.85rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f1f5f9',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: '320px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#f1f5f9',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              width: '100%'
            }}>
              <Search size={15} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search student or email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '0.82rem',
                  outline: 'none',
                  width: '100%'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => setFilterType('all')}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                background: filterType === 'all' ? '#1d72fe' : '#ffffff',
                color: filterType === 'all' ? '#ffffff' : '#64748b'
              }}
            >
              All Students
            </button>
            <button
              onClick={() => setFilterType('clean')}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                background: filterType === 'clean' ? '#10b981' : '#ffffff',
                color: filterType === 'clean' ? '#ffffff' : '#64748b'
              }}
            >
              Clean (0 Switches)
            </button>
            <button
              onClick={() => setFilterType('flagged')}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '6px',
                border: '1px solid #fee2e2',
                cursor: 'pointer',
                background: filterType === 'flagged' ? '#ef4444' : '#fff',
                color: filterType === 'flagged' ? '#ffffff' : '#dc2626'
              }}
            >
              ⚠️ Flagged ({flaggedCount})
            </button>
          </div>
        </div>

        {/* Table of Submissions */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 1.75rem 1.5rem 1.75rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '0.85rem 0.5rem', fontWeight: 600 }}>Student Details</th>
                <th style={{ padding: '0.85rem 0.5rem', fontWeight: 600 }}>Score / Max</th>
                <th style={{ padding: '0.85rem 0.5rem', fontWeight: 600 }}>Percentage</th>
                <th style={{ padding: '0.85rem 0.5rem', fontWeight: 600 }}>Tab Switch Violations</th>
                <th style={{ padding: '0.85rem 0.5rem', fontWeight: 600 }}>Attendance</th>
                <th style={{ padding: '0.85rem 0.5rem', fontWeight: 600 }}>Time Taken</th>
                <th style={{ padding: '0.85rem 0.5rem', fontWeight: 600 }}>Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(sub => {
                const hasViolations = (sub.tab_switch_count || 0) > 0;
                
                // Attendance Calculation
                const startMs = new Date(test.start_time).getTime();
                const subMs = new Date(sub.submitted_at).getTime();
                const activeTimeMs = (sub.time_taken_seconds || 0) * 1000;
                const joinedLateMins = Math.max(0, Math.floor(((subMs - startMs) - activeTimeMs) / 60000));
                const attendanceStatus = joinedLateMins >= 1 ? `Late (${joinedLateMins}m)` : 'On Time';
                const attendanceColor = joinedLateMins >= 1 ? '#d97706' : '#15803d';
                const attendanceBg = joinedLateMins >= 1 ? '#fef3c7' : '#dcfce7';

                return (
                  <tr key={sub.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{sub.student_name}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                        {sub.student_email}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700, color: '#1e293b' }}>
                      {sub.score} / {sub.max_score}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '20px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        backgroundColor: sub.percentage >= 75 ? '#ecfdf5' : sub.percentage >= 50 ? '#eff6ff' : '#fef2f2',
                        color: sub.percentage >= 75 ? '#059669' : sub.percentage >= 50 ? '#1d72fe' : '#dc2626'
                      }}>
                        {sub.percentage}%
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      {hasViolations ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 700
                        }}>
                          <ShieldAlert size={14} />
                          {sub.tab_switch_count} Tab Switches
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: '#ecfdf5',
                          color: '#059669',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 600
                        }}>
                          <ShieldCheck size={14} />
                          0 Switches (Clean)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '20px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        backgroundColor: attendanceBg,
                        color: attendanceColor
                      }}>
                        {attendanceStatus}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', color: '#64748b', fontSize: '0.78rem' }}>
                      {Math.floor((sub.time_taken_seconds || 600) / 60)}m {((sub.time_taken_seconds || 600) % 60)}s
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', color: '#94a3b8', fontSize: '0.74rem' }}>
                      {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
