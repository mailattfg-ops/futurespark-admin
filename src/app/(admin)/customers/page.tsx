"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  Users,
  Search,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  Calendar,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Trash2,
  Plus,
  UserCheck,
  UserCheck2,
  User,
  GraduationCap,
  Key,
  Shield,
  X,
  CheckCircle,
  Check,
  Copy,
  Edit2,
  Clock,
  CheckCircle2,
  XCircle,
  BookOpen,
} from "lucide-react";

interface ScheduledClass {
  id: string;
  studentId: string;
  startTime: string;
  endTime: string;
  status: string;
  programId: string;
  mentor: { firstName: string; lastName: string };
}

interface ParentProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  relationship: string | null;
}

interface Student {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
}

interface ParentAccount {
  id: string;
  email: string;
  isActive: boolean;
  profiles: ParentProfile[];
  students: Student[];
  createdAt: string;
  programId?: string | null;
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<ParentAccount[]>([]);
  const [schedules, setSchedules] = useState<ScheduledClass[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Expand/Collapse states
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});

  // Modals state
  const [parentModalOpen, setParentModalOpen] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  // Parent modal form state
  const [parentForm, setParentForm] = useState({
    email: "",
    password: "",
    programId: "",
    p1FirstName: "",
    p1LastName: "",
    p1Phone: "",
    p1Relationship: "Mother",
    hasP2: false,
    p2FirstName: "",
    p2LastName: "",
    p2Phone: "",
    p2Relationship: "Father"
  });

  // Student modal form state
  const [studentForm, setStudentForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: ""
  });

  const [submittingParent, setSubmittingParent] = useState(false);
  const [submittingStudent, setSubmittingStudent] = useState(false);

  // Add parent profile states
  const [addProfileModalOpen, setAddProfileModalOpen] = useState(false);
  const [addProfileParentId, setAddProfileParentId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    relationship: "Father"
  });
  const [submittingProfile, setSubmittingProfile] = useState(false);

  // Copy credentials popup state
  const [createdCredentials, setCreatedCredentials] = useState<{
    type: 'parent' | 'student';
    email: string;
    password: string;
    studentName?: string;
  } | null>(null);

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Edit Parent Account states
  const [editParentAccountOpen, setEditParentAccountOpen] = useState(false);
  const [editParentAccountTarget, setEditParentAccountTarget] = useState<{ id: string; email: string; programId?: string | null } | null>(null);
  const [parentAccountEmail, setParentAccountEmail] = useState("");
  const [parentAccountProgramId, setParentAccountProgramId] = useState("");
  const [submittingEditParentAccount, setSubmittingEditParentAccount] = useState(false);

  // Edit Parent Profile states
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editProfileTarget, setEditProfileTarget] = useState<{ id: string; firstName: string; lastName: string; phone: string; relationship: string } | null>(null);
  const [profileEditForm, setProfileEditForm] = useState({ firstName: "", lastName: "", phone: "", relationship: "Father" });
  const [submittingEditProfile, setSubmittingEditProfile] = useState(false);

  // Edit Student states
  const [editStudentOpen, setEditStudentOpen] = useState(false);
  const [editStudentTarget, setEditStudentTarget] = useState<{ id: string; firstName: string; lastName: string; email: string } | null>(null);
  const [studentEditForm, setStudentEditForm] = useState({ firstName: "", lastName: "", email: "" });
  const [submittingEditStudent, setSubmittingEditStudent] = useState(false);

  // Password Reset states
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ type: 'parent' | 'student'; id: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [submittingReset, setSubmittingReset] = useState(false);

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

  const handleCopyCredentials = (text: string, type: 'email' | 'pass') => {
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const getHeaders = () => {
    const tokensStr = localStorage.getItem("tokens");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tokensStr) {
      headers["Authorization"] = `Bearer ${JSON.parse(tokensStr).accessToken}`;
    }
    return headers;
  };

  const fetchCustomers = async () => {
    try {
      const headers = getHeaders();
      const [custRes, schedRes, progRes] = await Promise.all([
        fetch("/api/users/customers", { headers }),
        fetch("/api/schedules", { headers }),
        fetch("/api/courses", { headers }),
      ]);

      if (custRes.status === 401) {
        router.push("/login");
        return;
      }

      const data = await custRes.json();
      if (!custRes.ok || !data.success) {
        throw new Error(data.message || "Failed to load customers");
      }

      const schedData = await schedRes.json();
      setSchedules(schedData.success ? schedData.data ?? [] : []);
      setCustomers(data.data || []);

      const progData = await progRes.json();
      setPrograms(progData.success ? progData.data ?? [] : []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect to microservices backend");
    } finally {
      setLoading(false);
    }
  };

  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setRole(JSON.parse(userStr).role);
    }
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingParent(true);
    setError(null);

    const profiles = [
      {
        firstName: parentForm.p1FirstName,
        lastName: parentForm.p1LastName,
        phone: parentForm.p1Phone || null,
        relationship: parentForm.p1Relationship
      }
    ];

    if (parentForm.hasP2) {
      profiles.push({
        firstName: parentForm.p2FirstName,
        lastName: parentForm.p2LastName,
        phone: parentForm.p2Phone || null,
        relationship: parentForm.p2Relationship
      });
    }

    try {
      const res = await fetch("/api/users/customers", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          email: parentForm.email,
          password: parentForm.password,
          profiles,
          programId: parentForm.programId || null
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create parent account");
      }

      const parentEmail = parentForm.email;
      const parentPassword = parentForm.password;

      // Reset Form and close modal
      setParentForm({
        email: "",
        password: "",
        programId: "",
        p1FirstName: "",
        p1LastName: "",
        p1Phone: "",
        p1Relationship: "Mother",
        hasP2: false,
        p2FirstName: "",
        p2LastName: "",
        p2Phone: "",
        p2Relationship: "Father"
      });
      setParentModalOpen(false);
      fetchCustomers();
      setCreatedCredentials({
        type: 'parent',
        email: parentEmail,
        password: parentPassword
      });
      setToast({ message: "Parent account created successfully.", type: "success" });
    } catch (err: any) {
      setError(err.message);
      setToast({ message: err.message || "Failed to create parent account.", type: "error" });
    } finally {
      setSubmittingParent(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentId) return;
    setSubmittingStudent(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/customers/${selectedParentId}/students`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(studentForm)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create student login");
      }

      const studentEmail = studentForm.email;
      const studentPassword = studentForm.password;
      const studentFullName = `${studentForm.firstName} ${studentForm.lastName}`;

      setStudentForm({
        email: "",
        password: "",
        firstName: "",
        lastName: ""
      });
      setStudentModalOpen(false);
      setSelectedParentId(null);
      fetchCustomers();
      setCreatedCredentials({
        type: 'student',
        email: studentEmail,
        password: studentPassword,
        studentName: studentFullName
      });
      setToast({ message: "Student account created successfully.", type: "success" });
    } catch (err: any) {
      setError(err.message);
      setToast({ message: err.message || "Failed to create student account.", type: "error" });
    } finally {
      setSubmittingStudent(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addProfileParentId) return;
    setSubmittingProfile(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/customers/${addProfileParentId}/profiles`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: profileForm.firstName.trim(),
          lastName: profileForm.lastName.trim(),
          phone: profileForm.phone.trim() || null,
          relationship: profileForm.relationship
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to add parent profile");
      }

      setProfileForm({
        firstName: "",
        lastName: "",
        phone: "",
        relationship: "Father"
      });
      setAddProfileModalOpen(false);
      setAddProfileParentId(null);
      fetchCustomers();
      setToast({ message: "Parent profile added successfully.", type: "success" });
    } catch (err: any) {
      setError(err.message);
      setToast({ message: err.message || "Failed to add parent profile.", type: "error" });
    } finally {
      setSubmittingProfile(false);
    }
  };

  const handleUpdateParentAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editParentAccountTarget) return;
    setSubmittingEditParentAccount(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/customers/${editParentAccountTarget.id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ 
          email: parentAccountEmail.trim(),
          programId: parentAccountProgramId || null
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update parent account");
      }

      setEditParentAccountOpen(false);
      setEditParentAccountTarget(null);
      fetchCustomers();
      setToast({ message: "Parent account details updated successfully.", type: "success" });
    } catch (err: any) {
      setError(err.message);
      setToast({ message: err.message || "Failed to update parent account.", type: "error" });
    } finally {
      setSubmittingEditParentAccount(false);
    }
  };

  const handleUpdateParentProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProfileTarget) return;
    setSubmittingEditProfile(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/customers/profiles/${editProfileTarget.id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: profileEditForm.firstName.trim(),
          lastName: profileEditForm.lastName.trim(),
          phone: profileEditForm.phone.trim() || null,
          relationship: profileEditForm.relationship
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update parent profile");
      }

      setEditProfileOpen(false);
      setEditProfileTarget(null);
      fetchCustomers();
      setToast({ message: "Parent profile updated successfully.", type: "success" });
    } catch (err: any) {
      setError(err.message);
      setToast({ message: err.message || "Failed to update parent profile.", type: "error" });
    } finally {
      setSubmittingEditProfile(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudentTarget) return;
    setSubmittingEditStudent(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/customers/students/${editStudentTarget.id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: studentEditForm.firstName.trim(),
          lastName: studentEditForm.lastName.trim(),
          email: studentEditForm.email.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update student");
      }

      setEditStudentOpen(false);
      setEditStudentTarget(null);
      fetchCustomers();
      setToast({ message: "Student profile updated successfully.", type: "success" });
    } catch (err: any) {
      setError(err.message);
      setToast({ message: err.message || "Failed to update student profile.", type: "error" });
    } finally {
      setSubmittingEditStudent(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setSubmittingReset(true);
    setError(null);

    try {
      const path = resetTarget.type === 'parent' 
        ? `/api/users/customers/${resetTarget.id}/reset-password`
        : `/api/users/customers/students/${resetTarget.id}/reset-password`;

      const res = await fetch(path, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ password: newPassword })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to reset password");
      }

      setResetModalOpen(false);
      setResetTarget(null);
      setNewPassword("");
      
      setCreatedCredentials({
        type: resetTarget.type,
        email: resetTarget.email,
        password: newPassword,
        studentName: resetTarget.type === 'student' ? 'Student' : undefined
      });
      setToast({ message: "Account password reset successfully.", type: "success" });
    } catch (err: any) {
      setError(err.message);
      setToast({ message: err.message || "Failed to reset account password.", type: "error" });
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleDeleteParent = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Customer Account",
      message: "Are you sure you want to delete this customer account? This will permanently delete both parent profiles and all linked student logins.",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/users/customers/${id}`, {
            method: "DELETE",
            headers: getHeaders()
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to delete parent account");
          }
          fetchCustomers();
          setToast({ message: "Customer account deleted successfully.", type: "success" });
        } catch (err: any) {
          setToast({ message: err.message || "Failed to delete customer account.", type: "error" });
        }
      },
    });
  };

  const handleDeleteStudent = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Student Profile",
      message: "Are you sure you want to delete this student profile?",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/users/customers/students/${id}`, {
            method: "DELETE",
            headers: getHeaders()
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to delete student login");
          }
          fetchCustomers();
          setToast({ message: "Student profile deleted successfully.", type: "success" });
        } catch (err: any) {
          setToast({ message: err.message || "Failed to delete student profile.", type: "error" });
        }
      },
    });
  };

  const filteredCustomers = customers.filter(c => {
    const query = searchQuery.toLowerCase();
    const matchesEmail = c.email.toLowerCase().includes(query);
    const matchesProfileNames = c.profiles.some(p => 
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(query)
    );
    const matchesStudents = c.students.some(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query)
    );
    return matchesEmail || matchesProfileNames || matchesStudents;
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1 sm:mb-2 flex items-center gap-3">
            <Users className="w-7 h-7 sm:w-8 sm:h-8 text-[#7c5cfc]" />
            Parents Section
          </h1>
          <p className="text-white/45 text-xs sm:text-sm max-w-xl">
            Provision shared parent credentials, configure up to 2 profiles per parent ID, and link independent student portals.
          </p>
        </div>
        {role === "ADMIN" && (
          <button
            onClick={() => setParentModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
              bg-[#7c5cfc] hover:bg-[#6d4ef0] text-white text-xs font-bold transition-all shadow-lg active:scale-95
              w-full sm:w-auto shrink-0 whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>NEW PARENT ACCOUNT</span>
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-white/20" />
          <input
            type="text"
            placeholder="Search by parent/student name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#161b27] border border-white/[0.07] rounded-xl pl-10 pr-4 py-2.5
              text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#7c5cfc] transition-all"
          />
        </div>
      </div>

      {/* Customers List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#7c5cfc]" />
          <p className="text-white/40 text-sm mt-3">Loading database records...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-20 bg-[#161b27] border border-white/[0.07] rounded-2xl">
          <Users className="w-10 h-10 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 font-medium">No parent accounts found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredCustomers.map(customer => {
            const isExpanded = !!expandedAccounts[customer.id];
            const p1 = customer.profiles[0];
            const p2 = customer.profiles[1];
            const nameDisplay = p1 ? `${p1.firstName} ${p1.lastName}` : "Customer";
            const secondaryDisplay = p2 ? ` & ${p2.firstName} ${p2.lastName}` : "";

            return (
              <div 
                key={customer.id} 
                className="bg-[#161b27] border border-white/[0.07] rounded-2xl overflow-hidden transition-all shadow-md hover:border-white/[0.12]"
              >
                {/* Master Account Row */}
                <div 
                  onClick={() => toggleExpand(customer.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.01]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7c5cfc]/20 to-[#00d4aa]/25
                      flex items-center justify-center text-white text-xs font-bold border border-[#7c5cfc]/20 shrink-0">
                      <Shield className="w-5 h-5 text-[#7c5cfc]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        {nameDisplay}{secondaryDisplay}
                        <span className="text-[10px] bg-[#7c5cfc]/10 text-[#a78bfa] border border-[#7c5cfc]/20 px-2 py-0.5 rounded-full font-semibold">
                          Parent Account
                        </span>
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/40 mt-1">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" />
                          {customer.email}
                        </span>
                        {customer.programId && (
                          <span className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-400 font-bold px-2 py-0.5 rounded-full">
                            <BookOpen className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                            {programs.find(p => p.id === customer.programId)?.title || "Program Subscribed"}
                          </span>
                        )}
                        {role === "ADMIN" && (
                          <span className="flex items-center gap-1.5">
                               <button
                                 type="button"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setEditParentAccountTarget({ id: customer.id, email: customer.email, programId: customer.programId });
                                   setParentAccountEmail(customer.email);
                                   setParentAccountProgramId(customer.programId || "");
                                   setEditParentAccountOpen(true);
                                 }}
                                 className="p-1 rounded bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white hover:bg-[#7c5cfc]/20 hover:border-[#7c5cfc]/30 transition-all"
                                 title="Edit Parent Email"
                               >
                                 <Edit2 className="w-3 h-3" />
                               </button>
                               <button
                                 type="button"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setResetTarget({ type: 'parent', id: customer.id, email: customer.email });
                                   setResetModalOpen(true);
                                 }}
                                 className="p-1 rounded bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white hover:bg-[#7c5cfc]/20 hover:border-[#7c5cfc]/30 transition-all"
                                 title="Reset Parent Password"
                               >
                                 <Key className="w-3 h-3" />
                               </button>
                             </span>
                           )}
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          Registered {new Date(customer.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-auto" onClick={e => e.stopPropagation()}>
                    {role === "ADMIN" && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedParentId(customer.id);
                            setStudentModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-[#00d4aa]/20 bg-[#00d4aa]/10 hover:bg-[#00d4aa]/20 text-[#00d4aa] text-[10px] font-bold transition-all"
                        >
                          ADD STUDENT
                        </button>
                        <button
                          onClick={() => handleDeleteParent(customer.id)}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all border border-red-500/10"
                          title="Delete Customer Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => toggleExpand(customer.id)}
                      className="p-2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Sub profiles details drawer */}
                {isExpanded && (
                  <div className="bg-white/[0.01] border-t border-white/[0.05] p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Profiles Section */}
                    <div>
                      <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-3">
                        Parent Profile Connections ({customer.profiles.length} of 2 max)
                      </h4>
                      <div className="flex flex-col gap-3">
                        {customer.profiles.map(p => (
                          <div key={p.id} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3.5 flex items-start justify-between">
                            <div>
                              <p className="text-xs font-semibold text-white">
                                {p.firstName} {p.lastName}
                                <span className="text-[10px] ml-2 text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                                  {p.relationship || "Guardian"}
                                </span>
                              </p>
                              {p.phone && (
                                <p className="text-[11px] text-white/40 flex items-center gap-1.5 mt-1.5">
                                  <Phone className="w-3.5 h-3.5 text-white/20" />
                                  {p.phone}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                               {role === "ADMIN" && (
                                 <button
                                   type="button"
                                   onClick={() => {
                                     setEditProfileTarget({
                                       id: p.id,
                                       firstName: p.firstName,
                                       lastName: p.lastName,
                                       phone: p.phone || "",
                                       relationship: p.relationship || "Mother"
                                     });
                                     setProfileEditForm({
                                       firstName: p.firstName,
                                       lastName: p.lastName,
                                       phone: p.phone || "",
                                       relationship: p.relationship || "Mother"
                                     });
                                     setEditProfileOpen(true);
                                   }}
                                   className="p-1 rounded bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.08] transition-all"
                                   title="Edit Profile Details"
                                 >
                                   <Edit2 className="w-3.5 h-3.5" />
                                 </button>
                               )}
                               <UserCheck2 className="w-4 h-4 text-white/20" />
                             </div>
                          </div>
                        ))}
                        {customer.profiles.length === 0 && (
                          <p className="text-xs text-white/30 italic">No parent profile fields set.</p>
                        )}
                        {role === "ADMIN" && customer.profiles.length < 2 && (
                          <button
                            onClick={() => {
                              setAddProfileParentId(customer.id);
                              setAddProfileModalOpen(true);
                            }}
                            className="mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-[#7c5cfc]/30 hover:border-[#7c5cfc]/60 text-white/60 hover:text-white bg-[#7c5cfc]/5 hover:bg-[#7c5cfc]/10 text-xs font-bold transition-all"
                          >
                            <Plus className="w-3.5 h-3.5 text-[#7c5cfc]" />
                            ADD SECOND PROFILE
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Linked Students List */}
                    <div>
                      <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-3">
                        Associated Student Logins ({customer.students.length})
                      </h4>
                      <div className="flex flex-col gap-3">
                        {customer.students.map(s => (
                          <div key={s.id} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-[#7c5cfc]/10 flex items-center justify-center text-[10px] font-bold text-[#a78bfa] border border-[#7c5cfc]/20">
                                {s.firstName[0] || ""}{s.lastName[0] || ""}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-white">{s.firstName} {s.lastName}</p>
                                <p className="text-[10px] text-white/35 flex items-center gap-1.5 mt-0.5">
                                  <Mail className="w-3 h-3 text-white/20" />
                                  {s.email}
                                </p>
                                {/* Schedule badge for this student */}
                                {(() => {
                                  const studentSchedules = schedules.filter(sc => sc.studentId === s.id);
                                  const upcoming = studentSchedules.filter(sc => sc.status === "SCHEDULED" && new Date(sc.startTime) >= new Date());
                                  const completed = studentSchedules.filter(sc => sc.status === "COMPLETED").length;
                                  if (studentSchedules.length === 0) return (
                                    <span className="text-[9px] text-white/20 italic mt-0.5 flex items-center gap-1">
                                      <XCircle className="w-2.5 h-2.5" /> No classes scheduled
                                    </span>
                                  );
                                  const next = upcoming.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
                                  return (
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                      {next && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[8px] text-blue-400 font-bold">
                                          <Clock className="w-2 h-2" />
                                          {new Date(next.startTime).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
                                          {" · "}{next.mentor.firstName} {next.mentor.lastName}
                                        </span>
                                      )}
                                      <span className="text-[9px] text-white/30 flex items-center gap-1">
                                        <BookOpen className="w-2.5 h-2.5" />{studentSchedules.length} class{studentSchedules.length > 1 ? "es" : ""}
                                      </span>
                                      {completed > 0 && (
                                        <span className="text-[9px] text-emerald-400/70 flex items-center gap-1">
                                          <CheckCircle2 className="w-2.5 h-2.5" />{completed} done
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                             {role === "ADMIN" && (
                               <div className="flex items-center gap-1">
                                 <button
                                   onClick={() => {
                                     setEditStudentTarget({
                                       id: s.id,
                                       firstName: s.firstName,
                                       lastName: s.lastName,
                                       email: s.email
                                     });
                                     setStudentEditForm({
                                       firstName: s.firstName,
                                       lastName: s.lastName,
                                       email: s.email
                                     });
                                     setEditStudentOpen(true);
                                   }}
                                   className="p-1.5 text-white/25 hover:text-white hover:bg-white/[0.08] rounded transition-colors"
                                   title="Edit Student Details"
                                 >
                                   <Edit2 className="w-3.5 h-3.5" />
                                 </button>
                                 <button
                                   onClick={() => {
                                     setResetTarget({ type: 'student', id: s.id, email: s.email });
                                     setResetModalOpen(true);
                                   }}
                                   className="p-1.5 text-white/25 hover:text-white hover:bg-[#7c5cfc]/20 rounded transition-colors"
                                   title="Reset Student Password"
                                 >
                                   <Key className="w-3.5 h-3.5" />
                                 </button>
                                 <button
                                   onClick={() => handleDeleteStudent(s.id)}
                                   className="p-1.5 text-white/25 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                   title="Delete Student Profile"
                                 >
                                   <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                               </div>
                             )}
                           </div>
                        ))}
                        {customer.students.length === 0 && (
                          <p className="text-xs text-white/30 italic">No students linked to this parent ID yet. Click "Add Student" to create one.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE PARENT ACCOUNT MODAL */}
      {parentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0e131f] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#7c5cfc]" />
                Create Parent Login & Profiles
              </h3>
              <button 
                onClick={() => setParentModalOpen(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateParent} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Login details */}
              <div>
                <h4 className="text-[10px] font-bold text-[#7c5cfc] uppercase tracking-wider mb-2.5">Shared Account Credentials</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Login Email</label>
                    <input
                      type="email"
                      required
                      value={parentForm.email}
                      onChange={e => setParentForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                        text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#7c5cfc]"
                      placeholder="parents@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Login Password</label>
                    <input
                      type="password"
                      required
                      value={parentForm.password}
                      onChange={e => setParentForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                        text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#7c5cfc]"
                      placeholder="At least 8 chars"
                    />
                  </div>
                </div>
              </div>

              {/* Assigned Program selection */}
              <div className="pt-2 border-t border-white/[0.04]">
                <h4 className="text-[10px] font-bold text-[#7c5cfc] uppercase tracking-wider mb-2.5">Program Subscription (Optional)</h4>
                <div>
                  <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Select Program</label>
                  <select
                    value={parentForm.programId}
                    onChange={e => setParentForm(prev => ({ ...prev, programId: e.target.value }))}
                    className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3 py-2
                      text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                  >
                    <option value="">No Program Assigned</option>
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Parent 1 profile */}
              <div className="pt-2 border-t border-white/[0.04]">
                <h4 className="text-[10px] font-bold text-[#00d4aa] uppercase tracking-wider mb-2.5">Parent 1 (Primary Connection)</h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">First Name</label>
                    <input
                      type="text"
                      required
                      value={parentForm.p1FirstName}
                      onChange={e => setParentForm(prev => ({ ...prev, p1FirstName: e.target.value }))}
                      className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                        text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Last Name</label>
                    <input
                      type="text"
                      required
                      value={parentForm.p1LastName}
                      onChange={e => setParentForm(prev => ({ ...prev, p1LastName: e.target.value }))}
                      className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                        text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      value={parentForm.p1Phone}
                      onChange={e => setParentForm(prev => ({ ...prev, p1Phone: e.target.value }))}
                      className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                        text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Relationship</label>
                    <select
                      value={parentForm.p1Relationship}
                      onChange={e => setParentForm(prev => ({ ...prev, p1Relationship: e.target.value }))}
                      className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3 py-2
                        text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                    >
                      <option value="Mother">Mother</option>
                      <option value="Father">Father</option>
                      <option value="Guardian">Guardian</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Toggle parent 2 */}
              <div className="pt-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasP2Checkbox"
                  checked={parentForm.hasP2}
                  onChange={e => setParentForm(prev => ({ ...prev, hasP2: e.target.checked }))}
                  className="rounded border-white/[0.08] bg-[#161b27] text-[#7c5cfc] focus:ring-0 focus:ring-offset-0"
                />
                <label htmlFor="hasP2Checkbox" className="text-[11px] text-white/70 select-none cursor-pointer">
                  Add Second Parent Profile (e.g. Father, Spouse)
                </label>
              </div>

              {/* Parent 2 profile */}
              {parentForm.hasP2 && (
                <div className="pt-3 border-t border-white/[0.04] animate-fadeIn">
                  <h4 className="text-[10px] font-bold text-[#00d4aa] uppercase tracking-wider mb-2.5">Parent 2 (Secondary Connection)</h4>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">First Name</label>
                      <input
                        type="text"
                        required
                        value={parentForm.p2FirstName}
                        onChange={e => setParentForm(prev => ({ ...prev, p2FirstName: e.target.value }))}
                        className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                          text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Last Name</label>
                      <input
                        type="text"
                        required
                        value={parentForm.p2LastName}
                        onChange={e => setParentForm(prev => ({ ...prev, p2LastName: e.target.value }))}
                        className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                          text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Phone Number</label>
                      <input
                        type="text"
                        value={parentForm.p2Phone}
                        onChange={e => setParentForm(prev => ({ ...prev, p2Phone: e.target.value }))}
                        className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                          text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Relationship</label>
                      <select
                        value={parentForm.p2Relationship}
                        onChange={e => setParentForm(prev => ({ ...prev, p2Relationship: e.target.value }))}
                        className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3 py-2
                          text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                      >
                        <option value="Mother">Mother</option>
                        <option value="Father">Father</option>
                        <option value="Guardian">Guardian</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setParentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/[0.08] hover:bg-white/[0.02] text-xs text-white/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingParent}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#7c5cfc] hover:bg-[#6d4ef0] text-xs font-bold text-white transition-colors"
                >
                  {submittingParent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  CREATE ACCOUNT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE STUDENT PORTAL MODAL */}
      {studentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#0e131f] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#00d4aa]" />
                Link Independent Student Profile
              </h3>
              <button 
                onClick={() => {
                  setStudentModalOpen(false);
                  setSelectedParentId(null);
                }}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">First Name</label>
                  <input
                    type="text"
                    required
                    value={studentForm.firstName}
                    onChange={e => setStudentForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                      text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                    placeholder="Student's first name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Last Name</label>
                  <input
                    type="text"
                    required
                    value={studentForm.lastName}
                    onChange={e => setStudentForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                      text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                    placeholder="Student's last name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Student Login Email</label>
                <input
                  type="email"
                  required
                  value={studentForm.email}
                  onChange={e => setStudentForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                    text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                  placeholder="student@example.com"
                />
              </div>

              <div>
                <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Student Password</label>
                <input
                  type="password"
                  required
                  value={studentForm.password}
                  onChange={e => setStudentForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                    text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                  placeholder="Password for student portal login"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    setStudentModalOpen(false);
                    setSelectedParentId(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-white/[0.08] hover:bg-white/[0.02] text-xs text-white/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStudent}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#00d4aa] hover:bg-[#02be99] text-xs font-bold text-white transition-colors"
                >
                  {submittingStudent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  PROVISION STUDENT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD PARENT PROFILE MODAL ────────────────────────────────── */}
      {addProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#7c5cfc]" />
                Add Parent Profile Connection
              </h3>
              <button
                type="button"
                onClick={() => {
                  setAddProfileModalOpen(false);
                  setAddProfileParentId(null);
                }}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProfile} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">First Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.firstName}
                    onChange={e => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                      text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                    placeholder="Parent's first name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Last Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.lastName}
                    onChange={e => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                      text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                    placeholder="Parent's last name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={e => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                    text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Relationship to Learner</label>
                <select
                  value={profileForm.relationship}
                  onChange={e => setProfileForm(prev => ({ ...prev, relationship: e.target.value }))}
                  className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                    text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                >
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    setAddProfileModalOpen(false);
                    setAddProfileParentId(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-white/[0.08] hover:bg-white/[0.02] text-xs text-white/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProfile}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#7c5cfc] hover:bg-[#6d4ef0] text-xs font-bold text-white transition-colors"
                >
                  {submittingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  ADD PROFILE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MANUALLY CREATED CREDENTIALS SUCCESS MODAL ────────────────── */}
      {createdCredentials && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-[#161b27] border border-green-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl glow-green">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <h3 className="text-base font-bold text-white">
                {createdCredentials.type === 'parent' ? 'Parent Account Created' : 'Student Login Created'}
              </h3>
            </div>
            <p className="text-white/45 text-xs mb-5 leading-relaxed">
              {createdCredentials.type === 'parent' 
                ? 'The parent account credentials have been configured successfully. Copy these credentials for parent portal access:'
                : `A student login has been configured for ${createdCredentials.studentName}. Copy these credentials for student access:`}
            </p>

            <div className="space-y-4">
              <div className="bg-[#13161e] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider block mb-0.5">Email / Username</span>
                  <span className="text-xs text-white/85 font-mono select-all truncate">{createdCredentials.email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCredentials(createdCredentials.email, 'email')}
                  className="p-2 rounded bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.08] transition-all shrink-0"
                  title="Copy email"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="bg-[#13161e] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider block mb-0.5">Temporary Password</span>
                  <span className="text-xs text-white/85 font-mono select-all truncate">{createdCredentials.password}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCredentials(createdCredentials.password, 'pass')}
                  className="p-2 rounded bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.08] transition-all shrink-0"
                  title="Copy password"
                >
                  {copiedPassword ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-white/[0.06] flex justify-end">
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-semibold transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT PARENT ACCOUNT EMAIL MODAL ───────────────────────────── */}
      {editParentAccountOpen && editParentAccountTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#7c5cfc]" />
                Edit Parent Account details
              </h3>
              <button 
                onClick={() => {
                  setEditParentAccountOpen(false);
                  setEditParentAccountTarget(null);
                }}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateParentAccount} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Login Email (Username)</label>
                <input
                  type="email"
                  required
                  value={parentAccountEmail}
                  onChange={e => setParentAccountEmail(e.target.value)}
                  className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                    text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                  placeholder="parent@example.com"
                />
              </div>

              <div>
                <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Assigned Program</label>
                <select
                  value={parentAccountProgramId}
                  onChange={e => setParentAccountProgramId(e.target.value)}
                  className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3 py-2
                    text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                >
                  <option value="">No Program Assigned</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    setEditParentAccountOpen(false);
                    setEditParentAccountTarget(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-white/[0.08] hover:bg-white/[0.02] text-xs text-white/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEditParentAccount}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#7c5cfc] hover:bg-[#6d4ef0] text-xs font-bold text-white transition-colors"
                >
                  {submittingEditParentAccount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  SAVE CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT PARENT PROFILE MODAL ────────────────────────────────── */}
      {editProfileOpen && editProfileTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#7c5cfc]" />
                Edit Parent Profile
              </h3>
              <button 
                onClick={() => {
                  setEditProfileOpen(false);
                  setEditProfileTarget(null);
                }}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateParentProfile} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">First Name</label>
                  <input
                    type="text"
                    required
                    value={profileEditForm.firstName}
                    onChange={e => setProfileEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                      text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Last Name</label>
                  <input
                    type="text"
                    required
                    value={profileEditForm.lastName}
                    onChange={e => setProfileEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                      text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={profileEditForm.phone}
                  onChange={e => setProfileEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                    text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Relationship</label>
                <select
                  value={profileEditForm.relationship}
                  onChange={e => setProfileEditForm(prev => ({ ...prev, relationship: e.target.value }))}
                  className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                    text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                >
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    setEditProfileOpen(false);
                    setEditProfileTarget(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-white/[0.08] hover:bg-white/[0.02] text-xs text-white/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEditProfile}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#7c5cfc] hover:bg-[#6d4ef0] text-xs font-bold text-white transition-colors"
                >
                  {submittingEditProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  SAVE CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT STUDENT DETAILS MODAL ───────────────────────────────── */}
      {editStudentOpen && editStudentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#00d4aa]" />
                Edit Student Details
              </h3>
              <button 
                onClick={() => {
                  setEditStudentOpen(false);
                  setEditStudentTarget(null);
                }}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">First Name</label>
                  <input
                    type="text"
                    required
                    value={studentEditForm.firstName}
                    onChange={e => setStudentEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                      text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Last Name</label>
                  <input
                    type="text"
                    required
                    value={studentEditForm.lastName}
                    onChange={e => setStudentEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                      text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">Login Email</label>
                <input
                  type="email"
                  required
                  value={studentEditForm.email}
                  onChange={e => setStudentEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                    text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    setEditStudentOpen(false);
                    setEditStudentTarget(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-white/[0.08] hover:bg-white/[0.02] text-xs text-white/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEditStudent}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#00d4aa] hover:bg-[#02be99] text-xs font-bold text-white transition-colors"
                >
                  {submittingEditStudent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  SAVE CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RESET PASSWORD MODAL ─────────────────────────────────────── */}
      {resetModalOpen && resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#161b27] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-yellow-400" />
                Reset Password
              </h3>
              <button 
                onClick={() => {
                  setResetModalOpen(false);
                  setResetTarget(null);
                }}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                <p className="text-[11px] text-yellow-300 leading-relaxed font-medium">
                  This will change the login password for account: <strong>{resetTarget.email}</strong>.
                </p>
              </div>

              <div>
                <label className="block text-[10px] text-white/40 uppercase font-bold mb-1.5">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl px-3.5 py-2
                    text-xs text-white focus:outline-none focus:border-[#7c5cfc]"
                  placeholder="Enter new portal password"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    setResetModalOpen(false);
                    setResetTarget(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-white/[0.08] hover:bg-white/[0.02] text-xs text-white/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReset}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-xs font-bold text-white transition-colors"
                >
                  {submittingReset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                  RESET PASSWORD
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
