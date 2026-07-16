"use client";

import { useEffect, useState } from "react";
import { BookOpen, GraduationCap, Calendar, Users, Award, Shield } from "lucide-react";

interface Program {
  id: string;
  title: string;
}

export default function TeacherDashboard() {
  const [teacherName, setTeacherName] = useState("Teacher");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [qualifiedIds, setQualifiedIds] = useState<string[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setTeacherName([user.firstName, user.lastName].filter(Boolean).join(" ") || "Teacher");
        setTeacherEmail(user.email);
        setQualifiedIds(user.qualifiedPrograms || []);
      }

      // Fetch programs to match titles
      const tokensStr = localStorage.getItem("tokens");
      if (tokensStr) {
        fetch("/api/courses", {
          headers: {
            Authorization: `Bearer ${JSON.parse(tokensStr).accessToken}`,
          },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) setPrograms(data.data);
          });
      }
    } catch {}
  }, []);

  const qualifiedPrograms = programs.filter((p) => qualifiedIds.includes(p.id));

  return (
    <div className="p-8 w-full">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#7c5cfc]/20 to-[#00d4aa]/15 border border-white/[0.08] rounded-3xl p-8 mb-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#7c5cfc]/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#7c5cfc]/20 text-[#a78bfa] text-[10px] font-bold uppercase tracking-wider mb-3 border border-[#7c5cfc]/30">
              <Shield className="w-3.5 h-3.5" /> Staff Role: Teacher
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {teacherName}
            </h1>
            <p className="text-white/45 text-sm mt-1">{teacherEmail}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-white/35 uppercase font-bold tracking-wide">Teaching Subjects</p>
              <p className="text-2xl font-bold text-white mt-0.5">{qualifiedIds.length}</p>
            </div>
            <div className="w-10 h-10 bg-[#7c5cfc]/20 border border-[#7c5cfc]/30 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-[#a78bfa]" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Qualified Subjects Panel */}
        <div className="md:col-span-2 bg-[#161b27] border border-white/[0.07] rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#7c5cfc]" /> Qualified Subjects
            </h2>
            <p className="text-white/35 text-xs mt-0.5">
              These are the courses you are credentialed to teach in the curriculum.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {qualifiedPrograms.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-white/[0.06] rounded-xl text-white/30 text-xs">
                No subjects assigned yet. Please contact the administrator.
              </div>
            ) : (
              qualifiedPrograms.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-4 py-3 bg-[#13161e] border border-white/[0.06] rounded-xl hover:border-white/[0.12] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#7c5cfc]/10 border border-[#7c5cfc]/20 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-[#a78bfa]" />
                    </div>
                    <span className="text-xs font-semibold text-white">{p.title}</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#00d4aa] bg-[#00d4aa]/10 border border-[#00d4aa]/20 px-2 py-0.5 rounded uppercase tracking-wider">
                    Qualified
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info Cards */}
        <div className="flex flex-col gap-4">
          <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50">Next Class</span>
              <Calendar className="w-4 h-4 text-[#00d4aa]" />
            </div>
            <p className="text-sm font-bold text-white">None Scheduled</p>
            <p className="text-[10px] text-white/35">Sync with scheduling engine pending class matches.</p>
          </div>

          <div className="bg-[#161b27] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/50">Student Feedback</span>
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-sm font-bold text-white">4.9 / 5.0 Rating</p>
            <p className="text-[10px] text-white/35">Average rating across recent masterclass lessons.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
