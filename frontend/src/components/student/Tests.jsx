import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Lock,
  Layers,
  Search
} from 'lucide-react';

/**
 * Student Tests Tab
 * Shows scheduled assessments organized strictly by Group in ascending order (Group 1, Group 2, Group 3...)
 * with live countdown, status badges, and test launch buttons.
 */
export default function Tests({
  tests = [],
  groups = [],
  studentSubmissions = [],
  currentTime,
  onLaunchTest
}) {
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Resolve group details accurately
  const resolveGroup = (test) => {
    if (test.groups && (test.groups.group_number !== undefined || test.groups.name)) {
      return {
        id: String(test.groups.id || test.group_id || 'unknown'),
        name: test.groups.name || 'Core',
        group_number: Number(test.groups.group_number || test.group_number) || 1,
        color: test.groups.color || '#1d72fe',
        category: test.groups.category || ''
      };
    }
    if (test.group_id && groups.length > 0) {
      const match = groups.find(g => String(g.id) === String(test.group_id));
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
    const num = Number(test.group_number);
    return {
      id: String(test.group_id || 'general'),
      name: test.group_name || (num ? `Group ${num}` : 'General / Core'),
      group_number: num || 9999,
      color: '#1d72fe',
      category: ''
    };
  };

  // Filter tests based on search and selected group filter
  const filteredTests = tests.filter(test => {
    const grp = resolveGroup(test);
    const matchesSearch = (test.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          grp.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedGroupFilter !== 'all' && String(grp.id) !== String(selectedGroupFilter) && String(grp.group_number) !== String(selectedGroupFilter)) {
      return false;
    }

    return true;
  });

  // Group tests sequentially: Group 1, Group 2, Group 3, Group 4...
  const groupedTestsMap = new Map();

  filteredTests.forEach(test => {
    const grp = resolveGroup(test);
    const key = grp.id || `group-${grp.group_number}`;
    if (!groupedTestsMap.has(key)) {
      groupedTestsMap.set(key, {
        group: grp,
        tests: []
      });
    }
    groupedTestsMap.get(key).tests.push(test);
  });

  // Sort groups in ascending order: Group 1, Group 2, Group 3...
  const sortedGroupSections = Array.from(groupedTestsMap.values()).sort((a, b) => {
    return a.group.group_number - b.group.group_number;
  });

  // Available groups for quick filter selector
  const availableGroupsMap = new Map();
  tests.forEach(t => {
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

  const formatCountdown = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="dashboard-content student-tests-container">
      {/* Top Header Card */}
      <div style={{
        background: '#ffffff',
        padding: '1.25rem 1.75rem',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        marginBottom: '1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ flex: '1 1 280px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Scheduled Assessments & Tests
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            Assessments organized sequentially by Group. Check timings, live countdowns, and launch your tests.
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
          {tests.length} Total Tests
        </div>
      </div>

      {/* Group Navigation Bar & Search */}
      {tests.length > 0 && (
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
              All Groups ({tests.length})
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
              placeholder="Search tests..."
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

      {/* Tests Grouped By Group Number */}
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
            <Clock size={28} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem' }}>
            {tests.length === 0 ? 'No Assessments Scheduled Yet' : 'No Tests Match Selected Group / Filter'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>
            {tests.length === 0
              ? 'There are currently no active or upcoming tests scheduled for your department. Once your faculty publishes a test, it will appear here.'
              : 'Try selecting "All Groups" or clearing your search.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {sortedGroupSections.map(section => {
            const grp = section.group;
            const sectionTests = section.tests;

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
                    {sectionTests.length} {sectionTests.length === 1 ? 'Test' : 'Tests'}
                  </span>
                </div>

                {/* Grid of Test Cards for this Group */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                  {sectionTests.map(test => {
                    const submission = studentSubmissions.find(s => 
                      (s.test_id && String(s.test_id).trim() === String(test.id).trim()) ||
                      (s.test_title && test.title && s.test_title.trim().toLowerCase() === test.title.trim().toLowerCase())
                    );
                    const isCompleted = Boolean(submission && submission.status === 'completed');

                    const hasStartTime = Boolean(test.start_time);
                    const hasEndTime = Boolean(test.end_time);
                    const startTimeMs = hasStartTime ? new Date(test.start_time).getTime() : 0;
                    const endTimeMs = hasEndTime ? new Date(test.end_time).getTime() : Infinity;

                    const isUpcoming = hasStartTime && currentTime < startTimeMs;
                    const isExpired = hasEndTime && currentTime > endTimeMs;
                    const isOngoing = !isUpcoming && !isExpired;

                    const secondsUntilStart = Math.max(0, Math.floor((startTimeMs - currentTime) / 1000));

                    return (
                      <div key={test.id} style={{
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '16px',
                        padding: '1.35rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.25rem 0.65rem',
                              borderRadius: '20px',
                              background: isCompleted ? '#dcfce7' : isOngoing ? '#dbeafe' : isUpcoming ? '#fef3c7' : isExpired ? '#fef2f2' : '#f1f5f9',
                              color: isCompleted ? '#15803d' : isOngoing ? '#1d72fe' : isUpcoming ? '#d97706' : isExpired ? '#dc2626' : '#64748b',
                              border: isExpired && !isCompleted ? '1px solid #fecaca' : 'none'
                            }}>
                              {isCompleted ? 'Completed' : isUpcoming ? 'Scheduled' : isExpired ? 'Time Exceeded (0 Marks)' : 'Active Now'}
                            </span>
                            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                              {test.duration_minutes || 60} mins
                            </span>
                          </div>

                          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem', lineHeight: 1.35 }}>
                            {test.title}
                          </h3>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem' }}>
                            <span>Max Score: <strong>{test.max_score || 100}</strong></span>
                            <span>Questions: <strong>{test.questions?.length || 10}</strong></span>
                          </div>

                          {/* Scheduled Time Window */}
                          {(hasStartTime || hasEndTime) && (
                            <div style={{
                              background: isUpcoming ? '#fffbeb' : '#f8fafc',
                              border: isUpcoming ? '1px solid #fde68a' : '1px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '0.55rem 0.75rem',
                              fontSize: '0.74rem',
                              color: isUpcoming ? '#92400e' : '#64748b',
                              marginBottom: '1rem'
                            }}>
                              {hasStartTime && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: hasEndTime ? '0.2rem' : 0 }}>
                                  <Clock size={12} color={isUpcoming ? '#d97706' : '#64748b'} />
                                  <span>Starts: <strong>{new Date(test.start_time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</strong></span>
                                </div>
                              )}
                              {hasEndTime && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <AlertCircle size={12} color="#64748b" />
                                  <span>Closes: <strong>{new Date(test.end_time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</strong></span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        {isCompleted ? (
                          <div style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '10px',
                            padding: '0.65rem 0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#16a34a', fontSize: '0.82rem', fontWeight: 700 }}>
                              <CheckCircle2 size={16} />
                              <span>Submitted</span>
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#15803d' }}>
                              {submission.score} / {submission.max_score} ({submission.percentage != null ? Math.round(Number(submission.percentage)) : (submission.max_score > 0 ? Math.round((Number(submission.score) / Number(submission.max_score)) * 100) : 0)}%)
                            </span>
                          </div>
                        ) : isUpcoming ? (
                          <button
                            disabled
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '10px',
                              border: '1px solid #fde68a',
                              background: '#fffbeb',
                              color: '#b45309',
                              fontSize: '0.84rem',
                              fontWeight: 700,
                              cursor: 'not-allowed',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            <Lock size={15} />
                            <span>Opens in {formatCountdown(secondsUntilStart)}</span>
                          </button>
                        ) : isExpired ? (
                          <div style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '10px',
                            padding: '0.65rem 0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#dc2626', fontSize: '0.82rem', fontWeight: 700 }}>
                              <AlertCircle size={15} />
                              <span>Time Exceeded &bull; Scored 0</span>
                            </div>
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#b91c1c' }}>
                              0 / {test.max_score || 100} (0%)
                            </span>
                          </div>
                        ) : (test.allow_latecomers === false && currentTime > startTimeMs) ? (
                          <button
                            disabled
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '10px',
                              border: '1px solid #fca5a5',
                              background: '#fef2f2',
                              color: '#dc2626',
                              fontSize: '0.84rem',
                              fontWeight: 700,
                              cursor: 'not-allowed',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            <AlertCircle size={15} />
                            <span>Late Entry Not Allowed</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onLaunchTest(test)}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '10px',
                              border: 'none',
                              background: '#1d72fe',
                              color: '#ffffff',
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem',
                              boxShadow: '0 4px 12px rgba(29, 114, 254, 0.25)'
                            }}
                          >
                            <Play size={16} fill="#ffffff" />
                            <span>Launch Test</span>
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
