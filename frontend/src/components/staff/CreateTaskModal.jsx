import React, { useState, useEffect } from 'react';
import { X, Calendar, Edit3, Target, Clock, Save, Users } from 'lucide-react';
import api from '../../api';
import StudentSelectionModal from './StudentSelectionModal';

export default function CreateTaskModal({ isOpen, onClose, groups, onSave, onLaunch, initialGroupId, existingTask, notifyError }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [groupId, setGroupId] = useState('');
  const [maxScore, setMaxScore] = useState(100);
  const [dueDate, setDueDate] = useState('');

  // Target Audience States
  const [assignTarget, setAssignTarget] = useState('all');
  const [selectedStudentEmails, setSelectedStudentEmails] = useState([]);
  const [showStudentSelectionModal, setShowStudentSelectionModal] = useState(false);
  const [availableStudents, setAvailableStudents] = useState([]);

  useEffect(() => {
    api.getAllStudents().then(list => {
      if (Array.isArray(list)) setAvailableStudents(list);
    }).catch(err => console.error("Failed to load students", err));
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (existingTask) {
        setTitle(existingTask.title || '');
        setDescription(existingTask.description || '');
        setGroupId(existingTask.group_id || '');
        setMaxScore(existingTask.max_score || 100);
        // format due_date correctly for datetime-local
        let dateStr = '';
        if (existingTask.due_date) {
          const d = new Date(existingTask.due_date);
          // adjust for local timezone offset to display correctly in datetime-local
          if (!isNaN(d)) {
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            dateStr = d.toISOString().slice(0, 16);
          }
        }
        setDueDate(dateStr);
        setAssignTarget(existingTask.assigned_students && existingTask.assigned_students.length > 0 ? 'specific' : 'all');
        setSelectedStudentEmails(existingTask.assigned_students || []);
      } else {
        setTitle('');
        setDescription('');
        setGroupId(initialGroupId || (groups && groups.length > 0 ? groups[0].id : ''));
        setMaxScore(100);
        setDueDate('');
        setAssignTarget('all');
        setSelectedStudentEmails([]);
      }
    }
  }, [isOpen, groups, initialGroupId, existingTask]);

  if (!isOpen) return null;

  const validate = () => {
    if (!title.trim()) {
      notifyError ? notifyError('Please enter a task title') : alert('Please enter a task title');
      return false;
    }
    if (!description.trim()) {
      notifyError ? notifyError('Please provide instructions/description for the task') : alert('Please provide instructions/description for the task');
      return false;
    }
    if (!dueDate) {
      notifyError ? notifyError('Please select a due date and time') : alert('Please select a due date and time');
      return false;
    }
    if (assignTarget === 'specific' && selectedStudentEmails.length === 0) {
      notifyError ? notifyError('Please select at least one student, or switch to "All Students"') : alert('Please select at least one student, or switch to "All Students"');
      return false;
    }
    return true;
  };

  const buildPayload = (status) => ({
    title, 
    description, 
    groupId, 
    maxScore: Number(maxScore), 
    dueDate, 
    status,
    assignedStudents: assignTarget === 'specific' ? selectedStudentEmails : []
  });

  const handleSaveDraft = () => {
    if (validate()) onSave(buildPayload('draft'));
  };

  const handlePublishNow = () => {
    if (validate()) onLaunch(buildPayload('published'));
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000,
      backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
    }}>
      <div style={{
        background: '#ffffff', borderRadius: '18px', maxWidth: '650px', width: '100%',
        padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #cbd5e1', position: 'relative',
        display: 'flex', flexDirection: 'column', gap: '1.5rem',
        maxHeight: '90vh', overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              {existingTask ? 'Edit Project Task' : 'Create New Project Task'}
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: '#64748b' }}>
              {existingTask ? 'Update the requirements and deadline for this task.' : 'Define the requirements and deadline for student submission.'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
            <X size={24} color="#64748b" />
          </button>
        </div>

        {/* Form Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Task Title</label>
            <div style={{ position: 'relative' }}>
              <Edit3 size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="e.g. Final Portfolio Submission"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%', padding: '0.85rem 1rem 0.85rem 2.5rem', borderRadius: '10px',
                  border: '1px solid #cbd5e1', fontSize: '1rem', color: '#1e293b', outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Task Instructions / Guidelines</label>
            <textarea
              placeholder="Describe what the students need to do and what link they need to submit..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{
                width: '100%', padding: '0.85rem 1rem', borderRadius: '10px',
                border: '1px solid #cbd5e1', fontSize: '1rem', color: '#1e293b', outline: 'none', resize: 'vertical'
              }}
            />
          </div>

          {/* Target Group */}
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Assign to Group</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              style={{
                width: '100%', padding: '0.85rem 1rem', borderRadius: '10px',
                border: '1px solid #cbd5e1', fontSize: '1rem', color: '#1e293b', outline: 'none', backgroundColor: '#f8fafc'
              }}
            >
              {groups.filter(g => g.group_type === 'task').map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
              {groups.filter(g => g.group_type === 'task').length === 0 && (
                <option value="" disabled>No Task Groups Available. Please create one.</option>
              )}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1.25rem' }}>
            {/* Max Score */}
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Max Marks/Score</label>
              <div style={{ position: 'relative' }}>
                <Target size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="number"
                  min="1"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  style={{
                    width: '100%', padding: '0.85rem 1rem 0.85rem 2.5rem', borderRadius: '10px',
                    border: '1px solid #cbd5e1', fontSize: '1rem', color: '#1e293b', outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Due Date */}
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Due Date & Time</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{
                    width: '100%', padding: '0.85rem 1rem 0.85rem 2.5rem', borderRadius: '10px',
                    border: '1px solid #cbd5e1', fontSize: '1rem', color: '#1e293b', outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Target Audience */}
          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '0.75rem' }}>Target Audience</label>
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: assignTarget === 'specific' ? '1rem' : 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="radio" checked={assignTarget === 'all'} onChange={() => setAssignTarget('all')} />
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#334155' }}>All Students</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  checked={assignTarget === 'specific'} 
                  onChange={() => {
                    setAssignTarget('specific');
                    setShowStudentSelectionModal(true);
                  }} 
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#334155' }}>Specific Students</span>
              </label>
            </div>
            
            {assignTarget === 'specific' && (
              <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: '0.1rem' }}>Specific Students Selected</span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedStudentEmails.length} students currently selected</span>
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); setShowStudentSelectionModal(true); }}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#c026d3', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                  }}
                >
                  <Users size={14} /> Manage Students
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem', borderRadius: '10px', border: '1px solid #cbd5e1',
              background: '#ffffff', color: '#64748b', fontSize: '1rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleSaveDraft}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.5rem', borderRadius: '10px', border: '1px solid #c026d3',
              background: '#fdf4ff', color: '#c026d3', fontSize: '1rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            <Save size={18} /> Save Draft
          </button>

          <button
            onClick={handlePublishNow}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.5rem', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #c026d3 0%, #a21caf 100%)', color: '#ffffff', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(192,38,211,0.3)'
            }}
          >
            Publish Task
          </button>
        </div>
      </div>

      <StudentSelectionModal
        isOpen={showStudentSelectionModal}
        onClose={() => setShowStudentSelectionModal(false)}
        availableStudents={availableStudents}
        initialSelectedEmails={selectedStudentEmails}
        onSave={setSelectedStudentEmails}
      />
    </div>
  );
}
