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
  studentSubmissions = [],
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
  const displayOverallScore = overallScore;

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

        {/* Assigned Staff Notice (Requirement 5) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
              <span>Faculty Mentor: <strong>{assignedStaff.assigned_staff_name || assignedStaff.staffName}</strong></span>
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
              <span>No staff assigned yet &bull; Monitored by Department</span>
            </div>
          )}
        </div>
      </div>

      {/* Row 1: Top 4 KPI Metrics Cards (Matching Screenshot) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1.25rem',
        marginBottom: '1.75rem'
      }}>
        {/* Metric 1: Overall Performance (Purple Theme) */}
        <div style={{
          background: '#faf5ff',
          borderRadius: '16px',
          padding: '1.75rem 1.75rem',
          border: '1px solid #e9d5ff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem'
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            background: '#8b5cf6',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <BarChart2 size={28} />
          </div>
          <div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#4c1d95', lineHeight: 1.1 }}>
              {displayOverallScore}%
            </div>
            <div style={{ fontSize: '0.9rem', color: '#6d28d9', marginTop: '0.3rem', fontWeight: 600 }}>
              Overall Performance
            </div>
          </div>
        </div>

        {/* Metric 2: Total Tests (Blue Theme) */}
        <div style={{
          background: '#eff6ff',
          borderRadius: '16px',
          padding: '1.75rem 1.75rem',
          border: '1px solid #bfdbfe',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem'
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            background: '#1d72fe',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <FileText size={28} />
          </div>
          <div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1e3a8a', lineHeight: 1.1 }}>
              {totalTestsCount}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#1d4ed8', marginTop: '0.3rem', fontWeight: 600 }}>
              Total Tests
            </div>
          </div>
        </div>

        {/* Metric 3: Upcoming Tests (Orange Theme) */}
        <div style={{
          background: '#fff7ed',
          borderRadius: '16px',
          padding: '1.75rem 1.75rem',
          border: '1px solid #fed7aa',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem'
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            background: '#f59e0b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Hourglass size={28} />
          </div>
          <div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#78350f', lineHeight: 1.1 }}>
              {displayPendingCount}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#b45309', marginTop: '0.3rem', fontWeight: 600 }}>
              Upcoming Tests
            </div>
          </div>
        </div>

        {/* Metric 4: Completed Tests (Green Theme) */}
        <div style={{
          background: '#f0fdf4',
          borderRadius: '16px',
          padding: '1.75rem 1.75rem',
          border: '1px solid #bbf7d0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem'
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            background: '#10b981',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Check size={28} strokeWidth={3} />
          </div>
          <div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#064e3b', lineHeight: 1.1 }}>
              {displayCompletedCount}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#047857', marginTop: '0.3rem', fontWeight: 600 }}>
              Completed Tests
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

          // Find tests belonging to this group
          const groupTests = tests.filter(t => t.group_id === group.id);
          
          // Calculate dynamic group average if submissions exist
          let groupPct = 0;
          if (groupTests.length > 0) {
            const groupSubs = studentSubmissions.filter(s => groupTests.some(gt => gt.id === s.test_id));
            if (groupSubs.length > 0) {
              groupPct = Math.round(groupSubs.reduce((a, s) => a + Number(s.percentage || 0), 0) / groupSubs.length);
            }
          }

          // Build test list: use real group tests
          const testItems = groupTests.map((gt, tIdx) => {
            const sub = studentSubmissions.find(s => s.test_id === gt.id);
            const score = sub ? Number(sub.percentage || 0) : 0;
            return {
              id: gt.id,
              title: gt.title,
              score: score
            };
          });

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
                        No Active Tests
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                        Upcoming assessments will show here
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
                              <TestIcon size={15} color="#1d72fe" style={{ flexShrink: 0 }} />
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
