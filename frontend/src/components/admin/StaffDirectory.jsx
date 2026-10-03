import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, ArrowLeft, X, Save, Trash2 } from 'lucide-react';
import { getSupabaseClient } from '../../supabaseClient';
import StaffDashboard from '../staff/Dashboard';
import Students from '../staff/Students';

export default function StaffDirectory({ allUsers }) {
  const [staffList, setStaffList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); 
  
  const [staffStats, setStaffStats] = useState({});
  const [viewingStaff, setViewingStaff] = useState(null);
  const [activeView, setActiveView] = useState(null); 
  const [editingStaff, setEditingStaff] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [allGroups, setAllGroups] = useState([]);
  const [allTests, setAllTests] = useState([]);
  const [allStudents, setAllStudents] = useState([]);

  useEffect(() => {
    // BUG 13 FIX: allUsers may have UserType or role — normalize both
    const staff = allUsers.filter(u => (u.role || u.UserType || '').toLowerCase() === 'staff');
    setStaffList(staff);
    
    const loadStats = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      
      const { data: groups } = await supabase.from('groups').select('*');
      setAllGroups(groups || []);
      
      let tests = [];
      try {
        const { default: api } = await import('../../api');
        const students = await api.getAllStudents();
        setAllStudents(Array.isArray(students) ? students : []);
        
        tests = await api.getTests();
        setAllTests(tests || []);
      } catch (e) {}
      
      if (tests) {
        const stats = {};
        staff.forEach(s => {
           const sTests = tests.filter(t => t.created_by_email?.toLowerCase() === s.email.toLowerCase() || t.created_by === s.id);
           let totalAvg = 0;
           let count = 0;
           sTests.forEach(t => {
             if (t.avg !== undefined) { totalAvg += t.avg; count++; }
           });
           stats[s.email.toLowerCase()] = count > 0 ? Math.round(totalAvg / count) : 0;
        });
        setStaffStats(stats);
      }
    };
    loadStats();
  }, [allUsers]);

  const filteredStaff = staffList.filter(s => {
    const q = searchQuery.toLowerCase();
    const match = s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    if (!match) return false;
    
    const avg = staffStats[s.email.toLowerCase()] || 0;
    if (filterType === 'below70') return avg > 0 && avg < 70;
    if (filterType === 'top') return avg >= 70;
    return true;
  });

  const handleStaffClick = (staff) => {
    setViewingStaff(staff);
    setEditingStaff({ ...staff });
    setActiveView(null);
  };

  // BUG 2 FIX: Use backend admin endpoint with service-role key to bypass RLS
  const handleSaveStaff = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/staff/${editingStaff.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('assesspro_auth_token') || ''}`
        },
        body: JSON.stringify({ name: editingStaff.name })
      });
      const data = await res.json();
      if (res.ok) {
        const updatedList = staffList.map(s => s.id === editingStaff.id ? { ...s, name: editingStaff.name } : s);
        setStaffList(updatedList);
        setViewingStaff({ ...viewingStaff, name: editingStaff.name });
        alert('Staff info updated successfully!');
      } else {
        alert('Failed to update: ' + (data.error || res.statusText));
      }
    } catch (err) {
      alert('Error updating staff: ' + err.message);
    }
    setIsSaving(false);
  };

  const handleDeleteUser = async () => {
    if (!viewingStaff || !viewingStaff.id) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${viewingStaff.name}? This will remove all their data and tests.`)) return;
    
    try {
      const res = await fetch(`/api/admin/users/${viewingStaff.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("assesspro_auth_token") || ""}` }
      });
      if (res.ok) {
        setStaffList(staffList.filter(s => s.id !== viewingStaff.id));
        setViewingStaff(null);
        alert("User permanently deleted.");
      } else {
        const data = await res.json();
        alert("Failed to delete user: " + (data.error || res.statusText));
      }
    } catch (err) {
      alert("Error deleting user: " + err.message);
    }
  };

  // If showing dashboard or students list full screen
  if (viewingStaff && activeView) {
    const avg = staffStats[viewingStaff.email.toLowerCase()] || 0;
    const staffTests = allTests.filter(t => t.created_by_email?.toLowerCase() === viewingStaff.email.toLowerCase() || t.created_by === viewingStaff.id);
    const totalTestsCount = staffTests.length;
    const activeTestsCount = staffTests.filter(t => t.status !== 'draft').length;
    const totalStudentsCount = allStudents.filter(s => s.assigned_staff_name === viewingStaff.name || s.assigned_staff_id === viewingStaff.id).length;
    
    return (
      <div className="dashboard-content">
        <button onClick={() => setActiveView(null)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', background: 'none', border: 'none', color: '#1d72fe', cursor: 'pointer', fontWeight: 600 }}>
          <ArrowLeft size={18} /> Back to Staff Info
        </button>
        <div style={{ opacity: 0.95, pointerEvents: 'none' }}>
          {activeView === 'dashboard' && (
            <StaffDashboard 
              groups={allGroups} 
              tests={staffTests} 
              facultyName={viewingStaff.name} 
              totalTestsCount={totalTestsCount}
              activeTestsCount={activeTestsCount}
              totalStudentsCount={totalStudentsCount}
            />
          )}
          {activeView === 'students' && (
            <Students facultyName={viewingStaff.name} facultyId={viewingStaff.id} allGroups={allGroups} allTests={allTests} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div className="table-card">
        <div className="table-header-action" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: 0 }}>Staff Directory</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, marginTop: '0.2rem' }}>Manage all faculty members.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search by name, email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ padding: '0.5rem 0.85rem 0.5rem 2.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <option value="all">All Staff</option>
              <option value="below70">Groups Avg &lt; 70%</option>
              <option value="top">Groups Avg ≥ 70%</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Institutional Email</th>
                <th>Role</th>
                <th>Groups Avg</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No staff members found.</td></tr>
              ) : (
                filteredStaff.map((u) => {
                  const avg = staffStats[u.email.toLowerCase()] || 0;
                  const needsAlert = avg < 70 && avg > 0;
                  return (
                    <tr key={u.id} style={{ background: needsAlert ? '#fff5f5' : 'transparent', cursor: 'pointer' }} onClick={() => handleStaffClick(u)}>
                      <td style={{ fontWeight: 600, color: '#1e293b' }}>{u.name} {needsAlert && <AlertCircle size={14} color="#ef4444" style={{display: 'inline', marginLeft: 4}}/>}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{u.email}</td>
                      <td>
                        <span className="group-badge-blue" style={{ textTransform: 'capitalize' }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: needsAlert ? '#ef4444' : '#10b981' }}>
                        {avg}%
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #1d72fe', background: '#eff6ff', color: '#1d72fe', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}>Manage</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingStaff && !activeView && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '600px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>Manage Staff Info</h2>
              <button onClick={() => setViewingStaff(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.3rem', fontWeight: 600 }}>Full Name</label>
                  <input type="text" value={editingStaff?.name || ''} onChange={(e) => setEditingStaff({...editingStaff, name: e.target.value})} style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.3rem', fontWeight: 600 }}>Email Address</label>
                  <input type="text" value={editingStaff?.email || ''} readOnly style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#94a3b8' }} />
                </div>
              </div>

              {/* BUG 5 FIX: staffStats[email] is a plain number, not an object with .avg */}
              {(staffStats[viewingStaff.email.toLowerCase()] || 0) > 0 && (staffStats[viewingStaff.email.toLowerCase()] || 0) < 70 && (
                <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '12px', display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                  <AlertCircle size={20} />
                  This staff's overall groups average is below 70%.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
              <button onClick={handleDeleteUser} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", padding: "0.65rem 1.25rem", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}>
                <Trash2 size={16} /> Delete User
              </button>
              
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button 
                  onClick={handleSaveStaff} 
                  disabled={isSaving}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#1d72fe', color: '#fff', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Save size={16} />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => setActiveView('dashboard')} 
                  style={{ background: '#1d72fe', color: '#fff', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  View Dashboard
                </button>
                <button 
                  onClick={() => setActiveView('students')} 
                  style={{ background: '#475569', color: '#fff', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  View Students
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
