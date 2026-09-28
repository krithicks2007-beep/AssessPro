import React from 'react';
import {
  Building2,
  User,
  Award,
  Edit3,
  Mail,
  Phone,
  Briefcase,
  Hash,
  MapPin,
  BookOpen,
  FileText,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function StaffProfile({
  facultyName,
  facultyDept,
  facultyDesignation,
  facultyStaffCode,
  facultyPhone,
  facultyInstitution,
  facultySpecialization,
  facultyOffice,
  email,
  totalTestsCount = 0,
  activeTestsCount = 0,
  groupsCount = 0,
  onRequestEditProfile
}) {
  const initials = (facultyName || 'Faculty')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'FA';

  return (
    <div className="dashboard-content" style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Profile Header Banner */}
      <div style={{
        background: '#ffffff',
        padding: '2rem',
        borderRadius: '18px',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{
              width: '82px',
              height: '82px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1d72fe, #3b82f6)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 800,
              boxShadow: '0 8px 20px rgba(29, 114, 254, 0.25)',
              flexShrink: 0
            }}>
              {initials}
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.4rem' }}>
                {facultyName}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <span style={{
                  background: '#eff6ff',
                  color: '#1d72fe',
                  border: '1px solid #bfdbfe',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}>
                  {facultyStaffCode || 'STAFF'}
                </span>
                <span style={{
                  background: '#f8fafc',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 600
                }}>
                  {facultyDesignation || 'Assistant Professor'}
                </span>
                <span style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 600
                }}>
                  {facultyDept}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onRequestEditProfile}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <Edit3 size={16} color="#1d72fe" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', color: '#1d72fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Created Assessments</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{totalTestsCount}</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Active / Live Tests</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{activeTestsCount}</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Assigned Subject Groups</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{groupsCount}</div>
          </div>
        </div>
      </div>

      {/* Profile Details Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Academic & Teaching Details */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1.75rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={18} color="#1d72fe" />
            <span>Academic & Department Info</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Department</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginTop: '0.15rem' }}>{facultyDept}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Designation</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginTop: '0.15rem' }}>{facultyDesignation || 'Assistant Professor'}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Institution / University</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginTop: '0.15rem' }}>{facultyInstitution || 'Bannari Amman Institute of Technology'}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Faculty / Staff Code</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginTop: '0.15rem' }}>{facultyStaffCode || 'FAC-101'}</div>
            </div>
          </div>
        </div>

        {/* Contact & Specialization */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1.75rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} color="#1d72fe" />
            <span>Contact & Specialization</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Email Address</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginTop: '0.15rem', wordBreak: 'break-all' }}>{email}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Phone Number</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginTop: '0.15rem' }}>{facultyPhone || 'Not specified'}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Cabin / Office Location</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginTop: '0.15rem' }}>{facultyOffice || 'Academic Block'}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Area of Specialization</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginTop: '0.15rem' }}>{facultySpecialization || 'Core Engineering & Computing Sciences'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
