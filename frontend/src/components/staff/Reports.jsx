import React, { useState, useEffect } from 'react';
import { Download, FileText, CheckSquare, Search, Loader } from 'lucide-react';
import { getSupabaseClient } from '../../supabaseClient';
import { parseBitEmail } from '../../utils/studentParser';

export default function Reports({ groups, tests, tasks }) {
  const [viewMode, setViewMode] = useState('tests'); // 'tests' | 'tasks'
  const [testSubmissions, setTestSubmissions] = useState([]);
  const [taskSubmissions, setTaskSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;
        
        // Batch fetch test submissions
        const testIds = tests.map(t => t.id);
        let tSubs = [];
        if (testIds.length > 0) {
           const { data: tData } = await supabase.from('test_submissions').select('*').in('test_id', testIds);
           tSubs = tData || [];
        }

        // Batch fetch task submissions
        const taskIds = tasks.map(t => t.id);
        let tkSubs = [];
        if (taskIds.length > 0) {
           const { data: tkData } = await supabase.from('task_submissions').select('*, users(*)').in('task_id', taskIds);
           tkSubs = tkData || [];
        }

        setTestSubmissions(tSubs);
        setTaskSubmissions(tkSubs);

      } catch (err) {
         console.error('Error fetching reports data:', err);
      } finally {
         setLoading(false);
      }
    };
    fetchData();
  }, [tests, tasks]);

  const downloadCSV = (group, isTestsMode) => {
     let rows = [];
     
     if (isTestsMode) {
        const groupTests = tests.filter(t => t.group_id === group.id);
        rows.push(['Test Name', 'Student Name', 'Email', 'Reg No', 'Mark']);
        
        groupTests.forEach(test => {
           const subs = testSubmissions.filter(s => s.test_id === test.id);
           subs.forEach(s => {
              const email = s.student_email || s.email || '';
              const parsed = parseBitEmail(email);
              const name = s.student_name || parsed?.formattedName || 'Unknown';
              const reg = s.student_regno || parsed?.predictedRegNo || (email.split('@')[0].split('.')[1] || '').toUpperCase();
              
              // Quote strings to prevent CSV breaking on commas
              rows.push([
                 `"${test.title || 'Untitled'}"`,
                 `"${name}"`,
                 `"${email}"`,
                 `"${reg}"`,
                 `"${s.percentage != null ? s.percentage + '%' : '0%'}"`
              ]);
           });
        });
     } else {
        const groupTasks = tasks.filter(t => t.group_id === group.id);
        rows.push(['Task Name', 'Student Name', 'Email', 'Reg No', 'Mark']);
        
        groupTasks.forEach(task => {
           const subs = taskSubmissions.filter(s => s.task_id === task.id);
           subs.forEach(s => {
              const studentEmail = s.users?.mailid || s.users?.email || s.student_id || 'Unknown';
              const parsed = parseBitEmail(studentEmail);
              const name = parsed?.formattedName || 'Unknown';
              const reg = parsed?.predictedRegNo || (studentEmail.split('@')[0].split('.')[1] || '').toUpperCase();
              
              const max = task.max_score || 100;
              const mark = s.score != null ? `${Math.round((s.score / max) * 100)}%` : 'Ungraded';
              
              rows.push([
                 `"${task.title || 'Untitled'}"`,
                 `"${name}"`,
                 `"${studentEmail}"`,
                 `"${reg}"`,
                 `"${mark}"`
              ]);
           });
        });
     }
     
     if (rows.length === 1) {
        alert('No data to export for this group yet.');
        return;
     }
     
     const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", `${group.name || 'Group'}_${isTestsMode ? 'Tests' : 'Tasks'}_Report.csv`);
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  const downloadAllCSV = () => {
     let rows = [];
     const isTestsMode = viewMode === 'tests';
     
     if (isTestsMode) {
        rows.push(['Group Name', 'Test Name', 'Student Name', 'Email', 'Reg No', 'Mark']);
        
        groups.forEach(group => {
           const groupTests = tests.filter(t => t.group_id === group.id);
           groupTests.forEach(test => {
              const subs = testSubmissions.filter(s => s.test_id === test.id);
              subs.forEach(s => {
                 const email = s.student_email || s.email || '';
                 const parsed = parseBitEmail(email);
                 const name = s.student_name || parsed?.formattedName || 'Unknown';
                 const reg = s.student_regno || parsed?.predictedRegNo || (email.split('@')[0].split('.')[1] || '').toUpperCase();
                 
                 rows.push([
                    `"${group.name || 'Unnamed Group'}"`,
                    `"${test.title || 'Untitled'}"`,
                    `"${name}"`,
                    `"${email}"`,
                    `"${reg}"`,
                    `"${s.percentage != null ? s.percentage + '%' : '0%'}"`
                 ]);
              });
           });
        });
     } else {
        rows.push(['Group Name', 'Task Name', 'Student Name', 'Email', 'Reg No', 'Mark']);
        
        groups.forEach(group => {
           const groupTasks = tasks.filter(t => t.group_id === group.id);
           groupTasks.forEach(task => {
              const subs = taskSubmissions.filter(s => s.task_id === task.id);
              subs.forEach(s => {
                 const email = s.users?.mailid || s.users?.email || s.student_id || '';
                 const parsed = parseBitEmail(email);
                 const name = parsed?.formattedName || 'Unknown';
                 const reg = parsed?.predictedRegNo || (email.split('@')[0].split('.')[1] || '').toUpperCase();
                 
                 const max = task.max_score || 100;
                 const mark = s.score != null ? `${Math.round((s.score / max) * 100)}%` : 'Ungraded';
                 
                 rows.push([
                    `"${group.name || 'Unnamed Group'}"`,
                    `"${task.title || 'Untitled'}"`,
                    `"${name}"`,
                    `"${email}"`,
                    `"${reg}"`,
                    `"${mark}"`
                 ]);
              });
           });
        });
     }
     
     if (rows.length === 1) {
        alert('No data to export.');
        return;
     }
     
     const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", `All_Groups_${isTestsMode ? 'Tests' : 'Tasks'}_Report.csv`);
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  return (
    <div className="dashboard-content">
      <div style={{
        background: '#ffffff',
        padding: '1.25rem 1.75rem',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Performance Reports
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            Download detailed CSV reports for your groups. Data includes all student submissions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* View Toggle */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '0.35rem',
            borderRadius: '12px',
            gap: '0.35rem'
          }}>
            <button
              onClick={() => setViewMode('tests')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'tests' ? '#1d72fe' : 'transparent',
                color: viewMode === 'tests' ? '#ffffff' : '#64748b',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'tests' ? '0 2px 8px rgba(29, 114, 254, 0.3)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <FileText size={16} />
              Tests
            </button>
            <button
              onClick={() => setViewMode('tasks')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'tasks' ? '#1d72fe' : 'transparent',
                color: viewMode === 'tasks' ? '#ffffff' : '#64748b',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'tasks' ? '0 2px 8px rgba(29, 114, 254, 0.3)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <CheckSquare size={16} />
              Tasks
            </button>
          </div>

          <button
             onClick={downloadAllCSV}
             style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.75rem 1.25rem',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
                transition: 'all 0.2s'
             }}
          >
             <Download size={16} />
             Download Complete CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
           <Loader className="spin" size={32} style={{ margin: '0 auto 1rem', display: 'block', color: '#cbd5e1' }} />
           Loading report data...
        </div>
      ) : groups.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
           No groups found. Please create a group first.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {(() => {
             const activeGroups = groups.filter(group => {
                const isTestsMode = viewMode === 'tests';
                const groupItems = isTestsMode ? tests.filter(t => t.group_id === group.id) : tasks.filter(t => t.group_id === group.id);
                return groupItems.length > 0;
             });

             if (activeGroups.length === 0) {
                return (
                   <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                      No {viewMode} assigned to any group yet.
                   </div>
                );
             }

             return activeGroups.map(group => {
                const isTestsMode = viewMode === 'tests';
                const groupItems = isTestsMode ? tests.filter(t => t.group_id === group.id) : tasks.filter(t => t.group_id === group.id);
             
             return (
                <div key={group.id} style={{ 
                   background: '#ffffff', 
                   borderRadius: '16px', 
                   border: '1px solid #e2e8f0', 
                   overflow: 'hidden',
                   boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                }}>
                   {/* Group Header */}
                   <div style={{ 
                      padding: '1.25rem 1.5rem', 
                      background: '#f8fafc', 
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                   }}>
                      <div>
                         <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                            {group.name || 'Unnamed Group'}
                         </h3>
                         <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                            {group.category || 'Subject Group'}
                         </span>
                      </div>
                      <button
                         onClick={() => downloadCSV(group, isTestsMode)}
                         style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.55rem 1.1rem',
                            background: '#1e293b',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(30, 41, 59, 0.15)'
                         }}
                      >
                         <Download size={15} />
                         Download as CSV
                      </button>
                   </div>

                   {/* Group Content (Tests/Tasks) */}
                   <div style={{ padding: '1.5rem' }}>
                      {groupItems.length === 0 ? (
                         <div style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>
                            No {isTestsMode ? 'tests' : 'tasks'} assigned to this group yet.
                         </div>
                      ) : (
                         <div style={{ display: 'grid', gap: '1.25rem' }}>
                            {groupItems.map(item => {
                               const subs = isTestsMode 
                                  ? testSubmissions.filter(s => s.test_id === item.id)
                                  : taskSubmissions.filter(s => s.task_id === item.id);

                               return (
                                  <div key={item.id} style={{ border: '1px solid #f1f5f9', borderRadius: '12px', padding: '1rem', background: '#fafaf9' }}>
                                     <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.95rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {isTestsMode ? <FileText size={16} color="#1d72fe" /> : <CheckSquare size={16} color="#14b8a6" />}
                                        {item.title}
                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: '#e2e8f0', padding: '0.1rem 0.5rem', borderRadius: '12px', marginLeft: 'auto', fontWeight: 600 }}>
                                           {subs.length} Submissions
                                        </span>
                                     </div>
                                     
                                     {subs.length === 0 ? (
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                           No students have submitted this yet.
                                        </div>
                                     ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                                           {subs.map(sub => {
                                              let name = 'Unknown';
                                              let mark = '0%';
                                              let reg = '';

                                              if (isTestsMode) {
                                                 const email = sub.student_email || sub.email || '';
                                                 const parsed = parseBitEmail(email);
                                                 name = sub.student_name || parsed?.formattedName || 'Student';
                                                 mark = sub.percentage != null ? `${sub.percentage}%` : '0%';
                                                 reg = sub.student_regno || parsed?.predictedRegNo || (email.split('@')[0].split('.')[1] || '').toUpperCase();
                                              } else {
                                                 const email = sub.users?.mailid || sub.users?.email || sub.student_id || 'Unknown';
                                                 const parsed = parseBitEmail(email);
                                                 name = parsed?.formattedName || 'Unknown';
                                                 reg = parsed?.predictedRegNo || (email.split('@')[0].split('.')[1] || '').toUpperCase();
                                                 
                                                 const max = item.max_score || 100;
                                                 mark = sub.score != null ? `${Math.round((sub.score / max) * 100)}%` : 'Ungraded';
                                              }

                                              return (
                                                 <div key={sub.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', overflow: 'hidden' }}>
                                                       <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                          {name}
                                                       </span>
                                                       {reg && (
                                                          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{reg}</span>
                                                       )}
                                                    </div>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isTestsMode ? '#1d72fe' : '#14b8a6', paddingLeft: '0.5rem' }}>
                                                       {mark}
                                                    </span>
                                                 </div>
                                              );
                                           })}
                                        </div>
                                     )}
                                  </div>
                               );
                            })}
                         </div>
                      )}
                   </div>
                </div>
             );
          });
          })()}
        </div>
      )}
    </div>
  );
}
