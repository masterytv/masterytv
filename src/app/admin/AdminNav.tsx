"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Users, ArrowLeft, Fingerprint, Shield, AlertTriangle, Layers, Gauge, Aperture } from "lucide-react";

interface AdminNavProps {
  role: "admin" | "superadmin";
  email: string;
}

export default function AdminNav({ role, email }: AdminNavProps) {
  const pathname = usePathname();

  // PC5.1 — one admin, explicit scope: platform-wide tools first, then each
  // vertical's own machinery under its brand.
  const groups = [
    {
      label: "Platform",
      links: [
        { href: "/admin/costs", label: "Cost Dashboard", icon: BarChart2 },
        { href: "/admin/crisis", label: "Crisis Flags", icon: AlertTriangle },
        ...(role === "superadmin"
          ? [{ href: "/admin/users", label: "User Management", icon: Users }]
          : []),
      ],
    },
    {
      label: "MasteryTV · Executive",
      links: [{ href: "/admin/frameworks", label: "Frameworks", icon: Layers }],
    },
    {
      label: "Relatti",
      links: [{ href: "/admin/beta", label: "Beta Cockpit", icon: Gauge }],
    },
    // Sprint 0 kill gate. No brand yet, on purpose: the vertical does not exist
    // until the founder's go/no-go on I1 (INTEGRATION_SPRINT.md §3).
    {
      label: "Integration · Sprint 0",
      links: [{ href: "/admin/integration", label: "The Company bench", icon: Aperture }],
    },
  ];

  return (
    <aside style={{
      width: "220px",
      flexShrink: 0,
      borderRight: "1px solid var(--color-surface-200)",
      display: "flex",
      flexDirection: "column",
      background: "var(--color-surface-50)",
    }}>
      {/* Brand */}
      <div style={{ padding: "1.25rem 1rem", borderBottom: "1px solid var(--color-surface-200)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <Fingerprint size={18} color="var(--color-primary)" />
          <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-body)" }}>
            Admin
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Shield size={11} color={role === "superadmin" ? "var(--color-primary)" : "var(--text-hint)"} />
          <span style={{ fontSize: "0.68rem", color: "var(--text-hint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {role === "superadmin" ? "Super Admin" : "Admin"}
          </span>
        </div>
      </div>

      {/* Nav links, grouped by scope */}
      <nav style={{ flex: 1, padding: "0.75rem 0.5rem" }}>
        {groups.map(({ label: groupLabel, links }) => (
          <div key={groupLabel} style={{ marginBottom: "0.75rem" }}>
            <div
              style={{
                padding: "0.4rem 0.75rem 0.3rem",
                fontSize: "0.62rem",
                fontWeight: 600,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "var(--text-hint)",
              }}
            >
              {groupLabel}
            </div>
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.625rem",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                    fontWeight: active ? 600 : 400,
                    color: active ? "var(--color-primary)" : "var(--text-secondary)",
                    background: active ? "rgba(96,99,238,0.08)" : "transparent",
                    marginBottom: "0.125rem",
                    textDecoration: "none",
                  }}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer: back link + email */}
      <div style={{ padding: "1rem", borderTop: "1px solid var(--color-surface-200)" }}>
        <Link
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.78rem",
            color: "var(--text-hint)",
            textDecoration: "none",
            marginBottom: "0.5rem",
          }}
        >
          <ArrowLeft size={13} />
          Back to Dashboard
        </Link>
        <p style={{ fontSize: "0.68rem", color: "var(--text-hint)", wordBreak: "break-all" }}>{email}</p>
      </div>
    </aside>
  );
}
