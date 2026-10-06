import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  Upload, 
  FileText, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  FileUp,
  HelpCircle,
  AlertTriangle,
  Lock,
  Users,
  Search,
  Check,
  Eye,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import api from '../../api';
import { extractTextFromPDF } from '../../utils/pdfParser';

// Helper to format Date into YYYY-MM-DDTHH:mm using Indian / Local browser timezone
const toLocalDatetimeString = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function ConfigureTestPage({ onBack, groups = [], onTestCreated, existingTest }) {
  const [groupId, setGroupId] = useState(existingTest?.group_id || groups[0]?.id || '');
  const [testNumber, setTestNumber] = useState(existingTest?.test_number || 1);
  const [title, setTitle] = useState(existingTest?.title || '');
  const [durationMinutes, setDurationMinutes] = useState(existingTest?.duration_minutes || 30);

  const initialQuestions = Array.isArray(existingTest?.questions) ? existingTest.questions : [];
  const initialFileName = existingTest?.uploaded_file_name || existingTest?.uploadedFileName || (initialQuestions.length > 0 ? (existingTest.title ? `${existingTest.title} (Saved Assessment File)` : `Saved Questions (${initialQuestions.length} MCQs)`) : '');

  const [questionCountType, setQuestionCountType] = useState(existingTest?.total_questions || initialQuestions.length || 10);
  
  const [startTime, setStartTime] = useState(() => {
    if (existingTest?.start_time) return toLocalDatetimeString(new Date(existingTest.start_time));
    const d = new Date();
    return toLocalDatetimeString(d);
  });
  
  const [endTime, setEndTime] = useState(() => {
    if (existingTest?.end_time) return toLocalDatetimeString(new Date(existingTest.end_time));
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return toLocalDatetimeString(d);
  });

  const [availableStudents, setAvailableStudents] = useState([]);
  const [assignTarget, setAssignTarget] = useState(
    existingTest?.assigned_students?.length > 0 ? 'specific' : 'all'
  );
  const [selectedStudentEmails, setSelectedStudentEmails] = useState(
    existingTest?.assigned_students || []
  );
  const [studentSearch, setStudentSearch] = useState('');
  const [notFoundEmails, setNotFoundEmails] = useState([]);
  const [showStudentSelectionModal, setShowStudentSelectionModal] = useState(false);
  
  const handleBulkAdd = (text) => {
    const tokens = text.split(/[\s,;]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
    const newSelected = new Set(selectedStudentEmails);
    const notFound = [];
    let addedCount = 0;

    tokens.forEach(token => {
      // Find by email or exact full name match
      const student = availableStudents.find(s => 
        (s.email && s.email.toLowerCase() === token) || 
        (s.full_name && s.full_name.toLowerCase() === token)
      );
      
      if (student) {
        newSelected.add(student.email);
        addedCount++;
      } else if (token.includes('@')) {
        // If it looks like an email but wasn't found
        notFound.push(token);
      }
    });

    if (addedCount > 0 || notFound.length > 0) {
      setSelectedStudentEmails(Array.from(newSelected));
      setNotFoundEmails(notFound);
      setStudentSearch(''); // Clear search on successful bulk add
    } else {
      setStudentSearch(text); // Normal search behavior
    }
  };
  const [uploadedFileName, setUploadedFileName] = useState(initialFileName);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [allowAnytime, setAllowAnytime] = useState(
    existingTest ? (existingTest.late_limit_minutes === null || existingTest.late_limit_minutes === undefined) : true
  );
  const [lateLimitDropdown, setLateLimitDropdown] = useState(
    [5, 10, 15].includes(existingTest?.late_limit_minutes) ? String(existingTest?.late_limit_minutes) : (existingTest?.late_limit_minutes ? 'custom' : '10')
  );
  const [lateLimitCustom, setLateLimitCustom] = useState(existingTest?.late_limit_minutes || 10);
  const [autoLaunch, setAutoLaunch] = useState(existingTest?.auto_launch || false);
  const [detectedFileCount, setDetectedFileCount] = useState(initialQuestions.length || null);
  const [mismatchError, setMismatchError] = useState(null);
  const [questions, setQuestions] = useState(initialQuestions);

  useEffect(() => {
    api.getAllStudents().then(list => {
      if (Array.isArray(list)) setAvailableStudents(list);
    });
  }, []);

  const generateQuestions = (count) => {
    const samplePool = [
      { q: 'Which algorithmic paradigm does Binary Search employ?', opts: ['Divide and Conquer', 'Greedy Method', 'Dynamic Programming', 'Backtracking'], ans: 0 },
      { q: 'What is the auxiliary space complexity of standard Depth First Search (DFS)?', opts: ['O(1)', 'O(V)', 'O(E)', 'O(V * E)'], ans: 1 },
      { q: 'In digital electronics, which gate is known as the Universal Gate?', opts: ['AND', 'NAND', 'OR', 'XOR'], ans: 1 },
    ];

    const generated = [];
    for (let i = 0; i < count; i++) {
      const template = samplePool[i % samplePool.length];
      generated.push({
        id: i + 1,
        question: `Question ${i + 1}: ${template.q}`,
        options: [...template.opts],
        correct_index: template.ans,
        marks: 10
      });
    }
    return generated;
  };

  const [showQuestionsPreview, setShowQuestionsPreview] = useState(false);

  const parseQuestionsFromText = (text) => {
    if (!text || typeof text !== 'string') return [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsed = [];
    let currentQ = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Ignore page number banners, divider lines or header titles
      if (/^(?:Page\s+\d+|\d+\s+of\s+\d+|===|---|AssessPro|Question\s*Bank)/i.test(line)) {
        continue;
      }

      // Check if new question: starts with number followed by . or ) or : or -
      const qMatch = line.match(/^(?:(?:Q|Question)\s*)?(\d+)[.):\-]\s*(.+)$/i);

      if (qMatch) {
        if (currentQ && currentQ.question && currentQ.options.length >= 2) {
          parsed.push(currentQ);
        }
        const qNum = qMatch[1];
        const qText = qMatch[2];
        currentQ = {
          id: parseInt(qNum) || (parsed.length + 1),
          question: qText.trim(),
          options: [],
          correct_index: 0,
          marks: 10
        };
        continue;
      }

      if (!currentQ) continue;

      // Check for inline options on a single line: e.g. "A) Opt1  B) Opt2  C) Opt3  D) Opt4"
      const inlineOptRegex = /(?:^|\s+)\(?([A-Da-d])[.):\-]\s*([^A-D\n\r]+?)(?=(?:\s+\(?[A-Da-d][.):\-]|$))/g;
      const inlineMatches = [...line.matchAll(inlineOptRegex)];
      if (inlineMatches.length >= 2) {
        inlineMatches.forEach(m => {
          currentQ.options.push(m[2].trim());
        });
        continue;
      }

      // Check for option line: A) Option text or A. Option text or (A) Option text
      const optMatch = line.match(/^\(?([A-Da-d])[.):\-]\s*(.+)$/);
      if (optMatch && currentQ.options.length < 6) {
        currentQ.options.push(optMatch[2].trim());
        continue;
      }

      // Check for Answer line: Answer: B or Ans: B or Answer: Option B
      const ansMatch = line.match(/^(?:Answer|Ans|Correct\s*Answer)\s*[:-]?\s*\(?([A-Da-d])\)?/i);
      if (ansMatch) {
        const letter = ansMatch[1].toUpperCase();
        const letterMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
        if (letter in letterMap) {
          currentQ.correct_index = letterMap[letter];
        }
        continue;
      }

      // If it's continuation of question text before any options were parsed:
      if (currentQ.options.length === 0) {
        currentQ.question += ' ' + line;
      }
    }

    if (currentQ && currentQ.question && currentQ.options.length >= 2) {
      parsed.push(currentQ);
    }

    // Re-index questions consecutively
    return parsed.map((q, idx) => ({
      ...q,
      id: idx + 1
    }));
  };

  const evaluateDetectedQuestions = (detectedList, fileName) => {
    const count = detectedList.length;
    setDetectedFileCount(count);
    setQuestions(detectedList);
    // Dynamically take and sync question count directly from the uploaded file
    setQuestionCountType(count);
    setUploadedFileName(fileName);
    setMismatchError(null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    setMismatchError(null);

    try {
      let rawText = '';
      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        rawText = await extractTextFromPDF(arrayBuffer);
      } else {
        rawText = await file.text();
      }

      if (!rawText || !rawText.trim()) {
        setErrorMsg('The uploaded file appears to be empty or unreadable.');
        return;
      }

      // 1. Try JSON parsing
      if (file.name.endsWith('.json') || rawText.trim().startsWith('[') || rawText.trim().startsWith('{')) {
        try {
          const parsedJson = JSON.parse(rawText);
          const qList = Array.isArray(parsedJson) ? parsedJson : (parsedJson.questions || []);
          if (qList.length > 0) {
            evaluateDetectedQuestions(qList, file.name);
            return;
          }
        } catch (_jsonErr) {}
      }

      // 2. Parse text questions (.pdf, .txt, .csv, plain text format)
      const parsedQs = parseQuestionsFromText(rawText);
      if (parsedQs.length > 0) {
        evaluateDetectedQuestions(parsedQs, file.name);
        return;
      }

      setErrorMsg('Could not detect any valid questions in the uploaded file. Please ensure questions are numbered (e.g. 1. Question, A) Option, Answer: B).');
    } catch (err) {
      console.error('File parsing error:', err);
      setErrorMsg('Error reading uploaded file: ' + err.message);
    }
  };

  const handleSubmit = async (e, targetStatus = 'published') => {
    e.preventDefault();
    const newErrors = {};

    if (!title.trim()) newErrors.title = 'Please enter a test title.';
    if (mismatchError) {
      newErrors.file = `Validation Alert: The uploaded file contains ${mismatchError.fileCount} questions, but configured for ${mismatchError.selectedCount}.`;
    }

    const qCount = parseInt(questionCountType) || questions.length || 10;
    const dur = parseInt(durationMinutes) || 5;
    
    if (dur < 1) newErrors.duration = 'Duration must be at least 1 minute.';
    if (qCount < 1) newErrors.questions = 'Please enter at least 1 question.';
    if (assignTarget === 'specific' && selectedStudentEmails.length === 0) {
      newErrors.target = 'Please select at least one student.';
    }

    if (autoLaunch) {
      if (!startTime) {
        newErrors.startTime = 'Start time is required for auto-launch.';
      } else {
        const startDateTime = new Date(startTime);
        if (startDateTime <= new Date()) {
          newErrors.startTime = 'Start time must be in the future to auto-launch.';
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }
    
    setFieldErrors({});

    // Always use uploaded file questions when available; only fallback to sample generator if no file uploaded
    const finalQuestions = questions && questions.length > 0 ? questions : generateQuestions(qCount);
    
    setLoading(true);
    setErrorMsg('');

    try {
      const finalStartTime = startTime ? new Date(startTime).getTime() : Date.now();
      const finalEndTime = endTime ? new Date(endTime).getTime() : (finalStartTime + (dur * 60 * 1000));
      
      await onTestCreated({
        title: title.trim(),
        groupId: groupId || groups[0]?.id,
        testNumber: parseInt(testNumber) || 1,
        durationMinutes: dur,
        testType: 'test',
        status: targetStatus,
        auto_launch: autoLaunch,
        allowLatecomers: true, // We always allow latecomers conceptually, we just restrict by lateLimitMinutes
        lateLimitMinutes: allowAnytime ? null : (lateLimitDropdown === 'custom' ? lateLimitCustom : Number(lateLimitDropdown)),
        startTime: new Date(finalStartTime).toISOString(),
        endTime: new Date(finalEndTime).toISOString(),
        questions: finalQuestions,
        total_questions: finalQuestions.length,
        totalQuestions: finalQuestions.length,
        uploaded_file_name: uploadedFileName || (finalQuestions.length > 0 ? `Assessment-${title.trim()}` : ''),
        uploadedFileName: uploadedFileName || (finalQuestions.length > 0 ? `Assessment-${title.trim()}` : ''),
        maxScore: finalQuestions.length * 10,
        assignedStudents: assignTarget === 'specific' ? selectedStudentEmails : []
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update test.');
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', width: '100%' }}>
      {/* Page Header mimicking the "Add Student" page format */}
      <div style={{ background: '#ffffff', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #e2e8f0' }}>
        <button 
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', padding: '0.5rem', borderRadius: '50%'
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Configure Assessment</h1>
      </div>

      <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        {errorMsg && (
          <div style={{ padding: '1rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #f87171', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={18} />
            <span style={{ fontWeight: 600 }}>{errorMsg}</span>
          </div>
        )}

        {/* Form Container */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '2rem', marginBottom: '1.5rem' }}>
          
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>Assessment Information</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Field Row */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Test Title *</label>
              <input 
                value={title} 
                onChange={e => { setTitle(e.target.value); setFieldErrors(prev => ({...prev, title: null})); }} 
                placeholder="e.g. Midterm Physics"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: `1px solid ${fieldErrors.title ? '#ef4444' : '#e2e8f0'}`, background: fieldErrors.title ? '#fef2f2' : '#f8fafc', fontSize: '0.95rem' }} 
              />
              {fieldErrors.title && <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '0.4rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><AlertTriangle size={14} />{fieldErrors.title}</div>}
            </div>

            {/* Field Row */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Group / Department *</label>
              <select 
                value={groupId} 
                onChange={e => setGroupId(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.95rem' }}
              >
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>

            {/* Grid Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Duration (Minutes) *</label>
                <input 
                  type="number" 
                  value={durationMinutes} 
                  onChange={e => { setDurationMinutes(e.target.value); setFieldErrors(prev => ({...prev, duration: null})); }} 
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: `1px solid ${fieldErrors.duration ? '#ef4444' : '#e2e8f0'}`, background: fieldErrors.duration ? '#fef2f2' : '#f8fafc', fontSize: '0.95rem' }} 
                />
                {fieldErrors.duration && <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '0.4rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><AlertTriangle size={14} />{fieldErrors.duration}</div>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Number of Questions *</label>
                <select 
                  value={questionCountType} 
                  onChange={e => {
                    const val = Number(e.target.value);
                    setQuestionCountType(val);
                    if (detectedFileCount && detectedFileCount !== val) {
                      setMismatchError({ fileCount: detectedFileCount, selectedCount: val });
                    } else {
                      setMismatchError(null);
                    }
                  }}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.95rem' }}
                >
                  {detectedFileCount && (
                    <option value={detectedFileCount}>
                      {detectedFileCount} Questions (Detected from file)
                    </option>
                  )}
                  <option value={10}>10 Questions</option>
                  <option value={20}>20 Questions</option>
                  <option value={50}>50 Questions</option>
                  {![10, 20, 50, detectedFileCount].filter(Boolean).includes(Number(questionCountType)) && (
                    <option value={questionCountType}>{questionCountType} Questions</option>
                  )}
                </select>
                {mismatchError && (
                  <div style={{ marginTop: '0.65rem', padding: '0.65rem 0.85rem', background: '#fef2f2', border: '1px solid #f87171', borderRadius: '8px', color: '#b91c1c', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
                    <span>⚠️ Mismatch: Uploaded file has <strong>{mismatchError.fileCount} questions</strong>, but <strong>{mismatchError.selectedCount} questions</strong> selected.</span>
                  </div>
                )}
                  {fieldErrors.questions && <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '0.4rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><AlertTriangle size={14} />{fieldErrors.questions}</div>}
                  {fieldErrors.file && <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '0.4rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><AlertTriangle size={14} />{fieldErrors.file}</div>}
                </div>
              </div>

            </div>
        </div>

        {/* Scheduling Container */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '2rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>Scheduling</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Start Time *</label>
              <input 
                type="datetime-local" 
                value={startTime} 
                onChange={e => { setStartTime(e.target.value); setFieldErrors(prev => ({...prev, startTime: null})); }}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: `1px solid ${fieldErrors.startTime ? '#ef4444' : '#e2e8f0'}`, background: fieldErrors.startTime ? '#fef2f2' : '#f8fafc', fontSize: '0.95rem' }}
              />
              {fieldErrors.startTime && <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '0.4rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><AlertTriangle size={14} />{fieldErrors.startTime}</div>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>End Time (Deadline) *</label>
              <input 
                type="datetime-local" 
                value={endTime} 
                onChange={e => setEndTime(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.95rem' }}
              />
            </div>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#eff6ff', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <input type="checkbox" id="autoLaunch" checked={autoLaunch} onChange={e => { setAutoLaunch(e.target.checked); setFieldErrors(prev => ({...prev, startTime: null})); }} style={{ width: '16px', height: '16px', accentColor: '#1d72fe', cursor: 'pointer' }} />
              <label htmlFor="autoLaunch" style={{ fontSize: '0.9rem', color: '#1e3a8a', fontWeight: 700, cursor: 'pointer' }}>Automatically launch this test at the specified Start Time</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input type="checkbox" id="allowAnytime" checked={allowAnytime} onChange={e => setAllowAnytime(e.target.checked)} />
              <label htmlFor="allowAnytime" style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>Allow entry at any time before deadline</label>
            </div>
            
            {!allowAnytime && (
              <div style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.1rem' }}>Late Entry Limit</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <select
                    value={lateLimitDropdown}
                    onChange={e => setLateLimitDropdown(e.target.value)}
                    style={{ width: '130px', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                  >
                    <option value="5">5 Minutes</option>
                    <option value="10">10 Minutes</option>
                    <option value="15">15 Minutes</option>
                    <option value="custom">Custom...</option>
                  </select>
                  
                  {lateLimitDropdown === 'custom' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input 
                        type="number" 
                        min="0"
                        value={lateLimitCustom} 
                        onChange={e => setLateLimitCustom(Number(e.target.value))}
                        style={{ width: '80px', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                      />
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>minutes</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Target Audience Container */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '2rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>Target Audience</h2>
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" checked={assignTarget === 'all'} onChange={() => { setAssignTarget('all'); setFieldErrors(prev => ({...prev, target: null})); }} />
              <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#334155' }}>All Students</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input 
                type="radio" 
                checked={assignTarget === 'specific'} 
                onChange={() => {
                  setAssignTarget('specific');
                  setFieldErrors(prev => ({...prev, target: null}));
                  setShowStudentSelectionModal(true);
                }} 
              />
              <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#334155' }}>Specific Students</span>
            </label>
          </div>
          {fieldErrors.target && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}><AlertTriangle size={15} />{fieldErrors.target}</div>}
          {assignTarget === 'specific' && (
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: '0.25rem' }}>Specific Students Selected</span>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{selectedStudentEmails.length} students currently selected</span>
              </div>
              <button
                onClick={(e) => { e.preventDefault(); setShowStudentSelectionModal(true); }}
                style={{
                  padding: '0.65rem 1.25rem', borderRadius: '8px', border: 'none', background: '#1d72fe', color: '#fff', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                <Users size={16} />
                Manage Students
              </button>
            </div>
          )}
        </div>

        {/* Upload MCQ Section */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '2rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>Question Upload</h2>
          <div style={{ position: 'relative' }}>
            <input 
              type="file" 
              accept=".pdf,.txt,.csv,.json"
              onChange={handleFileUpload}
              style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
            />
            <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '2rem', textAlign: 'center', background: '#f8fafc' }}>
              <FileUp size={32} color="#64748b" style={{ margin: '0 auto 1rem auto' }} />
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#1e293b' }}>Click or drag file to upload MCQs</p>
              {questions.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    background: '#f0fdf4',
                    color: '#15803d',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '30px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    border: '1px solid #bbf7d0'
                  }}>
                    <CheckCircle2 size={18} />
                    <span>
                      {uploadedFileName ? (
                        <>Successfully loaded {questions.length} questions from <strong>{uploadedFileName}</strong></>
                      ) : (
                        <>Saved Assessment: <strong>{questions.length} questions loaded</strong></>
                      )}
                    </span>
                  </div>

                  <div style={{ marginTop: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowQuestionsPreview(prev => !prev);
                      }}
                      style={{
                        position: 'relative',
                        zIndex: 10,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#475569',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <Eye size={15} color="#2563eb" />
                      <span>{showQuestionsPreview ? 'Hide Question Preview' : `Preview Extracted Questions (${questions.length})`}</span>
                      {showQuestionsPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>
              )}
              {mismatchError && (
                <div style={{
                  marginTop: '1.25rem',
                  padding: '0.85rem 1.25rem',
                  background: '#fef2f2',
                  border: '1.5px solid #ef4444',
                  borderRadius: '10px',
                  color: '#b91c1c',
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  textAlign: 'left'
                }}>
                  <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.92rem', marginBottom: '0.15rem' }}>
                      Question Count Mismatch Alert!
                    </strong>
                    <span>
                      The uploaded file contains <strong>{mismatchError.fileCount} questions</strong>, but you configured the assessment for <strong>{mismatchError.selectedCount} questions</strong>. Please change the dropdown above to <strong>{mismatchError.fileCount} questions</strong>.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Expandable Question Preview & Editor */}
            {showQuestionsPreview && questions.length > 0 && (
              <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
                background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
              }}>
                <div style={{
                  background: '#f8fafc', width: '100%', maxWidth: '1000px', height: '100%', maxHeight: '90vh',
                  borderRadius: '16px', display: 'flex', flexDirection: 'column',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                        Parsed Questions ({questions.length})
                      </h4>
                      <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>Editable direct from file</span>
                    </div>
                    <button onClick={() => setShowQuestionsPreview(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={24} color="#64748b" />
                    </button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {questions.map((q, idx) => (
                    <div key={q.id || idx} style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a', paddingTop: '0.4rem' }}>{idx + 1}.</span>
                        <input
                          type="text"
                          value={q.question || ''}
                          onChange={(e) => {
                            const updated = [...questions];
                            updated[idx].question = e.target.value;
                            setQuestions(updated);
                          }}
                          style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 600, color: '#0f172a', width: '100%' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', paddingLeft: '1.5rem' }}>
                        {q.options?.map((opt, optIdx) => {
                          const isCorrect = q.correct_index === optIdx;
                          const letter = String.fromCharCode(65 + optIdx);
                          return (
                            <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <input
                                type="radio"
                                name={`q-${idx}-correct`}
                                checked={isCorrect}
                                onChange={() => {
                                  const updated = [...questions];
                                  updated[idx].correct_index = optIdx;
                                  setQuestions(updated);
                                }}
                                style={{ width: '14px', height: '14px', accentColor: '#10b981', cursor: 'pointer' }}
                                title="Mark as Correct Answer"
                              />
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>{letter})</span>
                              <input
                                type="text"
                                value={opt || ''}
                                onChange={(e) => {
                                  const updated = [...questions];
                                  updated[idx].options[optIdx] = e.target.value;
                                  setQuestions(updated);
                                }}
                                style={{
                                  flex: 1,
                                  padding: '0.4rem 0.5rem',
                                  borderRadius: '6px',
                                  border: isCorrect ? '1px solid #10b981' : '1px solid #e2e8f0',
                                  background: isCorrect ? '#ecfdf5' : '#f8fafc',
                                  color: isCorrect ? '#065f46' : '#334155',
                                  fontSize: '0.82rem',
                                  fontWeight: isCorrect ? 600 : 400
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>

        {Object.keys(fieldErrors).length > 0 && (
          <div style={{ padding: '1.25rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '12px', marginTop: '1rem', border: '1px solid #f87171', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              <AlertTriangle size={18} /> Cannot Save Assessment
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.75rem', fontSize: '0.9rem', fontWeight: 600 }}>
              {Object.values(fieldErrors).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', paddingBottom: '3rem' }}>
          {existingTest?.status === 'published' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>
                ℹ️ This assessment is currently published. Changes cannot be saved.
              </span>
              <button
                onClick={onBack}
                style={{
                  padding: '0.85rem 2rem', borderRadius: '8px', border: 'none', background: '#64748b', color: '#fff', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                Go Back
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={(e) => handleSubmit(e, 'draft')}
                disabled={loading}
                style={{
                  padding: '0.85rem 1.5rem', borderRadius: '8px', border: '1px solid #1d72fe', background: '#eff6ff', color: '#1d72fe', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                <Clock size={18} />
                {loading ? 'Saving...' : 'Save for Later'}
              </button>
              <button
                onClick={(e) => handleSubmit(e, 'published')}
                disabled={loading}
                style={{
                  padding: '0.85rem 2rem', borderRadius: '8px', border: 'none', background: '#1d72fe', color: '#fff', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px rgba(29, 114, 254, 0.25)'
                }}
              >
                <CheckCircle2 size={18} />
                {loading ? 'Publishing...' : 'Launch Now'}
              </button>
            </>
          )}
        </div>

      </div>

      {showStudentSelectionModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(15, 23, 42, 0.7)', zIndex: 9999, display: 'flex',
          justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', width: '90%', maxWidth: '900px', height: '90vh',
            display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
          }}>
            <div style={{ padding: '1.5rem 2rem', background: 'linear-gradient(135deg, #01183eff 0%, #08349bff 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                  <Users size={20} color="#60a5fa" />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, letterSpacing: '0.01em' }}>Manage Target Audience</h2>
              </div>
              <button 
                onClick={() => setShowStudentSelectionModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.75rem', color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseOver={e => e.currentTarget.style.color = '#fff'}
                onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
              >
                &times;
              </button>
            </div>
            
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              
              {/* Left Pane - Search and Available */}
              <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <p style={{ marginBottom: '1.5rem', color: '#475569', fontSize: '0.95rem' }}>
                  Search for a student by name/email, or paste a list of emails (separated by spaces, commas, or newlines) into the search box below to instantly select them.
                </p>
                
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <input 
                    type="text" 
                    placeholder="Search name, or paste multiple emails here..." 
                    value={studentSearch} 
                    onChange={(e) => setStudentSearch(e.target.value)}
                    onPaste={(e) => {
                      const pasteData = e.clipboardData.getData('text');
                      if (pasteData.includes(',') || pasteData.includes('\n') || pasteData.includes(' ')) {
                        e.preventDefault();
                        handleBulkAdd(pasteData);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleBulkAdd(studentSearch);
                      }
                    }}
                    style={{ flex: 1, padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '1rem', transition: 'all 0.3s ease', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
                    onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)'; e.target.style.background = '#fff'; }}
                    onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'; e.target.style.background = '#f8fafc'; }}
                  />
                  <button 
                    onClick={(e) => { e.preventDefault(); handleBulkAdd(studentSearch); }}
                    style={{ padding: '0 1.5rem', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', fontSize: '1rem', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -1px rgba(37, 99, 235, 0.1)' }}
                  >
                    Add
                  </button>
                </div>

                {/* Warning for not found emails */}
                {notFoundEmails.length > 0 && (
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', fontSize: '0.9rem', color: '#b91c1c' }}>
                    <strong>Could not find the following students (check for typos):</strong>
                    <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', fontFamily: 'monospace' }}>
                      {notFoundEmails.map(email => <li key={email}>{email}</li>)}
                    </ul>
                    <button 
                      onClick={(e) => { e.preventDefault(); setNotFoundEmails([]); }}
                      style={{ marginTop: '0.75rem', background: 'transparent', border: 'none', color: '#dc2626', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontWeight: 500 }}
                    >
                      Dismiss Warning
                    </button>
                  </div>
                )}

                {/* Filtered Search Results */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>Available Students</span>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      const filtered = availableStudents.filter(s => s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.email?.toLowerCase().includes(studentSearch.toLowerCase()));
                      const newEmails = filtered.map(s => s.email);
                      setSelectedStudentEmails(prev => Array.from(new Set([...prev, ...newEmails])));
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#1d72fe', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    Select All Listed Below
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem', paddingBottom: '1rem' }}>
                  {availableStudents.filter(s => s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.email?.toLowerCase().includes(studentSearch.toLowerCase())).map(student => {
                    const isSelected = selectedStudentEmails.includes(student.email);
                    return (
                      <label key={student.email} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', background: isSelected ? '#eff6ff' : '#fff', borderRadius: '10px', border: '1px solid', borderColor: isSelected ? '#bfdbfe' : '#e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }} onMouseOver={e => e.currentTarget.style.borderColor = isSelected ? '#93c5fd' : '#cbd5e1'} onMouseOut={e => e.currentTarget.style.borderColor = isSelected ? '#bfdbfe' : '#e2e8f0'}>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedStudentEmails(prev => [...prev, student.email]);
                            else setSelectedStudentEmails(prev => prev.filter(email => email !== student.email));
                          }}
                          style={{ width: '20px', height: '20px', accentColor: '#2563eb', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: isSelected ? '#1e3a8a' : '#1e293b' }}>{student.full_name}</span>
                          <span style={{ fontSize: '0.85rem', color: isSelected ? '#3b82f6' : '#64748b' }}>{student.email}</span>
                        </div>
                      </label>
                    );
                  })}
                  {availableStudents.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '1rem', gridColumn: '1 / -1' }}>
                      No students loaded in the system.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Pane - Selected Emails List */}
              <div style={{ width: '380px', background: '#f1f5f9', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <div style={{ padding: '1.75rem 1.5rem 1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ background: '#dbeafe', color: '#1d4ed8', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700 }}>
                      {selectedStudentEmails.length}
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>Selected</h3>
                  </div>
                  {selectedStudentEmails.length > 0 && (
                    <button 
                      onClick={(e) => { e.preventDefault(); setSelectedStudentEmails([]); }}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: '0.35rem 0.75rem', borderRadius: '6px', transition: 'background 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = '#fee2e2'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1rem 1.5rem' }}>
                  {selectedStudentEmails.map(email => (
                    <div key={email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '0.65rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}>
                      <span style={{ fontSize: '0.85rem', color: '#334155', wordBreak: 'break-all', fontWeight: 500 }}>{email}</span>
                      <button 
                        onClick={(e) => { e.preventDefault(); setSelectedStudentEmails(prev => prev.filter(e => e !== email)); }}
                        style={{ background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.25rem', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', transition: 'all 0.2s' }}
                        onMouseOver={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  {selectedStudentEmails.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#fff', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
                      <Users size={40} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
                      <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0 0 0.5rem 0', fontWeight: 600 }}>No students selected</p>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Use the search box to add students</p>
                    </div>
                  )}
                </div>
                
                <div style={{ padding: '1.25rem 1.5rem', background: '#fff', borderTop: '1px solid #e2e8f0', boxShadow: '0 -4px 10px rgba(0,0,0,0.02)' }}>
                  <button
                    onClick={() => setShowStudentSelectionModal(false)}
                    style={{ width: '100%', padding: '0.9rem', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)', transition: 'transform 0.1s' }}
                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'none'}
                  >
                    Confirm & Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
