import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Settings, 
  Lock, 
  UserPlus,
  Check,
  X,
  LogOut,
  Bell,
  Home,
  CheckCircle,
  Trash2
} from 'lucide-react';
import StaffDirectory from './StaffDirectory';
import StudentDirectory from './StudentDirectory';
import api from '../../api';

export default function AdminDashboard({ user, onSignOut }) {
  const [usersList, setUsersList] = useState([]);
  const [staffRequests, setStaffRequests] = useState([]);
  const [testsList, setTestsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [actionMsg, setActionMsg] = useState('');
  const [activeTab, setActiveTab] = useState('Dashboard');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await api.getAdminUsers();
      const safeData = Array.isArray(data) ? data : [];
      const mapped = safeData.map((u, index) => {
        const role = (u.UserType || u.role || 'student').toLowerCase();
        
        // If the real DB live_status exists (from active_sessions), use it
        const hasLiveStatus = !!u.live_status;
        const isOnline = hasLiveStatus ? u.live_status.includes('Online') || u.live_status.includes('In Exam') : false;
        const statusStr = hasLiveStatus ? u.live_status : 'Offline';
        
        return {
          id: u.id,
          name: u.name || u.mailid?.split('@')[0] || 'User',
          email: u.mailid || u.email,
          role: role,
          status: statusStr,
          isOnline: isOnline,
          lastLogin: hasLiveStatus && u.last_heartbeat ? new Date(u.last_heartbeat).toLocaleTimeString() : 'Last seen recently'
        };
      });
      setUsersList(mapped);
    } catch (err) {
      console.error('Error fetching admin users:', err);
      setLoadError(err.message || 'Failed to load users. Check Supabase connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStaffRequests = useCallback(async () => {
    try {
      const reqs = await api.getStaffRequests();
      setStaffRequests(Array.isArray(reqs) ? reqs.filter(req => req.status === 'pending') : []);
    } catch (err) {
      console.warn('Error loading staff requests:', err);
    }
  }, []);

  const loadTests = useCallback(async () => {
    try {
      const tests = await api.getTests();
      setTestsList(tests || []);
    } catch(err) {
      console.warn('Error loading tests:', err);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadStaffRequests();
    loadTests();
    const staffInterval = setInterval(loadStaffRequests, 3500);
    const usersInterval = setInterval(loadUsers, 10000); // Live poll presence every 10s
    return () => {
      clearInterval(staffInterval);
      clearInterval(usersInterval);
    };
  }, [loadUsers, loadStaffRequests, loadTests]);

  const handleApproveStaff = async (id, email) => {
    try {
      await api.approveStaffRequest(id, email);
      setStaffRequests((current) => current.filter((request) => request.id !== id));
      setActionMsg(`Approved staff privileges for ${email}`);
      setTimeout(() => setActionMsg(''), 4000);
      await loadStaffRequests();
      await loadUsers();
    } catch (err) {
      alert('Failed to approve request: ' + err.message);
    }
  };

  const handleRejectStaff = async (id, email) => {
    if (!window.confirm(`Reject staff request for ${email}?`)) return;
    try {
      await api.rejectStaffRequest(id, email);
      setActionMsg(`Rejected staff request for ${email}`);
      setTimeout(() => setActionMsg(''), 4000);
      await loadStaffRequests();
    } catch (err) {
      alert('Failed to reject request: ' + err.message);
    }
  };

  const pendingRequests = staffRequests.filter(r => r.status === 'pending');
  const adminName = user?.user_metadata?.full_name || 'System Administrator';

  const navItems = [
    { label: 'Dashboard', icon: Home },
    { label: 'Staff Directory', icon: Users },
    { label: 'Student Directory', icon: Users },
    { label: 'Staff Requests', icon: UserPlus },
    { label: 'Assessments & Results', icon: ShieldCheck },
    { label: 'Settings', icon: Settings },
  ];

  return (
    <div className="layout-wrapper">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <ShieldCheck size={20} strokeWidth={2.5} />
          </div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-title">Admin Console</span>
            <span className="sidebar-logo-sub">AssessPro Platform</span>
          </div>
        </div>

        {/* Profile */}
        <div className="sidebar-profile">
          <div className="sidebar-avatar" style={{ background: '#ede9fe', color: '#8b5cf6', borderColor: '#ddd6fe' }}>
            {adminName.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-profile-name">{adminName}</div>
          <div className="sidebar-profile-role">Super Admin</div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.label;
            return (
              <button
                key={item.label}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.label)}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="sidebar-logout">
          <button className="nav-link" onClick={onSignOut}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-wrapper">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <h1 className="header-title">Admin Dashboard</h1>
            <p className="header-greeting">Manage institutional users and platform access.</p>
          </div>
          
          <div className="header-right">
            <div className="dept-pill">
              <ShieldCheck size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Super Admin Mode
            </div>
            <button className="notification-btn">
              <Bell size={18} />
              {pendingRequests.length > 0 && (
                <span className="notification-badge">{pendingRequests.length}</span>
              )}
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {/* Action Notification */}
          {actionMsg && (
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #10b981',
              color: '#059669',
              borderRadius: '12px',
              padding: '0.85rem 1.25rem',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
            }}>
              <CheckCircle size={18} />
              <span>{actionMsg}</span>
            </div>
          )}

          {/* Load Error Banner */}
          {loadError && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              color: '#dc2626',
              borderRadius: '12px',
              padding: '0.85rem 1.25rem',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              marginBottom: '0.5rem'
            }}>
              <X size={18} />
              <span>⚠ Failed to load data: {loadError}</span>
              <button onClick={loadUsers} style={{ marginLeft: 'auto', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', padding: '4px 12px', cursor: 'pointer', fontSize: '0.8rem' }}>Retry</button>
            </div>
          )}

          {/* Top KPI Metrics Row */}
          <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {/* Metric 1 */}
            <div className="kpi-card">
              <div className="kpi-icon-box kpi-icon-blue">
                <Users size={22} strokeWidth={2.5} />
              </div>
              <div className="kpi-info">
                <div className="kpi-val">{usersList.length}</div>
                <div className="kpi-label">Total Users</div>
                <div className="kpi-sub">Students & Staff</div>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="kpi-card">
              <div className="kpi-icon-box kpi-icon-orange">
                <UserPlus size={22} strokeWidth={2.5} />
              </div>
              <div className="kpi-info">
                <div className="kpi-val">{pendingRequests.length}</div>
                <div className="kpi-label">Pending Requests</div>
                <div className="kpi-sub">Staff access pending</div>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="kpi-card">
              <div className="kpi-icon-box kpi-icon-green">
                <Lock size={22} strokeWidth={2.5} />
              </div>
              <div className="kpi-info">
                <div className="kpi-val" style={{ fontSize: '1.25rem' }}>Open Access</div>
                <div className="kpi-label">Email Accounts</div>
                <div className="kpi-sub">Any verified email can sign in</div>
              </div>
            </div>
          </div>

          {/* Main Layout Grid */}
          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: '1fr' }}>
            
            {activeTab === 'Dashboard' && (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Welcome to the Admin Dashboard</h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Use the sidebar to navigate to User Directory, manage Staff Requests, or monitor Assessments.</p>
                  
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '1.2rem' }}>{usersList.filter(u => u.isOnline).length}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Users Currently Online</div>
                    </div>
                    <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '1.2rem' }}>{usersList.filter(u => u.status === 'In Exam').length}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Users Attending Tests</div>
                    </div>
                    <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '1.2rem' }}>{testsList.length}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Assessments Issued</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Staff Requests' && (
              <div className="table-card">
                <div className="table-header-action">
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                      Staff / Faculty Access Requests
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, marginTop: '0.2rem' }}>
                      Accounts requesting Staff role to create tests and manage students
                    </p>
                  </div>
                </div>

                {staffRequests.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <UserPlus size={32} color="#cbd5e1" style={{ margin: '0 auto 0.5rem' }} />
                    <div>No staff requests submitted yet.</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Applicant Name</th>
                          <th>Email Address</th>
                          <th>Status</th>
                          <th>Requested On</th>
                          <th style={{ textAlign: 'right' }}>Admin Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffRequests.map((req) => (
                          <tr key={req.id || req.email}>
                            <td style={{ fontWeight: 600 }}>{req.name}</td>
                            <td style={{ fontFamily: 'var(--font-mono)' }}>{req.email}</td>
                            <td>
                              <span className={req.status === 'approved' ? 'status-pill-completed' : (req.status === 'rejected' ? 'status-pill-rejected' : 'group-badge-purple')}
                                    style={req.status === 'rejected' ? { background: '#fef2f2', color: '#dc2626', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: 600, fontSize: '0.72rem' } : (req.status === 'pending' ? { background: '#fff7ed', color: '#ea580c' } : {})}
                              >
                                {req.status}
                              </span>
                            </td>
                            <td style={{ color: '#64748b' }}>
                              {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'Recent'}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {req.status === 'pending' ? (
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={() => handleApproveStaff(req.id, req.email)}
                                    style={{
                                      background: '#1d72fe',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '0.35rem 0.6rem',
                                      fontWeight: 700,
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.3rem'
                                    }}
                                  >
                                    <Check size={14} />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectStaff(req.id, req.email)}
                                    style={{
                                      background: '#fef2f2',
                                      color: '#ef4444',
                                      border: '1px solid #fca5a5',
                                      borderRadius: '6px',
                                      padding: '0.35rem 0.6rem',
                                      fontWeight: 600,
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.3rem'
                                    }}
                                  >
                                    <X size={14} />
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                  {req.status === 'approved' ? 'Staff Active' : 'Dismissed'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Staff Directory' && (
              <StaffDirectory allUsers={usersList} />
            )}

            {activeTab === 'Student Directory' && (
              <StudentDirectory allUsers={usersList} />
            )}

            {activeTab === 'Assessments & Results' && (
              <div className="table-card">
                <div className="table-header-action">
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                      All Platform Assessments
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, marginTop: '0.2rem' }}>
                      Tests issued by faculty members across the platform
                    </p>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Test Title</th>
                        <th>Created By</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th>Created At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testsList.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                            No assessments found on the platform.
                          </td>
                        </tr>
                      ) : (
                        testsList.map(test => (
                          <tr key={test.id}>
                            <td style={{ fontWeight: 600 }}>{test.title}</td>
                            <td style={{ fontSize: '0.85rem' }}>{test.created_by_email || test.userEmail || 'Faculty'}</td>
                            <td>{test.duration_minutes || test.durationMinutes || 30} mins</td>
                            <td>
                              <span className="status-pill-completed" style={{ textTransform: 'capitalize' }}>
                                {test.status || 'Active'}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                              {test.created_at ? new Date(test.created_at).toLocaleDateString() : 'Recent'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {activeTab === 'Settings' && (
              <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
                <Settings size={32} style={{ marginBottom: '1rem', color: '#cbd5e1' }} />
                <h3>Platform Settings</h3>
                <p>Global platform configuration options will be available here.</p>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
