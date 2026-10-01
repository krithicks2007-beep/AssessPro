import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, 
  Search, 
  ArrowLeft,
  Award
} from 'lucide-react';
import api from '../../api';
import { getSupabaseClient } from '../../supabaseClient';
import StudentDashboard from '../student/Dashboard';

export default function Students({ facultyName, facultyId, allGroups = [], allTests = [], onViewingStudentChange }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [studentStats, setStudentStats] = useState({});
  const [viewingStudent, setViewingStudent] = useState(null);

  // Notify parent whenever viewingStudent changes
  useEffect(() => {
    if (onViewingStudentChange) {
      onViewingStudentChange(!!viewingStudent);
    }
  }, [viewingStudent, onViewingStudentChange]);
  
  // Real data for the selected student
  const [studentGroups, setStudentGroups] = useState([]);
  const [studentEffectiveTests, setStudentEffectiveTests] = useState([]);
  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);

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

  const handleStudentClick = async (stud) => {
    if (!stud) return;
    setViewingStudent(stud);
    setIsLoadingDashboard(true);
    try {
      // 1. Get the actual staff ID the student is assigned to
      const assignedStaffId = stud.assigned_staff_id || stud.staffId || '';
      
      // 2. Fetch ALL groups, ALL tests, and submissions
      const [gData, tData, { data: sData }] = await Promise.all([
        api.getGroups({ all: true }),
        api.getTests(),
        getSupabaseClient().from('test_submissions').select('*').eq('student_email', stud.email.toLowerCase())
      ]);
      
      const safeTests = Array.isArray(tData) ? tData : [];
      
      // 3. Replicate StudentLayout's effectiveTests logic
      const effectiveTests = safeTests.filter(t => {
        if (t.status === 'draft') return false;
        if (Array.isArray(t.assigned_students) && t.assigned_students.length > 0) {
          const cleanEmail = (stud.email || '').toLowerCase().trim();
          return t.assigned_students.some(e => {
            const val = typeof e === 'string' ? e : e?.email || '';
            return val.toLowerCase().trim() === cleanEmail;
          });
        }
        return true;
      });
      
      const testGroupIds = new Set(effectiveTests.map(t => t.group_id).filter(Boolean));
      const safeGroups = Array.isArray(gData) ? gData : [];
      const visibleGroups = safeGroups.filter(g => 
        (assignedStaffId && String(g.staff_id) === String(assignedStaffId)) || 
        testGroupIds.has(g.id)
      );
      
      setStudentGroups(visibleGroups);
      setStudentEffectiveTests(effectiveTests);
      setStudentSubmissions(sData || []);
    } catch (e) {
      console.error(e);
      setStudentGroups([]);
      setStudentEffectiveTests([]);
      setStudentSubmissions([]);
    } finally {
      setIsLoadingDashboard(false);
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
    if (!searchQuery) return sortedStudents;
    const q = searchQuery.toLowerCase();
    return sortedStudents.filter(s => 
      (s.name || '').toLowerCase().includes(q) || 
      (s.email || '').toLowerCase().includes(q) || 
      (s.reg_no || '').toLowerCase().includes(q)
    );
  }, [sortedStudents, searchQuery]);

  if (viewingStudent) {
    const stat = studentStats[viewingStudent.email.toLowerCase()] || { avg: 0, count: 0 };
    return (
      <div className="dashboard-content" style={{ padding: '0 1rem' }}>
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
            studentSubmissions={studentSubmissions} 
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

      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
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
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}>
                <th style={{ padding: '0.75rem 1rem', width: '60px' }}>Rank</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Student Name</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Reg No</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Email</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Overall Average</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No students found.</td></tr>
              ) : (
                filteredStudents.map((stud, index) => {
                  const stat = studentStats[stud.email.toLowerCase()] || { avg: 0 };
                  
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
                      <td style={{ padding: '0.85rem 0.5rem', color: '#475569' }}>
                        {stud.email}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600, color: stat.avg >= 70 ? '#10b981' : (stat.avg > 0 ? '#ef4444' : '#64748b') }}>
                        {stat.avg}%
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
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


