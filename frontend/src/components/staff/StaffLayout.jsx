import React, { useState, useEffect } from 'react';
import {
  Home,
  FilePlus,
  ListOrdered,
  HelpCircle,
  BarChart2,
  Users,
  FileText,
  User,
  LogOut,
  Bell,
  ChevronDown,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../../api';
import ViewSubmissionsModal from './ViewSubmissionsModal';
import ConfigureTestPage from './ConfigureTestPage';
import StaffProfile from './StaffProfile';
import StaffOnboardingModal from './StaffOnboardingModal';

// Tab Components
import Dashboard from './Dashboard';
import Tests from './Tests';
import GroupsModal from './Groups';
import Students from './Students';

export default function StaffLayout({ user, onSignOut, initialTab = 'Dashboard' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [academicYear, setAcademicYear] = useState('Academic Year 2025 - 2026');

  // Live Database States
  const [groups, setGroups] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);

  // Staff Profile & Onboarding States
  const [staffProfile, setStaffProfile] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Modals
  const [isManageGroupsOpen, setIsManageGroupsOpen] = useState(false);
  const [selectedTestForSubmissions, setSelectedTestForSubmissions] = useState(null);

  // Group Form States
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('Core Subjects');

  // Test Form States
  const [newTestGroupId, setNewTestGroupId] = useState('');

  const facultyName = staffProfile?.name 
    || staffProfile?.full_name 
    || user?.user_metadata?.full_name 
    || user?.user_metadata?.name 
    || (user?.email ? user.email.split('@')[0] : 'Faculty Member');

  const facultyDept = staffProfile?.department || 'Select Department';
  const facultyDesignation = staffProfile?.designation || 'Faculty';
  const facultyStaffCode = staffProfile?.staff_code || staffProfile?.staffCode || 'STAFF';
  const facultyPhone = staffProfile?.phone || '';
  const facultyInstitution = staffProfile?.institution || (user?.email?.endsWith('@bitsathy.ac.in') ? 'Bannari Amman Institute of Technology' : '');
  const facultySpecialization = staffProfile?.specialization || '';
  const facultyOffice = staffProfile?.office_location || '';
  const groupColors = ['#1d72fe', '#10b981', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4'];

  const loadData = async () => {
    try {
      const [fetchedGroups, fetchedTests, fetchedProfile, fetchedStudents] = await Promise.all([
        api.getGroups(),
        api.getTests({ staffEmail: user?.email, staffId: user?.id }),
        api.getStaffProfile(user?.email),
        api.getAllStudents()
      ]);
      setGroups(fetchedGroups || []);
      setTests(fetchedTests || []);
      setTotalStudentsCount(Array.isArray(fetchedStudents) ? fetchedStudents.length : 0);

      if (fetchedProfile) {
        setStaffProfile(fetchedProfile);
        // Only show onboarding if profile is genuinely new — no department and no staff code set yet
        const hasSetUpProfile =
          fetchedProfile.department &&
          fetchedProfile.department !== 'Select Department' &&
          fetchedProfile.staff_code;
        if (!hasSetUpProfile) {
          setShowOnboarding(true);
        }
      } else {
        // Brand new staff with zero profile data — prompt setup
        setShowOnboarding(true);
      }

      if (fetchedGroups && fetchedGroups.length > 0 && !newTestGroupId) {
        setNewTestGroupId(fetchedGroups[0].id);
      }
    } catch (err) {
      console.error('Error loading live data:', err);
    }
  };

  // Load live groups and tests from backend API
  useEffect(() => {
    loadData();
  }, []);

  // Helper for flash messages
  const notifySuccess = (msg) => {
    setActionSuccess(msg);
    setActionError('');
    setTimeout(() => setActionSuccess(''), 3000);
  };

  const notifyError = (msg) => {
    setActionError(msg);
    setActionSuccess('');
    setTimeout(() => setActionError(''), 4000);
  };

  // Group Handlers
  const handleStartRename = (group) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
  };

  const handleSaveRename = async (groupId) => {
    try {
      await api.updateGroupName(groupId, editingGroupName);
      setEditingGroupId(null);
      notifySuccess('Group name updated successfully! Synced across all students.');
      await loadData();
    } catch (err) {
      notifyError(err.message || 'Failed to update group name');
    }
  };

  const handleCancelRename = () => setEditingGroupId(null);

  const handleAddNewGroup = async (e) => {
    e.preventDefault();
    try {
      await api.createGroup({
        name: newGroupName,
        category: newGroupCategory,
        department: facultyDept
      });
      setNewGroupName('');
      notifySuccess('New group created! Live gauges and student views updated.');
      await loadData();
    } catch (err) {
      notifyError(err.message || 'Failed to create group');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group? Tests under this group will also be affected.')) return;
    try {
      await api.deleteGroup(groupId);
      notifySuccess('Group removed.');
      await loadData();
    } catch (err) {
      notifyError(err.message || 'Failed to delete group');
    }
  };

  const [selectedDraftTest, setSelectedDraftTest] = useState(null);

  // Test Creation Flow (Draft)
  const handleCreateDraft = async () => {
    const title = window.prompt("Enter the name for the new assessment:");
    if (!title || !title.trim()) return;

    try {
      const validGroupId = (groups && groups[0]?.id) || newTestGroupId;
      await api.createTest({
        title: title.trim(),
        groupId: validGroupId,
        status: 'draft',
        questions: [],
        userId: user?.id,
        userEmail: user?.email,
        created_by: user?.id,
        created_by_email: user?.email
      });
      notifySuccess('Draft assessment created! Configure it to launch.');
      await loadData();
    } catch (err) {
      notifyError(err.message || 'Failed to create draft test');
    }
  };

  const handleUpdateTest = async (payload) => {
    try {
      // payload will include status: 'published' or 'draft'
      await api.updateTest(selectedDraftTest.id, {
        ...payload,
        userId: user?.id,
        userEmail: user?.email,
        created_by: user?.id,
        created_by_email: user?.email
      });
      setSelectedDraftTest(null);
      notifySuccess(payload.status === 'published' ? 'Assessment launched and deployed to students!' : 'Draft saved for later.');
      await loadData();
    } catch (err) {
      notifyError(err.message || 'Failed to update test');
      throw err;
    }
  };

  const handleQuickLaunch = async (test) => {
    try {
      await api.updateTest(test.id, { ...test, status: 'published' });
      notifySuccess('Assessment launched and deployed to students!');
      await loadData();
    } catch (err) {
      notifyError(err.message || 'Failed to launch test');
    }
  };

  const handleDeleteTest = async (testId, keepData) => {
    try {
      // Optimistically remove from state so the card immediately vanishes
      setTests(prev => prev.filter(t => String(t.id) !== String(testId)));
      await api.deleteTest(testId, keepData);
      notifySuccess(keepData ? 'Assessment card removed. Performance scores retained.' : 'Assessment and all associated student submission data deleted!');
      await loadData();
    } catch (err) {
      notifyError(err.message || 'Failed to delete test');
    }
  };

  const safeGroups = Array.isArray(groups) ? groups : [];

  const myStaffEmail = (user?.email || '').toLowerCase().trim();
  const myStaffId = user?.id;

  // Strict isolation: only show tests created by THIS faculty member
  const safeTests = Array.isArray(tests)
    ? tests.filter(t => {
        const matchesEmail = t.created_by_email && t.created_by_email.toLowerCase() === myStaffEmail;
        const matchesUserEmail = t.userEmail && t.userEmail.toLowerCase() === myStaffEmail;
        const matchesId = myStaffId && String(t.created_by) === String(myStaffId);
        return matchesEmail || matchesUserEmail || matchesId;
      })
    : [];

  // KPI Calculations from live data
  const totalTestsCount = safeTests.length;
  const publishedCount = safeTests.filter(t => t.status === 'published' || t.status === 'completed').length;
  const draftCount = safeTests.filter(t => t.status === 'draft').length;
  const activeTestsCount = safeTests.filter(t => t.status === 'published').length;

  // Sidebar navigation items
  const navItems = [
    { label: 'Dashboard', icon: Home },
    { label: 'Manage Groups', icon: ListOrdered },
    { label: 'Tests', icon: FileText },
    { label: 'Question Bank', icon: HelpCircle },
    { label: 'Results', icon: BarChart2 },
    { label: 'Students', icon: Users },
    { label: 'Reports', icon: FileText },
    { label: 'Profile', icon: User },
  ];

  return (
    <div className="layout-wrapper">
      {/* Sidebar matching Screenshot 1 */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <span style={{ fontSize: '1.1rem' }}>🎓</span>
          </div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-title">AssessPro</span>
            <span className="sidebar-logo-sub">Online Test Platform</span>
          </div>
        </div>

        {/* Profile in Sidebar */}
        <div
          className="sidebar-profile"
          onClick={() => setShowOnboarding(true)}
          style={{ cursor: 'pointer' }}
          title="Click to edit your profile"
        >
          <div className="sidebar-avatar">
            {(facultyName || 'F').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || '👨‍🏫'}
          </div>
          <div className="sidebar-profile-name">{facultyName}</div>
          <div className="sidebar-profile-role">{facultyDesignation}</div>
          <div className="sidebar-profile-dept" style={facultyDept === 'Select Department' ? { color: '#f97316', fontWeight: 700 } : {}}>
            {facultyDept === 'Select Department' ? '⚠️ Set up your profile' : facultyDept}
          </div>
        </div>

        {/* Nav list */}
        <nav className="sidebar-nav">
          {navItems.map(({ label, icon: Icon, specialStyle }) => {
            // For special links, e.g., 'Manage Groups' and 'Create Test', we open modals instead
            const onClick = () => {
              if (label === 'Create Test') {
                handleCreateDraft();
              } else {
                setActiveTab(label);
              }
            };

            return (
              <button
                key={label}
                onClick={onClick}
                className={`nav-link ${activeTab === label ? 'active' : ''}`}
                style={specialStyle && activeTab === label ? {
                  background: '#ffffff',
                  color: '#1d72fe',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                } : {}}
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-logout">
          <button className="nav-link" onClick={onSignOut} style={{ color: '#ef4444' }}>
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-wrapper">
        {/* Top Header */}
        {!selectedDraftTest && (
          <header className="top-header">
            <div className="header-left">
              <h1 className="header-title">Faculty Dashboard</h1>
              <p className="header-greeting">Welcome back, {facultyName}!</p>
            </div>

            <div className="header-right">
              <div className="notification-btn" title={draftCount > 0 ? `${draftCount} Draft Assessment${draftCount > 1 ? 's' : ''}` : 'No Notifications'}>
                <Bell size={17} />
                {draftCount > 0 && <span className="notification-badge">{draftCount}</span>}
              </div>

              <div
                className="dept-pill"
                onClick={() => setShowOnboarding(true)}
                title="Click to edit your profile"
                style={{ cursor: 'pointer' }}
              >
                {facultyDept === 'Select Department' ? '⚠️ Set Department' : facultyDept}
              </div>
            </div>
          </header>
        )}

        {/* Global Notifications */}
        {actionSuccess && (
          <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, background: '#10b981', color: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
            <CheckCircle2 size={20} />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, background: '#ef4444', color: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
            <AlertCircle size={20} />
            <span>{actionError}</span>
          </div>
        )}

        {/* Active Tab View */}
        {selectedDraftTest ? (
          <ConfigureTestPage
            groups={safeGroups}
            existingTest={selectedDraftTest}
            onBack={() => setSelectedDraftTest(null)}
            onTestCreated={handleUpdateTest}
          />
        ) : activeTab === 'Profile' ? (
          <StaffProfile
            facultyName={facultyName}
            facultyDept={facultyDept}
            facultyDesignation={facultyDesignation}
            facultyStaffCode={facultyStaffCode}
            facultyPhone={facultyPhone}
            facultyInstitution={facultyInstitution}
            facultySpecialization={facultySpecialization}
            facultyOffice={facultyOffice}
            email={user?.email}
            totalTestsCount={totalTestsCount}
            activeTestsCount={activeTestsCount}
            groupsCount={safeGroups.length}
            onRequestEditProfile={() => setShowOnboarding(true)}
          />
        ) : activeTab === 'Students' ? (
          <Students
            facultyName={facultyName}
            facultyId={user?.id}
            allGroups={groups}
            allTests={tests}
          />
        ) : activeTab === 'Tests' ? (
          <Tests
            tests={safeTests}
            onCreateTest={handleCreateDraft}
            onConfigureTest={(t) => setSelectedDraftTest(t)}
            onQuickLaunch={handleQuickLaunch}
            onViewSubmissions={setSelectedTestForSubmissions}
            onDeleteTest={handleDeleteTest}
          />
        ) : activeTab === 'Manage Groups' ? (
          <GroupsModal
            groups={safeGroups}
            groupColors={groupColors}
            editingGroupId={editingGroupId}
            editingGroupName={editingGroupName}
            setEditingGroupName={setEditingGroupName}
            onStartRename={handleStartRename}
            onSaveRename={handleSaveRename}
            onCancelRename={handleCancelRename}
            onDeleteGroup={handleDeleteGroup}
            newGroupName={newGroupName}
            setNewGroupName={setNewGroupName}
            newGroupCategory={newGroupCategory}
            setNewGroupCategory={setNewGroupCategory}
            facultyDept={facultyDept}
            onAddNewGroup={handleAddNewGroup}
          />
        ) : (
          <Dashboard
            groups={safeGroups}
            tests={safeTests}
            totalTestsCount={totalTestsCount}
            totalStudentsCount={totalStudentsCount}
            publishedCount={publishedCount}
            draftCount={draftCount}
            activeTestsCount={activeTestsCount}
            onManageGroups={() => setActiveTab('Manage Groups')}
            onCreateTest={handleCreateDraft}
            onViewSubmissions={setSelectedTestForSubmissions}
          />
        )}
      </main>

      {/* Modals */}

      <StaffOnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        user={user}
        staffProfile={staffProfile}
        onProfileSaved={async (savedProfile) => {
          try {
            await api.saveStaffProfile({ ...savedProfile, email: user?.email, id: user?.id });
          } catch (e) {
            console.warn('Profile API save failed, using local fallback:', e.message);
          }
          setStaffProfile(savedProfile);
          setShowOnboarding(false);
          await loadData();
          notifySuccess('Profile saved! Your department and details are now updated.');
        }}
      />

      <ViewSubmissionsModal
        isOpen={Boolean(selectedTestForSubmissions)}
        onClose={() => setSelectedTestForSubmissions(null)}
        test={selectedTestForSubmissions}
      />
    </div>
  );
}
