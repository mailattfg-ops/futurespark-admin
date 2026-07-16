"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart3,
  Plus,
  Zap,
  Clock,
  UserCheck,
  GraduationCap,
  Shield,
  Calendar,
  Package,
  DollarSign,
  ShieldAlert,
  Contact,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState("ADMIN");

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setRole(user.role || "ADMIN");
      }
    } catch {}
  }, []);

  // Determine dynamic navigation items based on role
  const getNavItems = () => {
    switch (role) {
      case "TEACHER":
        return [{ href: "/teacher-dashboard", label: "Teacher Hub", icon: GraduationCap }];
      case "QA_AUDITOR":
        return [{ href: "/qa-dashboard", label: "QA Hub", icon: Shield }];
      case "SCHEDULER":
        return [{ href: "/scheduler-dashboard", label: "Schedule Hub", icon: Calendar }];
      case "WAREHOUSE_ADMIN":
        return [{ href: "/warehouse-dashboard", label: "Warehouse Hub", icon: Package }];
      case "FINANCE_ADMIN":
        return [{ href: "/finance-dashboard", label: "Finance Hub", icon: DollarSign }];
      case "STUDENT":
        return [{ href: "/student-dashboard", label: "Student Hub", icon: GraduationCap }];
      default:
        // Admin gets the full list + Staff Management + User Roles + Leads CRM + Customers
        return [
          { href: "/courses",       label: "Programs",      icon: BookOpen },
          { href: "/sessions",      label: "Sessions",      icon: Clock },
          { href: "/students",      label: "Students",      icon: GraduationCap },
          { href: "/customers",     label: "Customers",     icon: Users },
          { href: "/staff",         label: "Staff Admin",   icon: UserCheck },
          { href: "/roles",         label: "User Roles",    icon: ShieldAlert },
          { href: "/leads",         label: "Leads CRM",     icon: Contact },
          { href: "/analytics",     label: "Analytics",     icon: BarChart3 },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[130px] flex-col bg-[#13161e] border-r border-white/[0.06]">
      {/* Logo */}
      <div className="flex flex-col items-center gap-1 px-4 py-6 border-b border-white/[0.06]">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#7c5cfc]/20 ring-1 ring-[#7c5cfc]/40">
          <Zap className="w-5 h-5 text-[#7c5cfc]" />
        </div>
        <div className="mt-1 text-center">
          <p className="text-[11px] font-semibold text-white leading-tight">FutureSpark</p>
          <p className="text-[9px] text-white/40 leading-tight">
            {role === "ADMIN" ? "Admin Portal" : "Staff Hub"}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col items-center gap-1 flex-1 py-4 px-2 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex flex-col items-center gap-1.5 w-full rounded-xl px-2 py-3 text-center
                transition-all duration-200 group
                ${active
                  ? "bg-[#7c5cfc]/15 text-[#7c5cfc] border border-[#7c5cfc]/25"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.05] border border-transparent"
                }
              `}
            >
              <Icon className={`w-5 h-5 transition-all ${active ? "text-[#7c5cfc]" : "group-hover:text-white/80"}`} />
              <span className="text-[10px] font-medium leading-tight">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* New Course CTA (Only for Admin) */}
      {role === "ADMIN" && (
        <div className="px-3 pb-3">
          <Link
            href="/courses/new"
            className="flex items-center justify-center gap-1.5 w-full rounded-xl py-2.5 px-2
              bg-[#7c5cfc]/10 hover:bg-[#7c5cfc]/20 border border-[#7c5cfc]/25 hover:border-[#7c5cfc]/50
              text-[#7c5cfc] text-[10px] font-semibold transition-all duration-200 group"
          >
            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-200" />
            New Course
          </Link>
        </div>
      )}
    </aside>
  );
}
