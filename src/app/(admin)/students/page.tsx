"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  Search,
  Trash2,
  AlertCircle,
  Mail,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScheduledClass {
  id: string;
  studentId: string;
  startTime: string;
  endTime: string;
  status: string;
  programId: string;
  sessionId?: string;
  mentor: { firstName: string; lastName: string };
}

interface StudentItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  parentAccount?: {
    email: string;
    profiles?: Array<{
      firstName: string;
      lastName: string;
      relationship: string | null;
    }>;
  };
  // Enriched on the client after fetching schedules
  schedules?: ScheduledClass[];
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [role, setRole] = useState<string | null>(null);

  const [sessions, setSessions] = useState<any[]>([]);
  const [expandedSchedules, setExpandedSchedules] = useState<Record<string, boolean>>({});

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const getHeaders = () => {
    const tokensStr = localStorage.getItem("tokens");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tokensStr) {
      headers["Authorization"] = `Bearer ${JSON.parse(tokensStr).accessToken}`;
    }
    return headers;
  };

  const toggleScheduleExpand = (studentId: string) => {
    setExpandedSchedules(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const fetchData = async () => {
    try {
      const headers = getHeaders();
      const [studRes, schedRes, sessRes] = await Promise.all([
        fetch("/api/users/customers/students", { headers }),
        fetch("/api/schedules", { headers }),
        fetch("/api/courses/sessions", { headers }),
      ]);

      if (studRes.status === 401) {
        router.push("/login");
        return;
      }

      const studData = await studRes.json();
      const schedData = await schedRes.json();
      const sessData = await sessRes.json();

      if (!studData.success) {
        throw new Error(studData.message || "Failed to load students directory");
      }

      const schedules: ScheduledClass[] = schedData.success ? schedData.data ?? [] : [];
      setSessions(sessData.success ? sessData.data ?? [] : []);

      // Enrich each student with their scheduled classes
      const enriched: StudentItem[] = (studData.data ?? []).map((s: StudentItem) => ({
        ...s,
        schedules: schedules.filter((sc) => sc.studentId === s.id),
      }));

      setStudents(enriched);
    } catch (err: any) {
      setError(err.message || "Failed to connect to backend user API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const userStr = localStorage.getItem("user");
    if (userStr) setRole(JSON.parse(userStr).role);
  }, []);

  const handleDeleteStudent = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Student Account",
      message: "Are you sure you want to permanently delete this student account?",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/users/customers/students/${id}`, {
            method: "DELETE",
            headers: getHeaders(),
          });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.message || "Failed to delete student");
          fetchData();
          setToast({ message: "Student account deleted successfully.", type: "success" });
        } catch (err: any) {
          setToast({ message: err.message || "Failed to delete student account.", type: "error" });
        }
      },
    });
  };

  const filteredStudents = students.filter((s) => {
    const query = searchQuery.toLowerCase();
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    const matchesName = fullName.includes(query) || s.email.toLowerCase().includes(query);
    const matchesParent =
      s.parentAccount?.email.toLowerCase().includes(query) ||
      (s.parentAccount?.profiles?.some((p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(query)
      ) ?? false);
    return matchesName || matchesParent;
  });

  // ── Column definitions ────────────────────────────────────────────────────

  const columns: DataTableColumn<StudentItem>[] = [
    {
      key: "student",
      header: "Student",
      cell: (s) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00d4aa]/25 to-[#7c5cfc]/20 flex items-center justify-center text-white text-xs font-bold border border-[#00d4aa]/20 shrink-0">
            {s.firstName[0]}{s.lastName[0]}
          </div>
          <div>
            <p className="text-xs font-semibold text-white">
              {s.firstName} {s.lastName}
            </p>
            <p className="text-[10px] text-white/35 flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3 h-3" />
              {s.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "parent",
      header: "Linked Parent Account",
      cell: (s) => (
        <span className="text-xs text-white/70 flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-white/20" />
          {s.parentAccount?.email || "N/A"}
        </span>
      ),
    },
    {
      key: "parentNames",
      header: "Parent Names",
      cell: (s) => {
        const profiles = s.parentAccount?.profiles || [];
        const names =
          profiles.map((p) => `${p.firstName} (${p.relationship || "Parent"})`).join(", ") ||
          "No profiles set";
        return <span className="text-xs text-white/45 italic">{names}</span>;
      },
    },
    {
      key: "schedule",
      header: "Schedule",
      cell: (s) => {
        const studentSchedules = s.schedules ?? [];
        const upcoming = studentSchedules.filter(
          (sc) => sc.status === "SCHEDULED" && new Date(sc.startTime) >= new Date()
        );
        const completed = studentSchedules.filter((sc) => sc.status === "COMPLETED").length;
        const total = studentSchedules.length;

        if (total === 0) {
          return (
            <span className="inline-flex items-center gap-1 text-[10px] text-white/25 italic">
              <XCircle className="w-3 h-3" /> No classes scheduled
            </span>
          );
        }

        const next = upcoming.sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )[0];

        const isExpanded = !!expandedSchedules[s.id];

        return (
          <div className="space-y-2 py-1 max-w-[280px]">
            {next && (
              <div className="flex items-start gap-1.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[8px] text-blue-400 font-bold uppercase tracking-wider shrink-0 mt-0.5">
                  <Clock className="w-2 h-2" />
                  Upcoming
                </span>
                <span className="text-[10px] text-white/60 leading-tight">
                  {new Date(next.startTime).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                  })}
                  {" · "}
                  {next.mentor.firstName} {next.mentor.lastName}
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] text-white/40">
                <BookOpen className="w-3 h-3 text-white/20" />
                {total} total
              </span>
              {completed > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/70">
                  <CheckCircle2 className="w-3 h-3" />
                  {completed} attended
                </span>
              )}
              {upcoming.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] text-blue-400/70">
                  <Calendar className="w-3 h-3" />
                  {upcoming.length} upcoming
                </span>
              )}
            </div>

            <button
              onClick={() => toggleScheduleExpand(s.id)}
              className="flex items-center gap-1 text-[10px] font-bold text-[#a78bfa] hover:text-[#7c5cfc] transition-all bg-white/[0.03] border border-white/[0.06] hover:border-[#7c5cfc]/30 px-2 py-0.5 rounded-md"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" /> Hide Sessions
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" /> View Sessions
                </>
              )}
            </button>

            {isExpanded && (
              <div className="mt-2 space-y-1.5 pl-1 border-l border-white/[0.06] max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                {studentSchedules
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map((sc) => {
                    const sessionInfo = sessions.find((sess) => sess.id === sc.sessionId);
                    const classDate = new Date(sc.startTime);

                    let statusLabel = sc.status;
                    let badgeColorClass = "bg-blue-500/10 border-blue-500/25 text-blue-400";

                    if (sc.status === "COMPLETED") {
                      statusLabel = "ATTENDED";
                      badgeColorClass = "bg-emerald-500/10 border-emerald-500/25 text-emerald-400";
                    } else if (sc.status === "CANCELLED") {
                      statusLabel = "SKIPPED";
                      badgeColorClass = "bg-red-500/10 border-red-500/25 text-red-400";
                    } else if (sc.status === "SCHEDULED") {
                      const isPast = new Date(sc.startTime) < new Date();
                      statusLabel = isPast ? "SKIPPED" : "UPCOMING";
                      badgeColorClass = isPast 
                        ? "bg-red-500/10 border-red-500/25 text-red-400"
                        : "bg-blue-500/10 border-blue-500/25 text-blue-400";
                    } else if (sc.status === "RESCHEDULE_REQUESTED") {
                      statusLabel = "RESCHEDULE REQ";
                      badgeColorClass = "bg-amber-500/10 border-amber-500/25 text-amber-400";
                    }
                    
                    return (
                      <div key={sc.id} className="bg-white/[0.01] border border-white/[0.04] rounded-lg p-2 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-white/70 truncate">
                            {sessionInfo 
                              ? `S${sessionInfo.order}: ${sessionInfo.title}` 
                              : "Session Class"
                            }
                          </span>
                          <span className={`text-[8px] font-bold uppercase px-1 rounded border tracking-wider shrink-0 ${badgeColorClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-white/40">
                          <span>
                            {classDate.toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                          <span className="text-white/30 truncate max-w-[100px]">
                            {sc.mentor.firstName} {sc.mentor.lastName}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created On",
      cell: (s) => (
        <span className="text-[11px] text-white/35 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-white/20" />
          {new Date(s.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    ...(role === "ADMIN"
      ? [
          {
            key: "actions",
            header: "",
            headerClassName: "text-right",
            cellClassName: "text-right",
            cell: (s: StudentItem) => (
              <button
                onClick={() => handleDeleteStudent(s.id)}
                className="p-1.5 rounded hover:bg-red-500/10 text-white/25 hover:text-red-400 transition-all"
                title="Delete Student Portal login"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ),
          } as DataTableColumn<StudentItem>,
        ]
      : []),
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full animate-fadeIn">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1 sm:mb-2 flex items-center gap-3">
          <User className="w-7 h-7 sm:w-8 sm:h-8 text-[#00d4aa]" />
          Students Directory
        </h1>
        <p className="text-white/40 text-xs sm:text-sm">
          Review, search, and manage independent student logins — including their scheduled classes.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="relative w-full sm:max-w-sm mb-6">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-white/20" />
        <input
          type="text"
          placeholder="Search by student name, email, or parent info..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#161b27] border border-white/[0.07] rounded-xl pl-10 pr-4 py-2.5
            text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#7c5cfc] transition-all"
        />
      </div>

      {/* Students Table — DataTable (shadcn) */}
      {/* Desktop view */}
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={filteredStudents}
          loading={loading}
          emptyState={
            <div className="flex flex-col items-center py-8 gap-2">
              <User className="w-10 h-10 text-white/20" />
              <p className="text-white/50 font-medium text-sm">No students registered in the database.</p>
            </div>
          }
        />
      </div>

      {/* Mobile card view */}
      <div className="block md:hidden space-y-4">
        {loading ? (
          <div className="flex flex-col items-center py-12 gap-2 bg-[#161b27] border border-white/[0.07] rounded-2xl">
            <Loader2 className="w-6 h-6 animate-spin text-[#7c5cfc]" />
            <p className="text-xs text-white/40">Loading directory...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-2 bg-[#161b27] border border-white/[0.07] rounded-2xl">
            <User className="w-8 h-8 text-white/20" />
            <p className="text-xs text-white/40">No students registered in the database.</p>
          </div>
        ) : (
          filteredStudents.map((s) => {
            const studentSchedules = s.schedules ?? [];
            const upcoming = studentSchedules.filter(
              (sc) => sc.status === "SCHEDULED" && new Date(sc.startTime) >= new Date()
            );
            const completed = studentSchedules.filter((sc) => sc.status === "COMPLETED").length;
            const total = studentSchedules.length;

            const next = upcoming.sort(
              (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            )[0];

            const isExpanded = !!expandedSchedules[s.id];

            const profiles = s.parentAccount?.profiles || [];
            const parentNames =
              profiles.map((p) => `${p.firstName} (${p.relationship || "Parent"})`).join(", ") ||
              "No profiles set";

            return (
              <div 
                key={s.id} 
                className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 space-y-4 shadow-lg flex flex-col"
              >
                {/* Header (Student details & Delete) */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00d4aa]/25 to-[#7c5cfc]/20 flex items-center justify-center text-white text-xs font-bold border border-[#00d4aa]/20 shrink-0">
                      {s.firstName[0]}{s.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {s.firstName} {s.lastName}
                      </p>
                      <p className="text-[10px] text-white/35 flex items-center gap-1.5 mt-0.5 truncate">
                        <Mail className="w-3 h-3" />
                        {s.email}
                      </p>
                    </div>
                  </div>

                  {role === "ADMIN" && (
                    <button
                      onClick={() => handleDeleteStudent(s.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-white/25 hover:text-red-400 transition-all shrink-0"
                      title="Delete Student Portal login"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Parent Details */}
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-white/40">
                    <span>Parent Email</span>
                    <span className="text-white/70 truncate max-w-[180px]">{s.parentAccount?.email || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center text-white/40">
                    <span>Parent Names</span>
                    <span className="text-white/70 italic text-right truncate max-w-[180px]">{parentNames}</span>
                  </div>
                  <div className="flex justify-between items-center text-white/40">
                    <span>Created On</span>
                    <span className="text-white/70">{new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Schedule info */}
                <div className="space-y-3 pt-1">
                  {total === 0 ? (
                    <div className="text-[10px] text-white/25 italic flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> No classes scheduled
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {next && (
                        <div className="flex items-start gap-1.5">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[8px] text-blue-400 font-bold uppercase tracking-wider shrink-0 mt-0.5">
                            <Clock className="w-2 h-2" />
                            Upcoming
                          </span>
                          <span className="text-[10px] text-white/60 leading-tight">
                            {new Date(next.startTime).toLocaleDateString("en-GB", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                            })}
                            {" · "}
                            {next.mentor.firstName} {next.mentor.lastName}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] text-white/40">
                          <BookOpen className="w-3 h-3 text-white/20" />
                          {total} total
                        </span>
                        {completed > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/70">
                            <CheckCircle2 className="w-3 h-3" />
                            {completed} attended
                          </span>
                        )}
                        {upcoming.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-blue-400/70">
                            <Calendar className="w-3 h-3" />
                            {upcoming.length} upcoming
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => toggleScheduleExpand(s.id)}
                        className="flex items-center gap-1 text-[10px] font-bold text-[#a78bfa] hover:text-[#7c5cfc] transition-all bg-white/[0.03] border border-white/[0.06] hover:border-[#7c5cfc]/30 px-2 py-1 rounded-md"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3 h-3" /> Hide Sessions
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3" /> View Sessions
                          </>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 space-y-1.5 pl-1 border-l border-white/[0.06] max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                          {studentSchedules
                            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                            .map((sc) => {
                              const sessionInfo = sessions.find((sess) => sess.id === sc.sessionId);
                              const classDate = new Date(sc.startTime);

                              let statusLabel = sc.status;
                              let badgeColorClass = "bg-blue-500/10 border-blue-500/25 text-blue-400";

                              if (sc.status === "COMPLETED") {
                                statusLabel = "ATTENDED";
                                badgeColorClass = "bg-emerald-500/10 border-emerald-500/25 text-emerald-400";
                              } else if (sc.status === "CANCELLED") {
                                statusLabel = "SKIPPED";
                                badgeColorClass = "bg-red-500/10 border-red-500/25 text-red-400";
                              } else if (sc.status === "SCHEDULED") {
                                const isPast = new Date(sc.startTime) < new Date();
                                statusLabel = isPast ? "SKIPPED" : "UPCOMING";
                                badgeColorClass = isPast 
                                  ? "bg-red-500/10 border-red-500/25 text-red-400"
                                  : "bg-blue-500/10 border-blue-500/25 text-blue-400";
                              } else if (sc.status === "RESCHEDULE_REQUESTED") {
                                statusLabel = "RESCHEDULE REQ";
                                badgeColorClass = "bg-amber-500/10 border-amber-500/25 text-amber-400";
                              }

                              return (
                                <div key={sc.id} className="bg-white/[0.01] border border-white/[0.04] rounded-lg p-2 space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-bold text-white/70 truncate">
                                      {sessionInfo 
                                        ? `S${sessionInfo.order}: ${sessionInfo.title}` 
                                        : "Session Class"
                                      }
                                    </span>
                                    <span className={`text-[8px] font-bold uppercase px-1 rounded border tracking-wider shrink-0 ${badgeColorClass}`}>
                                      {statusLabel}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[9px] text-white/40">
                                    <span>
                                      {classDate.toLocaleDateString("en-GB", {
                                        day: "2-digit",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                      })}
                                    </span>
                                    <span className="text-white/30 truncate max-w-[100px]">
                                      {sc.mentor.firstName} {sc.mentor.lastName}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      {/* Reusable Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Reusable Confirm Dialog Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
