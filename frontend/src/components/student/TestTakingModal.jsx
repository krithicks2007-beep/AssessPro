import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  ShieldAlert, 
  ShieldCheck, 
  Send,
  Award,
  EyeOff,
  Maximize2,
  Lock
} from 'lucide-react';
import api from '../../api';

export default function TestTakingModal({ isOpen, onClose, test, student, onTestCompleted }) {
  if (!isOpen || !test) return null;
  return <TestTakingModalInner onClose={onClose} test={test} student={student} onTestCompleted={onTestCompleted} />;
}

function TestTakingModalInner({ onClose, test, student, onTestCompleted }) {
  // Stages: 'PROCTOR_AGREEMENT' | 'IN_EXAM' | 'COMPLETED'
  const [stage, setStage] = useState('PROCTOR_AGREEMENT');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [tabSwitchWarning, setTabSwitchWarning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState((test.duration_minutes || 30) * 60);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [sessionStartTime] = useState(() => Date.now());

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const lastViolationTimeRef = useRef(0);
  const autoSubmitRef = useRef(null);

  // Fullscreen Helper Functions
  const requestFullscreenMode = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.warn('Fullscreen request denied or not supported by browser:', err);
    }
  };

  const exitFullscreenMode = async () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
      }
      setIsFullscreen(false);
    } catch (err) {
      console.warn('Exit fullscreen error:', err);
    }
  };

  const handleModalClose = async () => {
    await exitFullscreenMode();
    onClose();
  };

  const questions = test.questions && test.questions.length > 0 
    ? test.questions 
    : [
        { id: 1, question: 'Which data structure follows the Last-In-First-Out (LIFO) principle?', options: ['Queue', 'Stack', 'Linked List', 'Binary Tree'], correct_index: 1, marks: 10 },
        { id: 2, question: 'What is the average time complexity of searching in a Hash Map?', options: ['O(n)', 'O(log n)', 'O(1)', 'O(n^2)'], correct_index: 2, marks: 10 },
        { id: 3, question: 'Which algorithm is used for finding the shortest path in a weighted graph?', options: ['Dijkstra', 'DFS', 'Kruskal', 'Prim'], correct_index: 0, marks: 10 },
        { id: 4, question: 'Which traversal of a Binary Search Tree (BST) produces sorted output?', options: ['Pre-order', 'In-order', 'Post-order', 'Level-order'], correct_index: 1, marks: 10 },
        { id: 5, question: 'Which data structure is primarily used in Breadth-First Search (BFS)?', options: ['Stack', 'Queue', 'Array', 'Heap'], correct_index: 1, marks: 10 },
        { id: 6, question: 'What is the resolution of a 10-bit Analog-to-Digital Converter (ADC)?', options: ['256 levels', '512 levels', '1024 levels', '2048 levels'], correct_index: 2, marks: 10 },
        { id: 7, question: 'In digital electronics, which gate is known as the Universal Gate?', options: ['AND', 'NAND', 'OR', 'XOR'], correct_index: 1, marks: 10 },
        { id: 8, question: 'Which interrupt has the highest execution priority in modern ARM microcontrollers?', options: ['SysTick', 'PendSV', 'Non-Maskable Interrupt (NMI)', 'External GPIO'], correct_index: 2, marks: 10 },
        { id: 9, question: 'Which memory type retains its data when power is completely turned off?', options: ['SRAM', 'DRAM', 'EEPROM', 'CPU Registers'], correct_index: 2, marks: 10 },
        { id: 10, question: 'What is the Nyquist minimum sampling rate for a signal bandwidth of 4 kHz?', options: ['2 kHz', '4 kHz', '8 kHz', '16 kHz'], correct_index: 2, marks: 10 }
      ];

  const handleSubmitExam = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError('');
    clearInterval(timerRef.current);
    try {
      await exitFullscreenMode();
    } catch {}

    const timeSpent = Math.max(1, Math.round(((test.duration_minutes || 30) * 60) - timeLeftSeconds));

    // 1. Accurate client-side score computation
    let correct = 0;
    const totalQ = questions.length || 1;
    const maxScore = test.max_score || (totalQ * 10);
    const pointsPerQ = maxScore / totalQ;
    let earnedScore = 0;

    questions.forEach((q, idx) => {
      const studentAns = answers[q.id] !== undefined ? answers[q.id] : answers[idx];
      if (studentAns !== undefined && Number(studentAns) === Number(q.correct_index)) {
        correct++;
        earnedScore += (q.marks || pointsPerQ);
      }
    });

    const finalScore = Math.min(maxScore, Math.round(earnedScore));
    const finalPercentage = Math.min(100, Math.round((finalScore / maxScore) * 100));

    const submissionPayload = {
      id: 'sub-' + Date.now(),
      test_id: test.id,
      test_title: test.title,
      student_name: student?.user_metadata?.full_name || student?.email?.split('@')[0] || 'Student',
      student_email: student?.email || 'student@bitsathy.ac.in',
      score: finalScore,
      max_score: maxScore,
      percentage: finalPercentage,
      correct_count: correct,
      total_questions: totalQ,
      tab_switch_count: tabSwitchCount,
      time_taken_seconds: timeSpent,
      answers: answers,
      status: 'completed',
      submitted_at: new Date().toISOString()
    };

    // 2. Persist to backend FIRST — do not show success until confirmed
    let savedSubmission;
    try {
      savedSubmission = await api.submitTest(test.id, {
        ...submissionPayload,
        studentName: submissionPayload.student_name,
        studentEmail: submissionPayload.student_email,
        tabSwitchCount: tabSwitchCount,
        timeTakenSeconds: timeSpent
      });
    } catch (err) {
      // Submission truly failed — show error, do NOT transition to COMPLETED
      console.error('Submission failed:', err.message);
      setSubmitError('Submission failed: ' + (err.message || 'Server error. Please try again or contact your teacher.'));
      setSubmitting(false);
      return;
    }

    // 3. Only after server confirms — transition to COMPLETED
    const authoritativeResult = savedSubmission || submissionPayload;
    setSubmissionResult(authoritativeResult);
    setStage('COMPLETED');
    setSubmitting(false);

    if (onTestCompleted) {
      onTestCompleted(authoritativeResult);
    }
  };

  const handleAutoSubmit = () => {
    handleSubmitExam();
  };

  // 1. Tab Switch, Blur, Fullscreen & Anti-Cheating Event Listeners
  useEffect(() => {
    if (stage !== 'IN_EXAM') return;

    const recordViolation = () => {
      const now = Date.now();
      if (now - lastViolationTimeRef.current < 1200) return;
      lastViolationTimeRef.current = now;
      setTabSwitchCount(prev => prev + 1);
      setTabSwitchWarning(true);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation();
      }
    };

    const handleWindowBlur = () => {
      recordViolation();
    };

    const handleFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(isFs);
      if (!isFs) {
        recordViolation();
      }
    };

    // Anti-cheating: Prevent right click
    const handleContextMenu = (e) => e.preventDefault();

    // Anti-cheating: Prevent Ctrl/Cmd + C, V, X, P
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'p', 'a', 's'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    // Anti-cheating: Prevent copy, cut, paste
    const handleClipboard = (e) => e.preventDefault();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleClipboard);
    document.addEventListener('cut', handleClipboard);
    document.addEventListener('paste', handleClipboard);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleClipboard);
      document.removeEventListener('cut', handleClipboard);
      document.removeEventListener('paste', handleClipboard);
    };
  }, [stage]);

  useEffect(() => {
    autoSubmitRef.current = handleAutoSubmit;
  });

  // 2. Countdown Timer
  useEffect(() => {
    if (stage !== 'IN_EXAM') return;

    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (autoSubmitRef.current) autoSubmitRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [stage]);

  const handleStartExam = async () => {
    await requestFullscreenMode();
    setStage('IN_EXAM');
    setTabSwitchCount(0);
    setAnswers({});
    setSubmitError('');

    // Bug #4 fix: compute remaining time respecting the test end_time deadline
    const durationSecs = (test.duration_minutes || 30) * 60;
    let remainingSeconds = durationSecs;
    if (test.end_time) {
      const secondsToDeadline = Math.floor((new Date(test.end_time).getTime() - Date.now()) / 1000);
      if (secondsToDeadline > 0 && secondsToDeadline < durationSecs) {
        remainingSeconds = secondsToDeadline;
      } else if (secondsToDeadline <= 0) {
        // Deadline already passed — do not start
        alert('This assessment has already closed. Please contact your teacher.');
        onClose();
        return;
      }
    }
    setTimeLeftSeconds(remainingSeconds);
  };

  const handleOptionSelect = (qId, optionIdx) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: optionIdx
    }));
  };

  // Format MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentQIndex] || questions[0];
  const isTimeCritical = timeLeftSeconds < 300; // < 5 mins
  const isLocked = Boolean(test.start_time && new Date(test.start_time).getTime() > sessionStartTime);

  return (
    <div 
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: stage === 'IN_EXAM' ? '#0f172a' : 'rgba(15, 23, 42, 0.75)',
        backdropFilter: stage === 'IN_EXAM' ? 'none' : 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: stage === 'IN_EXAM' ? '0' : '1rem'
      }}
    >
      <div 
        className="modal-content"
        style={{
          background: '#ffffff',
          borderRadius: stage === 'IN_EXAM' ? '0px' : '20px',
          width: '100%',
          maxWidth: stage === 'IN_EXAM' ? '100vw' : '560px',
          height: stage === 'IN_EXAM' ? '100vh' : 'auto',
          maxHeight: stage === 'IN_EXAM' ? '100vh' : '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: stage === 'IN_EXAM' ? 'none' : '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          border: stage === 'IN_EXAM' ? 'none' : '1px solid #e2e8f0',
          transition: 'all 0.2s ease',
          userSelect: stage === 'IN_EXAM' ? 'none' : 'auto', // Disables text selection
          WebkitUserSelect: stage === 'IN_EXAM' ? 'none' : 'auto'
        }}
      >
        {/* =========================================================================
            STAGE 1: PROCTORING & TAB SWITCH AGREEMENT MODAL
            ========================================================================= */}
        {stage === 'PROCTOR_AGREEMENT' && (
          <div>
            <div style={{
              padding: '1.5rem 1.75rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                    Activate Tab Switch & Exam Mode
                  </h3>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    Institutional Assessment Protocol &bull; @bitsathy.ac.in
                  </div>
                </div>
              </div>
              <button onClick={handleModalClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.75rem' }}>
              {/* Test details pill */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#111827', marginBottom: '0.3rem' }}>
                  {test.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <span>⏱️ Duration: <strong>{test.duration_minutes || 30} mins</strong></span>
                  <span>📝 Questions: <strong>{questions.length} MCQs</strong></span>
                  <span>🏆 Max Marks: <strong>{test.max_score || 100}</strong></span>
                </div>
              </div>

              {/* Check if test is upcoming / scheduled in future */}
              {isLocked ? (
                <div style={{
                  background: '#eff6ff',
                  border: '1.5px solid #bfdbfe',
                  borderRadius: '12px',
                  padding: '1.75rem',
                  textAlign: 'center',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: '#dbeafe',
                    color: '#1d72fe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.85rem auto'
                  }}>
                    <Lock size={26} />
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '0.4rem' }}>
                    Assessment Locked
                  </h4>
                  <p style={{ fontSize: '0.84rem', color: '#475569', margin: '0 0 1rem 0' }}>
                    This test is scheduled to activate on:
                  </p>
                  <div style={{
                    display: 'inline-block',
                    background: '#ffffff',
                    border: '1.5px solid #93c5fd',
                    padding: '0.6rem 1.4rem',
                    borderRadius: '25px',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    color: '#1d72fe',
                    boxShadow: '0 2px 6px rgba(29, 114, 254, 0.1)'
                  }}>
                    📅 {new Date(test.start_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                  <p style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '1rem', marginBottom: 0 }}>
                    Please return at the scheduled time to take this assessment.
                  </p>
                </div>
              ) : (
                /* Proctoring Warning Box */
                <div style={{
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e11d48', fontWeight: 700, fontSize: '0.86rem', marginBottom: '0.4rem' }}>
                    <AlertTriangle size={18} />
                    <span>Anti-Cheating & Focus Enforcement Active</span>
                  </div>
                  <ul style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.55, paddingLeft: '1.2rem', margin: 0 }}>
                    <li><strong>Full-Screen Lock:</strong> Launching this test activates full-screen mode. Pressing Esc or exiting full-screen is logged as a violation.</li>
                    <li><strong>Tab Switching Logged:</strong> Leaving this browser window or opening other applications increments your <strong>Tab Switch Count</strong>.</li>
                    <li><strong>Faculty Flagging:</strong> Any tab switches or fullscreen exits are recorded and displayed to your staff.</li>
                    <li><strong>Automatic Submission:</strong> When the timer expires, all answered questions are automatically submitted.</li>
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleModalClose}
                  style={{
                    padding: '0.7rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    color: '#4b5563',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
                {isLocked ? (
                  <button
                    disabled
                    style={{
                      padding: '0.7rem 1.5rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f1f5f9',
                      color: '#64748b',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Lock size={16} />
                    <span>Test Locked Until Start Time</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStartExam}
                    style={{
                      padding: '0.7rem 1.5rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#1d72fe',
                      color: '#fff',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 12px rgba(29, 114, 254, 0.25)'
                    }}
                  >
                    <Maximize2 size={16} />
                    <span>Activate Fullscreen & Launch Test</span>
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STAGE 2: LIVE TEST TAKING ENVIRONMENT
            ========================================================================= */}
        {stage === 'IN_EXAM' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Top Bar with Live Timer & Tab Switch Tracker */}
            <div style={{
              padding: '0.85rem 1.5rem',
              background: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #1e293b'
            }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
                  {test.title}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Question {currentQIndex + 1} of {questions.length} &bull; Group {test.groups?.group_number || 1}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* Live Countdown Timer */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: isTimeCritical ? '#ef4444' : '#1e293b',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '20px',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  boxShadow: isTimeCritical ? '0 0 12px rgba(239, 68, 68, 0.6)' : 'none',
                  animation: isTimeCritical ? 'pulse 1s infinite' : 'none'
                }}>
                  <Clock size={16} />
                  <span>{formatTime(timeLeftSeconds)}</span>
                </div>

                {/* Tab Switch Counter Badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: tabSwitchCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  border: `1px solid ${tabSwitchCount > 0 ? '#ef4444' : '#10b981'}`,
                  color: tabSwitchCount > 0 ? '#f87171' : '#34d399',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.76rem',
                  fontWeight: 700
                }}>
                  <EyeOff size={14} />
                  <span>Tab Switches: {tabSwitchCount}</span>
                </div>

                {/* Submit Test Button */}
                <button
                  onClick={handleSubmitExam}
                  disabled={submitting}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#10b981',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Send size={14} />
                  <span>{submitting ? 'Submitting...' : 'Submit Test'}</span>
                </button>
              </div>
            </div>

            {/* Submission error banner */}
            {submitError && (
              <div style={{
                background: '#7f1d1d',
                color: '#ffffff',
                padding: '0.75rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderBottom: '1px solid #991b1b'
              }}>
                <AlertTriangle size={16} />
                <span>{submitError}</span>
                <button
                  onClick={() => setSubmitError('')}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}
                >✕</button>
              </div>
            )}

            {/* Fullscreen exited alert banner / Lock Overlay */}
            {!isFullscreen && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(8px)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                padding: '2rem',
                textAlign: 'center'
              }}>
                <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem' }}>
                  Exam Paused: Full-Screen Required
                </h2>
                <p style={{ fontSize: '1.1rem', color: '#cbd5e1', marginBottom: '2rem', maxWidth: '600px', lineHeight: 1.6 }}>
                  You have exited full-screen mode. This is recorded as a proctoring violation. 
                  To resume your test and protect your progress, you must re-enter full-screen mode immediately. 
                  No other actions are allowed.
                </p>
                <button
                  type="button"
                  onClick={requestFullscreenMode}
                  style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '1rem 2rem',
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
                  }}
                >
                  <Maximize2 size={20} />
                  Re-enter Fullscreen to Resume
                </button>
              </div>
            )}

            {/* Tab switch warning alert banner */}
            {tabSwitchWarning && (
              <div style={{
                background: '#fee2e2',
                borderBottom: '1px solid #fecaca',
                padding: '0.6rem 1.5rem',
                color: '#dc2626',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={16} />
                  <span>Warning: You navigated away from the exam tab! Total tab switches logged: {tabSwitchCount}. This is reported to faculty.</span>
                </div>
                <button 
                  onClick={() => setTabSwitchWarning(false)}
                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 800 }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Main Question & Question Palette Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', flex: 1, overflow: 'hidden' }}>
              {/* Question Screen */}
              <div style={{ padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1d72fe', marginBottom: '0.5rem' }}>
                    QUESTION {currentQIndex + 1} OF {questions.length}
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', lineHeight: 1.45, marginBottom: '1.75rem' }}>
                    {currentQ.question}
                  </h3>

                  {/* 4 MCQ Option Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {currentQ.options.map((optionText, optIdx) => {
                      const isSelected = answers[currentQ.id ?? currentQIndex] === optIdx;
                      return (
                        <div
                          key={optIdx}
                          onClick={() => handleOptionSelect(currentQ.id ?? currentQIndex, optIdx)}
                          style={{
                            padding: '0.9rem 1.25rem',
                            borderRadius: '10px',
                            border: `2px solid ${isSelected ? '#1d72fe' : '#e2e8f0'}`,
                            background: isSelected ? '#eff6ff' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.85rem',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            border: `2px solid ${isSelected ? '#1d72fe' : '#cbd5e1'}`,
                            background: isSelected ? '#1d72fe' : '#ffffff',
                            color: isSelected ? '#ffffff' : '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            {String.fromCharCode(65 + optIdx)}
                          </div>
                          <span style={{ fontSize: '0.9rem', color: isSelected ? '#1e3a8a' : '#334155', fontWeight: isSelected ? 600 : 400 }}>
                            {optionText}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQIndex === 0}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: currentQIndex === 0 ? '#9ca3af' : '#334155',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: currentQIndex === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <ChevronLeft size={16} />
                    <span>Previous</span>
                  </button>

                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {Object.keys(answers).length} of {questions.length} answered
                  </div>

                  {currentQIndex < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))}
                      style={{
                        padding: '0.6rem 1.25rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#1d72fe',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <span>Next Question</span>
                      <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitExam}
                      disabled={submitting}
                      style={{
                        padding: '0.6rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#10b981',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>Finish & Submit</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right Side: Question Palette (Strict 2-Column Matrix: [1][2], [3][4], [5][6], [7][8]...) */}
              <div style={{
                width: '220px',
                background: '#f8fafc',
                borderLeft: '1px solid #e2e8f0',
                padding: '1.25rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                overflowY: 'auto'
              }}>
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem',
                    paddingBottom: '0.65rem',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
                      Question Palette
                    </span>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1d72fe', background: '#eff6ff', padding: '2px 8px', borderRadius: '12px' }}>
                      {questions.length} Qs
                    </span>
                  </div>

                  {/* 2-Column Grid: [1] [2], [3] [4], [5] [6], [7] [8]... */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.6rem',
                    alignContent: 'start'
                  }}>
                    {questions.map((q, idx) => {
                      const isAnswered = answers[q.id ?? idx] !== undefined;
                      const isCurrent = currentQIndex === idx;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCurrentQIndex(idx)}
                          title={`Jump to Question ${idx + 1}`}
                          style={{
                            height: '42px',
                            borderRadius: '8px',
                            border: isCurrent 
                              ? '2px solid #1d72fe' 
                              : (isAnswered ? '1.5px solid #10b981' : '1px solid #cbd5e1'),
                            background: isCurrent 
                              ? '#1d72fe' 
                              : (isAnswered ? '#10b981' : '#ffffff'),
                            color: (isCurrent || isAnswered) ? '#ffffff' : '#334155',
                            fontWeight: 700,
                            fontSize: '0.86rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: isCurrent ? '0 2px 8px rgba(29, 114, 254, 0.35)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Status Legend */}
                <div style={{
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #e2e8f0',
                  fontSize: '0.76rem',
                  color: '#475569',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '3px', background: '#1d72fe' }} />
                    <span>Current Question</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '3px', background: '#10b981' }} />
                    <span>Answered ({Object.keys(answers).length})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '3px', background: '#ffffff', border: '1px solid #cbd5e1' }} />
                    <span>Unanswered ({questions.length - Object.keys(answers).length})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STAGE 3: COMPLETED RESULTS & SCORE SCREEN
            ========================================================================= */}
        {stage === 'COMPLETED' && submissionResult && (
          <div>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #f1f5f9',
              textAlign: 'center',
              background: '#f8fafc'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: submissionResult.percentage >= 50 ? '#ecfdf5' : '#fef2f2',
                color: submissionResult.percentage >= 50 ? '#10b981' : '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem auto'
              }}>
                <Award size={32} />
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Assessment Completed!
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.25rem' }}>
                Your marks have been recorded and synced to the faculty dashboard.
              </p>
            </div>

            <div style={{ padding: '1.75rem' }}>
              {/* Score & Percentage Highlights */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '12px', textAlign: 'center', border: '1px solid #dbeafe' }}>
                  <div style={{ fontSize: '0.74rem', color: '#1d72fe', fontWeight: 700 }}>YOUR SCORE</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e3a8a' }}>
                    {submissionResult.score} / {submissionResult.max_score}
                  </div>
                </div>

                <div style={{ background: '#ecfdf5', padding: '1rem', borderRadius: '12px', textAlign: 'center', border: '1px solid #a7f3d0' }}>
                  <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700 }}>PERCENTAGE</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#065f46' }}>
                    {submissionResult.percentage}%
                  </div>
                </div>

                <div style={{
                  background: submissionResult.tab_switch_count > 0 ? '#fef2f2' : '#f8fafc',
                  padding: '1rem',
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: `1px solid ${submissionResult.tab_switch_count > 0 ? '#fecaca' : '#e2e8f0'}`
                }}>
                  <div style={{ fontSize: '0.74rem', color: submissionResult.tab_switch_count > 0 ? '#dc2626' : '#64748b', fontWeight: 700 }}>
                    TAB SWITCHES
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: submissionResult.tab_switch_count > 0 ? '#dc2626' : '#10b981' }}>
                    {submissionResult.tab_switch_count}
                  </div>
                </div>
              </div>

              {/* Integrity summary */}
              {submissionResult.tab_switch_count > 0 ? (
                <div style={{
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  fontSize: '0.82rem',
                  color: '#9f1239',
                  marginBottom: '1.5rem'
                }}>
                  <AlertTriangle size={18} color="#e11d48" style={{ flexShrink: 0 }} />
                  <span>Notice: <strong>{submissionResult.tab_switch_count} tab switches</strong> were recorded during your examination and logged for faculty review.</span>
                </div>
              ) : (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  fontSize: '0.82rem',
                  color: '#166534',
                  marginBottom: '1.5rem'
                }}>
                  <ShieldCheck size={18} color="#16a34a" style={{ flexShrink: 0 }} />
                  <span>Clean Submission: Full focus maintained throughout the examination (0 Tab Switches).</span>
                </div>
              )}

              <button
                onClick={handleModalClose}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#1d72fe',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
