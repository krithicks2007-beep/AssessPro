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
import api from '../../api';

export default function AdminDashboard({ user, onSignOut }) {
  const [usersList, setUsersList] = useState([]);
  const [staffRequests, setStaffRequests] = useState([]);
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
      const mapped = safeData.map(u => ({
        id: u.id,
        name: u.name || u.mailid?.split('@')[0] || 'User',
        email: u.mailid || u.email,
        role: u.UserType || u.role || 'student',
        status: 'Active',
        lastLogin: 'Authenticated account'
      }));
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

  useEffect(() => {
    loadUsers();
    loadStaffRequests();
    const interval = setInterval(loadStaffRequests, 3500);
    return () => clearInterval(interval);
  }, [loadUsers, loadStaffRequests]);

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

  const handleDeleteUser = async (id, email, name) => {
    if (email === 'krithickrajs.cs25@bitsathy.ac.in') {
      alert('The Super Admin account cannot be deleted.');
      return;
    }
    if (!window.confirm(`Are you sure you want to completely delete ${name || email}? This will wipe their profile, auth record, and test submissions from the database.`)) {
      return;
    }
    try {
      await api.deleteUserCompletely(id, email);
      setActionMsg(`Successfully deleted ${email} from all tables.`);
      setTimeout(() => setActionMsg(''), 4000);
      await loadUsers();
      await loadStaffRequests();
    } catch (err) {
      alert('Failed to delete user: ' + err.message);
    }
  };

  const filteredUsers = filterRole === 'all' 
    ? usersList 
    : usersList.filter(u => u.role === filterRole);

  const pendingRequests = staffRequests.filter(r => r.status === 'pending');
  const adminName = user?.user_metadata?.full_name || 'System Administrator';

  const navItems = [
    { label: 'Dashboard', icon: Home },
    { label: 'User Directory', icon: Users },
    { label: 'Staff Requests', icon: UserPlus },
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
            
            {/* Staff Requests Panel */}
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
                                    background: '#10b981',
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

            {/* Users Directory Panel */}
            <div className="table-card">
              <div className="table-header-action" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                    Authorized Institutional Users
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, marginTop: '0.2rem' }}>
                    Users authenticated through the configured Supabase providers.
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className={`btn-table-view`}
                    style={filterRole === 'all' ? { background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' } : {}}
                    onClick={() => setFilterRole('all')}
                  >
                    All
                  </button>
                  <button 
                    className={`btn-table-view`}
                    style={filterRole === 'student' ? { background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' } : {}}
                    onClick={() => setFilterRole('student')}
                  >
                    Students
                  </button>
                  <button 
                    className={`btn-table-view`}
                    style={filterRole === 'staff' ? { background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' } : {}}
                    onClick={() => setFilterRole('staff')}
                  >
                    Staff
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Institutional Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Activity</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600 }}>{u.name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{u.email}</td>
                        <td>
                          <span className={u.role === 'admin' ? 'group-badge-purple' : (u.role === 'staff' ? 'group-badge-blue' : 'group-badge-green')}
                                style={{ textTransform: 'capitalize' }}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.8rem' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                            {u.status}
                          </span>
                        </td>
                        <td style={{ color: '#64748b' }}>{u.lastLogin}</td>
                        <td style={{ textAlign: 'right' }}>
                          {u.email !== 'krithickrajs.cs25@bitsathy.ac.in' && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email, u.name)}
                              title="Delete User Completely"
                              style={{
                                background: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                transition: 'all 0.15s'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
