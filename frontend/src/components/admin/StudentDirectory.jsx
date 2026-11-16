import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, AlertCircle, ArrowLeft, X, Save, Trash2 } from "lucide-react";
import api from "../../api";
import StudentDashboard from "../student/Dashboard";

const YEAR_OPTIONS = [
  { label: "Select Year", value: "" },
  { label: "1st Year", value: "I Year" },
  { label: "2nd Year", value: "II Year" },
  { label: "3rd Year", value: "III Year" },
  { label: "4th Year", value: "IV Year" },
];

export default function StudentDirectory({ allUsers, onImpersonate }) {
  const [studentsList, setStudentsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [studentStats, setStudentStats] = useState({});
  const [viewingStudent, setViewingStudent] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [allGroups, setAllGroups] = useState([]);
  const [allTests, setAllTests] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [studentTaskSubmissions, setStudentTaskSubmissions] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setStaffList((allUsers || []).filter(u => (u.role || u.UserType || "").toLowerCase() === "staff"));
  }, [allUsers]);

  useEffect(() => {
    if (viewingStudent && !showDashboard) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [viewingStudent, showDashboard]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await api.getAllStudents();
        const sList = Array.isArray(data) ? data : [];
        setStudentsList(sList);
        const tests = await api.getTests();
        const groups = await api.getGroups({ all: true });
        setAllTests(tests || []);
        setAllGroups(groups || []);
        try {
          const { getSupabaseClient } = await import("../../supabaseClient");
          const supabase = getSupabaseClient();
          if (supabase) {
            const [{ data: subs }, { data: taskSubs }, { data: dbTasks }] = await Promise.all([
              supabase.from("test_submissions").select("student_email, score, max_score, percentage").eq("status", "completed"),
              supabase.from("task_submissions").select("student_id, task_id, score, status").in("status", ["reviewed", "graded"]),
              supabase.from("tasks").select("*, groups(*)").eq("status", "published")
            ]);
            setAllTasks(dbTasks || []);

            const taskMap = new Map();
            (dbTasks || []).forEach(tk => taskMap.set(String(tk.id), tk));

            const studentIdMap = new Map();
            sList.forEach(st => {
              if (st.id && st.email) studentIdMap.set(st.id, st.email.toLowerCase());
            });

            const stats = {};
            // Tally completed test submissions
            (subs || []).forEach(sub => {
              const em = (sub.student_email || "").toLowerCase().trim();
              if (!em) return;
              if (!stats[em]) stats[em] = { testPctSum: 0, testCount: 0, taskPctSum: 0, taskCount: 0 };
              const pct = sub.percentage != null 
                ? Number(sub.percentage) 
                : (Number(sub.max_score) > 0 ? (Number(sub.score) / Number(sub.max_score)) * 100 : 0);
              stats[em].testPctSum += pct;
              stats[em].testCount++;
            });

            // Tally reviewed task submissions
            (taskSubs || []).forEach(tsub => {
              const em = studentIdMap.get(tsub.student_id);
              if (!em) return;
              if (!stats[em]) stats[em] = { testPctSum: 0, testCount: 0, taskPctSum: 0, taskCount: 0 };
              const tk = taskMap.get(String(tsub.task_id));
              const max = Number(tk?.max_score) || 100;
              const pct = max > 0 ? (Number(tsub.score || 0) / max) * 100 : 0;
              stats[em].taskPctSum += pct;
              stats[em].taskCount++;
            });

            const finalStats = {};
            for (const [em, s] of Object.entries(stats)) {
              const testAvg = s.testCount > 0 ? s.testPctSum / s.testCount : null;
              const taskAvg = s.taskCount > 0 ? s.taskPctSum / s.taskCount : null;
              let combinedAvg = 0;
              if (testAvg !== null && taskAvg !== null) {
                combinedAvg = Math.round((testAvg + taskAvg) / 2);
              } else if (testAvg !== null) {
                combinedAvg = Math.round(testAvg);
              } else if (taskAvg !== null) {
                combinedAvg = Math.round(taskAvg);
              }
              finalStats[em] = { 
                avg: combinedAvg, 
                count: s.testCount + s.taskCount,
                testCount: s.testCount,
                taskCount: s.taskCount
              };
            }
            setStudentStats(finalStats);
          }
        } catch (e) {
          console.warn("StudentDirectory stats loading error:", e);
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredStudents = studentsList.filter(s => {
    const q = searchQuery.toLowerCase();
    const match = (s.name || "").toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q) || (s.reg_no || "").toLowerCase().includes(q);
    if (!match) return false;
    const stat = studentStats[(s.email || "").toLowerCase()] || { avg: 0 };
    if (filterType === "below70") return stat.avg > 0 && stat.avg < 70;
    if (filterType === "top") return stat.avg >= 70;
    if (filterType === "unassigned") return !s.assigned_staff_name;
    return true;
  });

  const handleStudentClick = async (stud) => {
    setViewingStudent(stud);
    setShowDashboard(false);
    setEditingStudent({ ...stud });
    try {
      const { getSupabaseClient } = await import("../../supabaseClient");
      const supabase = getSupabaseClient();
      if (supabase) {
        const [{ data: sData }, { data: subData }] = await Promise.all([
          supabase.from("test_submissions").select("*").eq("student_email", (stud.email || "").toLowerCase()),
          supabase.from("task_submissions").select("*").eq("student_id", stud.id)
        ]);
        setStudentSubmissions(sData || []);
        setStudentTaskSubmissions(subData || []);
      }
    } catch (e) { 
      setStudentSubmissions([]); 
      setStudentTaskSubmissions([]);
    }
  };

  const handleSaveStudent = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/students/${editingStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("assesspro_auth_token") || ""}` },
        body: JSON.stringify({ name: editingStudent.name, reg_no: editingStudent.reg_no, department: editingStudent.department, year: editingStudent.year, dob: editingStudent.dob || null, assigned_staff_id: editingStudent.assigned_staff_id || null, assigned_staff_name: editingStudent.assigned_staff_name || null })
      });
      const data = await res.json();
      if (res.ok) {
        const updatedList = studentsList.map(s => s.id === editingStudent.id ? editingStudent : s);
        setStudentsList(updatedList);
        setViewingStudent(editingStudent);
        alert("Student info updated successfully!");
      } else { alert("Failed to update: " + (data.error || res.statusText)); }
    } catch (err) { alert("Error updating student: " + err.message); }
    setIsSaving(false);
  };

  const handleDeleteUser = async () => {
    if (!viewingStudent || !viewingStudent.email) return;
    
    const choice = window.prompt(
      `Remove ${viewingStudent.name}?\n\nType 'HARD' to remove and wipe all their past data.\nType 'SOFT' to suspend them but keep their past data.`
    );
    
    if (!choice) return;
    const banType = choice.trim().toUpperCase();
    
    if (banType !== 'HARD' && banType !== 'SOFT') {
      alert('Invalid choice. Must type HARD or SOFT.');
      return;
    }
    
    try {
      const type = banType === 'HARD' ? 'suspended_hard' : 'suspended_soft';
      await api.banUser(viewingStudent.email, type);
      
      if (banType === 'HARD') {
         setStudentsList(studentsList.filter(s => s.id !== viewingStudent.id));
      } else {
         // Soft delete just keeps them in list for now
         alert('Student suspended successfully.');
      }
      
      setViewingStudent(null);
      alert(`User successfully ${banType === 'HARD' ? 'hard deleted (data wiped)' : 'soft suspended'}.`);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleStaffChange = (e) => {
    const staffId = e.target.value;
    if (!staffId) { setEditingStudent({ ...editingStudent, assigned_staff_id: null, assigned_staff_name: null }); return; }
    const staff = staffList.find(s => s.id === staffId);
    if (staff) setEditingStudent({ ...editingStudent, assigned_staff_id: staff.id, assigned_staff_name: staff.name });
  };

  if (viewingStudent && showDashboard) {
    const stat = studentStats[(viewingStudent.email || "").toLowerCase()] || { avg: 0, count: 0 };
    const cleanEmail = (viewingStudent.email || "").toLowerCase().trim();

    const studentTests = allTests.filter(t => {
      if (t.status === 'draft') return false;
      if (!t.assigned_students || t.assigned_students.length === 0) return true;
      return t.assigned_students.map(e => (typeof e === "string" ? e : e?.email || "").toLowerCase()).includes(cleanEmail);
    });

    const studentTasks = allTasks.filter(t => {
      if (t.status === 'draft') return false;
      if (!t.assigned_students || t.assigned_students.length === 0) return true;
      return t.assigned_students.map(e => (typeof e === "string" ? e : e?.email || "").toLowerCase()).includes(cleanEmail);
    });

    const assignedStaffId = viewingStudent.assigned_staff_id || "";
    const testGroupIds = new Set(studentTests.map(t => t.group_id).filter(Boolean));
    const taskGroupIds = new Set(studentTasks.map(t => t.group_id).filter(Boolean));
    const visibleGroups = allGroups.filter(g => 
      (assignedStaffId && String(g.created_by || g.staff_id) === String(assignedStaffId)) || 
      testGroupIds.has(g.id) ||
      taskGroupIds.has(g.id)
    );

    return (
      <div className="dashboard-content page-transition-enter">
        <button onClick={() => { setShowDashboard(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", background: "none", border: "none", color: "#1d72fe", cursor: "pointer", fontWeight: 600 }}>
          <ArrowLeft size={18} /> Back to Student Info
        </button>
        <div style={{ pointerEvents: "none", opacity: 0.97 }}>
          <StudentDashboard 
            groups={visibleGroups} 
            tests={studentTests} 
            tasks={studentTasks}
            studentSubmissions={studentSubmissions} 
            studentTaskSubmissions={studentTaskSubmissions}
            studentName={viewingStudent.name} 
            studentDept={viewingStudent.department}
            studentYear={viewingStudent.year}
            overallScore={stat.avg} 
            testsCompletedCount={stat.count} 
            assignedStaff={viewingStudent}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <div className="table-card">
        <div className="table-header-action" style={{ flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#111827", margin: 0 }}>Student Directory</h3>
            <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0, marginTop: "0.2rem" }}>Manage all students across the platform.</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <Search size={16} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input type="text" placeholder="Search by name, email, reg no..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ padding: "0.5rem 0.85rem 0.5rem 2.25rem", borderRadius: "8px", border: "1px solid #cbd5e1" }} />
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: "0.5rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
              <option value="all">All Students</option>
              <option value="below70">Average &lt; 70%</option>
              <option value="top">Average = 70%</option>
              <option value="unassigned">Unassigned Staff</option>
            </select>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="custom-table">
            <thead><tr><th>Name</th><th>Reg No</th><th>Staff Assigned</th><th>Average</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "2.5rem", color: "#64748b" }}>
                    <div style={{ display: "inline-block", width: 24, height: 24, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#1d72fe", animation: "spin 0.7s linear infinite", marginBottom: 8 }} />
                    <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>Loading student directory...</div>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>No students found.</td></tr>
              ) : filteredStudents.map((u) => {
                const stat = studentStats[(u.email || "").toLowerCase()] || { avg: 0 };
                const needsAlert = stat.avg < 70 && stat.avg > 0;
                return (
                  <tr key={u.id} style={{ background: needsAlert ? "#fff5f5" : "transparent", cursor: "pointer" }} onClick={() => handleStudentClick(u)}>
                    <td style={{ fontWeight: 600, color: "#1e293b" }}>{u.name || u.email} {needsAlert && <AlertCircle size={14} color="#ef4444" style={{ display: "inline", marginLeft: 4 }} />}</td>
                    <td>{u.reg_no || "-"}</td>
                    <td>{u.assigned_staff_name || "Unassigned"}</td>
                    <td style={{ fontWeight: 600, color: needsAlert ? "#ef4444" : "#10b981" }}>{stat.avg}%</td>
                    <td style={{ textAlign: "right" }}><button style={{ padding: "0.35rem 0.75rem", borderRadius: "6px", border: "1px solid #1d72fe", background: "#eff6ff", color: "#1d72fe", fontSize: "0.74rem", fontWeight: 700, cursor: "pointer" }}>Manage</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {viewingStudent && !showDashboard && createPortal(
        <div 
          style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(8px)", zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}
          onClick={() => setViewingStudent(null)}
        >
          <div 
            style={{ background: "#ffffff", borderRadius: "16px", width: "100%", maxWidth: "650px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", margin: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderBottom: "1px solid #e2e8f0" }}>
              <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#0f172a" }}>Manage Student Info</h2>
              <button onClick={() => setViewingStudent(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={24} /></button>
            </div>
            <div style={{ padding: "1.5rem", flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div><label style={{ display: "block", fontSize: "0.8rem", color: "#64748b", marginBottom: "0.3rem", fontWeight: 600 }}>Full Name</label><input type="text" value={editingStudent?.name || ""} onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })} style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} /></div>
                <div><label style={{ display: "block", fontSize: "0.8rem", color: "#64748b", marginBottom: "0.3rem", fontWeight: 600 }}>Email Address</label><input type="text" value={editingStudent?.email || ""} readOnly style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#94a3b8", boxSizing: "border-box" }} /></div>
                <div><label style={{ display: "block", fontSize: "0.8rem", color: "#64748b", marginBottom: "0.3rem", fontWeight: 600 }}>Register Number</label><input type="text" value={editingStudent?.reg_no || ""} onChange={(e) => setEditingStudent({ ...editingStudent, reg_no: e.target.value })} style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} /></div>
                <div><label style={{ display: "block", fontSize: "0.8rem", color: "#64748b", marginBottom: "0.3rem", fontWeight: 600 }}>Date of Birth</label><input type="date" value={editingStudent?.dob || ""} onChange={(e) => setEditingStudent({ ...editingStudent, dob: e.target.value })} style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} /></div>
                <div><label style={{ display: "block", fontSize: "0.8rem", color: "#64748b", marginBottom: "0.3rem", fontWeight: 600 }}>Department</label><input type="text" value={editingStudent?.department || ""} onChange={(e) => setEditingStudent({ ...editingStudent, department: e.target.value })} style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} /></div>
                <div><label style={{ display: "block", fontSize: "0.8rem", color: "#64748b", marginBottom: "0.3rem", fontWeight: 600 }}>Year of Study</label>
                  <select value={editingStudent?.year || ""} onChange={(e) => setEditingStudent({ ...editingStudent, year: e.target.value })} style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}>
                    {YEAR_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}><label style={{ display: "block", fontSize: "0.8rem", color: "#64748b", marginBottom: "0.3rem", fontWeight: 600 }}>Assigned Staff</label>
                  <select value={editingStudent?.assigned_staff_id || ""} onChange={handleStaffChange} style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}>
                    <option value="">-- Unassigned --</option>
                    {staffList.map(staff => (<option key={staff.id} value={staff.id}>{staff.name} ({staff.email || staff.mailid})</option>))}
                  </select>
                </div>
              </div>
              {(studentStats[(viewingStudent.email || "").toLowerCase()]?.avg || 0) > 0 && (studentStats[(viewingStudent.email || "").toLowerCase()]?.avg || 0) < 70 && (
                <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "1rem", borderRadius: "12px", display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem", fontWeight: 600, fontSize: "0.9rem" }}>
                  <AlertCircle size={20} /> This student has an overall average of {studentStats[(viewingStudent.email || "").toLowerCase()]?.avg}% (Below 70%).
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderTop: "1px solid #e2e8f0", background: "#f8fafc", borderBottomLeftRadius: "16px", borderBottomRightRadius: "16px" }}>
              <button onClick={handleDeleteUser} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", padding: "0.65rem 1.25rem", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}>
                <Trash2 size={16} /> Delete User
              </button>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button onClick={() => { if(onImpersonate) onImpersonate(viewingStudent, 'student'); }} style={{ background: "#f59e0b", color: "#fff", border: "none", padding: "0.65rem 1.25rem", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}>View As</button>
                <button onClick={() => { setShowDashboard(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ background: "transparent", color: "#1d72fe", border: "1px solid #1d72fe", padding: "0.65rem 1.25rem", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}>Dashboard</button>
                <button onClick={handleSaveStudent} disabled={isSaving} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#1d72fe", color: "#fff", border: "none", padding: "0.65rem 1.25rem", borderRadius: "8px", fontWeight: 700, cursor: "pointer", opacity: isSaving ? 0.7 : 1 }}>
                  <Save size={16} />{isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
