import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserCheck, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  GraduationCap,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import api from '../../api';

export default function Students({ facultyName, facultyId }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'mine' | 'unassigned'
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAllStudents();
      setStudents(Array.isArray(data) ? data : []);
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

  const myAssignedCount = students.filter(isAssignedToThisStaff).length;
  const unassignedCount = students.filter(s => !hasAnyStaff(s)).length;

  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (s.name || '').toLowerCase().includes(q) || 
                          (s.email || '').toLowerCase().includes(q) || 
                          (s.reg_no || '').toLowerCase().includes(q) || 
                          (s.department || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterType === 'mine') {
      return isAssignedToThisStaff(s);
    }
    if (filterType === 'unassigned') {
      return !hasAnyStaff(s);
    }
    return true;
  });

  return (
    <div className="dashboard-content">
      {/* Top Banner / Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        background: '#ffffff',
        padding: '1.25rem 1.75rem',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Student Mentorship & Staff Mapping
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            Map students to yourself as faculty mentor. Mapped students see your name on their dashboard and assessments.
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
            gap: '0.5rem',
            boxShadow: selectedEmails.length > 0 ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none'
          }}
        >
          <UserCheck size={16} />
          <span>Assign Selected to Me ({selectedEmails.length})</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{
          background: '#dcfce7',
          border: '1px solid #86efac',
          color: '#15803d',
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          marginBottom: '1.25rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          color: '#b91c1c',
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          marginBottom: '1.25rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', color: '#1d72fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{students.length}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Total Students</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>{myAssignedCount}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Assigned to You</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b45309' }}>{unassignedCount}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Unassigned Students</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '14px',
        padding: '1.25rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by name, email, reg no..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem 0.6rem 2.25rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.84rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setFilterType('all')}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: filterType === 'all' ? '1px solid #1d72fe' : '1px solid #e2e8f0',
                background: filterType === 'all' ? '#eff6ff' : '#ffffff',
                color: filterType === 'all' ? '#1d72fe' : '#475569',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              All ({students.length})
            </button>
            <button
              onClick={() => setFilterType('mine')}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: filterType === 'mine' ? '1px solid #10b981' : '1px solid #e2e8f0',
                background: filterType === 'mine' ? '#ecfdf5' : '#ffffff',
                color: filterType === 'mine' ? '#059669' : '#475569',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              My Mapped Students ({myAssignedCount})
            </button>
            <button
              onClick={() => setFilterType('unassigned')}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: filterType === 'unassigned' ? '1px solid #f59e0b' : '1px solid #e2e8f0',
                background: filterType === 'unassigned' ? '#fffbeb' : '#ffffff',
                color: filterType === 'unassigned' ? '#b45309' : '#475569',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Unassigned ({unassignedCount})
            </button>
          </div>
        </div>

        {/* Students Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}>
                <th style={{ padding: '0.75rem 0.5rem', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={filteredStudents.length > 0 && selectedEmails.length === filteredStudents.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEmails(filteredStudents.map(s => s.email.toLowerCase()));
                      } else {
                        setSelectedEmails([]);
                      }
                    }}
                    style={{ cursor: 'pointer', accentColor: '#10b981' }}
                  />
                </th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Student Name</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Register No</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Official Mail ID</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Department & Year</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Assigned Faculty</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No students match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stud) => {
                  const isSelected = selectedEmails.includes(stud.email.toLowerCase());
                  const isMine = isAssignedToThisStaff(stud);
                  const mentorName = stud.assigned_staff_name || stud.staffName;
                  return (
                    <tr
                      key={stud.id || stud.email}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isSelected ? '#f0fdf4' : 'transparent',
                        transition: 'background 0.15s'
                      }}
                    >
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            const em = stud.email.toLowerCase();
                            setSelectedEmails(prev => 
                              prev.includes(em) ? prev.filter(e => e !== em) : [...prev, em]
                            );
                          }}
                          style={{ cursor: 'pointer', accentColor: '#10b981' }}
                        />
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700, color: '#1e293b' }}>
                        {stud.name || stud.email?.split('@')[0] || 'Student'}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        {stud.reg_no ? (
                          <span style={{ background: '#eff6ff', color: '#1d72fe', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', fontSize: '0.74rem' }}>
                            {stud.reg_no}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontStyle: 'italic' }}>
                            Not registered
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', color: '#475569', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {stud.email}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', color: '#64748b' }}>
                        {stud.department ? (
                          <span>{stud.department} {stud.year ? `• ${stud.year}` : ''}</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontStyle: 'italic' }}>Profile incomplete</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        {mentorName ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '3px 8px',
                            borderRadius: '20px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            background: isMine ? '#dcfce7' : '#f1f5f9',
                            color: isMine ? '#15803d' : '#475569'
                          }}>
                            {isMine ? '★ ' : ''}{mentorName}
                          </span>
                        ) : (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '20px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: '#fef3c7',
                            color: '#b45309'
                          }}>
                            No staff assigned
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                        {!isMine ? (
                          <button
                            onClick={async () => {
                              try {
                                await api.assignStudentsToStaff(facultyId || 'staff-1', facultyName || 'Faculty Mentor', [stud.email]);
                                setSuccessMsg(`Assigned ${stud.name} to you!`);
                                setTimeout(() => setSuccessMsg(''), 4000);
                                await loadStudents();
                              } catch (err) {
                                setErrorMsg('Failed: ' + err.message);
                              }
                            }}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '6px',
                              border: '1px solid #10b981',
                              background: '#ecfdf5',
                              color: '#059669',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Map to Me
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 700 }}>
                            ✓ Mapped
                          </span>
                        )}
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
