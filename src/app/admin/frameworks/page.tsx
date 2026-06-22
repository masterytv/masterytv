"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Framework {
  id: string;
  name: string;
  tier: number;
  category: string;
  description: string | null;
  is_active: boolean;
  selection_weight: number;
  requires_trust_level: number;
  usage_count: number;
}

export default function AdminFrameworksPage() {
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchFrameworks = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-data?action=frameworks`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFrameworks(data.frameworks);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFrameworks();
  }, [fetchFrameworks]);

  const updateFramework = async (
    frameworkId: string,
    updates: { is_active?: boolean; selection_weight?: number }
  ) => {
    setSaving(frameworkId);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-data?action=update-framework`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            framework_id: frameworkId,
            ...updates,
          }),
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Optimistic update
      setFrameworks(prev =>
        prev.map(f =>
          f.id === frameworkId ? { ...f, ...updates } : f
        )
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const tierLabels: Record<number, string> = {
    1: "Foundation",
    2: "Business",
    3: "Advanced",
    4: "Deep Psychology",
  };

  const activeCount = frameworks.filter(f => f.is_active).length;
  const totalUsage = frameworks.reduce((sum, f) => sum + f.usage_count, 0);

  return (
    <div className="ad-page">
      <div className="ad-page__inner">
        {/* Header */}
        <div className="ad-header">
          <h1 className="ad-header__title">Framework Management</h1>
          <p className="ad-header__subtitle">
            Configure coaching frameworks — toggle availability and adjust selection weights
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              background: "var(--danger-tint)",
              color: "var(--danger-hex)",
              fontSize: "0.85rem",
              marginBottom: "1.5rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Summary cards */}
        {!loading && (
          <div className="ad-metrics" style={{ marginBottom: "1.5rem" }}>
            <div className="ad-metric-card">
              <div className="ad-metric-card__label">Active Frameworks</div>
              <div className="ad-metric-card__value">
                {activeCount}/{frameworks.length}
              </div>
            </div>
            <div className="ad-metric-card">
              <div className="ad-metric-card__label">Total Usage Events</div>
              <div className="ad-metric-card__value">{totalUsage}</div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="ad-skeleton ad-skeleton--row" />
            ))}
          </div>
        )}

        {/* Framework table */}
        {!loading && frameworks.length > 0 && (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Framework</th>
                  <th>Tier</th>
                  <th>Category</th>
                  <th>Trust Req</th>
                  <th>Usage</th>
                  <th>Weight</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {frameworks.map(fw => (
                  <tr
                    key={fw.id}
                    style={{ opacity: fw.is_active ? 1 : 0.5 }}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-heading)" }}>
                        {fw.name}
                      </div>
                      {fw.description && (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-hint)",
                            marginTop: "0.15rem",
                            maxWidth: "280px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {fw.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        className={`ad-badge ad-badge--tier-${fw.tier}`}
                      >
                        T{fw.tier}: {tierLabels[fw.tier] || `Tier ${fw.tier}`}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem" }}>{fw.category}</td>
                    <td style={{ textAlign: "center" }}>≥{fw.requires_trust_level}</td>
                    <td style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                      {fw.usage_count}
                    </td>
                    <td>
                      <div className="ad-weight-slider">
                        <input
                          type="range"
                          className="ad-weight-slider__input"
                          min="0"
                          max="2"
                          step="0.1"
                          value={fw.selection_weight}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            // Optimistic local update
                            setFrameworks(prev =>
                              prev.map(f =>
                                f.id === fw.id
                                  ? { ...f, selection_weight: val }
                                  : f
                              )
                            );
                          }}
                          onMouseUp={(e) => {
                            const val = parseFloat((e.target as HTMLInputElement).value);
                            updateFramework(fw.id, { selection_weight: val });
                          }}
                          onTouchEnd={(e) => {
                            const val = parseFloat((e.target as HTMLInputElement).value);
                            updateFramework(fw.id, { selection_weight: val });
                          }}
                        />
                        <span className="ad-weight-slider__value">
                          {fw.selection_weight.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <button
                        className={`ad-toggle ${fw.is_active ? "ad-toggle--on" : "ad-toggle--off"}`}
                        onClick={() =>
                          updateFramework(fw.id, { is_active: !fw.is_active })
                        }
                        disabled={saving === fw.id}
                        aria-label={`Toggle ${fw.name}`}
                      >
                        <span className="ad-toggle__knob" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && frameworks.length === 0 && (
          <div className="ad-empty">
            No frameworks configured yet.
          </div>
        )}
      </div>
    </div>
  );
}
