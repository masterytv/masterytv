"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { BRANDS } from "@/lib/platform/brand";
import { Loader2, Shield, ShieldOff, ShieldCheck } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "superadmin";
  created_at: string;
  decoded_tier: string;
  daily_message_count: number;
  signup_brand: string | null;
}

// PC5.2 — per-user brand attribution ("which users are Relatti vs MasteryTV").
// Stamped accounts carry users.signup_brand; older accounts get a best-effort
// derivation from /api/admin/user-brands (relationship rows → relatti).
interface UserBrandEntry {
  brand: string;
  derived: boolean;
}

type BrandFilter = "all" | "relatti" | "masterytv";
type BrandSort = "none" | "relatti" | "masterytv";

const BRAND_LABELS: Record<string, string> = {
  relatti: "Relatti",
  masterytv: "MasteryTV",
};

const ROLE_CONFIG = {
  superadmin: { label: "Super Admin", icon: ShieldCheck, color: "#a3a6ff" },
  admin: { label: "Admin", icon: Shield, color: "#34d399" },
  user: { label: "User", icon: ShieldOff, color: "var(--text-hint)" },
} as const;

export default function UsersPage() {
  const { user: currentUser } = useUser();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [brands, setBrands] = useState<Record<string, UserBrandEntry>>({});
  const [brandFilter, setBrandFilter] = useState<BrandFilter>("all");
  const [brandSort, setBrandSort] = useState<BrandSort>("none");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [toast, setToast] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("users")
      .select("id, email, name, role, created_at, decoded_tier, daily_message_count, signup_brand")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setUsers(data as AdminUser[]);
        setLoading(false);
      });
    // Derived attribution for pre-stamp accounts (cross-user tables RLS hides).
    fetch("/api/admin/user-brands")
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.brands) setBrands(data.brands);
      })
      .catch(() => {});
  }, []);

  function brandOf(u: AdminUser): UserBrandEntry {
    if (u.signup_brand) return { brand: u.signup_brand, derived: false };
    return brands[u.id] ?? { brand: "masterytv", derived: true };
  }

  async function handleRoleChange(userId: string, newRole: "user" | "admin") {
    setUpdating(userId);
    const res = await fetch("/api/admin/update-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, newRole }),
    });
    const data = await res.json();
    if (data.success) {
      setUsers(prev =>
        prev.map(u => u.id === userId ? { ...u, role: newRole } : u)
      );
      setToast({ email: data.email, role: newRole });
      setTimeout(() => setToast(null), 3000);
    }
    setUpdating(null);
  }

  if (currentUser?.role !== "superadmin") {
    return (
      <div style={{ padding: "2rem", color: "var(--text-hint)" }}>
        Super Admin access required.
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1000px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-body)", marginBottom: "0.25rem" }}>
        User Management
      </h1>
      <p style={{ fontSize: "0.85rem", color: "var(--text-hint)", marginBottom: "2rem" }}>
        {users.length} users · Promote to Admin or demote to User. Superadmin roles are permanent.
      </p>

      {toast && (
        <div style={{
          marginBottom: "1rem", padding: "0.75rem 1rem", borderRadius: "8px",
          background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)",
          fontSize: "0.82rem", color: "#34d399",
        }}>
          {toast.email} → {toast.role === "admin" ? "Admin" : "User"}
        </div>
      )}

      {/* PC5.2 — brand view filter (hide other brands from the table). */}
      <div className="ad-filters">
        {(["all", "relatti", "masterytv"] as BrandFilter[]).map(tab => (
          <button
            key={tab}
            onClick={() => setBrandFilter(tab)}
            className={`ad-filter-btn ${brandFilter === tab ? "ad-filter-btn--active" : ""}`}
          >
            {tab === "all" ? "All brands" : BRAND_LABELS[tab]}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--text-hint)" }} />
      ) : (
        <div style={{ background: "var(--color-surface-100)", borderRadius: "12px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-surface-300)" }}>
                {["User", "Brand", "Role", "Plan", "Messages Today", "Joined", "Actions"].map(h => (
                  h === "Brand" ? (
                    <th
                      key={h}
                      onClick={() =>
                        // Cycle none → each registry brand → none (derived, so a
                        // new brand joins the sort rotation automatically).
                        setBrandSort(s => {
                          const order = ["none", ...Object.keys(BRANDS)] as (typeof s)[];
                          return order[(order.indexOf(s) + 1) % order.length];
                        })
                      }
                      title="Click to sort by brand"
                      style={{ textAlign: "left", padding: "0.75rem 1rem", color: "var(--text-hint)", fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", userSelect: "none" }}
                    >
                      Brand{brandSort !== "none" ? ` · ${BRAND_LABELS[brandSort]} first` : ""}
                    </th>
                  ) : (
                    <th key={h} style={{ textAlign: "left", padding: "0.75rem 1rem", color: "var(--text-hint)", fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                  )
                ))}
              </tr>
            </thead>
            <tbody>
              {users
                .filter(u => brandFilter === "all" || brandOf(u).brand === brandFilter)
                .slice()
                .sort((a, b) => {
                  if (brandSort === "none") return 0; // keep created_at order
                  const rank = (u: AdminUser) => (brandOf(u).brand === brandSort ? 0 : 1);
                  return rank(a) - rank(b);
                })
                .map(u => {
                const cfg = ROLE_CONFIG[u.role];
                const Icon = cfg.icon;
                const isSelf = u.id === currentUser?.id;
                const isSuperAdmin = u.role === "superadmin";

                return (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--color-surface-200)" }}>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ color: "var(--text-body)", fontWeight: 500 }}>{u.email}</div>
                      {u.name && <div style={{ color: "var(--text-hint)", fontSize: "0.72rem" }}>{u.name}</div>}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      {(() => {
                        const b = brandOf(u);
                        const known = b.brand === "relatti" || b.brand === "masterytv";
                        return (
                          <span
                            className={`ad-brand-chip ad-brand-chip--${known ? b.brand : "unattributed"}${b.derived ? " ad-brand-chip--derived" : ""}`}
                            title={b.derived
                              ? "Derived from relationship data — account pre-dates signup stamping"
                              : "Stamped at signup"}
                          >
                            {BRAND_LABELS[b.brand] ?? b.brand}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", color: cfg.color, fontSize: "0.78rem", fontWeight: 500 }}>
                        <Icon size={13} />
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", textTransform: "capitalize" }}>
                      {u.decoded_tier}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>
                      {u.daily_message_count}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-hint)", fontSize: "0.78rem" }}>
                      {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      {isSuperAdmin || isSelf ? (
                        <span style={{ fontSize: "0.72rem", color: "var(--text-hint)" }}>
                          {isSelf ? "You" : "Protected"}
                        </span>
                      ) : (
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          {u.role === "user" ? (
                            <button
                              onClick={() => handleRoleChange(u.id, "admin")}
                              disabled={updating === u.id}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: "0.3rem",
                                padding: "0.3rem 0.75rem", borderRadius: "6px", fontSize: "0.75rem",
                                fontWeight: 500, cursor: "pointer", border: "1px solid rgba(96,99,238,0.3)",
                                background: "rgba(96,99,238,0.08)", color: "#a3a6ff",
                                opacity: updating === u.id ? 0.5 : 1,
                              }}
                            >
                              {updating === u.id ? <Loader2 size={11} className="animate-spin" /> : <Shield size={11} />}
                              Make Admin
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRoleChange(u.id, "user")}
                              disabled={updating === u.id}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: "0.3rem",
                                padding: "0.3rem 0.75rem", borderRadius: "6px", fontSize: "0.75rem",
                                fontWeight: 500, cursor: "pointer", border: "1px solid var(--color-surface-300)",
                                background: "var(--color-surface-200)", color: "var(--text-secondary)",
                                opacity: updating === u.id ? 0.5 : 1,
                              }}
                            >
                              {updating === u.id ? <Loader2 size={11} className="animate-spin" /> : <ShieldOff size={11} />}
                              Demote
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
