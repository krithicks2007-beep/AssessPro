import React, { useState } from 'react';
import { CheckSquare, Clock, HelpCircle, ArrowRight, CheckCircle2, Link as LinkIcon, Send } from 'lucide-react';
import { getSupabaseClient } from '../../supabaseClient';

/**
 * Student Tasks Tab
 * Shows practical tasks and project submissions for the student's department.
 */
export default function Tasks({ studentDept, tasks = [], studentSubmissions = [], studentEmail, studentId, onSubmissionSuccess, notifySuccess, notifyError }) {
  const [activeSubmitTaskId, setActiveSubmitTaskId] = useState(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getSubmission = (taskId) => {
    return studentSubmissions.find(s => String(s.task_id) === String(taskId));
  };

  const normalizeUrl = (url) => {
    if (!url) return '#';
    if (/^https?:\/\//i.test(url)) return url;
    return 'https://' + url;
  };

  const handleSubmit = async (task) => {
    if (!submissionLink.trim()) {
      notifyError('Please enter a valid submission link');
      return;
    }
    
    setSubmitting(true);
    try {
      const supabase = getSupabaseClient();
      await supabase.from('task_submissions').insert([{
        task_id: task.id,
        student_id: studentId,
        submission_url: submissionLink,
        status: 'submitted'
      }]);
      
      notifySuccess('Task submitted successfully!');
      setActiveSubmitTaskId(null);
      setSubmissionLink('');
      if (onSubmissionSuccess) onSubmissionSuccess();
    } catch (err) {
      notifyError('Failed to submit task');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleResubmit = async (task, existingSubmissionId) => {
    if (!submissionLink.trim()) {
      notifyError('Please enter a valid submission link');
      return;
    }
    
    setSubmitting(true);
    try {
      const supabase = getSupabaseClient();
      await supabase.from('task_submissions').update({
        submission_url: submissionLink,
        status: 'submitted',
        submitted_at: new Date().toISOString()
      }).eq('id', existingSubmissionId);
      
      notifySuccess('Task resubmitted successfully!');
      setActiveSubmitTaskId(null);
      setSubmissionLink('');
      if (onSubmissionSuccess) onSubmissionSuccess();
    } catch (err) {
      notifyError('Failed to resubmit task');
    } finally {
      setSubmitting(false);
    }
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
          Assigned Tasks & Projects
        </h2>
        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0' }}>
          Submit your project links and assignments directly to your staff.
        </p>
      </div>

      {tasks.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem' }}>
          {tasks.map(task => {
            const submission = getSubmission(task.id);
            const status = submission?.status; // 'submitted', 'reviewed', 'resubmit_requested'
            const hasSubmitted = !!submission;
            const isResubmit = status === 'resubmit_requested';
            const isReviewed = status === 'reviewed';
            const isSubmitted = status === 'submitted';
            // 'completed' means submitted or reviewed (NOT resubmit_requested)
            const isCompleted = hasSubmitted && !isResubmit;
            
            const isSubmittingThis = activeSubmitTaskId === task.id;

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
                      background: isReviewed ? '#ecfdf5' : isResubmit ? '#fef3c7' : isSubmitted ? '#eff6ff' : '#f1f5f9',
                      color: isReviewed ? '#059669' : isResubmit ? '#b45309' : isSubmitted ? '#1d4ed8' : '#475569',
                      textTransform: 'uppercase'
                    }}>
                      {isReviewed ? '✓ Reviewed' : isResubmit ? '⚠ Resubmit Requested' : isSubmitted ? 'Submitted' : 'Assigned Task'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {task.groups?.name || 'Group'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                    {task.title}
                  </h3>
                  
                  <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 1rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {task.description}
                  </p>

                  <div style={{ display: 'flex', gap: '1rem', color: '#64748b', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckSquare size={15} /> Max Score: {task.max_score}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={15} /> Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'None'}
                    </span>
                  </div>
                  
                  {isResubmit && submission.staff_feedback && (
                    <div style={{ background: '#fef2f2', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#dc2626', marginBottom: '0.2rem' }}>Staff Feedback:</div>
                      <div style={{ fontSize: '0.85rem', color: '#991b1b' }}>{submission.staff_feedback}</div>
                    </div>
                  )}
                  
                  {isReviewed && (
                    <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Mark: {submission.score} / {task.max_score}</span>
                      </div>
                      {submission.staff_feedback && <div style={{ fontSize: '0.8rem', color: '#15803d', marginTop: '0.35rem' }}>{submission.staff_feedback}</div>}
                    </div>
                  )}
                </div>

                {isSubmittingThis ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ position: 'relative' }}>
                      <LinkIcon size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input 
                        type="url"
                        placeholder="Paste your project URL here..."
                        value={submissionLink}
                        onChange={(e) => setSubmissionLink(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                        autoFocus
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => { setActiveSubmitTaskId(null); setSubmissionLink(''); }}
                        style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                        disabled={submitting}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => isResubmit ? handleResubmit(task, submission.id) : handleSubmit(task)}
                        style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: 'none', background: '#1d72fe', color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                        disabled={submitting}
                      >
                        {submitting ? 'Sending...' : <><Send size={14} /> Send to Staff</>}
                      </button>
                    </div>
                  </div>
                ) : isResubmit ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400e', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      <Clock size={15} /> Staff is waiting for your new submission
                    </div>
                    <button 
                      onClick={() => setActiveSubmitTaskId(task.id)}
                      style={{
                        width: '100%', padding: '0.75rem', borderRadius: '10px', border: 'none',
                        background: 'linear-gradient(135deg, #d97706, #b45309)',
                        color: '#ffffff', fontWeight: 700, fontSize: '0.88rem', display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)'
                      }}
                    >
                      Submit Again <ArrowRight size={16} />
                    </button>
                  </div>
                ) : isReviewed ? (
                  <a 
                    href={normalizeUrl(submission.submission_url)}
                    target="_blank" rel="noreferrer"
                    style={{
                      width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #d1fae5', background: '#f0fdf4',
                      color: '#059669', fontWeight: 700, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center',
                      justifyContent: 'center', gap: '0.5rem', textDecoration: 'none', boxSizing: 'border-box'
                    }}
                  >
                    <CheckCircle2 size={16} /> View Submitted Link
                  </a>
                ) : isSubmitted ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <a 
                      href={normalizeUrl(submission.submission_url)}
                      target="_blank" rel="noreferrer"
                      style={{
                        padding: '0.65rem', borderRadius: '8px', border: '1px solid #bfdbfe', background: '#eff6ff',
                        color: '#1d4ed8', fontWeight: 600, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center',
                        justifyContent: 'center', gap: '0.5rem', textDecoration: 'none'
                      }}
                    >
                      <LinkIcon size={15} /> View My Submission
                    </a>
                    <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8', paddingTop: '0.25rem' }}>
                      Waiting for staff review...
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setActiveSubmitTaskId(task.id)}
                    style={{
                      width: '100%', padding: '0.75rem', borderRadius: '10px', border: 'none',
                      background: 'linear-gradient(135deg, #c026d3, #a21caf)',
                      color: '#ffffff', fontWeight: 700, fontSize: '0.88rem', display: 'inline-flex',
                      alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(192, 38, 211, 0.25)'
                    }}
                  >
                    Submit Project <ArrowRight size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', background: '#eff6ff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#1d72fe', marginBottom: '1rem' }}>
            <CheckSquare size={32} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>No Tasks Assigned</h3>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0, maxWidth: '400px', marginInline: 'auto' }}>
            You have no pending tasks or projects assigned to you at the moment.
          </p>
        </div>
      )}
    </div>
  );
}