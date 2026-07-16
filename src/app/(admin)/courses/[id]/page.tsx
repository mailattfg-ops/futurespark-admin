"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  BookOpen,
  FileText,
  Presentation,
  AlertCircle,
  Loader2,
  Edit3,
  CheckSquare,
  Square,
  DollarSign,
  Zap,
  Layers,
  Trash2,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Session {
  id: string;
  title: string;
  order: number;
  durationMin: number;
  slidesUrl: string | null;
  guideUrl: string | null;
  worksheetUrl: string | null;
}

type PlanType = "FULL" | "INSTALLMENT";

interface PaymentPlan {
  id: string;
  type: PlanType;
  price: number;
  description: string | null;
  installments: {
    id: string;
    name: string;
    amount: number;
    order: number;
  }[];
}

interface Program {
  id: string;
  title: string;
  description: string | null;
  level: string;
  sessions: Session[];
  paymentPlans: PaymentPlan[];
}

// ── PaymentPlan Card ──────────────────────────────────────────────────────────

function PlanCard({
  type,
  label,
  subtitle,
  icon: Icon,
  existing,
  programId,
  onSaved,
  onDeleted,
}: {
  type: PlanType;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  existing: PaymentPlan | undefined;
  programId: string;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [enabled, setEnabled] = useState(!!existing);
  const [price, setPrice] = useState(existing?.price?.toString() ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [installments, setInstallments] = useState<{ name: string; amount: string }[]>(
    existing?.installments?.map(inst => ({ name: inst.name, amount: inst.amount.toString() })) || []
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync with parent refresh
  useEffect(() => {
    setEnabled(!!existing);
    setPrice(existing?.price?.toString() ?? "");
    setDescription(existing?.description ?? "");
    setInstallments(
      existing?.installments?.map(inst => ({ name: inst.name, amount: inst.amount.toString() })) || []
    );
    setDirty(false);
  }, [existing]);

  // For installment plan type, the total price is the sum of all installments
  const calculatedInstallmentPrice = installments.reduce((sum, inst) => {
    const val = parseFloat(inst.amount);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  useEffect(() => {
    if (type === "INSTALLMENT") {
      setPrice(calculatedInstallmentPrice.toString());
    }
  }, [installments, type, calculatedInstallmentPrice]);

  const getHeaders = () => {
    const tokensStr = localStorage.getItem("tokens");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tokensStr) headers["Authorization"] = `Bearer ${JSON.parse(tokensStr).accessToken}`;
    return headers;
  };

  const handleToggle = async () => {
    if (enabled && existing) {
      // Disable = delete
      setDeleting(true);
      try {
        await fetch(`/api/courses/${programId}/payment-plans/${type}`, {
          method: "DELETE",
          headers: getHeaders(),
        });
        setEnabled(false);
        setPrice("");
        setDescription("");
        setInstallments([]);
        onDeleted();
      } finally { setDeleting(false); }
    } else {
      setEnabled(true);
      if (type === "INSTALLMENT" && installments.length === 0) {
        setInstallments([
          { name: "First Installment", amount: "99" },
          { name: "Second Installment", amount: "99" }
        ]);
      }
      setDirty(true);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (type === "FULL" && (!price || isNaN(Number(price)))) return;
    
    if (type === "INSTALLMENT") {
      if (installments.length === 0) {
        alert("Please add at least one installment entry.");
        return;
      }
      for (const inst of installments) {
        if (!inst.name.trim() || !inst.amount || isNaN(Number(inst.amount))) {
          alert("Please fill in valid name and amount for all installments.");
          return;
        }
      }
    }

    setSaving(true);
    try {
      await fetch(`/api/courses/${programId}/payment-plans`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          type,
          price: Number(price),
          description: description.trim() || undefined,
          installments: type === "INSTALLMENT"
            ? installments.map((inst, idx) => ({
                name: inst.name.trim(),
                amount: Number(inst.amount),
                order: idx + 1,
              }))
            : undefined,
        }),
      });
      setDirty(false);
      onSaved();
    } finally { setSaving(false); }
  };

  const handleAddInstallmentRow = () => {
    const numberWords = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"];
    const nextIndex = installments.length;
    const nameWord = numberWords[nextIndex] ? `${numberWords[nextIndex]} Installment` : `Installment ${nextIndex + 1}`;
    
    setInstallments([...installments, { name: nameWord, amount: "99" }]);
    setDirty(true);
  };

  const handleRemoveInstallmentRow = (index: number) => {
    setInstallments(installments.filter((_, idx) => idx !== index));
    setDirty(true);
  };

  const handleInstallmentChange = (index: number, field: "name" | "amount", value: string) => {
    const next = [...installments];
    next[index][field] = value;
    setInstallments(next);
    setDirty(true);
  };

  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden
      ${enabled
        ? "border-[#7c5cfc]/40 bg-[#7c5cfc]/5"
        : "border-white/[0.07] bg-[#161b27]"
      }`}
    >
      {/* Card Header — Checkbox toggle */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={deleting}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors
          ${enabled ? "text-[#7c5cfc]" : "text-white/25"}`}>
          {deleting
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : enabled
              ? <CheckSquare className="w-5 h-5" />
              : <Square className="w-5 h-5" />
          }
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
          ${enabled ? "bg-[#7c5cfc]/20" : "bg-white/[0.04]"}`}>
          <Icon className={`w-5 h-5 ${enabled ? "text-[#7c5cfc]" : "text-white/30"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${enabled ? "text-white" : "text-white/50"}`}>{label}</p>
          <p className="text-[11px] text-white/35 mt-0.5">{subtitle}</p>
        </div>
        {existing && (
          <span className="text-xs font-bold text-[#00d4aa] flex items-center gap-0.5">
            <DollarSign className="w-3.5 h-3.5" />{existing.price.toFixed(2)}
          </span>
        )}
      </button>

      {/* Expanded Form */}
      {enabled && (
        <form onSubmit={handleSave} className="border-t border-white/[0.06] p-5 flex flex-col gap-4">
          
          {type === "FULL" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">
                  Price (USD) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2 w-3.5 h-3.5 text-white/30" />
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={e => { setPrice(e.target.value); setDirty(true); }}
                    placeholder="0.00"
                    className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl pl-7 pr-3 py-2 text-sm
                      text-white focus:outline-none focus:border-[#7c5cfc]"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="block text-xs text-white/50 font-medium">
                Installment Entries <span className="text-red-400">*</span>
              </label>
              
              <div className="flex flex-col gap-2">
                {installments.map((inst, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. First Installment"
                      value={inst.name}
                      onChange={e => handleInstallmentChange(index, "name", e.target.value)}
                      className="flex-1 bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs
                        text-white focus:outline-none focus:border-[#7c5cfc]"
                    />
                    <div className="relative w-28">
                      <DollarSign className="absolute left-2 top-2 w-3 h-3 text-white/35" />
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={inst.amount}
                        onChange={e => handleInstallmentChange(index, "amount", e.target.value)}
                        className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl pl-6 pr-3 py-1.5 text-xs
                          text-white focus:outline-none focus:border-[#7c5cfc]"
                      />
                    </div>
                    {installments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveInstallmentRow(index)}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddInstallmentRow}
                className="w-full py-2 border border-dashed border-white/[0.08] hover:border-[#7c5cfc]/45
                  rounded-xl text-[11px] font-semibold text-white/40 hover:text-[#a78bfa] transition-all bg-white/[0.01]"
              >
                + Add Installment Entry
              </button>

              <div className="flex items-center justify-between text-xs text-white/40 border-t border-white/[0.05] pt-2">
                <span>Recalculated Total Price:</span>
                <span className="font-bold text-[#00d4aa] flex items-center">
                  <DollarSign className="w-3.5 h-3.5" />{calculatedInstallmentPrice.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-medium">Description (Optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => { setDescription(e.target.value); setDirty(true); }}
              placeholder={type === "FULL" ? "e.g. One-time full course access" : "e.g. 3 monthly payments"}
              className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                text-white focus:outline-none resize-none"
            />
          </div>
          {dirty && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7c5cfc]
                  text-white text-xs font-semibold disabled:opacity-60 transition-all"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Plan
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.id as string;

  const [program, setProgram] = useState<Program | null>(null);
  const [unassignedSessions, setUnassignedSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Session modal
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "link">("create");
  const [selectedExistingSessionId, setSelectedExistingSessionId] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionOrder, setSessionOrder] = useState(1);
  const [sessionDuration, setSessionDuration] = useState(60);
  const [actionLoading, setActionLoading] = useState(false);

  // Resource modal
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [slidesUrl, setSlidesUrl] = useState("");
  const [guideUrl, setGuideUrl] = useState("");
  const [worksheetUrl, setWorksheetUrl] = useState("");

  const getHeaders = () => {
    const tokensStr = localStorage.getItem("tokens");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tokensStr) headers["Authorization"] = `Bearer ${JSON.parse(tokensStr).accessToken}`;
    return headers;
  };

  const fetchProgram = async () => {
    try {
      const res = await fetch(`/api/courses/${programId}`, { headers: getHeaders() });
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to load program");
      setProgram(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnassignedSessions = async () => {
    try {
      const res = await fetch("/api/courses/sessions", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const filtered = data.data.filter((s: any) => !s.programId);
          setUnassignedSessions(filtered);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchProgram();
    fetchUnassignedSessions();
  }, [programId]);

  const handleAddSession = async (e: FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      if (activeTab === "create") {
        const res = await fetch(`/api/courses/${programId}/sessions`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ title: sessionTitle, order: Number(sessionOrder), durationMin: Number(sessionDuration) }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Failed to create session");
      } else {
        if (!selectedExistingSessionId) throw new Error("Please select an existing session");
        const existingSession = unassignedSessions.find(s => s.id === selectedExistingSessionId);
        if (!existingSession) throw new Error("Session not found");

        const res = await fetch(`/api/courses/sessions/${selectedExistingSessionId}`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({
            title: existingSession.title,
            order: Number(sessionOrder),
            programId: programId,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Failed to link session");
      }

      setShowSessionModal(false);
      setSessionTitle("");
      setSelectedExistingSessionId("");
      fetchProgram();
      fetchUnassignedSessions();
    } catch (err: any) {
      setError(err.message);
    } finally { setActionLoading(false); }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Remove this session from the program?")) return;
    try {
      await fetch(`/api/courses/sessions/${sessionId}`, { method: "DELETE", headers: getHeaders() });
      fetchProgram();
    } catch (err: any) { setError(err.message); }
  };

  const handleUpdateResources = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    setActionLoading(true);
    try {
      await fetch(`/api/courses/sessions/${activeSession.id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          title: activeSession.title,
          order: activeSession.order,
          slidesUrl: slidesUrl || null,
          guideUrl: guideUrl || null,
          worksheetUrl: worksheetUrl || null,
        }),
      });
      setActiveSession(null);
      fetchProgram();
    } catch (err: any) {
      setError(err.message);
    } finally { setActionLoading(false); }
  };

  const openResourceModal = (sess: Session) => {
    setActiveSession(sess);
    setSlidesUrl(sess.slidesUrl ?? "");
    setGuideUrl(sess.guideUrl ?? "");
    setWorksheetUrl(sess.worksheetUrl ?? "");
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <Loader2 className="w-10 h-10 animate-spin text-[#7c5cfc]" />
      <p className="text-white/40 text-sm mt-3">Loading program...</p>
    </div>
  );

  if (!program) return (
    <div className="p-8 text-center">
      <p className="text-red-400">Program not found.</p>
      <Link href="/courses" className="mt-4 inline-flex items-center gap-2 text-[#7c5cfc]">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
    </div>
  );

  const fullPlan = program.paymentPlans.find(p => p.type === "FULL");
  const installmentPlan = program.paymentPlans.find(p => p.type === "INSTALLMENT");

  return (
    <div className="p-8 max-w-[900px]">
      {/* Back */}
      <Link href="/courses"
        className="inline-flex items-center gap-2 text-white/40 hover:text-white text-xs font-semibold mb-6 transition-all">
        <ArrowLeft className="w-3.5 h-3.5" />
        BACK TO PROGRAMS
      </Link>

      {/* Program Header */}
      <div className="mb-8 pb-6 border-b border-white/[0.06]">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">{program.title}</h1>
        {program.description && (
          <p className="text-white/45 text-sm max-w-2xl">{program.description}</p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-10">

        {/* ── SESSIONS SECTION ─────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#7c5cfc]" />
                Sessions
              </h2>
              <p className="text-white/35 text-xs mt-0.5">
                {program.sessions.length} class{program.sessions.length !== 1 ? "es" : ""} in this program
              </p>
            </div>
            <button
              onClick={() => { setSessionOrder(program.sessions.length + 1); setShowSessionModal(true); }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                bg-[#7c5cfc] hover:bg-[#6d4ef0] text-white text-xs font-semibold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Session
            </button>
          </div>

          {program.sessions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/[0.07] rounded-2xl">
              <BookOpen className="w-8 h-8 text-white/15 mx-auto mb-3" />
              <p className="text-white/40 text-xs">No sessions yet. Add your first class above.</p>
            </div>
          ) : (
            <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="divide-y divide-white/[0.05]">
                {program.sessions.map(sess => (
                  <div key={sess.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.01] transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06]
                        flex items-center justify-center text-xs font-medium text-white/40 shrink-0">
                        {sess.order}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{sess.title}</p>
                        <p className="text-[11px] text-white/35 mt-0.5">{sess.durationMin} min</p>
                      </div>
                    </div>

                    {/* Assets */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        {[
                          { icon: Presentation, v: sess.slidesUrl, c: "amber", label: "Slides" },
                          { icon: FileText, v: sess.guideUrl, c: "teal", label: "Guide" },
                          { icon: BookOpen, v: sess.worksheetUrl, c: "purple", label: "Worksheet" },
                        ].map(({ icon: Icon, v, c, label }) => (
                          <button
                            key={label}
                            onClick={() => openResourceModal(sess)}
                            title={v ? label : `Add ${label}`}
                            className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1.5 rounded-lg border transition-all ${
                              v
                                ? c === "amber" ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                  : c === "teal" ? "bg-teal-500/10 border-teal-500/30 text-teal-400"
                                  : "bg-[#7c5cfc]/10 border-[#7c5cfc]/30 text-[#a78bfa]"
                                : "bg-white/[0.02] border-white/[0.07] text-white/25 hover:text-white/50"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{label}</span>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => openResourceModal(sess)}
                        className="p-1.5 rounded bg-white/[0.03] border border-white/[0.06] text-white/35 hover:text-white transition-all"
                        title="Edit assets"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSession(sess.id)}
                        className="p-1.5 rounded bg-white/[0.03] border border-white/[0.06] text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Remove session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── PAYMENT PLANS SECTION ─────────────────────────────────── */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#00d4aa]" />
              Payment Plans
            </h2>
            <p className="text-white/35 text-xs mt-0.5">
              Enable up to 2 pricing tiers for this program. Check a plan to activate and configure it.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PlanCard
              type="FULL"
              label="Full Payment"
              subtitle="One-time complete course payment"
              icon={Zap}
              existing={fullPlan}
              programId={programId}
              onSaved={fetchProgram}
              onDeleted={fetchProgram}
            />
            <PlanCard
              type="INSTALLMENT"
              label="Installment Plan"
              subtitle="Split into multiple payments"
              icon={Layers}
              existing={installmentPlan}
              programId={programId}
              onSaved={fetchProgram}
              onDeleted={fetchProgram}
            />
          </div>
        </section>
      </div>

      {/* ── ADD SESSION MODAL ────────────────────────────────────────── */}
      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-2xl w-full max-w-sm p-6 shadow-2xl
            animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-white mb-2">Add Session to {program.title}</h3>
            
            {/* Tabs */}
            <div className="flex border-b border-white/[0.08] mb-4">
              <button
                type="button"
                onClick={() => setActiveTab("create")}
                className={`flex-1 pb-2 text-xs font-semibold text-center border-b-2 transition-all ${
                  activeTab === "create"
                    ? "border-[#7c5cfc] text-[#a78bfa]"
                    : "border-transparent text-white/40 hover:text-white/60"
                }`}
              >
                Create New
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("link")}
                className={`flex-1 pb-2 text-xs font-semibold text-center border-b-2 transition-all ${
                  activeTab === "link"
                    ? "border-[#7c5cfc] text-[#a78bfa]"
                    : "border-transparent text-white/40 hover:text-white/60"
                }`}
              >
                Link Existing
              </button>
            </div>

            <form onSubmit={handleAddSession} className="flex flex-col gap-4">
              {activeTab === "create" ? (
                <>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5">Session Title</label>
                    <input type="text" required value={sessionTitle}
                      onChange={e => setSessionTitle(e.target.value)}
                      placeholder="e.g. Session 1: Introduction"
                      className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                        text-white focus:outline-none focus:border-[#7c5cfc]" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5">Duration (mins)</label>
                    <input type="number" required value={sessionDuration}
                      onChange={e => setSessionDuration(Number(e.target.value))}
                      className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                        text-white focus:outline-none focus:border-[#7c5cfc]" />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">Select Existing Session</label>
                  <select
                    required
                    value={selectedExistingSessionId}
                    onChange={e => setSelectedExistingSessionId(e.target.value)}
                    className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7c5cfc]"
                  >
                    <option value="">-- Choose Existing Session --</option>
                    {unassignedSessions.map(sess => (
                      <option key={sess.id} value={sess.id}>
                        {sess.title} ({sess.durationMin} mins)
                      </option>
                    ))}
                    {unassignedSessions.length === 0 && (
                      <option disabled value="">No unassigned sessions available</option>
                    )}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs text-white/50 mb-1.5">Order Sequence Number</label>
                <input type="number" required value={sessionOrder}
                  onChange={e => setSessionOrder(Number(e.target.value))}
                  className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                    text-white focus:outline-none focus:border-[#7c5cfc]" />
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button type="button" onClick={() => setShowSessionModal(false)}
                  className="px-4 py-2 rounded-xl text-white/45 hover:text-white text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#7c5cfc] text-white text-xs font-semibold
                    flex items-center gap-1.5 disabled:opacity-60">
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {activeTab === "create" ? "Add Session" : "Link Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RESOURCE MODAL ───────────────────────────────────────────── */}
      {activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-2xl w-full max-w-md p-6 shadow-2xl
            animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-white mb-1">Manage Resources</h3>
            <p className="text-white/35 text-xs mb-4">{activeSession.title}</p>
            <form onSubmit={handleUpdateResources} className="flex flex-col gap-4">
              {[
                { label: "Slides URL", value: slidesUrl, setter: setSlidesUrl },
                { label: "Guide URL", value: guideUrl, setter: setGuideUrl },
                { label: "Worksheet URL", value: worksheetUrl, setter: setWorksheetUrl },
              ].map(({ label, value, setter }) => (
                <div key={label}>
                  <label className="block text-xs text-white/50 mb-1.5">{label}</label>
                  <input type="url" value={value}
                    onChange={e => setter(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                      text-white focus:outline-none focus:border-[#7c5cfc]" />
                </div>
              ))}
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" onClick={() => setActiveSession(null)}
                  className="px-4 py-2 rounded-xl text-white/45 hover:text-white text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#7c5cfc] text-white text-xs font-semibold
                    flex items-center gap-1.5 disabled:opacity-60">
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Resources
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
