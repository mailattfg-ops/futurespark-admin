"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Loader2 } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(userStr);
    if (user.requiresFtlReset) {
      router.push("/ftl");
      return;
    }

    const path = window.location.pathname;

    // Role to dashboard map
    const roleDashboardMap: Record<string, string> = {
      ADMIN: "/dashboard",
      TEACHER: "/dashboard",
      QA_AUDITOR: "/dashboard",
      SCHEDULER: "/dashboard",
      WAREHOUSE_ADMIN: "/dashboard",
      FINANCE_ADMIN: "/dashboard",
      STUDENT: "/dashboard",
      PARENT: "/dashboard",
    };

    const targetDashboard = roleDashboardMap[user.role as string] || "/login";

    // Handle dashboard roots redirection
    if (path === "/" || (path === "/dashboard" && targetDashboard !== "/dashboard")) {
      router.push(targetDashboard);
      return;
    }

    // Secure RBAC: restrict non-admins to their permitted routes
    if (user.role !== "ADMIN") {
      const allowedPaths: Record<string, string[]> = {
        TEACHER: ["/dashboard"],
        QA_AUDITOR: ["/dashboard"],
        SCHEDULER: ["/dashboard", "/scheduler", "/students", "/customers"],
        WAREHOUSE_ADMIN: ["/dashboard"],
        FINANCE_ADMIN: ["/dashboard"],
        STUDENT: ["/dashboard"],
        PARENT: ["/dashboard"],
      };

      const roleAllowed = allowedPaths[user.role as string] || ["/dashboard"];
      const isPathAllowed = roleAllowed.some((allowed) => {
        if (allowed === path) return true;
        // Check dynamic prefixes (e.g. /customers/123)
        return path.startsWith(allowed + "/");
      });

      if (!isPathAllowed) {
        router.push(targetDashboard);
        return;
      }
    }

    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7c5cfc]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0d1117]">
      <Sidebar />
      <div className="flex flex-col flex-1 ml-[130px]">
        <Header />
        <main className="flex-1 mt-14 overflow-y-auto dot-grid">
          {children}
        </main>
      </div>
    </div>
  );
}
