import React, { useState, useEffect, useCallback } from 'react';
import {
  Home,
  FileText,
  CheckSquare,
  BarChart2,
  User,
  LogOut,
  Bell,
  Building2,
  Clock,
  AlertCircle
} from 'lucide-react';
import api from '../../api';
import { getSupabaseClient } from '../../supabaseClient';
import { parseBitEmail, isMasterAccount } from '../../utils/studentParser';
import TestTakingModal from './TestTakingModal';

// Tab Components
import Dashboard from './Dashboard';
import Tests from './Tests';
import Tasks from './Tasks';
import Results from './Results';
import Profile from './Profile';

/**
 * StudentLayout
 * Orchestrator component: holds all shared state, renders sidebar + header,
 * and delegates to the active tab component via props.
 */
export default function StudentLayout({ user, studentProfile, onRequestEditProfile, onSignOut }) {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [groups, setGroups] = useState([]);
  const [tests, setTests] = useState([]);
  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [studentTaskSubmissions, setStudentTaskSubmissions] = useState([]);
  const [assignedStaff, setAssignedStaff] = useState(null);
  const [activeTestTaking, setActiveTestTaking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const notifySuccess = useCallback((msg) => {
    setActionSuccess(msg);
    setActionError('');
    setTimeout(() => setActionSuccess(''), 3000);
  }, []);

  const notifyError = useCallback((msg) => {
    setActionError(msg);
    setActionSuccess('');
    setTimeout(() => setActionError(''), 4000);
  }, []);

  const email = user?.email || '';
  const parsed = parseBitEmail(email);

  const studentName = studentProfile?.name || user?.user_metadata?.full_name || parsed?.formattedName || 'Student';
  const studentDept = studentProfile?.department || parsed?.department || 'Not specified';
  const studentYear = studentProfile?.year || parsed?.academicYear || 'Not specified';
  const studentRegNo = studentProfile?.reg_no || parsed?.predictedRegNo || 'Not specified';
  const studentSection = studentProfile?.section || 'A';
  const studentDob = studentProfile?.dob || 'Not specified';
  const studentPhone = studentProfile?.phone || 'Not specified';

  const studentInitials = studentName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'ST';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const staffInfo = await api.getAssignedStaff(email).catch(() => null);
      setAssignedStaff(staffInfo || null);

      const assignedStaffId = staffInfo?.assigned_staff_id || staffInfo?.staffId || '';

      // Fetch ALL groups and ALL tests
      const [allGroups, allTestsData, sData] = await Promise.all([
        api.getGroups({ all: true }), 
        api.getTests(),
        api.getStudentSubmissions(email)
      ]);
      
      const safeTests = Array.isArray(allTestsData) ? allTestsData : [];
      
      // Determine which tests are effective for this student
      const effectiveTestsFiltered = safeTests.filter(t => {
        if (t.status === 'draft') {
          return false;
        }

        if (Array.isArray(t.assigned_students) && t.assigned_students.length > 0) {
          const cleanEmail = (email || '').toLowerCase().trim();
          return t.assigned_students.some(e => {
            const val = typeof e === 'string' ? e : e?.email || '';
            return val.toLowerCase().trim() === cleanEmail;
          });
        }
        return true;
      });

      // Fetch tasks and task submissions
      const supabase = getSupabaseClient();
      let tData = [];
      let subData = [];
      if (supabase) {
        const [taskRes, subRes] = await Promise.all([
          supabase.from('tasks').select('*, groups(*)').eq('status', 'published').order('created_at', { ascending: false }),
          supabase.from('task_submissions').select('*').eq('student_id', user?.id)
        ]);
        tData = taskRes.data || [];
        subData = subRes.data || [];
      }

      // Find all group IDs that are associated with the effective tests or tasks
      const testGroupIds = new Set(effectiveTestsFiltered.map(t => t.group_id).filter(Boolean));
      const taskGroupIds = new Set(tData.map(t => t.group_id).filter(Boolean));

      // Filter groups: keep if they belong to the student's assigned staff OR if the student has a test/task in them
      const safeGroups = Array.isArray(allGroups) ? allGroups : [];
      const visibleGroups = safeGroups.filter(g => 
        (assignedStaffId && String(g.staff_id) === String(assignedStaffId)) || 
        testGroupIds.has(g.id) ||
        taskGroupIds.has(g.id)
      );

      setGroups(visibleGroups);
      setTests(allTestsData || []);
      setStudentSubmissions(Array.isArray(sData) ? sData : []);
      
      setTasks(tData);
      setStudentTaskSubmissions(subData);
      

    } catch (err) {
      console.error('Error fetching student dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [email]);

  // Real-time 1-second clock ticker for instantaneous test activation
  useEffect(() => {
    const ticker = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  // Load live groups, tests, and student submissions strictly for this user
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-resume active exam if the user refreshed the page during a test
  useEffect(() => {
    if (!loading && tests.length > 0 && !activeTestTaking) {
      const activeExamId = sessionStorage.getItem('active_exam_id');
      if (activeExamId) {
        const testToResume = tests.find(t => String(t.id) === String(activeExamId));
        if (testToResume) {
          setActiveTestTaking(testToResume);
        }
      }
    }
  }, [loading, tests, activeTestTaking]);

  const handleTestCompleted = (submission) => {
    // Update state directly so tests button switches immediately to Submitted and results are instantly visible
    setStudentSubmissions(prev => [
      submission,
      ...prev.filter(s => String(s.test_id) !== String(submission.test_id))
    ]);
  };

  const safeGroups = Array.isArray(groups) ? groups : [];
  const safeTests = Array.isArray(tests) ? tests : [];
  const safeStudentSubmissions = Array.isArray(studentSubmissions) ? studentSubmissions : [];

  const isDemoMaster = isMasterAccount(email);

  // Filter tests (same logic as inside loadData, kept here for dynamic render consistency)
  const effectiveTests = safeTests.filter(t => {
    if (t.status === 'draft') return false;
    if (Array.isArray(t.assigned_students) && t.assigned_students.length > 0) {
      const cleanEmail = (email || '').toLowerCase().trim();
      return t.assigned_students.some(e => {
        const val = typeof e === 'string' ? e : e?.email || '';
        return val.toLowerCase().trim() === cleanEmail;
      });
    }
    return true;
  });

  const effectiveTasks = (tasks || []).filter(t => {
    if (t.status === 'draft') return false;
    if (Array.isArray(t.assigned_students) && t.assigned_students.length > 0) {
      const cleanEmail = (email || '').toLowerCase().trim();
      return t.assigned_students.some(e => {
        const val = typeof e === 'string' ? e : e?.email || '';
        return val.toLowerCase().trim() === cleanEmail;
      });
    }
    return true;
  });

  // Strict Rule calculations for individual students (penalizes missed deadlines with 0%)
  const completedTestSubs = safeStudentSubmissions.filter(s => s.status === 'completed');
  
  // Tests passed deadline without submission
  const pastTests = effectiveTests.filter(t => t.end_time && new Date(t.end_time).getTime() < Date.now());
  const missedTestsCount = pastTests.filter(t => !completedTestSubs.some(s => String(s.test_id) === String(t.id))).length;
  const gradedTestsCount = completedTestSubs.length + missedTestsCount;
  
  const totalTestScore = completedTestSubs.reduce((acc, s) => acc + Number(s.percentage || 0), 0);
  const strictTestAverage = gradedTestsCount > 0 ? Math.round(totalTestScore / gradedTestsCount) : 0;

  // Tasks passed deadline without submission
  const pastTasks = effectiveTasks.filter(t => t.due_date && new Date(t.due_date).getTime() < Date.now());
  const completedTaskSubs = (studentTaskSubmissions || []).filter(s => s.status === 'reviewed');
  const missedTasksCount = pastTasks.filter(t => !completedTaskSubs.some(s => String(s.task_id) === String(t.id))).length;
  
  const gradedTasksCount = completedTaskSubs.length + missedTasksCount;
  const totalTaskScore = completedTaskSubs.reduce((acc, s) => {
    const max = effectiveTasks.find(t => t.id === s.task_id)?.max_score || 100;
    return acc + ((s.score / max) * 100);
  }, 0);
  
  const strictTaskAverage = gradedTasksCount > 0 ? Math.round(totalTaskScore / gradedTasksCount) : 0;

  // Overall Strict Score (50/50 split)
  let realOverallScore = 0;
  if (gradedTestsCount > 0 && gradedTasksCount > 0) {
    realOverallScore = Math.round((strictTestAverage + strictTaskAverage) / 2);
  } else if (gradedTestsCount > 0) {
    realOverallScore = strictTestAverage;
  } else if (gradedTasksCount > 0) {
    realOverallScore = strictTaskAverage;
  }

  const overallScore = realOverallScore;
  const testsCompletedCount = completedTestSubs.length;

  // Notification bell: only count tests that the student has NOT attended yet
  const pendingTests = effectiveTests.filter(t => 
    !safeStudentSubmissions.some(s => 
      (s.test_id && String(s.test_id).trim() === String(t.id).trim()) ||
      (s.test_title && t.title && s.test_title.trim().toLowerCase() === t.title.trim().toLowerCase())
    )
  );
  const pendingCount = pendingTests.length;

  // Sidebar navigation items matching screenshot
  const navItems = [
    { label: 'Dashboard', icon: Home },
    { label: 'My Tests', icon: FileText },
    { label: 'Test History', icon: Clock },
    { label: 'Tasks', icon: CheckSquare },
    { label: 'My Performance', icon: BarChart2 },
    { label: 'Profile', icon: User },
  ];

  // Render active tab
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'My Tests':
      case 'Tests':
        return (
          <Tests
            tests={effectiveTests}
            studentSubmissions={safeStudentSubmissions}
            currentTime={currentTime}
            onLaunchTest={setActiveTestTaking}
          />
        );
      case 'Test History':
      case 'My Performance':
      case 'Results':
        return (
          <Results
            tests={effectiveTests}
            studentSubmissions={safeStudentSubmissions}
            studentName={studentName}
            email={email}
            isDemoMaster={isDemoMaster}
            onNavigateToTests={() => setActiveTab('My Tests')}
          />
        );
      case 'Tasks':
        return (
          <Tasks 
            studentDept={studentDept} 
            tasks={effectiveTasks}
            studentSubmissions={studentTaskSubmissions}
            studentEmail={email}
            studentId={user?.id}
            onSubmissionSuccess={() => loadData()}
            onStartTask={(task) => setActiveTestTaking(task)}
            notifySuccess={notifySuccess}
            notifyError={notifyError}
          />
        );
      case 'Profile':
        return (
          <Profile
            studentName={studentName}
            studentInitials={studentInitials}
            studentRegNo={studentRegNo}
            studentYear={studentYear}
            studentSection={studentSection}
            studentDept={studentDept}
            studentDob={studentDob}
            studentPhone={studentPhone}
            email={email}
            parsed={parsed}
            overallScore={overallScore}
            testsCompletedCount={testsCompletedCount}
            onRequestEditProfile={onRequestEditProfile}
            institution={studentProfile?.institution}
          />
        );
      case 'Dashboard':
      default:
        return (
          <Dashboard
            groups={safeGroups}
            tests={effectiveTests}
            tasks={effectiveTasks}
            studentSubmissions={safeStudentSubmissions}
            studentTaskSubmissions={studentTaskSubmissions}
            studentName={studentName}
            studentDept={studentDept}
            studentYear={studentYear}
            overallScore={overallScore}
            testsCompletedCount={testsCompletedCount}
            pendingCount={pendingCount}
            assignedStaff={assignedStaff}
            onNavigateToTests={() => setActiveTab('My Tests')}
          />
        );
    }
  };

  return (
    <div className="layout-wrapper">
      {/* Student Sidebar */}
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
            {studentInitials}
          </div>
          <div className="sidebar-profile-name">{studentName}</div>
          <div className="sidebar-profile-role">Student</div>
          <div className="sidebar-profile-dept">{studentDept}</div>
        </div>

        {/* Nav list */}
        <nav className="sidebar-nav">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-link ${activeTab === label ? 'active' : ''}`}
              onClick={() => setActiveTab(label)}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-logout">
          <button className="nav-link" onClick={onSignOut} style={{ color: '#ef4444' }}>
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Student Panel */}
      <main className="main-wrapper">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <h1 className="header-title">Student Dashboard</h1>
            <p className="header-greeting">Welcome, {studentName}! Personal assessment and progress portal.</p>
          </div>

          <div className="header-right">
            <div className="notification-btn" title={pendingCount > 0 ? `${pendingCount} Pending Assessment${pendingCount > 1 ? 's' : ''}` : 'No Pending Assessments'} style={{ position: 'relative' }}>
              <Bell size={18} />
              {pendingCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #ffffff'
                }}>
                  {pendingCount}
                </span>
              )}
            </div>

            {/* Department & Year Info Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '24px',
              padding: '0.45rem 1rem',
              fontSize: '0.84rem',
              fontWeight: 700,
              color: '#1e293b',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              cursor: 'default'
            }}>
              <span>{studentYear} - {studentDept}</span>
            </div>
          </div>
        </header>

        {/* Active Tab Content */}
        <div className="dashboard-content">
          {loading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60vh',
              gap: '1.25rem',
              color: '#64748b'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: '4px solid #e2e8f0',
                borderTopColor: '#1d72fe',
                animation: 'spin 0.8s linear infinite'
              }} />
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Loading your dashboard...</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : renderActiveTab()}
        </div>
        
        {/* Global Notifications */}
        {actionSuccess && (
          <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, background: '#10b981', color: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
            <CheckSquare size={20} />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, background: '#ef4444', color: '#fff', padding: '1rem 1.5rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
            <AlertCircle size={20} />
            <span>{actionError}</span>
          </div>
        )}
      </main>

      {/* Test Taking Environment Modal */}
      <TestTakingModal
        isOpen={Boolean(activeTestTaking)}
        onClose={() => setActiveTestTaking(null)}
        test={activeTestTaking}
        student={user}
        onTestCompleted={handleTestCompleted}
      />
    </div>
  );
}
