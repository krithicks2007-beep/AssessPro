import React, { useState, useEffect, useCallback } from 'react';
import { 
  X,
  Users,
  CheckCircle2,
  Clock,
  Search,
  ExternalLink,
  MessageSquare,
  Award,
  Save,
  RotateCcw,
  Edit2,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react';
import { getSupabaseClient } from '../../supabaseClient';

export default function TaskSubmissionsModal({ isOpen, onClose, task, notifySuccess, notifyError, onSubmissionsUpdated }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'pending' | 'reviewed'
  const [expandedDetails, setExpandedDetails] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // State for grading inputs
  const [gradingScores, setGradingScores] = useState({});
  const [gradingFeedback, setGradingFeedback] = useState({});
  const [editingSubId, setEditingSubId] = useState(null);
  const [savingSubId, setSavingSubId] = useState(null);
  const [savedSuccessId, setSavedSuccessId] = useState(null);

  const normalizeUrl = (url) => {
    if (!url) return '#';
    if (/^https?:\/\//i.test(url)) return url;
    return 'https://' + url;
  };

  const handleCopyUrl = (url, id) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const loadSubmissions = useCallback(async () => {
    if (!task?.id) return;
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      // Try selecting joined users table (id, name, mailid)
      let subsData = null;
      try {
        const { data, error } = await supabase
          .from('task_submissions')
          .select('*, users(id, name, mailid)')
          .eq('task_id', task.id)
          .order('submitted_at', { ascending: false });

        if (!error && data) {
          subsData = data;
        }
      } catch (joinErr) {
        console.warn('Joined query error, attempting fallback:', joinErr);
      }

      // Fallback query if join has foreign key schema naming variation
      if (!subsData) {
        const { data, error } = await supabase
          .from('task_submissions')
          .select('*')
          .eq('task_id', task.id)
          .order('submitted_at', { ascending: false });

        if (!error && data) {
          subsData = data;
        }
      }

      const list = subsData || [];
      setSubmissions(list);

      const scores = {};
      const feedback = {};
      list.forEach(sub => {
        if (sub.score !== null && sub.score !== undefined) scores[sub.id] = sub.score;
        if (sub.staff_feedback !== null && sub.staff_feedback !== undefined) feedback[sub.id] = sub.staff_feedback;
      });
      setGradingScores(scores);
      setGradingFeedback(feedback);

      // Auto-set tab to pending if unreviewed items exist
      const pendingCount = list.filter(s => s.status === 'submitted' || (!s.score && s.status !== 'reviewed')).length;
      if (pendingCount > 0) {
        setFilterTab('pending');
      } else {
        setFilterTab('all');
      }
    } catch (err) {
      console.error('Error loading submissions:', err);
    } finally {
      setLoading(false);
    }
  }, [task?.id]);

  useEffect(() => {
    if (isOpen && task?.id) {
      loadSubmissions();
      setEditingSubId(null);
    }
  }, [isOpen, task?.id, loadSubmissions]);

  if (!isOpen || !task) return null;

  const maxMarks = task.max_score || 100;

  // Preset scores for fast 1-tap mobile grading
  const getScorePresets = (max) => {
    const m = Number(max) || 100;
    if (m <= 10) return [m, Math.round(m * 0.8), Math.round(m * 0.5), 0];
    if (m <= 25) return [m, Math.round(m * 0.9), Math.round(m * 0.8), Math.round(m * 0.5), 0];
    if (m <= 50) return [m, Math.round(m * 0.9), Math.round(m * 0.8), Math.round(m * 0.6), 0];
    return [m, Math.round(m * 0.9), Math.round(m * 0.8), Math.round(m * 0.75), Math.round(m * 0.5), 0];
  };

  const presetButtons = getScorePresets(maxMarks);

  const quickFeedbackOptions = [
    '🌟 Excellent work! Clean and well organized.',
    '👍 Good effort! Concepts applied properly.',
    '⚠️ Needs improvement. Please review instructions.',
    '❓ Incomplete work submitted.'
  ];

  // Calculations
  const reviewedCount = submissions.filter(s => (s.status === 'reviewed' || s.status === 'graded') && s.score != null).length;
  const pendingCount = submissions.filter(s => s.status === 'submitted' || (!s.score && s.status !== 'reviewed')).length;

  const filtered = submissions.filter(s => {
    const sEmail = (s.users?.mailid || s.student_email || s.student_id || '').toLowerCase();
    const sName = (s.users?.name || '').toLowerCase();
    const q = (searchTerm || '').toLowerCase();
    const matchesSearch = sEmail.includes(q) || sName.includes(q);
    if (!matchesSearch) return false;

    if (filterTab === 'pending') {
      return s.status === 'submitted' || (!s.score && s.status !== 'reviewed');
    }
    if (filterTab === 'reviewed') {
      return (s.status === 'reviewed' || s.status === 'graded') && s.score != null;
    }
    return true;
  });

  const handleStepScore = (subId, delta) => {
    const current = gradingScores[subId] !== undefined && gradingScores[subId] !== '' ? Number(gradingScores[subId]) : 0;
    const step = maxMarks >= 50 ? 5 : 1;
    const nextVal = Math.max(0, Math.min(maxMarks, current + (delta * step)));
    setGradingScores(prev => ({ ...prev, [subId]: nextVal }));
  };

  const handleSaveGrade = async (subId) => {
    try {
      const scoreInput = gradingScores[subId];
      if (scoreInput === undefined || scoreInput === '') {
        notifyError('Please enter a mark before saving');
        return;
      }
      const score = Number(scoreInput);

      if (isNaN(score)) {
        notifyError('Please enter a valid numeric mark');
        return;
      }
      if (score > maxMarks) {
        notifyError(`Score cannot exceed maximum marks (${maxMarks})`);
        return;
      }
      if (score < 0) {
        notifyError('Score cannot be negative');
        return;
      }

      setSavingSubId(subId);
      const supabase = getSupabaseClient();
      const staff_feedback = gradingFeedback[subId] || '';

      const { error } = await supabase
        .from('task_submissions')
        .update({
          score,
          staff_feedback,
          status: 'reviewed',
          updated_at: new Date().toISOString()
        })
        .eq('id', subId);

      if (error) throw error;

      // Update local state instantly
      setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, score, staff_feedback, status: 'reviewed' } : s));
      setEditingSubId(null);
      setSavedSuccessId(subId);
      setTimeout(() => setSavedSuccessId(null), 2500);

      notifySuccess('Grade and feedback saved successfully!');
      if (onSubmissionsUpdated) onSubmissionsUpdated();
    } catch (error) {
      console.error('Save grade error:', error);
      notifyError('Failed to save grade');
    } finally {
      setSavingSubId(null);
    }
  };

  const handleResubmitRequest = async (subId) => {
    try {
      setSavingSubId(subId);
      const supabase = getSupabaseClient();
      const staff_feedback = gradingFeedback[subId] || 'Please resubmit your work.';

      const { error } = await supabase
        .from('task_submissions')
        .update({
          status: 'resubmit_requested',
          staff_feedback,
          updated_at: new Date().toISOString()
        })
        .eq('id', subId);

      if (error) throw error;

      setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: 'resubmit_requested', staff_feedback } : s));
      setEditingSubId(null);
      notifySuccess('Resubmit requested successfully');
      if (onSubmissionsUpdated) onSubmissionsUpdated();
    } catch (error) {
      console.error('Request resubmit error:', error);
      notifyError('Failed to request resubmit');
    } finally {
      setSavingSubId(null);
    }
  };

  return (
    <div
      className="task-submissions-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
    >
      <div
        className="task-submissions-modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          height: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          position: 'relative'
        }}
      >
        {/* Sticky / Top Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#fff',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', minWidth: 0 }}>
              <button
                onClick={onClose}
                className="modal-back-btn"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '10px',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
                title="Back to Tasks"
              >
                <ChevronLeft size={20} />
              </button>

              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h2 style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%'
                  }}>
                    {task.title}
                  </h2>
                </div>

                {/* Badges Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginTop: '0.4rem',
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                    <Users size={13} color="#60a5fa" />
                    <strong style={{ color: '#fff' }}>{submissions.length}</strong> Submitted
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                    <CheckCircle2 size={13} color="#34d399" />
                    <strong style={{ color: '#fff' }}>{reviewedCount}</strong> Graded
                  </span>
                  {pendingCount > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(239, 68, 68, 0.25)', color: '#fca5a5', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                      {pendingCount} Need Marks
                    </span>
                  )}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                    <Award size={13} color="#f59e0b" />
                    Max: <strong style={{ color: '#fff' }}>{maxMarks}</strong>
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                padding: '0.35rem',
                borderRadius: '8px'
              }}
              title="Close"
            >
              <X size={22} />
            </button>
          </div>

          {/* Collapsible Task Description & Metadata (Optimized for mobile) */}
          <div style={{ marginTop: '0.85rem' }}>
            <button
              onClick={() => setExpandedDetails(prev => !prev)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#cbd5e1',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 600
              }}
            >
              <span>{expandedDetails ? 'Hide Task Details' : 'View Task Details & Due Date'}</span>
              {expandedDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {expandedDetails && (
              <div style={{
                marginTop: '0.6rem',
                background: 'rgba(255, 255, 255, 0.06)',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <p style={{ margin: '0 0 0.65rem 0', fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.45 }}>
                  {task.description || 'No detailed instructions provided.'}
                </p>
                <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={14} color="#f59e0b" />
                    <span>Due: <strong>{task.due_date ? new Date(task.due_date).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'No Due Date'}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Users size={14} color="#a78bfa" />
                    <span>Assigned: <strong>{task.assigned_students && task.assigned_students.length > 0 ? `${task.assigned_students.length} Selected Students` : 'All Students'}</strong></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div style={{
          padding: '0.85rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          {/* Quick Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', maxWidth: '100%' }}>
            <button
              onClick={() => setFilterTab('all')}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                border: filterTab === 'all' ? '1px solid #1d72fe' : '1px solid #cbd5e1',
                background: filterTab === 'all' ? '#eff6ff' : '#ffffff',
                color: filterTab === 'all' ? '#1d72fe' : '#475569',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              All ({submissions.length})
            </button>
            <button
              onClick={() => setFilterTab('pending')}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                border: filterTab === 'pending' ? '1px solid #ea580c' : '1px solid #cbd5e1',
                background: filterTab === 'pending' ? '#fff7ed' : '#ffffff',
                color: filterTab === 'pending' ? '#ea580c' : '#475569',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                whiteSpace: 'nowrap'
              }}
            >
              <span>Needs Marking</span>
              {pendingCount > 0 && (
                <span style={{
                  background: '#ea580c',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '0.68rem',
                  fontWeight: 800
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilterTab('reviewed')}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                border: filterTab === 'reviewed' ? '1px solid #16a34a' : '1px solid #cbd5e1',
                background: filterTab === 'reviewed' ? '#f0fdf4' : '#ffffff',
                color: filterTab === 'reviewed' ? '#16a34a' : '#475569',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Graded ({reviewedCount})
            </button>
          </div>

          {/* Search box */}
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '320px' }}>
            <Search size={15} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search student email/name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem 0.45rem 2rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.84rem',
                outline: 'none',
                background: '#ffffff'
              }}
            />
          </div>
        </div>

        {/* Scrollable Submissions List */}
        <div className="task-submissions-list custom-scrollbar" style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          WebkitOverflowScrolling: 'touch'
        }}>
          {loading ? (
            <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
              <p style={{ fontWeight: 600 }}>Loading submissions...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
              <CheckCircle2 size={44} color="#cbd5e1" style={{ margin: '0 auto 1rem' }} />
              <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#334155', margin: '0 0 0.25rem 0' }}>
                {submissions.length === 0 ? 'No Submissions Yet' : 'No Submissions Match Filter'}
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                {submissions.length === 0
                  ? 'Students have not submitted work for this task yet.'
                  : 'Try selecting "All" or clearing the search box.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {filtered.map(sub => {
                const isReviewed = (sub.status === 'reviewed' || sub.status === 'graded') && sub.score !== null;
                const isOverdueZero = sub.score === 0 && !sub.submission_url;
                const isEditing = editingSubId === sub.id || !isReviewed;
                const isSaving = savingSubId === sub.id;
                const wasSaved = savedSuccessId === sub.id;

                const studentEmail = sub.users?.mailid || sub.student_email || sub.student_id || 'Student';
                const studentName = sub.users?.name || '';
                const currentScore = gradingScores[sub.id] !== undefined ? gradingScores[sub.id] : (sub.score ?? '');
                const currentFeedback = gradingFeedback[sub.id] !== undefined ? gradingFeedback[sub.id] : (sub.staff_feedback || '');

                return (
                  <div
                    key={sub.id}
                    className="submission-card-item"
                    style={{
                      border: wasSaved ? '1.5px solid #10b981' : isReviewed ? '1px solid #e2e8f0' : '1.5px solid #fed7aa',
                      borderRadius: '14px',
                      background: '#ffffff',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Header Row */}
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.85rem 1.15rem',
                      background: isReviewed ? '#f8fafc' : '#fffbeb',
                      borderBottom: '1px solid #e2e8f0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: isReviewed ? '#dcfce7' : '#fed7aa',
                          color: isReviewed ? '#15803d' : '#c2410c',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          flexShrink: 0
                        }}>
                          {(studentName || studentEmail).substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.92rem' }}>
                            {studentName ? studentName : studentEmail}
                          </div>
                          {studentName && (
                            <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                              {studentEmail}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.74rem', marginTop: '0.15rem' }}>
                            <Clock size={12} />
                            <span>Submitted: {new Date(sub.submitted_at || Date.now()).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isReviewed ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: isOverdueZero ? '#fef2f2' : '#dcfce7',
                            color: isOverdueZero ? '#dc2626' : '#15803d',
                            border: isOverdueZero ? '1px solid #fecaca' : '1px solid #bbf7d0',
                            padding: '0.3rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            fontWeight: 700
                          }}>
                            <CheckCircle2 size={13} />
                            {isOverdueZero
                              ? `Overdue (0 / ${maxMarks})`
                              : `Graded: ${sub.score} / ${maxMarks}`}
                          </span>
                        ) : sub.status === 'resubmit_requested' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            padding: '0.3rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            fontWeight: 700
                          }}>
                            <RotateCcw size={13} /> Resubmit Requested
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: '#ffedd5',
                            color: '#c2410c',
                            border: '1px solid #fed7aa',
                            padding: '0.3rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            fontWeight: 700
                          }}>
                            <Clock size={13} /> Needs Review
                          </span>
                        )}

                        {wasSaved && (
                          <span style={{
                            background: '#10b981',
                            color: '#fff',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <Check size={12} /> Saved!
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Submission URL & Student Note */}
                    <div style={{ padding: '0.9rem 1.15rem', borderBottom: isEditing ? '1px solid #e2e8f0' : 'none', background: '#ffffff' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Project / Submission Link:
                          </span>
                          {sub.submission_url && (
                            <button
                              onClick={() => handleCopyUrl(sub.submission_url, sub.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: copiedId === sub.id ? '#10b981' : '#64748b',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '2px 6px'
                              }}
                            >
                              {copiedId === sub.id ? <Check size={12} /> : <Copy size={12} />}
                              <span>{copiedId === sub.id ? 'Copied Link!' : 'Copy URL'}</span>
                            </button>
                          )}
                        </div>

                        {sub.submission_url ? (
                          <a
                            href={normalizeUrl(sub.submission_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="submission-url-btn"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.65rem',
                              color: '#1d72fe',
                              textDecoration: 'none',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              padding: '0.75rem 1rem',
                              borderRadius: '10px',
                              fontSize: '0.88rem',
                              fontWeight: 600,
                              wordBreak: 'break-all',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <ExternalLink size={16} style={{ flexShrink: 0 }} />
                              <span>{sub.submission_url}</span>
                            </span>
                            <span style={{
                              background: '#1d72fe',
                              color: '#fff',
                              fontSize: '0.72rem',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}>
                              Open ↗
                            </span>
                          </a>
                        ) : (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            color: '#b91c1c',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                            fontWeight: 600
                          }}>
                            <span>⚠️ No link provided (Deadline exceeded without submission)</span>
                          </div>
                        )}

                        {sub.student_message && (
                          <div style={{
                            fontSize: '0.8rem',
                            color: '#475569',
                            background: '#f8fafc',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            marginTop: '0.25rem'
                          }}>
                            <strong>Student Note:</strong> {sub.student_message}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reviewed Summary Block with "Edit Grade" option */}
                    {isReviewed && !isEditing && (
                      <div style={{
                        padding: '0.85rem 1.15rem',
                        background: '#f8fafc',
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#15803d' }}>
                            Mark Given: {sub.score} / {maxMarks} Marks ({Math.round(((sub.score || 0) / maxMarks) * 100)}%)
                          </div>
                          {sub.staff_feedback && (
                            <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                              <span style={{ fontWeight: 600 }}>Feedback:</span> {sub.staff_feedback}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => setEditingSubId(sub.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#1e293b',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <Edit2 size={13} />
                          <span>Change Mark / Feedback</span>
                        </button>
                      </div>
                    )}

                    {/* Active Grading Section (Made ultra-convenient for Mobile & Desktop) */}
                    {isEditing && (
                      <div style={{
                        padding: '1.15rem',
                        background: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}>
                        {/* 1. Score Input & Preset Touch Buttons */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                              Enter Mark (Out of {maxMarks})
                            </label>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              Tap presets or type directly
                            </span>
                          </div>

                          {/* Quick Score Preset Tap Buttons */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            overflowX: 'auto',
                            paddingBottom: '0.4rem',
                            marginBottom: '0.65rem'
                          }}>
                            {presetButtons.map(preset => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setGradingScores(prev => ({ ...prev, [sub.id]: preset }))}
                                style={{
                                  padding: '0.4rem 0.75rem',
                                  borderRadius: '8px',
                                  border: Number(currentScore) === preset ? '1.5px solid #1d72fe' : '1px solid #cbd5e1',
                                  background: Number(currentScore) === preset ? '#1d72fe' : '#ffffff',
                                  color: Number(currentScore) === preset ? '#ffffff' : '#1e293b',
                                  fontSize: '0.82rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  minWidth: '44px',
                                  textAlign: 'center',
                                  flexShrink: 0,
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                }}
                              >
                                {preset === maxMarks ? `${preset} (Full)` : preset}
                              </button>
                            ))}
                          </div>

                          {/* Stepper + Big Numeric Input for Easy Mobile Typing */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '320px' }}>
                            <button
                              type="button"
                              onClick={() => handleStepScore(sub.id, -1)}
                              style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                fontSize: '1.2rem',
                                fontWeight: 700,
                                color: '#334155',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              -
                            </button>

                            <input
                              type="number"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              min="0"
                              max={maxMarks}
                              value={currentScore}
                              onChange={(e) => setGradingScores(prev => ({ ...prev, [sub.id]: e.target.value }))}
                              placeholder="0"
                              style={{
                                flex: 1,
                                height: '44px',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '8px',
                                border: '1.5px solid #1d72fe',
                                fontSize: '1.15rem',
                                fontWeight: 800,
                                textAlign: 'center',
                                outline: 'none',
                                background: '#ffffff',
                                color: '#0f172a'
                              }}
                            />

                            <button
                              type="button"
                              onClick={() => handleStepScore(sub.id, 1)}
                              style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                fontSize: '1.2rem',
                                fontWeight: 700,
                                color: '#334155',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              +
                            </button>

                            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
                              / {maxMarks}
                            </span>
                          </div>
                        </div>

                        {/* 2. Feedback Section + Quick Comment Chips */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                              Feedback / Remarks (Optional)
                            </label>
                          </div>

                          {/* Quick Feedback Chips */}
                          <div style={{
                            display: 'flex',
                            gap: '0.35rem',
                            overflowX: 'auto',
                            paddingBottom: '0.4rem',
                            marginBottom: '0.4rem'
                          }}>
                            {quickFeedbackOptions.map((chip, chipIdx) => (
                              <button
                                key={chipIdx}
                                type="button"
                                onClick={() => setGradingFeedback(prev => ({
                                  ...prev,
                                  [sub.id]: prev[sub.id] ? `${prev[sub.id]} ${chip}` : chip
                                }))}
                                style={{
                                  padding: '0.3rem 0.65rem',
                                  borderRadius: '6px',
                                  border: '1px solid #e2e8f0',
                                  background: '#ffffff',
                                  color: '#475569',
                                  fontSize: '0.74rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0
                                }}
                              >
                                {chip}
                              </button>
                            ))}
                          </div>

                          <textarea
                            value={currentFeedback}
                            onChange={(e) => setGradingFeedback(prev => ({ ...prev, [sub.id]: e.target.value }))}
                            rows={2}
                            style={{
                              width: '100%',
                              padding: '0.55rem 0.75rem',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              outline: 'none',
                              fontSize: '0.85rem',
                              background: '#ffffff',
                              color: '#1e293b'
                            }}
                            placeholder="Add constructive comments for the student..."
                          />
                        </div>

                        {/* 3. Action Buttons (Big Touch Targets) */}
                        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleSaveGrade(sub.id)}
                            disabled={isSaving}
                            style={{
                              flex: '2 1 180px',
                              padding: '0.75rem 1rem',
                              background: '#1d72fe',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '10px',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              cursor: isSaving ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem',
                              minHeight: '44px',
                              boxShadow: '0 2px 6px rgba(29, 114, 254, 0.3)'
                            }}
                          >
                            {isSaving ? (
                              <span>Saving Grade...</span>
                            ) : (
                              <>
                                <Save size={16} />
                                <span>Save Mark ({currentScore !== '' ? `${currentScore} Marks` : 'Save'})</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleResubmitRequest(sub.id)}
                            disabled={isSaving}
                            style={{
                              flex: '1 1 130px',
                              padding: '0.75rem 1rem',
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              borderRadius: '10px',
                              fontWeight: 700,
                              fontSize: '0.84rem',
                              cursor: isSaving ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.4rem',
                              minHeight: '44px'
                            }}
                          >
                            <RotateCcw size={15} />
                            <span>Request Resubmit</span>
                          </button>

                          {isReviewed && (
                            <button
                              onClick={() => setEditingSubId(null)}
                              style={{
                                padding: '0.75rem 1rem',
                                background: '#ffffff',
                                color: '#64748b',
                                border: '1px solid #cbd5e1',
                                borderRadius: '10px',
                                fontWeight: 600,
                                fontSize: '0.84rem',
                                cursor: 'pointer',
                                minHeight: '44px'
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
