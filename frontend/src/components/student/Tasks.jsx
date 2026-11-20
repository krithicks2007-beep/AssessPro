import React, { useState, useEffect, useRef } from 'react';
import {
  CheckSquare,
  Clock,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  Link as LinkIcon,
  Send,
  AlertCircle,
  Lock,
  Layers,
  Search
} from 'lucide-react';
import { getSupabaseClient } from '../../supabaseClient';

/**
 * Student Tasks Tab
 * Shows practical tasks and project submissions organized strictly by Group in ascending numerical order
 * (Group 1, Group 2, Group 3...), making multiple assignments structured and manageable.
 */
export default function Tasks({
  studentDept,
  tasks = [],
  groups = [],
  studentSubmissions = [],
  studentEmail,
  studentId,
  onSubmissionSuccess,
  onStartTask,
  notifySuccess,
  notifyError
}) {
  const [activeSubmitTaskId, setActiveSubmitTaskId] = useState(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const autoRecordedRef = useRef(new Set());

  const getSubmission = (taskId) => {
    return studentSubmissions.find(s => String(s.task_id) === String(taskId));
  };

  const normalizeUrl = (url) => {
    if (!url) return '#';
    if (/^https?:\/\//i.test(url)) return url;
    return 'https://' + url;
  };

  // Resolve group details accurately
  const resolveGroup = (task) => {
    if (task.groups && (task.groups.group_number !== undefined || task.groups.name)) {
      return {
        id: String(task.groups.id || task.group_id || 'unknown'),
        name: task.groups.name || 'Core',
        group_number: Number(task.groups.group_number || task.group_number) || 1,
        color: task.groups.color || '#1d72fe',
        category: task.groups.category || ''
      };
    }
    if (task.group_id && groups.length > 0) {
      const match = groups.find(g => String(g.id) === String(task.group_id));
      if (match) {
        return {
          id: String(match.id),
          name: match.name || 'Core',
          group_number: Number(match.group_number) || 1,
          color: match.color || '#1d72fe',
          category: match.category || ''
        };
      }
    }
    const num = Number(task.group_number);
    return {
      id: String(task.group_id || 'general'),
      name: task.group_name || (num ? `Group ${num}` : 'General / Core'),
      group_number: num || 9999,
      color: '#1d72fe',
      category: ''
    };
  };

  // Auto-record missed overdue tasks as score: 0 in Supabase to permanently factor into marks
  useEffect(() => {
    if (!studentId || !tasks || tasks.length === 0) return;
    const now = Date.now();
    const missedToRecord = tasks.filter(t => {
      if (!t.due_date) return false;
      const isPast = new Date(t.due_date).getTime() < now;
      const existing = getSubmission(t.id);
      return isPast && !existing && !autoRecordedRef.current.has(t.id);
    });

    if (missedToRecord.length === 0) return;

    missedToRecord.forEach(t => autoRecordedRef.current.add(t.id));

    const persistMissed = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const records = missedToRecord.map(t => ({
          task_id: t.id,
          student_id: studentId,
          submission_url: null,
          student_message: 'Deadline exceeded without submission',
          score: 0,
          staff_feedback: 'Submission time has exceeded, you have not submitted the link and scored 0.',
          status: 'reviewed',
          submitted_at: new Date(t.due_date).toISOString()
        }));

        await supabase.from('task_submissions').upsert(records, {
          onConflict: 'task_id,student_id',
          ignoreDuplicates: true
        });

        if (onSubmissionSuccess) {
          onSubmissionSuccess();
        }
      } catch (err) {
        console.warn('Auto-persisting missed tasks notice:', err);
      }
    };

    persistMissed();
  }, [tasks, studentSubmissions, studentId, onSubmissionSuccess]);

  const handleSubmit = async (task) => {
    const isOverdue = task.due_date ? new Date(task.due_date).getTime() < Date.now() : false;
    if (isOverdue) {
      notifyError('Submission time has exceeded. You have not submitted the link and scored 0.');
      setActiveSubmitTaskId(null);
      return;
    }

    if (!submissionLink.trim()) {
      notifyError('Please enter a valid submission link');
      return;
    }
    
    setSubmitting(true);
    try {
      const supabase = getSupabaseClient();
      await supabase.from('task_submissions').upsert([{
        task_id: task.id,
        student_id: studentId,
        submission_url: submissionLink.trim(),
        status: 'submitted',
        submitted_at: new Date().toISOString()
      }], { onConflict: 'task_id,student_id' });
      
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
    const isOverdue = task.due_date ? new Date(task.due_date).getTime() < Date.now() : false;
    if (isOverdue) {
      notifyError('Submission time has exceeded. You cannot submit after the deadline.');
      setActiveSubmitTaskId(null);
      return;
    }

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

  // Filter tasks based on search and selected group filter
  const filteredTasks = tasks.filter(task => {
    const grp = resolveGroup(task);
    const matchesSearch = (task.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (task.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          grp.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedGroupFilter !== 'all' && String(grp.id) !== String(selectedGroupFilter) && String(grp.group_number) !== String(selectedGroupFilter)) {
      return false;
    }

    return true;
  });

  // Group tasks in sequential order: Group 1, Group 2, Group 3...
  const groupedTasksMap = new Map();

  filteredTasks.forEach(task => {
    const grp = resolveGroup(task);
    const key = grp.id || `group-${grp.group_number}`;
    if (!groupedTasksMap.has(key)) {
      groupedTasksMap.set(key, {
        group: grp,
        tasks: []
      });
    }
    groupedTasksMap.get(key).tasks.push(task);
  });

  // Sort groups in ascending numerical order (Group 1, Group 2, Group 3...)
  const sortedGroupSections = Array.from(groupedTasksMap.values()).sort((a, b) => {
    return a.group.group_number - b.group.group_number;
  });

  // Available groups for filter pills
  const availableGroupsMap = new Map();
  tasks.forEach(t => {
    const grp = resolveGroup(t);
    if (!availableGroupsMap.has(grp.id)) {
      availableGroupsMap.set(grp.id, {
        ...grp,
        count: 0
      });
    }
    availableGroupsMap.get(grp.id).count += 1;
  });

  const availableGroupsList = Array.from(availableGroupsMap.values()).sort((a, b) => a.group_number - b.group_number);

  return (
    <div className="dashboard-content student-tasks-container">
      {/* Top Banner Card */}
      <div style={{
        background: '#ffffff',
        padding: '1.25rem 1.75rem',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        marginBottom: '1.25rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Assigned Tasks & Projects
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            Tasks organized sequentially by Group. Submit your project links and assignments directly to your staff.
          </p>
        </div>

        <div style={{
          background: '#eff6ff',
          border: '1px solid #dbeafe',
          color: '#1d72fe',
          padding: '0.45rem 0.95rem',
          borderRadius: '10px',
          fontSize: '0.8rem',
          fontWeight: 700
        }}>
          {tasks.length} Total Tasks
        </div>
      </div>

      {/* Group Navigation Bar & Search */}
      {tasks.length > 0 && (
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e5e7eb',
          padding: '0.85rem 1.15rem',
          marginBottom: '1.35rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem'
        }}>
          {/* Groups Filter Pills in Order */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginRight: '0.2rem' }}>
              <Layers size={14} color="#1d72fe" />
              <span>Groups:</span>
            </div>

            <button
              onClick={() => setSelectedGroupFilter('all')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                border: selectedGroupFilter === 'all' ? '1.5px solid #1d72fe' : '1px solid #e2e8f0',
                background: selectedGroupFilter === 'all' ? '#eff6ff' : '#ffffff',
                color: selectedGroupFilter === 'all' ? '#1d72fe' : '#475569',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              All Groups ({tasks.length})
            </button>

            {availableGroupsList.map(grp => (
              <button
                key={grp.id}
                onClick={() => setSelectedGroupFilter(grp.id)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '8px',
                  border: selectedGroupFilter === grp.id ? `1.5px solid ${grp.color}` : '1px solid #e2e8f0',
                  background: selectedGroupFilter === grp.id ? `${grp.color}15` : '#ffffff',
                  color: selectedGroupFilter === grp.id ? grp.color : '#334155',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: grp.color }} />
                <span>Group {grp.group_number}: {grp.name} ({grp.count})</span>
              </button>
            ))}
          </div>

          {/* Search box */}
          <div style={{ position: 'relative', minWidth: '180px', flex: '1 1 180px', maxWidth: '280px' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.4rem 0.75rem 0.4rem 2rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                outline: 'none',
                background: '#ffffff'
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content: Group-By-Group In Strict Order (Group 1, Group 2, Group 3...) */}
      {sortedGroupSections.length === 0 ? (
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
            <CheckSquare size={28} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem' }}>
            {tasks.length === 0 ? 'No Tasks Assigned Yet' : 'No Tasks Match Selected Group / Filter'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>
            {tasks.length === 0
              ? 'You have no pending tasks or projects assigned to you at the moment.'
              : 'Try selecting "All Groups" or clearing your search.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {sortedGroupSections.map(section => {
            const grp = section.group;
            const sectionTasks = section.tasks;

            return (
              <section key={grp.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* Group Section Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 1rem',
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: `1.5px solid ${grp.color}35`,
                  borderLeft: `5px solid ${grp.color}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: `${grp.color}15`,
                      color: grp.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.82rem'
                    }}>
                      {grp.group_number !== 9999 ? grp.group_number : 'G'}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                        Group {grp.group_number !== 9999 ? grp.group_number : 'Core'}: {grp.name}
                      </h3>
                      {grp.category && (
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{grp.category}</span>
                      )}
                    </div>
                  </div>

                  <span style={{
                    background: `${grp.color}15`,
                    color: grp.color,
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '0.74rem',
                    fontWeight: 800
                  }}>
                    {sectionTasks.length} {sectionTasks.length === 1 ? 'Task' : 'Tasks'}
                  </span>
                </div>

                {/* Grid of Task Cards for this Group */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
                  {sectionTasks.map(task => {
                    const submission = getSubmission(task.id);
                    const status = submission?.status;
                    const hasSubmittedLink = Boolean(submission?.submission_url && submission.submission_url.trim() !== '');
                    const isOverdue = Boolean(task.due_date && new Date(task.due_date).getTime() < Date.now());

                    const isMissed = (isOverdue && !hasSubmittedLink) || (Boolean(submission) && !hasSubmittedLink && submission.score === 0);
                    const isResubmit = status === 'resubmit_requested' && !isMissed;
                    const isReviewed = status === 'reviewed' && !isMissed;
                    const isSubmitted = status === 'submitted' && !isMissed;
                    const isSubmittingThis = activeSubmitTaskId === task.id;

                    return (
                      <div 
                        key={task.id} 
                        style={{
                          background: '#ffffff',
                          border: isMissed ? '1.5px solid #fecaca' : '1px solid #e2e8f0',
                          borderRadius: '16px',
                          padding: '1.35rem',
                          boxShadow: isMissed ? '0 4px 12px rgba(239, 68, 68, 0.06)' : '0 2px 6px rgba(0,0,0,0.03)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.25rem 0.65rem',
                              borderRadius: '20px',
                              background: isMissed ? '#fef2f2' : isReviewed ? '#ecfdf5' : isResubmit ? '#fef3c7' : isSubmitted ? '#eff6ff' : '#f1f5f9',
                              color: isMissed ? '#dc2626' : isReviewed ? '#059669' : isResubmit ? '#b45309' : isSubmitted ? '#1d4ed8' : '#475569',
                              border: isMissed ? '1px solid #fecaca' : 'none',
                              textTransform: 'uppercase',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}>
                              {isMissed ? (
                                <><AlertCircle size={12} /> Time Exceeded &bull; 0 Marks</>
                              ) : isReviewed ? (
                                '✓ Reviewed'
                              ) : isResubmit ? (
                                '⚠ Resubmit Requested'
                              ) : isSubmitted ? (
                                'Submitted'
                              ) : (
                                'Assigned Task'
                              )}
                            </span>
                            <span style={{
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              color: grp.color,
                              background: `${grp.color}12`,
                              padding: '2px 8px',
                              borderRadius: '10px'
                            }}>
                              Group {grp.group_number !== 9999 ? grp.group_number : 1}
                            </span>
                          </div>

                          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.45rem 0', lineHeight: 1.35 }}>
                            {task.title}
                          </h3>
                          
                          <p style={{ fontSize: '0.84rem', color: '#475569', margin: '0 0 1rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {task.description}
                          </p>

                          <div style={{ display: 'flex', gap: '1rem', color: '#64748b', fontSize: '0.78rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <CheckSquare size={14} color="#10b981" /> Max Score: <strong>{task.max_score}</strong>
                            </span>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              color: isMissed ? '#dc2626' : '#64748b',
                              fontWeight: isMissed ? 700 : 500
                            }}>
                              <Clock size={14} color={isMissed ? '#dc2626' : '#f59e0b'} />
                              Due: <strong>{task.due_date ? new Date(task.due_date).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'None'}</strong>
                              {isMissed && ' (Expired)'}
                            </span>
                          </div>
                          
                          {/* Overdue Warning */}
                          {isMissed && (
                            <div style={{
                              background: '#fef2f2',
                              border: '1.5px solid #fecaca',
                              borderRadius: '12px',
                              padding: '0.85rem 1rem',
                              marginBottom: '1rem'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                                <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#991b1b', marginBottom: '0.2rem' }}>
                                    Submission Time Has Exceeded
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: '#b91c1c', lineHeight: 1.45 }}>
                                    Submission time has exceeded, you have not submitted the link and scored 0.
                                  </div>
                                  <div style={{
                                    marginTop: '0.5rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    background: '#fee2e2',
                                    border: '1px solid #fca5a5',
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                    color: '#991b1b'
                                  }}>
                                    <span>Mark: 0 / {task.max_score || 100} (0%)</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {isResubmit && submission?.staff_feedback && (
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

                        {/* Submission and Action Buttons */}
                        {isMissed ? (
                          <div style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '10px',
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#991b1b',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            cursor: 'not-allowed'
                          }}>
                            <Lock size={15} color="#dc2626" />
                            <span>Submission Closed &bull; Scored 0</span>
                          </div>
                        ) : isSubmittingThis ? (
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
                                background: '#d97706',
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
                              background: '#1d72fe',
                              color: '#ffffff', fontWeight: 700, fontSize: '0.88rem', display: 'inline-flex',
                              alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(29, 114, 254, 0.25)'
                            }}
                          >
                            Submit Project <ArrowRight size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
