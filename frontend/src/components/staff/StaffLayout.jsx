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
import CreateTestModal from './CreateTestModal';
import ViewSubmissionsModal from './ViewSubmissionsModal';

// Tab Components
import Dashboard from './Dashboard';
import Tests from './Tests';
import GroupsModal from './Groups';

export default function StaffLayout({ user, onSignOut, initialTab = 'Dashboard' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [academicYear, setAcademicYear] = useState('Academic Year 2025 - 2026');

  // Live Database States
  const [groups, setGroups] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Modals
  const [isManageGroupsOpen, setIsManageGroupsOpen] = useState(false);
  const [isCreateTestOpen, setIsCreateTestOpen] = useState(false);
  const [selectedTestForSubmissions, setSelectedTestForSubmissions] = useState(null);

  // Group Form States
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('Core Subjects');

  // Test Form States
  const [newTestGroupId, setNewTestGroupId] = useState('');

  const facultyName = user?.user_metadata?.full_name || 'Dr. Senthilkumar P';
  const facultyDept = 'Mechatronics Engineering';
  const groupColors = ['#1d72fe', '#10b981', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4'];

  // Load live groups and tests from backend API
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedGroups, fetchedTests] = await Promise.all([
        api.getGroups(),
        api.getTests()
      ]);
      setGroups(fetchedGroups || []);
      setTests(fetchedTests || []);
      if (fetchedGroups && fetchedGroups.length > 0 && !newTestGroupId) {
        setNewTestGroupId(fetchedGroups[0].id);
      }
    } catch (err) {
      console.error('Error loading live data:', err);
    } finally {
      setLoading(false);
    }
  };

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

  // Test Creation Handler from CreateTestModal
  const handleCreateNewTest = async (testPayload) => {
    try {
      await api.createTest({
        ...testPayload,
        userId: user?.id
      });
      setIsCreateTestOpen(false);
      notifySuccess('Assessment created & MCQs deployed to students!');
      await loadData();
    } catch (err) {
      notifyError(err.message || 'Failed to create test');
    }
  };

  const safeGroups = Array.isArray(groups) ? groups : [];
  const safeTests = Array.isArray(tests) ? tests : [];

  // KPI Calculations from live data
  const totalTestsCount = safeTests.length || 12;
  const publishedCount = safeTests.filter(t => t.status === 'published' || t.status === 'completed').length || 8;
  const draftCount = safeTests.filter(t => t.status === 'draft').length || 4;
  const activeTestsCount = safeTests.filter(t => t.status === 'published').length || 8;

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
        <div className="sidebar-profile">
          <div className="sidebar-avatar">
            👨‍🏫
          </div>
          <div className="sidebar-profile-name">{facultyName}</div>
          <div className="sidebar-profile-role">Faculty</div>
          <div className="sidebar-profile-dept">{facultyDept}</div>
        </div>

        {/* Nav list */}
        <nav className="sidebar-nav">
          {navItems.map(({ label, icon: Icon, specialStyle }) => {
            // For special links, e.g., 'Manage Groups' and 'Create Test', we open modals instead
            const onClick = () => {
              if (label === 'Create Test') {
                setIsCreateTestOpen(true);
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
        <header className="top-header">
          <div className="header-left">
            <h1 className="header-title">Faculty Dashboard</h1>
            <p className="header-greeting">Welcome back, {facultyName}!</p>
          </div>

          <div className="header-right">
            <div className="select-pill">
              <span>{academicYear}</span>
              <ChevronDown size={14} />
            </div>

            <div className="notification-btn" title="Notifications">
              <Bell size={17} />
              <span className="notification-badge">3</span>
            </div>

            <div className="dept-pill">
              {facultyDept}
            </div>

            <button className="btn-create-test" onClick={() => setIsCreateTestOpen(true)}>
              <FilePlus size={16} />
              <span>Create New Test</span>
            </button>
          </div>
        </header>

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
        {activeTab === 'Tests' ? (
          <Tests
            tests={safeTests}
            onCreateTest={() => setIsCreateTestOpen(true)}
            onViewSubmissions={setSelectedTestForSubmissions}
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
            publishedCount={publishedCount}
            draftCount={draftCount}
            activeTestsCount={activeTestsCount}
            onManageGroups={() => setActiveTab('Manage Groups')}
            onCreateTest={() => setIsCreateTestOpen(true)}
            onViewSubmissions={setSelectedTestForSubmissions}
          />
        )}
      </main>

      {/* Modals */}

      <CreateTestModal
        isOpen={isCreateTestOpen}
        onClose={() => setIsCreateTestOpen(false)}
        groups={groups}
        onTestCreated={handleCreateNewTest}
      />

      <ViewSubmissionsModal
        isOpen={Boolean(selectedTestForSubmissions)}
        onClose={() => setSelectedTestForSubmissions(null)}
        test={selectedTestForSubmissions}
      />
    </div>
  );
}
