import React, { useState, useEffect } from 'react';
import {
  Home,
  FileText,
  CheckSquare,
  BarChart2,
  User,
  LogOut,
  Bell,
  Building2
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
  const [activeTestTaking, setActiveTestTaking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const email = user?.email || '';
  const parsed = parseBitEmail(email);

  const studentName = studentProfile?.name || user?.user_metadata?.full_name || parsed?.formattedName || 'Student';
  const studentDept = studentProfile?.department || parsed?.department || 'Computer Science and Engineering';
  const studentYear = studentProfile?.year || parsed?.academicYear || 'II Year';
  const studentRegNo = studentProfile?.reg_no || parsed?.predictedRegNo || '7376251CS101';
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

  // Real-time 1-second clock ticker for instantaneous test activation
  useEffect(() => {
    const ticker = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  // Load live groups, tests, and student submissions strictly for this user
  useEffect(() => {
    loadData();
  }, [email]);

  const loadData = async () => {
    setLoading(true);
    try {
      const cleanEmail = (email || '').toLowerCase().trim();
      const localSubs = cleanEmail ? JSON.parse(localStorage.getItem('assesspro_subs_' + cleanEmail) || '[]') : [];
      const allLocalSubs = JSON.parse(localStorage.getItem('assesspro_all_submissions') || '[]');

      const [gData, tData, sData] = await Promise.all([
        api.getGroups(),
        api.getTests(),
        api.getStudentSubmissions(email)
      ]);
      setGroups(gData || []);
      setTests(tData || []);

      // Combine server submissions and local submissions so completed tests are NEVER lost
      const subMap = new Map();
      (sData || []).forEach(s => subMap.set(String(s.test_id), s));
      allLocalSubs.filter(s => s.student_email?.toLowerCase() === cleanEmail).forEach(s => subMap.set(String(s.test_id), s));
      localSubs.forEach(s => subMap.set(String(s.test_id), s));

      setStudentSubmissions(Array.from(subMap.values()));
    } catch (err) {
      console.error('Error fetching student dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestCompleted = (submission) => {
    const cleanEmail = (email || '').toLowerCase().trim();
    try {
      const studentKey = 'assesspro_subs_' + cleanEmail;
      const existing = JSON.parse(localStorage.getItem(studentKey) || '[]');
      const updated = [submission, ...existing.filter(s => String(s.test_id) !== String(submission.test_id))];
      localStorage.setItem(studentKey, JSON.stringify(updated));

      const allKey = 'assesspro_all_submissions';
      const existingAll = JSON.parse(localStorage.getItem(allKey) || '[]');
      const updatedAll = [submission, ...existingAll.filter(s => !(String(s.test_id) === String(submission.test_id) && s.student_email?.toLowerCase() === cleanEmail))];
      localStorage.setItem(allKey, JSON.stringify(updatedAll));
    } catch (e) {}

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
  const demoBenchmarks = [85, 72, 76, 80, 84, 78];

  // Dynamic real score calculations for individual students
  const completedSubs = safeStudentSubmissions.filter(s => s.status === 'completed');
  const realTestsCompletedCount = completedSubs.length;
  const realOverallScore = realTestsCompletedCount > 0
    ? Math.round(completedSubs.reduce((acc, s) => acc + Number(s.percentage || 0), 0) / realTestsCompletedCount)
    : 0;

  // Filter tests:
  // - Super Admin sees showcase demo tests (test-101, test-102) + any real tests created by staff
  // - Fresh / Regular Students only see real tests created by faculty (demo seed tests filtered out)
  const effectiveTests = safeTests.filter(t => {
    if (isDemoMaster) return true;
    return !t.is_demo && t.id !== 'test-101' && t.id !== 'test-102';
  });

  // For Super Admin demo preview account: show realistic populated showcase data
  // For all other students: show 100% real dynamic data
  const overallScore = isDemoMaster ? 78 : realOverallScore;
  const testsCompletedCount = isDemoMaster ? 4 : realTestsCompletedCount;
  const tasksCompletedCount = isDemoMaster ? 1 : 0;
  const pendingCount = isDemoMaster ? 2 : Math.max(0, effectiveTests.length - realTestsCompletedCount);

  // Sidebar navigation items
  const navItems = [
    { label: 'Dashboard', icon: Home },
    { label: 'Tests', icon: FileText },
    { label: 'Tasks', icon: CheckSquare },
    { label: 'Results', icon: BarChart2 },
    { label: 'Profile', icon: User },
  ];

  // Render active tab
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'Tests':
        return (
          <Tests
            tests={effectiveTests}
            studentSubmissions={safeStudentSubmissions}
            currentTime={currentTime}
            onLaunchTest={setActiveTestTaking}
          />
        );
      case 'Results':
        return (
          <Results
            tests={effectiveTests}
            studentSubmissions={safeStudentSubmissions}
            studentName={studentName}
            email={email}
            isDemoMaster={isDemoMaster}
            onNavigateToTests={() => setActiveTab('Tests')}
          />
        );
      case 'Tasks':
        return <Tasks studentDept={studentDept} />;
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
            tasksCompletedCount={tasksCompletedCount}
            pendingCount={pendingCount}
            isDemoMaster={isDemoMaster}
            demoBenchmarks={demoBenchmarks}
            onNavigateToTests={() => setActiveTab('Tests')}
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
            <div className="notification-btn" title="Notifications">
              <Bell size={17} />
              <span className="notification-badge" style={{ width: 8, height: 8, padding: 0 }} />
            </div>

            {/* User Pill */}
            <div
              onClick={() => setActiveTab('Profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#f3f4f6',
                padding: '0.35rem 0.75rem',
                borderRadius: '30px',
                cursor: 'pointer'
              }}
              title="Click to view profile"
            >
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1d72fe', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700 }}>
                {studentInitials}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>{studentName}</span>
                <span style={{ fontSize: '0.66rem', color: '#6b7280' }}>{studentRegNo}</span>
              </div>
            </div>

            {/* Department Pill */}
            <div className="dept-pill" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#eff6ff', color: '#1d72fe', border: '1px solid #bfdbfe' }}>
              <Building2 size={13} />
              <span style={{ fontWeight: 700 }}>{parsed?.deptCode ? parsed.deptCode.toUpperCase() : 'DEPT'} &bull; {studentYear.split(' ')[0]}</span>
            </div>
          </div>
        </header>

        {/* Active Tab Content */}
        {renderActiveTab()}
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
