import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserCheck, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  GraduationCap,
  ArrowLeft
} from 'lucide-react';
import api from '../../api';
import { getSupabaseClient } from '../../supabaseClient';
import StudentDashboard from '../student/Dashboard';

export default function Students({ facultyName, facultyId, allGroups = [], allTests = [] }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('mine'); // Default to mine
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [studentStats, setStudentStats] = useState({});
  const [viewingStudent, setViewingStudent] = useState(null);
  const [studentSubmissions, setStudentSubmissions] = useState([]);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAllStudents();
      const studentsArray = Array.isArray(data) ? data : [];
      setStudents(studentsArray);
      
      // Load stats for all students
      const supabase = getSupabaseClient();
      if (supabase && studentsArray.length > 0) {
        const { data: subs } = await supabase.from('test_submissions').select('student_email, score, max_score');
        if (subs) {
          const stats = {};
          subs.forEach(sub => {
            const em = (sub.student_email || '').toLowerCase();
            if(!stats[em]) stats[em] = { score: 0, max: 0, count: 0 };
            stats[em].score += sub.score;
            stats[em].max += sub.max_score;
            stats[em].count++;
          });
          const finalStats = {};
          for (const [em, s] of Object.entries(stats)) {
             finalStats[em] = {
               avg: s.max > 0 ? Math.round((s.score / s.max) * 100) : 0,
               count: s.count
             };
          }
          setStudentStats(finalStats);
        }
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

  const handleAssignToMe = async () => {
    if (selectedEmails.length === 0) {
      setErrorMsg('Please select at least one student to assign.');
      return;
    }
    try {
      await api.assignStudentsToStaff(facultyId || 'staff-1', facultyName || 'Faculty Mentor', selectedEmails);
      setSuccessMsg(`Successfully mapped ${selectedEmails.length} student(s) to you!`);
      setSelectedEmails([]);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadStudents();
    } catch (err) {
      setErrorMsg('Failed to assign students: ' + err.message);
    }
  };

  const isAssignedToThisStaff = (s) => {
    return (s.assigned_staff_name && s.assigned_staff_name === facultyName) ||
           (s.assigned_staff_id && s.assigned_staff_id === facultyId) ||
           (s.staffName && s.staffName === facultyName);
  };

  const hasAnyStaff = (s) => Boolean(s.assigned_staff_name || s.staffName);

  const [showDashboard, setShowDashboard] = useState(false);

  const handleStudentClick = async (stud) => {
    setViewingStudent(stud);
    setShowDashboard(false);
    try {
      const { data } = await getSupabaseClient().from('test_submissions').select('*').eq('student_email', stud.email.toLowerCase());
      setStudentSubmissions(data || []);
    } catch (e) {
      setStudentSubmissions([]);
    }
  };

  const myAssignedCount = students.filter(isAssignedToThisStaff).length;
  const unassignedCount = students.filter(s => !hasAnyStaff(s)).length;

  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (s.name || '').toLowerCase().includes(q) || 
                          (s.email || '').toLowerCase().includes(q) || 
                          (s.reg_no || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (filterType === 'mine') return isAssignedToThisStaff(s);
    if (filterType === 'unassigned') return !hasAnyStaff(s);
    return true;
  });

  if (viewingStudent) {
    const stat = studentStats[viewingStudent.email.toLowerCase()] || { avg: 0, count: 0 };
    return (
      <div className="dashboard-content">
        <button onClick={() => setViewingStudent(null)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', background: 'none', border: 'none', color: '#1d72fe', cursor: 'pointer', fontWeight: 600 }}>
          <ArrowLeft size={18} /> Back to Students List
        </button>
        <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e5e7eb', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#111827' }}>{viewingStudent.name}</h2>
            <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>{viewingStudent.email}</p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.85rem', color: '#475569' }}>
              <div><strong>Register No:</strong> {viewingStudent.reg_no || 'N/A'}</div>
              <div><strong>Department:</strong> {viewingStudent.department || 'N/A'}</div>
              <div><strong>Year:</strong> {viewingStudent.year || 'N/A'}</div>
              <div><strong>Staff:</strong> {viewingStudent.assigned_staff_name || 'Unassigned'}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.avg < 70 ? '#ef4444' : '#10b981' }}>{stat.avg}%</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Overall Average</div>
            </div>
            {!showDashboard && (
               <button onClick={() => setShowDashboard(true)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: '#1d72fe', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>View Student Dashboard</button>
            )}
          </div>
        </div>
        {stat.avg < 70 && stat.count > 0 && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '12px', display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem', fontWeight: 600 }}>
            <AlertCircle size={20} />
            This student has an overall average below 70% and may require additional support.
          </div>
        )}
        {showDashboard && (
          <div style={{ opacity: 0.9, pointerEvents: 'none', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#111827', fontSize: '1.25rem' }}>Dashboard Preview</h3>
            <StudentDashboard 
              groups={allGroups} 
              tests={allTests} 
              studentSubmissions={studentSubmissions} 
              studentName={viewingStudent.name} 
              overallScore={stat.avg}
              testsCompletedCount={stat.count}
            />
          </div>
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Student Management
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            Click on any mapped student to view their dashboard. Map new students using the 'Map Students' tab.
          </p>
        </div>
        <button
          onClick={handleAssignToMe}
          disabled={selectedEmails.length === 0}
          style={{
            padding: '0.65rem 1.25rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            borderRadius: '10px',
            border: 'none',
            background: selectedEmails.length > 0 ? '#10b981' : '#cbd5e1',
            color: '#ffffff',
            cursor: selectedEmails.length > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <UserCheck size={16} />
          <span>Assign Selected ({selectedEmails.length})</span>
        </button>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setFilterType('mine')} style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', border: filterType === 'mine' ? '1px solid #10b981' : '1px solid #e2e8f0', background: filterType === 'mine' ? '#ecfdf5' : '#ffffff', color: filterType === 'mine' ? '#059669' : '#475569', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Mapped ({myAssignedCount})</button>
            <button onClick={() => setFilterType('all')} style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', border: filterType === 'all' ? '1px solid #1d72fe' : '1px solid #e2e8f0', background: filterType === 'all' ? '#eff6ff' : '#ffffff', color: filterType === 'all' ? '#1d72fe' : '#475569', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>All Students ({students.length})</button>
            <button onClick={() => setFilterType('unassigned')} style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', border: filterType === 'unassigned' ? '1px solid #f59e0b' : '1px solid #e2e8f0', background: filterType === 'unassigned' ? '#fffbeb' : '#ffffff', color: filterType === 'unassigned' ? '#b45309' : '#475569', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Unassigned ({unassignedCount})</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}>
                <th style={{ padding: '0.75rem 0.5rem', width: '40px' }}><input type="checkbox" checked={filteredStudents.length > 0 && selectedEmails.length === filteredStudents.length} onChange={(e) => setSelectedEmails(e.target.checked ? filteredStudents.map(s => s.email.toLowerCase()) : [])} style={{ cursor: 'pointer' }} /></th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Student Name</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Average</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Assigned Faculty</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No students found.</td></tr>
              ) : (
                filteredStudents.map((stud) => {
                  const isSelected = selectedEmails.includes(stud.email.toLowerCase());
                  const isMine = isAssignedToThisStaff(stud);
                  const stat = studentStats[stud.email.toLowerCase()] || { avg: 0 };
                  const needsAlert = stat.avg < 70 && stat.avg > 0;
                  return (
                    <tr key={stud.email} style={{ borderBottom: '1px solid #f1f5f9', background: isSelected ? '#f0fdf4' : (needsAlert ? '#fff5f5' : 'transparent') }}>
                      <td style={{ padding: '0.85rem 0.5rem' }}><input type="checkbox" checked={isSelected} onChange={() => { const em = stud.email.toLowerCase(); setSelectedEmails(prev => prev.includes(em) ? prev.filter(e => e !== em) : [...prev, em]); }} style={{ cursor: 'pointer' }} /></td>
                      <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }} onClick={() => handleStudentClick(stud)}>{stud.name || stud.email} {needsAlert && <AlertCircle size={14} color="#ef4444" style={{display: 'inline', marginLeft: 4}}/>}</td>
                      <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600, color: stat.avg < 70 && stat.avg > 0 ? '#ef4444' : '#10b981' }}>{stat.avg}%</td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>{stud.assigned_staff_name || 'Unassigned'}</td>
                      <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                        <button onClick={() => handleStudentClick(stud)} style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #1d72fe', background: '#eff6ff', color: '#1d72fe', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}>View Dashboard</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
