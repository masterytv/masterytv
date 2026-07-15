"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CoachConversations from "@/components/dashboard/CoachConversations";
import { motion } from "framer-motion";
import { useUser } from "@/hooks/useUser";
import { useBrandModules } from "@/hooks/useBrandModules";
import { useBrand } from "@/hooks/useBrand";
import type { ModuleId } from "@/lib/platform/modules";
import { RelattiMark } from "@/components/relatti/RelattiMark";
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
  ShieldCheck,
  BookOpen,
  HelpCircle,
} from "lucide-react";

// `module` tags a gatable capability (PA4). Items without one are core and
// always shown. Items whose module isn't enabled for the active brand are hidden.
function getNavItems(reportId: string | null): Array<{
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  requiresAssessment?: boolean;
  module?: ModuleId;
}> {
  return [
    { href: "/dashboard", label: "Home", icon: Home, exact: true },
    {
      href: reportId ? `/report/${reportId}` : "/dashboard",
      label: "Assessment Report",
      icon: ClipboardCheck,
      requiresAssessment: true,
    },
    { href: "/dashboard/chat", label: "Coach", icon: MessageSquare, requiresAssessment: true },
    { href: "/dashboard/compatibility", label: "Compatibility", icon: Heart, requiresAssessment: true, module: "compatibility" },
    { href: "/dashboard/commitments", label: "Commitments", icon: Target, requiresAssessment: true, module: "commitments" },
    { href: "/dashboard/progress", label: "Progress", icon: TrendingUp, requiresAssessment: true, module: "progress" },
    {
      href: "/dashboard/coaching-letter",
      label: "Coaching Letter",
      icon: FileText,
      requiresAssessment: true,
      module: "coaching_letters",
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
  const enabledModules = useBrandModules();
  const brand = useBrand();
  const isRelatti = brand.id === "relatti";
  const brandLabel = isRelatti ? "Relatti" : "Mastery";

  // Map decoded_tier to display label. Tier names are MasteryTV product names —
  // on Relatti they'd read as another brand's plan (brand-isolation invariant),
  // so Relatti shows its beta label until it has its own paid tiers.
  const tierLabels: Record<string, string> = {
    free: 'Free Plan',
    insight: 'Insight Plan',
    growth: 'Growth Plan',
    mastery: 'Mastery Plan',
  };
  const tierLabel = isRelatti
    ? 'Relatti Beta'
    : tierLabels[user?.decoded_tier ?? 'free'] ?? 'Free Plan';

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
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "color-mix(in oklch, var(--color-primary-container) 14%, transparent)" }}
            >
              {isRelatti ? (
                <RelattiMark className="h-4 w-4" />
              ) : (
                <Fingerprint className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
              )}
            </div>
            <span className="text-lg font-semibold tracking-tight text-text-primary">
              {brandLabel}
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
          {getNavItems(reportId)
            .filter((item) => !item.module || enabledModules.has(item.module))
            .map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const isLocked = item.requiresAssessment && !assessmentCompleted;

            if (isLocked) {
              return (
                <div
                  key={item.label}
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
              <Fragment key={item.label}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`
                    group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all
                    ${isActive ? "" : "text-text-secondary hover:bg-surface-200 hover:text-text-primary"}
                  `}
                  style={
                    isActive
                      ? {
                          background: "color-mix(in oklch, var(--color-primary) 10%, transparent)",
                          color: "var(--color-primary)",
                        }
                      : undefined
                  }
                >
                  <item.icon
                    className={`h-4.5 w-4.5 ${isActive ? "" : "text-text-muted group-hover:text-text-secondary"}`}
                    style={isActive ? { color: "var(--color-primary)" } : undefined}
                  />
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 h-8 w-0.5 rounded-r-full"
                      style={{ background: "var(--color-primary)" }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </Link>
                {/* PC1: conversation list nested under Coach */}
                {item.href === "/dashboard/chat" && <CoachConversations />}
              </Fragment>
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

          {/* Admin — only visible to admin/superadmin */}
          {user?.role && ["admin", "superadmin"].includes(user.role) && (
            <Link
              href="/admin"
              onClick={onClose}
              className={`
                group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all mt-2 border border-dashed
                ${pathname.startsWith("/admin")
                  ? ""
                  : "text-text-muted border-surface-300 hover:bg-surface-200 hover:text-text-primary hover:border-surface-400"
                }
              `}
              style={
                pathname.startsWith("/admin")
                  ? {
                      background: "color-mix(in oklch, var(--color-primary) 10%, transparent)",
                      color: "var(--color-primary)",
                      borderColor: "color-mix(in oklch, var(--color-primary) 30%, transparent)",
                    }
                  : undefined
              }
            >
              <ShieldCheck
                className={`h-4.5 w-4.5 ${pathname.startsWith("/admin") ? "" : "text-text-muted/60 group-hover:text-text-muted"}`}
                style={pathname.startsWith("/admin") ? { color: "var(--color-primary)" } : undefined}
              />
              Admin
            </Link>
          )}

          {/* Resources — quiet reference links for the skeptical reader
              (Relatti only; pt not mt because the nav's space-y overrides margins) */}
          {isRelatti && (
            <div className="pt-6">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted/70">
                Resources
              </p>
              <div className="mt-1.5 space-y-0.5">
                <Link
                  href="/science"
                  onClick={onClose}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-200 hover:text-text-primary"
                >
                  <BookOpen className="h-4 w-4 text-text-muted/60 group-hover:text-text-muted" />
                  The science
                </Link>
                <Link
                  href="/why-ai"
                  onClick={onClose}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-200 hover:text-text-primary"
                >
                  <HelpCircle className="h-4 w-4 text-text-muted/60 group-hover:text-text-muted" />
                  How the coach works
                </Link>
              </div>
            </div>
          )}
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
