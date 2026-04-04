"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { Topbar } from "@/components/dashboard/topbar";
import {
  BarChart3,
  AlertTriangle,
  Layers,
  ArrowLeft,
  Menu,
  X,
} from "lucide-react";

const adminNavItems = [
  { href: "/coachapp/admin", label: "Overview", icon: BarChart3 },
  { href: "/coachapp/admin/crisis", label: "Crisis Flags", icon: AlertTriangle },
  { href: "/coachapp/admin/frameworks", label: "Frameworks", icon: Layers },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Admin gate: redirect non-admins
  useEffect(() => {
    if (!loading && user && !user.is_admin) {
      router.push("/coachapp/dashboard");
    }
  }, [loading, user, router]);

  // Show nothing while checking auth
  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-0">
        <div className="ad-skeleton ad-skeleton--card" style={{ width: 300, height: 200 }} />
      </div>
    );
  }

  // If not admin, don't render (redirect is pending)
  if (!user.is_admin) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-0">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Admin Sidebar */}
      <aside className={`ad-sidebar ${sidebarOpen ? "ad-sidebar--open" : ""}`}>
        {/* Brand header */}
        <div className="ad-sidebar__header">
          <div className="ad-sidebar__logo">
            <span className="ad-sidebar__logo-text">A</span>
          </div>
          <span className="ad-sidebar__title">Admin</span>
          <span className="ad-sidebar__badge">Admin</span>

          {/* Mobile close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1 text-text-muted hover:text-text-primary lg:hidden transition-colors ml-auto"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="ad-nav">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`ad-nav__link ${isActive ? "ad-nav__link--active" : ""}`}
              >
                <item.icon className="ad-nav__icon" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer — back to dashboard */}
        <div className="ad-sidebar__footer">
          <Link href="/coachapp/dashboard" className="ad-back-link">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar — reuse dashboard topbar */}
        <Topbar
          userName={user.name ?? null}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Page content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
