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
  AlertCircle,
  Plus,
  Menu,
  X,
  CheckSquare
} from 'lucide-react';
import api from '../../api';
import { getSupabaseClient } from '../../supabaseClient';
import ViewSubmissionsModal from './ViewSubmissionsModal';
import TaskSubmissionsModal from './TaskSubmissionsModal';
import ConfigureTestPage from './ConfigureTestPage';
import StaffProfile from './StaffProfile';
import StaffOnboardingModal from './StaffOnboardingModal';
import CreateTestModal from './CreateTestModal';
import CreateTaskModal from './CreateTaskModal';
import AssignWorkModal from './AssignWorkModal';

// Tab Components
import Dashboard from './Dashboard';
import Tests from './Tests';
import Tasks from './Tasks';
import GroupsModal from './Groups';
import Students from './Students';
import Reports from './Reports';
import LoadingScreen from '../shared/LoadingScreen';
import OfflineBanner from '../shared/OfflineBanner';

export default function StaffLayout({ user, onSignOut, initialTab = 'Dashboard' }) {
  // Check if URL specifies /tasks, #/tasks, or ?tab=Tasks
  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const path = (window.location.pathname || '').toLowerCase();
      const hash = (window.location.hash || '').toLowerCase();
      const search = (window.location.search || '').toLowerCase();
      if (path.includes('task') || hash.includes('task') || search.includes('tasks')) {
        return 'Tasks';
      }
    }
    return initialTab;
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [academicYear, setAcademicYear] = useState('Academic Year 2025 - 2026');

  // Live Database States
  const [groups, setGroups] = useState([]);
  const [tests, setTests] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [totalCollegeStudents, setTotalCollegeStudents] = useState(0);
  const [mappedStudents, setMappedStudents] = useState([]);

  // Staff Profile & Onboarding States
  const [staffProfile, setStaffProfile] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Modals
  const [isManageGroupsOpen, setIsManageGroupsOpen] = useState(false);
  const [selectedTestForSubmissions, setSelectedTestForSubmissions] = useState(null);
  const [selectedTaskForSubmissions, setSelectedTaskForSubmissions] = useState(null);

  // Group Form States
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  
  // Modals state
  const [showCreateTestModal, setShowCreateTestModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('Core Subjects');
  const [newGroupType, setNewGroupType] = useState('test');
  const [showAssignWorkModal, setShowAssignWorkModal] = useState(false);

  // Test Form States
  const [newTestGroupId, setNewTestGroupId] = useState('');

  // Task Form States
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [newTaskGroupId, setNewTaskGroupId] = useState('');

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
      // Load staff profile FIRST and independently — critical for displaying dept/name
      let resolvedProfile = null;
      try {
        const supabase = getSupabaseClient();
        if (supabase && user?.email) {
          const email = user.email.toLowerCase().trim();
          // Try by email lookup (most reliable)
          const { data: userRow } = await supabase
            .from('users')
            .select('id, name, mailid')
            .eq('mailid', email)
            .maybeSingle();
          const lookupId = userRow?.id || user?.id;
          if (lookupId) {
            const { data: staffRow } = await supabase
              .from('staff')
              .select('*')
              .eq('id', lookupId)
              .maybeSingle();
            if (staffRow) {
              resolvedProfile = {
                ...staffRow,
                name: userRow?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || staffRow.staff_name || email.split('@')[0],
                email
              };
            }
          }
        }
      } catch (profileErr) {
        console.warn('[loadData] Supabase staff profile fetch failed:', profileErr.message);
      }

      // Fallback to API if direct Supabase failed
      if (!resolvedProfile && typeof api.getStaffProfile === 'function') {
        try {
          resolvedProfile = await api.getStaffProfile(user?.email);
        } catch (_) {}
      }

      const resolvedName = resolvedProfile?.name 
        || resolvedProfile?.full_name 
        || user?.user_metadata?.full_name 
        || user?.user_metadata?.name 
        || (user?.email ? user.email.split('@')[0] : 'Faculty Member');

      const [fetchedGroups, fetchedTests, fetchedStudents] = await Promise.all([
        // Pass staffId so backend returns ONLY this staff member's groups
        api.getGroups({ staffId: user?.id }),
        api.getTests({ staffEmail: user?.email, staffId: user?.id }),
        // Fetch all students to accurately identify mapped mentees
        api.getAllStudents()
      ]);
      setGroups(fetchedGroups || []);
      setTests(fetchedTests || []);

      const allStuds = Array.isArray(fetchedStudents) ? fetchedStudents : [];
      setTotalCollegeStudents(allStuds.length);

      // Students mapped to this staff member (by ID or by name)
      const mapped = allStuds.filter(s => {
        const matchesId = user?.id && (s.assigned_staff_id === user.id || String(s.assigned_staff_id) === String(user.id));
        const matchesName = resolvedName && s.assigned_staff_name && s.assigned_staff_name.toLowerCase().trim() === resolvedName.toLowerCase().trim();
        return matchesId || matchesName;
      });
      setMappedStudents(mapped);
      setTotalStudentsCount(mapped.length);

      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: fetchedTasks } = await supabase.from('tasks').select('*, groups(*)').eq('created_by', user?.id).order('created_at', { ascending: false });
        
        // Fetch task submissions and test submissions to calculate real submission counts, pending reviews, and uniform averages
        const [taskSubsRes, testSubsRes] = await Promise.all([
          supabase.from('task_submissions').select('*'),
          supabase.from('test_submissions').select('*')
        ]);
        const allTaskSubs = taskSubsRes.data || [];
        const allTestSubs = testSubsRes.data || [];
        const totalCohortCount = allStuds.length || 62;
        
        if (fetchedTasks) {
           fetchedTasks.forEach(t => {
               const taskSubs = allTaskSubs.filter(s => String(s.task_id) === String(t.id));
               
               // Count students who actually submitted work
               const submittedStudents = taskSubs.filter(s => 
                 s.status === 'submitted' || 
                 (s.submission_url && s.submission_url.trim() !== '') || 
                 s.status === 'reviewed' || 
                 s.status === 'graded'
               );
               
               // Count students whose submissions need grading
               const pendingStudents = taskSubs.filter(s => 
                 s.status === 'submitted' || 
                 (!s.score && s.status !== 'reviewed' && s.status !== 'graded')
               );
               
               // Graded submissions with score
               const reviewedSubs = taskSubs.filter(s => 
                 (s.status === 'reviewed' || s.status === 'graded') && s.score != null
               );
               
               t.submissionsCount = submittedStudents.length;
               t.pendingReviewCount = pendingStudents.length;
               t.reviewedCount = reviewedSubs.length;
               t.hasSubmissions = submittedStudents.length > 0;
               
               const assignedCount = (Array.isArray(t.assigned_students) && t.assigned_students.length > 0)
                 ? t.assigned_students.length
                 : totalCohortCount;
               
               const maxScore = t.max_score || 100;
               const maxPossible = assignedCount * maxScore;
               const totalScore = reviewedSubs.reduce((acc, s) => acc + (Number(s.score) || 0), 0);
               
               // Uniform calculation: sum of all student scores / (assignedCount * maxScore) * 100
               t.avg = maxPossible > 0 ? Number(((totalScore / maxPossible) * 100).toFixed(1)) : 0;
               t.clearedCount = reviewedSubs.filter(s => Number(s.score) > 0).length;
               t.totalAssigned = assignedCount;
           });
           setTasks(fetchedTasks || []);
        }

        if (fetchedTests && fetchedTests.length > 0) {
           fetchedTests.forEach(t => {
               const testSubs = allTestSubs.filter(s => String(s.test_id) === String(t.id));
               const completedSubs = testSubs.filter(s => s.status === 'completed' || s.score != null);
               
               t.submissionsCount = completedSubs.length;
               t.hasSubmissions = completedSubs.length > 0;
               
               const assignedCount = (Array.isArray(t.assigned_students) && t.assigned_students.length > 0)
                 ? t.assigned_students.length
                 : totalCohortCount;
               
               const maxScore = t.total_marks || t.max_score || 100;
               const maxPossible = assignedCount * maxScore;
               const totalScore = completedSubs.reduce((acc, s) => acc + (Number(s.score) || 0), 0);
               
               t.avg = maxPossible > 0 ? Number(((totalScore / maxPossible) * 100).toFixed(1)) : 0;
               t.clearedCount = completedSubs.filter(s => Number(s.score) > 0).length;
               t.totalAssigned = assignedCount;
           });
           setTests([...fetchedTests]);
        }
      }

      if (resolvedProfile && resolvedProfile.department) {
        setStaffProfile(resolvedProfile);
        // Only show onboarding if profile is genuinely new — no department and no staff code set yet
        const hasSetUpProfile =
          resolvedProfile.department &&
          resolvedProfile.department !== 'Select Department' &&
          resolvedProfile.staff_code;
        if (!hasSetUpProfile) {
          setShowOnboarding(true);
        }
      } else if (resolvedProfile) {
        // Has profile data but incomplete
        setStaffProfile(resolvedProfile);
        setShowOnboarding(true);
      } else {
        // Brand new staff with zero profile data — prompt setup
        setShowOnboarding(true);
      }

      if (fetchedGroups && fetchedGroups.length > 0 && !newTestGroupId) {
        setNewTestGroupId(fetchedGroups[0].id);
      }
    } catch (err) {
      console.error('Error loading live data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load live groups and tests from backend API
  useEffect(() => {
    loadData();
    // Safety fallback: ensure loading never hangs under any circumstances
    const timer = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(timer);
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

  const [isViewingStudent, setIsViewingStudent] = useState(false);

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
        department: facultyDept,
        group_type: newGroupType,
        created_by: user?.id
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
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState(null);

  const handleCreateDraft = () => {
    setShowCreateTestModal(true);
  };

  const handleAssignTest = (groupId) => {
    setNewTestGroupId(groupId);
    setShowAssignWorkModal(false);
    setShowCreateTestModal(true);
  };

  const handleAssignTask = (groupId) => {
    setNewTaskGroupId(groupId);
    setShowAssignWorkModal(false);
    setShowCreateTaskModal(true);
  };

  const executeCreateTask = async (taskData) => {
    try {
      if (selectedTaskForEdit) {
        const supabase = getSupabaseClient();
        await supabase.from('tasks').update({
          title: taskData.title.trim(),
          description: taskData.description.trim(),
          group_id: taskData.groupId,
          max_score: taskData.maxScore,
          due_date: taskData.dueDate,
          status: taskData.status,
          assigned_students: taskData.assignedStudents
        }).eq('id', selectedTaskForEdit.id);
      } else {
        await api.createTask({
          title: taskData.title.trim(),
          description: taskData.description.trim(),
          group_id: taskData.groupId,
          max_score: taskData.maxScore,
          due_date: taskData.dueDate,
          status: taskData.status,
          created_by: user?.id,
          assigned_students: taskData.assignedStudents
        });
      }
      
      setShowCreateTaskModal(false);
      setSelectedTaskForEdit(null);
      await loadData();
      notifySuccess(taskData.status === 'published' ? 'Task published successfully!' : 'Task draft saved successfully!');
      setActiveTab('Tasks');
    } catch (err) {
      notifyError(err.message || 'Failed to create task');
    }
  };

  const executeCreateTest = async (testData, shouldLaunch) => {
    try {
      const createdTest = await api.createTest({
        title: testData.title.trim(),
        groupId: testData.groupId,
        durationMinutes: testData.durationMinutes,
        status: 'draft',
        questions: [],
        userId: user?.id,
        userEmail: user?.email,
        created_by: user?.id,
        created_by_email: user?.email
      });
      
      setShowCreateTestModal(false);
      await loadData();

      if (shouldLaunch) {
        notifySuccess('Draft created! Proceeding to configuration.');
        // Set it as selected to open ConfigureTestPage immediately
        setSelectedDraftTest(createdTest);
        setActiveTab('Tests');
      } else {
        notifySuccess('Draft assessment saved! It is now in your Tests list.');
        setActiveTab('Tests');
      }
    } catch (err) {
      notifyError(err.message || 'Failed to create test');
    }
  };

  const handleSaveProgress = (testData) => {
    executeCreateTest(testData, false);
  };

  const handleLaunchNow = (testData) => {
    executeCreateTest(testData, true);
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

  const handleCopyTest = async (testToCopy) => {
    try {
      await api.createTest({
        title: testToCopy.title + ' (Copy)',
        groupId: testToCopy.group_id,
        durationMinutes: testToCopy.duration_minutes,
        status: 'draft',
        questions: testToCopy.questions || [],
        testType: testToCopy.test_type,
        maxScore: testToCopy.max_score,
        allowLatecomers: testToCopy.allow_latecomers,
        lateLimitMinutes: testToCopy.late_limit_minutes,
        assignedStudents: testToCopy.assigned_students,
        auto_launch: false,
        userId: user?.id,
        userEmail: user?.email,
        created_by: user?.id,
        created_by_email: user?.email
      });
      notifySuccess('Test cloned successfully as a draft!');
      await loadData();
    } catch (err) {
      notifyError(err.message || 'Failed to copy test');
    }
  };

  const handleCopyTask = async (taskToCopy) => {
    try {
      const supabase = getSupabaseClient();
      const newTask = {
        title: taskToCopy.title + ' (Copy)',
        description: taskToCopy.description,
        group_id: taskToCopy.group_id,
        max_score: taskToCopy.max_score,
        due_date: taskToCopy.due_date,
        status: 'draft',
        created_by: user?.id,
        assigned_students: taskToCopy.assigned_students
      };
      
      const { error } = await supabase.from('tasks').insert([newTask]);
      if (error) throw error;
      
      notifySuccess('Task cloned successfully as a draft!');
      await loadData();
    } catch (err) {
      notifyError(err.message || 'Failed to copy task');
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
      await loadData(); // Reload data to restore the optimistically removed card
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

  const totalTaskSubmissions = tasks.reduce((sum, t) => sum + (t.submissionsCount || 0), 0);
  const totalPendingTaskSubmissions = tasks.reduce((sum, t) => sum + (t.pendingReviewCount || 0), 0);

  const handleSelectTab = (label) => {
    if (label === 'Create Test') {
      handleCreateDraft();
    } else {
      setActiveTab(label);
      setMobileMenuOpen(false);
      if (label === 'Tasks') {
        window.history.replaceState(null, '', '#/tasks');
      } else if (label === 'Dashboard') {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const hash = (window.location.hash || '').toLowerCase();
      const path = (window.location.pathname || '').toLowerCase();
      if (hash.includes('task') || path.includes('task')) {
        setActiveTab('Tasks');
      }
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Sidebar navigation items
  const navItems = [
    { label: 'Dashboard', icon: Home },
    { label: 'Manage Groups', icon: ListOrdered },
    { label: 'Tests', icon: FileText },
    { label: 'Tasks', icon: FileText },
    { label: 'Question Bank', icon: HelpCircle },
    { label: 'Results', icon: BarChart2 },
    { label: 'Students', icon: Users },
    { label: 'Reports', icon: FileText },
    { label: 'Profile', icon: User },
  ];

  if (loading) return <LoadingScreen role="staff" message="Loading your faculty dashboard..." />;

  return (
    <div className="layout-wrapper">
      <OfflineBanner />

      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar matching Screenshot 1 */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
          <div className="sidebar-logo" style={{ paddingBottom: 0 }}>
            <div className="sidebar-logo-icon">
              <span style={{ fontSize: '1.1rem' }}>🎓</span>
            </div>
            <div className="sidebar-logo-text">
              <span className="sidebar-logo-title">AssessPro</span>
              <span className="sidebar-logo-sub">Online Test Platform</span>
            </div>
          </div>
          <button
            className="sidebar-mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            title="Close Menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Profile in Sidebar */}
        <div
          className="sidebar-profile"
          onClick={() => {
            setMobileMenuOpen(false);
            setShowOnboarding(true);
          }}
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
            return (
              <button
                key={label}
                onClick={() => handleSelectTab(label)}
                className={`nav-link ${activeTab === label ? 'active' : ''}`}
                style={specialStyle && activeTab === label ? {
                  background: '#ffffff',
                  color: '#1d72fe',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                } : {}}
              >
                <Icon size={17} />
                <span>{label}</span>
                {label === 'Tasks' && totalPendingTaskSubmissions > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    background: '#ef4444',
                    color: '#ffffff',
                    padding: '1px 7px',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)'
                  }}>
                    {totalPendingTaskSubmissions}
                  </span>
                )}
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
        {/* Top Header (Hidden on Reports page) */}
        {!selectedDraftTest && !isViewingStudent && activeTab !== 'Reports' && (
          <header className="top-header">
            <div className="header-left">
              <div className="header-title-box">
                <h1 className="header-title">Faculty Dashboard</h1>
                <p className="header-greeting">Welcome back, {facultyName}!</p>
              </div>
            </div>

            <div className="header-right">
              <button
                onClick={() => setShowAssignWorkModal(true)}
                title="Assign Work (Tests/Tasks)"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#1d72fe',
                  border: 'none',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(29,114,254,0.35)',
                  flexShrink: 0
                }}
              >
                <Plus size={18} />
              </button>
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
        <div key={selectedDraftTest ? `draft-${selectedDraftTest.id || 'new'}` : activeTab} className="page-transition-enter">
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
              onViewingStudentChange={setIsViewingStudent}
              onMappingChange={loadData}
            />
          ) : activeTab === 'Tests' ? (
            <Tests
              tests={safeTests}
              groups={safeGroups}
              onCreateTest={handleCreateDraft}
              onConfigureTest={(t) => setSelectedDraftTest(t)}
              onQuickLaunch={handleQuickLaunch}
              onViewSubmissions={setSelectedTestForSubmissions}
              onDeleteTest={handleDeleteTest}
              onCopyTest={handleCopyTest}
            />
          ) : activeTab === 'Tasks' ? (
            <Tasks
              tasks={tasks}
              groups={safeGroups}
              onCreateTask={() => {
                setSelectedTaskForEdit(null);
                setShowAssignWorkModal(true);
              }}
              onViewSubmissions={(t) => setSelectedTaskForSubmissions(t)}
              onCopyTask={handleCopyTask}
              onConfigureTask={(t) => {
                setSelectedTaskForEdit(t);
                setShowCreateTaskModal(true);
              }}
              onQuickLaunch={async (t) => {
                try {
                  const supabase = getSupabaseClient();
                  await supabase.from('tasks').update({ status: 'published' }).eq('id', t.id);
                  notifySuccess('Task launched successfully!');
                  await loadData();
                } catch (err) {
                  notifyError('Failed to launch task');
                }
              }}
              onDeleteTask={async (taskId) => {
                try {
                  const supabase = getSupabaseClient();
                  await supabase.from('tasks').delete().eq('id', taskId);
                  setTasks(prev => prev.filter(t => t.id !== taskId));
                  notifySuccess('Task deleted successfully');
                } catch (err) {
                  notifyError('Failed to delete task');
                }
              }}
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
              newGroupType={newGroupType}
              setNewGroupType={setNewGroupType}
              facultyDept={facultyDept}
              onAddNewGroup={handleAddNewGroup}
            />
          ) : activeTab === 'Reports' ? (
            <Reports
              groups={safeGroups}
              tests={safeTests}
              tasks={tasks}
            />
          ) : (
            <Dashboard
              groups={safeGroups}
              tests={safeTests}
              tasks={tasks}
              totalTestsCount={totalTestsCount}
              totalStudentsCount={totalStudentsCount}
              totalCollegeStudentsCount={totalCollegeStudents}
              mappedStudents={mappedStudents}
              publishedCount={publishedCount}
              draftCount={draftCount}
              activeTestsCount={activeTestsCount}
              onManageGroups={() => setActiveTab('Manage Groups')}
              onCreateTest={handleCreateDraft}
              onViewSubmissions={setSelectedTestForSubmissions}
              onNavigateToStudents={(filter) => {
                setActiveTab('Students');
              }}
            />
          )}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="staff-mobile-bottom-nav">
          <button
            type="button"
            onClick={() => handleSelectTab('Dashboard')}
            className={`staff-bottom-nav-item ${activeTab === 'Dashboard' ? 'active' : ''}`}
          >
            <Home size={19} />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('Tasks')}
            className={`staff-bottom-nav-item ${activeTab === 'Tasks' ? 'active' : ''}`}
            style={{ position: 'relative' }}
          >
            <FileText size={19} />
            <span>Tasks</span>
            {totalPendingTaskSubmissions > 0 && (
              <span className="staff-bottom-nav-badge">
                {totalPendingTaskSubmissions}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('Tests')}
            className={`staff-bottom-nav-item ${activeTab === 'Tests' ? 'active' : ''}`}
          >
            <BarChart2 size={19} />
            <span>Tests</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('Students')}
            className={`staff-bottom-nav-item ${activeTab === 'Students' ? 'active' : ''}`}
          >
            <Users size={19} />
            <span>Students</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="staff-bottom-nav-item"
          >
            <Menu size={19} />
            <span>Menu</span>
          </button>
        </nav>
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

      <CreateTestModal
        isOpen={showCreateTestModal}
        onClose={() => setShowCreateTestModal(false)}
        groups={safeGroups}
        onSave={handleSaveProgress}
        onLaunch={handleLaunchNow}
        initialGroupId={newTestGroupId}
        notifyError={notifyError}
      />

      <CreateTaskModal
        isOpen={showCreateTaskModal}
        onClose={() => {
          setShowCreateTaskModal(false);
          setSelectedTaskForEdit(null);
        }}
        groups={safeGroups}
        initialGroupId={newTaskGroupId}
        existingTask={selectedTaskForEdit}
        onSave={(data) => executeCreateTask(data)}
        onLaunch={(data) => executeCreateTask(data)}
        notifyError={notifyError}
      />

      <ViewSubmissionsModal
        isOpen={Boolean(selectedTestForSubmissions)}
        onClose={() => setSelectedTestForSubmissions(null)}
        test={selectedTestForSubmissions}
      />
      
      <TaskSubmissionsModal
        isOpen={Boolean(selectedTaskForSubmissions)}
        onClose={() => {
          setSelectedTaskForSubmissions(null);
          loadData();
        }}
        task={selectedTaskForSubmissions}
        notifySuccess={notifySuccess}
        notifyError={notifyError}
        onSubmissionsUpdated={loadData}
      />

      {showAssignWorkModal && (
        <AssignWorkModal
          groups={safeGroups}
          onClose={() => setShowAssignWorkModal(false)}
          onAssignTest={handleAssignTest}
          onAssignTask={handleAssignTask}
        />
      )}
    </div>
  );
}

