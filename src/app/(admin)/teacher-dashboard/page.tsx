"use client";

import { useEffect, useState } from "react";
import { BookOpen, GraduationCap, Calendar, Shield, Loader2, Clock, ExternalLink } from "lucide-react";

interface Program {
  id: string;
  title: string;
}

export default function TeacherDashboard() {
  const [teacherName, setTeacherName] = useState("Teacher");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [qualifiedIds, setQualifiedIds] = useState<string[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const userStr = localStorage.getItem("user");
        const tokensStr = localStorage.getItem("tokens");
        if (!userStr || !tokensStr) {
          setLoading(false);
          return;
        }

        const user = JSON.parse(userStr);
        const accessToken = JSON.parse(tokensStr).accessToken;

        setTeacherName([user.firstName, user.lastName].filter(Boolean).join(" ") || "Teacher");
        setTeacherEmail(user.email);
        setQualifiedIds(user.qualifiedPrograms || []);

        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        };

        const fetchJson = async (url: string) => {
          const res = await fetch(url, { headers });
          if (!res.ok) throw new Error(`Failed request ${url}`);
          const data = await res.json();
          return data;
        };

        const [dataScheds, dataProgs, dataSess] = await Promise.all([
          fetchJson(`/api/schedules?mentorId=${user.id}`),
          fetchJson("/api/courses"),
          fetchJson("/api/courses/sessions"),
        ]);

        setSchedules(dataScheds.data || []);
        setPrograms(dataProgs.data || []);
        setSessions(dataSess.data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const teachingProgramIds = Array.from(
    new Set([...qualifiedIds, ...schedules.map((c) => c.programId)])
  );
  const qualifiedPrograms = programs.filter((p) => teachingProgramIds.includes(p.id));
  const activeAssignedCount = schedules.filter((c) => c.status === "SCHEDULED").length;

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#7c5cfc]/20 to-[#00d4aa]/15 border border-white/[0.08] rounded-3xl p-8 mb-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#7c5cfc]/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7c5cfc]/20 text-[#a78bfa] text-[10px] font-bold uppercase tracking-wider mb-3 border border-[#7c5cfc]/30">
              <Shield className="w-3.5 h-3.5" /> Staff Role: Mentor / Teacher
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {teacherName}
            </h1>
            <p className="text-white/45 text-sm mt-1">{teacherEmail}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-[#13161e]/70 border border-white/[0.08] rounded-2xl p-3.5">
              <div className="w-10 h-10 bg-[#7c5cfc]/20 border border-[#7c5cfc]/30 rounded-xl flex items-center justify-center text-[#a78bfa]">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-white/35 uppercase font-bold tracking-wide">Teaching Subjects</p>
                <p className="text-xl font-bold text-white leading-tight">{qualifiedPrograms.length}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#13161e]/70 border border-white/[0.08] rounded-2xl p-3.5">
              <div className="w-10 h-10 bg-[#00d4aa]/20 border border-[#00d4aa]/30 rounded-xl flex items-center justify-center text-[#00d4aa]">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-white/35 uppercase font-bold tracking-wide">Assigned Classes</p>
                <p className="text-xl font-bold text-white leading-tight">{schedules.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Teaching Schedules Timeline */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-6 h-6 text-[#00d4aa]" /> My Assigned Teaching Schedule
            </h2>
            <p className="text-white/40 text-xs mt-0.5">
              View and launch live class meetings assigned to you by the scheduling engine.
            </p>
          </div>
          <span className="px-3 py-1 bg-[#00d4aa]/10 border border-[#00d4aa]/25 text-[#00d4aa] rounded-xl text-xs font-bold">
            {activeAssignedCount} Upcoming
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12 bg-[#161b27] border border-white/[0.07] rounded-2xl">
            <Loader2 className="w-6 h-6 animate-spin text-[#00d4aa]" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-16 bg-[#161b27] border border-white/[0.07] rounded-2xl shadow-xl">
            <Calendar className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/50 font-medium">No teaching classes assigned to you yet.</p>
            <p className="text-white/25 text-xs mt-1">Assignments will appear here when classes are booked.</p>
          </div>
        ) : (
          <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xl">
            <div className="divide-y divide-white/[0.05]">
              {schedules.map((c) => {
                const program = programs.find((p) => p.id === c.programId);
                const session = sessions.find((s) => s.id === c.sessionId);
                const classDate = new Date(c.startTime);

                const startTimeMs = classDate.getTime();
                const endTimeMs = c.endTime ? new Date(c.endTime).getTime() : startTimeMs + 90 * 60 * 1000;
                const thirtyMinsBeforeMs = startTimeMs - 30 * 60 * 1000;

                const canJoin = now >= thirtyMinsBeforeMs && now <= endTimeMs;
                const isTooEarly = now < thirtyMinsBeforeMs;
                const isPastEnd = now > endTimeMs;

                const studentName = c.student
                  ? `${c.student.firstName} ${c.student.lastName}`
                  : c.classType === "DEMO"
                  ? "Demo Prospect Student"
                  : "Assigned Student";

                const studentEmail = c.student?.email || "";

                return (
                  <div key={c.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.015] transition-all">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#00d4aa]/10 border border-[#00d4aa]/20 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] text-[#00d4aa] font-bold uppercase">
                          {classDate.toLocaleDateString("en-GB", { month: "short" })}
                        </span>
                        <span className="text-base font-extrabold text-white leading-none">
                          {classDate.getDate()}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">
                          {program ? program.title : "Course Subject"}
                        </h4>
                        {session && (
                          <p className="text-xs text-white/45 mt-0.5">
                            {session.title.toLowerCase().startsWith("session")
                              ? session.title
                              : `Session ${session.order}: ${session.title}`}
                          </p>
                        )}
                        <p className="text-[10px] text-white/35 mt-1.5 flex items-center gap-1">
                          Student: <span className="font-semibold text-white/70">{studentName}</span>
                          {studentEmail && <span className="text-white/30">({studentEmail})</span>}
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
                          className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border ${
                            c.status === "COMPLETED"
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

      {/* Qualified Subjects List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-[#161b27] border border-white/[0.07] rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#7c5cfc]" /> Qualified Subjects
            </h3>
            <p className="text-white/35 text-xs mt-0.5">These are the courses you are credentialed to teach.</p>
          </div>
          <div className="flex flex-col gap-2">
            {qualifiedPrograms.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-white/[0.06] rounded-xl text-white/30 text-xs">
                No subjects assigned yet. Please contact the administrator.
              </div>
            ) : (
              qualifiedPrograms.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-[#13161e] border border-white/[0.06] rounded-xl hover:border-white/[0.12] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#7c5cfc]/10 border border-[#7c5cfc]/20 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-[#a78bfa]" />
                    </div>
                    <span className="text-xs font-semibold text-white">{p.title}</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#00d4aa] bg-[#00d4aa]/10 border border-[#00d4aa]/20 px-2 py-0.5 rounded uppercase tracking-wider">
                    Qualified
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-6 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white">Daily Teaching Notice</h3>
          <p className="text-xs text-white/45 leading-relaxed">
            Verify your weekly calendar and conflict settings in the Mentors directory page before starting any live sessions.
          </p>
        </div>
      </div>
    </div>
  );
}
