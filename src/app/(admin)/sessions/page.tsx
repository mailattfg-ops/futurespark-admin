"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Plus,
  Search,
  Presentation,
  FileText,
  BookOpen,
  Loader2,
  AlertCircle,
  Sparkles,
  Link as LinkIcon,
  SlidersHorizontal,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Program {
  id: string;
  title: string;
}

interface Session {
  id: string;
  title: string;
  order: number;
  durationMin: number;
  slidesUrl: string | null;
  guideUrl: string | null;
  worksheetUrl: string | null;
  programId: string | null;
  program: Program | null;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SessionsPage() {
  const router = useRouter();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProgramFilter, setSelectedProgramFilter] = useState("All");

  // Create session modal
  const [showModal, setShowModal] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionOrder, setSessionOrder] = useState(1);
  const [sessionDuration, setSessionDuration] = useState(60);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [slidesUrl, setSlidesUrl] = useState("");
  const [guideUrl, setGuideUrl] = useState("");
  const [worksheetUrl, setWorksheetUrl] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const getHeaders = () => {
    const tokensStr = localStorage.getItem("tokens");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tokensStr) {
      const tokens = JSON.parse(tokensStr);
      headers["Authorization"] = `Bearer ${tokens.accessToken}`;
    }
    return headers;
  };

  const fetchData = async () => {
    try {
      const headers = getHeaders();
      const [resProgs, resSess] = await Promise.all([
        fetch("/api/courses", { headers }),
        fetch("/api/courses/sessions", { headers }),
      ]);

      if (resProgs.status === 401 || resSess.status === 401) {
        localStorage.removeItem("user");
        localStorage.removeItem("tokens");
        router.push("/login");
        return;
      }

      const dataProgs = await resProgs.json();
      const dataSess = await resSess.json();

      if (!dataProgs.success || !dataSess.success) {
        throw new Error("Failed to load sessions directory");
      }

      setPrograms(dataProgs.data);
      setSessions(dataSess.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateSession = async (e: FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);

    try {
      const url = selectedProgramId
        ? `/api/courses/${selectedProgramId}/sessions`
        : "/api/courses/sessions";

      const response = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          title: sessionTitle.trim(),
          order: Number(sessionOrder),
          durationMin: Number(sessionDuration),
          slidesUrl: slidesUrl.trim() || undefined,
          guideUrl: guideUrl.trim() || undefined,
          worksheetUrl: worksheetUrl.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to create session");

      // Reset and reload
      setShowModal(false);
      setSessionTitle("");
      setSessionOrder(1);
      setSessionDuration(60);
      setSelectedProgramId("");
      setSlidesUrl("");
      setGuideUrl("");
      setWorksheetUrl("");
      setLoading(true);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = sessions.filter(sess => {
    const matchSearch = sess.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sess.program?.title ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchProgram = selectedProgramFilter === "All" || sess.programId === selectedProgramFilter;
    return matchSearch && matchProgram;
  });

  // Auto-increment order based on existing sessions in selected program
  const nextOrder = sessions.filter(s => s.programId === selectedProgramId).length + 1;

  return (
    <div className="p-8 w-full">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Curriculum Sessions</h1>
          <p className="text-white/45 text-sm max-w-md">
            Create, sequence, and assign class sessions to programs from a single cockpit.
          </p>
        </div>
        <button
          onClick={() => { setSessionOrder(sessions.length + 1); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl
            bg-[#7c5cfc] hover:bg-[#6d4ef0] text-white text-sm font-semibold transition-all"
        >
          <Plus className="w-4 h-4" />
          CREATE SESSION
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 max-w-sm relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-white/20" />
          <input
            type="text"
            placeholder="Search sessions or programs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#161b27] border border-white/[0.07] rounded-xl pl-10 pr-4 py-2.5
              text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#7c5cfc] transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-white/35" />
          <select
            value={selectedProgramFilter}
            onChange={e => setSelectedProgramFilter(e.target.value)}
            className="bg-[#161b27] border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="All">All Programs</option>
            <option value="">Unassigned</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
      </div>

      {/* Sessions Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#7c5cfc]" />
          <p className="text-white/40 text-sm mt-3">Loading sessions directory...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-[#161b27] border border-white/[0.07] rounded-2xl">
          <Clock className="w-10 h-10 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 font-medium">No sessions found.</p>
          <p className="text-white/25 text-xs mt-1">Create your first class session to begin.</p>
        </div>
      ) : (
        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] font-bold text-white/35 uppercase tracking-wider">
                <th className="px-6 py-4">Session</th>
                <th className="px-6 py-4">Program</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Assets</th>
                {/* <th className="px-6 py-4 text-right">Actions</th> */}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filtered.map(sess => (
                <tr key={sess.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-white/[0.04] border border-white/[0.06]
                        flex items-center justify-center text-xs font-semibold text-white/50 shrink-0">
                        {sess.order}
                      </div>
                      <span className="text-xs font-semibold text-white">{sess.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {sess.program ? (
                      <span className="text-xs font-medium text-[#a78bfa] bg-[#7c5cfc]/10 border border-[#7c5cfc]/20 px-2 py-0.5 rounded">
                        {sess.program.title}
                      </span>
                    ) : (
                      <span className="text-xs text-white/20 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-white/35">{sess.durationMin} mins</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      {[
                        { icon: Presentation, value: sess.slidesUrl, color: "amber" },
                        { icon: FileText, value: sess.guideUrl, color: "teal" },
                        { icon: BookOpen, value: sess.worksheetUrl, color: "purple" },
                      ].map(({ icon: Icon, value, color }, i) => (
                        <span key={i} className={`p-1.5 rounded border ${value
                          ? color === "amber" ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            : color === "teal" ? "bg-teal-500/10 border-teal-500/30 text-teal-400"
                              : "bg-[#7c5cfc]/10 border-[#7c5cfc]/30 text-[#a78bfa]"
                          : "bg-white/[0.02] border-white/[0.06] text-white/20"
                          }`}>
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                      ))}
                    </div>
                  </td>
                  {/* <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => sess.programId ? router.push(`/courses/${sess.programId}`) : undefined}
                      className="px-2.5 py-1.5 rounded-lg border border-white/[0.1] hover:border-[#7c5cfc]/40
                        text-[10px] font-bold text-white/60 hover:text-[#a78bfa] hover:bg-[#7c5cfc]/10 transition-all"
                    >
                      {sess.programId ? "VIEW PROGRAM" : "MANAGE"}
                    </button>
                  </td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CREATE SESSION MODAL ──────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-2xl w-full max-w-md p-6 shadow-2xl
            animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#7c5cfc]" />
              Create Session
            </h3>
            <p className="text-white/35 text-xs mb-4">Deploy a new independent class session.</p>

            <form onSubmit={handleCreateSession} className="flex flex-col gap-4">

              {/* Session Meta */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Session Title</label>
                <input type="text" required value={sessionTitle}
                  onChange={e => setSessionTitle(e.target.value)}
                  placeholder="e.g. Introduction to Distributed Systems"
                  className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                    text-white focus:outline-none focus:border-[#7c5cfc]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium">Duration (mins)</label>
                  <input type="number" required value={sessionDuration}
                    onChange={e => setSessionDuration(Number(e.target.value))}
                    className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                      text-white focus:outline-none focus:border-[#7c5cfc]" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium">Order</label>
                  <input type="number" required value={sessionOrder}
                    onChange={e => setSessionOrder(Number(e.target.value))}
                    className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                      text-white focus:outline-none focus:border-[#7c5cfc]" />
                </div>
              </div>

              {/* Assign to Program */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">
                  Assign to Program <span className="text-white/25">(Optional)</span>
                </label>
                <select value={selectedProgramId}
                  onChange={e => setSelectedProgramId(e.target.value)}
                  className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                    text-white focus:outline-none focus:border-[#7c5cfc]">
                  <option value="">— Leave Unassigned —</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>

              {/* Resource URLs */}
              <div className="border-t border-white/[0.06] pt-3 flex flex-col gap-3">
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" />
                  Resource Assets (Optional)
                </label>
                {[
                  { label: "Slides URL", value: slidesUrl, setter: setSlidesUrl },
                  { label: "Guide URL", value: guideUrl, setter: setGuideUrl },
                  { label: "Worksheet URL", value: worksheetUrl, setter: setWorksheetUrl },
                ].map(({ label, value, setter }) => (
                  <div key={label}>
                    <label className="block text-[10px] text-white/50 mb-1">{label}</label>
                    <input type="url" value={value} onChange={e => setter(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-[#13161e] border border-white/[0.08] rounded-lg px-2.5 py-1.5
                        text-xs text-white focus:outline-none" />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-white/45 hover:text-white text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#7c5cfc] text-white text-xs font-semibold
                    flex items-center gap-1.5 disabled:opacity-60">
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Deploy Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
