"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface AdminMetrics {
  users: {
    total: number;
    free: number;
    core: number;
    premium: number;
    newThisWeek: number;
  };
  engagement: {
    dau: number;
    avgMessagesPerUser: number;
    activeUsers7d: number;
  };
  revenue: {
    mrr: number;
    conversionRate: number;
  };
  costs: {
    total30d: number;
    avgPerUser: number;
    byModel: Record<string, number>;
  };
  crisisFlags: number;
}

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-data?action=metrics`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setMetrics(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return (
    <div className="ad-page">
      <div className="ad-page__inner">
        {/* Header */}
        <div className="ad-header">
          <h1 className="ad-header__title">Dashboard Overview</h1>
          <p className="ad-header__subtitle">
            Real-time metrics for the Mastery Coach platform
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

        {/* Loading skeletons */}
        {loading && (
          <div className="ad-metrics">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="ad-skeleton ad-skeleton--card" />
            ))}
          </div>
        )}

        {/* Metrics cards */}
        {metrics && (
          <>
            <div className="ad-metrics">
              {/* Users */}
              <div className="ad-metric-card">
                <div className="ad-metric-card__label">Total Users</div>
                <div className="ad-metric-card__value">{metrics.users.total}</div>
                <div className="ad-metric-card__sub">
                  +{metrics.users.newThisWeek} this week
                </div>
                <div className="ad-tier-pills">
                  <span className="ad-tier-pill ad-tier-pill--free">
                    Free: {metrics.users.free}
                  </span>
                  <span className="ad-tier-pill ad-tier-pill--core">
                    Core: {metrics.users.core}
                  </span>
                  <span className="ad-tier-pill ad-tier-pill--premium">
                    Premium: {metrics.users.premium}
                  </span>
                </div>
              </div>

              {/* DAU */}
              <div className="ad-metric-card">
                <div className="ad-metric-card__label">Daily Active Users</div>
                <div className="ad-metric-card__value">{metrics.engagement.dau}</div>
                <div className="ad-metric-card__sub">
                  {metrics.engagement.activeUsers7d} active this week
                </div>
              </div>

              {/* Avg Messages */}
              <div className="ad-metric-card">
                <div className="ad-metric-card__label">Avg Messages / User (7d)</div>
                <div className="ad-metric-card__value">
                  {metrics.engagement.avgMessagesPerUser}
                </div>
              </div>

              {/* MRR */}
              <div className="ad-metric-card">
                <div className="ad-metric-card__label">Monthly Recurring Revenue</div>
                <div className="ad-metric-card__value ad-metric-card__value--success">
                  ${metrics.revenue.mrr.toLocaleString()}
                </div>
                <div className="ad-metric-card__sub">
                  {metrics.revenue.conversionRate}% conversion rate
                </div>
              </div>

              {/* LLM Costs */}
              <div className="ad-metric-card">
                <div className="ad-metric-card__label">LLM Costs (30d)</div>
                <div className="ad-metric-card__value">
                  ${metrics.costs.total30d.toFixed(2)}
                </div>
                <div className="ad-metric-card__sub">
                  ${metrics.costs.avgPerUser}/user avg
                </div>
              </div>
            </div>

            {/* Crisis flags callout */}
            {metrics.crisisFlags > 0 && (
              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--danger-tint)",
                  border: "1px solid var(--danger-border)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "1.5rem",
                }}
              >
                <span style={{ fontSize: "1.25rem" }}>🚨</span>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--danger-hex)", fontSize: "0.9rem" }}>
                    {metrics.crisisFlags} unresolved crisis flag{metrics.crisisFlags !== 1 ? "s" : ""}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-body)", marginTop: "0.15rem" }}>
                    <a
                      href="/coachapp/admin/crisis"
                      style={{ color: "var(--danger-hex)", textDecoration: "underline" }}
                    >
                      Review now →
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Cost breakdown by model */}
            {Object.keys(metrics.costs.byModel).length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <h2 className="ad-section-title">Cost Breakdown by Model (30d)</h2>
                <div className="ad-table-wrap">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>Model</th>
                        <th>Cost (USD)</th>
                        <th>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(metrics.costs.byModel)
                        .sort(([, a], [, b]) => b - a)
                        .map(([model, cost]) => (
                          <tr key={model}>
                            <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                              {model}
                            </td>
                            <td>${cost.toFixed(4)}</td>
                            <td>
                              {metrics.costs.total30d > 0
                                ? Math.round((cost / metrics.costs.total30d) * 100)
                                : 0}%
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
