import { Users, BookOpen, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";

const kpis = [
  {
    label: "Total Students",
    value: "24,821",
    change: "+12.4%",
    up: true,
    icon: Users,
    color: "purple",
  },
  {
    label: "Active Courses",
    value: "42",
    change: "+3 this month",
    up: true,
    icon: BookOpen,
    color: "teal",
  },
  {
    label: "Completion Rate",
    value: "94%",
    change: "+2.1%",
    up: true,
    icon: TrendingUp,
    color: "amber",
  },
  {
    label: "Monthly Revenue",
    value: "$48,320",
    change: "+18.5%",
    up: true,
    icon: DollarSign,
    color: "purple",
  },
];

const colorMap: Record<string, string> = {
  purple: "bg-[#7c5cfc]/15 text-[#a78bfa] border-[#7c5cfc]/20",
  teal: "bg-[#00d4aa]/15 text-[#00d4aa] border-[#00d4aa]/20",
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

const recentActivity = [
  { action: "New enrollment", course: "Advanced Distributed Systems", time: "2 mins ago", color: "teal" },
  { action: "Course published", course: "Applied Quantum Computing", time: "14 mins ago", color: "purple" },
  { action: "New enrollment", course: "Neural Network Architecture", time: "31 mins ago", color: "teal" },
  { action: "Review submitted", course: "Secure DevOps Lifecycle", time: "1 hr ago", color: "amber" },
  { action: "New enrollment", course: "Advanced Distributed Systems", time: "2 hrs ago", color: "teal" },
];

export default function DashboardPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Dashboard</h1>
        <p className="text-white/40 text-sm">Welcome back, System Administrator</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {kpis.map(kpi => (
          <div
            key={kpi.label}
            className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5
              hover:border-white/[0.12] transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-white/40 font-medium">{kpi.label}</span>
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${colorMap[kpi.color]}`}>
                <kpi.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{kpi.value}</p>
            <div className="flex items-center gap-1">
              {kpi.up
                ? <ArrowUpRight className="w-3.5 h-3.5 text-[#00d4aa]" />
                : <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
              }
              <span className={`text-[11px] font-medium ${kpi.up ? "text-[#00d4aa]" : "text-red-400"}`}>
                {kpi.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-4">

        {/* Enrollment Chart (placeholder) */}
        <div className="col-span-2 bg-[#161b27] border border-white/[0.07] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-white">Enrollment Trends</h2>
              <p className="text-xs text-white/35 mt-0.5">Last 6 months</p>
            </div>
            <div className="flex gap-2">
              {["1M", "3M", "6M", "1Y"].map(p => (
                <button
                  key={p}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all
                    ${p === "6M"
                      ? "bg-[#7c5cfc]/20 text-[#a78bfa] border border-[#7c5cfc]/30"
                      : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Simple bar chart */}
          <div className="flex items-end gap-3 h-40">
            {[65, 82, 58, 90, 75, 95].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-lg bg-gradient-to-t from-[#7c5cfc] to-[#7c5cfc]/50 transition-all hover:from-[#00d4aa] hover:to-[#00d4aa]/50 cursor-pointer"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 px-1">
            {["Feb", "Mar", "Apr", "May", "Jun", "Jul"].map(m => (
              <span key={m} className="text-[10px] text-white/25">{m}</span>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-4 h-4 text-[#7c5cfc]" />
            <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
          </div>
          <div className="flex flex-col gap-4">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${item.color === "teal" ? "bg-[#00d4aa]" :
                    item.color === "purple" ? "bg-[#7c5cfc]" :
                      "bg-amber-400"
                  }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/70 font-medium">{item.action}</p>
                  <p className="text-[11px] text-white/35 truncate">{item.course}</p>
                </div>
                <span className="text-[10px] text-white/25 whitespace-nowrap shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
