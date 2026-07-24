"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  ShieldAlert,
  Plus,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Edit3,
  Trash2,
  CheckSquare,
  Square,
  Key,
  Users,
  Info,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  userCount: number;
}

const AVAILABLE_PERMISSIONS = [
  { key: "view:programs",     label: "View Programs",       desc: "Read access to the curriculum course catalog." },
  { key: "manage:sessions",   label: "Manage Sessions",     desc: "Create, edit, sequence, and delete class sessions." },
  { key: "manage:staff",      label: "Manage Staff",        desc: "Provision helper accounts and teachers qualifications." },
  { key: "view:analytics",    label: "View Analytics",      desc: "Access student enrollment and completion metrics." },
  { key: "manage:roles",      label: "Manage Roles",        desc: "Configure security roles and permissions mappings." },
  { key: "audit:compliance",  label: "Audit Quality",       desc: "Perform compliance quality assurance audits." },
  { key: "manage:schedules",  label: "Manage Schedules",    desc: "Run slot availability calculations on the Scheduler Engine." },
  { key: "manage:inventory",  label: "Manage Inventory",    desc: "Dispatch lab kits and manage low-stock warehouse alerts." },
  { key: "view:revenue",      label: "Access Financials",   desc: "Billing management and instructor payout reviews." },
  { key: "view:lessons",      label: "View Lessons",        desc: "Read masterclass slides and student portal items." },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const router = useRouter();

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

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

  const getHeaders = () => {
    const tokensStr = localStorage.getItem("tokens");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tokensStr) headers["Authorization"] = `Bearer ${JSON.parse(tokensStr).accessToken}`;
    return headers;
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles", { headers: getHeaders() });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to load roles");
      setRoles(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const openCreateModal = () => {
    setEditRole(null);
    setRoleName("");
    setDescription("");
    setSelectedPermissions([]);
    setModalError(null);
    setShowModal(true);
  };

  const openEditModal = (role: Role) => {
    setEditRole(role);
    setRoleName(role.name);
    setDescription(role.description || "");
    setSelectedPermissions(role.permissions || []);
    setModalError(null);
    setShowModal(true);
  };

  const handleSaveRole = async (e: FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setModalError(null);

    try {
      const isEdit = !!editRole;
      const url = isEdit ? `/api/roles/${editRole.id}` : "/api/roles";
      const method = isEdit ? "PUT" : "POST";

      const payload = isEdit
        ? { description: description.trim() || undefined, permissions: selectedPermissions }
        : { name: roleName.trim().toUpperCase(), description: description.trim() || undefined, permissions: selectedPermissions };

      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to save role");

      setShowModal(false);
      setLoading(true);
      fetchRoles();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.name === "ADMIN" || role.name === "STUDENT" || role.name === "PARENT") {
      setToast({ message: "System reserved roles cannot be deleted.", type: "error" });
      return;
    }
    if (role.userCount > 0) {
      setToast({ message: `Cannot delete role '${role.name}' because it is assigned to ${role.userCount} users. Reassign users first.`, type: "error" });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Delete Role",
      message: `Are you sure you want to delete role '${role.name}'?`,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const response = await fetch(`/api/roles/${role.id}`, {
            method: "DELETE",
            headers: getHeaders(),
          });
          const data = await response.json();
          if (!response.ok || !data.success) throw new Error(data.message || "Failed to delete role");

          setLoading(true);
          fetchRoles();
          setToast({ message: `Role '${role.name}' deleted successfully.`, type: "success" });
        } catch (err: any) {
          setToast({ message: err.message || "Failed to delete role", type: "error" });
        }
      },
    });
  };

  const togglePermission = (key: string) => {
    if (selectedPermissions.includes(key)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== key));
    } else {
      setSelectedPermissions([...selectedPermissions, key]);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1 sm:mb-2 flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8 text-[#7c5cfc]" />
            Roles & Permissions
          </h1>
          <p className="text-white/45 text-xs sm:text-sm max-w-md">
            Define role boundaries, access scopes, and security profiles across staff accounts.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
            bg-[#7c5cfc] hover:bg-[#6d4ef0] text-white text-xs sm:text-sm font-semibold transition-all shadow-lg
            w-full sm:w-auto shrink-0 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>CREATE ROLE</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#7c5cfc]" />
          <p className="text-white/40 text-sm mt-3">Loading roles directory...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map(role => {
            const isReserved = role.name === "ADMIN" || role.name === "STUDENT";
            return (
              <div
                key={role.id}
                className="bg-[#161b27] border border-white/[0.07] hover:border-[#7c5cfc]/30 rounded-2xl p-6
                  flex flex-col gap-4 transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-white tracking-wide">{role.name}</h3>
                      {isReserved && (
                        <span className="text-[9px] font-bold text-white/40 bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 rounded">
                          RESERVED
                        </span>
                      )}
                    </div>
                    <p className="text-white/35 text-xs mt-1.5 leading-relaxed min-h-[40px]">
                      {role.description || "No description set."}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/30 hover:text-white transition-colors">
                    <Users className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold">{role.userCount} users</span>
                  </div>
                </div>

                <div className="border-t border-white/[0.05] pt-3 flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    Permissions Enabled ({role.permissions?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions?.map(p => (
                      <span
                        key={p}
                        className="text-[9px] font-bold bg-[#7c5cfc]/10 border border-[#7c5cfc]/20 text-[#a78bfa] px-1.5 py-0.5 rounded uppercase"
                      >
                        {p.replace(":", " ")}
                      </span>
                    )) || <span className="text-[10px] text-white/20 italic">No permissions enabled</span>}
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-auto pt-3 border-t border-white/[0.05]">
                  <button
                    onClick={() => openEditModal(role)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-[#7c5cfc]/45
                      text-[10px] font-bold text-white/50 hover:text-[#a78bfa] hover:bg-[#7c5cfc]/10 transition-all"
                  >
                    <Edit3 className="w-3 h-3" />
                    EDIT ROLE
                  </button>
                  {!isReserved && (
                    <button
                      onClick={() => handleDeleteRole(role)}
                      disabled={role.userCount > 0}
                      className="p-1.5 rounded bg-white/[0.03] border border-white/[0.06] text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30 shrink-0"
                      title={role.userCount > 0 ? "Cannot delete role assigned to users" : "Delete custom role"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE / EDIT ROLE MODAL ─────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-2xl w-full max-w-lg p-6 shadow-2xl
            animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4.5 h-4.5 text-[#7c5cfc]" />
              {editRole ? `Edit Role Boundaries: ${roleName}` : "Create Security Role"}
            </h3>
            <p className="text-white/35 text-xs mb-4">
              {editRole ? "Modify description or permissions checklist." : "Create custom roles. Role name must be UPPERCASE."}
            </p>

            <form onSubmit={handleSaveRole} className="flex flex-col gap-4">
              {modalError && (
                <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 text-red-400 text-xs animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Failed to save role</span>
                    <span className="text-[11px] opacity-80">{modalError}</span>
                  </div>
                </div>
              )}

              {/* Name (Create only) */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Role Identifier Name</label>
                <input
                  type="text"
                  required
                  disabled={!!editRole}
                  value={roleName}
                  onChange={e => setRoleName(e.target.value.toUpperCase())}
                  placeholder="e.g. SYSTEM_AUDITOR"
                  className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                    text-white focus:outline-none focus:border-[#7c5cfc] disabled:opacity-50 uppercase font-mono tracking-wider"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Friendly Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief summary of the role's purpose..."
                  className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                    text-white focus:outline-none focus:border-[#7c5cfc] resize-none"
                />
              </div>

              {/* Permissions Checklist */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Configure Permissions (Scopes)</label>
                <div className="border border-white/[0.08] rounded-xl p-3 bg-[#13161e] flex flex-col gap-2.5 max-h-48 overflow-y-auto">
                  {AVAILABLE_PERMISSIONS.map(perm => {
                    const checked = selectedPermissions.includes(perm.key);
                    return (
                      <button
                        type="button"
                        key={perm.key}
                        onClick={() => togglePermission(perm.key)}
                        className="flex items-start gap-2.5 text-left group"
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                          checked ? "border-[#7c5cfc] text-[#7c5cfc]" : "border-white/20 text-white/20"
                        }`}>
                          {checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold ${checked ? "text-white" : "text-white/60"}`}>
                            {perm.label} <span className="text-[9px] text-white/25 font-mono ml-1">({perm.key})</span>
                          </p>
                          <p className="text-[10px] text-white/30 mt-0.5 leading-snug">{perm.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-2 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-white/45 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#7c5cfc] text-white text-xs font-semibold
                    flex items-center gap-1.5 disabled:opacity-60 shadow-md shadow-[#7c5cfc]/10"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editRole ? "Save Changes" : "Create Role"}
                </button>
              </div>
            </form>
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
