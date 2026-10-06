import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Users, CheckCircle2, Clock, Search, ExternalLink, MessageSquare, Award, Save
} from 'lucide-react';
import { getSupabaseClient } from '../../supabaseClient';

export default function TaskSubmissionsModal({ isOpen, onClose, task, notifySuccess, notifyError }) {
  const [submissions, setSubmissions] = useState([]);

  const normalizeUrl = (url) => {
    if (!url) return '#';
    if (/^https?:\/\//i.test(url)) return url;
    return 'https://' + url;
  };
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for grading
  const [gradingScores, setGradingScores] = useState({});
  const [gradingFeedback, setGradingFeedback] = useState({});

  const loadSubmissions = useCallback(async () => {
    if (!task?.id) return;
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('task_submissions')
        .select('*, users!inner(mailid)')
        .eq('task_id', task.id);
        
      setSubmissions(data || []);
      
      const scores = {};
      const feedback = {};
      (data || []).forEach(sub => {
        if (sub.score !== null) scores[sub.id] = sub.score;
        if (sub.staff_feedback !== null) feedback[sub.id] = sub.staff_feedback;
      });
      setGradingScores(scores);
      setGradingFeedback(feedback);
      
    } catch (err) {
      console.error('Error loading submissions:', err);
    } finally {
      setLoading(false);
    }
  }, [task?.id]);

  useEffect(() => {
    if (isOpen && task?.id) {
      loadSubmissions();
    }
  }, [isOpen, task?.id, loadSubmissions]);

  if (!isOpen || !task) return null;

  const filtered = submissions.filter(s => {
    const sEmail = (s.users?.mailid || '').toLowerCase();
    const q = (searchTerm || '').toLowerCase();
    return sEmail.includes(q);
  });
  const reviewedCount = submissions.filter(s => s.status === 'reviewed').length;
  
  const handleSaveGrade = async (subId) => {
    try {
      const scoreInput = gradingScores[subId];
      const score = scoreInput !== undefined && scoreInput !== '' ? Number(scoreInput) : null;
      
      if (score !== null && score > task.max_score) {
        notifyError(`Score cannot exceed maximum marks (${task.max_score})`);
        return;
      }
      if (score !== null && score < 0) {
        notifyError('Score cannot be negative');
        return;
      }

      const supabase = getSupabaseClient();
      const staff_feedback = gradingFeedback[subId] || '';
      
      await supabase
        .from('task_submissions')
        .update({ score, staff_feedback, status: 'reviewed' })
        .eq('id', subId);
        
      notifySuccess('Grade saved successfully');
      loadSubmissions();
    } catch (error) {
      notifyError('Failed to save grade');
    }
  };
  
  const handleResubmitRequest = async (subId) => {
    try {
      const supabase = getSupabaseClient();
      const staff_feedback = gradingFeedback[subId] || 'Please resubmit your work.';
      
      await supabase
        .from('task_submissions')
        .update({ status: 'resubmit_requested', staff_feedback })
        .eq('id', subId);
        
      notifySuccess('Resubmit requested successfully');
      loadSubmissions();
    } catch (error) {
      notifyError('Failed to request resubmit');
    }
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1.5rem'
      }}
    >
      <div 
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff', borderRadius: '18px', width: '100%', maxWidth: '900px', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden', border: '1px solid #e2e8f0'
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.5rem 2rem', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.6rem', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '10px' }}>
                <Users size={24} color="#60a5fa" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, letterSpacing: '0.01em' }}>
                  Submissions: {task.title}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.35rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Users size={14} />
                    {submissions.length} Submitted
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CheckCircle2 size={14} />
                    {reviewedCount} / {submissions.length} Reviewed
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Award size={14} />
                    Max: {task.max_score} Marks
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}
            >
              <X size={24} />
            </button>
          </div>
          
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              {task.description || 'No description provided.'}
            </p>
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={14} /> Due: {task.due_date ? new Date(task.due_date).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'No Due Date'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Users size={14} /> Assigned: {task.assigned_students && task.assigned_students.length > 0 ? `${task.assigned_students.length} Selected Student(s)` : 'All Students'}
              </div>
            </div>
          </div>
        </div>

        {/* Filters / Search */}
        <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '350px' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by student email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 2rem' }}>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
              Loading submissions...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
              <CheckCircle2 size={40} color="#cbd5e1" style={{ margin: '0 auto 1rem' }} />
              <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', margin: '0 0 0.25rem 0' }}>No Submissions Found</p>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Try adjusting your search terms.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem', padding: '1.5rem 0' }}>
              {filtered.map(sub => (
                <div key={sub.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                  {/* Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>{sub.users?.mailid || sub.student_id || 'Unknown Student'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        <Clock size={12} /> Submitted {new Date(sub.submitted_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </div>
                    <div>
                      {sub.status === 'reviewed' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#dcfce7', color: '#15803d', padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                          <CheckCircle2 size={14} /> Reviewed ({sub.score} / {task.max_score})
                        </span>
                      ) : sub.status === 'resubmit_requested' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#fef3c7', color: '#b45309', padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                          <MessageSquare size={14} /> Resubmit Requested
                        </span>
                      ) : sub.status === 'submitted' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#eff6ff', color: '#1d4ed8', padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                          <Clock size={14} /> Needs Review
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Body */}
                  {sub.status !== 'reviewed' && (
                    <div style={{ padding: '1.25rem', display: 'flex', gap: '1.5rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Project Link:</div>
                        <a href={normalizeUrl(sub.submission_url)} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#1d72fe', textDecoration: 'none', background: '#eff6ff', padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500 }}>
                          <ExternalLink size={16} /> {sub.submission_url}
                        </a>
                      </div>
                      <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>Marks (out of {task.max_score})</label>
                          <input
                            type="number"
                            max={task.max_score}
                            min="0"
                            value={gradingScores[sub.id] || ''}
                            onChange={(e) => setGradingScores(prev => ({ ...prev, [sub.id]: e.target.value }))}
                            style={{ width: '100px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>Feedback / Message</label>
                          <textarea
                            value={gradingFeedback[sub.id] || ''}
                            onChange={(e) => setGradingFeedback(prev => ({ ...prev, [sub.id]: e.target.value }))}
                            rows={2}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical' }}
                            placeholder="Feedback..."
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleSaveGrade(sub.id)}
                            style={{ flex: 1, padding: '0.5rem', background: '#1d72fe', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                          >
                            <Save size={14} /> Save Grade
                          </button>
                          <button
                            onClick={() => handleResubmitRequest(sub.id)}
                            style={{ flex: 1, padding: '0.5rem', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Ask to Resubmit
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}