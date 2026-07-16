"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";

export default function FtlPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/login");
      return;
    }
    const user = JSON.parse(userStr);
    if (!user.requiresFtlReset) {
      const roleDashboardMap: Record<string, string> = {
        ADMIN: "/courses",
        TEACHER: "/teacher-dashboard",
        QA_AUDITOR: "/qa-dashboard",
        SCHEDULER: "/scheduler-dashboard",
        WAREHOUSE_ADMIN: "/warehouse-dashboard",
        FINANCE_ADMIN: "/finance-dashboard",
        STUDENT: "/student-dashboard",
      };
      router.push(roleDashboardMap[user.role as string] || "/courses");
    }
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    try {
      const tokensStr = localStorage.getItem("tokens");
      if (!tokensStr) throw new Error("No authorization token found. Please log in again.");
      
      const tokens = JSON.parse(tokensStr);
      const response = await fetch("/api/auth/complete-ftl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${tokens.accessToken}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.message || "Failed to complete setup.");
      }

      setSuccess(true);

      // Save the updated session data
      localStorage.setItem("user", JSON.stringify(resData.data.user));
      localStorage.setItem("tokens", JSON.stringify(resData.data.tokens));

      // Redirect after a brief moment
      setTimeout(() => {
        const roleDashboardMap: Record<string, string> = {
          ADMIN: "/courses",
          TEACHER: "/teacher-dashboard",
          QA_AUDITOR: "/qa-dashboard",
          SCHEDULER: "/scheduler-dashboard",
          WAREHOUSE_ADMIN: "/warehouse-dashboard",
          FINANCE_ADMIN: "/finance-dashboard",
          STUDENT: "/student-dashboard",
        };
        const dest = roleDashboardMap[resData.data.user.role as string] || "/courses";
        router.push(dest);
      }, 1500);

    } catch (err: any) {
      setError(err.message || "Something went wrong. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen dot-grid flex items-center justify-center p-4">
      {/* Glow orbs */}
      <div className="fixed top-1/4 left-1/3 w-96 h-96 rounded-full bg-[#7c5cfc]/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/3 w-64 h-64 rounded-full bg-[#00d4aa]/8 blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-[#161b27] border border-white/[0.08] rounded-2xl p-8 shadow-2xl shadow-black/50">
          {/* Logo / Heading */}
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl
              bg-[#7c5cfc]/20 ring-1 ring-[#7c5cfc]/40 mb-4 glow-purple">
              <ShieldCheck className="w-6 h-6 text-[#7c5cfc]" />
            </div>
            <h1 className="text-xl font-bold text-white text-center">First-Time Security Setup</h1>
            <p className="text-white/35 text-xs text-center mt-1.5 max-w-xs">
              For security compliance, you are required to change your temporary password and complete your profile.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl p-3 mb-4 text-[#ef4444] text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 bg-[#00d4aa]/10 border border-[#00d4aa]/20 rounded-xl p-3 mb-4 text-[#00d4aa] text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Setup complete! Redirecting to dashboard...</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Temporary/Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading || success}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl
                  px-4 py-2.5 text-sm text-white placeholder:text-white/20
                  focus:outline-none focus:border-[#7c5cfc]/60 focus:bg-white/[0.07]
                  disabled:opacity-50 transition-all duration-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars"
                  disabled={loading || success}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl
                    px-4 py-2.5 text-sm text-white placeholder:text-white/20
                    focus:outline-none focus:border-[#7c5cfc]/60 focus:bg-white/[0.07]
                    disabled:opacity-50 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Min 8 chars"
                  disabled={loading || success}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl
                    px-4 py-2.5 text-sm text-white placeholder:text-white/20
                    focus:outline-none focus:border-[#7c5cfc]/60 focus:bg-white/[0.07]
                    disabled:opacity-50 transition-all duration-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="John"
                  disabled={loading || success}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl
                    px-4 py-2.5 text-sm text-white placeholder:text-white/20
                    focus:outline-none focus:border-[#7c5cfc]/60 focus:bg-white/[0.07]
                    disabled:opacity-50 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Doe"
                  disabled={loading || success}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl
                    px-4 py-2.5 text-sm text-white placeholder:text-white/20
                    focus:outline-none focus:border-[#7c5cfc]/60 focus:bg-white/[0.07]
                    disabled:opacity-50 transition-all duration-200"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-2.5 rounded-xl bg-[#7c5cfc] hover:bg-[#6d4ef0]
                text-white text-sm font-semibold mt-4 glow-purple flex items-center justify-center gap-2
                transition-all duration-200 active:scale-[0.98] disabled:opacity-55"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Setup...</span>
                </>
              ) : (
                <span>Complete Security Setup</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
