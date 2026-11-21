import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Download, 
  FileText, 
  CheckSquare, 
  Loader, 
  X, 
  ChevronRight,
  CheckCircle2,
  XCircle,
  Users,
  Cpu,
  FileDown,
  Layers
} from 'lucide-react';
import { getSupabaseClient } from '../../supabaseClient';
import api from '../../api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTablePlugin from 'jspdf-autotable';

// ─── PDF Helper ────────────────────────────────────────────────────────────────

function applyAutoTable(doc, options) {
  if (typeof autoTablePlugin === 'function') {
    autoTablePlugin(doc, options);
  } else if (autoTablePlugin?.default && typeof autoTablePlugin.default === 'function') {
    autoTablePlugin.default(doc, options);
  } else if (typeof doc.autoTable === 'function') {
    doc.autoTable(options);
  }
}

function generateGroupPDF({ group, groupItems, isTests, studentsData, summaryStats, type = 'detailed' }) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Institution & System Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // #0f172a
  doc.text('Bannari Amman Institute of Technology', 14, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // #64748b
  doc.text('AssessPro — Examination & Assessment Platform', 14, 22);

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 26, pageWidth - 14, 26);

  // Report Title
  const typeTitle = type === 'detailed' 
    ? 'Comprehensive Performance Report' 
    : type === 'cleared' 
    ? 'Cleared Students List' 
    : 'Not Cleared / Pending Students List';

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Group ${group.group_number}: ${group.name} — ${typeTitle}`, 14, 34);

  // Metadata / Summary subtitle
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const metaText = `Category: ${group.category || 'General'}  |  Type: ${isTests ? 'Tests' : 'Tasks'} (${groupItems.length} items)  |  Group Avg: ${summaryStats.groupPct}%  |  Date: ${dateStr}`;
  doc.text(metaText, 14, 40);

  // KPI summary badges in PDF
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(21, 128, 61); // green
  doc.text(`Total Cleared Completions: ${summaryStats.totalCleared}`, 14, 47);
  doc.setTextColor(185, 28, 28); // red
  doc.text(`Pending Students: ${summaryStats.notClearedCount}`, 90, 47);
  doc.setTextColor(15, 23, 42);
  doc.text(`Total Assigned: ${studentsData.length}`, 155, 47);

  // Filter students based on report type
  let filteredStudents = [...studentsData];
  if (type === 'cleared') {
    filteredStudents = filteredStudents.filter(s => s.clearedCount > 0);
  } else if (type === 'not_cleared') {
    filteredStudents = filteredStudents.filter(s => s.clearedCount < groupItems.length);
  }

  // Sort by Reg No ascending
  filteredStudents.sort((a, b) => (a.reg_no || '').localeCompare(b.reg_no || ''));

  // Build table data
  const head = [['S.No', 'Reg No', 'Student Name', 'Levels Cleared', 'Total Marks', 'Status']];
  const body = filteredStudents.map((s, idx) => {
    return [
      idx + 1,
      s.reg_no || '—',
      s.name,
      `${s.clearedCount} / ${groupItems.length}`,
      s.totalScore != null ? s.totalScore : '0',
      s.status
    ];
  });

  applyAutoTable(doc, {
    startY: 52,
    head: head,
    body: body,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
      cellPadding: 3.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 32, fontStyle: 'bold' },
      2: { cellWidth: 55 },
      3: { cellWidth: 26, halign: 'center' },
      4: { cellWidth: 24, halign: 'center' },
      5: { cellWidth: 30, halign: 'center' },
    },
    didParseCell: (data) => {
      // Color-code the status column
      if (data.section === 'body' && data.column.index === 5) {
        const val = String(data.cell.raw || '');
        if (val.startsWith('Cleared')) {
          data.cell.styles.textColor = [22, 101, 52]; // green
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [153, 27, 27]; // red
        }
      }
    }
  });

  const filePrefix = (group.name || 'Group').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${filePrefix}_${type === 'detailed' ? 'Detailed_Report' : type === 'cleared' ? 'Cleared_List' : 'Not_Cleared_List'}.pdf`);
}

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

function resolveTestStudent(sub, studentRegMap = new Map()) {
  const email = (sub.student_email || sub.email || '').toLowerCase().trim();
  const name = sub.student_name || email.split('@')[0].replace(/\./g, ' ').toUpperCase() || 'Student';
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

      rows.push([grpName, test.title || 'Untitled', subs.length, '', '', '']);

      subs.forEach(sub => {
        const { name, reg, mark } = resolveTestStudent(sub, emailRegMap);
        rows.push(['', '', '', name, reg, mark]);
      });

      rows.push(['', '', '', '', '', '']);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 28 }, { wch: 32 }, { wch: 20 }, { wch: 26 }, { wch: 16 }, { wch: 12 }];
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

// ─── Download Modal (Preserved Untouched) ──────────────────────────────────────

function DownloadModal({ onClose, tests, tasks, groups, testSubmissions, taskSubmissions, emailRegMap }) {
  const [step, setStep] = useState('pick');
  const [customizeTab, setCustomizeTab] = useState('tests');
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
                    {opt.key === 'customize' ? <ChevronRight size={16} /> : <Download size={15} />}
                    {opt.key !== 'customize' && 'Download'}
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 'customize' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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

// ─── Pastel row colors (matching screenshot style cleanly) ───────────────────
const ROW_COLORS = [
  '#f8fafc', // Row 0: Slate-50 / Clean off-white
  '#e0f2fe', // Row 1: Soft sky blue
  '#dcfce7', // Row 2: Soft mint green
  '#fef9c3', // Row 3: Soft pastel yellow
  '#ffe4e6', // Row 4: Soft pastel rose
  '#ede9fe', // Row 5: Soft pastel purple
  '#ffedd5', // Row 6: Soft pastel orange
];

// ─── Main Reports component ───────────────────────────────────────────────────

export default function Reports({ groups = [], tests = [], tasks = [] }) {
  const [viewMode, setViewMode] = useState('tasks'); // 'tasks' | 'tests'
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [testSubmissions, setTestSubmissions] = useState([]);
  const [taskSubmissions, setTaskSubmissions] = useState([]);
  const [allStudentsList, setAllStudentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [emailRegMap, setEmailRegMap] = useState(new Map());

  // Sort groups sequentially by group_number
  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      const numA = a.group_number ?? 9999;
      const numB = b.group_number ?? 9999;
      if (numA !== numB) return numA - numB;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [groups]);

  // Load submissions and students data
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
          supabase.from('students').select('*'),
          supabase.from('users').select('*'),
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

        // Build list of all students (62 students)
        const studentUsers = (usersRes.data || []).filter(u => 
          (u.UserType || u.usertype || '').toLowerCase() === 'student'
        );

        let mappedStudents = [];
        if (studentUsers.length > 0) {
          mappedStudents = studentUsers.map(u => {
            const cleanEmail = (u.mailid || u.email || '').toLowerCase().trim();
            const reg = map.get(u.id) || (cleanEmail ? map.get(cleanEmail) : null) || '—';
            return {
              id: u.id,
              name: u.name || (cleanEmail ? cleanEmail.split('@')[0].toUpperCase() : 'Student'),
              email: cleanEmail,
              reg_no: reg,
            };
          });
        } else if (studentsRes.data && studentsRes.data.length > 0) {
          mappedStudents = studentsRes.data.map(s => ({
            id: s.id,
            name: s.reg_no || 'Student',
            email: '',
            reg_no: s.reg_no || '—',
          }));
        }

        setAllStudentsList(mappedStudents);
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

  // Set default selected group on initial load or viewMode change
  const prevViewModeRef = useRef(viewMode);
  useEffect(() => {
    if (sortedGroups.length === 0) return;

    const viewModeChanged = prevViewModeRef.current !== viewMode;
    prevViewModeRef.current = viewMode;

    const exists = selectedGroupId && sortedGroups.some(g => String(g.id) === String(selectedGroupId));

    if (!exists) {
      // Initial mount or deleted group: pick first group that has items, or default to first group
      const firstWithItems = sortedGroups.find(g => {
        const count = viewMode === 'tests'
          ? tests.filter(t => String(t.group_id) === String(g.id)).length
          : tasks.filter(t => String(t.group_id) === String(g.id)).length;
        return count > 0;
      });
      setSelectedGroupId(firstWithItems ? firstWithItems.id : sortedGroups[0].id);
    } else if (viewModeChanged) {
      // If user switched subdivision tab and current group is empty in the new mode, switch to first with items
      const countInNewMode = viewMode === 'tests'
        ? tests.filter(t => String(t.group_id) === String(selectedGroupId)).length
        : tasks.filter(t => String(t.group_id) === String(selectedGroupId)).length;
      if (countInNewMode === 0) {
        const firstWithItems = sortedGroups.find(g => {
          const count = viewMode === 'tests'
            ? tests.filter(t => String(t.group_id) === String(g.id)).length
            : tasks.filter(t => String(t.group_id) === String(g.id)).length;
          return count > 0;
        });
        if (firstWithItems) {
          setSelectedGroupId(firstWithItems.id);
        }
      }
    }
  }, [viewMode, sortedGroups, tests, tasks]);

  const activeGroup = useMemo(() => {
    return sortedGroups.find(g => String(g.id) === String(selectedGroupId)) || sortedGroups[0] || null;
  }, [sortedGroups, selectedGroupId]);

  // Calculate items for active group
  const isTests = viewMode === 'tests';
  const groupItems = useMemo(() => {
    if (!activeGroup) return [];
    return isTests
      ? tests.filter(t => String(t.group_id) === String(activeGroup.id))
      : tasks.filter(t => String(t.group_id) === String(activeGroup.id));
  }, [activeGroup, isTests, tests, tasks]);

  // Total students count from DB (e.g. 62)
  const totalDbStudentsCount = allStudentsList.length || 62;

  // Level-wise calculations for the active group
  const levelStats = useMemo(() => {
    return groupItems.map(item => {
      const subs = isTests
        ? testSubmissions.filter(s => String(s.test_id) === String(item.id))
        : taskSubmissions.filter(s => String(s.task_id) === String(item.id));

      // Determine denominator (assigned students)
      let assignedCount = totalDbStudentsCount;
      if (Array.isArray(item.assigned_students) && item.assigned_students.length > 0) {
        assignedCount = item.assigned_students.length;
      }

      // Cleared: score > 0
      const clearedSubs = subs.filter(s => {
        const score = Number(s.score);
        const pct = Number(s.percentage);
        return (!isNaN(score) && score > 0) || (!isNaN(pct) && pct > 0);
      });
      const clearedCount = clearedSubs.length;

      // Sum of all marks of students
      const totalMarksSum = subs.reduce((acc, s) => {
        const score = Number(s.score);
        return acc + (!isNaN(score) ? score : 0);
      }, 0);

      // Level percentage: sum of marks / (assignedCount * max_score) * 100
      const maxScore = item.max_score || item.total_marks || 100;
      const maxPossibleMarks = assignedCount * maxScore;
      const pctNumber = maxPossibleMarks > 0 ? (totalMarksSum / maxPossibleMarks) * 100 : 0;

      return {
        item,
        title: item.title || 'Untitled',
        clearedCount,
        assignedCount,
        totalMarksSum,
        pctNumber,
        pctDisplay: pctNumber.toFixed(1) + '%',
      };
    });
  }, [groupItems, isTests, testSubmissions, taskSubmissions, totalDbStudentsCount]);

  // Group summary calculations
  const summaryStats = useMemo(() => {
    const totalClearedCompletions = levelStats.reduce((sum, lvl) => sum + lvl.clearedCount, 0);

    // Group % = avg of all task percentages
    const groupPct = levelStats.length > 0
      ? (levelStats.reduce((sum, lvl) => sum + lvl.pctNumber, 0) / levelStats.length).toFixed(1)
      : '0.0';

    // Map each student's progress in this active group
    const studentsData = allStudentsList.map(student => {
      const studentId = student.id;
      const studentEmail = (student.email || '').toLowerCase().trim();

      let clearedCount = 0;
      let totalScore = 0;

      groupItems.forEach(item => {
        const subs = isTests
          ? testSubmissions.filter(s => String(s.test_id) === String(item.id))
          : taskSubmissions.filter(s => String(s.task_id) === String(item.id));

        const studentSub = subs.find(s => {
          const sId = s.student_id || s.users?.id || s.user_id;
          const sMail = (s.student_email || s.email || s.users?.mailid || '').toLowerCase().trim();
          return (studentId && String(sId) === String(studentId)) || (studentEmail && sMail === studentEmail);
        });

        if (studentSub) {
          const score = Number(studentSub.score);
          const pct = Number(studentSub.percentage);
          if ((!isNaN(score) && score > 0) || (!isNaN(pct) && pct > 0)) {
            clearedCount++;
          }
          if (!isNaN(score) && score > 0) {
            totalScore += score;
          }
        }
      });

      const totalItemsCount = groupItems.length;
      let status = 'Not Cleared';
      if (totalItemsCount > 0 && clearedCount === totalItemsCount) {
        status = 'Cleared';
      } else if (clearedCount > 0) {
        status = `Cleared (${clearedCount}/${totalItemsCount})`;
      }

      return {
        ...student,
        clearedCount,
        totalScore,
        status,
      };
    });

    const notClearedCount = studentsData.filter(s => s.clearedCount < groupItems.length).length;

    return {
      totalCleared: totalClearedCompletions,
      notClearedCount,
      groupPct,
      studentsData,
    };
  }, [levelStats, allStudentsList, groupItems, isTests, testSubmissions, taskSubmissions]);

  // Overall percentage calculation across all groups (dividing by every group, e.g. 5)
  const overallPercentage = useMemo(() => {
    if (sortedGroups.length === 0) return '0.0%';
    let totalGroupPcts = 0;

    sortedGroups.forEach(grp => {
      const items = isTests
        ? tests.filter(t => String(t.group_id) === String(grp.id))
        : tasks.filter(t => String(t.group_id) === String(grp.id));

      if (items.length > 0) {
        let sumItemPcts = 0;
        items.forEach(it => {
          const subs = isTests
            ? testSubmissions.filter(s => String(s.test_id) === String(it.id))
            : taskSubmissions.filter(s => String(s.task_id) === String(it.id));
          const assignedCount = (Array.isArray(it.assigned_students) && it.assigned_students.length > 0)
            ? it.assigned_students.length
            : totalDbStudentsCount;
          const marksSum = subs.reduce((sum, s) => sum + (Number(s.score) || 0), 0);
          const maxMarks = assignedCount * (it.max_score || it.total_marks || 100);
          const pct = maxMarks > 0 ? (marksSum / maxMarks) * 100 : 0;
          sumItemPcts += pct;
        });
        const grpAvg = sumItemPcts / items.length;
        totalGroupPcts += grpAvg;
      }
    });

    return (totalGroupPcts / sortedGroups.length).toFixed(1) + '%';
  }, [sortedGroups, isTests, tests, tasks, testSubmissions, taskSubmissions, totalDbStudentsCount]);

  // Format banner title with highlighted P-Skill/Test
  const bannerTitle = useMemo(() => {
    if (!activeGroup) return { main: 'Assessment', highlight: isTests ? 'Test' : 'P-Skill', suffix: 'Result' };
    const raw = activeGroup.name || 'Assessment';
    // Clean out Pskill / P-Skill and Result
    let clean = raw.replace(/p[- ]?skill/gi, '').replace(/result/gi, '').trim();
    if (!clean) clean = raw;
    return {
      main: clean,
      highlight: isTests ? 'Test' : 'P-Skill',
      suffix: 'Result'
    };
  }, [activeGroup, isTests]);

  // PDF Download trigger
  function handleDownloadPDF(type) {
    if (!activeGroup || groupItems.length === 0) {
      alert('No data available to export for this group.');
      return;
    }
    generateGroupPDF({
      group: activeGroup,
      groupItems,
      isTests,
      studentsData: summaryStats.studentsData,
      summaryStats,
      type,
    });
  }

  return (
    <div className="dashboard-content" style={{ paddingBottom: '2.5rem' }}>
      {/* Existing Excel Download Modal (Untouched) */}
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

      {/* Top Header Bar */}
      <div style={{
        background: '#ffffff',
        padding: '1.1rem 1.5rem',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Performance Reports
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0 0' }}>
            Overall {isTests ? 'Test' : 'Task'} Average: <strong style={{ color: '#0f172a' }}>{overallPercentage}</strong> · Total Students: <strong style={{ color: '#0f172a' }}>{totalDbStudentsCount}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Subdivision toggle: Tasks / Tests */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '0.28rem',
            borderRadius: '9px',
            gap: '0.25rem'
          }}>
            {['tasks', 'tests'].map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.42rem 1rem',
                  borderRadius: '7px',
                  border: 'none',
                  background: viewMode === m ? '#ffffff' : 'transparent',
                  color: viewMode === m ? '#0f172a' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: viewMode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                {m === 'tests' ? <FileText size={15} /> : <CheckSquare size={15} />}
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {/* Download Report Excel button (Preserved untouched) */}
          <button
            onClick={() => setShowDownloadModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.52rem 1.05rem',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#0f172a'; }}
          >
            <Download size={15} />
            Download Report
          </button>
        </div>
      </div>

      {/* Sequential Group Navigation Pills */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '0.65rem 0.9rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        overflowX: 'auto',
        scrollBehavior: 'smooth',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'thin'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontSize: '0.76rem',
          fontWeight: 700,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginRight: '0.4rem',
          flexShrink: 0
        }}>
          <Layers size={14} />
          <span>Groups:</span>
        </div>

        {sortedGroups.map(grp => {
          const isSelected = activeGroup && String(grp.id) === String(activeGroup.id);
          const itemCount = isTests
            ? tests.filter(t => String(t.group_id) === String(grp.id)).length
            : tasks.filter(t => String(t.group_id) === String(grp.id)).length;

          return (
            <button
              key={grp.id}
              onClick={(e) => {
                setSelectedGroupId(grp.id);
                e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: isSelected ? '1px solid #0f172a' : '1px solid #e2e8f0',
                background: isSelected ? '#0f172a' : '#ffffff',
                color: isSelected ? '#ffffff' : '#334155',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }
              }}
            >
              <span>Group {grp.group_number}: {grp.name}</span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '12px',
                background: isSelected ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                color: isSelected ? '#ffffff' : '#64748b'
              }}>
                {itemCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
          <Loader size={28} style={{ margin: '0 auto 0.75rem', display: 'block', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: '0.85rem' }}>Loading report data...</div>
        </div>
      ) : !activeGroup ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '0.88rem' }}>
          No groups found. Create a group first.
        </div>
      ) : (
        <div
          key={`${viewMode}-${activeGroup.id}`}
          className="report-smooth-fade"
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '1.25rem 1.4rem'
          }}
        >
          {/* Group Header Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
            paddingBottom: '1.15rem',
            marginBottom: '1.25rem'
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a' }}>
                Group {activeGroup.group_number}: {activeGroup.name}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '3px' }}>
                {activeGroup.category || 'Professional Core'}
              </div>
            </div>

            <div style={{
              fontSize: '0.86rem',
              color: '#64748b',
              fontWeight: 600
            }}>
              {groupItems.length} {isTests ? 'tests' : 'tasks'}
            </div>
          </div>

          {/* Two-Column Layout (Matching Screenshot Format) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1.75rem',
            alignItems: 'start'
          }}>
            {/* ─── LEFT COLUMN: Level Result Table ───────────────────────────── */}
            <div>
              {/* Standalone Dark Navy Banner with Title & Icon */}
              <div style={{
                background: '#06315c',
                borderRadius: '12px',
                padding: '0.95rem 1.35rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                marginBottom: '1.25rem',
                boxShadow: '0 2px 6px rgba(6, 49, 92, 0.15)'
              }}>
                <div style={{
                  border: '2px solid rgba(255, 255, 255, 0.7)',
                  borderRadius: '8px',
                  padding: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Cpu size={22} color="#ffffff" />
                </div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '0.2px'
                }}>
                  {bannerTitle.main}{' '}
                  <span style={{ color: '#facc15' }}>{bannerTitle.highlight}</span>{' '}
                  {bannerTitle.suffix}
                </div>
              </div>

              {/* Table / Empty State */}
              {levelStats.length === 0 ? (
                <div style={{
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '3.5rem 1.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.65rem',
                  background: '#f8fafc'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b'
                  }}>
                    <Layers size={22} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#1e293b' }}>
                    No {isTests ? 'Tests' : 'Tasks'} in {activeGroup.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '320px', lineHeight: 1.4 }}>
                    There are no {isTests ? 'tests' : 'tasks'} assigned to this group yet. You can create assignments from the {isTests ? 'Tests' : 'Tasks'} tab.
                  </div>
                </div>
              ) : (
                <div style={{
                  border: '2px solid #06315c',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#ffffff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left'
                  }}>
                    <thead>
                      <tr style={{ background: '#06315c', color: '#ffffff', fontSize: '1rem', fontWeight: 800 }}>
                        <th style={{ padding: '0.9rem 1.25rem', borderRight: '1.5px solid #1e4b85' }}>
                          {isTests ? 'Test Level' : 'P Skill Level'}
                        </th>
                        <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', borderRight: '1.5px solid #1e4b85' }}>
                          Cleared
                        </th>
                        <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center' }}>
                          Percentage
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {levelStats.map((lvl, index) => {
                        const rowBg = ROW_COLORS[index % ROW_COLORS.length];
                        return (
                          <tr
                            key={lvl.item.id}
                            style={{
                              background: rowBg,
                              borderBottom: index === levelStats.length - 1 ? 'none' : '1px solid #06315c',
                            }}
                          >
                            {/* Column 1: Level Name */}
                            <td style={{
                              padding: '0.9rem 1.25rem',
                              fontWeight: 800,
                              fontSize: '1.02rem',
                              color: '#0f172a',
                              borderRight: '1px solid #06315c'
                            }}>
                              {lvl.title}
                            </td>

                            {/* Column 2: Cleared Count */}
                            <td style={{
                              padding: '0.9rem 1.25rem',
                              textAlign: 'center',
                              fontWeight: 800,
                              fontSize: '1.02rem',
                              color: '#0f172a',
                              borderRight: '1px solid #06315c'
                            }}>
                              {lvl.clearedCount}
                            </td>

                            {/* Column 3: Percentage */}
                            <td style={{
                              padding: '0.9rem 1.25rem',
                              textAlign: 'center',
                              fontWeight: 800,
                              fontSize: '1.02rem',
                              color: '#0f172a'
                            }}>
                              {lvl.pctDisplay}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ─── RIGHT COLUMN: Summary & PDF Downloads ─────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Summary Card */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1.25rem 1.4rem',
                marginBottom: '1.25rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                {/* Summary Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  color: '#0f172a',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  marginBottom: '1.15rem'
                }}>
                  <div style={{
                    background: '#e0f2fe',
                    padding: '6px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Users size={18} color="#0284c7" />
                  </div>
                  <span>Summary</span>
                </div>

                {/* Two KPI Cards with vertical divider */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  gap: '0.75rem',
                  alignItems: 'center'
                }}>
                  {/* Cleared Box */}
                  <div style={{
                    background: '#f0fdf4',
                    borderRadius: '12px',
                    padding: '1.15rem 0.75rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                      color: '#16a34a',
                      fontWeight: 700,
                      fontSize: '0.88rem'
                    }}>
                      <CheckCircle2 size={17} color="#16a34a" />
                      <span>Cleared</span>
                    </div>
                    <div style={{
                      fontSize: '2.4rem',
                      fontWeight: 900,
                      color: '#0f172a',
                      lineHeight: '1.1',
                      marginTop: '0.35rem'
                    }}>
                      {groupItems.length > 0 ? summaryStats.totalCleared : 0}
                    </div>
                  </div>

                  {/* Vertical divider line */}
                  <div style={{ width: '1px', height: '65px', background: '#e2e8f0' }} />

                  {/* Not Cleared Box */}
                  <div style={{
                    background: '#fef2f2',
                    borderRadius: '12px',
                    padding: '1.15rem 0.75rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                      color: '#dc2626',
                      fontWeight: 700,
                      fontSize: '0.88rem'
                    }}>
                      <XCircle size={17} color="#dc2626" />
                      <span>Not Cleared</span>
                    </div>
                    <div style={{
                      fontSize: '2.4rem',
                      fontWeight: 900,
                      color: '#0f172a',
                      lineHeight: '1.1',
                      marginTop: '0.35rem'
                    }}>
                      {groupItems.length > 0 ? summaryStats.notClearedCount : 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 PDF Download Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* 1. Download Detailed Report (PDF) */}
                <button
                  onClick={() => handleDownloadPDF('detailed')}
                  disabled={groupItems.length === 0}
                  style={{
                    background: groupItems.length === 0 ? '#94a3b8' : '#0854a0',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '0.95rem 1.25rem',
                    cursor: groupItems.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: groupItems.length === 0 ? 0.6 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.2rem',
                    transition: 'background 0.15s ease',
                    boxShadow: groupItems.length === 0 ? 'none' : '0 2px 6px rgba(8, 84, 160, 0.2)'
                  }}
                  onMouseEnter={e => { if (groupItems.length > 0) e.currentTarget.style.background = '#064380'; }}
                  onMouseLeave={e => { if (groupItems.length > 0) e.currentTarget.style.background = '#0854a0'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.94rem' }}>
                    <Download size={18} />
                    <span>Download Detailed Report (PDF)</span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: groupItems.length === 0 ? '#e2e8f0' : '#bfdbfe' }}>
                    {groupItems.length === 0 ? 'No assignments to export' : 'Student-wise list (Cleared / Not Cleared)'}
                  </span>
                </button>

                {/* 2 & 3. Side-by-side Cleared List & Not Cleared List */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem'
                }}>
                  {/* Download Cleared List */}
                  <button
                    onClick={() => handleDownloadPDF('cleared')}
                    disabled={groupItems.length === 0}
                    style={{
                      background: '#ffffff',
                      color: groupItems.length === 0 ? '#94a3b8' : '#15803d',
                      border: groupItems.length === 0 ? '1.5px solid #e2e8f0' : '1.5px solid #22c55e',
                      borderRadius: '10px',
                      padding: '0.75rem 0.5rem',
                      cursor: groupItems.length === 0 ? 'not-allowed' : 'pointer',
                      opacity: groupItems.length === 0 ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => { if (groupItems.length > 0) { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#16a34a'; } }}
                    onMouseLeave={e => { if (groupItems.length > 0) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#22c55e'; } }}
                  >
                    <Download size={16} color={groupItems.length === 0 ? '#94a3b8' : '#15803d'} />
                    <span>Download Cleared List (PDF)</span>
                  </button>

                  {/* Download Not Cleared List */}
                  <button
                    onClick={() => handleDownloadPDF('not_cleared')}
                    disabled={groupItems.length === 0}
                    style={{
                      background: '#ffffff',
                      color: groupItems.length === 0 ? '#94a3b8' : '#b91c1c',
                      border: groupItems.length === 0 ? '1.5px solid #e2e8f0' : '1.5px solid #ef4444',
                      borderRadius: '10px',
                      padding: '0.75rem 0.5rem',
                      cursor: groupItems.length === 0 ? 'not-allowed' : 'pointer',
                      opacity: groupItems.length === 0 ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => { if (groupItems.length > 0) { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#dc2626'; } }}
                    onMouseLeave={e => { if (groupItems.length > 0) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#ef4444'; } }}
                  >
                    <Download size={16} color={groupItems.length === 0 ? '#94a3b8' : '#b91c1c'} />
                    <span>Download Not Cleared List (PDF)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
