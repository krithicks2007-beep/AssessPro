import React, { useState, useEffect } from 'react';
import { User, Phone, Calendar, Hash, Building2, BookOpen, CheckCircle, ArrowRight, ShieldCheck, X } from 'lucide-react';
import { parseBitEmail, DEPARTMENT_MAP } from '../../utils/studentParser';

export default function StudentOnboardingModal({ isOpen, onClose, user, studentProfile, onProfileSaved }) {
  if (!isOpen) return null;
  return <StudentOnboardingModalInner isOpen={isOpen} onClose={onClose} user={user} studentProfile={studentProfile} onProfileSaved={onProfileSaved} />;
}

function StudentOnboardingModalInner({ isOpen, onClose, user, studentProfile, onProfileSaved }) {

  const email = user?.email || '';
  const isBitDomain = email.toLowerCase().endsWith('@bitsathy.ac.in');
  const parsed = isBitDomain ? parseBitEmail(email) : null;

  const [institution, setInstitution] = useState(
    studentProfile?.institution || (isBitDomain ? 'Bannari Amman Institute of Technology' : '')
  );
  const [name, setName] = useState(
    studentProfile?.name || studentProfile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || parsed?.formattedName || ''
  );
  const [regNo, setRegNo] = useState(studentProfile?.reg_no || (isBitDomain ? parsed?.predictedRegNo : '') || '');
  const [department, setDepartment] = useState(
    studentProfile?.department || (isBitDomain ? (parsed?.department || 'Computer Science and Engineering') : '') || ''
  );
  const [year, setYear] = useState(
    studentProfile?.year || (isBitDomain ? (parsed?.academicYear || 'II Year (Second Year)') : '') || ''
  );
  const [section, setSection] = useState(studentProfile?.section || (isBitDomain ? 'A' : '') || '');
  const [dob, setDob] = useState(studentProfile?.dob || '');
  const [phone, setPhone] = useState(studentProfile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Re-sync states when modal opens or profile changes
  useEffect(() => {
    if (isOpen) {
      if (studentProfile) {
        setInstitution(studentProfile.institution || (isBitDomain ? 'Bannari Amman Institute of Technology' : ''));
        setName(studentProfile.full_name || studentProfile.name || name);
        setRegNo(studentProfile.reg_no || regNo);
        setDepartment(studentProfile.department || department || (isBitDomain ? 'Computer Science and Engineering' : ''));
        setYear(studentProfile.year || year || (isBitDomain ? 'II Year (Second Year)' : ''));
        setSection(studentProfile.section || section || (isBitDomain ? 'A' : ''));
        setDob(studentProfile.dob || dob);
        setPhone(studentProfile.phone || phone);
      } else {
        setInstitution(isBitDomain ? 'Bannari Amman Institute of Technology' : '');
        setDepartment(isBitDomain ? (parsed?.department || 'Computer Science and Engineering') : '');
        setYear(isBitDomain ? (parsed?.academicYear || 'II Year (Second Year)') : '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, studentProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isBitDomain && !institution.trim()) {
      setErrorMsg('Institution name is required.');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!regNo.trim()) {
      setErrorMsg('Register Number or Student ID is required.');
      return;
    }
    if (!department.trim()) {
      setErrorMsg('Department is required.');
      return;
    }
    if (!year.trim()) {
      setErrorMsg('Academic Year is required.');
      return;
    }
    if (!dob) {
      setErrorMsg('Please select your Date of Birth.');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setSaving(true);
    try {
      const profileData = {
        id: user?.id,
        name: name.trim(),
        email,
        institution: isBitDomain ? 'Bannari Amman Institute of Technology' : institution.trim(),
        reg_no: regNo.trim().toUpperCase(),
        department: department.trim(),
        year: year.trim(),
        section: section.trim() || 'A',
        dob,
        phone: phone.trim()
      };

      // Call API or callback
      if (onProfileSaved) {
        await onProfileSaved(profileData);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save student profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        position: 'relative',
        background: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        padding: '2rem'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: '#f1f5f9',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #1d72fe, #3b82f6)',
            borderRadius: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 8px 16px rgba(29, 114, 254, 0.25)',
            marginBottom: '0.75rem'
          }}>
            <ShieldCheck size={28} />
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem' }}>
            Student Profile Details
          </h2>
          <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
            Configure your student credentials and institutional details.
          </p>
        </div>

        {errorMsg && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            fontSize: '0.84rem',
            marginBottom: '1.25rem',
            fontWeight: 500
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* Email badge */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '0.65rem 0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem'
          }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Authenticated Email:</span>
            <span style={{ color: '#1d72fe', fontWeight: 700 }}>{email}</span>
          </div>

          {/* Institution Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Institution / College Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                disabled={isBitDomain}
                required
                placeholder="e.g. Bannari Amman Institute of Technology"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem 0.65rem 2.2rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  background: isBitDomain ? '#f8fafc' : '#ffffff',
                  color: isBitDomain ? '#166534' : '#1e293b',
                  fontWeight: isBitDomain ? 700 : 500,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <Building2 size={16} color={isBitDomain ? '#16a34a' : '#94a3b8'} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
            {isBitDomain && (
              <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 600, marginTop: '2px', display: 'block' }}>
                ✓ Official Institutional Affiliation (@bitsathy.ac.in)
              </span>
            )}
          </div>

          {/* Full Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Full Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Enter your full name"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem 0.65rem 2.2rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {/* Register Number */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Register Number / Roll ID <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  required
                  placeholder="e.g. 7376251CS101"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.2rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <Hash size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Section
              </label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="A / B / C"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Department & Year */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Department <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {isBitDomain ? (
                <select
                  value={department}
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    background: '#f1f5f9',
                    color: '#475569',
                    cursor: 'not-allowed',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  {Object.entries(DEPARTMENT_MAP).map(([code, name]) => (
                    <option key={code} value={name}>
                      {name} ({code.toUpperCase()})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                  placeholder="e.g. Computer Science"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Academic Year <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                disabled={isBitDomain}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  background: isBitDomain ? '#f1f5f9' : '#ffffff',
                  color: isBitDomain ? '#475569' : '#0f172a',
                  cursor: isBitDomain ? 'not-allowed' : 'pointer',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Select Year</option>
                <option value="I Year (First Year)">I Year (First Year)</option>
                <option value="II Year (Second Year)">II Year (Second Year)</option>
                <option value="III Year (Third Year)">III Year (Third Year)</option>
                <option value="IV Year (Final Year)">IV Year (Final Year)</option>
              </select>
            </div>
          </div>

          {/* Date of Birth & Phone Number */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Date of Birth <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.2rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <Calendar size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Phone Number <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="9876543210"
                  maxLength={10}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.2rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <Phone size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: '0.75rem',
              padding: '0.85rem',
              borderRadius: '12px',
              border: 'none',
              background: '#1d72fe',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(29, 114, 254, 0.3)',
              transition: 'background 0.2s'
            }}
          >
            {saving ? 'Saving Profile...' : (
              <>
                <span>Save Profile & Open My Dashboard</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
