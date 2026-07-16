"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, Sparkles, MapPin, ShieldCheck, Check } from "lucide-react";

export default function SchedulerDashboard() {
  const [userName, setUserName] = useState("Scheduler");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserName([user.firstName, user.lastName].filter(Boolean).join(" ") || "Scheduler");
        setUserEmail(user.email);
      }
    } catch {}
  }, []);

  return (
    <div className="p-8 w-full">
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-white/[0.08] rounded-3xl p-8 mb-8 shadow-2xl">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase tracking-wider mb-3 border border-purple-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Staff Role: Scheduler
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Scheduling & Time-Fixing Engine
          </h1>
          <p className="text-white/45 text-sm mt-1">Logged in as: {userName} ({userEmail})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Engine Status</span>
            <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded uppercase font-bold">Active</span>
          </div>
          <p className="text-2xl font-bold text-white">Optimal</p>
          <p className="text-[10px] text-white/35">Running continuous constraints checks.</p>
        </div>

        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Next Run</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">In 14 mins</p>
          <p className="text-[10px] text-white/35">Recalculates teacher schedules and availability slots.</p>
        </div>

        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Total Slotted Classes</span>
            <Calendar className="w-4 h-4 text-[#00d4aa]" />
          </div>
          <p className="text-2xl font-bold text-white">418</p>
          <p className="text-[10px] text-white/35">Successfully scheduled slots for current semester.</p>
        </div>
      </div>
    </div>
  );
}
