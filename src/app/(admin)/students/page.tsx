"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, MoreHorizontal, ArrowUpRight, Loader2, AlertCircle } from "lucide-react";

interface StudentItem {
  id: string | number;
  name: string;
  email: string;
  courses: number;
  progress: number;
  status: string;
  joined: string;
}

const mockStudents: StudentItem[] = [];

const statusStyle: Record<string, string> = {
  "Active": "bg-[#00d4aa]/15 text-[#00d4aa] border-[#00d4aa]/25",
  "At Risk": "bg-red-500/15   text-red-400   border-red-500/25",
  "Completed": "bg-[#7c5cfc]/15 text-[#a78bfa] border-[#7c5cfc]/25",
};

function ProgressBar({ value }: { value: number }) {
  const color = value >= 80 ? "#00d4aa" : value >= 50 ? "#7c5cfc" : "#ef4444";
  return (
    <div className="w-24 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function StudentsPage() {
  const router = useRouter();
  const [studentsList, setStudentsList] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const getHeaders = () => {
    const tokensStr = localStorage.getItem("tokens");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tokensStr) {
      headers["Authorization"] = `Bearer ${JSON.parse(tokensStr).accessToken}`;
    }
    return headers;
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/users?role=STUDENT&limit=100", {
        headers: getHeaders(),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load dynamic students");
      }

      // Map dynamic backend student users
      const dbStudents: StudentItem[] = data.data.data.map((u: any) => ({
        id: u.id,
        name: u.firstName || u.lastName ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : "Enrolled Learner",
        email: u.email,
        courses: 1, // Default newly enrolled lead to 1 course interest
        progress: 0, // Default new student progress
        status: "Active",
        joined: new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      }));

      // Prepend dynamic students to mock list
      setStudentsList([...dbStudents, ...mockStudents]);
    } catch (err: any) {
      console.error(err);
      // Degrade gracefully to mock list if request fails
      setStudentsList(mockStudents);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = studentsList.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "All" || s.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Students Directory</h1>
          <p className="text-white/40 text-sm">Review pipeline enrollments and student directory tracking profiles.</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl
            bg-[#7c5cfc] hover:bg-[#6d4ef0] text-white text-sm font-medium
            transition-all duration-200 glow-purple"
        >
          <ArrowUpRight className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-5 justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl
                pl-9 pr-3 py-2.5 text-xs text-white/80 placeholder:text-white/25
                focus:outline-none focus:border-[#7c5cfc]/40 transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2.5 rounded-xl
            bg-[#161b27] border border-white/[0.08] text-white/50 text-xs
            hover:text-white/70 hover:border-white/[0.14] transition-all">
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {["All", "Active", "At Risk", "Completed"].map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all
                ${statusFilter === f
                  ? "bg-[#7c5cfc]/15 text-[#a78bfa] border border-[#7c5cfc]/25"
                  : "text-white/35 hover:text-white/60 hover:bg-white/[0.04] border border-transparent"
                }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#7c5cfc]" />
          <p className="text-white/40 text-sm mt-3">Loading student directory...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-20 bg-[#161b27] border border-white/[0.07] rounded-2xl">
          <p className="text-white/50 font-medium">No students matched search filter queries.</p>
        </div>
      ) : (
        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] font-bold text-white/35 uppercase tracking-wider">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Courses</th>
                <th className="px-6 py-4">Progress</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredStudents.map((s, i) => (
                <tr
                  key={s.id}
                  className="hover:bg-white/[0.01] transition-colors"
                >
                  {/* Student */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7c5cfc] to-[#00d4aa]
                        flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {s.name.split(" ").map(n => n?.[0] || "").join("")}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white">{s.name}</p>
                        <p className="text-[11px] text-white/35">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  {/* Courses */}
                  <td className="px-6 py-4">
                    <span className="text-xs text-white/60">{s.courses} enrolled</span>
                  </td>
                  {/* Progress */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={s.progress} />
                      <span className="text-[10px] text-white/40">{s.progress}%</span>
                    </div>
                  </td>
                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full
                      text-[10px] font-semibold border ${statusStyle[s.status] || "bg-white/10"}`}>
                      {s.status}
                    </span>
                  </td>
                  {/* Joined */}
                  <td className="px-6 py-4">
                    <span className="text-[11px] text-white/35">{s.joined}</span>
                  </td>
                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <button className="text-white/25 hover:text-white/60 transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
