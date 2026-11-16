import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, 
  Search, 
  ArrowLeft,
  Award,
  Trash2,
  UserPlus,
  UserCheck,
  UserMinus,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import api from '../../api';
import { getSupabaseClient } from '../../supabaseClient';
import StudentDashboard from '../student/Dashboard';

export default function Students({ facultyName, facultyId, allGroups = [], allTests = [], onViewingStudentChange, onMappingChange }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mentorFilter, setMentorFilter] = useState('all'); // 'all' | 'mapped' | 'unmapped'
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }
  const [actionLoadingId, setActionLoadingId] = useState(null);
  
  // Custom UI/UX Confirmation Modal State for Deleting a Student
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [studentStats, setStudentStats] = useState({});
  const [viewingStudent, setViewingStudent] = useState(null);

  // Lock body scroll & listen to Escape key when delete modal is open
  useEffect(() => {
    if (studentToDelete) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape' && !isDeleting) {
          setStudentToDelete(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [studentToDelete, isDeleting]);

  // Notify parent whenever viewingStudent changes
  useEffect(() => {
    if (onViewingStudentChange) {
      onViewingStudentChange(!!viewingStudent);
    }
  }, [viewingStudent, onViewingStudentChange]);
  
  // Real data for the selected student
  const [studentGroups, setStudentGroups] = useState([]);
  const [studentEffectiveTests, setStudentEffectiveTests] = useState([]);
  const [studentTasks, setStudentTasks] = useState([]);
  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [studentTaskSubmissions, setStudentTaskSubmissions] = useState([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAllStudents();
      const studentsArray = Array.isArray(data) ? data : [];
      setStudents(studentsArray);
      
      // Load stats for all students (tests + tasks)
      const supabase = getSupabaseClient();
      if (supabase && studentsArray.length > 0) {
        const [{ data: subs }, { data: taskSubs }, { data: dbTasks }] = await Promise.all([
          supabase.from('test_submissions').select('student_email, score, max_score, percentage').eq('status', 'completed'),
          supabase.from('task_submissions').select('student_id, task_id, score, status').in('status', ['reviewed', 'graded']),
          supabase.from('tasks').select('id, max_score')
        ]);

        const taskMap = new Map();
        (dbTasks || []).forEach(tk => taskMap.set(String(tk.id), tk));

        const studentIdMap = new Map();
        studentsArray.forEach(st => {
          if (st.id && st.email) studentIdMap.set(st.id, st.email.toLowerCase());
        });

        const stats = {};
        (subs || []).forEach(sub => {
          const em = (sub.student_email || '').toLowerCase().trim();
          if (!em) return;
          if (!stats[em]) stats[em] = { testPctSum: 0, testCount: 0, taskPctSum: 0, taskCount: 0 };
          const pct = sub.percentage != null
            ? Number(sub.percentage)
            : (Number(sub.max_score) > 0 ? (Number(sub.score) / Number(sub.max_score)) * 100 : 0);
          stats[em].testPctSum += pct;
          stats[em].testCount++;
        });

        (taskSubs || []).forEach(tsub => {
          const em = studentIdMap.get(tsub.student_id);
          if (!em) return;
          if (!stats[em]) stats[em] = { testPctSum: 0, testCount: 0, taskPctSum: 0, taskCount: 0 };
          const tk = taskMap.get(String(tsub.task_id));
          const max = Number(tk?.max_score) || 100;
          const pct = max > 0 ? (Number(tsub.score || 0) / max) * 100 : 0;
          stats[em].taskPctSum += pct;
          stats[em].taskCount++;
        });

        const finalStats = {};
        for (const [em, s] of Object.entries(stats)) {
          const testAvg = s.testCount > 0 ? s.testPctSum / s.testCount : null;
          const taskAvg = s.taskCount > 0 ? s.taskPctSum / s.taskCount : null;
          let combinedAvg = 0;
          if (testAvg !== null && taskAvg !== null) {
            combinedAvg = Math.round((testAvg + taskAvg) / 2);
          } else if (testAvg !== null) {
            combinedAvg = Math.round(testAvg);
          } else if (taskAvg !== null) {
            combinedAvg = Math.round(taskAvg);
          }
          finalStats[em] = {
            avg: combinedAvg,
            count: s.testCount + s.taskCount,
            testCount: s.testCount,
            taskCount: s.taskCount
          };
        }
        setStudentStats(finalStats);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleStudentClick = async (stud) => {
    if (!stud) return;
    setViewingStudent(stud);
    setIsLoadingDashboard(true);
    try {
      // 1. Get the actual staff ID the student is assigned to
      const assignedStaffId = stud.assigned_staff_id || stud.staffId || '';
      
      // 2. Fetch ALL groups, ALL tests, ALL tasks, and submissions
      const supabase = getSupabaseClient();
      const [gData, tData, { data: sData }, taskRes, subRes] = await Promise.all([
        api.getGroups({ all: true }),
        api.getTests(),
        supabase ? supabase.from('test_submissions').select('*').eq('student_email', stud.email.toLowerCase()) : Promise.resolve({ data: [] }),
        supabase ? supabase.from('tasks').select('*, groups(*)').eq('status', 'published').order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
        supabase ? supabase.from('task_submissions').select('*').eq('student_id', stud.id) : Promise.resolve({ data: [] })
      ]);
      
      const safeTests = Array.isArray(tData) ? tData : [];
      const cleanEmail = (stud.email || '').toLowerCase().trim();
      
      // 3. Replicate StudentLayout's effectiveTests logic
      const effectiveTests = safeTests.filter(t => {
        if (t.status === 'draft') return false;
        if (Array.isArray(t.assigned_students) && t.assigned_students.length > 0) {
          return t.assigned_students.some(e => {
            const val = typeof e === 'string' ? e : e?.email || '';
            return val.toLowerCase().trim() === cleanEmail;
          });
        }
        return true;
      });

      // 4. Effective tasks logic
      const rawTasks = taskRes?.data || [];
      const effectiveTasks = rawTasks.filter(t => {
        if (t.status === 'draft') return false;
        if (Array.isArray(t.assigned_students) && t.assigned_students.length > 0) {
          return t.assigned_students.some(e => {
            const val = typeof e === 'string' ? e : e?.email || '';
            return val.toLowerCase().trim() === cleanEmail;
          });
        }
        return true;
      });
      
      const testGroupIds = new Set(effectiveTests.map(t => t.group_id).filter(Boolean));
      const taskGroupIds = new Set(effectiveTasks.map(t => t.group_id).filter(Boolean));
      const safeGroups = Array.isArray(gData) ? gData : [];
      const visibleGroups = safeGroups.filter(g => 
        (assignedStaffId && String(g.created_by || g.staff_id) === String(assignedStaffId)) || 
        testGroupIds.has(g.id) ||
        taskGroupIds.has(g.id)
      );
      
      setStudentGroups(visibleGroups);
      setStudentEffectiveTests(effectiveTests);
      setStudentTasks(effectiveTasks);
      setStudentSubmissions(sData || []);
      setStudentTaskSubmissions(subRes?.data || []);
    } catch (e) {
      console.error(e);
      setStudentGroups([]);
      setStudentEffectiveTests([]);
      setStudentTasks([]);
      setStudentSubmissions([]);
      setStudentTaskSubmissions([]);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const handleToggleMap = async (stud) => {
    const isCurrentlyMapped = stud.assigned_staff_id === facultyId || (stud.assigned_staff_name && facultyName && stud.assigned_staff_name.toLowerCase() === facultyName.toLowerCase());
    const targetStaffId = isCurrentlyMapped ? null : facultyId;
    const targetStaffName = isCurrentlyMapped ? null : facultyName;

    setActionLoadingId(stud.id || stud.email);
    try {
      await api.assignStudentsToStaff(targetStaffId, targetStaffName, [stud.email]);
      setStudents(prev => prev.map(s => s.email.toLowerCase() === stud.email.toLowerCase() ? {
        ...s,
        assigned_staff_id: targetStaffId,
        assigned_staff_name: targetStaffName
      } : s));
      setToast({
        type: 'success',
        message: isCurrentlyMapped ? `Unmapped ${stud.name || stud.email}` : `Successfully mapped ${stud.name || stud.email} to ${facultyName || 'you'}`
      });
      setTimeout(() => setToast(null), 4000);
      if (onMappingChange) {
        onMappingChange();
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: 'Failed to update student mapping: ' + (err.message || err)
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    const target = studentToDelete;
    const sName = target.name || target.email;

    setIsDeleting(true);
    setActionLoadingId(target.id || target.email);
    try {
      await api.banUser(target.email, 'suspended_hard');
      setStudents(prev => prev.filter(s => s.email.toLowerCase() !== target.email.toLowerCase()));
      setToast({
        type: 'success',
        message: `Permanently deleted and banned ${sName}. Records purged from database.`
      });
      setStudentToDelete(null);
      setTimeout(() => setToast(null), 5000);
      if (onMappingChange) {
        onMappingChange();
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: 'Failed to delete student: ' + (err.message || err)
      });
    } finally {
      setIsDeleting(false);
      setActionLoadingId(null);
    }
  };

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      const statA = studentStats[a.email.toLowerCase()]?.avg || 0;
      const statB = studentStats[b.email.toLowerCase()]?.avg || 0;
      return statB - statA; // Descending by default
    });
  }, [students, studentStats]);

  const filteredStudents = useMemo(() => {
    let result = sortedStudents;

    if (mentorFilter === 'mapped') {
      result = result.filter(s => s.assigned_staff_id === facultyId || (s.assigned_staff_name && facultyName && s.assigned_staff_name.toLowerCase() === facultyName.toLowerCase()));
    } else if (mentorFilter === 'unmapped') {
      result = result.filter(s => !s.assigned_staff_name && !s.assigned_staff_id);
    }

    if (!searchQuery) return result;
    const q = searchQuery.toLowerCase();
    return result.filter(s => 
      (s.name || '').toLowerCase().includes(q) || 
      (s.email || '').toLowerCase().includes(q) || 
      (s.reg_no || '').toLowerCase().includes(q)
    );
  }, [sortedStudents, searchQuery, mentorFilter, facultyId, facultyName]);

  if (viewingStudent) {
    const stat = studentStats[viewingStudent.email.toLowerCase()] || { avg: 0, count: 0 };
    return (
      <div className="dashboard-content page-transition-enter" style={{ padding: '0 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', padding: '1rem', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button onClick={() => setViewingStudent(null)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#1d72fe', cursor: 'pointer', fontWeight: 600 }}>
              <ArrowLeft size={18} /> Back to Ranking
            </button>
            <div style={{ marginLeft: '1rem', paddingLeft: '1rem', borderLeft: '2px solid #e2e8f0', color: '#1e293b', fontWeight: 700 }}>
              {viewingStudent.name}'s Dashboard
            </div>
          </div>
          
          <div style={{ position: 'relative', width: '350px', maxWidth: '100%' }}>
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <Search size={16} color="#94a3b8" />
            </div>
            <input 
              type="text" 
              list="student-switcher-list"
              placeholder="Search & switch student..."
              onChange={(e) => {
                const match = students.find(s => `${s.name} - ${s.reg_no || 'No Reg'} - ${s.email}` === e.target.value);
                if (match) {
                  handleStudentClick(match);
                  e.target.value = '';
                }
              }}
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.25rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: '0.85rem',
                fontWeight: 500,
                color: '#1e293b'
              }}
            />
            <datalist id="student-switcher-list">
              {sortedStudents.map(s => (
                <option key={s.email} value={`${s.name} - ${s.reg_no || 'No Reg'} - ${s.email}`} />
              ))}
            </datalist>
          </div>
        </div>
        
        {isLoadingDashboard ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Loading student's real dashboard...
          </div>
        ) : (
          <StudentDashboard 
            groups={studentGroups} 
            tests={studentEffectiveTests} 
            tasks={studentTasks}
            studentSubmissions={studentSubmissions} 
            studentTaskSubmissions={studentTaskSubmissions}
            studentName={viewingStudent.name} 
            studentDept={viewingStudent.department}
            studentYear={viewingStudent.year}
            overallScore={stat.avg}
            testsCompletedCount={stat.count}
            assignedStaff={viewingStudent}
          />
        )}
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        background: '#ffffff',
        padding: '1.25rem 1.75rem',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={22} color="#1d72fe" /> Student Rankings
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            View overall performance rankings and student dashboards.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <select 
            onChange={(e) => {
              const stud = students.find(s => s.email === e.target.value);
              if (stud) handleStudentClick(stud);
              e.target.value = "";
            }}
            defaultValue=""
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: '#1e293b',
              minWidth: '250px',
              cursor: 'pointer'
            }}
          >
            <option value="" disabled>Select a student...</option>
            {sortedStudents.map(s => (
              <option key={s.email} value={s.email}>
                {s.name} - {s.reg_no || 'No Reg'} - {s.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {toast && (
        <div 
          className="page-transition-enter"
          style={{ 
            background: toast.type === 'error' ? '#fef2f2' : '#ecfdf5', 
            border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#a7f3d0'}`, 
            color: toast.type === 'error' ? '#991b1b' : '#065f46', 
            padding: '0.85rem 1.25rem', 
            borderRadius: '12px', 
            marginBottom: '1.25rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            gap: '0.75rem', 
            fontWeight: 600, 
            fontSize: '0.88rem', 
            boxShadow: toast.type === 'error' ? '0 4px 14px rgba(239, 68, 68, 0.12)' : '0 4px 14px rgba(16, 185, 129, 0.12)' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {toast.type === 'error' ? (
              <AlertCircle size={19} color="#dc2626" style={{ flexShrink: 0 }} />
            ) : (
              <CheckCircle2 size={19} color="#059669" style={{ flexShrink: 0 }} />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              padding: '2px', 
              color: toast.type === 'error' ? '#991b1b' : '#065f46', 
              display: 'flex', 
              alignItems: 'center' 
            }}
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
            <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search by name, email, or reg no..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <select
              value={mentorFilter}
              onChange={e => setMentorFilter(e.target.value)}
              style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.82rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}
            >
              <option value="all">All Students ({students.length})</option>
              <option value="mapped">Mapped to Me</option>
              <option value="unmapped">Unassigned Students</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}>
                <th style={{ padding: '0.75rem 1rem', width: '55px' }}>Rank</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Student Name</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Reg No</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Email</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Faculty Mentor</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Overall Average</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No students found.</td></tr>
              ) : (
                filteredStudents.map((stud, index) => {
                  const stat = studentStats[stud.email.toLowerCase()] || { avg: 0 };
                  const isMappedToMe = stud.assigned_staff_id === facultyId || (stud.assigned_staff_name && facultyName && stud.assigned_staff_name.toLowerCase() === facultyName.toLowerCase());
                  const isBusy = actionLoadingId === (stud.id || stud.email);
                  
                  return (
                    <tr key={stud.email} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#64748b' }}>
                        #{index + 1}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }} onClick={() => handleStudentClick(stud)}>
                        {stud.name || 'Unknown'}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', color: '#475569' }}>
                        {stud.reg_no || 'N/A'}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', color: '#475569', fontFamily: 'var(--font-mono)' }}>
                        {stud.email}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        {isMappedToMe ? (
                          <span style={{
                            background: '#ecfdf5',
                            color: '#065f46',
                            border: '1px solid #a7f3d0',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <UserCheck size={12} color="#059669" /> Mapped to You
                          </span>
                        ) : stud.assigned_staff_name ? (
                          <span style={{
                            background: '#eff6ff',
                            color: '#1e40af',
                            border: '1px solid #bfdbfe',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.74rem',
                            fontWeight: 600
                          }}>
                            {stud.assigned_staff_name}
                          </span>
                        ) : (
                          <span style={{
                            background: '#f8fafc',
                            color: '#94a3b8',
                            border: '1px solid #e2e8f0',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.74rem',
                            fontWeight: 600
                          }}>
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600, color: stat.avg >= 70 ? '#10b981' : (stat.avg > 0 ? '#ef4444' : '#64748b') }}>
                        {stat.avg}%
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {/* Map to Me / Unmap Button */}
                          {isMappedToMe ? (
                            <button
                              onClick={() => handleToggleMap(stud)}
                              disabled={isBusy}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#475569',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                cursor: isBusy ? 'wait' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                              title="Unmap this student from your mentorship"
                            >
                              <UserMinus size={13} color="#64748b" />
                              Unmap
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleMap(stud)}
                              disabled={isBusy}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                border: '1px solid #10b981',
                                background: '#ecfdf5',
                                color: '#059669',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: isBusy ? 'wait' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                              title="Map this student to your mentorship"
                            >
                              <UserPlus size={13} />
                              Map to Me
                            </button>
                          )}

                          {/* View Dashboard Button */}
                          <button
                            onClick={() => handleStudentClick(stud)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '6px',
                              border: '1px solid #1d72fe',
                              background: '#eff6ff',
                              color: '#1d72fe',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Dashboard
                          </button>

                          {/* Delete Student Button */}
                          <button
                            onClick={() => setStudentToDelete(stud)}
                            disabled={isBusy || (studentToDelete && isDeleting)}
                            style={{
                              padding: '0.35rem 0.6rem',
                              borderRadius: '6px',
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#dc2626',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: (isBusy || (studentToDelete && isDeleting)) ? 'wait' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                            title="Permanently wipe student data and ban user"
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern UI/UX Confirmation Modal for Student Deletion */}
      {studentToDelete && createPortal(
        <div 
          className="ap-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.70)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '1.25rem'
          }}
          onClick={() => !isDeleting && setStudentToDelete(null)}
        >
          <div 
            className="ap-modal-card"
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              border: '1px solid #fee2e2',
              overflow: 'hidden',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top red accent gradient */}
            <div style={{
              height: '5px',
              width: '100%',
              background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 50%, #991b1b 100%)'
            }} />

            <div style={{ padding: '1.75rem 2rem' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: '#fef2f2',
                    border: '2px solid #fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 0 0 4px rgba(254, 226, 226, 0.5)'
                  }}>
                    <Trash2 size={24} color="#dc2626" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                      Permanently Delete Student?
                    </h3>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#dc2626', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Irreversible Action • Database Purge
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => !isDeleting && setStudentToDelete(null)}
                  disabled={isDeleting}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0.35rem',
                    borderRadius: '8px',
                    color: '#94a3b8',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Student identity preview card */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '0.9rem 1.1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.9rem'
              }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  color: '#1d72fe',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #bfdbfe',
                  flexShrink: 0
                }}>
                  {studentToDelete.name ? studentToDelete.name.slice(0, 2).toUpperCase() : 'ST'}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.96rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {studentToDelete.name || 'Unnamed Student'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {studentToDelete.email}
                  </div>
                  {(studentToDelete.reg_no || studentToDelete.department) && (
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.2rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {studentToDelete.reg_no && (
                        <span style={{ background: '#e2e8f0', color: '#334155', padding: '0.1rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                          Reg: {studentToDelete.reg_no}
                        </span>
                      )}
                      {studentToDelete.department && (
                        <span style={{ background: '#e2e8f0', color: '#334155', padding: '0.1rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                          {studentToDelete.department}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Warning consequence bullet points */}
              <div style={{
                background: '#fff5f5',
                border: '1px solid #fecdd3',
                borderRadius: '14px',
                padding: '1rem 1.15rem',
                marginBottom: '1.5rem',
                fontSize: '0.82rem',
                color: '#7f1d1d'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#991b1b', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertTriangle size={15} color="#dc2626" />
                  <span>Permanent Consequences:</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', lineHeight: 1.5 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ color: '#dc2626', fontWeight: 800 }}>•</span>
                    <div>
                      <strong>Permanent Data Wipe:</strong> Profile records, test scores, and task submissions will be permanently purged from the database.
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ color: '#dc2626', fontWeight: 800 }}>•</span>
                    <div>
                      <strong>Account Banned:</strong> The student will be blocked from logging into AssessPro and instructed to contact <span style={{ fontWeight: 600, textDecoration: 'underline' }}>krithickrajs.cs25@bitsathy.ac.in</span>.
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ color: '#dc2626', fontWeight: 800 }}>•</span>
                    <div>
                      <strong>Admin Reinstatement:</strong> Any reinstatement request submitted by the student must be approved by an administrator before access can be restored.
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setStudentToDelete(null)}
                  disabled={isDeleting}
                  style={{
                    padding: '0.65rem 1.3rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: isDeleting ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  style={{
                    padding: '0.65rem 1.45rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: isDeleting ? 'wait' : 'pointer',
                    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Permanently Purging...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Yes, Permanently Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}


