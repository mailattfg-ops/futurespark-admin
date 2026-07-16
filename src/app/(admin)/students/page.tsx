"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
      const [studRes, schedRes] = await Promise.all([
        fetch("/api/users/customers/students", { headers }),
        fetch("/api/schedules", { headers }),
      ]);

      if (studRes.status === 401) {
        router.push("/login");
        return;
      }

      const studData = await studRes.json();
      const schedData = await schedRes.json();

      if (!studData.success) {
        throw new Error(studData.message || "Failed to load students directory");
      }

      const schedules: ScheduledClass[] = schedData.success ? schedData.data ?? [] : [];

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
    if (!confirm("Are you sure you want to permanently delete this student account?")) return;
    try {
      const res = await fetch(`/api/users/customers/students/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to delete student");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
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
        const upcoming = (s.schedules ?? []).filter(
          (sc) => sc.status === "SCHEDULED" && new Date(sc.startTime) >= new Date()
        );
        const completed = (s.schedules ?? []).filter((sc) => sc.status === "COMPLETED").length;
        const total = (s.schedules ?? []).length;

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

        return (
          <div className="space-y-1">
            {next && (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[9px] text-blue-400 font-bold uppercase">
                  <Clock className="w-2.5 h-2.5" />
                  Upcoming
                </span>
                <span className="text-[10px] text-white/60">
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
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] text-white/40">
                <BookOpen className="w-3 h-3 text-white/20" />
                {total} total
              </span>
              {completed > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/70">
                  <CheckCircle2 className="w-3 h-3" />
                  {completed} done
                </span>
              )}
              {upcoming.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] text-blue-400/70">
                  <Calendar className="w-3 h-3" />
                  {upcoming.length} upcoming
                </span>
              )}
            </div>
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
    <div className="p-8 w-full animate-fadeIn">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
          <User className="w-8 h-8 text-[#00d4aa]" />
          Students Directory
        </h1>
        <p className="text-white/40 text-sm">
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
      <div className="relative w-full max-w-sm mb-6">
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
  );
}
