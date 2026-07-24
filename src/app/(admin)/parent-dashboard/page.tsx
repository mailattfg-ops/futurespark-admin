"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, GraduationCap, Phone, UserCheck, ShieldCheck, Mail, Calendar, Compass, Clock, Loader2, AlertCircle, Bell, X, BookOpen, AlertTriangle } from "lucide-react";
import { Toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";

interface ParentProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  relationship: string | null;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

interface ParentAccount {
  id: string;
  email: string;
  profiles: ParentProfile[];
  students: Student[];
  programId?: string | null;
  paymentApproved?: boolean;
  selectedPlanType?: string | null;
  paidInstallmentIds?: string[];
}

export default function ParentDashboard() {
  const router = useRouter();
  const [parentData, setParentData] = useState<ParentAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [schedulesError, setSchedulesError] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [updatingProgram, setUpdatingProgram] = useState(false);

  const handleUpdateParentProgram = async (newProgId: string) => {
    try {
      setUpdatingProgram(true);
      const tokensStr = localStorage.getItem("tokens");
      if (!tokensStr) throw new Error("No user credentials found. Please log in again.");
      const accessToken = JSON.parse(tokensStr).accessToken;

      const res = await fetch(`/api/users/customers/${parentData?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          programId: newProgId || null
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update program subscription.");
      }

      setParentData(prev => prev ? { ...prev, programId: newProgId || null } : null);
      setToast({ message: "Program subscription updated successfully.", type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to update program subscription.", type: "error" });
    } finally {
      setUpdatingProgram(false);
    }
  };
  
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [targetScheduleId, setTargetScheduleId] = useState<string | null>(null);
  const [rescheduleReasonText, setRescheduleReasonText] = useState("");
  const [rescheduleMessageText, setRescheduleMessageText] = useState("");

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

  const openRescheduleModal = (scheduleId: string) => {
    setTargetScheduleId(scheduleId);
    setRescheduleReasonText("School Conflict");
    setRescheduleMessageText("");
    setShowRescheduleModal(true);
  };

  const submitRescheduleRequest = async () => {
    if (!targetScheduleId) return;
    try {
      setReschedulingId(targetScheduleId);
      const tokensStr = localStorage.getItem("tokens");
      if (!tokensStr) throw new Error("No user credentials found. Please log in again.");
      const accessToken = JSON.parse(tokensStr).accessToken;

      const res = await fetch(`/api/schedules/${targetScheduleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          status: "RESCHEDULE_REQUESTED",
          rescheduleReason: rescheduleReasonText,
          rescheduleMessage: rescheduleMessageText,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit reschedule request.");
      }

      setShowRescheduleModal(false);
      await refreshDashboardData(accessToken);
      setToast({ message: "Reschedule request submitted successfully.", type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to request reschedule.", type: "error" });
    } finally {
      setReschedulingId(null);
    }
  };

  const handleCancelReschedule = async (scheduleId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Cancel Reschedule Request",
      message: "Are you sure you want to cancel your reschedule request?",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          setReschedulingId(scheduleId);
          const tokensStr = localStorage.getItem("tokens");
          if (!tokensStr) throw new Error("No user credentials found. Please log in again.");
          const accessToken = JSON.parse(tokensStr).accessToken;

          const res = await fetch(`/api/schedules/${scheduleId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              status: "SCHEDULED",
              rescheduleReason: null,
              rescheduleMessage: null,
            }),
          });

          if (!res.ok) {
            throw new Error("Failed to cancel reschedule request.");
          }

          await refreshDashboardData(accessToken);
          setToast({ message: "Reschedule request cancelled successfully.", type: "success" });
        } catch (err: any) {
          setToast({ message: err.message || "Failed to cancel reschedule request.", type: "error" });
        } finally {
          setReschedulingId(null);
        }
      },
    });
  };

  const refreshDashboardData = async (accessToken: string) => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      };
      const fetchJson = async (url: string) => {
        const r = await fetch(url, { headers });
        if (!r.ok) throw new Error(`Request failed`);
        return r.json();
      };

      const dataParent = await fetchJson(`/api/users/customers/${user.id}`);
      setParentData(dataParent.data);

      const studentsList = dataParent.data.students || [];
      const [dataProgs, dataSess, ...dataProScheds] = await Promise.all([
        fetchJson("/api/courses"),
        fetchJson("/api/courses/sessions"),
        ...studentsList.map((s: any) => fetchJson(`/api/schedules?studentId=${s.id}`)),
      ]);

      setPrograms(dataProgs.data || []);
      setSessions(dataSess.data || []);

      const childSchedules: any[] = [];
      const now = new Date();
      for (const dataSched of dataProScheds) {
        const studentSchedules = dataSched.data || [];
        const past = studentSchedules
          .filter((c: any) => c.status === "COMPLETED" || (["SCHEDULED", "RESCHEDULE_REQUESTED"].includes(c.status) && new Date(c.startTime) < now))
          .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        
        const upcoming = studentSchedules
          .filter((c: any) => ["SCHEDULED", "RESCHEDULE_REQUESTED"].includes(c.status) && new Date(c.startTime) >= now)
          .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        if (past[0]) childSchedules.push(past[0]);
        if (upcoming[0]) childSchedules.push(upcoming[0]);
      }
      childSchedules.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      setSchedules(childSchedules);
    }
  };

  useEffect(() => {
    const fetchParentData = async () => {
      try {
        const userStr = localStorage.getItem("user");
        const tokensStr = localStorage.getItem("tokens");
        if (!userStr || !tokensStr) {
          throw new Error("No user credentials found. Please log in again.");
        }

        const user = JSON.parse(userStr);
        const accessToken = JSON.parse(tokensStr).accessToken;

        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        };

        const fetchJson = async (url: string) => {
          const res = await fetch(url, { headers });
          if (!res.ok) {
            let errMsg = `Request to ${url} failed with status ${res.status}`;
            try {
              const errData = await res.json();
              if (errData && errData.message) errMsg = errData.message;
            } catch { }
            throw new Error(errMsg);
          }
          const data = await res.json();
          if (data && data.success === false) {
            throw new Error(data.message || `Request to ${url} returned unsuccessful status`);
          }
          return data;
        };

        const dataParent = await fetchJson(`/api/users/customers/${user.id}`);
        setParentData(dataParent.data);

        // Fetch children schedules, courses, and sessions
        setSchedulesLoading(true);
        const studentsList = dataParent.data.students || [];
        const [dataProgs, dataSess, ...dataProScheds] = await Promise.all([
          fetchJson("/api/courses"),
          fetchJson("/api/courses/sessions"),
          ...studentsList.map((s: any) => fetchJson(`/api/schedules?studentId=${s.id}`)),
        ]);

        setPrograms(dataProgs.data || []);
        setSessions(dataSess.data || []);

        const childSchedules: any[] = [];
        const now = new Date();
        for (const dataSched of dataProScheds) {
          const studentSchedules = dataSched.data || [];

          const past = studentSchedules
            .filter((c: any) => c.status === "COMPLETED" || (["SCHEDULED", "RESCHEDULE_REQUESTED"].includes(c.status) && new Date(c.startTime) < now))
            .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
          
          const upcoming = studentSchedules
            .filter((c: any) => ["SCHEDULED", "RESCHEDULE_REQUESTED"].includes(c.status) && new Date(c.startTime) >= now)
            .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

          if (past[0]) childSchedules.push(past[0]);
          if (upcoming[0]) childSchedules.push(upcoming[0]);
        }
        childSchedules.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        setSchedules(childSchedules);
      } catch (err: any) {
        setError(err.message);
        setSchedulesError(err.message);
        if (
          err.message?.includes("Invalid or expired access token") ||
          err.message?.includes("Unauthorized") ||
          err.message?.includes("jwt expired")
        ) {
          localStorage.removeItem("user");
          localStorage.removeItem("tokens");
          router.push("/login");
        }
      } finally {
        setLoading(false);
        setSchedulesLoading(false);
      }
    };

    fetchParentData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 w-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#7c5cfc] mb-3" />
        <p className="text-white/40 text-sm">Loading Parent Dashboard...</p>
      </div>
    );
  }

  if (error || !parentData) {
    return (
      <div className="p-8 w-full">
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error || "An error occurred while loading your profile dashboard."}</span>
        </div>
      </div>
    );
  }

  const primaryProfile = parentData.profiles[0];
  const secondaryProfile = parentData.profiles[1];
  const greetingName = primaryProfile
    ? `${primaryProfile.firstName} ${primaryProfile.lastName}`
    : "Parent";

  const now = new Date();

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-8 h-8 text-[#7c5cfc]" /> Children's Learning Schedule
          </h1>
          <p className="text-white/45 text-sm mt-1">
            Monitor upcoming learning classes, assign topics, and view active mentors for all your children.
          </p>
        </div>

        {/* Active Program Selection Dropdown */}
        <div className="bg-[#161b27] border border-white/[0.08] rounded-2xl p-4 min-w-[280px] shadow-lg shrink-0">
          <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-[#7c5cfc]" />
            Active Program Selection
          </label>
          <select
            value={parentData.programId || ""}
            onChange={async (e) => {
              const newProgId = e.target.value;
              await handleUpdateParentProgram(newProgId);
            }}
            disabled={updatingProgram}
            className="w-full bg-[#0d111a] border border-white/[0.08] focus:border-[#7c5cfc]/50 rounded-xl px-3 py-2 text-xs text-white outline-none transition-all"
          >
            <option value="">No Active Program Selection</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      </div>

      {!parentData.programId && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-center gap-2 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Action Required:</strong> Please select an Active Program from the top-right menu to register your program selection and sync schedules for your children.
          </span>
        </div>
      )}

      {schedulesLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#7c5cfc]" />
        </div>
      ) : schedulesError ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-xs">
          {schedulesError}
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-16 bg-[#161b27] border border-white/[0.07] rounded-2xl shadow-xl">
          <Calendar className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/50 font-medium">No learning classes scheduled yet.</p>
          <p className="text-white/25 text-xs mt-1">Please contact the admin or advisor to schedule sessions.</p>
        </div>
      ) : (
        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xl">
          <div className="divide-y divide-white/[0.05]">
            {schedules.map((c) => {
              const student = parentData.students.find((s) => s.id === c.studentId);
              const program = programs.find((p) => p.id === c.programId);
              const session = sessions.find((s) => s.id === c.sessionId);
              const classDate = new Date(c.startTime);
              return (
                <div key={c.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.015] transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] text-purple-400 font-bold uppercase">
                        {classDate.toLocaleDateString("en-GB", { month: "short" })}
                      </span>
                      <span className="text-base font-extrabold text-white leading-none">
                        {classDate.getDate()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">
                          {program ? program.title : "Course Topic"}
                        </h4>
                        {student && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-white/[0.04] text-white/60 border border-white/[0.08]">
                            {student.firstName}
                          </span>
                        )}
                      </div>
                      {session && (
                        <p className="text-xs text-white/45 mt-0.5">
                          {session.title.toLowerCase().startsWith("session")
                            ? session.title
                            : `Session ${session.order}: ${session.title}`}
                        </p>
                      )}
                      <p className="text-[10px] text-white/35 mt-1.5 flex items-center gap-1">
                        Mentor: <span className="font-semibold text-[#00d4aa]">{c.mentor.firstName} {c.mentor.lastName}</span> ({c.mentor.email})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-6 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-white/80">
                        {classDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="text-[10px] text-white/40 mt-0.5">
                        {classDate.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {c.status === "SCHEDULED" && new Date(c.startTime) >= now && (
                        <button
                          onClick={() => openRescheduleModal(c.id)}
                          disabled={reschedulingId === c.id}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-500/40 rounded text-[9px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                          Request Reschedule
                        </button>
                      )}
                      {c.status === "RESCHEDULE_REQUESTED" && new Date(c.startTime) >= now && (
                        <button
                          onClick={() => handleCancelReschedule(c.id)}
                          disabled={reschedulingId === c.id}
                          className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded text-[9px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                          {reschedulingId === c.id ? "Cancelling..." : "Cancel Request"}
                        </button>
                      )}
                      <span
                        className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border ${
                          c.status === "COMPLETED"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : c.status === "CANCELLED"
                            ? "bg-red-500/10 border-red-500/20 text-red-400"
                            : c.status === "RESCHEDULE_REQUESTED"
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse"
                            : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                        }`}
                      >
                        {c.status === "RESCHEDULE_REQUESTED" ? "Reschedule Requested" : c.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Program Details Section */}
      {(() => {
        const activeProgram = parentData?.programId
          ? programs.find(p => p.id === parentData.programId)
          : null;
        if (!activeProgram) return null;

        // Filter sessions that belong to this program
        const programSessions = sessions.filter(s => s.programId === activeProgram.id);

        // Payment-aware session gating
        const paymentApproved = (parentData as any).paymentApproved;
        const selectedPlanType = (parentData as any).selectedPlanType;
        const paidInstallmentIds: string[] = (parentData as any).paidInstallmentIds || [];

        // Determine which sessions are unlocked
        const isUnlocked = (sess: any): boolean => {
          // Full pay approved: all unlocked
          if (paymentApproved) return true;
          // Installment: unlocked if session's installmentId is in paidInstallmentIds
          if (selectedPlanType === "INSTALLMENT") {
            if (!sess.installmentId) return true; // not gated to an installment
            return paidInstallmentIds.includes(sess.installmentId);
          }
          // No payment at all: all locked
          return false;
        };

        const unlockedSessions = programSessions.filter(isUnlocked);
        const lockedSessions = programSessions.filter(s => !isUnlocked(s));
        const hasAnyPayment = paymentApproved || (selectedPlanType === "INSTALLMENT" && paidInstallmentIds.length > 0);

        return (
          <div className="mt-8 bg-[#161b27] border border-white/[0.07] rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.05] pb-4 gap-4">
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#7c5cfc]/10 text-[#a78bfa] border border-[#7c5cfc]/20 mb-2">
                  {activeProgram.level}
                </span>
                <h2 className="text-xl font-bold text-white tracking-tight">{activeProgram.title}</h2>
              </div>
              <Link
                href={`/courses/${activeProgram.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7c5cfc] hover:bg-[#6c4be0] text-white text-xs font-semibold rounded-xl transition-all self-start sm:self-auto"
              >
                Explore Course Content <BookOpen className="w-3.5 h-3.5" />
              </Link>
            </div>

            {activeProgram.description && (
              <p className="text-white/50 text-xs leading-relaxed max-w-3xl">
                {activeProgram.description}
              </p>
            )}

            {/* Payment status banner */}
            {!paymentApproved && (
              <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${
                hasAnyPayment
                  ? "bg-amber-500/[0.06] border-amber-500/20 text-amber-400"
                  : "bg-red-500/[0.06] border-red-500/20 text-red-400"
              }`}>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {hasAnyPayment
                  ? `Installment plan active — ${unlockedSessions.length} of ${programSessions.length} sessions unlocked. Pay more installments to unlock the rest.`
                  : "Payment not approved yet. All sessions are locked. Please contact admin or finance team."}
              </div>
            )}

            <div>
              <h3 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-4">
                Curriculum ({unlockedSessions.length}/{programSessions.length} sessions unlocked)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {programSessions.sort((a, b) => a.order - b.order).map(sess => {
                  const unlocked = isUnlocked(sess);
                  return (
                    <div key={sess.id} className={`relative bg-white/[0.02] border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                      unlocked
                        ? "border-white/[0.05]"
                        : "border-white/[0.03] opacity-50"
                    }`}>
                      {!unlocked && (
                        <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center">
                          <span className="text-[9px]">🔒</span>
                        </div>
                      )}
                      <div>
                        <div className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[10px] font-bold text-white/40 mb-3">
                          {sess.order}
                        </div>
                        <h4 className={`text-xs font-bold mb-1 line-clamp-1 ${unlocked ? "text-white" : "text-white/40"}`}>{sess.title}</h4>
                        <p className="text-[10px] text-white/30">{sess.durationMin} min duration</p>
                        {!unlocked && (
                          <p className="text-[9px] text-amber-400/60 mt-1 font-medium">Locked — pay next installment</p>
                        )}
                      </div>
                      {unlocked && (
                        <div className="flex gap-2 mt-4 pt-3 border-t border-white/[0.03]">
                          {sess.slidesUrl && (
                            <a href={sess.slidesUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-amber-400 hover:underline">
                              Slides
                            </a>
                          )}
                          {sess.guideUrl && (
                            <a href={sess.guideUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-teal-400 hover:underline">
                              Guide
                            </a>
                          )}
                          {sess.worksheetUrl && (
                            <a href={sess.worksheetUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-400 hover:underline">
                              Worksheet
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reschedule Request Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 bg-[#080a10]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-amber-400 animate-pulse" />
                Request Class Reschedule
              </h2>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="text-white/40 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2">
                  Select Reason
                </label>
                <select
                  value={rescheduleReasonText}
                  onChange={(e) => setRescheduleReasonText(e.target.value)}
                  className="w-full bg-[#0d111a] border border-white/[0.08] focus:border-[#7c5cfc]/50 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all"
                >
                  <option value="School Conflict">School Conflict</option>
                  <option value="Health / Medical">Health / Medical</option>
                  <option value="Travel / Vacation">Travel / Vacation</option>
                  <option value="Personal Emergency">Personal Emergency</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2">
                  Message / Custom Notes
                </label>
                <textarea
                  value={rescheduleMessageText}
                  onChange={(e) => setRescheduleMessageText(e.target.value)}
                  placeholder="Explain why you need to reschedule and suggest alternative dates/times..."
                  className="w-full h-24 bg-[#0d111a] border border-white/[0.08] focus:border-[#7c5cfc]/50 rounded-xl px-4 py-3 text-xs text-white outline-none transition-all resize-none placeholder-white/20"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-white/[0.01] border-t border-white/[0.06] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.08] text-white/70 border border-white/[0.06] rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRescheduleRequest}
                disabled={reschedulingId !== null}
                className="px-4 py-2 bg-[#7c5cfc] hover:bg-[#6c4be0] text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50"
              >
                {reschedulingId !== null ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

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
