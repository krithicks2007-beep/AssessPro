import React from 'react';
import {
  Plus,
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
  BarChart3,
  FileCheck,
  ClipboardCheck,
  FileStack,
  Play,
  Users
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
  totalTestsCount = 0,
  publishedCount = 0,
  draftCount = 0,
  activeTestsCount = 0,
  totalStudentsCount = 0,
  onManageGroups,
  onCreateTest,
  onViewSubmissions
}) {
  const displayGroups = Array.isArray(groups) ? groups : [];
  
  // Calculate test average — only count published tests that have at least one graded submission
  const gradedTests = tests.filter(t => t.status !== 'draft' && Number(t.avg) > 0);
  const testAverage = gradedTests.length > 0 
    ? Math.round(gradedTests.reduce((acc, test) => acc + (Number(test.avg) || 0), 0) / gradedTests.length)
    : 0;

  // Calculate task average — only count tasks that have at least one reviewed submission
  const gradedTasks = tasks.filter(t => Number(t.avg) > 0);
  const taskAverage = gradedTasks.length > 0 
    ? Math.round(gradedTasks.reduce((acc, task) => acc + (Number(task.avg) || 0), 0) / gradedTasks.length)
    : 0;

  // Overall percentage
  let overallPercentage = 0;
  if (gradedTests.length > 0 && gradedTasks.length > 0) {
    overallPercentage = Math.round((testAverage + taskAverage) / 2);
  } else if (gradedTests.length > 0) {
    overallPercentage = testAverage;
  } else if (gradedTasks.length > 0) {
    overallPercentage = taskAverage;
  }

  // Total students from props
  const totalStudents = totalStudentsCount;

  return (
    <div className="dashboard-content">

      {/* 6 Metric & Stat Boxes in One Single Line */}
      <div style={{
        display: 'flex',
        gap: '0.85rem',
        marginBottom: '1.75rem',
        alignItems: 'stretch',
        width: '100%'
      }}>
        {/* Metric 1: Overall Percentage (Purple Theme - Light, Simple & Premium with top-right Badge) */}
        <div style={{
          position: 'relative',
          flex: '1.25 1 0',
          minWidth: 0,
          background: 'linear-gradient(180deg, #ffffff 15%, #faf5ff 100%)',
          borderRadius: '16px',
          padding: '1.25rem 0.75rem 1.15rem 0.75rem',
          border: '1px solid #ede4ff',
          boxShadow: '0 4px 14px rgba(139, 92, 246, 0.07), 0 1px 3px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.65rem'
        }}>
          {/* Top-Right Icon Badge */}
          <div style={{
            position: 'absolute',
            top: '11px',
            right: '11px',
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: '#f3e8ff',
            color: '#8b5cf6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(139, 92, 246, 0.08)'
          }}>
            <BarChart3 size={15} />
          </div>

          <CircleRing 
            percentage={overallPercentage} 
            color="#8b5cf6" 
            size={84} 
            strokeWidth={7.5} 
            fontSizeOverride={overallPercentage === 100 ? '1.1rem' : '1.25rem'}
            fontColorOverride="#4c1d95"
          />
          <div style={{ fontSize: '0.88rem', color: '#334155', fontWeight: 700, textAlign: 'center', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
            Overall Percentage
          </div>
        </div>

        {/* Metric 2: Test Average (Blue Theme - Light, Simple & Premium with top-right Badge) */}
        <div style={{
          position: 'relative',
          flex: '1.25 1 0',
          minWidth: 0,
          background: 'linear-gradient(180deg, #ffffff 15%, #f2f7ff 100%)',
          borderRadius: '16px',
          padding: '1.25rem 0.75rem 1.15rem 0.75rem',
          border: '1px solid #dce9fe',
          boxShadow: '0 4px 14px rgba(59, 130, 246, 0.07), 0 1px 3px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.65rem'
        }}>
          {/* Top-Right Icon Badge */}
          <div style={{
            position: 'absolute',
            top: '11px',
            right: '11px',
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: '#e0f2fe',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(37, 99, 235, 0.08)'
          }}>
            <FileCheck size={15} />
          </div>

          <CircleRing 
            percentage={testAverage} 
            color="#3b82f6" 
            size={84} 
            strokeWidth={7.5} 
            fontSizeOverride={testAverage === 100 ? '1.1rem' : '1.25rem'}
            fontColorOverride="#1e3a8a"
          />
          <div style={{ fontSize: '0.88rem', color: '#334155', fontWeight: 700, textAlign: 'center', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
            Test Average
          </div>
        </div>

        {/* Metric 3: Task Average (Green/Teal Theme - Light, Simple & Premium with top-right Badge) */}
        <div style={{
          position: 'relative',
          flex: '1.25 1 0',
          minWidth: 0,
          background: 'linear-gradient(180deg, #ffffff 15%, #f0faf6 100%)',
          borderRadius: '16px',
          padding: '1.25rem 0.75rem 1.15rem 0.75rem',
          border: '1px solid #d1f4e8',
          boxShadow: '0 4px 14px rgba(20, 184, 166, 0.07), 0 1px 3px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.65rem'
        }}>
          {/* Top-Right Icon Badge */}
          <div style={{
            position: 'absolute',
            top: '11px',
            right: '11px',
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: '#ccfbf1',
            color: '#0d9488',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(20, 184, 166, 0.08)'
          }}>
            <ClipboardCheck size={15} />
          </div>

          <CircleRing 
            percentage={taskAverage} 
            color="#14b8a6" 
            size={84} 
            strokeWidth={7.5} 
            fontSizeOverride={taskAverage === 100 ? '1.1rem' : '1.25rem'}
            fontColorOverride="#115e59"
          />
          <div style={{ fontSize: '0.88rem', color: '#334155', fontWeight: 700, textAlign: 'center', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
            Task Average
          </div>
        </div>

        {/* Stat 1: Total Tests (Light, Simple & Premium with Circular Icon) */}
        <div style={{
          flex: '0.75 1 0',
          minWidth: 0,
          background: 'linear-gradient(180deg, #ffffff 15%, #f4f8ff 100%)',
          borderRadius: '16px',
          padding: '1.15rem 0.5rem',
          border: '1px solid #dce9fe',
          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.07), 0 1px 3px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: '#e0f2fe',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.45rem',
            flexShrink: 0
          }}>
            <FileStack size={20} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1e40af', lineHeight: 1, letterSpacing: '-0.02em' }}>{totalTestsCount}</div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.35rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>Total Tests</div>
        </div>
        
        {/* Stat 2: Active Tests (Light, Simple & Premium with Circular Icon) */}
        <div style={{
          flex: '0.75 1 0',
          minWidth: 0,
          background: 'linear-gradient(180deg, #ffffff 15%, #fffbf2 100%)',
          borderRadius: '16px',
          padding: '1.15rem 0.5rem',
          border: '1px solid #fee6c7',
          boxShadow: '0 4px 14px rgba(245, 158, 11, 0.07), 0 1px 3px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Outfit', sans-serif"
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: '#ffedd5',
            color: '#ea580c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.45rem',
            flexShrink: 0
          }}>
            <Play size={18} fill="#ea580c" color="#ea580c" style={{ marginLeft: '2px' }} />
          </div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.95rem', fontWeight: 800, color: '#b45309', lineHeight: 1, letterSpacing: '-0.01em' }}>{activeTestsCount}</div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.82rem', color: '#64748b', marginTop: '0.35rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>Active Tests</div>
        </div>
        
        {/* Stat 3: Total Students (Light, Simple & Premium with Circular Icon) */}
        <div style={{
          flex: '0.75 1 0',
          minWidth: 0,
          background: 'linear-gradient(180deg, #ffffff 15%, #f1fbf5 100%)',
          borderRadius: '16px',
          padding: '1.15rem 0.5rem',
          border: '1px solid #ccf4dc',
          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.07), 0 1px 3px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Outfit', sans-serif"
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: '#dcfce7',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.45rem',
            flexShrink: 0
          }}>
            <Users size={19} />
          </div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.95rem', fontWeight: 800, color: '#047857', lineHeight: 1, letterSpacing: '-0.01em' }}>{totalStudents}</div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.82rem', color: '#64748b', marginTop: '0.35rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>Total Students</div>
        </div>
      </div>

      {/* Row 2: Dynamic Subject Groups (Matching Student Screenshot Layout & Color Themes) */}
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
            <h3 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '0.5rem' }}>No Groups Managed Yet</h3>
            <p>You have not created or managed any subject groups.</p>
            <button
              onClick={onManageGroups}
              style={{
                marginTop: '1rem',
                background: '#1d72fe',
                color: '#fff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Manage Groups
            </button>
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
          
          // Calculate dynamic group average
          let groupPct = 0;
          const totalItemsCount = groupTests.length + groupTasks.length;
          if (totalItemsCount > 0) {
            const testTotal = groupTests.reduce((a, t) => a + (Number(t.avg) || 0), 0);
            const taskTotal = groupTasks.reduce((a, t) => a + (Number(t.avg) || 0), 0);
            groupPct = Math.round((testTotal + taskTotal) / totalItemsCount);
          }

          // Build test list for the group
          const testItems = [
            ...groupTests.map(gt => ({
              id: gt.id, title: gt.title, score: Number(gt.avg) || 0, type: 'test'
            })),
            ...groupTasks.map(gt => ({
              id: gt.id, title: gt.title, score: Number(gt.avg) || 0, type: 'task'
            }))
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
                    size={72}
                    strokeWidth={6}
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
                        Assign a test or task to see it here
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
                  onClick={() => onCreateTest()}
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
                  <span>Add Test</span>
                  <Plus size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
