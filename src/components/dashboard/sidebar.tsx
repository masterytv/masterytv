"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useUser } from "@/hooks/useUser";
import {
  Home,
  ClipboardCheck,
  MessageSquare,
  Heart,
  Target,
  TrendingUp,
  Settings,
  FileText,
  Share2,
  X,
  Fingerprint,
  Lock,
} from "lucide-react";

function getNavItems(reportId: string | null) {
  return [
    { href: "/dashboard", label: "Home", icon: Home, exact: true },
    {
      href: reportId ? `/decoded/report/${reportId}` : "/dashboard",
      label: "Assessment Report",
      icon: ClipboardCheck,
      requiresAssessment: true,
    },
    { href: "/dashboard/chat", label: "Coach", icon: MessageSquare, requiresAssessment: true },
    { href: "/dashboard/compatibility", label: "Compatibility", icon: Heart, requiresAssessment: true },
    { href: "/dashboard/commitments", label: "Commitments", icon: Target, requiresAssessment: true },
    { href: "/dashboard/progress", label: "Progress", icon: TrendingUp, requiresAssessment: true },
    {
      href: "/dashboard/coaching-letter",
      label: "Coaching Letter",
      icon: FileText,
      requiresAssessment: true,
    },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  assessmentCompleted?: boolean;
  reportId?: string | null;
  onShareClick?: () => void;
}

export function Sidebar({ open, onClose, assessmentCompleted = false, reportId = null, onShareClick }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();

  // Map decoded_tier to display label
  const tierLabels: Record<string, string> = {
    free: 'Free Plan',
    insight: 'Insight Plan',
    growth: 'Growth Plan',
    mastery: 'Mastery Plan',
  };
  const tierLabel = tierLabels[user?.decoded_tier ?? 'free'] ?? 'Free Plan';

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-surface-50
          transition-transform duration-300 ease-smooth
          lg:relative lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(96,99,238,0.12)]">
              <Fingerprint className="h-4 w-4 text-[#a3a6ff]" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-text-primary">
              Mastery
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-text-muted hover:text-text-primary lg:hidden transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-2 flex-1 space-y-1 px-3">
          {getNavItems(reportId).map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const isLocked = item.requiresAssessment && !assessmentCompleted;

            if (isLocked) {
              return (
                <div
                  key={item.href}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-muted/50 cursor-not-allowed"
                  title="Complete the assessment to unlock"
                >
                  <item.icon className="h-4.5 w-4.5 text-text-muted/40" />
                  {item.label}
                  <Lock className="ml-auto h-3 w-3 text-text-muted/40" />
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all
                  ${
                    isActive
                      ? "bg-[rgba(96,99,238,0.1)] text-[#a3a6ff]"
                      : "text-text-secondary hover:bg-surface-200 hover:text-text-primary"
                  }
                `}
              >
                <item.icon
                  className={`h-4.5 w-4.5 ${
                    isActive
                      ? "text-[#a3a6ff]"
                      : "text-text-muted group-hover:text-text-secondary"
                  }`}
                />
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 h-8 w-0.5 rounded-r-full bg-[#a3a6ff]"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}

          {/* Share — opens the share/invite modal */}
          <button
            onClick={() => { onShareClick?.(); onClose(); }}
            className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-200 hover:text-text-primary transition-all"
          >
            <Share2 className="h-4.5 w-4.5 text-text-muted group-hover:text-text-secondary" />
            Share
          </button>
        </nav>

        {/* Tier badge */}
        <div className="p-4">
          <div className="rounded-lg bg-surface-100 px-3 py-2 text-center">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
              {tierLabel}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
