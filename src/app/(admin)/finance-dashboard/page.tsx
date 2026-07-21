"use client";

import { useEffect, useState } from "react";
import { DollarSign, ShieldCheck, TrendingUp, CreditCard, Activity, Check, X, AlertCircle } from "lucide-react";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { Toast } from "@/components/ui/toast";

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
  profiles: ParentProfile[];
  students: Student[];
}

interface Program {
  id: string;
  title: string;
  level?: string;
}

export default function FinanceDashboard() {
  const [userName, setUserName] = useState("Finance Admin");
  const [userEmail, setUserEmail] = useState("");
  const [parents, setParents] = useState<ParentAccountRow[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
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
        fetch("/api/courses", { headers: getHeaders() })
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

  const handleToggleApproval = async (parentId: string, approved: boolean) => {
    setActionId(parentId);
    try {
      const res = await fetch(`/api/users/customers/${parentId}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ paymentApproved: approved }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to update approval status.");

      setParents(prev => prev.map(p => p.id === parentId ? { ...p, paymentApproved: approved } : p));
      setToast({
        message: approved ? "Payment status approved successfully." : "Payment status approval revoked.",
        type: "success"
      });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to update payment status.", type: "error" });
    } finally {
      setActionId(null);
    }
  };

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
      header: "Subscribed Program",
      cell: (row) => {
        if (!row.programId) {
          return <span className="text-white/25 italic">No Active Selection</span>;
        }
        const prog = programs.find(p => p.id === row.programId);
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="font-medium text-white">{prog ? prog.title : "Unknown Program"}</span>
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
      header: "Linked Children",
      cell: (row) => {
        if (!row.students || row.students.length === 0) {
          return <span className="text-white/20 italic">No Students linked</span>;
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
      key: "status",
      header: "Payment Status",
      cell: (row) => {
        return row.paymentApproved ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
            <Check className="w-3 h-3" /> APPROVED
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
            <X className="w-3 h-3" /> PENDING APPROVAL
          </span>
        );
      }
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => {
        const hasProgram = !!row.programId;
        const hasStudents = row.students && row.students.length > 0;
        const canApprove = hasProgram && hasStudents;
        const processing = actionId === row.id;

        const getDisabledTitle = () => {
          if (!hasProgram && !hasStudents) return "Parent must select a program and have at least one linked child before approval";
          if (!hasProgram) return "Parent must select a program before payment can be approved";
          if (!hasStudents) return "At least one linked child (student) is required before approval";
          return undefined;
        };

        return (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              {row.paymentApproved ? (
                <button
                  onClick={() => handleToggleApproval(row.id, false)}
                  disabled={processing}
                  className="px-2.5 py-1 text-[10px] font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded transition-all disabled:opacity-50 uppercase tracking-wider"
                >
                  {processing ? "Revoking..." : "Revoke"}
                </button>
              ) : (
                <button
                  onClick={() => handleToggleApproval(row.id, true)}
                  disabled={!canApprove || processing}
                  title={getDisabledTitle()}
                  className="px-2.5 py-1 text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 rounded transition-all disabled:opacity-50 uppercase tracking-wider"
                >
                  {processing ? "Approving..." : "Approve"}
                </button>
              )}
            </div>
            {!row.paymentApproved && !hasStudents && (
              <span className="inline-flex items-center gap-1 text-[9px] text-amber-400/80 font-medium">
                <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                Linked child required
              </span>
            )}
          </div>
        );
      }
    }
  ];

  // Calculate gross KPIs based on fetched parent data
  const totalSubscribed = parents.filter(p => !!p.programId).length;
  const approvedPayments = parents.filter(p => p.paymentApproved).length;
  const pendingPayments = totalSubscribed - approvedPayments;

  return (
    <div className="p-8 w-full max-w-7xl mx-auto space-y-8">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-green-500/15 to-teal-500/10 border border-white/[0.08] rounded-3xl p-8 shadow-2xl">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider mb-3 border border-green-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Staff Role: Finance Manager
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Financial Analytics & Billing
          </h1>
          <p className="text-white/45 text-sm mt-1">Logged in as: {userName} ({userEmail})</p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Total Subscriptions</span>
            <DollarSign className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">{totalSubscribed}</p>
          <p className="text-[10px] text-white/35">Total parent accounts with active program subscriptions.</p>
        </div>

        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Approved Payments</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{approvedPayments}</p>
          <p className="text-[10px] text-white/35">Billing accounts approved and cleared for scheduler booking.</p>
        </div>

        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Pending Approvals</span>
            <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <p className="text-2xl font-bold text-white">{pendingPayments}</p>
          <p className="text-[10px] text-white/35">Newly registered parents awaiting tuition verification.</p>
        </div>
      </div>

      {/* Parents approval table section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Parent Billing & Tuition Approval</h2>
          <p className="text-white/40 text-xs mt-0.5">Verify and approve parent tuition status to unlock scheduler access for their children.</p>
        </div>

        <DataTable
          columns={columns}
          data={parents}
          loading={loading}
          emptyState={
            <div className="text-center py-10">
              <AlertCircle className="w-8 h-8 text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-xs">No customer parents accounts registered.</p>
            </div>
          }
        />
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
