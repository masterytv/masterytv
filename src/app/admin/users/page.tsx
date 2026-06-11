"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { Loader2, Shield, ShieldOff, ShieldCheck } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "superadmin";
  created_at: string;
  decoded_tier: string;
  daily_message_count: number;
}

const ROLE_CONFIG = {
  superadmin: { label: "Super Admin", icon: ShieldCheck, color: "#a3a6ff" },
  admin: { label: "Admin", icon: Shield, color: "#34d399" },
  user: { label: "User", icon: ShieldOff, color: "var(--text-hint)" },
} as const;

export default function UsersPage() {
  const { user: currentUser } = useUser();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [toast, setToast] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("users")
      .select("id, email, name, role, created_at, decoded_tier, daily_message_count")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setUsers(data as AdminUser[]);
        setLoading(false);
      });
  }, []);

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

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--text-hint)" }} />
      ) : (
        <div style={{ background: "var(--color-surface-100)", borderRadius: "12px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-surface-300)" }}>
                {["User", "Role", "Plan", "Messages Today", "Joined", "Actions"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "0.75rem 1rem", color: "var(--text-hint)", fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
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
