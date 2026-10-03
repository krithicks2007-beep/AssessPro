import React, { useState, useEffect, useCallback } from 'react';
import { UserCheck, UserX, Clock, RefreshCw } from 'lucide-react';
import api from '../../api';

export default function StudentRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getStudentRequests();
      setRequests(data || []);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load student requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleResolve = async (email, action) => {
    try {
      await api.resolveStudentRequest(email, action);
      loadRequests();
    } catch (err) {
      alert(`Failed to ${action} request: ${err.message}`);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading requests...</div>;
  }

  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>Student Reinstatement Requests</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>Manage students who were removed and are requesting access back.</p>
        </div>
        <button onClick={loadRequests} style={{ background: '#f1f5f9', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {errorMsg && (
        <div style={{ margin: '1.5rem', padding: '1rem', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', border: '1px solid #fca5a5' }}>
          {errorMsg}
        </div>
      )}

      {requests.length === 0 ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
          <div style={{ background: '#f8fafc', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
            <Clock size={32} color="#94a3b8" />
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#334155' }}>No pending requests</h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>When removed students request access, they will appear here.</p>
        </div>
      ) : (
        <div style={{ padding: '0 1.5rem' }}>
          {requests.map(req => (
            <div key={req.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '1.05rem' }}>{req.email}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: '12px', 
                    background: req.ban_type === 'suspended_hard' ? '#fee2e2' : '#fef3c7',
                    color: req.ban_type === 'suspended_hard' ? '#991b1b' : '#92400e',
                    fontWeight: 600
                  }}>
                    {req.ban_type === 'suspended_hard' ? 'Hard Deleted (Wiped Data)' : 'Soft Suspended (Saved Data)'}
                  </span>
                  <span style={{ color: '#64748b' }}>
                    Requested on {new Date(req.banned_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={() => handleResolve(req.email, 'approve')}
                  style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #10b981', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                >
                  <UserCheck size={16} /> Approve
                </button>
                <button 
                  onClick={() => handleResolve(req.email, 'deny')}
                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #ef4444', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                >
                  <UserX size={16} /> Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
