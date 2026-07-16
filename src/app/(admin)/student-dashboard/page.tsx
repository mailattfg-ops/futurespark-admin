"use client";

import { useEffect, useState } from "react";
import { BookOpen, GraduationCap, Calendar, Compass, ShieldCheck } from "lucide-react";

export default function StudentDashboard() {
  const [userName, setUserName] = useState("Student");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserName([user.firstName, user.lastName].filter(Boolean).join(" ") || "Student");
        setUserEmail(user.email);
      }
    } catch {}
  }, []);

  return (
    <div className="p-8 w-full">
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-500/10 to-teal-500/10 border border-white/[0.08] rounded-3xl p-8 mb-8 shadow-2xl">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-3 border border-blue-500/20">
            <GraduationCap className="w-3.5 h-3.5" /> Student Hub
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Learning Portal
          </h1>
          <p className="text-white/45 text-sm mt-1">Logged in as: {userName} ({userEmail})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">My Enrolled Courses</span>
            <BookOpen className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">0</p>
          <p className="text-[10px] text-white/35">Explore programs to enroll and start learning.</p>
        </div>

        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Upcoming Classes</span>
            <Calendar className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">None Scheduled</p>
          <p className="text-[10px] text-white/35">Check back after enrolling in a program.</p>
        </div>

        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Certificates Earned</span>
            <Compass className="w-4 h-4 text-[#00d4aa]" />
          </div>
          <p className="text-2xl font-bold text-white">0</p>
          <p className="text-[10px] text-white/35">Complete courses to earn official credentials.</p>
        </div>
      </div>
    </div>
  );
}
