"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Settings,
  LifeBuoy,
  LogOut,
  ChevronDown,
  User,
} from "lucide-react";

export function Header() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userName, setUserName] = useState("Admin");
  const [userEmail, setUserEmail] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load user info from localStorage
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
        if (name) setUserName(name);
        if (user.email) setUserEmail(user.email);
      }
    } catch {}
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    try {
      const tokensStr = localStorage.getItem("tokens");
      if (tokensStr) {
        const tokens = JSON.parse(tokensStr);
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokens.accessToken}`,
          },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
      }
    } catch {
      // Allow local logout to succeed even if network is down
    } finally {
      localStorage.removeItem("user");
      localStorage.removeItem("tokens");
      router.push("/login");
    }
  };

  // Get initials from name
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="fixed top-0 right-0 left-[130px] z-30 flex items-center justify-between
      h-14 px-6 bg-[#0d1117]/80 backdrop-blur-md border-b border-white/[0.06]">

      {/* Search */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-3.5 h-3.5 text-white/30 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search courses..."
          className="w-56 bg-white/[0.05] border border-white/[0.08] rounded-lg
            pl-9 pr-3 py-1.5 text-sm text-white/80 placeholder:text-white/25
            focus:outline-none focus:border-[#7c5cfc]/50 focus:bg-white/[0.07]
            transition-all duration-200"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Notification */}
        <button
          className="relative flex items-center justify-center w-8 h-8 rounded-lg
            bg-white/[0.05] border border-white/[0.08] text-white/50 hover:text-white/80
            hover:bg-white/[0.08] transition-all"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#7c5cfc]" />
        </button>

        {/* Avatar + Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1
              hover:bg-white/[0.05] transition-all group"
            aria-label="User menu"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7c5cfc] to-[#00d4aa]
              flex items-center justify-center text-white text-xs font-bold select-none">
              {initials}
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200
                ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown Panel */}
          {dropdownOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-56 rounded-xl
              bg-[#161b27] border border-white/[0.08] shadow-2xl shadow-black/60
              animate-in fade-in zoom-in-95 duration-150 z-50 overflow-hidden">

              {/* User Info */}
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7c5cfc] to-[#00d4aa]
                    flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{userName}</p>
                    {userEmail && (
                      <p className="text-[10px] text-white/35 truncate">{userEmail}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-1.5 flex flex-col gap-0.5">
                <button
                  onClick={() => { setDropdownOpen(false); router.push("/settings"); }}
                  className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2
                    text-white/60 hover:text-white hover:bg-white/[0.05] transition-all text-xs font-medium"
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  Settings
                </button>

                <button
                  onClick={() => { setDropdownOpen(false); router.push("/support"); }}
                  className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2
                    text-white/60 hover:text-white hover:bg-white/[0.05] transition-all text-xs font-medium"
                >
                  <LifeBuoy className="w-4 h-4 shrink-0" />
                  Support
                </button>

                <div className="h-px bg-white/[0.06] my-0.5" />

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2
                    text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all text-xs font-medium"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
