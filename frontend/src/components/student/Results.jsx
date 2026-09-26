import React from 'react';
import {
  BarChart2,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';

/**
 * Student Results Tab
 * Shows personal examination results table with score, integrity, and verification status.
 */
export default function Results({
  tests,
  studentSubmissions,
  studentName,
  onNavigateToTests
}) {
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
          Personal Examination Results
        </h2>
        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0' }}>
          Verified scores, accuracy breakdown, and academic integrity proctoring records for {studentName}.
        </p>
      </div>

      {studentSubmissions.length === 0 ? (
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
            background: '#f1f5f9',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            marginBottom: '1rem'
          }}>
            <BarChart2 size={32} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.5rem' }}>
            No Assessment Results Yet
          </h3>
          <p style={{ fontSize: '0.88rem', color: '#64748b', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
            You haven't attempted any assessments yet. Launch a test under the Tests tab to record your results.
          </p>
          <button
            onClick={onNavigateToTests}
            style={{
              padding: '0.65rem 1.25rem',
              background: '#1d72fe',
              color: '#fff',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Go to Tests
          </button>
        </div>
      ) : (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700 }}>
              <tr>
                <th style={{ padding: '0.85rem 1.25rem' }}>Test Name</th>
                <th style={{ padding: '0.85rem 1rem' }}>Score</th>
                <th style={{ padding: '0.85rem 1rem' }}>Percentage</th>
                <th style={{ padding: '0.85rem 1rem' }}>Proctoring</th>
                <th style={{ padding: '0.85rem 1rem' }}>Submitted At</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {studentSubmissions.map((sub, idx) => {
                const relatedTest = tests.find(t => t.id === sub.test_id);
                return (
                  <tr key={sub.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0f172a' }}>
                      {relatedTest?.title || `Assessment #${idx + 1}`}
                    </td>
                    <td style={{ padding: '1rem 1rem', fontWeight: 600 }}>
                      {sub.score} / {sub.max_score}
                    </td>
                    <td style={{ padding: '1rem 1rem' }}>
                      <span style={{
                        fontWeight: 800,
                        color: sub.percentage >= 75 ? '#15803d' : sub.percentage >= 50 ? '#d97706' : '#dc2626'
                      }}>
                        {sub.percentage}%
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1rem' }}>
                      {Number(sub.tab_switch_count) > 0 ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#dc2626', fontSize: '0.78rem', fontWeight: 700 }}>
                          <ShieldAlert size={14} />
                          {sub.tab_switch_count} Tab Switches
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#16a34a', fontSize: '0.78rem', fontWeight: 700 }}>
                          <ShieldCheck size={14} />
                          Clean Session
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1rem', color: '#64748b' }}>
                      {new Date(sub.submitted_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span style={{
                        background: '#dcfce7',
                        color: '#15803d',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '20px',
                        fontSize: '0.74rem',
                        fontWeight: 700
                      }}>
                        Verified
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
