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
  Clock
} from 'lucide-react';
import api from '../../api';
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
  const [assignedStaff, setAssignedStaff] = useState(null);
  const [activeTestTaking, setActiveTestTaking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

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
      const [gData, tData, sData, staffInfo] = await Promise.all([
        api.getGroups(),
        api.getTests(),
        api.getStudentSubmissions(email),
        api.getAssignedStaff(email)
      ]);
      setGroups(gData || []);
      setTests(tData || []);
      setAssignedStaff(staffInfo || null);
      setStudentSubmissions(Array.isArray(sData) ? sData : []);
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

  // Dynamic real score calculations for individual students
  const completedSubs = safeStudentSubmissions.filter(s => s.status === 'completed');
  const realTestsCompletedCount = completedSubs.length;
  const realOverallScore = realTestsCompletedCount > 0
    ? Math.round(completedSubs.reduce((acc, s) => acc + Number(s.percentage || 0), 0) / realTestsCompletedCount)
    : 0;

  // Filter tests:
  // 1. Draft tests are hidden from students
  // 2. If test has a specific assigned_students list, ONLY visible if student is included
  // 3. Otherwise (universal test), visible to all students
  const effectiveTests = safeTests.filter(t => {
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

  const overallScore = realOverallScore;
  const testsCompletedCount = realTestsCompletedCount;

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
            tasks={effectiveTests.filter(t => t.test_type === 'task')}
            studentSubmissions={safeStudentSubmissions}
            onStartTask={(task) => setActiveTestTaking(task)}
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
            studentSubmissions={safeStudentSubmissions}
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
