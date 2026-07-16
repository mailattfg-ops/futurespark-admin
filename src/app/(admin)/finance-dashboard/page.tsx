"use client";

import { useEffect, useState } from "react";
import { DollarSign, ShieldCheck, TrendingUp, CreditCard, Activity } from "lucide-react";

export default function FinanceDashboard() {
  const [userName, setUserName] = useState("Finance Admin");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserName([user.firstName, user.lastName].filter(Boolean).join(" ") || "Finance Admin");
        setUserEmail(user.email);
      }
    } catch {}
  }, []);

  return (
    <div className="p-8 w-full">
      <div className="relative overflow-hidden bg-gradient-to-r from-green-500/10 to-teal-500/10 border border-white/[0.08] rounded-3xl p-8 mb-8 shadow-2xl">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider mb-3 border border-green-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Staff Role: Finance Admin
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Financial Analytics & Billing
          </h1>
          <p className="text-white/45 text-sm mt-1">Logged in as: {userName} ({userEmail})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Monthly Revenue</span>
            <DollarSign className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">$48,320.00</p>
          <p className="text-[10px] text-white/35">Gross monthly course payments processed.</p>
        </div>

        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Active Subscriptions</span>
            <CreditCard className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">1,208</p>
          <p className="text-[10px] text-white/35">Active billing accounts under installments.</p>
        </div>

        <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Pending Payouts</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">$4,150.00</p>
          <p className="text-[10px] text-white/35">Instructor payouts matching class schedules.</p>
        </div>
      </div>
    </div>
  );
}
