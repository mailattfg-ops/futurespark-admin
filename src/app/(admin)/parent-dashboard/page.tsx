"use client";

import { useEffect, useState } from "react";
import { Users, GraduationCap, Phone, UserCheck, ShieldCheck, Mail, Calendar, Compass, Clock, Loader2, AlertCircle } from "lucide-react";

interface ParentProfile {
  id: string;
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
  isActive: boolean;
  createdAt: string;
}

interface ParentAccount {
  id: string;
  email: string;
  profiles: ParentProfile[];
  students: Student[];
}

export default function ParentDashboard() {
  const [parentData, setParentData] = useState<ParentAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchParentData = async () => {
      try {
        const userStr = localStorage.getItem("user");
        const tokensStr = localStorage.getItem("tokens");
        if (!userStr || !tokensStr) {
          throw new Error("No user credentials found. Please log in again.");
        }

        const user = JSON.parse(userStr);
        const accessToken = JSON.parse(tokensStr).accessToken;

        const res = await fetch(`/api/users/customers/${user.id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load parent dashboard data.");
        }

        setParentData(data.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchParentData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 w-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#7c5cfc] mb-3" />
        <p className="text-white/40 text-sm">Loading Parent Dashboard...</p>
      </div>
    );
  }

  if (error || !parentData) {
    return (
      <div className="p-8 w-full">
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error || "An error occurred while loading your profile dashboard."}</span>
        </div>
      </div>
    );
  }

  const primaryProfile = parentData.profiles[0];
  const secondaryProfile = parentData.profiles[1];
  const greetingName = primaryProfile
    ? `${primaryProfile.firstName} ${primaryProfile.lastName}`
    : "Parent";

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#7c5cfc]/15 to-indigo-500/10 border border-white/[0.08] rounded-3xl p-8 mb-8 shadow-2xl">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#7c5cfc]/10 text-[#7c5cfc] text-[10px] font-bold uppercase tracking-wider mb-3 border border-[#7c5cfc]/20">
            <Users className="w-3.5 h-3.5" /> Parent Hub
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {greetingName}
          </h1>
          <p className="text-white/45 text-sm mt-1">Logged in with: {parentData.email}</p>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Profiles Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Linked Children / Students */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#7c5cfc]" />
              Enrolled Children / Students
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parentData.students.map((student) => (
                <div key={student.id} className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-white">
                        {student.firstName} {student.lastName}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border
                        ${student.isActive 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                          : "bg-red-500/10 border-red-500/20 text-red-400"
                        }`}>
                        {student.isActive ? "Active" : "Suspended"}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-white/45">
                      <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-white/20" /> {student.email}</p>
                      <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-white/20" /> Enrolled: {new Date(student.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-white/30">
                    <span>Role: Student Portal Login</span>
                    <span className="text-[#7c5cfc] font-semibold">Active Profile</span>
                  </div>
                </div>
              ))}
              {parentData.students.length === 0 && (
                <div className="col-span-2 text-center py-12 bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl">
                  <GraduationCap className="w-10 h-10 text-white/10 mx-auto mb-2" />
                  <p className="text-white/40 text-xs font-semibold">No student profiles created yet.</p>
                  <p className="text-white/20 text-[10px] mt-0.5">Please contact the admin to link student accounts.</p>
                </div>
              )}
            </div>
          </div>

          {/* Connected Parent Profiles */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#00d4aa]" />
              Connected Parent Profiles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Parent Card */}
              {primaryProfile && (
                <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#00d4aa] bg-[#00d4aa]/10 border border-[#00d4aa]/20 px-2 py-0.5 rounded-full">
                      Primary Contact
                    </span>
                    <span className="text-xs text-white/35 font-medium">{primaryProfile.relationship || "Parent"}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {primaryProfile.firstName} {primaryProfile.lastName}
                    </h3>
                    <p className="text-xs text-white/45 mt-2 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-white/20" /> {primaryProfile.phone || "No phone added"}
                    </p>
                  </div>
                </div>
              )}

              {/* Secondary Parent Card */}
              {secondaryProfile ? (
                <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded-full">
                      Secondary Contact
                    </span>
                    <span className="text-xs text-white/35 font-medium">{secondaryProfile.relationship || "Parent"}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {secondaryProfile.firstName} {secondaryProfile.lastName}
                    </h3>
                    <p className="text-xs text-white/45 mt-2 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-white/20" /> {secondaryProfile.phone || "No phone added"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-5 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] text-center">
                  <Users className="w-6 h-6 text-white/10 mb-1" />
                  <p className="text-white/40 text-[11px] font-semibold">No second parent profile linked.</p>
                  <p className="text-white/20 text-[9px] mt-0.5">Admin can append secondary profile connections.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Sidebar Info Column */}
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="bg-[#161b27]/80 border border-white/[0.07] rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-white/45 uppercase tracking-wider">Account Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 text-center">
                <span className="block text-[10px] text-white/30 font-medium">Students</span>
                <span className="text-2xl font-bold text-white">{parentData.students.length}</span>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 text-center">
                <span className="block text-[10px] text-white/30 font-medium">Profiles</span>
                <span className="text-2xl font-bold text-[#00d4aa]">{parentData.profiles.length}</span>
              </div>
            </div>
            
            <div className="pt-2 border-t border-white/[0.05] space-y-3 text-xs">
              <div className="flex items-center justify-between text-white/45">
                <span>Account Status:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              </div>
              <div className="flex items-center justify-between text-white/45">
                <span>Total Billing:</span>
                <span className="text-white font-mono">Mock Payment Plan</span>
              </div>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="bg-gradient-to-br from-indigo-500/10 to-[#7c5cfc]/5 border border-[#7c5cfc]/20 rounded-2xl p-6 shadow-xl">
            <h3 className="text-xs font-bold text-[#a78bfa] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> System Update
            </h3>
            <p className="text-[11px] text-white/50 leading-relaxed">
              Parents share a single secure master credential set. Individual student logins can be used separately by your children to perform learning activities. For account adjustments, profile updates, or student password resets, please contact support.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
