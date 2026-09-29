import React, { useState, useEffect } from 'react';
import { User, Phone, Building2, BookOpen, Briefcase, Hash, MapPin, Award, X, CheckCircle } from 'lucide-react';

const DEPARTMENTS = [
  'Computer Science and Engineering',
  'Information Technology',
  'Artificial Intelligence and Data Science',
  'Electronics and Communication Engineering',
  'Electrical and Electronics Engineering',
  'Mechanical Engineering',
  'Mechatronics Engineering',
  'Civil Engineering',
  'Biotechnology',
  'Biomedical Engineering',
  'Science & Humanities',
  'Other / Custom'
];

const DESIGNATIONS = [
  'Assistant Professor',
  'Associate Professor',
  'Professor',
  'Head of the Department (HoD)',
  'Dean / Academic Director',
  'Visiting Faculty / Lecturer'
];

export default function StaffOnboardingModal(props) {
  if (!props.isOpen) return null;
  return <StaffOnboardingModalInner {...props} />;
}

function StaffOnboardingModalInner({ onClose, user, staffProfile, onProfileSaved }) {
  const email = user?.email || '';
  const isBitDomain = email.toLowerCase().endsWith('@bitsathy.ac.in');

  const [name, setName] = useState(
    staffProfile?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || email.split('@')[0] || ''
  );
  const [department, setDepartment] = useState(
    staffProfile?.department || 'Computer Science and Engineering'
  );
  const [customDept, setCustomDept] = useState('');
  const [designation, setDesignation] = useState(
    staffProfile?.designation || 'Assistant Professor'
  );
  const [staffCode, setStaffCode] = useState(
    staffProfile?.staff_code || staffProfile?.staffCode || `FAC-${(user?.id || 'NEW').slice(-4).toUpperCase()}`
  );
  const [institution, setInstitution] = useState(
    staffProfile?.institution || (isBitDomain ? 'Bannari Amman Institute of Technology' : '')
  );
  const [phone, setPhone] = useState(staffProfile?.phone || '');
  const [specialization, setSpecialization] = useState(staffProfile?.specialization || '');
  const [officeLocation, setOfficeLocation] = useState(staffProfile?.office_location || '');
  
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (staffProfile) {
      if (staffProfile.name) setName(staffProfile.name);
      if (staffProfile.department) {
        if (DEPARTMENTS.includes(staffProfile.department)) {
          setDepartment(staffProfile.department);
        } else {
          setDepartment('Other / Custom');
          setCustomDept(staffProfile.department);
        }
      }
      if (staffProfile.designation) setDesignation(staffProfile.designation);
      if (staffProfile.staff_code) setStaffCode(staffProfile.staff_code);
      if (staffProfile.institution) setInstitution(staffProfile.institution);
      if (staffProfile.phone) setPhone(staffProfile.phone);
      if (staffProfile.specialization) setSpecialization(staffProfile.specialization);
      if (staffProfile.office_location) setOfficeLocation(staffProfile.office_location);
    }
  }, [staffProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const resolvedDept = department === 'Other / Custom' ? customDept.trim() : department;

    if (!name.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!resolvedDept) {
      setErrorMsg('Please select or enter your Department.');
      return;
    }
    if (!staffCode.trim()) {
      setErrorMsg('Staff / Faculty ID is required.');
      return;
    }
    if (!institution.trim()) {
      setErrorMsg('Institution name is required.');
      return;
    }

    setSaving(true);
    try {
      const profileData = {
        id: user?.id,
        email,
        name: name.trim(),
        department: resolvedDept,
        designation: designation.trim(),
        staff_code: staffCode.trim().toUpperCase(),
        institution: institution.trim(),
        phone: phone.trim() || null,
        specialization: specialization.trim() || null,
        office_location: officeLocation.trim() || null,
        is_complete: true
      };

      if (onProfileSaved) {
        await onProfileSaved(profileData);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save faculty profile.');
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
        maxWidth: '580px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(to right, #ffffff, #f8fafc)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#eff6ff',
              color: '#1d72fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Briefcase size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {staffProfile?.is_complete ? 'Edit Faculty Profile' : 'Complete Faculty Profile'}
              </h2>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Set your department and teaching credentials
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: '0.4rem',
                borderRadius: '8px'
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.75rem 2rem' }}>
          {errorMsg && (
            <div style={{
              padding: '0.75rem 1rem',
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              fontSize: '0.85rem',
              marginBottom: '1.25rem'
            }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                Full Name *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="#94a3b8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Poongodi Siva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.8rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    background: '#fff'
                  }}
                />
              </div>
            </div>

            {/* Department */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                Department *
              </label>
              <div style={{ position: 'relative' }}>
                <BookOpen size={18} color="#94a3b8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.8rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    background: '#fff'
                  }}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              {department === 'Other / Custom' && (
                <input
                  type="text"
                  placeholder="Enter your department name..."
                  value={customDept}
                  onChange={(e) => setCustomDept(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '0.5rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem'
                  }}
                />
              )}
            </div>

            {/* Grid 2 Column: Designation & Staff ID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                  Designation *
                </label>
                <div style={{ position: 'relative' }}>
                  <Award size={18} color="#94a3b8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <select
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.8rem 0.75rem 2.6rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      background: '#fff'
                    }}
                  >
                    {DESIGNATIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                  Staff / Faculty ID *
                </label>
                <div style={{ position: 'relative' }}>
                  <Hash size={18} color="#94a3b8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. FAC-102"
                    value={staffCode}
                    onChange={(e) => setStaffCode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.8rem 0.75rem 2.6rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      background: '#fff',
                      textTransform: 'uppercase'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Institution */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                Institution / College *
              </label>
              <div style={{ position: 'relative' }}>
                <Building2 size={18} color="#94a3b8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Bannari Amman Institute of Technology"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.8rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    background: '#fff'
                  }}
                />
              </div>
            </div>

            {/* Phone & Office Location */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                  Mobile / Contact
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={18} color="#94a3b8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="tel"
                    placeholder="10-digit number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.8rem 0.75rem 2.6rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      background: '#fff'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                  Cabin / Office Location
                </label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={18} color="#94a3b8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="e.g. Mech Block, Room 204"
                    value={officeLocation}
                    onChange={(e) => setOfficeLocation(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.8rem 0.75rem 2.6rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      background: '#fff'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Area of Specialization */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                Area of Specialization / Subjects Handled
              </label>
              <input
                type="text"
                placeholder="e.g. Data Structures, Control Systems, Machine Learning"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.92rem',
                  background: '#fff'
                }}
              />
            </div>
          </div>

          {/* Action Button */}
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.75rem 2rem',
                borderRadius: '10px',
                border: 'none',
                background: '#1d72fe',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(29, 114, 254, 0.3)'
              }}
            >
              {saving ? 'Saving...' : 'Save Profile'}
              <CheckCircle size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
