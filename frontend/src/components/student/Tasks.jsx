import React from 'react';
import { CheckSquare } from 'lucide-react';

/**
 * Student Tasks Tab
 * Shows practical tasks and mini-projects for the student's department.
 */
export default function Tasks({ studentDept }) {
  return (
    <div className="dashboard-content">
      <div style={{
        background: '#ffffff',
        padding: '1.25rem 1.75rem',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
          Practical Tasks & Mini-Projects
        </h2>
        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0' }}>
          Coursework laboratory demonstrations and project submissions for {studentDept}.
        </p>
      </div>

      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '3rem 2rem',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: '#eff6ff',
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#1d72fe',
          marginBottom: '1rem'
        }}>
          <CheckSquare size={32} />
        </div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.5rem' }}>
          No Pending Coursework Tasks
        </h3>
        <p style={{ fontSize: '0.88rem', color: '#64748b', maxWidth: '420px', margin: '0 auto' }}>
          All practical assignments are up to date. New task assignments posted by faculty will appear here.
        </p>
      </div>
    </div>
  );
}
