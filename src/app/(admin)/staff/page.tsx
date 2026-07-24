"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  UserCheck,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Shield,
  GraduationCap,
  Calendar,
  Package,
  DollarSign,
  Edit3,
  Trash2,
  Lock,
  UserPlus,
  CheckCircle,
  XCircle,
  Key,
  Copy,
  Check,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Program {
  id: string;
  title: string;
}

interface StaffUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  qualifiedPrograms: string[];
  createdAt: string;
}

const roleBadges: Record<string, { label: string; style: string; icon: React.ElementType }> = {
  ADMIN: { label: "Super Admin", style: "bg-red-500/10 border-red-500/20 text-red-400", icon: Shield },
  TEACHER: { label: "Teacher", style: "bg-purple-500/10 border-purple-500/20 text-purple-400", icon: GraduationCap },
  QA_AUDITOR: { label: "QA Auditor", style: "bg-teal-500/10 border-teal-500/20 text-teal-400", icon: Shield },
  SCHEDULER: { label: "Scheduler", style: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400", icon: Calendar },
  WAREHOUSE_ADMIN: { label: "Warehouse Admin", style: "bg-amber-500/10 border-amber-500/20 text-amber-400", icon: Package },
  FINANCE_ADMIN: { label: "Finance Admin", style: "bg-green-500/10 border-green-500/20 text-green-400", icon: DollarSign },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const router = useRouter();

  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Provision modal state
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<StaffUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [qualifiedIds, setQualifiedIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Credentials success modal
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credentialsData, setCredentialsData] = useState<{ email: string; password: string } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Password reset modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUser, setResetUser] = useState<StaffUser | null>(null);
  const [newTempPassword, setNewTempPassword] = useState("");

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
    if (tokensStr) {
      headers["Authorization"] = `Bearer ${JSON.parse(tokensStr).accessToken}`;
    }
    return headers;
  };

  const fetchData = async () => {
    try {
      const headers = getHeaders();
      const [resStaff, resProgs, resRoles] = await Promise.all([
        fetch("/api/users?isNotRole=STUDENT&limit=100", { headers }),
        fetch("/api/courses", { headers }),
        fetch("/api/roles", { headers }),
      ]);

      if (resStaff.status === 401 || resProgs.status === 401 || resRoles.status === 401) {
        router.push("/login");
        return;
      }

      const dataStaff = await resStaff.json();
      const dataProgs = await resProgs.json();
      const dataRoles = await resRoles.json();

      if (!dataStaff.success || !dataProgs.success || !dataRoles.success) {
        throw new Error("Failed to load staff list");
      }

      setStaffList(dataStaff.data.data);
      setPrograms(dataProgs.data);
      setRolesList(dataRoles.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openProvisionModal = () => {
    setEditUser(null);
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    const defaultRole = rolesList.find(r => r.name === "TEACHER") || rolesList[0];
    setRoleId(defaultRole?.id || "");
    setQualifiedIds([]);
    setIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (user: StaffUser) => {
    setEditUser(user);
    setEmail(user.email);
    setPassword(""); // Leave blank
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    const matchedRole = rolesList.find(r => r.name === user.role);
    setRoleId(matchedRole?.id || "");
    setQualifiedIds(user.qualifiedPrograms || []);
    setIsActive(user.isActive);
    setShowModal(true);
  };

  const handleSaveStaff = async (e: FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);

    try {
      const isEdit = !!editUser;
      const url = isEdit ? `/api/users/${editUser.id}` : "/api/users";
      const method = isEdit ? "PUT" : "POST";

      const selectedRoleName = rolesList.find(r => r.id === roleId)?.name || "";

      const payload: any = {
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        roleId,
        isActive,
        qualifiedPrograms: selectedRoleName === "TEACHER" ? qualifiedIds : [],
      };

      if (!isEdit) {
        if (!password || password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }
        payload.password = password;
      }

      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save staff account");
      }

      setShowModal(false);
      
      // If a new staff account was created, show the credentials copy popup
      if (!isEdit) {
        setCredentialsData({ email: email.trim(), password });
        setShowCredentialsModal(true);
      }

      setLoading(true);
      fetchData();
      setToast({ message: isEdit ? "Staff member account updated successfully." : "Staff member account created successfully.", type: "success" });
    } catch (err: any) {
      setError(err.message);
      setToast({ message: err.message || "Failed to save staff account.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    setActionLoading(true);
    setError(null);

    try {
      if (!newTempPassword || newTempPassword.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }

      const response = await fetch(`/api/users/${resetUser.id}/reset-password`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ password: newTempPassword }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to reset password");
      }

      setShowResetModal(false);
      setCredentialsData({ email: resetUser.email, password: newTempPassword });
      setShowCredentialsModal(true);
      fetchData();
      setToast({ message: "Staff account password reset successfully.", type: "success" });
    } catch (err: any) {
      setError(err.message);
      setToast({ message: err.message || "Failed to reset password.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopy = (text: string, type: 'email' | 'pass') => {
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Staff Member",
      message: "Are you sure you want to delete this staff member? This action is permanent.",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const response = await fetch(`/api/users/${id}`, {
            method: "DELETE",
            headers: getHeaders(),
          });
          const data = await response.json();
          if (!response.ok || !data.success) throw new Error(data.message || "Failed to delete account");
          
          setLoading(true);
          fetchData();
          setToast({ message: "Staff member account deleted successfully.", type: "success" });
        } catch (err: any) {
          setToast({ message: err.message || "Failed to delete account.", type: "error" });
        }
      },
    });
  };

  const toggleQualifiedProgram = (progId: string) => {
    if (qualifiedIds.includes(progId)) {
      setQualifiedIds(qualifiedIds.filter(id => id !== progId));
    } else {
      setQualifiedIds([...qualifiedIds, progId]);
    }
  };

  const filteredStaff = staffList.filter(user => {
    const search = searchQuery.toLowerCase();
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase();
    return (
      user.email.toLowerCase().includes(search) ||
      fullName.includes(search) ||
      user.role.toLowerCase().includes(search)
    );
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1 sm:mb-2 flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 sm:w-8 sm:h-8 text-[#7c5cfc]" />
            Staff Provisioning
          </h1>
          <p className="text-white/45 text-xs sm:text-sm max-w-md">
            Manage system administrators, teachers, auditors, schedulers, and compliance officers.
          </p>
        </div>
        <button
          onClick={openProvisionModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
            bg-[#7c5cfc] hover:bg-[#6d4ef0] text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-[#7c5cfc]/20
            w-full sm:w-auto shrink-0 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>PROVISION STAFF</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search */}
      <div className="mb-6 w-full sm:max-w-sm relative">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-white/20" />
        <input
          type="text"
          placeholder="Search staff by name, email, or role..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-[#161b27] border border-white/[0.07] rounded-xl pl-10 pr-4 py-2.5
            text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#7c5cfc] transition-all"
        />
      </div>

      {/* Staff Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#7c5cfc]" />
          <p className="text-white/40 text-sm mt-3">Loading staff directory...</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="text-center py-20 bg-[#161b27] border border-white/[0.07] rounded-2xl">
          <UserCheck className="w-10 h-10 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 font-medium">No staff members found.</p>
          <p className="text-white/25 text-xs mt-1">Start by provisioning your first helper account.</p>
        </div>
      ) : (
        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl overflow-x-auto shadow-xl">
          <table className="w-full text-left min-w-[650px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] font-bold text-white/35 uppercase tracking-wider">
                <th className="px-6 py-4">Staff Member</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Qualifications</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredStaff.map(user => {
                const Badge = roleBadges[user.role] || { label: user.role, style: "bg-white/10 text-white/70 border-white/20", icon: Shield };
                const Icon = Badge.icon;
                return (
                  <tr key={user.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7c5cfc] to-[#00d4aa]
                          flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {(user.firstName?.[0] || user.email[0]).toUpperCase()}
                          {(user.lastName?.[0] || "").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {user.firstName || user.lastName
                              ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                              : "Provisioned Staff"
                            }
                          </p>
                          <p className="text-[10px] text-white/35 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold border ${Badge.style}`}>
                        <Icon className="w-3 h-3" />
                        {Badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.isActive ? (
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
                      {user.role === "TEACHER" ? (
                        <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                          {user.qualifiedPrograms?.length || 0} Subject qualifications
                        </span>
                      ) : (
                        <span className="text-[10px] text-white/20 italic">Not applicable</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1.5 rounded bg-white/[0.03] border border-white/[0.06] text-white/35 hover:text-white transition-all"
                          title="Edit profile"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setResetUser(user);
                            setNewTempPassword("");
                            setShowResetModal(true);
                          }}
                          className="p-1.5 rounded bg-white/[0.03] border border-white/[0.06] text-white/35 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                          title="Reset password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        {user.role !== "ADMIN" && (
                          <button
                            onClick={() => handleDeleteStaff(user.id)}
                            className="p-1.5 rounded bg-white/[0.03] border border-white/[0.06] text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Delete staff"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PROVISION / EDIT MODAL ──────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-2xl w-full max-w-md p-6 shadow-2xl
            animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-[#7c5cfc]" />
              {editUser ? "Edit Staff Account" : "Provision Staff Account"}
            </h3>
            <p className="text-white/35 text-xs mb-4">
              {editUser ? "Modify existing credentials and teacher modules." : "Add a new helper account. Requires FTL verification password update."}
            </p>

            <form onSubmit={handleSaveStaff} className="flex flex-col gap-4">
              {/* Email */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Email Address</label>
                <input
                  type="email"
                  required
                  disabled={!!editUser}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="staff@futurespark.com"
                  className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                    text-white focus:outline-none focus:border-[#7c5cfc] disabled:opacity-50"
                />
              </div>

              {/* Password (Only for new) */}
              {!editUser && (
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3 text-[#7c5cfc]" /> Temporary Password (Min 8 chars)
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                      text-white focus:outline-none focus:border-[#7c5cfc]"
                  />
                </div>
              )}

              {/* Names */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                      text-white focus:outline-none focus:border-[#7c5cfc]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                      text-white focus:outline-none focus:border-[#7c5cfc]"
                  />
                </div>
              </div>

              {/* Role select */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Staff Role</label>
                <select
                  value={roleId}
                  onChange={e => setRoleId(e.target.value)}
                  className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                    text-white focus:outline-none focus:border-[#7c5cfc]"
                >
                  {rolesList.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Account Status (Only for edit) */}
              {editUser && (
                <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                  <div>
                    <p className="text-xs font-semibold text-white">Account Active Status</p>
                    <p className="text-[10px] text-white/30">Deactivate to temporarily lock access.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                    className="w-4 h-4 accent-[#7c5cfc]"
                  />
                </div>
              )}

              {/* Teacher qualification metadata subjects selection */}
              {rolesList.find(r => r.id === roleId)?.name === "TEACHER" && (
                <div className="border-t border-white/[0.06] pt-3">
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                    Qualified Subjects to Teach
                  </label>
                  <p className="text-[10px] text-white/30 mb-3">
                    Select the program modules this teacher is credentialed to teach for time-fixing slot matches.
                  </p>

                  <div className="max-h-36 overflow-y-auto border border-white/[0.08] rounded-xl p-3 bg-[#13161e] flex flex-col gap-2">
                    {programs.map(prog => (
                      <label key={prog.id} className="flex items-center gap-2.5 text-xs text-white/70 hover:text-white cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={qualifiedIds.includes(prog.id)}
                          onChange={() => toggleQualifiedProgram(prog.id)}
                          className="w-3.5 h-3.5 accent-[#7c5cfc]"
                        />
                        <span>{prog.title}</span>
                      </label>
                    ))}
                    {programs.length === 0 && (
                      <span className="text-[10px] text-white/20 italic">No programs available to assign.</span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-white/[0.06]">
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
                  {editUser ? "Save Changes" : "Provision Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CREDENTIALS SUCCESS COPY MODAL ─────────────────────────── */}
      {showCredentialsModal && credentialsData && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="bg-[#161b27] border border-green-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl
            animate-in fade-in zoom-in-95 duration-200 glow-green">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <h3 className="text-base font-bold text-white">Credentials Ready</h3>
            </div>
            <p className="text-white/45 text-xs mb-5 leading-relaxed">
              The staff account has been successfully configured. Copy these temporary credentials to send to the user.
            </p>

            <div className="flex flex-col gap-4">
              {/* Email Address */}
              <div className="bg-[#13161e] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider block mb-0.5">Username (Email)</span>
                  <span className="text-xs text-white/85 font-mono select-all truncate">{credentialsData.email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(credentialsData.email, 'email')}
                  className="p-2 rounded bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.08] transition-all"
                  title="Copy email"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Password */}
              <div className="bg-[#13161e] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider block mb-0.5">Temporary Password</span>
                  <span className="text-xs text-white/85 font-mono select-all truncate">{credentialsData.password}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(credentialsData.password, 'pass')}
                  className="p-2 rounded bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.08] transition-all"
                  title="Copy password"
                >
                  {copiedPassword ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-white/[0.06] flex justify-end">
              <button
                type="button"
                onClick={() => { setShowCredentialsModal(false); setCredentialsData(null); }}
                className="px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-semibold transition-all"
              >
                Close & Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PASSWORD RESET MODAL ────────────────────────────────────── */}
      {showResetModal && resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-2xl w-full max-w-md p-6 shadow-2xl
            animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-[#7c5cfc]" />
              Reset Temporary Password
            </h3>
            <p className="text-white/35 text-xs mb-4">
              Set a new temporary password for <strong>{resetUser.email}</strong>. This forces FTL verification update.
            </p>

            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#7c5cfc]" /> New Temporary Password (Min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  value={newTempPassword}
                  onChange={e => setNewTempPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                    text-white focus:outline-none focus:border-[#7c5cfc]"
                />
              </div>

              <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => { setShowResetModal(false); setResetUser(null); }}
                  className="px-4 py-2 rounded-xl text-white/45 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#7c5cfc] text-white text-xs font-semibold
                    flex items-center gap-1.5 disabled:opacity-60 shadow-md"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Reset Password
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
