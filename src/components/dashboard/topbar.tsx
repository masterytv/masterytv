"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Menu, LogOut, User, ShieldCheck } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

interface TopbarProps {
  userName: string | null;
  onMenuClick?: () => void;
  userRole?: string | null;
}

export function Topbar({ userName, onMenuClick, userRole }: TopbarProps) {
  const isAdmin = userRole === "admin" || userRole === "superadmin";
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/decoded");
  }

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <header className="flex h-16 items-center justify-between bg-surface-50/80 backdrop-blur-xl px-4 lg:px-6">
      {/* Mobile menu button */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-text-muted hover:text-text-primary lg:hidden transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Page title area (can be customized per page) */}
      <div className="hidden lg:block" />

      {/* Right side: theme toggle + user avatar */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-200 transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(96,99,238,0.12)]">
            <span className="text-xs font-semibold text-[#a3a6ff]">
              {initials}
            </span>
          </div>
          <span className="hidden text-sm font-medium text-text-primary md:block">
            {userName ?? "Loading..."}
          </span>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 rounded-lg bg-surface-100 py-1 shadow-elevated z-50">
            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push("/admin");
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-surface-200 hover:text-text-primary transition-colors"
                >
                  <ShieldCheck className="h-4 w-4 text-[#a3a6ff]" />
                  Admin
                </button>
                <div className="mx-3 my-1 h-px bg-surface-200" />
              </>
            )}
            <button
              onClick={() => {
                setDropdownOpen(false);
                router.push("/dashboard/settings");
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-surface-200 hover:text-text-primary transition-colors"
            >
              <User className="h-4 w-4" />
              Settings
            </button>
            <div className="mx-3 my-1 h-px bg-surface-200" />
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-surface-200 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
