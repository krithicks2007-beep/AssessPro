import React from 'react';
import {
  Building2,
  User,
  Award,
  Edit3,
  Mail
} from 'lucide-react';

/**
 * Student Profile Tab
 * Shows student academic details, personal info, and assessment metrics.
 */
export default function Profile({
  studentName,
  studentInitials,
  studentRegNo,
  studentYear,
  studentSection,
  studentDept,
  studentDob,
  studentPhone,
  email,
  parsed,
  overallScore,
  testsCompletedCount,
  onRequestEditProfile,
  institution
}) {
  const isBitEmail = (email || '').toLowerCase().endsWith('@bitsathy.ac.in');
  const institutionName = isBitEmail ? 'Bannari Amman Institute of Technology' : (institution || parsed?.institution || 'External Institution');

  return (
    <div className="dashboard-content">
      <div style={{
        background: '#ffffff',
        padding: '1.75rem 2rem',
        borderRadius: '18px',
        border: '1px solid #e5e7eb',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1d72fe, #3b82f6)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              fontWeight: 800,
              boxShadow: '0 6px 16px rgba(29, 114, 254, 0.25)'
            }}>
              {studentInitials}
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
                {studentName}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <span style={{
                  background: '#eff6ff',
                  color: '#1d72fe',
                  border: '1px solid #bfdbfe',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  {studentRegNo}
                </span>
                <span style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  {studentYear}
                </span>
                <span style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  Section {studentSection}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onRequestEditProfile}
            style={{
              padding: '0.65rem 1.1rem',
              background: '#1d72fe',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 4px 12px rgba(29, 114, 254, 0.2)'
            }}
          >
            <Edit3 size={15} />
            <span>Update Profile Info</span>
          </button>
        </div>
      </div>

      {/* Profile Grid Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {/* Card 1: Academic Information */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={18} color="#1d72fe" />
            <span>Academic Details</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Department</span>
              <strong style={{ color: '#1e293b' }}>{studentDept}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Department Code</span>
              <strong style={{ color: '#1d72fe' }}>{parsed?.deptCode ? parsed.deptCode.toUpperCase() : 'CS'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Batch / Academic Year</span>
              <strong style={{ color: '#1e293b' }}>{studentYear}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Assigned Section</span>
              <strong style={{ color: '#1e293b' }}>Section {studentSection}</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Personal Contact Information */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} color="#10b981" />
            <span>Personal & Contact Info</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>{isBitEmail ? 'BIT Institutional Mail' : 'Student Mail ID'}</span>
              <strong style={{ color: '#1e293b' }}>{email}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Register Number / Roll ID</span>
              <strong style={{ color: '#1e293b' }}>{studentRegNo || 'Not specified'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Date of Birth</span>
              <strong style={{ color: '#1e293b' }}>{studentDob || 'Not specified'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Phone / Mobile</span>
              <strong style={{ color: '#1e293b' }}>{studentPhone || 'Not specified'}</strong>
            </div>
          </div>
        </div>

        {/* Card 3: Assessment Summary */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={18} color="#f59e0b" />
            <span>Assessment Metrics</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Overall Cumulative Score</span>
              <strong style={{ color: '#1d72fe', fontSize: '1.15rem' }}>{overallScore}%</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Total Completed Tests</span>
              <strong style={{ color: '#1e293b' }}>{testsCompletedCount} Tests</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Institution</span>
              <strong style={{ color: '#1e293b' }}>{institutionName}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
