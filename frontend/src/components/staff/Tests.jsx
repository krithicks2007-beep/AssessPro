import React, { useState } from 'react';
import {
  Clock,
  HelpCircle,
  Calendar,
  Users,
  Plus,
  X,
  AlertTriangle
} from 'lucide-react';

/**
 * Staff Tests Tab
 * Shows all tests with group badge, status, delete X button, and view submissions button.
 */
export default function Tests({ tests, onCreateTest, onViewSubmissions, onConfigureTest, onQuickLaunch, onDeleteTest }) {
  const [testToDelete, setTestToDelete] = useState(null);

  const handleExecuteDelete = async (keepData) => {
    if (!testToDelete) return;
    const targetId = testToDelete.id;
    setTestToDelete(null);
    if (onDeleteTest) {
      await onDeleteTest(targetId, keepData);
    }
  };

  return (
    <div className="dashboard-content">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        background: '#ffffff',
        padding: '1.25rem 1.75rem',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Assessment & Test Management
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            Manage scheduled MCQs, time slots, and view student marks with tab-switch anti-cheating tracking.
          </p>
        </div>

        <button
          className="btn-create-test"
          onClick={onCreateTest}
          style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}
        >
          <Plus size={16} />
          <span>New Test</span>
        </button>
      </div>

      {/* Test Cards Grid */}
      {tests.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3.5rem 1.5rem',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: '#eff6ff',
            color: '#1d72fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <Calendar size={28} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
            No Assessments Created Yet
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
            Click &quot;New Test&quot; above to create a custom assessment with MCQs and assign it to student groups.
          </p>
          <button
            className="btn-create-test"
            onClick={onCreateTest}
            style={{ margin: '0 auto', display: 'inline-flex', padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}
          >
            <Plus size={16} />
            <span>Create First Test</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {tests.map((t, idx) => (
            <div key={t.id || idx} style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e5e7eb',
              padding: '1.35rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              position: 'relative'
            }}>
              {/* Delete 'X' Button on Top Right Corner */}
              <button
                title="Delete assessment"
                onClick={(e) => {
                  e.stopPropagation();
                  setTestToDelete(t);
                }}
                style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  background: '#ffffff',
                  color: '#ef4444',
                  border: '2px solid #fee2e2',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#ef4444';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.color = '#ef4444';
                }}
              >
                <X size={15} />
              </button>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', paddingRight: '1rem' }}>
                  <span style={{
                    background: t.groups?.color ? `${t.groups.color}15` : '#eff6ff',
                    color: t.groups?.color || '#1d72fe',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '0.74rem',
                    fontWeight: 700
                  }}>
                    Group {t.groups?.group_number || t.group_number || 1}: {t.groups?.name || 'Core'}
                  </span>
                  <span className="status-pill-published" style={{ fontSize: '0.72rem' }}>
                    {t.status || 'Published'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', marginBottom: '0.65rem', lineHeight: 1.35 }}>
                  {t.title}
                </h3>

                <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Clock size={15} color="#1d72fe" />
                    <span>Duration: <strong>{t.duration_minutes || 30} Minutes</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <HelpCircle size={15} color="#10b981" />
                    <span>Questions: <strong>{t.total_questions || t.questions?.length || 10} MCQs ({t.max_score || 100} Marks)</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Calendar size={15} color="#f59e0b" />
                    <span>Starts: <strong>{t.start_time ? new Date(t.start_time).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'Available Immediately'}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Users size={15} color="#8b5cf6" />
                    <span>Assigned to: <strong style={{ color: t.assigned_students && t.assigned_students.length > 0 ? '#7c3aed' : '#059669' }}>{t.assigned_students && t.assigned_students.length > 0 ? `${t.assigned_students.length} Selected Student(s)` : 'All Students (Universal)'}</strong></span>
                  </div>
                </div>
              </div>

              {t.status === 'draft' ? (
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                  <button
                    onClick={() => onConfigureTest(t)}
                    style={{
                      flex: 1,
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: '1px solid #1d72fe',
                      background: '#eff6ff',
                      color: '#1d72fe',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    Configure Test
                  </button>
                  <button
                    onClick={() => onQuickLaunch(t)}
                    style={{
                      flex: 1,
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#10b981',
                      color: '#ffffff',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    Launch Now
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onViewSubmissions(t)}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #1d72fe',
                    background: '#eff6ff',
                    color: '#1d72fe',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem'
                  }}
                >
                  <Users size={16} />
                  <span>View Student Performance</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal for Test Deletion */}
      {testToDelete && (
        <div style={{
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
          zIndex: 2000,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '18px',
            maxWidth: '520px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #cbd5e1'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#fef2f2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Confirm Assessment Deletion
                </h3>
                <p style={{ margin: '0.1rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  {testToDelete.title}
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Are you sure you want to delete <strong>&quot;{testToDelete.title}&quot;</strong>? Select how you would like to handle student performance data:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
              {/* Option 1: Keep Data */}
              <button
                onClick={() => handleExecuteDelete(true)}
                style={{
                  padding: '0.9rem 1.1rem',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#1e293b',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1d72fe'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
              >
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1d72fe', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>📦 Keep Data (Delete Card Only)</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                  Removes the test card from staff & student views, but retains all student marks and batch calculations as-is.
                </div>
              </button>

              {/* Option 2: Delete with Data */}
              <button
                onClick={() => handleExecuteDelete(false)}
                style={{
                  padding: '0.9rem 1.1rem',
                  borderRadius: '12px',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#991b1b',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#dc2626'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#fecaca'}
              >
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🗑️ Delete Test & All Associated Data</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#991b1b', lineHeight: 1.4 }}>
                  Deletes the test AND purges all student submissions. Batch averages and student performance stats will be recalculated with remaining tests.
                </div>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setTestToDelete(null)}
                style={{
                  padding: '0.55rem 1.35rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#64748b',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
