"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, Sparkles } from "lucide-react";

export default function NewProgramPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const getLevelColor = (selectedLevel: string) => {
    switch (selectedLevel) {
      case "Expert Level": return "amber";
      case "Intermediate": return "teal";
      default: return "purple";
    }
  };

  const getHeaders = () => {
    const tokensStr = localStorage.getItem("tokens");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tokensStr) {
      const tokens = JSON.parse(tokensStr);
      headers["Authorization"] = `Bearer ${tokens.accessToken}`;
    }
    return headers;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Map level to pre-generated tech thumbnails for visual premium feel
    const levelLower = level.toLowerCase();
    const thumbnail = levelLower.includes("expert")
      ? "/course-distributed.png"
      : levelLower.includes("inter")
      ? "/course-quantum.png"
      : "/course-neural.png";

    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          level,
          levelColor: getLevelColor(level),
          image: thumbnail,
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem("user");
        localStorage.removeItem("tokens");
        router.push("/login");
        return;
      }

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.message || "Failed to create program");
      }

      router.push(`/courses/${resData.data.id}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full max-w-[600px]">
      {/* Back link */}
      <Link
        href="/courses"
        className="inline-flex items-center gap-2 text-white/45 hover:text-white text-xs font-semibold mb-6 transition-all"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        BACK TO CATALOG
      </Link>

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1 sm:mb-2 flex items-center gap-2">
          Create New Program
          <Sparkles className="w-5 h-5 text-[#7c5cfc]" />
        </h1>
        <p className="text-white/45 text-xs sm:text-sm">
          Initiate a new structured learning vertical. Set the baseline metadata to populate curriculum parts.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl p-4 mb-6 text-[#ef4444] text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">Program Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Distributed Consensus at Scale"
            disabled={loading}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl
              px-4 py-2.5 text-sm text-white placeholder:text-white/20
              focus:outline-none focus:border-[#7c5cfc] focus:bg-white/[0.06]
              transition-all duration-200"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">Difficulty Level</label>
          <select
            value={level}
            onChange={e => setLevel(e.target.value)}
            disabled={loading}
            className="w-full bg-[#161b27] border border-white/[0.08] rounded-xl
              px-4 py-2.5 text-sm text-white
              focus:outline-none focus:border-[#7c5cfc]
              transition-all duration-200"
          >
            <option value="Beginner">Beginner (Purple Badge)</option>
            <option value="Intermediate">Intermediate (Teal Badge)</option>
            <option value="Expert Level">Expert Level (Amber Badge)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            placeholder="Write a brief overview of the program objectives and targeted developer skills..."
            disabled={loading}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl
              px-4 py-2.5 text-sm text-white placeholder:text-white/20
              focus:outline-none focus:border-[#7c5cfc] focus:bg-white/[0.06]
              transition-all duration-200"
          />
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
              <span>Creating Program...</span>
            </>
          ) : (
            <span>Create & Configure Curriculum</span>
          )}
        </button>
      </form>
    </div>
  );
}
