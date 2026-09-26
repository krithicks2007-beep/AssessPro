import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Settings, 
  Database, 
  Lock, 
  CheckCircle, 
  UserCheck, 
  Search,
  Building
} from 'lucide-react';
import api from '../../api';

export default function AdminDashboard({ user, onSignOut }) {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminUsers();
      const mapped = data.map(u => ({
        id: u.id,
        name: u.name || u.mailid?.split('@')[0] || 'User',
        email: u.mailid || u.email,
        role: u.UserType || u.role || 'student',
        status: 'Active',
        lastLogin: 'Verified @bitsathy.ac.in'
      }));
      setUsersList(mapped);
    } catch (err) {
      console.error('Error fetching admin users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.updateUserRole(userId, newRole);
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert('Failed to update role: ' + err.message);
    }
  };

  const filteredUsers = filterRole === 'all' 
    ? usersList 
    : usersList.filter(u => u.role === filterRole);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="user-badge">
          <div className="user-avatar" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' }}>
            {user?.email?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>
                {user?.user_metadata?.full_name || 'System Administrator'}
              </h2>
              <span className="role-badge admin">Admin Console</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
              {user?.email || 'admin@bitsathy.ac.in'}
            </div>
          </div>
        </div>

        <button className="btn-secondary" onClick={onSignOut}>
          Sign Out
        </button>
      </div>

      {/* Admin stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Institutional Domain</div>
          <div className="stat-value" style={{ color: '#34d399', fontSize: '1.4rem', fontFamily: 'var(--font-mono)' }}>
            @bitsathy.ac.in
          </div>
          <div className="stat-change" style={{ color: '#10b981' }}>
            <Lock size={12} style={{ display: 'inline', marginRight: '4px' }} />
            Enforced in Supabase OAuth & Backend
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Authenticated Users</div>
          <div className="stat-value" style={{ color: '#818cf8' }}>{usersList.length}</div>
          <div className="stat-change" style={{ color: '#94a3b8' }}>Staff & Students</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Subdivisions Managed</div>
          <div className="stat-value" style={{ color: '#f472b6' }}>3 Roles</div>
          <div className="stat-change" style={{ color: '#94a3b8' }}>Student, Staff, Admin</div>
        </div>
      </div>

      {/* User Directory & Role Assignment */}
      <div className="panel-card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
              Authorized Institutional Users
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              Users authenticated via Google OAuth with bitsathy.ac.in hosted domain.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className={`btn-secondary ${filterRole === 'all' ? 'active' : ''}`}
              style={{ background: filterRole === 'all' ? 'rgba(99, 102, 241, 0.2)' : undefined }}
              onClick={() => setFilterRole('all')}
            >
              All
            </button>
            <button 
              className={`btn-secondary ${filterRole === 'student' ? 'active' : ''}`}
              style={{ background: filterRole === 'student' ? 'rgba(59, 130, 246, 0.2)' : undefined }}
              onClick={() => setFilterRole('student')}
            >
              Students
            </button>
            <button 
              className={`btn-secondary ${filterRole === 'staff' ? 'active' : ''}`}
              style={{ background: filterRole === 'staff' ? 'rgba(16, 185, 129, 0.2)' : undefined }}
              onClick={() => setFilterRole('staff')}
            >
              Staff
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>Name</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Institutional Email</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Role</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Activity</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600, color: '#f8fafc' }}>{u.name}</td>
                  <td style={{ padding: '0.85rem 0.5rem', fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>{u.email}</td>
                  <td style={{ padding: '0.85rem 0.5rem' }}>
                    <span className={`role-badge ${u.role}`}>{u.role}</span>
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem' }}>
                    <span style={{ color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem', color: '#94a3b8' }}>{u.lastLogin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
