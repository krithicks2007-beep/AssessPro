import React from 'react';
import { 
  X, 
  FileText, 
  CheckSquare, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Bell, 
  ExternalLink 
} from 'lucide-react';

/**
 * StudentNotificationsModal / Popover
 * Displays a partitioned view of remaining tests (left) and remaining tasks (right).
 * Shows NEW badges for unseen items and allows quick navigation.
 */
export default function StudentNotificationsModal({
  isOpen,
  onClose,
  remainingTests = [],
  remainingTasks = [],
  seenIds = [],
  currentTime = Date.now(),
  onSelectTest,
  onSelectTask
}) {
  if (!isOpen) return null;

  const newTestsCount = remainingTests.filter(t => !seenIds.includes(`test_${t.id}`)).length;
  const newTasksCount = remainingTasks.filter(t => !seenIds.includes(`task_${t.id}`)).length;
  const totalRemaining = remainingTests.length + remainingTasks.length;

  return (
    <div 
      className="student-notif-popover"
      style={{
        position: 'absolute',
        top: 'calc(100% + 12px)',
        right: 0,
        width: 'min(720px, calc(100vw - 32px))',
        background: '#ffffff',
        borderRadius: '18px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 20px 35px -5px rgba(15, 23, 42, 0.15), 0 10px 15px -5px rgba(15, 23, 42, 0.08)',
        zIndex: 1050,
        overflow: 'hidden',
        animation: 'fadeInSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{
        padding: '1rem 1.25rem',
        borderBottom: '1px solid #e2e8f0',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d72fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Bell size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              Pending Tests & Tasks
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.15rem' }}>
              {totalRemaining} pending item{totalRemaining !== 1 ? 's' : ''} • {newTestsCount + newTasksCount} new
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Close notifications"
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#64748b'; }}
        >
          <X size={17} />
        </button>
      </div>

      {/* Two-Column Partition */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
        background: '#ffffff'
      }}>
        {/* Left Partition: Tests */}
        <div style={{
          borderRight: '1px solid #e2e8f0',
          background: '#fafbfc',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Partition Header */}
          <div style={{
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e2e8f0',
            background: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>
              <FileText size={16} color="#1d72fe" />
              <span>Tests to Take</span>
              <span style={{
                background: '#dbeafe',
                color: '#1d4ed8',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '0.1rem 0.5rem',
                borderRadius: '12px'
              }}>
                {remainingTests.length}
              </span>
            </div>
            {newTestsCount > 0 && (
              <span style={{
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '0.1rem 0.45rem',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem'
              }}>
                <Sparkles size={11} /> {newTestsCount} New
              </span>
            )}
          </div>

          {/* Test List */}
          <div style={{
            padding: '0.85rem',
            maxHeight: '340px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}>
            {remainingTests.length === 0 ? (
              <div style={{
                padding: '2.5rem 1rem',
                textAlign: 'center',
                color: '#64748b'
              }}>
                <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>All Tests Completed!</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  No active or upcoming assessments pending.
                </div>
              </div>
            ) : (
              remainingTests.map(test => {
                const isNew = !seenIds.includes(`test_${test.id}`);
                const startTimeMs = test.start_time ? new Date(test.start_time).getTime() : 0;
                const isUpcoming = test.start_time && currentTime < startTimeMs;

                return (
                  <div
                    key={test.id}
                    style={{
                      background: '#ffffff',
                      border: isNew ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '0.75rem 0.85rem',
                      boxShadow: isNew ? '0 2px 8px rgba(29, 114, 254, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.45rem',
                      transition: 'transform 0.15s, box-shadow 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem' }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                        {test.title}
                      </div>
                      {isNew && (
                        <span style={{
                          background: '#eff6ff',
                          color: '#1d72fe',
                          border: '1px solid #bfdbfe',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '0.1rem 0.4rem',
                          borderRadius: '6px',
                          flexShrink: 0
                        }}>
                          NEW
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.74rem', color: '#64748b' }}>
                      <span style={{
                        background: '#f1f5f9',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '6px',
                        fontWeight: 600,
                        color: '#475569'
                      }}>
                        {test.groups?.name || 'Group'}
                      </span>
                      <span>{test.duration_minutes || 60} mins</span>
                      <span>Max: {test.max_score || 100}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        color: isUpcoming ? '#d97706' : '#16a34a',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <Clock size={12} />
                        {isUpcoming ? 'Scheduled' : 'Active Now'}
                      </span>

                      <button
                        onClick={() => onSelectTest(test)}
                        style={{
                          background: '#1d72fe',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          boxShadow: '0 2px 6px rgba(29, 114, 254, 0.25)'
                        }}
                      >
                        Take Test <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Partition: Tasks */}
        <div style={{
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Partition Header */}
          <div style={{
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e2e8f0',
            background: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>
              <CheckSquare size={16} color="#059669" />
              <span>Tasks to Submit</span>
              <span style={{
                background: '#d1fae5',
                color: '#047857',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '0.1rem 0.5rem',
                borderRadius: '12px'
              }}>
                {remainingTasks.length}
              </span>
            </div>
            {newTasksCount > 0 && (
              <span style={{
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '0.1rem 0.45rem',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem'
              }}>
                <Sparkles size={11} /> {newTasksCount} New
              </span>
            )}
          </div>

          {/* Task List */}
          <div style={{
            padding: '0.85rem',
            maxHeight: '340px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}>
            {remainingTasks.length === 0 ? (
              <div style={{
                padding: '2.5rem 1rem',
                textAlign: 'center',
                color: '#64748b'
              }}>
                <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>All Tasks Submitted!</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  No pending assignments or project links due.
                </div>
              </div>
            ) : (
              remainingTasks.map(task => {
                const isNew = !seenIds.includes(`task_${task.id}`);

                return (
                  <div
                    key={task.id}
                    style={{
                      background: '#ffffff',
                      border: isNew ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '0.75rem 0.85rem',
                      boxShadow: isNew ? '0 2px 8px rgba(16, 185, 129, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.45rem',
                      transition: 'transform 0.15s, box-shadow 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem' }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                        {task.title}
                      </div>
                      {isNew && (
                        <span style={{
                          background: '#f0fdf4',
                          color: '#16a34a',
                          border: '1px solid #bbf7d0',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '0.1rem 0.4rem',
                          borderRadius: '6px',
                          flexShrink: 0
                        }}>
                          NEW
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.74rem', color: '#64748b' }}>
                      <span style={{
                        background: '#f1f5f9',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '6px',
                        fontWeight: 600,
                        color: '#475569'
                      }}>
                        {task.groups?.name || 'Group'}
                      </span>
                      <span>Max: {task.max_score || 100} pts</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        color: '#475569',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <Clock size={12} color="#64748b" />
                        Due: {task.due_date ? new Date(task.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'No due date'}
                      </span>

                      <button
                        onClick={() => onSelectTask(task)}
                        style={{
                          background: 'linear-flex, #059669',
                          backgroundColor: '#059669',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
                        }}
                      >
                        Submit Link <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '0.75rem 1.25rem',
        borderTop: '1px solid #e2e8f0',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        fontSize: '0.76rem',
        color: '#64748b'
      }}>
        <span>The red badge will clear when closed and return for new items.</span>
        <button
          onClick={onClose}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.4rem 0.85rem',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#334155',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
        >
          Mark as Seen & Close
        </button>
      </div>
    </div>
  );
}
