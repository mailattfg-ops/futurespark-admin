"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const contentType = response.headers.get("content-type");
      let resData: any = null;
      if (contentType && contentType.includes("application/json")) {
        resData = await response.json();
      }

      if (!response.ok || !resData?.success) {
        throw new Error(resData?.message || `Server error (${response.status})`);
      }

      // Save user session in localStorage
      localStorage.setItem("user", JSON.stringify(resData.data.user));
      localStorage.setItem("tokens", JSON.stringify(resData.data.tokens));

      // Check for First-Time Login (FTL) flag
      if (resData.data.user.requiresFtlReset) {
        router.push("/ftl");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen dot-grid flex items-center justify-center p-4">
      {/* Glow orbs */}
      <div className="fixed top-1/4 left-1/3 w-96 h-96 rounded-full bg-[#7c5cfc]/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/3 w-64 h-64 rounded-full bg-[#00d4aa]/8 blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-[#161b27] border border-white/[0.08] rounded-2xl p-8 shadow-2xl shadow-black/50">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl
              bg-[#7c5cfc]/20 ring-1 ring-[#7c5cfc]/40 mb-4 glow-purple">
              <Zap className="w-6 h-6 text-[#7c5cfc]" />
            </div>
            <h1 className="text-xl font-bold text-white">FutureSpark Admin</h1>
            <p className="text-white/35 text-sm mt-1">Sign in to your dashboard</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl p-3 mb-4 text-[#ef4444] text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@futurespark.com"
                disabled={loading}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl
                  px-4 py-2.5 text-sm text-white placeholder:text-white/20
                  focus:outline-none focus:border-[#7c5cfc]/60 focus:bg-white/[0.07]
                  disabled:opacity-50 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl
                  px-4 py-2.5 text-sm text-white placeholder:text-white/20
                  focus:outline-none focus:border-[#7c5cfc]/60 focus:bg-white/[0.07]
                  disabled:opacity-50 transition-all duration-200"
              />
            </div>

            <div className="flex items-center justify-between mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 rounded accent-[#7c5cfc]" />
                <span className="text-xs text-white/40">Remember me</span>
              </label>
              <Link href="#" className="text-xs text-[#7c5cfc] hover:text-[#a78bfa] transition-colors">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#7c5cfc] hover:bg-[#6d4ef0]
                text-white text-sm font-semibold mt-2 glow-purple flex items-center justify-center gap-2
                transition-all duration-200 active:scale-[0.98] disabled:opacity-55"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[11px] text-white/20">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <p className="text-center text-[11px] text-white/25">
            Contact your{" "}
            <Link href="#" className="text-[#7c5cfc] hover:text-[#a78bfa] transition-colors">
              system administrator
            </Link>{" "}
            to request access.
          </p>
        </div>

        <p className="text-center text-[10px] text-white/15 mt-5">
          FutureSpark © 2025 · Admin Portal v1.0
        </p>
      </div>
    </div>
  );
}
