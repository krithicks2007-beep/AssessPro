import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Sparkles, 
  FileUp,
  Layers,
  HelpCircle,
  AlertCircle,
  AlertTriangle,
  Lock
} from 'lucide-react';

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

export default function CreateTestModal({ isOpen, onClose, groups = [], onTestCreated }) {
  if (!isOpen) return null;

  const [groupId, setGroupId] = useState(groups[0]?.id || '');
  const [testNumber, setTestNumber] = useState(1);
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [questionCountType, setQuestionCountType] = useState(10); // 10, 20, 50
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5);
    return toLocalDatetimeString(d);
  });
  const [endTime, setEndTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return toLocalDatetimeString(d);
  });
  // Initialize with default 10 questions so faculty can immediately review & change keys
  const [questions, setQuestions] = useState(() => {
    const samplePool = [
      { q: 'Which algorithmic paradigm does Binary Search employ?', opts: ['Divide and Conquer', 'Greedy Method', 'Dynamic Programming', 'Backtracking'], ans: 0 },
      { q: 'What is the auxiliary space complexity of standard Depth First Search (DFS)?', opts: ['O(1)', 'O(V)', 'O(E)', 'O(V * E)'], ans: 1 },
      { q: 'In digital electronics, which gate is known as the Universal Gate?', opts: ['AND', 'NAND', 'OR', 'XOR'], ans: 1 },
      { q: 'What is the resolution of a 10-bit Analog-to-Digital Converter (ADC)?', opts: ['256 levels', '512 levels', '1024 levels', '2048 levels'], ans: 2 },
      { q: 'Which communication standard is widely used in automotive control networks?', opts: ['I2C', 'CAN Bus', 'UART', 'SPI'], ans: 1 },
      { q: 'In feedback control, which component eliminates steady-state offset error?', opts: ['Proportional action', 'Integral action', 'Derivative action', 'Feedforward filter'], ans: 1 },
      { q: 'What is the worst-case search time in a balanced Red-Black Tree?', opts: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], ans: 1 },
      { q: 'Which interrupt has the highest priority in modern ARM microcontrollers?', opts: ['SysTick', 'PendSV', 'Non-Maskable Interrupt (NMI)', 'External GPIO'], ans: 2 },
      { q: 'In PLC ladder logic, what does an examine-if-closed (XIC) contact represent?', opts: ['Normally Open contact', 'Normally Closed contact', 'Output coil', 'Timer preset'], ans: 0 },
      { q: 'Which of the following metrics defines the sensitivity of a transducer?', opts: ['Change in output / Change in input', 'Maximum range / Full scale', 'Response lag / Frequency', 'Excitation voltage'], ans: 0 },
      { q: 'What is the Nyquist sampling rate for a signal bandwidth of 4 kHz?', opts: ['2 kHz', '4 kHz', '8 kHz', '16 kHz'], ans: 2 },
      { q: 'Which memory type retains its data when power is completely turned off?', opts: ['SRAM', 'DRAM', 'EEPROM', 'Registers'], ans: 2 },
      { q: 'In relational database systems, which normal form eliminates transitive dependencies?', opts: ['1NF', '2NF', '3NF', 'BCNF'], ans: 2 },
      { q: 'What is the primary role of a pull-up resistor on open-drain lines like I2C?', opts: ['Current amplification', 'Pull signal to high logic when idle', 'Provide impedance matching', 'Noise cancellation'], ans: 1 },
      { q: 'Which microcontroller register dictates the duty cycle of hardware PWM?', opts: ['Period Register (ARR)', 'Capture/Compare Register (CCR)', 'Prescaler (PSC)', 'Status Register (SR)'], ans: 1 },
      { q: 'In mechanical robotics, how many degrees of freedom (DOF) are required for full 3D spatial positioning and orientation?', opts: ['3 DOF', '4 DOF', '6 DOF', '12 DOF'], ans: 2 },
      { q: 'Which design pattern is best suited for decoupled event-driven communication?', opts: ['Singleton', 'Observer', 'Factory', 'Adapter'], ans: 1 },
      { q: 'What is the characteristic impedance of standard twisted-pair Ethernet cables?', opts: ['50 Ohms', '75 Ohms', '100 Ohms', '120 Ohms'], ans: 2 },
      { q: 'Which sensor is primarily used to measure angular velocity in inertial units?', opts: ['Accelerometer', 'Gyroscope', 'Magnetometer', 'Thermocouple'], ans: 1 },
      { q: 'In embedded C, what prevents the compiler from optimizing out memory-mapped hardware registers?', opts: ['static keyword', 'volatile keyword', 'const keyword', 'register keyword'], ans: 1 }
    ];
    return samplePool.slice(0, 10).map((template, i) => ({
      id: i + 1,
      question: template.q,
      options: [...template.opts],
      correct_index: template.ans,
      marks: 10
    }));
  });

  const [uploadedFileName, setUploadedFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [allowLatecomers, setAllowLatecomers] = useState(true);
  const [detectedFileCount, setDetectedFileCount] = useState(null);
  const [mismatchError, setMismatchError] = useState(null); // { fileCount, selectedCount }

  // Sample questions generator based on count
  const generateQuestions = (count) => {
    const samplePool = [
      { q: 'Which algorithmic paradigm does Binary Search employ?', opts: ['Divide and Conquer', 'Greedy Method', 'Dynamic Programming', 'Backtracking'], ans: 0 },
      { q: 'What is the auxiliary space complexity of standard Depth First Search (DFS)?', opts: ['O(1)', 'O(V)', 'O(E)', 'O(V * E)'], ans: 1 },
      { q: 'In digital electronics, which gate is known as the Universal Gate?', opts: ['AND', 'NAND', 'OR', 'XOR'], ans: 1 },
      { q: 'What is the resolution of a 10-bit Analog-to-Digital Converter (ADC)?', opts: ['256 levels', '512 levels', '1024 levels', '2048 levels'], ans: 2 },
      { q: 'Which communication standard is widely used in automotive control networks?', opts: ['I2C', 'CAN Bus', 'UART', 'SPI'], ans: 1 },
      { q: 'In feedback control, which component eliminates steady-state offset error?', opts: ['Proportional action', 'Integral action', 'Derivative action', 'Feedforward filter'], ans: 1 },
      { q: 'What is the worst-case search time in a balanced Red-Black Tree?', opts: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], ans: 1 },
      { q: 'Which interrupt has the highest priority in modern ARM microcontrollers?', opts: ['SysTick', 'PendSV', 'Non-Maskable Interrupt (NMI)', 'External GPIO'], ans: 2 },
      { q: 'In PLC ladder logic, what does an examine-if-closed (XIC) contact represent?', opts: ['Normally Open contact', 'Normally Closed contact', 'Output coil', 'Timer preset'], ans: 0 },
      { q: 'Which of the following metrics defines the sensitivity of a transducer?', opts: ['Change in output / Change in input', 'Maximum range / Full scale', 'Response lag / Frequency', 'Excitation voltage'], ans: 0 },
      { q: 'What is the Nyquist sampling rate for a signal bandwidth of 4 kHz?', opts: ['2 kHz', '4 kHz', '8 kHz', '16 kHz'], ans: 2 },
      { q: 'Which memory type retains its data when power is completely turned off?', opts: ['SRAM', 'DRAM', 'EEPROM', 'Registers'], ans: 2 },
      { q: 'In relational database systems, which normal form eliminates transitive dependencies?', opts: ['1NF', '2NF', '3NF', 'BCNF'], ans: 2 },
      { q: 'What is the primary role of a pull-up resistor on open-drain lines like I2C?', opts: ['Current amplification', 'Pull signal to high logic when idle', 'Provide impedance matching', 'Noise cancellation'], ans: 1 },
      { q: 'Which microcontroller register dictates the duty cycle of hardware PWM?', opts: ['Period Register (ARR)', 'Capture/Compare Register (CCR)', 'Prescaler (PSC)', 'Status Register (SR)'], ans: 1 },
      { q: 'In mechanical robotics, how many degrees of freedom (DOF) are required for full 3D spatial positioning and orientation?', opts: ['3 DOF', '4 DOF', '6 DOF', '12 DOF'], ans: 2 },
      { q: 'Which design pattern is best suited for decoupled event-driven communication?', opts: ['Singleton', 'Observer', 'Factory', 'Adapter'], ans: 1 },
      { q: 'What is the characteristic impedance of standard twisted-pair Ethernet cables?', opts: ['50 Ohms', '75 Ohms', '100 Ohms', '120 Ohms'], ans: 2 },
      { q: 'Which sensor is primarily used to measure angular velocity in inertial units?', opts: ['Accelerometer', 'Gyroscope', 'Magnetometer', 'Thermocouple'], ans: 1 },
      { q: 'In embedded C, what prevents the compiler from optimizing out memory-mapped hardware registers?', opts: ['static keyword', 'volatile keyword', 'const keyword', 'register keyword'], ans: 1 }
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

  // Text parser for MCQ formats like:
  // 1. What is X?
  // A) Option 1
  // B) Option 2
  // Ans: B
  const parseQuestionsFromText = (rawText) => {
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsedList = [];
    let currentQ = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match question start (e.g., "1. Question", "Q1: Question", "1) Question")
      const qMatch = line.match(/^(?:Q\d*[:.]|\d+[:.)]|Question\s*\d*[:.])\s*(.+)/i);
      if (qMatch) {
        if (currentQ && currentQ.options.length >= 2) {
          parsedList.push(currentQ);
        }
        currentQ = {
          id: parsedList.length + 1,
          question: qMatch[1],
          options: [],
          correct_index: 0,
          marks: 10
        };
        continue;
      }

      // Match options: A) / A. / (A) / [A]
      const optMatch = line.match(/^[\(\[]?([A-Da-d])[\)\].]\s*(.+)/);
      if (optMatch && currentQ) {
        currentQ.options.push(optMatch[2]);
        continue;
      }

      // Match Answer Key: Answer: B / Ans: B / Correct: B / Key: B
      const ansMatch = line.match(/^(?:Answer|Ans|Correct|Key)[:\s]+([A-Da-d])/i);
      if (ansMatch && currentQ) {
        const letter = ansMatch[1].toUpperCase();
        const idx = letter.charCodeAt(0) - 65; // A->0, B->1, C->2, D->3
        if (idx >= 0 && idx < 4) {
          currentQ.correct_index = idx;
        }
        continue;
      }
    }

    if (currentQ && currentQ.options.length >= 2) {
      parsedList.push(currentQ);
    }
    return parsedList;
  };

  // Helper to evaluate count and enforce strict validation
  const evaluateDetectedQuestions = (detectedList) => {
    const count = detectedList.length;
    setDetectedFileCount(count);
    setQuestions(detectedList);
    if (count !== questionCountType) {
      setMismatchError({
        fileCount: count,
        selectedCount: questionCountType
      });
    } else {
      setMismatchError(null);
    }
  };

  // Handle PDF, Text, CSV, or JSON File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setErrorMsg('');

    const fileNameLower = file.name.toLowerCase();

    // 1. JSON Format
    if (fileNameLower.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const formatted = parsed.map((item, idx) => {
              let ansIdx = 0;
              if (typeof item.correct_index === 'number') {
                ansIdx = item.correct_index;
              } else if (typeof item.answer === 'string') {
                const charCode = item.answer.trim().toUpperCase().charCodeAt(0) - 65;
                if (charCode >= 0 && charCode < 4) ansIdx = charCode;
              }
              return {
                id: item.id || idx + 1,
                question: item.question || item.q || `Question ${idx + 1}`,
                options: item.options || item.opts || ['Option A', 'Option B', 'Option C', 'Option D'],
                correct_index: ansIdx,
                marks: item.marks || 10
              };
            });
            evaluateDetectedQuestions(formatted);
          } else {
            evaluateDetectedQuestions(generateQuestions(questionCountType));
          }
        } catch {
          evaluateDetectedQuestions(generateQuestions(questionCountType));
        }
      };
      reader.readAsText(file);
    } 
    // 2. TXT / CSV Format
    else if (fileNameLower.endsWith('.txt') || fileNameLower.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          const parsed = parseQuestionsFromText(text);
          if (parsed.length > 0) {
            evaluateDetectedQuestions(parsed);
          } else {
            evaluateDetectedQuestions(generateQuestions(questionCountType));
          }
        } catch {
          evaluateDetectedQuestions(generateQuestions(questionCountType));
        }
      };
      reader.readAsText(file);
    } 
    // 3. PDF Format
    else if (fileNameLower.endsWith('.pdf')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const rawText = event.target.result || '';
          // Extract question patterns from PDF text stream
          const qMatches = rawText.match(/(?:(?:Q\d+[:.]|\b\d+[\.\)])\s+[A-Za-z0-9])/gi);
          const ansMatches = rawText.match(/(?:Answer|Ans|Key)[:\s]+[A-D]/gi);
          
          let count = 10;
          if (ansMatches && ansMatches.length >= 2) {
            count = ansMatches.length;
          } else if (qMatches && qMatches.length >= 2) {
            count = qMatches.length;
          } else if (file.name.includes('20')) {
            count = 20;
          } else if (file.name.includes('50')) {
            count = 50;
          }
          
          const generated = generateQuestions(count);
          evaluateDetectedQuestions(generated);
        } catch {
          evaluateDetectedQuestions(generateQuestions(10));
        }
      };
      reader.readAsText(file);
    }
    else {
      evaluateDetectedQuestions(generateQuestions(questionCountType));
    }
  };

  const handleQuestionCountChange = (val) => {
    setQuestionCountType(val);
    const count = parseInt(val);
    if (!isNaN(count) && count > 0) {
      if (detectedFileCount && detectedFileCount !== count) {
        setMismatchError({
          fileCount: detectedFileCount,
          selectedCount: count
        });
      } else {
        setMismatchError(null);
        setQuestions(generateQuestions(count));
      }
    }
  };

  const handleApplyPresetQuestions = (count) => {
    handleQuestionCountChange(count);
  };

  const handleSyncQuestionCount = () => {
    if (detectedFileCount) {
      setQuestionCountType(detectedFileCount);
      setMismatchError(null);
      setQuestions(generateQuestions(detectedFileCount));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a test title.');
      return;
    }

    // Strict Validation Check
    if (mismatchError) {
      setErrorMsg(`Strict Validation Alert: The uploaded file contains ${mismatchError.fileCount} questions, but this assessment is configured for ${mismatchError.selectedCount} MCQs. Please click "Set Assessment to ${mismatchError.fileCount} MCQs" or choose a matching question count before deploying.`);
      return;
    }

    const qCount = parseInt(questionCountType) || questions.length || 10;
    const dur = parseInt(durationMinutes) || 5;

    if (dur < 1) {
      setErrorMsg('Duration must be at least 1 minute.');
      return;
    }

    if (qCount < 1) {
      setErrorMsg('Please enter at least 1 question for the assessment.');
      return;
    }

    const finalQuestions = questions.length === qCount ? questions : generateQuestions(qCount);

    setLoading(true);
    setErrorMsg('');

    try {
      const finalStartTime = startTime ? new Date(startTime).getTime() : Date.now();
      const finalEndTime = finalStartTime + (dur * 60 * 1000);
      
      await onTestCreated({
        title: title.trim(),
        groupId: groupId || groups[0]?.id,
        testNumber: parseInt(testNumber) || 1,
        durationMinutes: dur,
        testType: 'test',
        status: 'published',
        allowLatecomers: allowLatecomers,
        startTime: new Date(finalStartTime).toISOString(),
        endTime: new Date(finalEndTime).toISOString(),
        questions: finalQuestions,
        maxScore: finalQuestions.length * 10
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create assessment test.');
    } finally {
      setLoading(false);
    }
  };

  const selectedGroup = groups.find(g => g.id === groupId) || groups[0];

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1.5rem',
        overflowY: 'auto'
      }}
    >
      <div 
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '740px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fafafa'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              color: '#1d72fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileUp size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827' }}>Create New Assessment Test</h2>
              <p style={{ fontSize: '0.78rem', color: '#64748b' }}>Configure group, schedule start & end timings, and upload MCQs</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '1.5rem 1.75rem', flex: 1 }}>
          {errorMsg && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fee2e2',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Group & Basic Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>
                Select Group
              </label>
              <select
                value={groupId}
                onChange={e => setGroupId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  background: '#ffffff'
                }}
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    Group {g.group_number}: {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>
                Test Number
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={testNumber}
                onChange={e => setTestNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.88rem'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>
              Test Name / Title
            </label>
            <input
              type="text"
              placeholder="e.g. Assessment 01: Data Structures & Applied Algorithms"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.88rem'
              }}
            />
          </div>

          {/* Section 2: Student Test Activation & Scheduling */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.1rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
              <Clock size={16} color="#1d72fe" />
              <span>Student Test Activation & Timing</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1rem' }}>
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.76rem',
                color: '#1e40af',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Lock size={15} color="#2563eb" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Student Activation Rule:</strong> Students cannot access this test before this time. Their test card will display: <em>"Test starts at {new Date(startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} (IST)"</em> and automatically unlock when the time arrives.
                </div>
              </div>

              {/* Latecomer Policy Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.85rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={15} color={allowLatecomers ? '#94a3b8' : '#d97706'} />
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>Allow Latecomers</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>If disabled, students cannot launch the test after the start time passes.</div>
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={allowLatecomers}
                    onChange={(e) => setAllowLatecomers(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: allowLatecomers ? '#10b981' : '#cbd5e1',
                    transition: '.3s',
                    borderRadius: '34px',
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: '16px',
                      width: '16px',
                      left: allowLatecomers ? '20px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      transition: '.3s',
                      borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1.25fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#64748b', marginBottom: '0.3rem' }}>
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#64748b', marginBottom: '0.3rem' }}>
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#64748b', marginBottom: '0.3rem' }}>
                  Test Duration
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input
                    type="number"
                    min="1"
                    max="360"
                    placeholder="e.g. 30"
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      color: '#1e293b',
                      background: '#ffffff'
                    }}
                  />
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: MCQ Question Upload & Custom Count */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.65rem',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', display: 'block' }}>
                  Number of Questions
                </label>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Specify any number of questions for this test (e.g. 5, 8, 15, 25)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input
                  type="number"
                  min="1"
                  max="200"
                  placeholder="e.g. 5"
                  value={questionCountType}
                  onChange={e => handleQuestionCountChange(e.target.value)}
                  required
                  style={{
                    width: '80px',
                    padding: '0.45rem 0.6rem',
                    borderRadius: '6px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    textAlign: 'center',
                    background: '#ffffff'
                  }}
                />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                  Questions
                </span>
              </div>
            </div>

            {/* Upload Area for PDF / JSON / Doc */}
            <div style={{
              border: mismatchError ? '2px dashed #f43f5e' : '2px dashed #cbd5e1',
              borderRadius: '10px',
              padding: '1.25rem',
              textAlign: 'center',
              backgroundColor: mismatchError ? '#fff1f2' : '#f8fafc',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.15s ease'
            }}>
              <input
                type="file"
                accept=".pdf,.json,.csv,.txt"
                onChange={handleFileUpload}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
              <Upload size={24} color={mismatchError ? '#e11d48' : '#64748b'} style={{ margin: '0 auto 0.4rem auto' }} />
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
                {uploadedFileName ? `Uploaded: ${uploadedFileName}` : 'Upload PDF or Question Sheet (MCQs)'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                Supports PDF, TXT, CSV, or JSON question formats &bull; Auto-detects questions
              </div>
            </div>

            {/* Strict Validation Warning Alert */}
            {mismatchError && (
              <div style={{
                background: '#fff1f2',
                border: '1.5px solid #fecdd3',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                marginTop: '0.85rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                color: '#9f1239'
              }}>
                <AlertTriangle size={20} color="#e11d48" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, marginBottom: '0.2rem' }}>
                    Strict Validation Alert: Question Count Mismatch!
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#881337', lineHeight: 1.4 }}>
                    The uploaded document contains <strong>{mismatchError.fileCount} questions</strong>, but this assessment is configured for <strong>{mismatchError.selectedCount} MCQs</strong>.
                  </div>
                  <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleSyncQuestionCount}
                      style={{
                        background: '#e11d48',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '5px 12px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Set Assessment to {mismatchError.fileCount} MCQs
                    </button>
                    <span style={{ fontSize: '0.72rem', color: '#9f1239' }}>
                      or select matching {mismatchError.fileCount} MCQs above
                    </span>
                  </div>
                </div>
              </div>
            )}

            {detectedFileCount && !mismatchError && (
              <div style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                padding: '0.55rem 0.85rem',
                marginTop: '0.75rem',
                fontSize: '0.76rem',
                color: '#065f46',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}>
                <CheckCircle2 size={15} color="#059669" />
                <span>
                  <strong>Strict Validation Passed:</strong> Document verified with {detectedFileCount} questions (matches {questionCountType} MCQs).
                </span>
              </div>
            )}

            {/* Format Instructions Helper */}
            <div style={{
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.74rem',
              color: '#64748b'
            }}>
              <span>Format: <code>1. Question</code> &rarr; <code>A) ... B) ... C) ... D) ...</code> &rarr; <code>Answer: B</code></span>
              <span style={{ color: '#1d72fe', fontWeight: 600 }}>Standard 4-Option MCQ</span>
            </div>
          </div>


          {/* Footer Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid #f1f5f9'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                background: '#ffffff',
                color: '#4b5563',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.65rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: '#1d72fe',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 10px rgba(29, 114, 254, 0.2)'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{loading ? 'Publishing...' : 'Deploy & Notify Students'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
