import React, { useState, useEffect } from 'react';
import {
  Clock,
  HelpCircle,
  Calendar,
  Users,
  Plus,
  AlertTriangle,
  Timer,
  MoreVertical,
  Copy,
  Edit,
  Trash2,
  CheckCircle2,
  Bell,
  Search,
  CheckSquare,
  Layers,
  Tag
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
          setTimeLeft(`${d}d ${hStr}h ${mStr}m`);
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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.35rem',
      padding: '0.75rem 0.5rem',
      background: '#dbeafe',
      border: '1px solid #93c5fd',
      borderRadius: '12px',
      color: '#1e3a8a',
      fontSize: '0.75rem',
      fontWeight: 800,
      minWidth: '105px',
      textAlign: 'center',
      alignSelf: 'center',
      flexShrink: 0
    }}>
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
 * Fully responsive mobile & desktop view.
 * Organizes tasks strictly in group order (Group 1, Group 2, Group 3...) so managing
 * multiple assessments across different groups is clear, structured, and organized.
 */
export default function Tasks({
  tasks = [],
  groups = [],
  onCreateTask,
  onViewSubmissions,
  onConfigureTask,
  onQuickLaunch,
  onDeleteTask,
  onCopyTask
}) {
  const [TaskToDelete, setTaskToDelete] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'submitted' | 'pending' | 'drafts'
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');

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

  // Filter tasks based on search, filter type, and group selection
  const filteredTasks = tasks.filter(t => {
    const grp = resolveGroup(t);
    const matchesSearch = (t.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          grp.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === 'submitted' && (t.submissionsCount || 0) === 0) return false;
    if (filterType === 'pending' && (t.pendingReviewCount || 0) === 0) return false;
    if (filterType === 'drafts' && t.status !== 'draft') return false;

    if (selectedGroupFilter !== 'all' && String(grp.id) !== String(selectedGroupFilter) && String(grp.group_number) !== String(selectedGroupFilter)) {
      return false;
    }

    return true;
  });

  // Partition filtered tasks into groups in strict order: Group 1, Group 2, Group 3...
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

  // Sort groups in ascending order: Group 1, Group 2, Group 3, Group 4...
  const sortedGroupSections = Array.from(groupedTasksMap.values()).sort((a, b) => {
    return a.group.group_number - b.group.group_number;
  });

  // Sort tasks within each group
  sortedGroupSections.forEach(sec => {
    sec.tasks.sort((a, b) => {
      const timeA = new Date(a.due_date || a.created_at || 0).getTime();
      const timeB = new Date(b.due_date || b.created_at || 0).getTime();
      return timeB - timeA;
    });
  });

  // Available groups for quick filter selector (sorted in order)
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

  const totalSubmittedAcrossTasks = tasks.reduce((sum, t) => sum + (t.submissionsCount || 0), 0);
  const totalPendingAcrossTasks = tasks.reduce((sum, t) => sum + (t.pendingReviewCount || 0), 0);

  return (
    <div className="dashboard-content staff-tasks-container">
      {/* Group Navigation Bar & Status Filter */}
      {tasks.length > 0 && (
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e5e7eb',
          padding: '0.85rem 1.15rem',
          marginBottom: '1.35rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          {/* Row 1: Groups Selector (Ordered Group 1, Group 2, Group 3...) + New Task Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginRight: '0.25rem' }}>
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

            <button
              className="btn-create-test"
              onClick={onCreateTask}
              style={{
                padding: '0.55rem 1.15rem',
                fontSize: '0.84rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                borderRadius: '10px',
                flexShrink: 0
              }}
            >
              <Plus size={16} />
              <span>New Task</span>
            </button>
          </div>

          {/* Row 2: Status Filter Tabs & Search */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.65rem',
            paddingTop: '0.6rem',
            borderTop: '1px solid #f1f5f9'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto' }}>
              <button
                onClick={() => setFilterType('all')}
                style={{
                  padding: '0.35rem 0.7rem',
                  borderRadius: '6px',
                  border: filterType === 'all' ? '1px solid #1d72fe' : '1px solid #cbd5e1',
                  background: filterType === 'all' ? '#eff6ff' : '#ffffff',
                  color: filterType === 'all' ? '#1d72fe' : '#64748b',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                All Status
              </button>

              <button
                onClick={() => setFilterType('submitted')}
                style={{
                  padding: '0.35rem 0.7rem',
                  borderRadius: '6px',
                  border: filterType === 'submitted' ? '1px solid #1d72fe' : '1px solid #cbd5e1',
                  background: filterType === 'submitted' ? '#eff6ff' : '#ffffff',
                  color: filterType === 'submitted' ? '#1d72fe' : '#64748b',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Submitted
              </button>

              {totalPendingAcrossTasks > 0 && (
                <button
                  onClick={() => setFilterType('pending')}
                  style={{
                    padding: '0.35rem 0.7rem',
                    borderRadius: '6px',
                    border: filterType === 'pending' ? '1px solid #ea580c' : '1px solid #cbd5e1',
                    background: filterType === 'pending' ? '#fff7ed' : '#ffffff',
                    color: filterType === 'pending' ? '#ea580c' : '#64748b',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <span>Needs Marks</span>
                  <span style={{ background: '#ea580c', color: '#fff', borderRadius: '10px', padding: '1px 5px', fontSize: '0.66rem' }}>
                    {totalPendingAcrossTasks}
                  </span>
                </button>
              )}

              <button
                onClick={() => setFilterType('drafts')}
                style={{
                  padding: '0.35rem 0.7rem',
                  borderRadius: '6px',
                  border: filterType === 'drafts' ? '1px solid #64748b' : '1px solid #cbd5e1',
                  background: filterType === 'drafts' ? '#f1f5f9' : '#ffffff',
                  color: filterType === 'drafts' ? '#0f172a' : '#64748b',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Drafts ({tasks.filter(t => t.status === 'draft').length})
              </button>
            </div>

            <div style={{ position: 'relative', minWidth: '180px', flex: '1 1 180px', maxWidth: '300px' }}>
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
        </div>
      )}

      {/* Main Content: Group-By-Group In Strict Sequential Order */}
      {sortedGroupSections.length === 0 ? (
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
            {tasks.length === 0 ? 'No Assessments Created Yet' : 'No Tasks Match Selected Group / Filter'}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
            {tasks.length === 0
              ? 'Click "New Task" above to create a custom assessment with MCQs and assign it to student groups.'
              : 'Try selecting "All Groups" or clearing your search filter.'}
          </p>
          {tasks.length === 0 && (
            <button
              className="btn-create-test"
              onClick={onCreateTask}
              style={{ margin: '0 auto', display: 'inline-flex', padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}
            >
              <Plus size={16} />
              <span>Create First Task</span>
            </button>
          )}
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
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
                    <span style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      color: '#0f172a',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '0.74rem',
                      fontWeight: 800
                    }}>
                      Group Avg: {sectionTasks.length > 0 ? (sectionTasks.reduce((acc, t) => acc + (Number(t.avg) || 0), 0) / sectionTasks.length).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                </div>

                {/* Grid of Task Cards for this Group */}
                <div className="task-cards-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '1.25rem'
                }}>
                  {sectionTasks.map((t, idx) => {
                    const hasSubmissions = (t.submissionsCount || 0) > 0;
                    const subsCount = t.submissionsCount || 0;
                    const pendingCount = t.pendingReviewCount || 0;
                    const hasPending = pendingCount > 0;

                    return (
                      <div
                        key={t.id || idx}
                        className="task-item-card"
                        style={{
                          background: '#ffffff',
                          borderRadius: '16px',
                          border: hasPending ? '1.5px solid #fca5a5' : '1px solid #e5e7eb',
                          padding: '1.35rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: hasPending ? '0 4px 14px rgba(239, 68, 68, 0.08)' : '0 2px 6px rgba(0,0,0,0.03)',
                          position: 'relative'
                        }}
                      >
                        {/* 1. Red Pending Badge: only shown if students submitted and grading is not yet marked */}
                        {hasPending && (
                          <div
                            className="task-floating-red-badge"
                            title={`${pendingCount} submission${pendingCount > 1 ? 's' : ''} pending grading`}
                            style={{
                              position: 'absolute',
                              top: '-12px',
                              left: '16px',
                              background: '#ef4444',
                              color: '#ffffff',
                              padding: '3px 11px',
                              borderRadius: '20px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                              zIndex: 8,
                              border: '2px solid #ffffff',
                              letterSpacing: '0.2px'
                            }}
                          >
                            <span style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: '#ffffff',
                              display: 'inline-block'
                            }} />
                            <span>{pendingCount} Pending</span>
                          </div>
                        )}

                        {/* Options Menu Button (3 Dots) */}
                        <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
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
                              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                            }}
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
                              borderRadius: '10px',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                              width: '150px',
                              display: 'flex',
                              flexDirection: 'column',
                              overflow: 'hidden',
                              zIndex: 20
                            }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); if (onCopyTask) onCopyTask(t); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem', background: '#eff6ff', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#1d4ed8', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid #e0e7ff' }}
                              >
                                <Copy size={15} /> Copy Task
                              </button>
                              {t.status === 'published' ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); if (onViewSubmissions) onViewSubmissions(t); }}
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem', background: '#f0fdf4', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#15803d', fontSize: '0.85rem', fontWeight: 600 }}
                                >
                                  <Users size={15} /> Review & Grade
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); if (onConfigureTask) onConfigureTask(t); }}
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem', background: '#f0fdf4', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#15803d', fontSize: '0.85rem', fontWeight: 600 }}
                                >
                                  <Edit size={15} /> Edit Draft
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setTaskToDelete(t); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem', background: '#fef2f2', border: 'none', borderTop: '1px solid #fee2e2', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600 }}
                              >
                                <Trash2 size={15} /> Delete Task
                              </button>
                            </div>
                          )}
                        </div>

                        <div>
                          {/* Card Top: Group Pill and Status */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', paddingRight: '2.5rem' }}>
                            <span style={{
                              background: `${grp.color}15`,
                              color: grp.color,
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '0.74rem',
                              fontWeight: 700
                            }}>
                              Group {grp.group_number !== 9999 ? grp.group_number : 1}: {grp.name}
                            </span>
                            <span className="status-pill-published" style={{
                              fontSize: '0.72rem',
                              background: t.status === 'draft' ? '#f1f5f9' : '#eff6ff',
                              color: t.status === 'draft' ? '#475569' : '#2563eb'
                            }}>
                              {t.status || 'Published'}
                            </span>
                          </div>

                          {/* Task Title */}
                          <h3 style={{
                            fontSize: '1.05rem',
                            fontWeight: 800,
                            color: '#111827',
                            marginBottom: '0.75rem',
                            lineHeight: 1.35
                          }}>
                            {t.title}
                          </h3>

                          {/* Details Block */}
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
                              {hasSubmissions && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.1rem' }}>
                                  <CheckCircle2 size={15} color="#3b82f6" />
                                  <span>Graded: <strong>{t.reviewedCount || 0} / {subsCount} · Batch Avg: {t.avg || 0}%</strong></span>
                                </div>
                              )}
                            </div>

                            {t.status === 'draft' && t.auto_launch && (
                              <AutoLaunchTimer Task={t} onTriggerLaunch={onQuickLaunch} />
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {t.status === 'draft' ? (
                          <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: 'auto' }}>
                            <button
                              onClick={() => onConfigureTask(t)}
                              style={{
                                flex: 1,
                                padding: '0.65rem',
                                borderRadius: '10px',
                                border: '1px solid #1d72fe',
                                background: '#eff6ff',
                                color: '#1d72fe',
                                fontSize: '0.84rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: '42px'
                              }}
                            >
                              Configure Task
                            </button>
                            <button
                              onClick={() => onQuickLaunch(t)}
                              style={{
                                flex: 1,
                                padding: '0.65rem',
                                borderRadius: '10px',
                                border: 'none',
                                background: '#1d72fe',
                                color: '#ffffff',
                                fontSize: '0.84rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: '42px'
                              }}
                            >
                              Launch Now
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn-mark-submissions"
                            onClick={() => onViewSubmissions(t)}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '10px',
                              border: 'none',
                              background: hasSubmissions ? '#1d72fe' : '#eff6ff',
                              color: hasSubmissions ? '#ffffff' : '#1d72fe',
                              fontSize: '0.86rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem',
                              minHeight: '44px',
                              boxShadow: hasSubmissions ? '0 3px 10px rgba(29, 114, 254, 0.25)' : 'none',
                              marginTop: 'auto'
                            }}
                          >
                            <Users size={16} />
                            <span>
                              {hasSubmissions
                                ? `Mark Submissions (${subsCount})`
                                : 'View Student Submissions'}
                            </span>
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
          padding: '1.25rem'
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
                  gap: '0.25rem'
                }}
              >
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1d72fe', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>📦 Keep Data (Delete Card Only)</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                  Removes the Task card from staff & student views, but retains all student marks and batch calculations as-is.
                </div>
              </button>

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
                  gap: '0.25rem'
                }}
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
