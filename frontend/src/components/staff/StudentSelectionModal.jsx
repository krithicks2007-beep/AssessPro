import React, { useState } from 'react';
import { Users } from 'lucide-react';

export default function StudentSelectionModal({ 
  isOpen, 
  onClose, 
  availableStudents = [], 
  initialSelectedEmails = [],
  onSave 
}) {
  const [studentSearch, setStudentSearch] = useState('');
  const [notFoundEmails, setNotFoundEmails] = useState([]);
  const [selectedStudentEmails, setSelectedStudentEmails] = useState(initialSelectedEmails);

  if (!isOpen) return null;

  const handleBulkAdd = (text) => {
    const tokens = text.split(/[\s,;]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
    const newSelected = new Set(selectedStudentEmails);
    const notFound = [];
    let addedCount = 0;

    tokens.forEach(token => {
      const student = availableStudents.find(s => 
        (s.email && s.email.toLowerCase() === token) || 
        (s.full_name && s.full_name.toLowerCase() === token)
      );
      
      if (student) {
        newSelected.add(student.email);
        addedCount++;
      } else if (token.includes('@')) {
        notFound.push(token);
      }
    });

    if (addedCount > 0 || notFound.length > 0) {
      setSelectedStudentEmails(Array.from(newSelected));
      setNotFoundEmails(notFound);
      setStudentSearch('');
    } else {
      setStudentSearch(text);
    }
  };

  const handleConfirm = () => {
    onSave(selectedStudentEmails);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(15, 23, 42, 0.7)', zIndex: 9999, display: 'flex',
      justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', width: '90%', maxWidth: '900px', height: '90vh',
        display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
      }}>
        <div style={{ padding: '1.5rem 2rem', background: 'linear-gradient(135deg, #01183eff 0%, #08349bff 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
              <Users size={20} color="#60a5fa" />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, letterSpacing: '0.01em' }}>Manage Target Audience</h2>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: '1.75rem', color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseOver={e => e.currentTarget.style.color = '#fff'}
            onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
          >
            &times;
          </button>
        </div>
        
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left Pane - Search and Available */}
          <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <p style={{ marginBottom: '1.5rem', color: '#475569', fontSize: '0.95rem' }}>
              Search for a student by name/email, or paste a list of emails (separated by spaces, commas, or newlines) into the search box below to instantly select them.
            </p>
            
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <input 
                type="text" 
                placeholder="Search name, or paste multiple emails here..." 
                value={studentSearch} 
                onChange={(e) => setStudentSearch(e.target.value)}
                onPaste={(e) => {
                  const pasteData = e.clipboardData.getData('text');
                  if (pasteData.includes(',') || pasteData.includes('\n') || pasteData.includes(' ')) {
                    e.preventDefault();
                    handleBulkAdd(pasteData);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleBulkAdd(studentSearch);
                  }
                }}
                style={{ flex: 1, padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '1rem', transition: 'all 0.3s ease', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
                onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'; e.target.style.background = '#f8fafc'; }}
              />
              <button 
                onClick={(e) => { e.preventDefault(); handleBulkAdd(studentSearch); }}
                style={{ padding: '0 1.5rem', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', fontSize: '1rem', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -1px rgba(37, 99, 235, 0.1)' }}
              >
                Add
              </button>
            </div>

            {/* Warning for not found emails */}
            {notFoundEmails.length > 0 && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', fontSize: '0.9rem', color: '#b91c1c' }}>
                <strong>Could not find the following students (check for typos):</strong>
                <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', fontFamily: 'monospace' }}>
                  {notFoundEmails.map(email => <li key={email}>{email}</li>)}
                </ul>
                <button 
                  onClick={(e) => { e.preventDefault(); setNotFoundEmails([]); }}
                  style={{ marginTop: '0.75rem', background: 'transparent', border: 'none', color: '#dc2626', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontWeight: 500 }}
                >
                  Dismiss Warning
                </button>
              </div>
            )}

            {/* Filtered Search Results */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>Available Students</span>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  const filtered = availableStudents.filter(s => s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.email?.toLowerCase().includes(studentSearch.toLowerCase()));
                  const newEmails = filtered.map(s => s.email);
                  setSelectedStudentEmails(prev => Array.from(new Set([...prev, ...newEmails])));
                }}
                style={{ background: 'transparent', border: 'none', color: '#1d72fe', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Select All Listed Below
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem', paddingBottom: '1rem' }}>
              {availableStudents.filter(s => s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.email?.toLowerCase().includes(studentSearch.toLowerCase())).map(student => {
                const isSelected = selectedStudentEmails.includes(student.email);
                return (
                  <label key={student.email} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', background: isSelected ? '#eff6ff' : '#fff', borderRadius: '10px', border: '1px solid', borderColor: isSelected ? '#bfdbfe' : '#e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }} onMouseOver={e => e.currentTarget.style.borderColor = isSelected ? '#93c5fd' : '#cbd5e1'} onMouseOut={e => e.currentTarget.style.borderColor = isSelected ? '#bfdbfe' : '#e2e8f0'}>
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedStudentEmails(prev => [...prev, student.email]);
                        else setSelectedStudentEmails(prev => prev.filter(email => email !== student.email));
                      }}
                      style={{ width: '20px', height: '20px', accentColor: '#2563eb', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 600, color: isSelected ? '#1e3a8a' : '#1e293b' }}>{student.full_name}</span>
                      <span style={{ fontSize: '0.85rem', color: isSelected ? '#3b82f6' : '#64748b' }}>{student.email}</span>
                    </div>
                  </label>
                );
              })}
              {availableStudents.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '1rem', gridColumn: '1 / -1' }}>
                  No students loaded in the system.
                </div>
              )}
            </div>
          </div>

          {/* Right Pane - Selected Emails List */}
          <div style={{ width: '380px', background: '#f1f5f9', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ padding: '1.75rem 1.5rem 1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ background: '#dbeafe', color: '#1d4ed8', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700 }}>
                  {selectedStudentEmails.length}
                </div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>Selected</h3>
              </div>
              {selectedStudentEmails.length > 0 && (
                <button 
                  onClick={(e) => { e.preventDefault(); setSelectedStudentEmails([]); }}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: '0.35rem 0.75rem', borderRadius: '6px', transition: 'background 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = '#fee2e2'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  Clear All
                </button>
              )}
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1rem 1.5rem' }}>
              {selectedStudentEmails.map(email => (
                <div key={email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '0.65rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}>
                  <span style={{ fontSize: '0.85rem', color: '#334155', wordBreak: 'break-all', fontWeight: 500 }}>{email}</span>
                  <button 
                    onClick={(e) => { e.preventDefault(); setSelectedStudentEmails(prev => prev.filter(e => e !== email)); }}
                    style={{ background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.25rem', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', transition: 'all 0.2s' }}
                    onMouseOver={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                    onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                  >
                    &times;
                  </button>
                </div>
              ))}
              {selectedStudentEmails.length === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#fff', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
                  <Users size={40} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
                  <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0 0 0.5rem 0', fontWeight: 600 }}>No students selected</p>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Use the search box to add students</p>
                </div>
              )}
            </div>
            
            <div style={{ padding: '1.25rem 1.5rem', background: '#fff', borderTop: '1px solid #e2e8f0', boxShadow: '0 -4px 10px rgba(0,0,0,0.02)' }}>
              <button
                onClick={handleConfirm}
                style={{ width: '100%', padding: '0.9rem', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)', transition: 'transform 0.1s' }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'none'}
              >
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
