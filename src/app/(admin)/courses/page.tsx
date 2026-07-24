"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Users, TrendingUp, Plus, Loader2, AlertCircle } from "lucide-react";
import { Toast } from "@/components/ui/toast";

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

interface PaymentPlan {
  id: string;
  type: string;
  price: number;
  description: string | null;
}

interface Program {
  id: string;
  title: string;
  description: string | null;
  level: string;
  levelColor: string;
  image: string | null;
  sessions: Session[];
  paymentPlans: PaymentPlan[];
}

const levelStyles: Record<string, string> = {
  "Expert Level": "bg-amber-500/20  text-amber-400  border-amber-500/30",
  "Intermediate": "bg-teal-500/20   text-teal-400   border-teal-500/30",
  "Beginner": "bg-[#7c5cfc]/20  text-[#a78bfa]  border-[#7c5cfc]/30",
};

// ── Components ────────────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: string }) {
  const color = level === "Expert Level" ? "amber" : level === "Intermediate" ? "teal" : "purple";
  return (
    <span className={`
      inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold
      uppercase tracking-wider border ${levelStyles[level] || levelStyles["Beginner"]}
    `}>
      {level}
    </span>
  );
}

function CourseCard({
  course,
  role,
  parentAccount,
  subscribingId,
  onSubscribe,
}: {
  course: Program;
  role: string | null;
  parentAccount: any;
  subscribingId: string | null;
  onSubscribe: (courseId: string) => void;
}) {
  // Count total students mapping from static offsets based on ID for realism
  const studentOffset = course.title.charCodeAt(0) * 8 + 100;

  return (
    <div className="group relative flex flex-col bg-[#161b27] border border-white/[0.07]
      rounded-2xl overflow-hidden hover:border-white/[0.14] hover:shadow-xl
      hover:shadow-black/40 transition-all duration-300">

      {/* Thumbnail */}
      <div className="relative h-48 overflow-hidden bg-white/[0.02]">
        {course.image ? (
          <Image
            src={course.image}
            alt={course.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#7c5cfc]/10 to-[#00d4aa]/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#161b27] via-transparent to-transparent" />
        <div className="absolute top-3 left-3">
          <LevelBadge level={course.level} />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2">
          {course.title}
        </h3>

        {/* Info */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#7c5cfc] to-[#00d4aa]
            flex items-center justify-center text-[8px] font-bold text-white shrink-0">
            FS
          </div>
          <span className="text-[11px] text-white/40 uppercase tracking-wide truncate">
            {course.paymentPlans.length} plans · {course.sessions.length} Sessions
          </span>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between mt-auto pt-2 border-t border-white/[0.05] gap-2">
          <div className="flex items-center gap-1.5 text-white/35">
            <Users className="w-3.5 h-3.5" />
            <span className="text-[11px]">{studentOffset.toLocaleString()} students</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {role === "PARENT" && parentAccount && (
              parentAccount.programId === course.id ? (
                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold uppercase tracking-wider">
                  SUBSCRIBED
                </span>
              ) : (
                <button
                  onClick={() => onSubscribe(course.id)}
                  disabled={subscribingId !== null}
                  className="px-2 py-0.5 bg-[#7c5cfc]/10 hover:bg-[#7c5cfc]/20 text-[#a78bfa] hover:text-white border border-[#7c5cfc]/20 hover:border-[#7c5cfc]/40 rounded text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {subscribingId === course.id ? "Subscribing..." : "SUBSCRIBE"}
                </button>
              )
            )}
            <Link
              href={`/courses/${course.id}`}
              className="px-3 py-1 rounded border border-white/[0.15] text-white/60
                text-[11px] font-medium hover:border-[#7c5cfc]/60 hover:text-[#a78bfa]
                hover:bg-[#7c5cfc]/10 transition-all duration-200"
            >
              EXPLORE
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CoursesPage() {
  const [courses, setCourses] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [parentAccount, setParentAccount] = useState<any>(null);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const u = JSON.parse(userStr);
      setRole(u.role);
      if (u.role === "PARENT") {
        const tokensStr = localStorage.getItem("tokens");
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (tokensStr) headers["Authorization"] = `Bearer ${JSON.parse(tokensStr).accessToken}`;
        fetch(`/api/users/customers/${u.id}`, { headers })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setParentAccount(data.data);
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  const handleSubscribe = async (courseId: string) => {
    if (!parentAccount) return;
    setSubscribingId(courseId);
    try {
      const tokensStr = localStorage.getItem("tokens");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (tokensStr) headers["Authorization"] = `Bearer ${JSON.parse(tokensStr).accessToken}`;
      
      const res = await fetch(`/api/users/customers/${parentAccount.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ programId: courseId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to subscribe");
      
      setParentAccount((prev: any) => prev ? { ...prev, programId: courseId } : null);
      setToast({ message: "Program subscription updated successfully.", type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to update subscription.", type: "error" });
    } finally {
      setSubscribingId(null);
    }
  };

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const tokensStr = localStorage.getItem("tokens");
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (tokensStr) {
          const tokens = JSON.parse(tokensStr);
          headers["Authorization"] = `Bearer ${tokens.accessToken}`;
        }

        const response = await fetch("/api/courses", { headers });

        if (response.status === 401) {
          localStorage.removeItem("user");
          localStorage.removeItem("tokens");
          setLoading(false);
          router.push("/login");
          return;
        }

        const resData = await response.json();

        if (!response.ok || !resData.success) {
          throw new Error(resData.message || "Failed to load courses");
        }

        setCourses(resData.data);
      } catch (err: any) {
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1 sm:mb-2">
            Course Catalog
          </h1>
          <p className="text-white/45 text-xs sm:text-sm max-w-md">
            Curate and manage your curriculum with architectural precision.
            Control every aspect of the learning journey from a single point of truth.
          </p>
        </div>
        {role !== "PARENT" && (
          <Link
            href="/courses/new"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
              border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.07]
              text-white/70 hover:text-white text-xs sm:text-sm font-medium
              transition-all duration-200 group whitespace-nowrap w-full sm:w-auto shrink-0"
          >
            <span>ADD NEW PROGRAM</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">

        {/* Published Courses */}
        <div className="col-span-1 lg:col-span-2 bg-[#161b27] border border-white/[0.07] rounded-2xl p-4 sm:p-6">
          <p className="text-[11px] text-[#00d4aa] font-semibold uppercase tracking-widest mb-3">
            Active Ecosystem
          </p>
          <p className="text-2xl sm:text-4xl font-bold text-white mb-4 sm:mb-5">{courses.length} Published Programs</p>
          <div className="flex gap-6 sm:gap-8">
            <div>
              <p className="text-xl sm:text-2xl font-bold text-white">12.4k</p>
              <p className="text-[10px] sm:text-[11px] text-white/35 uppercase tracking-wider mt-0.5">Active Enrollments</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-white">94%</p>
              <p className="text-[10px] sm:text-[11px] text-white/35 uppercase tracking-wider mt-0.5">Completion Rate</p>
            </div>
          </div>
        </div>

        {/* Revenue Growth */}
        <div className="bg-gradient-to-br from-[#7c5cfc] to-[#4f3cad] rounded-2xl p-4 sm:p-6 relative overflow-hidden glow-purple">
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full
            bg-white/10 blur-2xl pointer-events-none" />
          <div className="relative">
            <TrendingUp className="w-6 h-6 text-white/80 mb-3" />
            <p className="text-xl sm:text-2xl font-bold text-white mb-2">Revenue Growth</p>
            <p className="text-xs sm:text-sm text-white/65">
              +18.5% compared to last semester. Technical tracks are seeing record demand.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl p-4 mb-8 text-[#ef4444] text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#7c5cfc]" />
          <p className="text-white/40 text-sm mt-3">Loading catalog...</p>
        </div>
      ) : (
        <>
          {/* Course Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {courses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                role={role}
                parentAccount={parentAccount}
                subscribingId={subscribingId}
                onSubscribe={handleSubscribe}
              />
            ))}
          </div>

          {/* Expand Catalog CTA */}
          {role !== "PARENT" && (
            <Link
              href="/courses/new"
              className="flex flex-col items-center justify-center py-12
                border border-dashed border-white/[0.08] rounded-2xl
                hover:border-white/[0.15] hover:bg-white/[0.02] transition-all duration-300 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full border border-white/[0.12] flex items-center justify-center
                mb-4 group-hover:border-[#7c5cfc]/50 group-hover:bg-[#7c5cfc]/10 transition-all">
                <Plus className="w-5 h-5 text-white/30 group-hover:text-[#7c5cfc] transition-colors" />
              </div>
              <p className="text-white/50 font-medium mb-1 group-hover:text-white/70 transition-colors">
                Expand the Catalog
              </p>
              <p className="text-white/25 text-sm text-center max-w-xs group-hover:text-white/40 transition-colors">
                Initiate a new course vertical or template to reach more developers.
              </p>
            </Link>
          )}
        </>
      )}

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
