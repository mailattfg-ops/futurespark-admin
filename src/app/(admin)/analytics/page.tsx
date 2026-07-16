import { TrendingUp, Users, BookOpen, Star } from "lucide-react";

const metrics = [
  { label: "Revenue MoM", value: "+18.5%", sub: "vs last semester", icon: TrendingUp, color: "purple" },
  { label: "Avg Completion", value: "94%", sub: "across all courses", icon: Star, color: "amber" },
  { label: "New Students", value: "+1,240", sub: "in the last 30 days", icon: Users, color: "teal" },
  { label: "Courses Published", value: "42", sub: "4 pending review", icon: BookOpen, color: "purple" },
];

const colorMap: Record<string, string> = {
  purple: "bg-[#7c5cfc]/15 text-[#a78bfa] border-[#7c5cfc]/20",
  teal: "bg-[#00d4aa]/15 text-[#00d4aa] border-[#00d4aa]/20",
  amber: "bg-amber-500/15 text-amber-400  border-amber-500/20",
};

const topCourses = [
  { title: "Neural Network Architecture", students: 1204, revenue: "$18,060", rating: 4.9 },
  { title: "Advanced Distributed Systems", students: 842, revenue: "$12,630", rating: 4.8 },
  { title: "Secure DevOps Lifecycle", students: 620, revenue: "$9,300", rating: 4.7 },
  { title: "Applied Quantum Computing", students: 315, revenue: "$4,725", rating: 4.6 },
];

export default function AnalyticsPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Analytics</h1>
        <p className="text-white/40 text-sm">Platform performance overview — last 30 days</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {metrics.map(m => (
          <div key={m.label}
            className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5
              hover:border-white/[0.12] transition-all duration-200">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-4 ${colorMap[m.color]}`}>
              <m.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-white mb-0.5">{m.value}</p>
            <p className="text-[11px] text-white/35 font-medium">{m.label}</p>
            <p className="text-[10px] text-white/20 mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="col-span-2 bg-[#161b27] border border-white/[0.07] rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-1">Revenue Over Time</h2>
          <p className="text-[11px] text-white/35 mb-6">Monthly recurring revenue in USD</p>
          {/* Area chart placeholder */}
          <div className="relative h-44">
            <svg viewBox="0 0 400 120" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c5cfc" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#7c5cfc" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,100 C40,90 60,70 100,60 C140,50 160,80 200,55 C240,30 260,40 300,25 C340,10 360,20 400,10 L400,120 L0,120 Z"
                fill="url(#grad)"
              />
              <path
                d="M0,100 C40,90 60,70 100,60 C140,50 160,80 200,55 C240,30 260,40 300,25 C340,10 360,20 400,10"
                fill="none"
                stroke="#7c5cfc"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="flex justify-between px-1 mt-1">
            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"].map(m => (
              <span key={m} className="text-[10px] text-white/25">{m}</span>
            ))}
          </div>
        </div>

        {/* Course Breakdown */}
        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-1">Category Breakdown</h2>
          <p className="text-[11px] text-white/35 mb-5">By enrollment %</p>
          <div className="flex flex-col gap-3">
            {[
              { label: "AI & ML", pct: 38, color: "#7c5cfc" },
              { label: "Security", pct: 24, color: "#00d4aa" },
              { label: "DevOps", pct: 21, color: "#f59e0b" },
              { label: "Distributed", pct: 17, color: "#ef4444" },
            ].map(c => (
              <div key={c.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] text-white/50">{c.label}</span>
                  <span className="text-[11px] text-white/50">{c.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Courses Table */}
      <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Top Performing Courses</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.04]">
              {["Course", "Students", "Revenue", "Rating"].map(h => (
                <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold text-white/30 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topCourses.map((c, i) => (
              <tr key={i} className={`hover:bg-white/[0.02] transition-colors ${i < topCourses.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                <td className="px-6 py-4">
                  <p className="text-sm text-white font-medium">{c.title}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-white/60">{c.students.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-[#00d4aa] font-medium">{c.revenue}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-sm text-white/70">{c.rating}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
