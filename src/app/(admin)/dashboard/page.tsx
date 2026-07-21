"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, BookOpen, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Activity,
  GraduationCap, Calendar, Clock, Compass, ShieldCheck, CheckCircle2, Shield,
  AlertTriangle, Eye, Box, Package, ShoppingCart, Truck, CreditCard, Mail,
  Phone, UserCheck, Loader2, AlertCircle, Check, Bell
} from "lucide-react";

// ── Types & Mock Data ────────────────────────────────────────────────────────

interface Program {
  id: string;
  title: string;
  description?: string | null;
  level?: string;
  levelColor?: string;
}

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
  programId: string | null;
}

const kpis = [
  {
    label: "Total Students",
    value: "24,821",
    change: "+12.4%",
    up: true,
    icon: Users,
    color: "purple",
  },
  {
    label: "Active Courses",
    value: "42",
    change: "+3 this month",
    up: true,
    icon: BookOpen,
    color: "teal",
  },
  {
    label: "Completion Rate",
    value: "94%",
    change: "+2.1%",
    up: true,
    icon: TrendingUp,
    color: "amber",
  },
  {
    label: "Monthly Revenue",
    value: "$48,320",
    change: "+18.5%",
    up: true,
    icon: DollarSign,
    color: "purple",
  },
];

const colorMap: Record<string, string> = {
  purple: "bg-[#7c5cfc]/15 text-[#a78bfa] border-[#7c5cfc]/20",
  teal: "bg-[#00d4aa]/15 text-[#00d4aa] border-[#00d4aa]/20",
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

const recentActivity = [
  { action: "New enrollment", course: "Advanced Distributed Systems", time: "2 mins ago", color: "teal" },
  { action: "Course published", course: "Applied Quantum Computing", time: "14 mins ago", color: "purple" },
  { action: "New enrollment", course: "Neural Network Architecture", time: "31 mins ago", color: "teal" },
  { action: "Review submitted", course: "Secure DevOps Lifecycle", time: "1 hr ago", color: "amber" },
  { action: "New enrollment", course: "Advanced Distributed Systems", time: "2 hrs ago", color: "teal" },
];

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");

  // Role-specific States
  const [programs, setPrograms] = useState<Program[]>([]);
  const [qualifiedIds, setQualifiedIds] = useState<string[]>([]);
  const [parentData, setParentData] = useState<ParentAccount | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [schedulesError, setSchedulesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const currentRole = user.role || "ADMIN";

        setRole(currentRole);
        setUserId(user.id);
        setUserName([user.firstName, user.lastName].filter(Boolean).join(" ") || "User");
        setUserEmail(user.email);
        setQualifiedIds(user.qualifiedPrograms || []);

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

        if (currentRole === "TEACHER") {
          // Fetch qualified subjects
          const data = await fetchJson("/api/courses");
          setPrograms(data.data || []);
        } else if (currentRole === "STUDENT") {
          // Fetch student schedules, programs, and sessions
          setSchedulesLoading(true);
          const [dataScheds, dataProgs, dataSess] = await Promise.all([
            fetchJson(`/api/schedules?studentId=${user.id}`),
            fetchJson("/api/courses"),
            fetchJson("/api/courses/sessions"),
          ]);

          setSchedules(dataScheds.data || []);
          setPrograms(dataProgs.data || []);
          setSessions(dataSess.data || []);
        } else if (currentRole === "PARENT") {
          // Fetch parent data
          const dataParent = await fetchJson(`/api/users/customers/${user.id}`);
          setParentData(dataParent.data);

          // Now fetch child schedules, programs, and sessions
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
          for (const dataSched of dataProScheds) {
            childSchedules.push(...(dataSched.data || []));
          }
          setSchedules(childSchedules);
        }
      } catch (err: any) {
        setError(err.message);
        setSchedulesError(err.message);
      } finally {
        setLoading(false);
        setSchedulesLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 w-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#7c5cfc] mb-3" />
        <p className="text-white/40 text-sm">Loading Dashboard...</p>
      </div>
    );
  }

  // ── 1. TEACHER Dashboard ───────────────────────────────────────────────────
  if (role === "TEACHER") {
    const qualifiedPrograms = programs.filter((p) => qualifiedIds.includes(p.id));
    return (
      <div className="p-8 w-full">
        <div className="relative overflow-hidden bg-gradient-to-r from-[#7c5cfc]/20 to-[#00d4aa]/15 border border-white/[0.08] rounded-3xl p-8 mb-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#7c5cfc]/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#7c5cfc]/20 text-[#a78bfa] text-[10px] font-bold uppercase tracking-wider mb-3 border border-[#7c5cfc]/30">
                <Shield className="w-3.5 h-3.5" /> Staff Role: Teacher
              </span>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Welcome back, {userName}
              </h1>
              <p className="text-white/45 text-sm mt-1">{userEmail}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] text-white/35 uppercase font-bold tracking-wide">Teaching Subjects</p>
                <p className="text-2xl font-bold text-white mt-0.5">{qualifiedIds.length}</p>
              </div>
              <div className="w-10 h-10 bg-[#7c5cfc]/20 border border-[#7c5cfc]/30 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-[#a78bfa]" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-[#161b27] border border-white/[0.07] rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#7c5cfc]" /> Qualified Subjects
              </h2>
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
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white">Daily Teaching Notice</h3>
            <p className="text-xs text-white/45 leading-relaxed">
              Verify your weekly calendar and conflicts settings in the Mentors directory page before scheduling any live sessions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── 2. QA AUDITOR Dashboard ────────────────────────────────────────────────
  if (role === "QA_AUDITOR") {
    return (
      <div className="p-8 w-full">
        <div className="relative overflow-hidden bg-gradient-to-r from-teal-500/10 to-blue-500/10 border border-white/[0.08] rounded-3xl p-8 mb-8 shadow-2xl">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 text-[10px] font-bold uppercase tracking-wider mb-3 border border-teal-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Staff Role: QA Auditor
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Quality Assurance Center</h1>
            <p className="text-white/45 text-sm mt-1">Logged in as: {userName} ({userEmail})</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50">Audited Sessions</span>
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-2xl font-bold text-white">128</p>
            <p className="text-[10px] text-white/35">Curriculum assets verified for compliance.</p>
          </div>
          <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50">Pending Audits</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-white">4</p>
            <p className="text-[10px] text-white/35">Sessions with updated worksheet URLs awaiting signoff.</p>
          </div>
          <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50">Compliance Rating</span>
              <Shield className="w-4 h-4 text-[#7c5cfc]" />
            </div>
            <p className="text-2xl font-bold text-white">100%</p>
            <p className="text-[10px] text-white/35">Fully certified system operations.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── 3. SCHEDULER Dashboard ─────────────────────────────────────────────────
  if (role === "SCHEDULER") {
    return (
      <div className="p-8 w-full">
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-white/[0.08] rounded-3xl p-8 mb-8 shadow-2xl">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase tracking-wider mb-3 border border-purple-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Staff Role: Scheduler
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Scheduling & Time-Fixing Engine</h1>
            <p className="text-white/45 text-sm mt-1">Logged in as: {userName} ({userEmail})</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50">Engine Status</span>
              <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded uppercase font-bold">Active</span>
            </div>
            <p className="text-2xl font-bold text-white">Optimal</p>
            <p className="text-[10px] text-white/35">Running continuous constraints checks.</p>
          </div>
          <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50">Next Run</span>
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">In 14 mins</p>
            <p className="text-[10px] text-white/35">Recalculates teacher schedules and availability slots.</p>
          </div>
          <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50">Total Slotted Classes</span>
              <Calendar className="w-4 h-4 text-[#00d4aa]" />
            </div>
            <p className="text-2xl font-bold text-white">418</p>
            <p className="text-[10px] text-white/35">Successfully scheduled slots for current semester.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── 4. WAREHOUSE ADMIN Dashboard ───────────────────────────────────────────
  if (role === "WAREHOUSE_ADMIN") {
    return (
      <div className="p-8 w-full">
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-white/[0.08] rounded-3xl p-8 mb-8 shadow-2xl">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-3 border border-amber-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Staff Role: Warehouse Admin
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Inventory & Logistics</h1>
            <p className="text-white/45 text-sm mt-1">Logged in as: {userName} ({userEmail})</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50">Total Assets Stored</span>
              <Package className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-white">1,840</p>
            <p className="text-[10px] text-white/35">Physical lab kits, worksheets, and textbooks.</p>
          </div>
          <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50">Kits Dispatched</span>
              <Truck className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">321</p>
            <p className="text-[10px] text-white/35">Dispatched to students this month.</p>
          </div>
          <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50">Low Stock Alert</span>
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-white">2 Items</p>
            <p className="text-[10px] text-white/35">Quantum Computing circuit boards require replenishment.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── 5. FINANCE ADMIN Dashboard ─────────────────────────────────────────────
  if (role === "FINANCE_ADMIN") {
    return (
      <div className="p-8 w-full">
        <div className="relative overflow-hidden bg-gradient-to-r from-green-500/10 to-teal-500/10 border border-white/[0.08] rounded-3xl p-8 mb-8 shadow-2xl">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider mb-3 border border-green-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Staff Role: Finance Admin
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Financial Analytics & Billing</h1>
            <p className="text-white/45 text-sm mt-1">Logged in as: {userName} ({userEmail})</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50">Monthly Revenue</span>
              <DollarSign className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">$48,320.00</p>
            <p className="text-[10px] text-white/35">Gross monthly course payments processed.</p>
          </div>
          <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50">Active Subscriptions</span>
              <CreditCard className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">1,208</p>
            <p className="text-[10px] text-white/35">Active billing accounts under installments.</p>
          </div>
          <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50">Pending Payouts</span>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-white">$4,150.00</p>
            <p className="text-[10px] text-white/35">Instructor payouts matching class schedules.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── 6. STUDENT Dashboard ───────────────────────────────────────────────────
  if (role === "STUDENT") {
    const activeSchedulesCount = schedules.filter((c) => c.status === "SCHEDULED").length;
    const uniqueProgramIds = Array.from(new Set(schedules.map((c) => c.programId)));

    const now = new Date();
    const nextClass = [...schedules]
      .filter((c) => c.status === "SCHEDULED" && new Date(c.startTime) >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

    const nextClassProgram = nextClass ? programs.find((p) => p.id === nextClass.programId) : null;
    const nextClassSession = nextClass ? sessions.find((s) => s.id === nextClass.sessionId) : null;

    return (
      <div className="p-8 w-full max-w-7xl mx-auto">
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-500/10 to-teal-500/10 border border-white/[0.08] rounded-3xl p-8 mb-8 shadow-2xl">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-3 border border-blue-500/20">
              <GraduationCap className="w-3.5 h-3.5" /> Student Hub
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Learning Portal</h1>
            <p className="text-white/45 text-sm mt-1">Logged in as: {userName} ({userEmail})</p>
          </div>
        </div>

        {/* Next Class Announcement Banner */}
        {nextClass && (
          <div className="mb-8 relative overflow-hidden rounded-2xl border border-[#7c5cfc]/30 bg-gradient-to-r from-[#7c5cfc]/15 via-indigo-955/20 to-[#7c5cfc]/5 p-6 shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#7c5cfc]/10 rounded-full blur-3xl -z-10" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#7c5cfc]/20 border border-[#7c5cfc]/30 flex items-center justify-center shrink-0">
                  <Bell className="w-6 h-6 text-[#a78bfa] animate-pulse" />
                </div>
                <div>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#7c5cfc]/20 text-[#a78bfa] border border-[#7c5cfc]/30 mb-2">
                    Next Class Reminder
                  </span>
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {nextClassProgram ? nextClassProgram.title : "Upcoming Session"}
                  </h3>
                  {nextClassSession && (
                    <p className="text-sm text-white/60 mt-1">
                      {nextClassSession.title.toLowerCase().startsWith("session")
                        ? nextClassSession.title
                        : `Session ${nextClassSession.order}: ${nextClassSession.title}`}
                    </p>
                  )}
                  <p className="text-xs text-white/35 mt-2 flex items-center gap-1">
                    Mentor: <span className="font-semibold text-[#00d4aa]">{nextClass.mentor.firstName} {nextClass.mentor.lastName}</span> ({nextClass.mentor.email})
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 shrink-0 bg-[#161b27]/80 px-5 py-3 rounded-xl border border-white/[0.08] shadow-md">
                <div className="text-right">
                  <div className="text-lg font-bold text-[#a78bfa]">
                    {new Date(nextClass.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">
                    {new Date(nextClass.startTime).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50">My Enrolled Courses</span>
              <BookOpen className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">{uniqueProgramIds.length}</p>
            <p className="text-[10px] text-white/35">Explore programs to enroll and start learning.</p>
          </div>
          <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50">Upcoming Classes</span>
              <Calendar className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {activeSchedulesCount > 0 ? activeSchedulesCount : "None"}
            </p>
            <p className="text-[10px] text-white/35">Check back after enrolling in a program.</p>
          </div>
          <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50">Certificates Earned</span>
              <Compass className="w-4 h-4 text-[#00d4aa]" />
            </div>
            <p className="text-2xl font-bold text-white">0</p>
            <p className="text-[10px] text-white/35">Complete courses to earn official credentials.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── 7. PARENT Dashboard ────────────────────────────────────────────────────
  if (role === "PARENT") {
    if (error || !parentData) {
      return (
        <div className="p-8 w-full">
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error || "Unable to fetch Parent Account data."}</span>
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
    const nextClass = [...schedules]
      .filter((c) => c.status === "SCHEDULED" && new Date(c.startTime) >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

    const nextClassProgram = nextClass ? programs.find((p) => p.id === nextClass.programId) : null;
    const nextClassSession = nextClass ? sessions.find((s) => s.id === nextClass.sessionId) : null;
    const nextClassStudent = nextClass ? parentData.students.find((s) => s.id === nextClass.studentId) : null;

    return (
      <div className="p-8 w-full max-w-7xl mx-auto">
        <div className="relative overflow-hidden bg-gradient-to-r from-[#7c5cfc]/15 to-indigo-500/10 border border-white/[0.08] rounded-3xl p-8 mb-8 shadow-2xl">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#7c5cfc]/10 text-[#7c5cfc] text-[10px] font-bold uppercase tracking-wider mb-3 border border-[#7c5cfc]/20">
              <Users className="w-3.5 h-3.5" /> Parent Hub
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome, {primaryProfile ? `${primaryProfile.firstName} ${primaryProfile.lastName}` : "Parent"}
            </h1>
            <p className="text-white/45 text-sm mt-1">Master Account: {parentData.email}</p>
          </div>
        </div>

        {/* Next Class Announcement Banner */}
        {nextClass && (
          <div className="mb-8 relative overflow-hidden rounded-2xl border border-[#7c5cfc]/30 bg-gradient-to-r from-[#7c5cfc]/15 via-indigo-955/20 to-[#7c5cfc]/5 p-6 shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#7c5cfc]/10 rounded-full blur-3xl -z-10" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#7c5cfc]/20 border border-[#7c5cfc]/30 flex items-center justify-center shrink-0">
                  <Bell className="w-6 h-6 text-[#a78bfa] animate-pulse" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#7c5cfc]/20 text-[#a78bfa] border border-[#7c5cfc]/30">
                      Next Class Reminder
                    </span>
                    {nextClassStudent && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/[0.04] text-white/70 border border-white/[0.08]">
                        Child: {nextClassStudent.firstName}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {nextClassProgram ? nextClassProgram.title : "Upcoming Session"}
                  </h3>
                  {nextClassSession && (
                    <p className="text-sm text-white/60 mt-1">
                      {nextClassSession.title.toLowerCase().startsWith("session")
                        ? nextClassSession.title
                        : `Session ${nextClassSession.order}: ${nextClassSession.title}`}
                    </p>
                  )}
                  <p className="text-xs text-white/35 mt-2 flex items-center gap-1">
                    Mentor: <span className="font-semibold text-[#00d4aa]">{nextClass.mentor.firstName} {nextClass.mentor.lastName}</span> ({nextClass.mentor.email})
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 shrink-0 bg-[#161b27]/80 px-5 py-3 rounded-xl border border-white/[0.08] shadow-md">
                <div className="text-right">
                  <div className="text-lg font-bold text-[#a78bfa]">
                    {new Date(nextClass.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="text-xs text-white/45 mt-0.5">
                    {new Date(nextClass.startTime).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Linked Students */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#7c5cfc]" /> Enrolled Students
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {parentData.students.map((student) => (
                  <div key={student.id} className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-xl">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-white">{student.firstName} {student.lastName}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${student.isActive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                          {student.isActive ? "Active" : "Suspended"}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs text-white/45">
                        <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-white/20" /> {student.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Parent Profiles */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#00d4aa]" /> Profile Connections
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {primaryProfile && (
                  <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 shadow-xl">
                    <span className="text-[10px] font-bold text-[#00d4aa] bg-[#00d4aa]/10 border border-[#00d4aa]/20 px-2 py-0.5 rounded-full uppercase tracking-wider mb-2 inline-block">
                      Primary
                    </span>
                    <h3 className="text-sm font-semibold text-white">{primaryProfile.firstName} {primaryProfile.lastName}</h3>
                    <p className="text-xs text-white/45 mt-2 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-white/20" /> {primaryProfile.phone || "No phone linked"}</p>
                  </div>
                )}
                {secondaryProfile ? (
                  <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 shadow-xl">
                    <span className="text-[10px] font-bold text-white/30 bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded-full uppercase tracking-wider mb-2 inline-block">
                      Secondary
                    </span>
                    <h3 className="text-sm font-semibold text-white">{secondaryProfile.firstName} {secondaryProfile.lastName}</h3>
                    <p className="text-xs text-white/45 mt-2 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-white/20" /> {secondaryProfile.phone || "No phone linked"}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-5 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] text-center">
                    <p className="text-white/40 text-[11px] font-semibold">No secondary contact.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-white/45 uppercase tracking-wider">Connected Accounts</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 text-center">
                  <span className="block text-[10px] text-white/30">Students</span>
                  <span className="text-2xl font-bold text-white">{parentData.students.length}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 text-center">
                  <span className="block text-[10px] text-white/30">Profiles</span>
                  <span className="text-2xl font-bold text-[#00d4aa]">{parentData.profiles.length}</span>
                </div>
              </div>
            </div>

            {/* Active Program Card */}
            {(() => {
              const activeProgram = parentData.programId
                ? programs.find(p => p.id === parentData.programId)
                : null;
              
              if (activeProgram) {
                return (
                  <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                      <div>
                        <span className="text-[10px] font-bold text-[#a78bfa] bg-[#7c5cfc]/15 border border-[#7c5cfc]/20 px-2 py-0.5 rounded-full uppercase tracking-wider mb-1 inline-block">
                          {activeProgram.level || "Subscribed"}
                        </span>
                        <h3 className="text-sm font-semibold text-white mt-1">{activeProgram.title}</h3>
                      </div>
                      <BookOpen className="w-5 h-5 text-[#a78bfa]" />
                    </div>
                    {activeProgram.description && (
                      <p className="text-white/45 text-xs line-clamp-3 leading-relaxed">
                        {activeProgram.description}
                      </p>
                    )}
                    <Link
                      href={`/courses/${activeProgram.id}`}
                      className="w-full flex items-center justify-center gap-1.5 px-4 py-2 border border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.05] text-white/70 hover:text-white text-xs font-semibold rounded-xl transition-all"
                    >
                      EXPLORE CURRICULUM
                    </Link>
                  </div>
                );
              }

              return (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 shadow-xl space-y-4 text-center">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto animate-pulse" />
                  <div>
                    <h3 className="text-sm font-bold text-amber-200">No Program Subscription</h3>
                    <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
                      Subscribe to an academics course path to sync your student's learning session schedule.
                    </p>
                  </div>
                  <Link
                    href="/courses"
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-semibold transition-all"
                  >
                    BROWSE PROGRAMS
                  </Link>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    );
  }

  // ── 8. ADMIN Dashboard (Default fallback) ──────────────────────────────────
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Dashboard</h1>
        <p className="text-white/40 text-sm">Welcome back, {userName || "System Administrator"}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {kpis.map(kpi => (
          <div
            key={kpi.label}
            className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5
              hover:border-white/[0.12] transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-white/40 font-medium">{kpi.label}</span>
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${colorMap[kpi.color]}`}>
                <kpi.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{kpi.value}</p>
            <div className="flex items-center gap-1">
              {kpi.up
                ? <ArrowUpRight className="w-3.5 h-3.5 text-[#00d4aa]" />
                : <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
              }
              <span className={`text-[11px] font-medium ${kpi.up ? "text-[#00d4aa]" : "text-red-400"}`}>
                {kpi.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Enrollment Chart */}
        <div className="lg:col-span-2 bg-[#161b27] border border-white/[0.07] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-white">Enrollment Trends</h2>
              <p className="text-xs text-white/35 mt-0.5">Last 6 months</p>
            </div>
            <div className="flex gap-2">
              {["1M", "3M", "6M", "1Y"].map(p => (
                <button
                  key={p}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all
                    ${p === "6M"
                      ? "bg-[#7c5cfc]/20 text-[#a78bfa] border border-[#7c5cfc]/30"
                      : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Simple bar chart */}
          <div className="flex items-end gap-3 h-40">
            {[65, 82, 58, 90, 75, 95].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-lg bg-gradient-to-t from-[#7c5cfc] to-[#7c5cfc]/50 transition-all hover:from-[#00d4aa] hover:to-[#00d4aa]/50 cursor-pointer"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 px-1">
            {["Feb", "Mar", "Apr", "May", "Jun", "Jul"].map(m => (
              <span key={m} className="text-[10px] text-white/25">{m}</span>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-4 h-4 text-[#7c5cfc]" />
            <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
          </div>
          <div className="flex flex-col gap-4">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${item.color === "teal" ? "bg-[#00d4aa]" :
                  item.color === "purple" ? "bg-[#7c5cfc]" :
                    "bg-amber-400"
                  }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/70 font-medium">{item.action}</p>
                  <p className="text-[11px] text-white/35 truncate">{item.course}</p>
                </div>
                <span className="text-[10px] text-white/25 whitespace-nowrap shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
