import React from 'react';
import { X, FileText, LayoutList, ArrowRight } from 'lucide-react';

export default function AssignWorkModal({ groups = [], onClose, onAssignTest, onAssignTask }) {
  // Separate groups by type (default to test if null)
  const testGroups = groups.filter(g => !g.group_type || g.group_type === 'test');
  const taskGroups = groups.filter(g => g.group_type === 'task');

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
    }}>
      <div style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)', width: '100%', maxWidth: '1000px', height: '100%', maxHeight: '90vh',
        borderRadius: '24px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
              Assign Work to Student Groups
            </h4>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Select a group below to assign a new assessment or project.</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={24} color="#64748b" />
          </button>
        </div>

        {/* Split Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
          {/* Tests Column */}
          <div style={{ background: 'linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%)', padding: '1.5rem', borderRadius: '16px', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #dcfce7' }}>
              <div style={{ background: '#10b981', color: '#ffffff', padding: '0.6rem', borderRadius: '10px', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}><FileText size={20} /></div>
              <h5 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#065f46' }}>Assign MCQ Test</h5>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
              {testGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8', fontSize: '0.9rem' }}>No Test groups found. Create one in Manage Groups.</div>
              ) : (
                testGroups.map(group => (
                  <button 
                    key={group.id} 
                    onClick={() => onAssignTest(group.id)}
                    style={{
                      background: '#ffffff', border: '1px solid #dcfce7', borderRadius: '10px', padding: '1rem',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.2s ease', boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.background = '#ecfdf5'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 15px rgba(16,185,129,0.15)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#dcfce7'; e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.02)'; }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{group.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>{group.category}</div>
                    </div>
                    <ArrowRight size={16} color="#94a3b8" />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Tasks Column */}
          <div style={{ background: 'linear-gradient(145deg, #ffffff 0%, #fdf4ff 100%)', padding: '1.5rem', borderRadius: '16px', border: '1px solid #f9a8d4', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px -5px rgba(219, 39, 119, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #fce7f3' }}>
              <div style={{ background: '#db2777', color: '#ffffff', padding: '0.6rem', borderRadius: '10px', boxShadow: '0 4px 10px rgba(219,39,119,0.3)' }}><LayoutList size={20} /></div>
              <h5 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#831843' }}>Assign Project Task</h5>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
              {taskGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8', fontSize: '0.9rem' }}>No Task groups found. Create one in Manage Groups.</div>
              ) : (
                taskGroups.map(group => (
                  <button 
                    key={group.id} 
                    onClick={() => onAssignTask(group.id)}
                    style={{
                      background: '#ffffff', border: '1px solid #fbcfe8', borderRadius: '10px', padding: '1rem',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.2s ease', boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#db2777'; e.currentTarget.style.background = '#fdf2f8'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 15px rgba(219,39,119,0.15)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#fbcfe8'; e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.02)'; }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{group.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>{group.category}</div>
                    </div>
                    <ArrowRight size={16} color="#94a3b8" />
                  </button>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
