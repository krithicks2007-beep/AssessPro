import React from 'react';
import { CheckSquare, Clock, HelpCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

/**
 * Student Tasks Tab
 * Shows practical tasks and mini-projects for the student's department.
 */
export default function Tasks({ studentDept, tasks = [], studentSubmissions = [], onStartTask }) {
  const isCompleted = (taskId) => {
    return studentSubmissions.some(s => String(s.test_id) === String(taskId) && s.status === 'completed');
  };

  return (
    <div className="dashboard-content">
      <div style={{
        background: '#ffffff',
        padding: '1.25rem 1.75rem',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
          Practical Tasks & Mini-Projects
        </h2>
        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0' }}>
          Coursework laboratory demonstrations and project submissions for {studentDept}.
        </p>
      </div>

      {tasks.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {tasks.map(task => {
            const completed = isCompleted(task.id);
            const questionCount = task.questions?.length || task.total_questions || 0;

            return (
              <div 
                key={task.id} 
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.25rem 0.65rem',
                      borderRadius: '999px',
                      background: completed ? '#ecfdf5' : '#eff6ff',
                      color: completed ? '#059669' : '#1d72fe',
                      textTransform: 'uppercase'
                    }}>
                      {completed ? 'Completed' : 'Assigned Task'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {task.groups?.name || 'Coursework'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                    {task.title}
                  </h3>

                  <div style={{ display: 'flex', gap: '1rem', color: '#64748b', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={15} /> {task.duration_minutes || 45} mins
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <HelpCircle size={15} /> {questionCount} questions
                    </span>
                  </div>
                </div>

                {completed ? (
                  <button 
                    disabled 
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: '1px solid #d1fae5',
                      background: '#f0fdf4',
                      color: '#059669',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      cursor: 'not-allowed'
                    }}
                  >
                    <CheckCircle2 size={16} /> Submitted
                  </button>
                ) : (
                  <button 
                    onClick={() => onStartTask && onStartTask(task)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #1d72fe, #2563eb)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                    }}
                  >
                    Start Coursework <ArrowRight size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '3rem 2rem',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: '#eff6ff',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1d72fe',
            marginBottom: '1rem'
          }}>
            <CheckSquare size={32} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.5rem' }}>
            No Pending Coursework Tasks
          </h3>
          <p style={{ fontSize: '0.88rem', color: '#64748b', maxWidth: '420px', margin: '0 auto' }}>
            All practical assignments are up to date. New task assignments posted by faculty will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
