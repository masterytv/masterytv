"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Target,
  TrendingUp,
  Settings,
  FileText,
  X,
} from "lucide-react";

const navItems = [
  { href: "/coachapp/dashboard/chat", label: "Chat", icon: MessageSquare },
  { href: "/coachapp/dashboard/commitments", label: "Commitments", icon: Target },
  { href: "/coachapp/dashboard/progress", label: "Progress", icon: TrendingUp },
  {
    href: "/coachapp/dashboard/coaching-letter",
    label: "Coaching Letter",
    icon: FileText,
  },
  { href: "/coachapp/dashboard/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

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
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-surface-300 bg-surface-50
          transition-transform duration-300 ease-smooth
          lg:relative lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between px-6">
          <Link href="/coachapp/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15 ring-1 ring-brand-500/20">
              <span className="text-sm font-bold text-brand-400">M</span>
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
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all
                  ${
                    isActive
                      ? "bg-brand-500/10 text-brand-400"
                      : "text-text-secondary hover:bg-surface-200 hover:text-text-primary"
                  }
                `}
              >
                <item.icon
                  className={`h-4.5 w-4.5 ${
                    isActive
                      ? "text-brand-400"
                      : "text-text-muted group-hover:text-text-secondary"
                  }`}
                />
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 h-8 w-0.5 rounded-r-full bg-brand-400"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Tier badge */}
        <div className="border-t border-surface-300 p-4">
          <div className="rounded-lg bg-surface-100 px-3 py-2 text-center">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Free Plan
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
