import React from 'react';
import {
  Clock,
  HelpCircle,
  Calendar,
  Users,
  Plus
} from 'lucide-react';

/**
 * Staff Tests Tab
 * Shows all tests with group badge, status, and view submissions button.
 */
export default function Tests({ tests, onCreateTest, onViewSubmissions }) {
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
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Assessment & Test Management
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            Manage scheduled MCQs, time slots, and view student marks with tab-switch anti-cheating tracking.
          </p>
        </div>

        <button
          className="btn-create-test"
          onClick={onCreateTest}
          style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}
        >
          <Plus size={16} />
          <span>New Test</span>
        </button>
      </div>

      {/* Test Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {tests.map((t, idx) => (
          <div key={t.id || idx} style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e5e7eb',
            padding: '1.35rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <span style={{
                  background: t.groups?.color ? `${t.groups.color}15` : '#eff6ff',
                  color: t.groups?.color || '#1d72fe',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.74rem',
                  fontWeight: 700
                }}>
                  Group {t.groups?.group_number || t.group_number || 1}: {t.groups?.name || 'Core'}
                </span>
                <span className="status-pill-published" style={{ fontSize: '0.72rem' }}>
                  {t.status || 'Published'}
                </span>
              </div>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', marginBottom: '0.65rem', lineHeight: 1.35 }}>
                {t.title}
              </h3>

              <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Clock size={15} color="#1d72fe" />
                  <span>Duration: <strong>{t.duration_minutes || 30} Minutes</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <HelpCircle size={15} color="#10b981" />
                  <span>Questions: <strong>{t.total_questions || t.questions?.length || 10} MCQs ({t.max_score || 100} Marks)</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Calendar size={15} color="#f59e0b" />
                  <span>Starts: <strong>{t.start_time ? new Date(t.start_time).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'Available Immediately'}</strong></span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onViewSubmissions(t)}
              style={{
                width: '100%',
                padding: '0.65rem',
                borderRadius: '8px',
                border: '1px solid #1d72fe',
                background: '#eff6ff',
                color: '#1d72fe',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem'
              }}
            >
              <Users size={16} />
              <span>View Student Marks & Submissions</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
