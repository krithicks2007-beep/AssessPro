import { getSupabaseClient } from '../../supabaseClient';
import React, { useState, useEffect } from 'react';
import {
  Clock,
  HelpCircle,
  Calendar,
  Users,
  Plus,
  X,
  AlertTriangle,
  Timer,
  MoreVertical,
  Copy,
  Edit,
  Trash2
} from 'lucide-react';

function AutoLaunchTimer({ Task, onTriggerLaunch }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!Task.auto_launch || !Task.start_time || Task.status !== 'draft') return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(Task.start_time).getTime();
      const diff = target - now;

      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft('Launching...');
        onTriggerLaunch(Task);
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        const hStr = h.toString().padStart(2, '0');
        const mStr = m.toString().padStart(2, '0');
        const sStr = s.toString().padStart(2, '0');
        
        if (d > 0) {
          setTimeLeft(`${d}d ${hStr}h ${mStr}m`); // hide seconds if days are > 0 to save space, or keep it
        } else if (h > 0) {
          setTimeLeft(`${hStr}h ${mStr}m ${sStr}s`);
        } else {
          setTimeLeft(`${mStr}m ${sStr}s`);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [Task, onTriggerLaunch]);

  if (!Task.auto_launch || !Task.start_time || Task.status !== 'draft') return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.75rem 0.5rem', background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '12px', color: '#1e3a8a', fontSize: '0.75rem', fontWeight: 800, minWidth: '105px', textAlign: 'center', alignSelf: 'center', flexShrink: 0 }}>
      <Timer size={20} color="#2563eb" style={{ flexShrink: 0 }} />
      {timeLeft === 'Launching...' ? (
        <span style={{ lineHeight: 1.2 }}>Launching...</span>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
          <span style={{ color: '#3b82f6', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Launch in</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.5px', fontSize: '0.8rem' }}>{timeLeft}</span>
        </div>
      )}
    </div>
  );
}


/**
 * Staff Tasks Tab
 * Shows all Tasks with group badge, status, delete X button, and view submissions button.
 */
export default function Tasks({ tasks, onCreateTask, onViewSubmissions, onConfigureTask, onQuickLaunch, onDeleteTask, onCopyTask }) {
  const [TaskToDelete, setTaskToDelete] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleExecuteDelete = async (keepData) => {
    if (!TaskToDelete) return;
    const targetId = TaskToDelete.id;
    setTaskToDelete(null);
    if (onDeleteTask) {
      await onDeleteTask(targetId, keepData);
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
            Assessment & Task Management
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            Manage scheduled MCQs, time slots, and view student marks with tab-switch anti-cheating tracking.
          </p>
        </div>

        <button
          className="btn-create-test"
          onClick={onCreateTask}
          style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}
        >
          <Plus size={16} />
          <span>New Task</span>
        </button>
      </div>

      {/* Task Cards Grid */}
      {tasks.length === 0 ? (
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
            Click &quot;New Task&quot; above to create a custom assessment with MCQs and assign it to student groups.
          </p>
          <button
            className="btn-create-test"
            onClick={onCreateTask}
            style={{ margin: '0 auto', display: 'inline-flex', padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}
          >
            <Plus size={16} />
            <span>Create First Task</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {tasks.map((t, idx) => (
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
              {/* Options Menu Button (3 Dots) */}
              <div style={{ position: 'absolute', top: '-10px', right: '-10px', zIndex: 10 }}>
                <button
                  title="Task Options"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(activeMenuId === t.id ? null : t.id);
                  }}
                  style={{
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; }}
                >
                  <MoreVertical size={16} />
                </button>
                {activeMenuId === t.id && (
                  <div style={{
                    position: 'absolute',
                    top: '36px',
                    right: '0',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    width: '140px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    zIndex: 20
                  }}>
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); if (onCopyTask) onCopyTask(t); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem', background: '#eff6ff', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#1d4ed8', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid #e0e7ff' }} onMouseEnter={(e) => e.currentTarget.style.background = '#dbeafe'} onMouseLeave={(e) => e.currentTarget.style.background = '#eff6ff'}>
                      <Copy size={15} /> Copy
                    </button>
                    {t.status === 'published' ? (
                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); if (onViewSubmissions) onViewSubmissions(t); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem', background: '#f0fdf4', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#15803d', fontSize: '0.85rem', fontWeight: 600 }} onMouseEnter={(e) => e.currentTarget.style.background = '#dcfce7'} onMouseLeave={(e) => e.currentTarget.style.background = '#f0fdf4'}>
                        <Users size={15} /> Review
                      </button>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); if (onConfigureTask) onConfigureTask(t); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem', background: '#f0fdf4', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#15803d', fontSize: '0.85rem', fontWeight: 600 }} onMouseEnter={(e) => e.currentTarget.style.background = '#dcfce7'} onMouseLeave={(e) => e.currentTarget.style.background = '#f0fdf4'}>
                        <Edit size={15} /> Edit
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setTaskToDelete(t); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem', background: '#fef2f2', border: 'none', borderTop: '1px solid #fee2e2', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600 }} onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'} onMouseLeave={(e) => e.currentTarget.style.background = '#fef2f2'}>
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                )}
              </div>

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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <HelpCircle size={15} color="#10b981" />
                      <span>Max Score: <strong>{t.max_score || 100} Marks</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Calendar size={15} color="#f59e0b" />
                      <span>Due: <strong>{t.due_date ? new Date(t.due_date).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'No Due Date'}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Users size={15} color="#8b5cf6" />
                      <span>Assigned to: <strong style={{ color: t.assigned_students && t.assigned_students.length > 0 ? '#7c3aed' : '#059669' }}>{t.assigned_students && t.assigned_students.length > 0 ? `${t.assigned_students.length} Selected Student(s)` : 'All Students (Universal)'}</strong></span>
                    </div>
                  </div>

                  {t.status === 'draft' && t.auto_launch && (
                    <AutoLaunchTimer Task={t} onTriggerLaunch={onQuickLaunch} />
                  )}
                </div>
              </div>

              {t.status === 'draft' ? (
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                  <button
                    onClick={() => onConfigureTask(t)}
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
                    Configure Task
                  </button>
                  <button
                    onClick={() => onQuickLaunch(t)}
                    style={{
                      flex: 1,
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#1d72fe',
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

      {/* Confirmation Modal for Task Deletion */}
      {TaskToDelete && (
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
                  {TaskToDelete.title}
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Are you sure you want to delete <strong>&quot;{TaskToDelete.title}&quot;</strong>? Select how you would like to handle student performance data:
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
                  Removes the Task card from staff & student views, but retains all student marks and batch calculations as-is.
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
                  <span>🗑️ Delete Task & All Associated Data</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#991b1b', lineHeight: 1.4 }}>
                  Deletes the Task AND purges all student submissions. Batch averages and student performance stats will be recalculated with remaining Tasks.
                </div>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setTaskToDelete(null)}
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
