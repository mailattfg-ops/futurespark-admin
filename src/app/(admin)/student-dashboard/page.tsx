"use client";

import { useEffect, useState } from "react";
import { BookOpen, GraduationCap, Calendar, Compass, ShieldCheck, Loader2, AlertCircle, Clock, ExternalLink } from "lucide-react";

export default function StudentDashboard() {
  const [userName, setUserName] = useState("Student");
  const [userEmail, setUserEmail] = useState("");
  const [schedules, setSchedules] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [parentPayment, setParentPayment] = useState<{
    paymentApproved: boolean;
    selectedPlanType: string | null;
    paidInstallmentIds: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getHeaders = () => {
    const tokensStr = localStorage.getItem("tokens");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tokensStr) {
      headers["Authorization"] = `Bearer ${JSON.parse(tokensStr).accessToken}`;
    }
    return headers;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const userStr = localStorage.getItem("user");
        if (!userStr) return;
        const user = JSON.parse(userStr);
        setUserName([user.firstName, user.lastName].filter(Boolean).join(" ") || "Student");
        setUserEmail(user.email);

        const headers = getHeaders();
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

        const [dataScheds, dataProgs, dataSess] = await Promise.all([
          fetchJson(`/api/schedules?studentId=${user.id}`),
          fetchJson("/api/courses"),
          fetchJson("/api/courses/sessions"),
        ]);

        setSchedules(dataScheds.data || []);
        setPrograms(dataProgs.data || []);
        setSessions(dataSess.data || []);

        // Fetch parent account to determine payment access
        // The student's parentAccountId is available from /api/users/customers/students
        // We fetch the student's own data which includes parentAccount
        try {
          const studentsData = await fetchJson("/api/users/customers/students");
          const me = (studentsData.data || []).find((s: any) => s.id === user.id);
          if (me?.parentAccount) {
            setParentPayment({
              paymentApproved: me.parentAccount.paymentApproved ?? false,
              selectedPlanType: me.parentAccount.selectedPlanType ?? null,
              paidInstallmentIds: me.parentAccount.paidInstallmentIds ?? [],
            });
          }
        } catch {
          // non-fatal: fall back to showing all sessions
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);


  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  const activeSchedulesCount = schedules.filter((c) => c.status === "SCHEDULED").length;
  const uniqueProgramIds = Array.from(new Set(schedules.map((c) => c.programId)));

  // Payment-aware session unlock check
  const isSessionUnlocked = (sessionId: string): boolean => {
    if (!parentPayment) return true; // fallback: show all if payment data unavailable
    if (parentPayment.paymentApproved) return true;
    if (parentPayment.selectedPlanType === "INSTALLMENT") {
      const sess = sessions.find(s => s.id === sessionId);
      if (!sess?.installmentId) return true; // not gated
      return parentPayment.paidInstallmentIds.includes(sess.installmentId);
    }
    return false;
  };

  const hasAnyAccess = !parentPayment || parentPayment.paymentApproved ||
    (parentPayment.selectedPlanType === "INSTALLMENT" && parentPayment.paidInstallmentIds.length > 0);

  // Only show schedules for sessions the student has paid access to
  const accessibleSchedules = schedules.filter(c => isSessionUnlocked(c.sessionId));

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Calendar className="w-8 h-8 text-[#7c5cfc]" /> My Learning Schedule
        </h1>
        <p className="text-white/45 text-sm mt-1">
          View your upcoming learning classes, topic files, and assigned mentors.
        </p>
      </div>

      {/* Payment access banner */}
      {!hasAnyAccess && !loading && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-red-500/[0.06] border border-red-500/20 text-red-400 text-xs">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Your sessions are locked. Payment has not been approved yet. Please contact your parent or the admin team.</span>
        </div>
      )}
      {parentPayment && !parentPayment.paymentApproved && parentPayment.selectedPlanType === "INSTALLMENT" && parentPayment.paidInstallmentIds.length > 0 && !loading && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 text-amber-400 text-xs">
          <GraduationCap className="w-4 h-4 shrink-0" />
          <span>Installment plan — {accessibleSchedules.length} of {schedules.length} sessions unlocked. More sessions unlock as installments are paid.</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#7c5cfc]" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-xs">
          {error}
        </div>
      ) : accessibleSchedules.length === 0 ? (
        <div className="text-center py-16 bg-[#161b27] border border-white/[0.07] rounded-2xl shadow-xl">
          <Calendar className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/50 font-medium">{hasAnyAccess ? "No learning classes scheduled yet." : "Sessions locked — no payment approved."}</p>
          <p className="text-white/25 text-xs mt-1">{hasAnyAccess ? "Please contact your teacher or administrator." : "Please contact the admin or finance team."}</p>
        </div>
      ) : (
        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xl">
          <div className="divide-y divide-white/[0.05]">
            {accessibleSchedules.map((c) => {

              const program = programs.find((p) => p.id === c.programId);
              const session = sessions.find((s) => s.id === c.sessionId);
              const classDate = new Date(c.startTime);

              const startTimeMs = classDate.getTime();
              const endTimeMs = c.endTime ? new Date(c.endTime).getTime() : startTimeMs + 90 * 60 * 1000;
              const thirtyMinsBeforeMs = startTimeMs - 30 * 60 * 1000;

              const canJoin = now >= thirtyMinsBeforeMs && now <= endTimeMs;
              const isTooEarly = now < thirtyMinsBeforeMs;
              const isPastEnd = now > endTimeMs;

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
                      <h4 className="text-sm font-semibold text-white">
                        {program ? program.title : "Course Topic"}
                      </h4>
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
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-white/80">
                        {classDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="text-[10px] text-white/40 mt-0.5">
                        {classDate.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border ${c.status === "COMPLETED"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : c.status === "CANCELLED"
                              ? "bg-red-500/10 border-red-500/20 text-red-400"
                              : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                          }`}
                      >
                        {c.status}
                      </span>
                      {c.status === "SCHEDULED" && (
                        c.meetingLink ? (
                          canJoin ? (
                            <a
                              href={c.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00d4aa]/15 hover:bg-[#00d4aa]/25 border border-[#00d4aa]/40 hover:border-[#00d4aa]/70 text-[#00d4aa] text-[10px] font-bold transition-all shadow-lg shadow-[#00d4aa]/10 animate-pulse hover:animate-none"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Join Meeting
                            </a>
                          ) : isTooEarly ? (
                            <button
                              disabled
                              title="Meeting link activates 30 minutes before class start time"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.07] text-white/30 text-[10px] font-semibold cursor-not-allowed"
                            >
                              <Clock className="w-3 h-3 text-white/20" />
                              Opens 30m Before
                            </button>
                          ) : isPastEnd ? (
                            <span className="text-[10px] text-white/25 italic">Session Ended</span>
                          ) : null
                        ) : (
                          <span className="text-[10px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg font-medium">
                            Meeting Link Pending
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
