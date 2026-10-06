import React from 'react';
import {
  FileText,
  Check,
  Hourglass,
  BarChart2,
  BookOpen,
  Cpu,
  Bot,
  Calculator,
  Settings,
  Flame,
  Droplet,
  Thermometer,
  Activity,
  Monitor,
  Building,
  ArrowRight,
  Layers,
  Sparkles
} from 'lucide-react';
import CircleRing from '../shared/CircleRing';

/**
 * Pick an appropriate subject/test icon based on test title or index
 */
const getTestIcon = (title = '', index = 0) => {
  const t = title.toLowerCase();
  if (t.includes('math') || t.includes('calcul') || t.includes('algebra')) return Calculator;
  if (t.includes('thermo') || t.includes('heat') || t.includes('flame')) return Flame;
  if (t.includes('fluid') || t.includes('water') || t.includes('hydraulic')) return Droplet;
  if (t.includes('sensor') || t.includes('instrument') || t.includes('thermo')) return Thermometer;
  if (t.includes('control') || t.includes('loop') || t.includes('signal') || t.includes('wave')) return Activity;
  if (t.includes('robot') || t.includes('ai') || t.includes('autom')) return Bot;
  if (t.includes('plc') || t.includes('hmi') || t.includes('screen') || t.includes('ui')) return Monitor;
  if (t.includes('industry') || t.includes('factory') || t.includes('manufactur')) return Building;
  if (t.includes('digital') || t.includes('electron') || t.includes('embed') || t.includes('circuit') || t.includes('chip')) return Cpu;
  if (t.includes('mech') || t.includes('gear') || t.includes('design')) return Settings;

  // Fallback icon list by index
  const pool = [Calculator, Settings, Flame, Droplet, Cpu, Thermometer, Activity, Bot, Monitor, Building];
  return pool[index % pool.length];
};

/**
 * Pick color for score progress bar
 */
const getScoreColor = (pct) => {
  if (pct >= 80) return '#10b981'; // Green
  if (pct >= 70) return '#f59e0b'; // Amber / Yellow
  return '#f97316'; // Orange
};



export default function Dashboard({
  groups = [],
  tests = [],
  tasks = [],
  studentSubmissions = [],
  studentTaskSubmissions = [],
  studentName = 'Student',
  studentDept = '',
  studentYear = '',
  overallScore = 0,
  testsCompletedCount = 0,
  pendingCount = 0,
  assignedStaff = null,
  onNavigateToTests
}) {
  const firstName = studentName.split(' ')[0] || 'Student';

  // Total tests calculation - Strict zero defaults
  const totalTestsCount = tests.length;
  const displayCompletedCount = testsCompletedCount;
  const displayPendingCount = pendingCount;

  // Calculate Test Average (Strict Rule)
  const completedTestSubs = studentSubmissions.filter(s => s.status === 'completed');
  const pastTests = tests.filter(t => t.end_time && new Date(t.end_time).getTime() < Date.now());
  const missedTestsCount = pastTests.filter(t => !completedTestSubs.some(s => String(s.test_id) === String(t.id))).length;
  const gradedTestsCount = completedTestSubs.length + missedTestsCount;
  
  const totalTestScore = completedTestSubs.reduce((acc, s) => acc + (Number(s.percentage) || 0), 0);
  const testAverage = gradedTestsCount > 0 ? Math.round(totalTestScore / gradedTestsCount) : 0;

  // Calculate Task Average (Strict Rule)
  const reviewedTaskSubs = studentTaskSubmissions.filter(s => s.status === 'reviewed' && s.score != null);
  const pastTasks = tasks.filter(t => t.due_date && new Date(t.due_date).getTime() < Date.now());
  const missedTasksCount = pastTasks.filter(t => !reviewedTaskSubs.some(s => String(s.task_id) === String(t.id))).length;
  const gradedTasksCount = reviewedTaskSubs.length + missedTasksCount;

  const totalTaskScore = reviewedTaskSubs.reduce((acc, sub) => {
    const task = tasks.find(t => t.id === sub.task_id);
    const max = task?.max_score || 100;
    return acc + ((sub.score / max) * 100);
  }, 0);
  const taskAverage = gradedTasksCount > 0 ? Math.round(totalTaskScore / gradedTasksCount) : 0;

  // Overall Percentage from layout props (since Layout computes strict overallScore)
  let overallPercentage = overallScore;

  // Build display groups - show all active academic groups from faculty
  const displayGroups = Array.isArray(groups) ? groups : [];

  return (
    <div style={{ padding: '0 0 2rem 0' }}>
      {/* Top Header / Greeting Bar with Assigned Staff */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* The top-level Student Dashboard title is rendered by StudentLayout.jsx */}
        <div />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            padding: '0.45rem 1rem',
            borderRadius: '30px',
            fontSize: '0.8rem',
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(29, 78, 216, 0.05)'
          }}>
            <Check size={14} />
            <span>Completed: <strong>{displayCompletedCount}</strong></span>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            color: '#b45309',
            padding: '0.45rem 1rem',
            borderRadius: '30px',
            fontSize: '0.8rem',
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(180, 83, 9, 0.05)'
          }}>
            <Hourglass size={14} />
            <span>Upcoming: <strong>{displayPendingCount}</strong></span>
          </div>

          {/* Assigned Staff Notice (Requirement 5) */}
          {(assignedStaff?.assigned_staff_name || assignedStaff?.staffName) ? (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '0.45rem 1rem',
              borderRadius: '30px',
              fontSize: '0.8rem',
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.1)'
            }}>
              <span>👨‍🏫</span>
              <span>Mentor: <strong>{assignedStaff.assigned_staff_name || assignedStaff.staffName}</strong></span>
            </div>
          ) : (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#92400e',
              padding: '0.45rem 1rem',
              borderRadius: '30px',
              fontSize: '0.8rem',
              fontWeight: 600
            }}>
              <span>ℹ️</span>
              <span>No mentor</span>
            </div>
          )}
        </div>
      </div>

      {/* Row 1: KPI Progress Rings (Overall, Tests, Tasks) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.75rem'
      }}>
        {/* Metric 1: Overall Percentage (Purple Theme) */}
        <div style={{
          background: '#f3e8ff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e9d5ff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: '#8b5cf6',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <BarChart2 size={34} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <CircleRing 
              percentage={overallPercentage} 
              color="#8b5cf6" 
              size={130} 
              strokeWidth={9} 
              fontSizeOverride={overallPercentage === 100 ? '1.5rem' : '1.8rem'}
              fontColorOverride="#4c1d95"
            />
            <div style={{ fontSize: '0.9rem', color: '#6d28d9', fontWeight: 700 }}>
              Overall Course Grade
            </div>
          </div>
        </div>

        {/* Metric 2: Test Average (Blue Theme) */}
        <div style={{
          background: '#dbeafe',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #bfdbfe',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: '#3b82f6',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <FileText size={34} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <CircleRing 
              percentage={testAverage} 
              color="#3b82f6" 
              size={130} 
              strokeWidth={9} 
              fontSizeOverride={testAverage === 100 ? '1.5rem' : '1.8rem'}
              fontColorOverride="#1e3a8a"
            />
            <div style={{ fontSize: '0.9rem', color: '#1e3a8a', fontWeight: 700 }}>
              Test Average
            </div>
          </div>
        </div>

        {/* Metric 3: Task Average (Green/Teal Theme) */}
        <div style={{
          background: '#ccfbf1',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #99f6e4',
          boxShadow: '0 4px 12px rgba(20, 184, 166, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: '#14b8a6',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <BookOpen size={34} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <CircleRing 
              percentage={taskAverage} 
              color="#14b8a6" 
              size={130} 
              strokeWidth={9} 
              fontSizeOverride={taskAverage === 100 ? '1.5rem' : '1.8rem'}
              fontColorOverride="#115e59"
            />
            <div style={{ fontSize: '0.9rem', color: '#134e4a', fontWeight: 700 }}>
              Task Average
            </div>
          </div>
        </div>
      </div>



      {/* Row 2: Dynamic Subject Groups (Matching Screenshot Layout & Color Themes) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem'
      }}>
        {displayGroups.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px dashed #cbd5e1',
            padding: '3rem 2rem',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <BookOpen size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '0.5rem' }}>No Groups Assigned Yet</h3>
            <p>You have not been assigned to any subject groups or tests.</p>
          </div>
        ) : displayGroups.map((group, idx) => {
          const HeaderIcon = BookOpen;
          const groupName = group.name || `Group ${group.group_number || idx + 1}`;
          const groupSubtitle = group.category || 'Subject Group';
          const groupThemeColor = group.color || '#1d72fe';
          const groupBg = groupThemeColor + '10'; // 10% opacity tint
          const groupBorder = groupThemeColor + '30'; // 30% opacity tint

          // Find tests and tasks belonging to this group
          const groupTests = tests.filter(t => t.group_id === group.id);
          const groupTasks = tasks.filter(t => t.group_id === group.id);
          
          // Calculate dynamic group average if submissions exist (Strict Rule)
          let groupPct = 0;
          const groupTestSubs = studentSubmissions.filter(s => groupTests.some(gt => gt.id === s.test_id));
          const groupTaskSubs = studentTaskSubmissions.filter(s => groupTasks.some(gt => gt.id === s.task_id) && s.status === 'reviewed');
          
          const groupPastTests = groupTests.filter(t => t.end_time && new Date(t.end_time).getTime() < Date.now());
          const groupMissedTests = groupPastTests.filter(t => !groupTestSubs.some(s => s.test_id === t.id));
          
          const groupPastTasks = groupTasks.filter(t => t.due_date && new Date(t.due_date).getTime() < Date.now());
          const groupMissedTasks = groupPastTasks.filter(t => !groupTaskSubs.some(s => s.task_id === t.id));

          const totalSubsCount = groupTestSubs.length + groupTaskSubs.length + groupMissedTests.length + groupMissedTasks.length;
          if (totalSubsCount > 0) {
            const testTotal = groupTestSubs.reduce((a, s) => a + Number(s.percentage || 0), 0);
            const taskTotal = groupTaskSubs.reduce((a, s) => {
               const max = groupTasks.find(t => t.id === s.task_id)?.max_score || 100;
               return a + ((s.score / max) * 100);
            }, 0);
            groupPct = Math.round((testTotal + taskTotal) / totalSubsCount);
          }

          // Build item list for the group
          const testItems = [
             ...groupTests.map(gt => {
                const sub = studentSubmissions.find(s => s.test_id === gt.id);
                const score = sub ? Number(sub.percentage || 0) : 0;
                return { id: gt.id, title: gt.title, score: score, type: 'test' };
             }),
             ...groupTasks.map(gt => {
                const sub = studentTaskSubmissions.find(s => s.task_id === gt.id && s.status === 'reviewed');
                const score = sub ? Math.round((sub.score / (gt.max_score || 100)) * 100) : 0;
                return { id: gt.id, title: gt.title, score: score, type: 'task' };
             })
          ];

          return (
            <div
              key={group.id || idx}
              style={{
                background: groupBg,
                borderRadius: '16px',
                border: `1.5px solid ${groupBorder}`,
                padding: '1.35rem 1.5rem',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              {/* Group Card Header */}
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '1.15rem',
                  borderBottom: '1px solid #f1f5f9',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: groupThemeColor,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 4px 10px ${groupThemeColor}30`
                    }}>
                      <HeaderIcon size={22} />
                    </div>
                    <div>
                      <h3 style={{
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        margin: 0,
                        lineHeight: 1.2
                      }}>
                        {groupName}
                      </h3>
                      <div style={{
                        fontSize: '0.8rem',
                        color: '#64748b',
                        fontWeight: 500,
                        marginTop: '0.15rem'
                      }}>
                        {groupSubtitle}
                      </div>
                    </div>
                  </div>

                  {/* Circular Score Ring */}
                  <CircleRing
                    percentage={groupPct}
                    color={groupThemeColor}
                    size={56}
                    strokeWidth={5}
                  />
                </div>

                {/* Test Items List with Progress Bars & Percentage Badges */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {testItems.length === 0 ? (
                    <div style={{
                      padding: '1.5rem 1rem',
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.6)',
                      borderRadius: '12px',
                      border: '1px dashed rgba(0, 0, 0, 0.08)',
                      color: '#64748b'
                    }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                        No Assignments
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                        Tests and tasks will show here
                      </div>
                    </div>
                  ) : (
                    testItems.slice(0, 4).map((testItem, tIdx) => {
                      const TestIcon = getTestIcon(testItem.title, tIdx);
                      const score = testItem.score;
                      const barColor = getScoreColor(score);

                      return (
                        <div key={testItem.id || tIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1, paddingRight: '0.5rem' }}>
                              {testItem.type === 'task' ? (
                                <BookOpen size={15} color="#14b8a6" style={{ flexShrink: 0 }} />
                              ) : (
                                <TestIcon size={15} color="#1d72fe" style={{ flexShrink: 0 }} />
                              )}
                              <span style={{
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                color: '#1e293b',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {testItem.title}
                              </span>
                            </div>
                            <span style={{
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              color: '#1e293b',
                              flexShrink: 0
                            }}>
                              {score}%
                            </span>
                          </div>

                          {/* Rounded Progress Bar */}
                          <div style={{
                            width: '100%',
                            height: '6px',
                            background: '#e2e8f0',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            marginTop: '2px'
                          }}>
                            <div style={{
                              width: `${Math.min(score, 100)}%`,
                              height: '100%',
                              background: barColor,
                              borderRadius: '10px',
                              transition: 'width 0.8s ease-in-out'
                            }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Card Footer Quick Link */}
              <div style={{
                marginTop: '1.25rem',
                paddingTop: '0.85rem',
                borderTop: '1px solid #f8fafc',
                display: 'flex',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={onNavigateToTests}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: groupThemeColor,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '2px 4px'
                  }}
                >
                  <span>View Details</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
