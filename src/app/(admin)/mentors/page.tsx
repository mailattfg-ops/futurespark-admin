"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  GraduationCap,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Edit3,
  Trash2,
  Lock,
  UserPlus,
  CheckCircle,
  XCircle,
  Key,
  Copy,
  Check,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  X,
  Trash,
  BookOpen,
  AlertTriangle,
  CopyPlus,
  ArrowRight,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Program {
  id: string;
  title: string;
}

interface MentorUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  qualifiedPrograms: string[];
  mentorTypes?: string[];
  createdAt: string;
}

interface ScheduleSlot {
  id: string;
  mentorId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  scheduleType?: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_COLORS = [
  "from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-300",
  "from-violet-500/20 to-violet-600/10 border-violet-500/30 text-violet-300",
  "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-300",
  "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-300",
  "from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-300",
  "from-pink-500/20 to-pink-600/10 border-pink-500/30 text-pink-300",
  "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-300",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function addNinetyMin(startTime: string): string {
  const [hh, mm] = startTime.split(":").map(Number);
  const total = hh * 60 + mm + 90;
  if (total > 24 * 60) return "--:--";
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function minutesFrom(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function hasConflict(slots: ScheduleSlot[], weekday: number, startTime: string): string | null {
  const newStart = minutesFrom(startTime);
  const newEnd = newStart + 90;
  for (const s of slots.filter((s) => s.weekday === weekday)) {
    const eStart = minutesFrom(s.startTime);
    const eEnd = minutesFrom(s.endTime);
    if (newStart < eEnd && newEnd > eStart) {
      const typeStr = s.scheduleType?.toLowerCase() || "regular";
      return `Conflicts with existing ${typeStr} slot ${s.startTime}–${s.endTime}`;
    }
  }
  return null;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MentorsPage() {
  const router = useRouter();

  const [mentors, setMentors] = useState<MentorUser[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // ── Provision / Edit modal ──────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editMentor, setEditMentor] = useState<MentorUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mentorTypes, setMentorTypes] = useState<string[]>(["REGULAR"]);
  const [isActive, setIsActive] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Credentials modal ───────────────────────────────────────────────────
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credentialsData, setCredentialsData] = useState<{ email: string; password: string } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // ── Password reset modal ────────────────────────────────────────────────
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetMentor, setResetMentor] = useState<MentorUser | null>(null);
  const [newTempPassword, setNewTempPassword] = useState("");

  // ── Schedule drawer ─────────────────────────────────────────────────────
  const [showScheduleDrawer, setShowScheduleDrawer] = useState(false);
  const [scheduleMentor, setScheduleMentor] = useState<MentorUser | null>(null);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  
  const allowedTypes = (scheduleMentor?.mentorTypes && scheduleMentor.mentorTypes.length > 0
    ? scheduleMentor.mentorTypes
    : ["REGULAR"]) as ("REGULAR" | "DEMO")[];

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

  // per-day add-slot state
  const [expandedDays, setExpandedDays] = useState<number[]>([]);
  const [slotInputs, setSlotInputs] = useState<Record<number, string>>({});
  const [slotErrors, setSlotErrors] = useState<Record<number, string>>({});
  const [slotAdding, setSlotAdding] = useState<Record<number, boolean>>({});
  const [slotTypes, setSlotTypes] = useState<Record<number, "REGULAR" | "DEMO">>({});

  // ── Copy-to-days state ──────────────────────────────────────────────────
  const [copyFromDay, setCopyFromDay] = useState<number | null>(null);
  const [copyToDays, setCopyToDays] = useState<number[]>([]);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyResult, setCopyResult] = useState<Record<number, { added: number; skipped: number }>>({});

  // ── Auth header ─────────────────────────────────────────────────────────

  const getHeaders = () => {
    const tokensStr = localStorage.getItem("tokens");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tokensStr) headers["Authorization"] = `Bearer ${JSON.parse(tokensStr).accessToken}`;
    return headers;
  };

  // ── Fetch ───────────────────────────────────────────────────────────────

  const fetchData = async () => {
    try {
      const headers = getHeaders();
      const [resMentors, resProgs, resRoles] = await Promise.all([
        fetch("/api/users?role=TEACHER&limit=200", { headers }),
        fetch("/api/courses", { headers }),
        fetch("/api/roles", { headers }),
      ]);

      if ([resMentors, resProgs, resRoles].some((r) => r.status === 401)) {
        router.push("/login");
        return;
      }

      const dataMentors = await resMentors.json();
      const dataProgs = await resProgs.json();
      const dataRoles = await resRoles.json();

      if (!dataMentors.success) throw new Error("Failed to load mentors");

      setMentors(dataMentors.data.data || []);
      setPrograms(dataProgs.success ? dataProgs.data : []);
      setRolesList(dataRoles.success ? dataRoles.data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Provision / Edit ────────────────────────────────────────────────────

  const openProvisionModal = () => {
    setEditMentor(null);
    setEmail(""); setPassword(""); setFirstName(""); setLastName("");
    setMentorTypes(["REGULAR"]); setIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (mentor: MentorUser) => {
    setEditMentor(mentor);
    setEmail(mentor.email);
    setPassword("");
    setFirstName(mentor.firstName || "");
    setLastName(mentor.lastName || "");
    setMentorTypes(mentor.mentorTypes || ["REGULAR"]);
    setIsActive(mentor.isActive);
    setShowModal(true);
  };

  const handleSaveMentor = async (e: FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      const teacherRole = rolesList.find((r) => r.name === "TEACHER");
      if (!teacherRole) throw new Error("TEACHER role not found in system");

      const isEdit = !!editMentor;
      const url = isEdit ? `/api/users/${editMentor.id}` : "/api/users";
      const method = isEdit ? "PUT" : "POST";

      const payload: any = {
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        roleId: teacherRole.id,
        isActive,
        mentorTypes,
        qualifiedPrograms: [],
      };

      if (!isEdit) {
        if (!password || password.length < 8) throw new Error("Password must be at least 8 characters");
        payload.password = password;
      }

      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to save mentor");

      setShowModal(false);
      if (!isEdit) {
        setCredentialsData({ email: email.trim(), password });
        setShowCredentialsModal(true);
      }
      setLoading(true);
      fetchData();
      setToast({ message: isEdit ? "Mentor details updated successfully." : "Mentor account created successfully.", type: "success" });
    } catch (err: any) {
      setError(err.message);
      setToast({ message: err.message || "Failed to save mentor details.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMentor = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Mentor",
      message: "Delete this mentor? This action is permanent.",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/users/${id}`, { method: "DELETE", headers: getHeaders() });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.message || "Failed to delete");
          setLoading(true);
          fetchData();
          setToast({ message: "Mentor deleted successfully.", type: "success" });
        } catch (err: any) {
          setToast({ message: err.message || "Failed to delete mentor.", type: "error" });
        }
      },
    });
  };

  // ── Password reset ──────────────────────────────────────────────────────

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetMentor) return;
    setActionLoading(true);
    setError(null);
    try {
      if (!newTempPassword || newTempPassword.length < 8)
        throw new Error("Password must be at least 8 characters");
      const res = await fetch(`/api/users/${resetMentor.id}/reset-password`, {
        method: "PUT", headers: getHeaders(),
        body: JSON.stringify({ password: newTempPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to reset password");
      setShowResetModal(false);
      setCredentialsData({ email: resetMentor.email, password: newTempPassword });
      setShowCredentialsModal(true);
      fetchData();
      setToast({ message: "Mentor account password reset successfully.", type: "success" });
    } catch (err: any) {
      setError(err.message);
      setToast({ message: err.message || "Failed to reset password.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Copy ────────────────────────────────────────────────────────────────

  const handleCopy = (text: string, type: "email" | "pass") => {
    navigator.clipboard.writeText(text);
    if (type === "email") { setCopiedEmail(true); setTimeout(() => setCopiedEmail(false), 2000); }
    else { setCopiedPassword(true); setTimeout(() => setCopiedPassword(false), 2000); }
  };

  // ── Schedule drawer ─────────────────────────────────────────────────────

  const openScheduleDrawer = async (mentor: MentorUser) => {
    setScheduleMentor(mentor);
    setScheduleSlots([]);
    setExpandedDays([]);
    setSlotInputs({});
    setSlotTypes({});
    setSlotErrors({});
    setShowScheduleDrawer(true);
    setScheduleLoading(true);
    try {
      const res = await fetch(`/api/users/mentors/${mentor.id}/schedules`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setScheduleSlots(data.data);
    } catch {}
    setScheduleLoading(false);
  };

  const toggleDay = (day: number) => {
    setExpandedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
    setSlotErrors((prev) => ({ ...prev, [day]: "" }));
  };

  const handleAddSlot = async (day: number) => {
    const startTime = slotInputs[day];
    if (!startTime) {
      setSlotErrors((prev) => ({ ...prev, [day]: "Please select a start time" }));
      return;
    }
    if (!scheduleMentor) return;

    const conflict = hasConflict(scheduleSlots, day, startTime);
    if (conflict) {
      setSlotErrors((prev) => ({ ...prev, [day]: conflict }));
      return;
    }

    let scheduleType = slotTypes[day] || (allowedTypes.includes("REGULAR") ? "REGULAR" : "DEMO");
    if (!allowedTypes.includes(scheduleType)) {
      scheduleType = allowedTypes[0];
    }

    setSlotAdding((prev) => ({ ...prev, [day]: true }));
    setSlotErrors((prev) => ({ ...prev, [day]: "" }));
    try {
      const res = await fetch(`/api/users/mentors/${scheduleMentor.id}/schedules`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ weekday: day, startTime, scheduleType }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSlotErrors((prev) => ({ ...prev, [day]: data.message || "Failed to add slot" }));
        return;
      }
      setScheduleSlots((prev) =>
        [...prev, data.data].sort((a, b) =>
          a.weekday !== b.weekday ? a.weekday - b.weekday : a.startTime.localeCompare(b.startTime)
        )
      );
      setSlotInputs((prev) => ({ ...prev, [day]: "" }));
      setToast({ message: "Availability slot added successfully.", type: "success" });
    } catch {
      setSlotErrors((prev) => ({ ...prev, [day]: "Network error — please try again" }));
      setToast({ message: "Failed to add availability slot due to network error.", type: "error" });
    } finally {
      setSlotAdding((prev) => ({ ...prev, [day]: false }));
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      const res = await fetch(`/api/users/mentors/schedules/${slotId}`, {
        method: "DELETE", headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to delete");
      setScheduleSlots((prev) => prev.filter((s) => s.id !== slotId));
      setToast({ message: "Availability slot deleted successfully.", type: "success" });
    } catch (err: any) {
      setError(err.message);
      setToast({ message: err.message || "Failed to delete availability slot.", type: "error" });
    }
  };

  // ── Copy schedule to other days ─────────────────────────────────────────

  const openCopyPanel = (day: number) => {
    setCopyFromDay(day);
    setCopyToDays([]);
    setCopyResult({});
  };

  const toggleCopyToDay = (day: number) => {
    setCopyToDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleCopySchedule = async () => {
    if (copyFromDay === null || !scheduleMentor || copyToDays.length === 0) return;
    setCopyLoading(true);
    setCopyResult({});

    const sourceSlots = scheduleSlots.filter((s) => s.weekday === copyFromDay);
    const resultMap: Record<number, { added: number; skipped: number }> = {};
    const newSlots: ScheduleSlot[] = [];

    for (const targetDay of copyToDays) {
      let added = 0;
      let skipped = 0;

      // Build current slots for this target day (including ones added in this batch)
      const allSlotsForTarget = [
        ...scheduleSlots.filter((s) => s.weekday === targetDay),
        ...newSlots.filter((s) => s.weekday === targetDay),
      ];

      for (const src of sourceSlots) {
        const conflict = hasConflict(
          [...scheduleSlots, ...newSlots],
          targetDay,
          src.startTime
        );
        if (conflict) {
          skipped++;
          continue;
        }

        try {
          const res = await fetch(`/api/users/mentors/${scheduleMentor.id}/schedules`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ weekday: targetDay, startTime: src.startTime, scheduleType: src.scheduleType || "REGULAR" }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            newSlots.push(data.data);
            added++;
          } else {
            skipped++;
          }
        } catch {
          skipped++;
        }
      }

      resultMap[targetDay] = { added, skipped };
    }

    // Merge newly created slots into state
    if (newSlots.length > 0) {
      setScheduleSlots((prev) =>
        [...prev, ...newSlots].sort((a, b) =>
          a.weekday !== b.weekday ? a.weekday - b.weekday : a.startTime.localeCompare(b.startTime)
        )
      );
    }

    setCopyResult(resultMap);
    setCopyLoading(false);
  };



  const filteredMentors = mentors.filter((m) => {
    const q = searchQuery.toLowerCase();
    const name = `${m.firstName || ""} ${m.lastName || ""}`.toLowerCase();
    const matchesSearch = m.email.toLowerCase().includes(q) || name.includes(q);
    if (!matchesSearch) return false;
    if (typeFilter === "ALL") return true;
    return (m.mentorTypes || ["REGULAR"]).includes(typeFilter);
  });

  // ── Render ───────────────────────────────────────────────────────────────

  // Scheduler role gets read-only access — no add / edit / delete
  const isReadOnly = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return u.role === "SCHEDULER";
    } catch {
      return false;
    }
  })();

  return (
    <div className="p-8 w-full">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2 flex items-center gap-2.5">
            <GraduationCap className="w-8 h-8 text-[#7c5cfc]" />
            Mentors & Teachers
          </h1>
          <p className="text-white/45 text-sm max-w-md">
            Manage mentor accounts, qualifications, and weekly availability schedules.
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={openProvisionModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
              bg-[#7c5cfc] hover:bg-[#6d4ef0] text-white text-sm font-semibold transition-all shadow-lg shadow-[#7c5cfc]/20"
          >
            <Plus className="w-4 h-4" />
            ADD MENTOR
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button className="ml-auto" onClick={() => setError(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="w-full max-w-sm relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-white/20" />
          <input
            type="text"
            placeholder="Search mentors by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#161b27] border border-white/[0.07] rounded-xl pl-10 pr-4 py-2.5
              text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#7c5cfc] transition-all"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-[#161b27] border border-white/[0.07] p-1 rounded-xl gap-1">
          {[
            { id: "ALL", label: "All Mentors" },
            { id: "REGULAR", label: "Regular" },
            { id: "DEMO", label: "Demo" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${typeFilter === tab.id
                  ? "bg-[#7c5cfc] text-white shadow-md shadow-[#7c5cfc]/10"
                  : "text-white/45 hover:text-white/75 hover:bg-white/[0.02]"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mentor Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-[#7c5cfc]" />
          <p className="text-white/40 text-sm mt-3">Loading mentors...</p>
        </div>
      ) : filteredMentors.length === 0 ? (
        <div className="text-center py-24 bg-[#161b27] border border-white/[0.07] rounded-2xl">
          <GraduationCap className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/50 font-medium">No mentors found.</p>
          <p className="text-white/25 text-xs mt-1">Start by adding your first mentor account.</p>
        </div>
      ) : (
        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] font-bold text-white/35 uppercase tracking-wider">
                <th className="px-6 py-4">Mentor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredMentors.map((mentor) => (
                <tr key={mentor.id} className="hover:bg-white/[0.015] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7c5cfc] to-[#a78bfa]
                        flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(mentor.firstName?.[0] || mentor.email[0]).toUpperCase()}
                        {(mentor.lastName?.[0] || "").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {mentor.firstName || mentor.lastName
                            ? `${mentor.firstName || ""} ${mentor.lastName || ""}`.trim()
                            : "Mentor"}
                        </p>
                        <p className="text-[10px] text-white/35 truncate">{mentor.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {mentor.isActive ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#00d4aa]">
                        <CheckCircle className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400">
                        <XCircle className="w-3.5 h-3.5" /> Suspended
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(mentor.mentorTypes || ["REGULAR"]).map((t) => (
                        <span key={t} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold border ${
                          t === "DEMO"
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                        }`}>
                          {t === "DEMO" ? "Demo" : "Regular"}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] text-white/30">
                      {new Date(mentor.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      {/* Schedule button always visible — scheduler needs to see availability */}
                      <button
                        onClick={() => openScheduleDrawer(mentor)}
                        className="p-1.5 rounded bg-white/[0.03] border border-white/[0.06] text-white/35 hover:text-[#7c5cfc] hover:bg-[#7c5cfc]/10 hover:border-[#7c5cfc]/20 transition-all"
                        title="View schedule"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </button>
                      {!isReadOnly && (
                        <>
                          <button
                            onClick={() => openEditModal(mentor)}
                            className="p-1.5 rounded bg-white/[0.03] border border-white/[0.06] text-white/35 hover:text-white transition-all"
                            title="Edit mentor"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setResetMentor(mentor); setNewTempPassword(""); setShowResetModal(true); }}
                            className="p-1.5 rounded bg-white/[0.03] border border-white/[0.06] text-white/35 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                            title="Reset password"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMentor(mentor.id)}
                            className="p-1.5 rounded bg-white/[0.03] border border-white/[0.06] text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Delete mentor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PROVISION / EDIT MODAL ──────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-2xl w-full max-w-md p-6 shadow-2xl
            animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-[#7c5cfc]" />
              {editMentor ? "Edit Mentor Account" : "Add Mentor Account"}
            </h3>
            <p className="text-white/35 text-xs mb-5">
              {editMentor
                ? "Update profile details and subject qualifications."
                : "Create a new mentor login. Credentials will be shown after creation."}
            </p>

            <form onSubmit={handleSaveMentor} className="flex flex-col gap-4">
              {/* Email */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Email Address</label>
                <input
                  type="email" required disabled={!!editMentor}
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="mentor@futurespark.com"
                  className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                    text-white focus:outline-none focus:border-[#7c5cfc] disabled:opacity-50"
                />
              </div>

              {/* Password (new only) */}
              {!editMentor && (
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3 text-[#7c5cfc]" /> Temporary Password (min 8 chars)
                  </label>
                  <input
                    type="password" required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                      text-white focus:outline-none focus:border-[#7c5cfc]"
                  />
                </div>
              )}

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium">First Name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                      text-white focus:outline-none focus:border-[#7c5cfc]" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium">Last Name</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                    placeholder="Smith"
                    className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                      text-white focus:outline-none focus:border-[#7c5cfc]" />
                </div>
              </div>

              {/* Account Status (edit only) */}
              {editMentor && (
                <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                  <div>
                    <p className="text-xs font-semibold text-white">Account Active</p>
                    <p className="text-[10px] text-white/30">Deactivate to temporarily lock access.</p>
                  </div>
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 accent-[#7c5cfc]" />
                </div>
              )}

              {/* Mentor Type */}
              <div className="border-t border-white/[0.06] pt-3">
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  Mentor Type
                </label>
                <p className="text-[10px] text-white/30 mb-3">
                  Select all categories that apply to this mentor (Regular, Demo, or both).
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMentorTypes((prev) => {
                        const hasReg = prev.includes("REGULAR");
                        const next = hasReg ? prev.filter((t) => t !== "REGULAR") : [...prev, "REGULAR"];
                        return next.length > 0 ? next : prev; // keep at least one
                      });
                    }}
                    className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all
                      ${mentorTypes.includes("REGULAR")
                        ? "bg-[#7c5cfc]/10 border-[#7c5cfc]/30 text-white"
                        : "bg-[#13161e] border-white/[0.08] text-white/50 hover:text-white/80"
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0
                        ${mentorTypes.includes("REGULAR") ? "bg-[#7c5cfc] border-[#7c5cfc]" : "border-white/25"}`}>
                        {mentorTypes.includes("REGULAR") && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="text-xs font-semibold">Regular</span>
                    </div>
                    <span className="text-[9px] text-white/30 leading-tight">Standard training & sessions</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMentorTypes((prev) => {
                        const hasDemo = prev.includes("DEMO");
                        const next = hasDemo ? prev.filter((t) => t !== "DEMO") : [...prev, "DEMO"];
                        return next.length > 0 ? next : prev; // keep at least one
                      });
                    }}
                    className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all
                      ${mentorTypes.includes("DEMO")
                        ? "bg-[#7c5cfc]/10 border-[#7c5cfc]/30 text-white"
                        : "bg-[#13161e] border-white/[0.08] text-white/50 hover:text-white/80"
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0
                        ${mentorTypes.includes("DEMO") ? "bg-[#7c5cfc] border-[#7c5cfc]" : "border-white/25"}`}>
                        {mentorTypes.includes("DEMO") && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="text-xs font-semibold">Demo</span>
                    </div>
                    <span className="text-[9px] text-white/30 leading-tight">Introductory/trial sessions</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-white/[0.06]">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-white/45 hover:text-white text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#7c5cfc] text-white text-xs font-semibold
                    flex items-center gap-1.5 disabled:opacity-60 shadow-md shadow-[#7c5cfc]/10">
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editMentor ? "Save Changes" : "Add Mentor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CREDENTIALS COPY MODAL ──────────────────────────────────────── */}
      {showCredentialsModal && credentialsData && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="bg-[#161b27] border border-green-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl
            animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <h3 className="text-base font-bold text-white">Mentor Credentials Ready</h3>
            </div>
            <p className="text-white/45 text-xs mb-5 leading-relaxed">
              Mentor account created. Copy these credentials to securely deliver to the mentor.
            </p>
            <div className="flex flex-col gap-4">
              <div className="bg-[#13161e] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider block mb-0.5">Login Email</span>
                  <span className="text-xs text-white/85 font-mono select-all truncate">{credentialsData.email}</span>
                </div>
                <button onClick={() => handleCopy(credentialsData.email, "email")}
                  className="p-2 rounded bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.08] transition-all">
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="bg-[#13161e] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider block mb-0.5">Temporary Password</span>
                  <span className="text-xs text-white/85 font-mono select-all truncate">{credentialsData.password}</span>
                </div>
                <button onClick={() => handleCopy(credentialsData.password, "pass")}
                  className="p-2 rounded bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.08] transition-all">
                  {copiedPassword ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="mt-6 pt-3 border-t border-white/[0.06] flex justify-end">
              <button onClick={() => { setShowCredentialsModal(false); setCredentialsData(null); }}
                className="px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-semibold transition-all">
                Close & Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PASSWORD RESET MODAL ────────────────────────────────────────── */}
      {showResetModal && resetMentor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-2xl w-full max-w-md p-6 shadow-2xl
            animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-[#7c5cfc]" /> Reset Mentor Password
            </h3>
            <p className="text-white/35 text-xs mb-4">
              Set a new temporary password for <strong className="text-white/60">{resetMentor.email}</strong>.
            </p>
            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#7c5cfc]" /> New Temporary Password (min 8 chars)
                </label>
                <input type="password" required value={newTempPassword}
                  onChange={(e) => setNewTempPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                    text-white focus:outline-none focus:border-[#7c5cfc]" />
              </div>
              <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-white/[0.06]">
                <button type="button" onClick={() => { setShowResetModal(false); setResetMentor(null); }}
                  className="px-4 py-2 rounded-xl text-white/45 hover:text-white text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#7c5cfc] text-white text-xs font-semibold
                    flex items-center gap-1.5 disabled:opacity-60">
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SCHEDULE DRAWER ─────────────────────────────────────────────── */}
      {showScheduleDrawer && scheduleMentor && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setShowScheduleDrawer(false)} />

          {/* Panel */}
          <div className="w-[480px] max-w-full bg-[#0f1219] border-l border-white/[0.07] flex flex-col h-full overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] shrink-0">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#7c5cfc]" />
                  Weekly Schedule
                </h2>
                <p className="text-[11px] text-white/35 mt-0.5">
                  {scheduleMentor.firstName
                    ? `${scheduleMentor.firstName} ${scheduleMentor.lastName || ""}`.trim()
                    : scheduleMentor.email}
                </p>
              </div>
              <button onClick={() => setShowScheduleDrawer(false)}
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.05] transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {scheduleLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-[#7c5cfc]" />
                </div>
              ) : (
                <>
                  <div className="mb-4 text-[10px] text-white/30 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Each slot is{" "}
                    <span className="text-[#7c5cfc] font-semibold">90 minutes</span>.
                    End time is auto-calculated. Select a day to add time slots.
                  </div>

                  {/* 7 Day cards */}
                  {DAYS.map((dayName, dayIdx) => {
                    const daySlots = scheduleSlots.filter((s) => s.weekday === dayIdx);
                    const regularSlots = daySlots.filter((s) => (s.scheduleType || "REGULAR") === "REGULAR");
                    const demoSlots = daySlots.filter((s) => s.scheduleType === "DEMO");
                    const isExpanded = expandedDays.includes(dayIdx);
                    const colorClass = DAY_COLORS[dayIdx];
                    const startVal = slotInputs[dayIdx] || "";
                    const previewEnd = startVal ? addNinetyMin(startVal) : null;
                    const isMidnightError = startVal ? minutesFrom(startVal) + 90 > 24 * 60 : false;

                    return (
                      <div key={dayIdx} className={`rounded-xl border bg-gradient-to-br ${colorClass}`}>
                        {/* Day toggle row */}
                        <button
                          type="button"
                          onClick={() => toggleDay(dayIdx)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold bg-black/20`}>
                              {SHORT_DAYS[dayIdx]}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-white">{dayName}</p>
                              <p className="text-[10px] text-white/35">
                                {daySlots.length === 0
                                  ? "No slots configured"
                                  : `${regularSlots.length} Regular, ${demoSlots.length} Demo`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {daySlots.length > 0 && (
                              <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full text-white/50 hidden sm:block">
                                {daySlots.map((s) => `${s.startTime}(${(s.scheduleType || "REGULAR")[0]})`).join(", ")}
                              </span>
                            )}
                            {isExpanded
                              ? <ChevronDown className="w-4 h-4 text-white/40" />
                              : <ChevronRight className="w-4 h-4 text-white/40" />
                            }
                          </div>
                        </button>

                        {/* Expanded body */}
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-4 border-t border-white/[0.08] pt-3">
                            {/* Regular Slots Section */}
                            {allowedTypes.includes("REGULAR") && (
                              <div>
                                <div className="flex items-center gap-1.5 mb-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                  <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Regular Slots</h4>
                                </div>
                                {regularSlots.length === 0 ? (
                                  <p className="text-[10px] text-white/25 italic pl-3 mb-2">No regular slots</p>
                                ) : (
                                  <div className="space-y-2 mb-3">
                                    {regularSlots.map((slot) => (
                                      <div key={slot.id}
                                        className="flex items-center justify-between bg-[#13161e] border border-blue-500/10 rounded-lg px-3 py-2">
                                        <div className="flex items-center gap-2">
                                          <Clock className="w-3.5 h-3.5 text-blue-400" />
                                          <span className="text-xs font-semibold text-white tabular-nums">{slot.startTime}</span>
                                          <span className="text-white/30 text-xs">→</span>
                                          <span className="text-xs font-semibold text-[#00d4aa] tabular-nums">{slot.endTime}</span>
                                          <span className="text-[10px] text-white/20 ml-1">(90 min)</span>
                                        </div>
                                        <button
                                          onClick={() => handleDeleteSlot(slot.id)}
                                          className="p-1 rounded text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                          title="Remove slot"
                                        >
                                          <Trash className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Demo Slots Section */}
                            {allowedTypes.includes("DEMO") && (
                              <div>
                                <div className="flex items-center gap-1.5 mb-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Demo Slots</h4>
                                </div>
                                {demoSlots.length === 0 ? (
                                  <p className="text-[10px] text-white/25 italic pl-3 mb-2">No demo slots</p>
                                ) : (
                                  <div className="space-y-2 mb-3">
                                    {demoSlots.map((slot) => (
                                      <div key={slot.id}
                                        className="flex items-center justify-between bg-[#13161e] border border-amber-500/10 rounded-lg px-3 py-2">
                                        <div className="flex items-center gap-2">
                                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                                          <span className="text-xs font-semibold text-white tabular-nums">{slot.startTime}</span>
                                          <span className="text-white/30 text-xs">→</span>
                                          <span className="text-xs font-semibold text-[#00d4aa] tabular-nums">{slot.endTime}</span>
                                          <span className="text-[10px] text-white/20 ml-1">(90 min)</span>
                                        </div>
                                        <button
                                          onClick={() => handleDeleteSlot(slot.id)}
                                          className="p-1 rounded text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                          title="Remove slot"
                                        >
                                          <Trash className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Copy to other days */}
                            {daySlots.length > 0 && (
                              <div className="border border-dashed border-white/[0.10] rounded-xl overflow-hidden">
                                {/* Copy panel toggle header */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyFromDay === dayIdx
                                      ? (setCopyFromDay(null), setCopyResult({}))
                                      : openCopyPanel(dayIdx)
                                  }
                                  className="w-full flex items-center justify-between px-3 py-2.5 text-left
                                    hover:bg-white/[0.03] transition-colors"
                                >
                                  <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#7c5cfc]">
                                    <CopyPlus className="w-3.5 h-3.5" />
                                    Copy schedule to other days
                                  </span>
                                  {copyFromDay === dayIdx
                                    ? <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                                    : <ChevronRight className="w-3.5 h-3.5 text-white/30" />
                                  }
                                </button>

                                {/* Copy panel body */}
                                {copyFromDay === dayIdx && (
                                  <div className="px-3 pb-3 pt-1 border-t border-white/[0.06] space-y-3">
                                    <p className="text-[10px] text-white/35">
                                      Select target days. Slots that conflict will be skipped automatically.
                                    </p>

                                    {/* Day checkboxes */}
                                    <div className="grid grid-cols-3 gap-1.5">
                                      {DAYS.map((name, idx) => {
                                        if (idx === dayIdx) return null;
                                        const isChecked = copyToDays.includes(idx);
                                        const result = copyResult[idx];
                                        return (
                                          <button
                                            key={idx}
                                            type="button"
                                            onClick={() => !copyLoading && toggleCopyToDay(idx)}
                                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold border transition-all
                                              ${isChecked
                                                ? "bg-[#7c5cfc]/15 border-[#7c5cfc]/40 text-[#7c5cfc]"
                                                : "bg-white/[0.02] border-white/[0.08] text-white/40 hover:text-white/70"
                                              } ${copyLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                                          >
                                            <div className={`w-3 h-3 rounded border flex items-center justify-center shrink-0
                                              ${isChecked ? "bg-[#7c5cfc] border-[#7c5cfc]" : "border-white/25"}`}>
                                              {isChecked && <Check className="w-2 h-2 text-white" />}
                                            </div>
                                            {SHORT_DAYS[idx]}
                                            {result && (
                                              <span className={`ml-auto text-[8px] font-bold px-1 rounded ${result.added > 0 ? "text-[#00d4aa]" : "text-white/25"}`}>
                                                {result.added > 0 ? `+${result.added}` : "–"}
                                              </span>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {/* Result summary */}
                                    {Object.keys(copyResult).length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 pt-1">
                                        {Object.entries(copyResult).map(([dayStr, r]) => {
                                          const d = Number(dayStr);
                                          return (
                                            <span key={d} className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border font-semibold
                                              ${r.added > 0
                                                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                                                : "bg-white/[0.04] border-white/10 text-white/30"
                                              }`}>
                                              {SHORT_DAYS[d]}:
                                              {r.added > 0 && <span>{r.added} added</span>}
                                              {r.skipped > 0 && <span className="text-amber-400">{r.skipped} skipped</span>}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Apply button */}
                                    <button
                                      type="button"
                                      onClick={handleCopySchedule}
                                      disabled={copyLoading || copyToDays.length === 0}
                                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg
                                        bg-[#7c5cfc]/10 hover:bg-[#7c5cfc]/20 border border-[#7c5cfc]/30 hover:border-[#7c5cfc]/50
                                        text-[#7c5cfc] text-[10px] font-bold transition-all disabled:opacity-40"
                                    >
                                      {copyLoading
                                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Copying…</>
                                        : <><ArrowRight className="w-3 h-3" /> Apply Copy to {copyToDays.length} day{copyToDays.length !== 1 ? "s" : ""}</>
                                      }
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Add slot form */}
                            <div className="bg-[#13161e] border border-white/[0.08] rounded-xl p-3">
                              <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-2.5">
                                Add Time Slot
                              </p>
                              {allowedTypes.includes("REGULAR") && allowedTypes.includes("DEMO") && (
                                <div className="mb-3 flex items-center gap-4">
                                  <label className="text-[10px] text-white/40 font-medium">Slot Type:</label>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setSlotTypes((prev) => ({ ...prev, [dayIdx]: 'REGULAR' }))}
                                      className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                        (slotTypes[dayIdx] || 'REGULAR') === 'REGULAR'
                                          ? 'bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#60a5fa]'
                                          : 'bg-white/[0.02] border-white/[0.08] text-white/40 hover:text-white/70'
                                      }`}
                                    >
                                      Regular
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSlotTypes((prev) => ({ ...prev, [dayIdx]: 'DEMO' }))}
                                      className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                        (slotTypes[dayIdx] || 'REGULAR') === 'DEMO'
                                          ? 'bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#fbbf24]'
                                          : 'bg-white/[0.02] border-white/[0.08] text-white/40 hover:text-white/70'
                                      }`}
                                    >
                                      Demo
                                    </button>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-end gap-2">
                                <div className="flex-1">
                                  <label className="block text-[10px] text-white/40 mb-1">Start Time</label>
                                  <input
                                    type="time"
                                    value={startVal}
                                    onChange={(e) => {
                                      setSlotInputs((prev) => ({ ...prev, [dayIdx]: e.target.value }));
                                      setSlotErrors((prev) => ({ ...prev, [dayIdx]: "" }));
                                    }}
                                    className="w-full bg-[#0f1219] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm
                                      text-white focus:outline-none focus:border-[#7c5cfc] tabular-nums"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-[10px] text-white/40 mb-1">End Time (auto)</label>
                                  <div className={`w-full bg-[#0f1219] border rounded-lg px-3 py-1.5 text-sm tabular-nums
                                    ${isMidnightError ? "border-red-500/40 text-red-400" : "border-white/[0.05] text-[#00d4aa]"}`}>
                                    {previewEnd ?? <span className="text-white/20">--:--</span>}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleAddSlot(dayIdx)}
                                  disabled={slotAdding[dayIdx] || !startVal || isMidnightError}
                                  className="px-3 py-1.5 rounded-lg bg-[#7c5cfc] hover:bg-[#6d4ef0] text-white text-xs font-semibold
                                    flex items-center gap-1 disabled:opacity-40 transition-all shrink-0"
                                >
                                  {slotAdding[dayIdx]
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Plus className="w-3.5 h-3.5" />
                                  }
                                  Add
                                </button>
                              </div>

                              {/* Inline conflict/error */}
                              {slotErrors[dayIdx] && (
                                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                  {slotErrors[dayIdx]}
                                </div>
                              )}
                              {isMidnightError && startVal && (
                                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5">
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                  90-min slot exceeds midnight — choose an earlier start time.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.06] px-6 py-4 shrink-0 flex items-center justify-between">
              <span className="text-[10px] text-white/30">
                {scheduleSlots.length} total slot{scheduleSlots.length !== 1 ? "s" : ""} configured
              </span>
              <button
                onClick={() => setShowScheduleDrawer(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-white text-xs font-semibold transition-all"
              >
                Done
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
