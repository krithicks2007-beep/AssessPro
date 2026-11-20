import React, { useState, useEffect, useRef } from 'react';
import { Download, FileText, CheckSquare, Loader, X, ChevronRight } from 'lucide-react';
import { getSupabaseClient } from '../../supabaseClient';
import api from '../../api';
import * as XLSX from 'xlsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveGroupNumber(item, groups) {
  if (!item) return 9999;
  const grp = groups.find(g => String(g.id) === String(item.group_id));
  return grp?.group_number ?? 9999;
}

function sortByGroup(items, groups) {
  return [...items].sort((a, b) => resolveGroupNumber(a, groups) - resolveGroupNumber(b, groups));
}

function getGroupName(item, groups) {
  const grp = groups.find(g => String(g.id) === String(item.group_id));
  return grp ? `Group ${grp.group_number}: ${grp.name}` : 'Unknown Group';
}

// studentRegMap: Map<id_or_email, reg_no> — maps student id (UUID) or email (lowercase) to real reg_no
function resolveTestStudent(sub, studentRegMap = new Map()) {
  const email = (sub.student_email || sub.email || '').toLowerCase().trim();
  const name = sub.student_name || email.split('@')[0].replace(/\./g, ' ').toUpperCase() || 'Student';
  // Priority: student_id lookup > email lookup > sub.student_regno > blank
  const reg = (sub.student_id ? studentRegMap.get(sub.student_id) : null)
    || (email ? studentRegMap.get(email) : null)
    || sub.student_regno
    || '';
  const pct = sub.percentage != null
    ? Math.round(Number(sub.percentage))
    : (sub.max_score > 0 ? Math.round((Number(sub.score) / Number(sub.max_score)) * 100) : 0);
  return { name, reg, email, mark: pct + '%' };
}

function resolveTaskStudent(sub, maxScore, studentRegMap = new Map()) {
  const email = (sub.users?.mailid || sub.users?.email || '').toLowerCase().trim();
  const name = sub.users?.name || email.split('@')[0].replace(/\./g, ' ').toUpperCase() || 'Student';
  // Priority: student_id lookup > sub.users?.id lookup > email lookup > users.reg_no > blank
  const reg = (sub.student_id ? studentRegMap.get(sub.student_id) : null)
    || (sub.users?.id ? studentRegMap.get(sub.users.id) : null)
    || (email ? studentRegMap.get(email) : null)
    || sub.users?.reg_no
    || '';
  const max = maxScore || 100;
  const mark = sub.score != null ? (max > 0 ? Math.round((Number(sub.score) / max) * 100) : 0) + '%' : 'Ungraded';
  return { name, reg, email, mark };
}

// ─── Excel generation ─────────────────────────────────────────────────────────

function buildExcelWorkbook(selectedTests, selectedTasks, testSubmissions, taskSubmissions, groups, mode, emailRegMap = new Map()) {
  const wb = XLSX.utils.book_new();

  // ── TESTS SHEET ──────────────────────────────────────────────────────────────
  if ((mode === 'all' || mode === 'tests') && selectedTests.length > 0) {
    const rows = [
      ['TESTS COMPLETION REPORT', '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['Group', 'Test Name', 'Total Submissions', 'Student Name', 'Reg No', 'Mark'],
    ];

    sortByGroup(selectedTests, groups).forEach(test => {
      const subs = testSubmissions.filter(s => String(s.test_id) === String(test.id));
      const grpName = getGroupName(test, groups);

      // Summary row
      rows.push([grpName, test.title || 'Untitled', subs.length, '', '', '']);

      // Student rows
      subs.forEach(sub => {
        const { name, reg, mark } = resolveTestStudent(sub, emailRegMap);
        rows.push(['', '', '', name, reg, mark]);
      });

      rows.push(['', '', '', '', '', '']); // blank spacer
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Column widths
    ws['!cols'] = [{ wch: 28 }, { wch: 32 }, { wch: 20 }, { wch: 26 }, { wch: 16 }, { wch: 12 }];

    // Style header row (row index 0 = A1)
    const headerCells = ['A1'];
    headerCells.forEach(cell => {
      if (ws[cell]) ws[cell].s = { font: { bold: true, sz: 13 }, fill: { fgColor: { rgb: 'EFF6FF' } } };
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Tests');
  }

  // ── TASKS SHEET ──────────────────────────────────────────────────────────────
  if ((mode === 'all' || mode === 'tasks') && selectedTasks.length > 0) {
    const rows = [
      ['TASKS COMPLETION REPORT', '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['Group', 'Task Name', 'Total Submissions', 'Student Name', 'Reg No', 'Mark'],
    ];

    sortByGroup(selectedTasks, groups).forEach(task => {
      const subs = taskSubmissions.filter(s => String(s.task_id) === String(task.id));
      const grpName = getGroupName(task, groups);

      rows.push([grpName, task.title || 'Untitled', subs.length, '', '', '']);

      subs.forEach(sub => {
        const { name, reg, mark } = resolveTaskStudent(sub, task.max_score, emailRegMap);
        rows.push(['', '', '', name, reg, mark]);
      });

      rows.push(['', '', '', '', '', '']);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 28 }, { wch: 32 }, { wch: 20 }, { wch: 26 }, { wch: 16 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
  }

  return wb;
}

function downloadWorkbook(wb, filename) {
  XLSX.writeFile(wb, filename + '.xlsx');
}

// ─── Download Modal ───────────────────────────────────────────────────────────

function DownloadModal({ onClose, tests, tasks, groups, testSubmissions, taskSubmissions, emailRegMap }) {
  // step: 'pick' | 'customize'
  const [step, setStep] = useState('pick');
  const [mode, setMode] = useState(null); // 'all' | 'tests' | 'tasks' | 'customize'
  const [customizeTab, setCustomizeTab] = useState('tests'); // which side to show in customize
  const [selectedTestIds, setSelectedTestIds] = useState(new Set());
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const overlayRef = useRef(null);

  const sortedTests = sortByGroup(tests, groups);
  const sortedTasks = sortByGroup(tasks, groups);

  function toggleTest(id) {
    setSelectedTestIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function toggleTask(id) {
    setSelectedTaskIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function selectAll(type) {
    if (type === 'tests') setSelectedTestIds(new Set(sortedTests.map(t => t.id)));
    else setSelectedTaskIds(new Set(sortedTasks.map(t => t.id)));
  }

  function clearAll(type) {
    if (type === 'tests') setSelectedTestIds(new Set());
    else setSelectedTaskIds(new Set());
  }

  function handleQuickDownload(m) {
    const selTests = m === 'tasks' ? [] : sortedTests;
    const selTasks = m === 'tests' ? [] : sortedTasks;
    const wb = buildExcelWorkbook(selTests, selTasks, testSubmissions, taskSubmissions, groups, m, emailRegMap);
    const hasSheets = wb.SheetNames.length > 0;
    if (!hasSheets) { alert('No data available to export.'); return; }
    downloadWorkbook(wb, `AssessPro_${m === 'all' ? 'All' : m === 'tests' ? 'Tests' : 'Tasks'}_Report`);
    onClose();
  }

  function handleCustomizeDownload() {
    const selTests = sortedTests.filter(t => selectedTestIds.has(t.id));
    const selTasks = sortedTasks.filter(t => selectedTaskIds.has(t.id));
    if (selTests.length === 0 && selTasks.length === 0) {
      alert('Please select at least one test or task to export.');
      return;
    }
    const mode = selTests.length > 0 && selTasks.length > 0 ? 'all' : selTests.length > 0 ? 'tests' : 'tasks';
    const wb = buildExcelWorkbook(selTests, selTasks, testSubmissions, taskSubmissions, groups, mode, emailRegMap);
    downloadWorkbook(wb, 'AssessPro_Custom_Report');
    onClose();
  }

  // Group items for display
  function groupedItems(items) {
    const map = new Map();
    items.forEach(item => {
      const grp = groups.find(g => String(g.id) === String(item.group_id));
      const grpLabel = grp ? `Group ${grp.group_number}: ${grp.name}` : 'Unknown Group';
      const grpNum = grp?.group_number ?? 9999;
      if (!map.has(grpLabel)) map.set(grpLabel, { label: grpLabel, num: grpNum, items: [] });
      map.get(grpLabel).items.push(item);
    });
    return Array.from(map.values()).sort((a, b) => a.num - b.num);
  }

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '1rem'
      }}
    >
      <div style={{
        background: '#ffffff', borderRadius: '16px',
        width: '100%', maxWidth: step === 'customize' ? '680px' : '480px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.1rem 1.4rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
              {step === 'pick' ? 'Download Report' : 'Customize Export'}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
              {step === 'pick'
                ? 'Choose what to include in the Excel file.'
                : 'Select the specific tests and tasks to export.'}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px',
            cursor: 'pointer', color: '#475569', display: 'flex',
            alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px'
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* ─ STEP 1: Pick mode ─ */}
          {step === 'pick' && (
            <div style={{ padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { key: 'all', label: 'All', desc: 'Tests + Tasks — all submissions in one file.' },
                { key: 'tests', label: 'Tests Only', desc: 'Only test completion data.' },
                { key: 'tasks', label: 'Tasks Only', desc: 'Only task submission data.' },
                { key: 'customize', label: 'Customize', desc: 'Hand-pick specific tests or tasks.' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => {
                    if (opt.key === 'customize') { setStep('customize'); return; }
                    handleQuickDownload(opt.key);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.9rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    transition: 'border-color 0.15s, background 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', marginBottom: '2px' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{opt.desc}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569', fontSize: '0.78rem', fontWeight: 600, flexShrink: 0 }}>
                    {opt.key === 'customize' ? (
                      <ChevronRight size={16} />
                    ) : (
                      <Download size={15} />
                    )}
                    {opt.key !== 'customize' && 'Download'}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ─ STEP 2: Customize ─ */}
          {step === 'customize' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Sub-tab switcher */}
              <div style={{
                display: 'flex', gap: '0',
                borderBottom: '1px solid #f1f5f9',
                padding: '0 1.4rem'
              }}>
                {['tests', 'tasks'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setCustomizeTab(tab)}
                    style={{
                      background: 'none', border: 'none',
                      padding: '0.75rem 1rem',
                      fontWeight: 700, fontSize: '0.83rem',
                      cursor: 'pointer',
                      color: customizeTab === tab ? '#1d72fe' : '#64748b',
                      borderBottom: customizeTab === tab ? '2px solid #1d72fe' : '2px solid transparent',
                      marginBottom: '-1px'
                    }}
                  >
                    {tab === 'tests' ? <><FileText size={14} style={{ marginRight: 5, verticalAlign: -2 }} />Tests {selectedTestIds.size > 0 ? `(${selectedTestIds.size})` : ''}</>
                      : <><CheckSquare size={14} style={{ marginRight: 5, verticalAlign: -2 }} />Tasks {selectedTaskIds.size > 0 ? `(${selectedTaskIds.size})` : ''}</>}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div style={{ padding: '1rem 1.4rem', flex: 1, overflowY: 'auto' }}>
                {customizeTab === 'tests' && (
                  <CustomizePanel
                    items={sortedTests}
                    selectedIds={selectedTestIds}
                    onToggle={toggleTest}
                    onSelectAll={() => selectAll('tests')}
                    onClearAll={() => clearAll('tests')}
                    groups={groups}
                    groupedFn={groupedItems}
                    type="test"
                    submissions={testSubmissions}
                    subsField="test_id"
                  />
                )}
                {customizeTab === 'tasks' && (
                  <CustomizePanel
                    items={sortedTasks}
                    selectedIds={selectedTaskIds}
                    onToggle={toggleTask}
                    onSelectAll={() => selectAll('tasks')}
                    onClearAll={() => clearAll('tasks')}
                    groups={groups}
                    groupedFn={groupedItems}
                    type="task"
                    submissions={taskSubmissions}
                    subsField="task_id"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'customize' && (
          <div style={{
            padding: '0.9rem 1.4rem',
            borderTop: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem'
          }}>
            <button
              onClick={() => setStep('pick')}
              style={{
                background: 'none', border: '1px solid #e2e8f0',
                borderRadius: '8px', padding: '0.5rem 1rem',
                fontSize: '0.82rem', fontWeight: 600, color: '#475569', cursor: 'pointer'
              }}
            >
              ← Back
            </button>
            <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
              {selectedTestIds.size} test{selectedTestIds.size !== 1 ? 's' : ''} · {selectedTaskIds.size} task{selectedTaskIds.size !== 1 ? 's' : ''} selected
            </div>
            <button
              onClick={handleCustomizeDownload}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                background: '#1d72fe', color: '#ffffff',
                border: 'none', borderRadius: '8px',
                padding: '0.55rem 1.1rem', fontSize: '0.84rem', fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Download size={15} />
              Export Excel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CustomizePanel({ items, selectedIds, onToggle, onSelectAll, onClearAll, groups, groupedFn, type, submissions, subsField }) {
  const grouped = groupedFn(items);

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 0', fontSize: '0.85rem' }}>
        No {type}s available.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.85rem' }}>
        <button onClick={onSelectAll} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.3rem 0.7rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Select all</button>
        <button onClick={onClearAll} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.3rem 0.7rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Clear</button>
      </div>
      {grouped.map(grp => (
        <div key={grp.label} style={{ marginBottom: '1.1rem' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.45rem' }}>
            {grp.label}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {grp.items.map(item => {
              const count = submissions.filter(s => String(s[subsField]) === String(item.id)).length;
              const checked = selectedIds.has(item.id);
              return (
                <label
                  key={item.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                    padding: '0.6rem 0.8rem',
                    border: `1px solid ${checked ? '#bfdbfe' : '#e2e8f0'}`,
                    background: checked ? '#f0f7ff' : '#fafafa',
                    borderRadius: '8px', cursor: 'pointer',
                    transition: 'all 0.12s ease'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(item.id)}
                    style={{ width: '15px', height: '15px', accentColor: '#1d72fe', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title || 'Untitled'}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', background: '#f1f5f9', padding: '2px 7px', borderRadius: '20px', flexShrink: 0 }}>
                    {count} sub{count !== 1 ? 's' : ''}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Reports component ───────────────────────────────────────────────────

export default function Reports({ groups, tests, tasks }) {
  const [viewMode, setViewMode] = useState('tests');
  const [testSubmissions, setTestSubmissions] = useState([]);
  const [taskSubmissions, setTaskSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [emailRegMap, setEmailRegMap] = useState(new Map());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const testIds = tests.map(t => t.id);
        const taskIds = tasks.map(t => t.id);

        const [tSubsRes, tkSubsRes, studentsRes, usersRes] = await Promise.all([
          testIds.length > 0
            ? supabase.from('test_submissions').select('*').in('test_id', testIds)
            : Promise.resolve({ data: [] }),
          taskIds.length > 0
            ? supabase.from('task_submissions').select('*, users(*)').in('task_id', taskIds)
            : Promise.resolve({ data: [] }),
          supabase.from('students').select('id, reg_no'),
          supabase.from('users').select('id, mailid, name'),
        ]);

        const map = new Map();
        // 1. Map by student ID UUID from students table
        (studentsRes.data || []).forEach(s => {
          if (s.id && s.reg_no) {
            map.set(s.id, s.reg_no);
          }
        });

        // 2. Map by user email and name using users table matched by ID
        (usersRes.data || []).forEach(u => {
          const reg = map.get(u.id);
          if (u.mailid && reg) {
            map.set(u.mailid.toLowerCase().trim(), reg);
          }
          if (u.name && reg) {
            map.set(u.name.toLowerCase().trim(), reg);
          }
        });

        // 3. Complement with api.getAllStudents() if available
        try {
          const allStuds = await api.getAllStudents();
          if (Array.isArray(allStuds)) {
            allStuds.forEach(s => {
              if (s.reg_no) {
                if (s.id && !map.has(s.id)) map.set(s.id, s.reg_no);
                if (s.email && !map.has(s.email.toLowerCase().trim())) {
                  map.set(s.email.toLowerCase().trim(), s.reg_no);
                }
              }
            });
          }
        } catch (_apiErr) {
          console.warn('api.getAllStudents supplementary note:', _apiErr);
        }

        setEmailRegMap(map);

        setTestSubmissions(tSubsRes.data || []);
        setTaskSubmissions(tkSubsRes.data || []);
      } catch (err) {
        console.error('Error fetching reports data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tests, tasks]);

  const sortedGroups = [...groups].sort((a, b) => (a.group_number ?? 9999) - (b.group_number ?? 9999));

  return (
    <div className="dashboard-content">
      {/* Download modal */}
      {showDownloadModal && (
        <DownloadModal
          onClose={() => setShowDownloadModal(false)}
          tests={tests}
          tasks={tasks}
          groups={groups}
          testSubmissions={testSubmissions}
          taskSubmissions={taskSubmissions}
          emailRegMap={emailRegMap}
        />
      )}

      {/* Header bar */}
      <div style={{
        background: '#ffffff',
        padding: '1.1rem 1.5rem',
        borderRadius: '14px',
        border: '1px solid #e5e7eb',
        marginBottom: '1.35rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Performance Reports
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0 0' }}>
            View completion data per group and export to Excel.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* View toggle */}
          <div style={{
            display: 'flex', background: '#f1f5f9',
            padding: '0.3rem', borderRadius: '10px', gap: '0.25rem'
          }}>
            {['tests', 'tasks'].map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.42rem 1rem',
                  borderRadius: '7px', border: 'none',
                  background: viewMode === m ? '#ffffff' : 'transparent',
                  color: viewMode === m ? '#0f172a' : '#64748b',
                  fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                  boxShadow: viewMode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                {m === 'tests' ? <FileText size={15} /> : <CheckSquare size={15} />}
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {/* Download button */}
          <button
            onClick={() => setShowDownloadModal(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 1rem',
              background: '#0f172a', color: '#ffffff',
              border: 'none', borderRadius: '8px',
              fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
            }}
          >
            <Download size={15} />
            Download Report
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
          <Loader size={28} style={{ margin: '0 auto 0.75rem', display: 'block', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: '0.85rem' }}>Loading report data...</div>
        </div>
      ) : sortedGroups.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', fontSize: '0.88rem' }}>
          No groups found. Create a group first.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {sortedGroups.map(group => {
            const isTests = viewMode === 'tests';
            const groupItems = isTests
              ? tests.filter(t => String(t.group_id) === String(group.id))
              : tasks.filter(t => String(t.group_id) === String(group.id));

            if (groupItems.length === 0) return null;

            return (
              <div key={group.id} style={{
                background: '#ffffff', borderRadius: '14px',
                border: '1px solid #e2e8f0', overflow: 'hidden'
              }}>
                {/* Group header */}
                <div style={{
                  padding: '0.9rem 1.25rem',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                      Group {group.group_number}: {group.name}
                    </div>
                    {group.category && (
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '1px' }}>{group.category}</div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                    {groupItems.length} {isTests ? 'test' : 'task'}{groupItems.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Items list */}
                <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {groupItems.map(item => {
                    const subs = isTests
                      ? testSubmissions.filter(s => String(s.test_id) === String(item.id))
                      : taskSubmissions.filter(s => String(s.task_id) === String(item.id));

                    return (
                      <div key={item.id} style={{
                        border: '1px solid #f1f5f9', borderRadius: '10px',
                        padding: '0.85rem 1rem', background: '#fafafa'
                      }}>
                        {/* Item header */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          marginBottom: subs.length > 0 ? '0.75rem' : 0
                        }}>
                          {isTests
                            ? <FileText size={15} color="#1d72fe" style={{ flexShrink: 0 }} />
                            : <CheckSquare size={15} color="#14b8a6" style={{ flexShrink: 0 }} />}
                          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.title}
                          </span>
                          <span style={{
                            fontSize: '0.74rem', fontWeight: 700,
                            color: subs.length > 0 ? '#059669' : '#94a3b8',
                            background: subs.length > 0 ? '#ecfdf5' : '#f1f5f9',
                            padding: '2px 9px', borderRadius: '20px', flexShrink: 0
                          }}>
                            {subs.length} completed
                          </span>
                        </div>

                        {/* Student chips */}
                        {subs.length === 0 ? (
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            No submissions yet.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {subs.map(sub => {
                              let name, mark;
                              if (isTests) {
                                const r = resolveTestStudent(sub, emailRegMap);
                                name = r.name; mark = r.mark;
                              } else {
                                const r = resolveTaskStudent(sub, item.max_score, emailRegMap);
                                name = r.name; mark = r.mark;
                              }
                              return (
                                <div key={sub.id} style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                  background: '#ffffff', border: '1px solid #e2e8f0',
                                  borderRadius: '6px', padding: '0.28rem 0.65rem',
                                  fontSize: '0.76rem'
                                }}>
                                  <span style={{ color: '#1e293b', fontWeight: 600 }}>{name}</span>
                                  <span style={{ color: '#64748b' }}>·</span>
                                  <span style={{ color: isTests ? '#1d72fe' : '#059669', fontWeight: 700 }}>{mark}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
