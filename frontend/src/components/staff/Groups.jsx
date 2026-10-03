import React from 'react';
import { FolderPlus, Edit3, Trash2, Check, Plus, X } from 'lucide-react';

/**
 * Manage Groups Page
 * Allows faculty to rename existing groups or add new ones.
 */
export default function Groups({
  groups,
  groupColors,
  editingGroupId,
  editingGroupName,
  setEditingGroupName,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onDeleteGroup,
  newGroupName,
  setNewGroupName,
  newGroupCategory,
  setNewGroupCategory,
  facultyDept,
  onAddNewGroup
}) {
  const [isCustomCategory, setIsCustomCategory] = React.useState(false);

  return (
    <div className="dashboard-content">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        background: '#ffffff',
        padding: '1.25rem 1.75rem',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FolderPlus size={22} color="#1d72fe" />
            Manage Academic Groups
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            Rename existing groups or add a new group. Changes reflect live on student dashboards.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
        {/* Left: List of current groups with inline rename */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.2rem', color: '#111827' }}>
            Current Active Groups ({groups.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {groups.map((group, idx) => (
              <div
                key={group.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px'
                }}
              >
                {editingGroupId === group.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, marginRight: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={editingGroupName}
                      onChange={(e) => setEditingGroupName(e.target.value)}
                      style={{ padding: '0.45rem 0.6rem', fontSize: '0.84rem' }}
                      autoFocus
                    />
                    <button
                      className="btn-submit"
                      style={{ width: 'auto', padding: '0.45rem 0.75rem', fontSize: '0.75rem', background: '#1d72fe' }}
                      onClick={() => onSaveRename(group.id)}
                    >
                      <Check size={14} /> Save
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: '0.45rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={onCancelRename}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: group.color || groupColors[idx % groupColors.length]
                      }} />
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: '#111827' }}>
                          Group {group.group_number || idx + 1}: {group.name}
                        </strong>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.1rem' }}>
                          {group.category || 'Core Subjects'} &bull; {group.department}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', background: '#eff6ff', color: '#1d72fe', border: '1px solid #bfdbfe', borderRadius: '6px' }}
                        onClick={() => onStartRename(group)}
                        title="Rename Group"
                      >
                        <Edit3 size={14} /> Rename
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px' }}
                        onClick={() => onDeleteGroup(group.id)}
                        title="Delete Group"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Add New Group Form */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.2rem', color: '#111827' }}>
            Add New Group with Constraints
          </h3>
          
          <form onSubmit={onAddNewGroup}>
            <div className="form-group">
              <label className="form-label">Group Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Group 4: Autonomous Systems"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                minLength={3}
                maxLength={50}
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.4rem' }}>
                Constraint: Min 3 chars, max 50 chars.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-input"
                value={isCustomCategory ? 'Other' : newGroupCategory}
                onChange={(e) => {
                  if (e.target.value === 'Other') {
                    setIsCustomCategory(true);
                    setNewGroupCategory('');
                  } else {
                    setIsCustomCategory(false);
                    setNewGroupCategory(e.target.value);
                  }
                }}
              >
                <option value="Core Subjects">Core Subjects</option>
                <option value="Professional Core">Professional Core</option>
                <option value="Specialization Subjects">Specialization Subjects</option>
                <option value="Elective & Lab">Elective & Lab</option>
                <option value="Other">Other</option>
              </select>
              {isCustomCategory && (
                <input
                  type="text"
                  className="form-input"
                  style={{ marginTop: '0.5rem' }}
                  placeholder="Enter custom category"
                  value={newGroupCategory}
                  onChange={(e) => setNewGroupCategory(e.target.value)}
                  required
                />
              )}
            </div>
            
            <div className="form-group">
              <label className="form-label">Department Constraint</label>
              <input type="text" className="form-input" value={facultyDept} disabled style={{ background: '#f3f4f6' }} />
            </div>

            <button type="submit" className="btn-submit" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}>
              <Plus size={16} /> Add Group
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
