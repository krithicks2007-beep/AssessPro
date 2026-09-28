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
  ChevronUp
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
  
  const [uploadedFileName, setUploadedFileName] = useState(initialFileName);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [allowLatecomers, setAllowLatecomers] = useState(existingTest?.allow_latecomers !== false);
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
    if (!title.trim()) {
      setErrorMsg('Please enter a test title.');
      return;
    }
    if (mismatchError) {
      setErrorMsg(`Validation Alert: The uploaded file contains ${mismatchError.fileCount} questions, but configured for ${mismatchError.selectedCount}.`);
      return;
    }

    const qCount = parseInt(questionCountType) || questions.length || 10;
    const dur = parseInt(durationMinutes) || 5;
    
    if (dur < 1) return setErrorMsg('Duration must be at least 1 minute.');
    if (qCount < 1) return setErrorMsg('Please enter at least 1 question.');
    if (assignTarget === 'specific' && selectedStudentEmails.length === 0) return setErrorMsg('Please select at least one student.');

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
        allowLatecomers: allowLatecomers,
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
                onChange={e => setTitle(e.target.value)} 
                placeholder="e.g. Midterm Physics"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.95rem' }} 
              />
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
                  onChange={e => setDurationMinutes(e.target.value)} 
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.95rem' }} 
                />
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
                onChange={e => setStartTime(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.95rem' }}
              />
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
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" id="latecomers" checked={allowLatecomers} onChange={e => setAllowLatecomers(e.target.checked)} />
            <label htmlFor="latecomers" style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>Allow latecomers (time will be strictly cut off at deadline)</label>
          </div>
        </div>

        {/* Target Audience Container */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '2rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>Target Audience</h2>
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" checked={assignTarget === 'all'} onChange={() => setAssignTarget('all')} />
              <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#334155' }}>All Students</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" checked={assignTarget === 'specific'} onChange={() => setAssignTarget('specific')} />
              <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#334155' }}>Specific Students</span>
            </label>
          </div>
          {assignTarget === 'specific' && (
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <input 
                type="text" 
                placeholder="Search student by name or email..." 
                value={studentSearch} 
                onChange={(e) => setStudentSearch(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem', background: '#fff' }}
              />
              <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {availableStudents.filter(s => s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.email?.toLowerCase().includes(studentSearch.toLowerCase())).map(student => (
                  <label key={student.email} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedStudentEmails.includes(student.email)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedStudentEmails(prev => [...prev, student.email]);
                        else setSelectedStudentEmails(prev => prev.filter(email => email !== student.email));
                      }}
                    />
                    <span style={{ fontSize: '0.9rem', color: '#1e293b' }}>{student.full_name} ({student.email})</span>
                  </label>
                ))}
              </div>
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

            {/* Expandable Question Preview */}
            {showQuestionsPreview && questions.length > 0 && (
              <div style={{ marginTop: '1.25rem', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#f8fafc', padding: '1.25rem', textAlign: 'left', maxHeight: '380px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#1e293b' }}>
                    Parsed Questions from {uploadedFileName} ({questions.length})
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>✓ Verified Direct from File</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {questions.map((q, idx) => (
                    <div key={q.id || idx} style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a', marginBottom: '0.4rem' }}>
                        {idx + 1}. {q.question}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.35rem', fontSize: '0.82rem' }}>
                        {q.options?.map((opt, optIdx) => {
                          const isCorrect = q.correct_index === optIdx;
                          const letter = String.fromCharCode(65 + optIdx);
                          return (
                            <div key={optIdx} style={{
                              padding: '0.35rem 0.6rem',
                              borderRadius: '6px',
                              background: isCorrect ? '#ecfdf5' : '#f8fafc',
                              border: isCorrect ? '1px solid #86efac' : '1px solid #e2e8f0',
                              color: isCorrect ? '#166534' : '#475569',
                              fontWeight: isCorrect ? 600 : 400
                            }}>
                              {letter}) {opt} {isCorrect && '✓'}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', paddingBottom: '3rem' }}>
          <button
            onClick={(e) => handleSubmit(e, 'draft')}
            disabled={loading}
            style={{
              padding: '0.85rem 1.5rem', borderRadius: '8px', border: '1px solid #10b981', background: '#ecfdf5', color: '#10b981', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
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
        </div>

      </div>
    </div>
  );
}
