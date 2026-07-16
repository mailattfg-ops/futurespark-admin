"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Contact,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  UserCheck,
  Edit3,
  Trash2,
  Phone,
  Mail,
  Compass,
  FileText,
  Filter,
  Copy,
  Check,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Program {
  id: string;
  title: string;
}

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  source: string;
  status: "NEW" | "CONTACTED" | "INTERESTED" | "ENROLLED" | "LOST";
  programId: string | null;
  program: {
    id: string;
    title: string;
  } | null;
  notes: string | null;
  createdAt: string;
}

const statusBadges: Record<string, { label: string; style: string }> = {
  NEW: { label: "New Lead", style: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
  CONTACTED: { label: "Contacted", style: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
  INTERESTED: { label: "Interested", style: "bg-purple-500/10 border-purple-500/20 text-purple-400" },
  ENROLLED: { label: "Enrolled", style: "bg-green-500/10 border-green-500/20 text-green-400" },
  LOST: { label: "Lost", style: "bg-red-500/10 border-red-500/20 text-red-400" },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const router = useRouter();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modal form states
  const [showModal, setShowModal] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("Website");
  const [status, setStatus] = useState<"NEW" | "CONTACTED" | "INTERESTED" | "ENROLLED" | "LOST">("NEW");
  const [programId, setProgramId] = useState("");
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Dynamic roles loading
  const [rolesList, setRolesList] = useState<{ id: string; name: string }[]>([]);

  // Student Account Auto-Creation Alert Modal
  const [showStudentCreatedModal, setShowStudentCreatedModal] = useState(false);
  const [studentCredentials, setStudentCredentials] = useState<any | null>(null);
  const [copiedStudentEmail, setCopiedStudentEmail] = useState(false);
  const [copiedStudentPassword, setCopiedStudentPassword] = useState(false);
  const [copiedParentEmail, setCopiedParentEmail] = useState(false);
  const [copiedParentPassword, setCopiedParentPassword] = useState(false);

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
      const [resLeads, resProgs, resRoles] = await Promise.all([
        fetch("/api/courses/leads", { headers }),
        fetch("/api/courses", { headers }),
        fetch("/api/roles", { headers }),
      ]);

      if (resLeads.status === 401 || resProgs.status === 401 || resRoles.status === 401) {
        router.push("/login");
        return;
      }

      const dataLeads = await resLeads.json();
      const dataProgs = await resProgs.json();
      const dataRoles = await resRoles.json();

      if (!dataLeads.success || !dataProgs.success || !dataRoles.success) {
        throw new Error("Failed to load Leads, Programs, or Roles records");
      }

      setLeads(dataLeads.data);
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

  const openCreateModal = () => {
    setEditLead(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setSource("Website");
    setStatus("NEW");
    setProgramId("");
    setNotes("");
    setShowModal(true);
  };

  const openEditModal = (lead: Lead) => {
    setEditLead(lead);
    setFirstName(lead.firstName);
    setLastName(lead.lastName);
    setEmail(lead.email);
    setPhone(lead.phone || "");
    setSource(lead.source);
    setStatus(lead.status);
    setProgramId(lead.programId || "");
    setNotes(lead.notes || "");
    setShowModal(true);
  };

  const handleSaveLead = async (e: FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);

    try {
      const isEdit = !!editLead;
      const url = isEdit ? `/api/courses/leads/${editLead.id}` : "/api/courses/leads";
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        source: source.trim(),
        status,
        programId: programId || undefined,
        notes: notes.trim() || undefined,
      };

      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save lead record");
      }

      setShowModal(false);

      // Auto-provision parent profile if status set to ENROLLED and wasn't already enrolled
      const wasAlreadyEnrolled = isEdit && editLead?.status === "ENROLLED";
      if (status === "ENROLLED" && !wasAlreadyEnrolled) {
        const tempParentPassword = "parent" + Math.floor(100000 + Math.random() * 900000).toString();
        try {
          const parentPayload = {
            email: email.trim(),
            password: tempParentPassword,
            profiles: [
              {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                phone: phone ? phone.trim() : null,
                relationship: "Primary Guardian"
              }
            ]
          };

          // 1. Create Parent Account
          const resParent = await fetch("/api/users/customers", {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(parentPayload),
          });
          const dataParent = await resParent.json();

          if (resParent.ok && dataParent.success) {
            setStudentCredentials({
              parentEmail: email.trim(),
              parentPassword: tempParentPassword
            });
            setShowStudentCreatedModal(true);
          } else {
            console.warn("Auto-provisioning parent profile skipped:", dataParent.message);
          }
        } catch (userErr: any) {
          console.error("Auto-provisioning parent profile failed:", userErr);
        }
      }

      setLoading(true);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lead? This action cannot be undone.")) return;
    try {
      const response = await fetch(`/api/courses/leads/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to delete lead");
      
      setLoading(true);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCopyStudent = (text: string, type: 'email' | 'pass' | 'pemail' | 'ppass') => {
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedStudentEmail(true);
      setTimeout(() => setCopiedStudentEmail(false), 2000);
    } else if (type === 'pass') {
      setCopiedStudentPassword(true);
      setTimeout(() => setCopiedStudentPassword(false), 2000);
    } else if (type === 'pemail') {
      setCopiedParentEmail(true);
      setTimeout(() => setCopiedParentEmail(false), 2000);
    } else if (type === 'ppass') {
      setCopiedParentPassword(true);
      setTimeout(() => setCopiedParentPassword(false), 2000);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const query = searchQuery.toLowerCase();
    const fullName = `${lead.firstName} ${lead.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(query) ||
      lead.email.toLowerCase().includes(query) ||
      (lead.program?.title ?? "").toLowerCase().includes(query) ||
      lead.source.toLowerCase().includes(query);

    const matchesStatus = statusFilter === "All" || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2 flex items-center gap-2.5">
            <Contact className="w-8 h-8 text-[#7c5cfc]" />
            Leads Management
          </h1>
          <p className="text-white/45 text-sm max-w-md">
            Track and nurture student admissions leads, catalog course interests, and review pipeline status.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl
            bg-[#7c5cfc] hover:bg-[#6d4ef0] text-white text-sm font-semibold transition-all shadow-lg"
        >
          <Plus className="w-4 h-4" />
          ADD ADMISSION LEAD
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-white/20" />
          <input
            type="text"
            placeholder="Search leads by name, program interest..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#161b27] border border-white/[0.07] rounded-xl pl-10 pr-4 py-2.5
              text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#7c5cfc] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto self-stretch sm:self-auto">
          <Filter className="w-4 h-4 text-white/30 shrink-0" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#161b27] border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-white/70
              focus:outline-none focus:border-[#7c5cfc] transition-all"
          >
            <option value="All">All Pipeline Statuses</option>
            <option value="NEW">New Leads</option>
            <option value="CONTACTED">Contacted</option>
            <option value="INTERESTED">Interested</option>
            <option value="ENROLLED">Enrolled</option>
            <option value="LOST">Lost</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#7c5cfc]" />
          <p className="text-white/40 text-sm mt-3">Loading leads directory...</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-20 bg-[#161b27] border border-white/[0.07] rounded-2xl">
          <Contact className="w-10 h-10 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 font-medium">No leads match the filters.</p>
          <p className="text-white/25 text-xs mt-1">Start cataloging prospective student profiles.</p>
        </div>
      ) : (
        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] font-bold text-white/35 uppercase tracking-wider">
                <th className="px-6 py-4">Lead Name</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Admissions Status</th>
                <th className="px-6 py-4">Program Interest</th>
                <th className="px-6 py-4">Source / Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredLeads.map(lead => {
                const badge = statusBadges[lead.status] || { label: lead.status, style: "bg-white/10 text-white/70" };
                return (
                  <tr key={lead.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7c5cfc]/20 to-[#00d4aa]/25
                          flex items-center justify-center text-white text-xs font-bold shrink-0 border border-[#7c5cfc]/20">
                          {lead.firstName[0].toUpperCase()}{lead.lastName[0].toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-white">
                          {lead.firstName} {lead.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-white/60 flex items-center gap-1.5 font-medium">
                          <Mail className="w-3.5 h-3.5 text-white/30" /> {lead.email}
                        </span>
                        {lead.phone && (
                          <span className="text-[10px] text-white/40 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-white/20" /> {lead.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold border ${badge.style}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] text-[#7c5cfc] bg-[#7c5cfc]/10 border border-[#7c5cfc]/25 px-2 py-0.5 rounded-lg font-medium inline-block">
                        {lead.program?.title || "General Interest"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-white/45 font-medium">{lead.source}</span>
                        <span className="text-[9px] text-white/20">{new Date(lead.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(lead)}
                          className="p-1.5 rounded bg-white/[0.03] border border-white/[0.06] text-white/35 hover:text-white transition-all"
                          title="Edit Lead"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteLead(lead.id)}
                          className="p-1.5 rounded bg-white/[0.03] border border-white/[0.06] text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CREATE / EDIT LEAD MODAL ───────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-2xl w-full max-w-md p-6 shadow-2xl
            animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-1.5">
              <UserCheck className="w-4.5 h-4.5 text-[#7c5cfc]" />
              {editLead ? "Update Lead Profile" : "Register Admissions Lead"}
            </h3>
            <p className="text-white/35 text-xs mb-4">
              {editLead ? "Modify admission status boundaries and tracking notes." : "Register prospective candidate inquiries."}
            </p>

            <form onSubmit={handleSaveLead} className="flex flex-col gap-4">
              {/* Names */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Alice"
                    className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                      text-white focus:outline-none focus:border-[#7c5cfc]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Smith"
                    className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                      text-white focus:outline-none focus:border-[#7c5cfc]"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="candidate@gmail.com"
                  className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                    text-white focus:outline-none focus:border-[#7c5cfc]"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#7c5cfc]" /> Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                    text-white focus:outline-none focus:border-[#7c5cfc]"
                />
              </div>

              {/* Program Interest dropdown */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#7c5cfc]" /> Program Interest (Optional)
                </label>
                <select
                  value={programId}
                  onChange={e => setProgramId(e.target.value)}
                  className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                    text-white focus:outline-none focus:border-[#7c5cfc]"
                >
                  <option value="">General / No Program Selected</option>
                  {programs.map(prog => (
                    <option key={prog.id} value={prog.id}>{prog.title}</option>
                  ))}
                </select>
              </div>

              {/* Source & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium">Lead Source</label>
                  <input
                    type="text"
                    required
                    value={source}
                    onChange={e => setSource(e.target.value)}
                    placeholder="Website, Referral, Ads..."
                    className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                      text-white focus:outline-none focus:border-[#7c5cfc]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium">Pipeline Status</label>
                  <select
                    value={status}
                    disabled={editLead?.status === "ENROLLED"}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                      text-white focus:outline-none focus:border-[#7c5cfc] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="NEW">New Lead</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="INTERESTED">Interested</option>
                    <option value="ENROLLED">Enrolled</option>
                    <option value="LOST">Lost</option>
                  </select>
                  {editLead?.status === "ENROLLED" && (
                    <span className="text-[10px] text-green-400 mt-1 block">
                      Enrolled status cannot be changed.
                    </span>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#7c5cfc]" /> Admissions Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notes from initial lookup, call back times..."
                  className="w-full bg-[#13161e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm
                    text-white focus:outline-none focus:border-[#7c5cfc] resize-none"
                />
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
                  {editLead ? "Save Profile" : "Register Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── AUTO STUDENT ACCOUNT PROVISIONING SUCCESS MODAL ────────────────── */}
      {showStudentCreatedModal && studentCredentials && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-[#161b27] border border-green-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl glow-green max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <h3 className="text-base font-bold text-white">Lead Enrolled Successfully</h3>
            </div>
            <p className="text-white/45 text-xs mb-5 leading-relaxed">
              This lead has been updated to <strong>Enrolled</strong>. A Parent login has been created. The administrator can add student profiles to this account later in the Parents Section.
            </p>

            <div className="space-y-4">
              {/* Parent Credentials */}
              <div className="border border-white/[0.06] bg-white/[0.01] rounded-xl p-4">
                <h4 className="text-[10px] font-bold text-[#7c5cfc] uppercase tracking-wider mb-3">Parent Shared Portal Login</h4>
                <div className="flex flex-col gap-3">
                  <div className="bg-[#13161e] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider block mb-0.5">Parent Email</span>
                      <span className="text-xs text-white/85 font-mono select-all truncate">{studentCredentials.parentEmail}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyStudent(studentCredentials.parentEmail, 'pemail')}
                      className="p-2 rounded bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.08] transition-all shrink-0"
                      title="Copy parent email"
                    >
                      {copiedParentEmail ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="bg-[#13161e] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider block mb-0.5">Parent Password</span>
                      <span className="text-xs text-white/85 font-mono select-all truncate">{studentCredentials.parentPassword}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyStudent(studentCredentials.parentPassword, 'ppass')}
                      className="p-2 rounded bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.08] transition-all shrink-0"
                      title="Copy parent password"
                    >
                      {copiedParentPassword ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-white/[0.06] flex justify-end">
              <button
                type="button"
                onClick={() => { setShowStudentCreatedModal(false); setStudentCredentials(null); }}
                className="px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-semibold transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
