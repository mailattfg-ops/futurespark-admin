"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DollarSign, ShieldCheck, CreditCard, Activity, Check, X,
  AlertCircle, ChevronDown, ChevronRight, Layers, Coins, LayoutList
} from "lucide-react";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { Toast } from "@/components/ui/toast";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParentProfile {
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
}

interface ParentAccountRow {
  id: string;
  email: string;
  paymentApproved: boolean;
  programId: string | null;
  selectedPlanType: string | null;
  paidInstallmentIds: string[];
  profiles: ParentProfile[];
  students: Student[];
}

interface Session {
  id: string;
  title: string;
  order: number;
}

interface Installment {
  id: string;
  name: string;
  amount: number;
  order: number;
  sessions: Session[];
}

interface PaymentPlan {
  id: string;
  type: "FULL" | "INSTALLMENT";
  price: number;
  description: string | null;
  installments: Installment[];
}

interface Program {
  id: string;
  title: string;
  level?: string;
  paymentPlans: PaymentPlan[];
}

// ── Payment Detail Expansion Panel ────────────────────────────────────────────

function PaymentDetailPanel({
  parent,
  program,
  onUpdatePayment,
}: {
  parent: ParentAccountRow;
  program: Program | undefined;
  onUpdatePayment: (parentId: string, updates: Partial<ParentAccountRow>) => Promise<void>;
}) {
  const [saving, setSaving] = useState<string | null>(null);

  if (!program || !program.paymentPlans || program.paymentPlans.length === 0) {
    return (
      <div className="px-6 py-4 text-[11px] text-white/35 italic">
        No payment plans configured for this program.
      </div>
    );
  }

  const plans = program.paymentPlans;
  const selectedPlanType = parent.selectedPlanType;
  const installmentPlan = plans.find(p => p.type === "INSTALLMENT");
  const fullPlan = plans.find(p => p.type === "FULL");

  const hasPaidAny = (selectedPlanType === "FULL" && parent.paymentApproved) ||
    (selectedPlanType === "INSTALLMENT" && (parent.paidInstallmentIds || []).length > 0);

  const handleSelectPlan = async (planType: string) => {
    if (hasPaidAny && planType !== selectedPlanType) return;
    setSaving("plan");
    try {
      await onUpdatePayment(parent.id, {
        selectedPlanType: planType,
        paidInstallmentIds: [],
        paymentApproved: false,
      });
    } finally {
      setSaving(null);
    }
  };

  const handleToggleInstallment = async (installmentId: string) => {
    if (!installmentPlan) return;
    setSaving(installmentId);
    try {
      const currentPaid = parent.paidInstallmentIds || [];
      const alreadyPaid = currentPaid.includes(installmentId);
      const nextPaid = alreadyPaid
        ? currentPaid.filter(id => id !== installmentId)
        : [...currentPaid, installmentId];

      const allInstallments = installmentPlan.installments || [];
      const allPaid = allInstallments.length > 0 && allInstallments.every(inst =>
        nextPaid.includes(inst.id)
      );

      await onUpdatePayment(parent.id, {
        paidInstallmentIds: nextPaid,
        paymentApproved: alreadyPaid ? false : allPaid,
      });
    } finally {
      setSaving(null);
    }
  };

  const handleFullPayment = async (approve: boolean) => {
    setSaving("full");
    try {
      await onUpdatePayment(parent.id, {
        paymentApproved: approve,
        selectedPlanType: "FULL",
        paidInstallmentIds: [],
      });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Plan Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-white/35 uppercase tracking-wider">
            Select Payment Plan
          </p>
          {hasPaidAny && (
            <span className="text-[9px] text-[#00d4aa] bg-[#00d4aa]/10 border border-[#00d4aa]/20 px-2 py-0.5 rounded-md font-semibold">
              🔒 Locked — Payments Recorded
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {plans.map(plan => (
            <button
              key={plan.id}
              onClick={() => handleSelectPlan(plan.type)}
              disabled={saving === "plan" || (hasPaidAny && selectedPlanType !== plan.type)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-semibold transition-all ${
                selectedPlanType === plan.type
                  ? "bg-[#7c5cfc]/15 border-[#7c5cfc]/50 text-[#a78bfa]"
                  : hasPaidAny
                  ? "bg-white/[0.01] border-white/[0.03] text-white/10 cursor-not-allowed"
                  : "bg-white/[0.02] border-white/[0.07] text-white/40 hover:border-white/20 hover:text-white/60"
              }`}
              title={hasPaidAny && selectedPlanType !== plan.type ? "Plan type cannot be changed after payments are recorded." : ""}
            >
              {plan.type === "FULL" ? (
                <DollarSign className="w-3.5 h-3.5" />
              ) : (
                <Layers className="w-3.5 h-3.5" />
              )}
              {plan.type === "FULL" ? "Full Payment" : "Installment Plan"}
              <span className={`ml-1 ${selectedPlanType === plan.type ? "text-[#7c5cfc]" : "text-white/25"}`}>
                ${plan.price.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Full Payment */}
      {selectedPlanType === "FULL" && fullPlan && (
        <div className="bg-[#0f1119] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-bold text-white">
                Full Payment &mdash; ${fullPlan.price.toLocaleString()} USD
              </p>
              {fullPlan.description && (
                <p className="text-[10px] text-white/35 mt-0.5">{fullPlan.description}</p>
              )}
            </div>
            {parent.paymentApproved ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                  <Check className="w-3 h-3" /> Paid & Approved
                </span>
                <button
                  onClick={() => handleFullPayment(false)}
                  disabled={saving === "full"}
                  className="px-2.5 py-1 text-[10px] font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded transition-all disabled:opacity-50"
                >
                  {saving === "full" ? "Saving..." : "Revoke"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleFullPayment(true)}
                disabled={saving === "full"}
                className="px-3 py-1.5 text-[11px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg transition-all disabled:opacity-50"
              >
                {saving === "full" ? "Saving..." : "Mark as Paid & Approve"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Installment Plan */}
      {selectedPlanType === "INSTALLMENT" && installmentPlan && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <p className="text-[10px] font-bold text-white/35 uppercase tracking-wider">
              Installment Breakdown
            </p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              parent.paymentApproved
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}>
              {(parent.paidInstallmentIds || []).length}/{installmentPlan.installments.length} paid
              {parent.paymentApproved && " · Fully Approved"}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-[#7c5cfc] to-[#00d4aa] rounded-full transition-all duration-500"
              style={{
                width: installmentPlan.installments.length > 0
                  ? `${Math.round(((parent.paidInstallmentIds || []).length / installmentPlan.installments.length) * 100)}%`
                  : "0%"
              }}
            />
          </div>

          <div className="space-y-2">
            {installmentPlan.installments.map(inst => {
              const isPaid = (parent.paidInstallmentIds || []).includes(inst.id);
              const isThisSaving = saving === inst.id;
              return (
                <div
                  key={inst.id}
                  className={`flex items-start justify-between rounded-xl border p-3 transition-all ${
                    isPaid
                      ? "bg-emerald-500/[0.04] border-emerald-500/20"
                      : "bg-white/[0.01] border-white/[0.06]"
                  }`}
                >
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isPaid
                          ? "border-emerald-500 bg-emerald-500/20"
                          : "border-white/20 bg-transparent"
                      }`}>
                        {isPaid && <Check className="w-3 h-3 text-emerald-400" />}
                      </div>
                      <span className={`text-[12px] font-semibold ${isPaid ? "text-white" : "text-white/60"}`}>
                        {inst.name}
                      </span>
                      <span className={`text-[11px] font-bold ${isPaid ? "text-emerald-400" : "text-white/50"}`}>
                        ${inst.amount.toLocaleString()}
                      </span>
                    </div>
                    {inst.sessions && inst.sessions.length > 0 && (
                      <div className="ml-7 flex flex-wrap gap-1">
                        {inst.sessions.map(s => (
                          <span
                            key={s.id}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                              isPaid
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-white/[0.03] text-white/30 border-white/[0.06]"
                            }`}
                          >
                            S{s.order}: {s.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleInstallment(inst.id)}
                    disabled={!!saving}
                    className={`ml-3 px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all disabled:opacity-50 shrink-0 ${
                      isPaid
                        ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                    }`}
                  >
                    {isThisSaving ? "Saving..." : isPaid ? "Unpay" : "Mark Paid"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FinanceDashboard() {
  const [userName, setUserName] = useState("Finance Admin");
  const [userEmail, setUserEmail] = useState("");
  const [parents, setParents] = useState<ParentAccountRow[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const getHeaders = () => {
    const tokensStr = localStorage.getItem("tokens");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tokensStr) headers["Authorization"] = `Bearer ${JSON.parse(tokensStr).accessToken}`;
    return headers;
  };

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const [resParents, resPrograms] = await Promise.all([
        fetch("/api/users/customers", { headers: getHeaders() }),
        fetch("/api/courses", { headers: getHeaders() }),
      ]);

      const dataParents = await resParents.json();
      const dataPrograms = await resPrograms.json();

      if (!resParents.ok || !dataParents.success) throw new Error(dataParents.message || "Failed to fetch parents");
      if (!resPrograms.ok || !dataPrograms.success) throw new Error(dataPrograms.message || "Failed to fetch programs");

      setParents(dataParents.data || []);
      setPrograms(dataPrograms.data || []);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to load dashboard data.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserName([user.firstName, user.lastName].filter(Boolean).join(" ") || "Finance Admin");
        setUserEmail(user.email);
      }
    } catch {}
    fetchFinanceData();
  }, []);

  const handleUpdatePayment = useCallback(async (parentId: string, updates: Partial<ParentAccountRow>) => {
    const res = await fetch(`/api/users/customers/${parentId}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to update payment.");

    setParents(prev =>
      prev.map(p => p.id === parentId ? { ...p, ...updates } : p)
    );
    setToast({ message: "Payment record updated successfully.", type: "success" });
  }, []);

  // ── Columns ──────────────────────────────────────────────────────────────────

  const columns: DataTableColumn<ParentAccountRow>[] = [
    {
      key: "contact",
      header: "Primary Contact",
      cell: (row) => {
        const primary = row.profiles[0];
        const name = primary ? `${primary.firstName} ${primary.lastName}` : "Parent Account";
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-white">{name}</span>
            <span className="text-[10px] text-white/45">{row.email}</span>
          </div>
        );
      }
    },
    {
      key: "program",
      header: "Program",
      cell: (row) => {
        if (!row.programId) {
          return <span className="text-white/25 italic text-xs">No Active Selection</span>;
        }
        const prog = programs.find(p => p.id === row.programId);
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="font-medium text-white text-xs">{prog ? prog.title : "Unknown"}</span>
            {prog?.level && (
              <span className="px-2 py-0.5 rounded text-[8px] font-semibold bg-white/[0.04] text-white/50 border border-white/[0.08] uppercase">
                {prog.level}
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: "students",
      header: "Children",
      cell: (row) => {
        if (!row.students || row.students.length === 0) {
          return <span className="text-white/20 italic text-xs">None linked</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {row.students.map(s => (
              <span key={s.id} className="px-2 py-0.5 rounded bg-purple-500/10 text-[#a78bfa] border border-[#7c5cfc]/20 text-[10px] font-medium">
                {s.firstName} {s.lastName}
              </span>
            ))}
          </div>
        );
      }
    },
    {
      key: "plan",
      header: "Payment Plan",
      cell: (row) => {
        const prog = programs.find(p => p.id === row.programId);
        if (!row.selectedPlanType || !prog) {
          return <span className="text-white/20 italic text-xs">Not selected</span>;
        }

        if (row.selectedPlanType === "FULL") {
          const fullPlan = prog.paymentPlans?.find(p => p.type === "FULL");
          return (
            <div className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-[#7c5cfc]/10 text-[#a78bfa] border border-[#7c5cfc]/20 uppercase">
                <DollarSign className="w-2.5 h-2.5" /> Full Pay
              </span>
              <span className="text-[10px] text-white/40">${fullPlan?.price?.toLocaleString() || "—"}</span>
            </div>
          );
        }

        if (row.selectedPlanType === "INSTALLMENT") {
          const instPlan = prog.paymentPlans?.find(p => p.type === "INSTALLMENT");
          const totalInst = instPlan?.installments?.length || 0;
          const paidInst = (row.paidInstallmentIds || []).length;
          const pct = totalInst > 0 ? Math.round((paidInst / totalInst) * 100) : 0;
          return (
            <div className="flex flex-col gap-1.5 min-w-[110px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
                <Layers className="w-2.5 h-2.5" /> Installment
              </span>
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden w-20">
                <div
                  className="h-full bg-gradient-to-r from-[#7c5cfc] to-[#00d4aa] rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[9px] text-white/35">{paidInst}/{totalInst} paid</span>
            </div>
          );
        }
        return null;
      }
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        return row.paymentApproved ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
            <Check className="w-3 h-3" /> Approved
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
            <X className="w-3 h-3" /> Pending
          </span>
        );
      }
    },
    {
      key: "details",
      header: "",
      cell: (row) => {
        const isOpen = expandedId === row.id;
        return (
          <button
            onClick={() => setExpandedId(isOpen ? null : row.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold transition-all ${
              isOpen
                ? "bg-[#7c5cfc]/10 border-[#7c5cfc]/30 text-[#a78bfa]"
                : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:border-white/20 hover:text-white/60"
            }`}
          >
            {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {isOpen ? "Hide" : "Manage"}
          </button>
        );
      }
    }
  ];

  // ── KPIs ─────────────────────────────────────────────────────────────────────

  const totalSubscribed = parents.filter(p => !!p.programId).length;
  const approvedPayments = parents.filter(p => p.paymentApproved).length;
  const pendingPayments = totalSubscribed - approvedPayments;
  const installmentParents = parents.filter(p => p.selectedPlanType === "INSTALLMENT");
  const totalInstallmentRevenue = installmentParents.reduce((sum, p) => {
    const prog = programs.find(pr => pr.id === p.programId);
    const plan = prog?.paymentPlans?.find(pl => pl.type === "INSTALLMENT");
    const paid = plan?.installments?.filter(inst => (p.paidInstallmentIds || []).includes(inst.id)) || [];
    return sum + paid.reduce((s, inst) => s + inst.amount, 0);
  }, 0);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-green-500/15 to-teal-500/10 border border-white/[0.08] rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider mb-3 border border-green-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Staff Role: Finance Manager
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Financial Analytics & Billing
          </h1>
          <p className="text-white/45 text-xs sm:text-sm mt-1">Logged in as: {userName} ({userEmail})</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Total Subscriptions</span>
            <DollarSign className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">{totalSubscribed}</p>
          <p className="text-[10px] text-white/35">Parents with active program selections.</p>
        </div>
        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Approved Payments</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{approvedPayments}</p>
          <p className="text-[10px] text-white/35">Fully cleared for scheduler access.</p>
        </div>
        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Pending Approvals</span>
            <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <p className="text-2xl font-bold text-white">{pendingPayments}</p>
          <p className="text-[10px] text-white/35">Awaiting tuition verification.</p>
        </div>
        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Installment Revenue</span>
            <Coins className="w-4 h-4 text-[#7c5cfc]" />
          </div>
          <p className="text-2xl font-bold text-white">${totalInstallmentRevenue.toLocaleString()}</p>
          <p className="text-[10px] text-white/35">Collected from paid installment slots.</p>
        </div>
      </div>

      {/* Parent Billing Table */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Parent Billing & Tuition Approval</h2>
          <p className="text-white/40 text-xs mt-0.5">
            Select a payment plan per parent, mark installments as paid, and approve session access.
          </p>
        </div>

        <DataTable
          columns={columns}
          data={parents}
          loading={loading}
          emptyState={
            <div className="text-center py-10">
              <AlertCircle className="w-8 h-8 text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-xs">No customer parent accounts registered.</p>
            </div>
          }
        />

        {/* Expandable payment panel rendered below the table */}
        {expandedId && (() => {
          const parent = parents.find(p => p.id === expandedId);
          if (!parent) return null;
          const prog = programs.find(p => p.id === parent.programId);
          return (
            <div className="bg-[#161b27] border border-[#7c5cfc]/20 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.04] flex items-center gap-2">
                <LayoutList className="w-3.5 h-3.5 text-[#7c5cfc]" />
                <span className="text-[11px] font-bold text-white/70">
                  Payment Management &mdash;{" "}
                  <span className="text-white">
                    {parent.profiles[0]
                      ? `${parent.profiles[0].firstName} ${parent.profiles[0].lastName}`
                      : parent.email}
                  </span>
                </span>
              </div>
              <PaymentDetailPanel
                parent={parent}
                program={prog}
                onUpdatePayment={handleUpdatePayment}
              />
            </div>
          );
        })()}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

