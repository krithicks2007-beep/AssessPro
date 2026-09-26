import React from 'react';
import {
  CheckCircle2,
  FileText,
  Clock,
  Laptop,
  Cpu,
  Settings,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import CircleRing from '../shared/CircleRing';

/**
 * Student Dashboard Tab
 * Shows overall performance, group KPI rings, detailed group cards, and tests/tasks tables.
 */

const groupIcons = [Laptop, Cpu, Settings, Layers];
const groupColors = ['#1d72fe', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function Dashboard({
  groups,
  tests,
  studentSubmissions,
  studentName,
  studentDept,
  studentYear,
  overallScore,
  testsCompletedCount,
  tasksCompletedCount,
  pendingCount,
  isDemoMaster,
  demoBenchmarks,
  onNavigateToTests
}) {
  return (
    <div className="dashboard-content">
      {/* Fresh Account Greeting Banner if 0 tests completed */}
      {testsCompletedCount === 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: '1px solid #bfdbfe',
          borderRadius: '16px',
          padding: '1.25rem 1.75rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(29, 114, 254, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#1d72fe',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(29, 114, 254, 0.3)'
            }}>
              <Sparkles size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e3a8a', margin: '0 0 0.2rem' }}>
                Welcome, {studentName.split(' ')[0]}! Your Personal Assessment Dashboard is Active.
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#1e40af', margin: 0 }}>
                Department: <strong>{studentDept}</strong> &bull; {studentYear}. Launch a test to start building your verified academic track record.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToTests}
            style={{
              padding: '0.65rem 1.15rem',
              borderRadius: '10px',
              background: '#1d72fe',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 12px rgba(29, 114, 254, 0.25)',
              whiteSpace: 'nowrap'
            }}
          >
            <span>View Tests</span>
            <ArrowRight size={15} />
          </button>
        </div>
      )}

      {/* Row 1: Top Performance Metrics & Dynamic Group Rings */}
      <div className="student-top-cards" style={{ gridTemplateColumns: `1.3fr repeat(${Math.max(groups.length, 3)}, 1fr)` }}>
        {/* Overall Performance Ring */}
        <div className="overall-card">
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#111827', marginBottom: '0.65rem' }}>
              Overall Performance
            </div>
            <CircleRing percentage={overallScore} color="#1d72fe" size={84} strokeWidth={8} />
            <div style={{ fontSize: '0.72rem', color: '#6b7280', textAlign: 'center', marginTop: '0.35rem' }}>
              Overall
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', borderLeft: '1px solid #f1f5f9', paddingLeft: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
              <CheckCircle2 size={16} color="#10b981" />
              <span style={{ fontWeight: 700, color: '#111827' }}>{testsCompletedCount}</span>
              <span style={{ color: '#6b7280' }}>Tests Completed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
              <FileText size={16} color="#3b82f6" />
              <span style={{ fontWeight: 700, color: '#111827' }}>{tasksCompletedCount}</span>
              <span style={{ color: '#6b7280' }}>Tasks Completed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
              <Clock size={16} color="#f59e0b" />
              <span style={{ fontWeight: 700, color: '#111827' }}>{pendingCount}</span>
              <span style={{ color: '#6b7280' }}>Pending</span>
            </div>
          </div>
        </div>

        {/* Group Rings */}
        {groups.map((group, idx) => {
          const ringColor = group.color || groupColors[idx % groupColors.length];
          const IconComp = groupIcons[idx % groupIcons.length] || Laptop;

          const groupPct = isDemoMaster
            ? demoBenchmarks[idx % demoBenchmarks.length]
            : (() => {
                const groupTests = tests.filter(t => t.group_id === group.id);
                const groupSubs = studentSubmissions.filter(s => groupTests.some(gt => gt.id === s.test_id));
                return groupSubs.length > 0
                  ? Math.round(groupSubs.reduce((a, s) => a + Number(s.percentage || 0), 0) / groupSubs.length)
                  : 0;
              })();

          return (
            <div key={group.id} className="student-group-kpi">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                <IconComp size={16} color={ringColor} />
                <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Group {group.group_number || idx + 1}</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px' }}>
                {group.name}
              </div>
              <CircleRing percentage={groupPct} color={ringColor} />
              <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                {isDemoMaster ? 'Tests 4/4  |  Tasks 4/4' : `Tests ${studentSubmissions.filter(s => tests.filter(t => t.group_id === group.id).some(gt => gt.id === s.test_id)).length}/${Math.max(tests.filter(t => t.group_id === group.id).length, 1)}`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2: Detailed Group Performance Cards */}
      <div className="student-mid-grid" style={{ gridTemplateColumns: `repeat(${Math.min(groups.length, 3)}, 1fr)` }}>
        {groups.map((group, idx) => {
          const ringColor = group.color || groupColors[idx % groupColors.length];
          const IconComp = groupIcons[idx % groupIcons.length] || Laptop;
          const demoPct = demoBenchmarks[idx % demoBenchmarks.length];

          if (isDemoMaster) {
            return (
              <div key={group.id} className="student-group-card">
                <div className="group-card-top">
                  <div className="group-card-title">
                    <IconComp size={18} color={ringColor} />
                    <span title={group.name}>Group {group.group_number || idx + 1} &bull; {group.name}</span>
                  </div>
                  <span className="group-pct-large" style={{ color: ringColor }}>{demoPct}%</span>
                </div>
                <div className="sub-metrics-row">
                  <span>📄 Tests <strong>{demoPct + 3}%</strong></span>
                  <span>✅ Tasks <strong>{demoPct - 3}%</strong></span>
                </div>
                <div className="mini-bar-chart">
                  <div className="mini-bar-col">
                    <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>{demoPct + 5}%</span>
                    <div className="mini-bar-fill" style={{ height: `${demoPct + 5}%`, background: ringColor }} />
                    <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>Test 1</span>
                  </div>
                  <div className="mini-bar-col">
                    <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>{demoPct - 2}%</span>
                    <div className="mini-bar-fill" style={{ height: `${demoPct - 2}%`, background: ringColor }} />
                    <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>Test 2</span>
                  </div>
                  <div className="mini-bar-col">
                    <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>{demoPct - 8}%</span>
                    <div className="mini-bar-fill" style={{ height: `${demoPct - 8}%`, background: ringColor }} />
                    <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>Test 3</span>
                  </div>
                  <div className="mini-bar-col">
                    <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>{demoPct + 8}%</span>
                    <div className="mini-bar-fill" style={{ height: `${demoPct + 8}%`, background: ringColor }} />
                    <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>Test 4</span>
                  </div>
                </div>
              </div>
            );
          }

          // Regular student real view
          const groupTests = tests.filter(t => t.group_id === group.id);
          const groupSubs = studentSubmissions.filter(s => groupTests.some(gt => gt.id === s.test_id));
          const groupPct = groupSubs.length > 0
            ? Math.round(groupSubs.reduce((a, s) => a + Number(s.percentage || 0), 0) / groupSubs.length)
            : 0;

          return (
            <div key={group.id} className="student-group-card">
              <div className="group-card-top">
                <div className="group-card-title">
                  <IconComp size={18} color={ringColor} />
                  <span title={group.name}>Group {group.group_number || idx + 1} &bull; {group.name}</span>
                </div>
                <span className="group-pct-large" style={{ color: ringColor }}>{groupPct}%</span>
              </div>
              <div className="sub-metrics-row">
                <span>📄 Tests <strong>{groupSubs.length} completed</strong></span>
                <span>✅ Tasks <strong>0 completed</strong></span>
              </div>
              <div style={{ padding: '0.75rem 0 0.25rem', fontSize: '0.78rem', color: '#64748b' }}>
                {groupSubs.length === 0 ? (
                  <span>No completed assessments in this group.</span>
                ) : (
                  <span>Average Score: <strong style={{ color: ringColor }}>{groupPct}%</strong> across {groupSubs.length} test(s)</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 3: Tests & Tasks Tables for Each Group */}
      <div className="student-tables-grid" style={{ gridTemplateColumns: `repeat(${Math.min(groups.length, 3)}, 1fr)` }}>
        {groups.map((group, idx) => {
          const demoPct = demoBenchmarks[idx % demoBenchmarks.length];

          if (isDemoMaster) {
            return (
              <div key={group.id}>
                <div className="student-table-box">
                  <div className="table-box-header">
                    <span>Group {group.group_number || idx + 1} &ndash; Tests</span>
                    <span className="table-box-avg">Average: <strong>{demoPct + 3}%</strong></span>
                  </div>
                  <div className="item-row">
                    <span className="item-left">1. Module Fundamentals</span>
                    <span className="item-right"><span className="score-badge">{demoPct + 7}%</span><CheckCircle2 size={15} className="check-green" /></span>
                  </div>
                  <div className="item-row">
                    <span className="item-left">2. Core Concepts</span>
                    <span className="item-right"><span className="score-badge">{demoPct}%</span><CheckCircle2 size={15} className="check-green" /></span>
                  </div>
                  <div className="item-row">
                    <span className="item-left">3. Applied Analysis</span>
                    <span className="item-right"><span className="score-badge">{demoPct - 7}%</span><CheckCircle2 size={15} className="check-green" /></span>
                  </div>
                  <div className="item-row">
                    <span className="item-left">4. Problem Solving</span>
                    <span className="item-right"><span className="score-badge">{demoPct + 10}%</span><CheckCircle2 size={15} className="check-green" /></span>
                  </div>
                </div>

                <div className="student-table-box">
                  <div className="table-box-header">
                    <span>Group {group.group_number || idx + 1} &ndash; Tasks</span>
                    <span className="table-box-avg">Average: <strong>{demoPct - 3}%</strong></span>
                  </div>
                  <div className="item-row">
                    <span className="item-left">1. Practical Lab Demo</span>
                    <span className="item-right"><span className="score-badge">{demoPct - 2}%</span><CheckCircle2 size={15} className="check-green" /></span>
                  </div>
                  <div className="item-row">
                    <span className="item-left">2. Mini Project</span>
                    <span className="item-right"><span className="score-badge">{demoPct + 3}%</span><CheckCircle2 size={15} className="check-green" /></span>
                  </div>
                  <div className="item-row">
                    <span className="item-left">3. Assignment Report</span>
                    <span className="item-right"><span className="score-badge">{demoPct - 5}%</span><CheckCircle2 size={15} className="check-green" /></span>
                  </div>
                  <div className="item-row">
                    <span className="item-left">4. Capstone Exercise</span>
                    <span className="item-right"><span className="score-badge">{demoPct + 5}%</span><CheckCircle2 size={15} className="check-green" /></span>
                  </div>
                </div>
              </div>
            );
          }

          // Regular student real view
          const groupTests = tests.filter(t => t.group_id === group.id);
          const groupSubs = studentSubmissions.filter(s => groupTests.some(gt => gt.id === s.test_id));
          const groupPct = groupSubs.length > 0
            ? Math.round(groupSubs.reduce((a, s) => a + Number(s.percentage || 0), 0) / groupSubs.length)
            : 0;

          return (
            <div key={group.id}>
              <div className="student-table-box">
                <div className="table-box-header">
                  <span>Group {group.group_number || idx + 1} &ndash; Tests</span>
                  <span className="table-box-avg">Average: <strong>{groupPct}%</strong></span>
                </div>
                {groupTests.length === 0 ? (
                  <div style={{ padding: '1rem', fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center' }}>
                    No tests scheduled in this group
                  </div>
                ) : (
                  groupTests.slice(0, 4).map((gt, tIdx) => {
                    const sub = groupSubs.find(s => s.test_id === gt.id);
                    
                    let attendanceLabel = null;
                    let attendanceColor = '#94a3b8';
                    let attendanceBg = '#f1f5f9';

                    if (sub) {
                      const startMs = new Date(gt.start_time).getTime();
                      const subMs = new Date(sub.submitted_at).getTime();
                      const activeTimeMs = (sub.time_taken_seconds || 0) * 1000;
                      const joinedLateMins = Math.max(0, Math.floor(((subMs - startMs) - activeTimeMs) / 60000));
                      
                      if (joinedLateMins >= 1) {
                        attendanceLabel = `Late (${joinedLateMins}m)`;
                        attendanceColor = '#d97706';
                        attendanceBg = '#fef3c7';
                      } else {
                        attendanceLabel = 'On Time';
                        attendanceColor = '#15803d';
                        attendanceBg = '#dcfce7';
                      }
                    } else if (gt.end_time && new Date(gt.end_time).getTime() < Date.now()) {
                      attendanceLabel = 'Absent';
                      attendanceColor = '#dc2626';
                      attendanceBg = '#fef2f2';
                    }

                    return (
                      <div key={gt.id || tIdx} className="item-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span className="item-left" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '1rem' }}>
                          {tIdx + 1}. {gt.title}
                        </span>
                        <div className="item-right" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                          {attendanceLabel && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '12px', background: attendanceBg, color: attendanceColor }}>
                              {attendanceLabel}
                            </span>
                          )}
                          {sub ? (
                            <>
                              <span className="score-badge" style={{ background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                                {sub.percentage}%
                              </span>
                              <CheckCircle2 size={15} className="check-green" />
                            </>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 600 }}>
                              {attendanceLabel === 'Absent' ? 'Missed' : 'Pending'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
