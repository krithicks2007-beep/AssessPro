import React, { useState, useEffect } from 'react';
import { User, Phone, Calendar, Hash, Building2, BookOpen, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { parseBitEmail, DEPARTMENT_MAP } from '../../utils/studentParser';

export default function StudentOnboardingModal({ isOpen, onClose, user, studentProfile, onProfileSaved }) {
  if (!isOpen) return null;

  const email = user?.email || '';
  const parsed = parseBitEmail(email);

  const [name, setName] = useState(studentProfile?.full_name || user?.user_metadata?.full_name || parsed?.formattedName || '');
  const [regNo, setRegNo] = useState(studentProfile?.reg_no || parsed?.predictedRegNo || '');
  const [department, setDepartment] = useState(parsed?.department || 'Computer Science and Engineering');
  const [year, setYear] = useState(parsed?.academicYear || 'II Year (Second Year)');
  const [dob, setDob] = useState(studentProfile?.dob || '2005-06-15');
  const [phone, setPhone] = useState(studentProfile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Re-sync states when modal opens or profile changes
  useEffect(() => {
    if (isOpen) {
      if (studentProfile) {
        setName(studentProfile.full_name || studentProfile.name || name);
        setRegNo(studentProfile.reg_no || regNo);
        setDob(studentProfile.dob || dob);
        setPhone(studentProfile.phone || phone);
      }
      setDepartment(parsed?.department || 'Computer Science and Engineering');
      setYear(parsed?.academicYear || 'II Year (Second Year)');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, studentProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!regNo.trim()) {
      setErrorMsg('Register Number is required (e.g. 7376251CS101).');
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
        name,
        email,
        reg_no: regNo.trim().toUpperCase(),
        department,
        year,
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
            Welcome to AssessPro!
          </h2>
          <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
            Complete your verified BIT student profile to personalize your assessment dashboard.
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
            <span style={{ color: '#64748b', fontWeight: 600 }}>Institutional Mail ID:</span>
            <span style={{ color: '#1d72fe', fontWeight: 700 }}>{email}</span>
          </div>

          {/* Full Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Krithick Raj S"
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
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Register Number <span style={{ color: '#ef4444' }}>*</span>
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

          {/* Department & Year (Auto-detected from email) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Department (Auto-Predicted)
              </label>
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
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Academic Year
              </label>
              <select
                value={year}
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
                <option value="I Year (First Year)">I Year (First Year - 26)</option>
                <option value="II Year (Second Year)">II Year (Second Year - 25)</option>
                <option value="III Year (Third Year)">III Year (Third Year - 24)</option>
                <option value="IV Year (Final Year)">IV Year (Final Year - 23)</option>
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
