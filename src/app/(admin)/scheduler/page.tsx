"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar, Clock, Plus, Search, Loader2, AlertCircle, Trash2,
  AlertTriangle, Sparkles, X, User, RefreshCw
} from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

// ── Types ────────────────────────────────────────────────────────────────────

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Program {
  id: string;
  title: string;
}

interface Session {
  id: string;
  title: string;
  programId: string;
  durationMin: number;
  order: number;
}

interface MentorSchedule {
  weekday: number;
  startTime: string;
  endTime: string;
}

interface Mentor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  qualifiedPrograms: string[];
  mentorTypes: string[];
  mentorSchedules: MentorSchedule[];
}

interface ScheduledClass {
  id: string;
  studentId: string;
  student: {
    firstName: string;
    lastName: string;
    email: string;
  };
  mentorId: string;
  mentor: {
    firstName: string;
    lastName: string;
    email: string;
  };
  scheduledBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  programId: string;
  sessionId: string;
  startTime: string;
  endTime: string;
  status: string; // SCHEDULED, COMPLETED, CANCELLED
}

export default function SchedulerPage() {
  const router = useRouter();

  // Master Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [schedules, setSchedules] = useState<ScheduledClass[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [programFilter, setProgramFilter] = useState("All");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ScheduledClass | null>(null); // For rescheduling / editing status
  const [actionLoading, setActionLoading] = useState(false);

  // Form Fields
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [classDateTime, setClassDateTime] = useState("");
  const [selectedMentorId, setSelectedMentorId] = useState("");
  const [classStatus, setClassStatus] = useState("SCHEDULED");

  const getHeaders = () => {
    const tokensStr = localStorage.getItem("tokens");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tokensStr) {
      headers["Authorization"] = `Bearer ${JSON.parse(tokensStr).accessToken}`;
    }
    return headers;
  };

  const fetchData = async () => {
    try {
      const headers = getHeaders();
      const [resStuds, resProgs, resSess, resMents, resScheds] = await Promise.all([
        fetch("/api/users/customers/students", { headers }),
        fetch("/api/courses", { headers }),
        fetch("/api/courses/sessions", { headers }),
        fetch("/api/schedules/mentors", { headers }),
        fetch("/api/schedules", { headers }),
      ]);

      if (resStuds.status === 401 || resScheds.status === 401) {
        localStorage.removeItem("user");
        localStorage.removeItem("tokens");
        router.push("/login");
        return;
      }

      const dataStuds = await resStuds.json();
      const dataProgs = await resProgs.json();
      const dataSess = await resSess.json();
      const dataMents = await resMents.json();
      const dataScheds = await resScheds.json();

      if (
        !dataStuds.success ||
        !dataProgs.success ||
        !dataSess.success ||
        !dataMents.success ||
        !dataScheds.success
      ) {
        throw new Error("Failed to load scheduler resources from API.");
      }

      setStudents(dataStuds.data || []);
      setPrograms(dataProgs.data || []);
      setSessions(dataSess.data || []);
      setMentors(dataMents.data || []);
      setSchedules(dataScheds.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load scheduler directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Helpers & Filtering ────────────────────────────────────────────────────

  // Get active sessions for the selected program
  const activeSessions = sessions.filter((s) => s.programId === selectedProgramId);

  // Get availability and qualification status for a mentor
  const getMentorStatus = (m: Mentor) => {
    if (!selectedProgramId || !classDateTime) return { qualified: true, available: true };
    const classDate = new Date(classDateTime);
    if (isNaN(classDate.getTime())) return { qualified: true, available: true };

    const classWeekday = classDate.getDay();
    const classStartMins = classDate.getHours() * 60 + classDate.getMinutes();
    const classEndMins = classStartMins + 90;

    const qualified = m.qualifiedPrograms.includes(selectedProgramId);
    const available = m.mentorSchedules.some((slot) => {
      if (slot.weekday !== classWeekday) return false;
      const [sh, sm] = slot.startTime.split(":").map(Number);
      const [eh, em] = slot.endTime.split(":").map(Number);
      const slotStart = sh * 60 + sm;
      const slotEnd = eh * 60 + em;
      return classStartMins >= slotStart && classEndMins <= slotEnd;
    });

    return { qualified, available };
  };

  // Check for immediate conflict alerts in the form
  const getConflictAlert = () => {
    if (!classDateTime) return null;
    const startTime = new Date(classDateTime);
    const endTime = new Date(startTime.getTime() + 90 * 60 * 1000);

    // Filter out the active class being rescheduled to prevent false self-conflict
    const otherClasses = schedules.filter(
      (c) => c.status !== "CANCELLED" && (!selectedClass || c.id !== selectedClass.id)
    );

    // Check mentor conflict
    if (selectedMentorId) {
      const conflict = otherClasses.find((c) => {
        if (c.mentorId !== selectedMentorId) return false;
        const cStart = new Date(c.startTime);
        const cEnd = new Date(c.endTime);
        return startTime < cEnd && endTime > cStart;
      });
      if (conflict) {
        return {
          type: "MENTOR",
          message: `Conflict: This mentor already has a class scheduled at this time with ${conflict.student.firstName} ${conflict.student.lastName}.`,
        };
      }
    }

    // Check student conflict
    if (selectedStudentId) {
      const conflict = otherClasses.find((c) => {
        if (c.studentId !== selectedStudentId) return false;
        const cStart = new Date(c.startTime);
        const cEnd = new Date(c.endTime);
        return startTime < cEnd && endTime > cStart;
      });
      if (conflict) {
        return {
          type: "STUDENT",
          message: `Conflict: This student is already scheduled for another class at this time with mentor ${conflict.mentor.firstName} ${conflict.mentor.lastName}.`,
        };
      }
    }

    return null;
  };

  const conflictAlert = getConflictAlert();

  // ── Actions ────────────────────────────────────────────────────────────────

  const openScheduleModal = () => {
    setSelectedClass(null);
    setSelectedStudentId("");
    setSelectedProgramId("");
    setSelectedSessionId("");
    setClassDateTime("");
    setSelectedMentorId("");
    setClassStatus("SCHEDULED");
    setShowModal(true);
  };

  const openRescheduleModal = (c: ScheduledClass) => {
    setSelectedClass(c);
    setSelectedStudentId(c.studentId);
    setSelectedProgramId(c.programId);
    setSelectedSessionId(c.sessionId);
    // Format ISO string to datetime-local local input format (YYYY-MM-DDTHH:MM)
    const localDate = new Date(c.startTime);
    const tzOffset = localDate.getTimezoneOffset() * 60000;
    const formatted = new Date(localDate.getTime() - tzOffset).toISOString().slice(0, 16);
    setClassDateTime(formatted);
    setSelectedMentorId(c.mentorId);
    setClassStatus(c.status);
    setShowModal(true);
  };

  const handleSaveClass = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedProgramId || !selectedSessionId || !classDateTime || !selectedMentorId) {
      alert("Please fill in all scheduling requirements.");
      return;
    }

    setActionLoading(true);
    try {
      const headers = getHeaders();
      const isEdit = !!selectedClass;
      const url = isEdit ? `/api/schedules/${selectedClass.id}` : "/api/schedules";
      const method = isEdit ? "PUT" : "POST";

      const payload = isEdit
        ? { startTime: new Date(classDateTime).toISOString(), status: classStatus, mentorId: selectedMentorId }
        : {
            studentId: selectedStudentId,
            mentorId: selectedMentorId,
            programId: selectedProgramId,
            sessionId: selectedSessionId,
            startTime: new Date(classDateTime).toISOString(),
          };

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to schedule class.");
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this scheduled class?")) return;

    try {
      const res = await fetch(`/api/schedules/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to delete schedule.");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const filteredSchedules = schedules.filter((c) => {
    const studentName = `${c.student.firstName} ${c.student.lastName}`.toLowerCase();
    const mentorName = `${c.mentor.firstName} ${c.mentor.lastName}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = studentName.includes(query) || mentorName.includes(query);

    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    const matchesProgram = programFilter === "All" || c.programId === programFilter;

    return matchesSearch && matchesStatus && matchesProgram;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 w-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#7c5cfc] mb-3" />
        <p className="text-white/40 text-sm">Loading Scheduling Engine...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-8 h-8 text-[#7c5cfc]" /> Scheduling Engine
          </h1>
          <p className="text-white/45 text-sm mt-1">
            Map qualified mentors to student learning sessions and resolve calendar conflicts.
          </p>
        </div>
        <button
          onClick={openScheduleModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#7c5cfc] hover:bg-[#6c4be8] text-white text-xs font-bold transition-all shadow-lg hover:shadow-[#7c5cfc]/20"
        >
          <Plus className="w-4 h-4" /> Schedule A Class
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
          <input
            type="text"
            placeholder="Search by student or mentor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#13161e] border border-white/[0.07] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/30 focus:border-[#7c5cfc] focus:outline-none transition-all"
          />
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          {/* Program filter */}
          <div className="flex-1 md:flex-initial">
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="w-full bg-[#13161e] border border-white/[0.07] rounded-xl px-4 py-2 text-xs text-white/70 focus:border-[#7c5cfc] focus:outline-none"
            >
              <option value="All">All Programs</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex-1 md:flex-initial">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#13161e] border border-white/[0.07] rounded-xl px-4 py-2 text-xs text-white/70 focus:border-[#7c5cfc] focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table — uses shared DataTable component (shadcn) */}
      {(() => {
        const columns: DataTableColumn<ScheduledClass>[] = [
          {
            key: "student",
            header: "Student",
            cell: (c) => (
              <div>
                <div className="font-semibold text-white">
                  {c.student.firstName} {c.student.lastName}
                </div>
                <div className="text-[10px] text-white/30">{c.student.email}</div>
              </div>
            ),
          },
          {
            key: "mentor",
            header: "Assigned Mentor",
            cell: (c) => (
              <div>
                <div className="font-medium text-white/80">
                  {c.mentor.firstName} {c.mentor.lastName}
                </div>
                <div className="text-[10px] text-white/30">{c.mentor.email}</div>
              </div>
            ),
          },
          {
            key: "session",
            header: "Session Detail",
            cell: (c) => {
              const program = programs.find((p) => p.id === c.programId);
              const session = sessions.find((s) => s.id === c.sessionId);
              return (
                <div>
                  <div className="text-white/80 font-medium">{program?.title || "Unknown Program"}</div>
                  <div className="text-[10px] text-white/40 font-mono mt-0.5">
                    Session {session?.order || "-"}: {session?.title || "Curriculum Session"}
                  </div>
                </div>
              );
            },
          },
          {
            key: "datetime",
            header: "Date & Time",
            cell: (c) => {
              const classDate = new Date(c.startTime);
              return (
                <div>
                  <div className="flex items-center gap-1.5 text-white/80 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-[#00d4aa]" />
                    {classDate.toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                    })}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-white/40 mt-1">
                    <Clock className="w-3 h-3" />
                    {classDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    {" - "}
                    {new Date(classDate.getTime() + 90 * 60 * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              );
            },
          },
          {
            key: "status",
            header: "Status",
            cell: (c) => (
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                  c.status === "COMPLETED"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : c.status === "CANCELLED"
                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                    : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                }`}
              >
                {c.status}
              </span>
            ),
          },
          {
            key: "scheduledBy",
            header: "Scheduled By",
            cell: (c) =>
              c.scheduledBy ? (
                <div>
                  <div className="font-medium text-white/80 flex items-center gap-1">
                    <User className="w-3 h-3 text-[#7c5cfc]" />
                    {c.scheduledBy.firstName} {c.scheduledBy.lastName}
                  </div>
                  <div className="text-[10px] text-white/30 mt-0.5">{c.scheduledBy.email}</div>
                </div>
              ) : (
                <span className="text-[10px] text-white/25 italic">System / Unknown</span>
              ),
          },
          {
            key: "actions",
            header: <span className="block text-right">Actions</span>,
            headerClassName: "text-right",
            cellClassName: "text-right",
            cell: (c) => (
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => openRescheduleModal(c)}
                  className="text-white/40 hover:text-[#7c5cfc] font-semibold transition-all inline-flex items-center gap-1 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reschedule
                </button>
                <button
                  onClick={() => handleDeleteClass(c.id)}
                  className="text-white/20 hover:text-red-400 transition-all inline-flex items-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ),
          },
        ];

        return (
          <DataTable
            columns={columns}
            data={filteredSchedules}
            emptyState={
              <span className="text-xs text-white/30 italic">
                No scheduled classes matching your filters.
              </span>
            }
          />
        );
      })()}

      {/* Modal: Schedule / Reschedule Class */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#080a10]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#7c5cfc]" />
                {selectedClass ? "Reschedule / Edit Status" : "Schedule New Learning Session"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/40 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="p-6 space-y-4">
              {/* Student Dropdown (Only for Create) */}
              {!selectedClass ? (
                <div>
                  <label className="block text-[10px] text-white/45 font-bold uppercase tracking-wide mb-1.5">
                    Select Student
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    required
                    className="w-full bg-[#13161e] border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-white focus:border-[#7c5cfc] focus:outline-none"
                  >
                    <option value="">-- Choose Student --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] text-white/45 font-bold uppercase tracking-wide mb-1.5">
                    Student
                  </label>
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-3.5 py-2 text-xs text-white/50 font-medium">
                    {selectedClass.student.firstName} {selectedClass.student.lastName}
                  </div>
                </div>
              )}

              {/* Program Dropdown (Only for Create) */}
              {!selectedClass ? (
                <div>
                  <label className="block text-[10px] text-white/45 font-bold uppercase tracking-wide mb-1.5">
                    Subject Program
                  </label>
                  <select
                    value={selectedProgramId}
                    onChange={(e) => {
                      setSelectedProgramId(e.target.value);
                      setSelectedSessionId("");
                      setSelectedMentorId("");
                    }}
                    required
                    className="w-full bg-[#13161e] border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-white focus:border-[#7c5cfc] focus:outline-none"
                  >
                    <option value="">-- Choose Program --</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] text-white/45 font-bold uppercase tracking-wide mb-1.5">
                    Program & Session
                  </label>
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-3.5 py-2 text-xs text-white/50 font-medium">
                    {programs.find((p) => p.id === selectedClass.programId)?.title} (Session{" "}
                    {sessions.find((s) => s.id === selectedClass.sessionId)?.order})
                  </div>
                </div>
              )}

              {/* Session Dropdown (Only for Create) */}
              {!selectedClass && selectedProgramId && (
                <div>
                  <label className="block text-[10px] text-white/45 font-bold uppercase tracking-wide mb-1.5">
                    Select Curriculum Session
                  </label>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    required
                    className="w-full bg-[#13161e] border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-white focus:border-[#7c5cfc] focus:outline-none"
                  >
                    <option value="">-- Choose Session --</option>
                    {activeSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        Session {s.order}: {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date & Time Picker */}
              <div>
                <label className="block text-[10px] text-white/45 font-bold uppercase tracking-wide mb-1.5">
                  Class Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={classDateTime}
                  onChange={(e) => {
                    setClassDateTime(e.target.value);
                    // Only reset mentor when creating a new class, not when editing
                    if (!selectedClass) setSelectedMentorId("");
                  }}
                  required
                  className="w-full bg-[#13161e] border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-white focus:border-[#7c5cfc] focus:outline-none"
                />
              </div>

              {/* Mentor selection */}
              {(selectedProgramId && classDateTime) || selectedClass ? (
                <div>
                  <label className="block text-[10px] text-white/45 font-bold uppercase tracking-wide mb-1.5 flex items-center justify-between">
                    <span>{selectedClass ? "Change Mentor" : "Assign Mentor"}</span>
                    {!selectedClass && (
                      <span className="text-[9px] text-[#00d4aa] font-medium lowercase">
                        shows weekly availability tags
                      </span>
                    )}
                  </label>
                  <select
                    value={selectedMentorId}
                    onChange={(e) => setSelectedMentorId(e.target.value)}
                    required
                    className="w-full bg-[#13161e] border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-white focus:border-[#7c5cfc] focus:outline-none"
                  >
                    <option value="">-- Select Mentor --</option>
                    {mentors.map((m) => {
                      const status = getMentorStatus(m);
                      const tags: string[] = [];
                      if (!selectedClass && !status.qualified) tags.push("not qualified");
                      if (!selectedClass && !status.available) tags.push("outside availability");
                      const suffix = tags.length > 0 ? ` (${tags.join(" | ")})` : "";
                      return (
                        <option key={m.id} value={m.id}>
                          {m.firstName} {m.lastName}{suffix}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : null}

              {/* Status Selector (Only for Rescheduling / Editing) */}
              {selectedClass && (
                <div>
                  <label className="block text-[10px] text-white/45 font-bold uppercase tracking-wide mb-1.5">
                    Class Status
                  </label>
                  <select
                    value={classStatus}
                    onChange={(e) => setClassStatus(e.target.value)}
                    required
                    className="w-full bg-[#13161e] border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-white focus:border-[#7c5cfc] focus:outline-none"
                  >
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              )}

              {/* Overlaps & Conflict Warnings (dynamic UI checks) */}
              {conflictAlert && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] rounded-xl p-3 flex items-start gap-1.5 leading-normal">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{conflictAlert.message}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-white/[0.06] mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/[0.08] hover:bg-white/[0.03] text-white/70 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !!conflictAlert}
                  className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-[#7c5cfc] hover:bg-[#6c4be8] text-white text-xs font-bold transition-all disabled:opacity-30 disabled:hover:bg-[#7c5cfc]"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
