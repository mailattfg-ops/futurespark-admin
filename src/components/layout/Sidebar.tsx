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
  Briefcase,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: any;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
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

  // Determine dynamic grouped navigation sections based on role
  const getNavSections = (): NavSection[] => {
    switch (role) {
      case "TEACHER":
        return [
          {
            title: "Overview",
            items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
          },
          {
            title: "Academics",
            items: [{ href: "/teacher-dashboard", label: "My Teaching Schedule", icon: Calendar }],
          },
        ];
      case "QA_AUDITOR":
        return [
          {
            items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
          },
        ];
      case "SCHEDULER":
        return [
          {
            title: "Overview",
            items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
          },
          {
            title: "Operations",
            items: [{ href: "/scheduler", label: "Scheduler", icon: Calendar }],
          },
          {
            title: "People",
            items: [
              { href: "/students",  label: "Students",  icon: GraduationCap },
              { href: "/mentors",   label: "Mentors",   icon: Briefcase },
              { href: "/customers", label: "Parents",   icon: Users },
            ],
          },
        ];
      case "WAREHOUSE_ADMIN":
        return [
          {
            items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
          },
        ];
      case "FINANCE_ADMIN":
        return [
          {
            title: "Overview",
            items: [
              { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
              { href: "/finance-dashboard", label: "Finance", icon: DollarSign },
            ],
          },
        ];
      case "STUDENT":
        return [
          {
            title: "Overview",
            items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
          },
          {
            title: "Schedule",
            items: [{ href: "/student-dashboard", label: "My Schedule", icon: Calendar }],
          },
        ];
      case "PARENT":
        return [
          {
            title: "Overview",
            items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
          },
          {
            title: "Academics",
            items: [{ href: "/courses", label: "Explore Programs", icon: BookOpen }],
          },
          {
            title: "Schedule",
            items: [{ href: "/parent-dashboard", label: "Children's Schedule", icon: Calendar }],
          },
        ];
      default:
        return [
          {
            title: "Overview",
            items: [
              { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
            ],
          },
          {
            title: "Programs",
            items: [
              { href: "/courses",   label: "Courses Catalogue", icon: BookOpen },
              { href: "/sessions",  label: "Academic Sessions", icon: Clock },
            ],
          },
          {
            title: "Operations",
            items: [
              { href: "/scheduler",         label: "Scheduler",     icon: Calendar },
              { href: "/finance-dashboard", label: "Finance",       icon: DollarSign },
            ],
          },
          {
            title: "Sales",
            items: [
              { href: "/leads",         label: "Leads CRM",     icon: Contact },
            ],
          },
          {
            title: "People",
            items: [
              { href: "/students",      label: "Students",      icon: GraduationCap },
              { href: "/mentors",       label: "Mentors",       icon: Briefcase },
              { href: "/customers",     label: "Parents",       icon: Users },
            ],
          },
          {
            title: "System",
            items: [
              { href: "/staff",         label: "Staff Admin",   icon: UserCheck },
              { href: "/roles",         label: "User Roles",    icon: ShieldAlert },
            ],
          },
        ];
    }
  };

  const navSections = getNavSections();

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-40 flex w-[130px] flex-col bg-[#13161e] border-r border-white/[0.06]
      transition-transform duration-300 ease-in-out md:translate-x-0
      ${isOpen ? "translate-x-0" : "-translate-x-full"}
    `}>
      {/* Mobile Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-3 p-1 rounded-md border border-white/[0.06] bg-white/[0.02] text-white/50 hover:text-white md:hidden"
      >
        <Plus className="w-3.5 h-3.5 rotate-45" />
      </button>

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
      <nav className="flex flex-col gap-4 flex-1 py-4 px-2 overflow-y-auto w-full">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="flex flex-col gap-1 w-full shrink-0">
            {section.title && (
              <div className="text-[8.5px] font-bold uppercase tracking-wider text-white/30 text-center mb-1 select-none">
                {section.title}
              </div>
            )}
            <div className="flex flex-col gap-1.5 w-full">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`
                      flex flex-col items-center gap-1 w-full rounded-xl px-1.5 py-2.5 text-center
                      transition-all duration-200 group border
                      ${active
                        ? "bg-[#7c5cfc]/15 text-[#7c5cfc] border-[#7c5cfc]/25"
                        : "text-white/45 hover:text-white/80 hover:bg-white/[0.05] border-transparent"
                      }
                    `}
                  >
                    <Icon className={`w-[18px] h-[18px] transition-all ${active ? "text-[#7c5cfc]" : "group-hover:text-white/80"}`} />
                    <span className="text-[9.5px] font-semibold leading-tight tracking-tight">{label}</span>
                  </Link>
                );
              })}
            </div>
            {sIdx < navSections.length - 1 && (
              <div className="h-px bg-white/[0.04] mx-2 mt-2" />
            )}
          </div>
        ))}
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
