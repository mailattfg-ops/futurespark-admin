"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Shield, AlertTriangle, Eye, ShieldCheck, Clock } from "lucide-react";

export default function QADashboard() {
  const [userName, setUserName] = useState("QA Auditor");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserName([user.firstName, user.lastName].filter(Boolean).join(" ") || "QA Auditor");
        setUserEmail(user.email);
      }
    } catch {}
  }, []);

  return (
    <div className="p-8 w-full">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-500/10 to-blue-500/10 border border-white/[0.08] rounded-3xl p-8 mb-8 shadow-2xl">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 text-[10px] font-bold uppercase tracking-wider mb-3 border border-teal-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Staff Role: QA Auditor
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Quality Assurance Center
          </h1>
          <p className="text-white/45 text-sm mt-1">Audit Logged in as: {userName} ({userEmail})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Audited Sessions</span>
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-white">128</p>
          <p className="text-[10px] text-white/35">Curriculum assets verified for compliance.</p>
        </div>

        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Pending Audits</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">4</p>
          <p className="text-[10px] text-white/35">Sessions with updated worksheet URLs awaiting signoff.</p>
        </div>

        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Compliance Rating</span>
            <Shield className="w-4 h-4 text-[#7c5cfc]" />
          </div>
          <p className="text-2xl font-bold text-white">100%</p>
          <p className="text-[10px] text-white/35">Zero compliance infractions reported.</p>
        </div>
      </div>
    </div>
  );
}
