"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Menu, LogOut, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface TopbarProps {
  userName: string | null;
  onMenuClick: () => void;
}

export function Topbar({ userName, onMenuClick }: TopbarProps) {
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
    router.push("/coachapp/login");
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
    <header className="flex h-16 items-center justify-between border-b border-surface-300 bg-surface-50/80 backdrop-blur-md px-4 lg:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-text-muted hover:text-text-primary lg:hidden transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Page title area (can be customized per page) */}
      <div className="hidden lg:block" />

      {/* User avatar + dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-200 transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 ring-1 ring-brand-500/20">
            <span className="text-xs font-semibold text-brand-400">
              {initials}
            </span>
          </div>
          <span className="hidden text-sm font-medium text-text-primary md:block">
            {userName ?? "Loading..."}
          </span>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-surface-300 bg-surface-50 py-1 shadow-elevated z-50">
            <button
              onClick={() => {
                setDropdownOpen(false);
                router.push("/coachapp/dashboard/settings");
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-surface-200 hover:text-text-primary transition-colors"
            >
              <User className="h-4 w-4" />
              Settings
            </button>
            <div className="mx-3 my-1 h-px bg-surface-300" />
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
    </header>
  );
}
