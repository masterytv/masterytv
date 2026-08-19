"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, LogOut, User, ShieldCheck, MessageCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useBrand } from "@/hooks/useBrand";

interface TopbarProps {
  userName: string | null;
  onMenuClick?: () => void;
  userRole?: string | null;
  /** Opens the feedback panel. Renders a MOBILE-ONLY icon (below md): on
   * phones the floating pill overlapped the chat composer/CTAs, so the entry
   * point lives in the topbar chrome instead; md+ keeps the floating pill. */
  onFeedbackClick?: () => void;
}

export function Topbar({ userName, onMenuClick, userRole, onFeedbackClick }: TopbarProps) {
  const isAdmin = userRole === "admin" || userRole === "superadmin";
  const brand = useBrand();
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
    // `relative z-30` is load-bearing, not decoration. `backdrop-blur-xl` sets
    // backdrop-filter, which creates a STACKING CONTEXT, so the account
    // dropdown's own z-50 only ever competed with this header's other children
    // — never with <main>, which follows in DOM order and therefore painted on
    // top of it. The dropdown rendered UNDER the chat composer as a result
    // (founder, 2026-08-19). Raising the whole header fixes it at the level the
    // problem actually lives at. 30 rather than 50 on purpose: it must stay
    // below the mobile sidebar (z-50) and its scrim (z-40), which are supposed
    // to cover the header.
    <header className="relative z-30 flex h-16 items-center justify-between bg-surface-50/80 backdrop-blur-xl px-4 lg:px-6">
      {/* Left cluster: mobile menu + beta badge */}
      <div className="flex items-center gap-2">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="rounded-md p-2 text-text-muted hover:text-text-primary lg:hidden transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Beta badge — Relatti only. Links to the free-unlock + feedback page. */}
        {brand.id === "relatti" && (
          <Link
            href="/dashboard/beta"
            title="Relatti is in beta — unlock unlimited coaching free and share feedback"
            className="text-label-sm rounded-full px-2.5 py-1 transition-opacity hover:opacity-80"
            style={{
              color: "var(--color-primary)",
              background: "color-mix(in oklch, var(--color-primary) 14%, transparent)",
            }}
          >
            Beta
          </Link>
        )}
      </div>

      {/* Right side: feedback (mobile) + theme toggle + user avatar */}
      <div className="flex items-center gap-3">
        {onFeedbackClick && (
          <button
            onClick={onFeedbackClick}
            aria-label="Send feedback"
            title="Send feedback"
            className="rounded-md p-2 text-text-muted transition-colors hover:text-text-primary md:hidden"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
        )}
        <ThemeToggle />
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-200 transition-colors"
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: "color-mix(in oklch, var(--color-primary-container) 14%, transparent)" }}
          >
            <span className="text-xs font-semibold" style={{ color: "var(--color-primary)" }}>
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
                  <ShieldCheck className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
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
