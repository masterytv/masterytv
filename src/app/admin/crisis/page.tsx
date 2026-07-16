"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { brandForProgram } from "@/lib/platform/brand";

interface CrisisFlag {
  id: string;
  user_id: string;
  severity: "high" | "moderate";
  matched_keywords: string[];
  llm_confirmed: boolean;
  message_excerpt: string;
  reviewed: boolean;
  reviewed_at: string | null;
  created_at: string;
  // PC5.4 — resolved program stamped at detection time. null = pre-stamp row,
  // or a channel Tier-1 flag (keyword hard-stop runs before program resolution).
  program: string | null;
}

type FilterTab = "all" | "unresolved" | "resolved";
type BrandTab = "all" | "relatti" | "masterytv" | "unattributed";

// program → brand via the registry (brandForProgram); unstamped flags are
// deliberately "unattributed", never guessed.
function brandOfFlag(f: CrisisFlag): "relatti" | "masterytv" | "unattributed" {
  if (!f.program) return "unattributed";
  return brandForProgram(f.program).id;
}

const BRAND_TAB_LABELS: Record<BrandTab, string> = {
  all: "All brands",
  relatti: "Relatti",
  masterytv: "MasteryTV",
  unattributed: "Unattributed",
};

export default function AdminCrisisPage() {
  const [flags, setFlags] = useState<CrisisFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("unresolved");
  const [brandTab, setBrandTab] = useState<BrandTab>("all");
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-data?action=crisis-flags`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFlags(data.flags);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleResolve = async (flagId: string) => {
    setResolving(flagId);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-data?action=resolve-crisis`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ flag_id: flagId }),
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Optimistic update
      setFlags(prev =>
        prev.map(f =>
          f.id === flagId
            ? { ...f, reviewed: true, reviewed_at: new Date().toISOString() }
            : f
        )
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setResolving(null);
    }
  };

  // Safety visibility stays UNIFIED — one list, filterable, never split per
  // admin (PC5.4). The brand filter narrows the view; it never hides a queue.
  const filtered = flags.filter(f => {
    if (filter === "unresolved" && f.reviewed) return false;
    if (filter === "resolved" && !f.reviewed) return false;
    if (brandTab !== "all" && brandOfFlag(f) !== brandTab) return false;
    return true;
  });

  const unresolvedCount = flags.filter(f => !f.reviewed).length;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="ad-page">
      <div className="ad-page__inner">
        {/* Header */}
        <div className="ad-header">
          <h1 className="ad-header__title">
            Crisis Flags
            {unresolvedCount > 0 && (
              <span
                style={{
                  marginLeft: "0.75rem",
                  fontSize: "0.9rem",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--danger-tint)",
                  color: "var(--danger-hex)",
                  fontWeight: 600,
                  verticalAlign: "middle",
                }}
              >
                {unresolvedCount}
              </span>
            )}
          </h1>
          <p className="ad-header__subtitle">
            Messages flagged by the crisis detection system for human review
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
            {error}
          </div>
        )}

        {/* Filter tabs */}
        <div className="ad-filters">
          {(["all", "unresolved", "resolved"] as FilterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`ad-filter-btn ${filter === tab ? "ad-filter-btn--active" : ""}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === "unresolved" && unresolvedCount > 0 && ` (${unresolvedCount})`}
            </button>
          ))}
        </div>

        {/* PC5.4 — brand filter. One unified safety list, narrowed not split. */}
        <div className="ad-filters">
          {(["all", "relatti", "masterytv", "unattributed"] as BrandTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setBrandTab(tab)}
              className={`ad-filter-btn ${brandTab === tab ? "ad-filter-btn--active" : ""}`}
            >
              {BRAND_TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="ad-skeleton ad-skeleton--row" />
            ))}
          </div>
        )}

        {/* Table */}
        {!loading && filtered.length === 0 && (
          <div className="ad-empty">
            {filter === "unresolved"
              ? "No unresolved crisis flags — all clear. When Tier-1 keywords or the Tier-2 conversation sweep detect risk on any vertical (Relatti relationship coaching or the MasteryTV executive coach, across web, email, and Telegram), flags appear here with their brand."
              : "No crisis flags found for this filter."}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Brand</th>
                  <th>Keywords</th>
                  <th>Message Excerpt</th>
                  <th>LLM Confirmed</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(flag => (
                  <tr key={flag.id}>
                    <td>
                      <span className={`ad-badge ad-badge--${flag.severity}`}>
                        {flag.severity}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`ad-brand-chip ad-brand-chip--${brandOfFlag(flag)}`}
                        title={flag.program
                          ? `Program: ${flag.program}`
                          : "No program stamp — pre-stamp row, or a channel Tier-1 flag (keyword check runs before program resolution)"}
                      >
                        {BRAND_TAB_LABELS[brandOfFlag(flag)]}
                      </span>
                    </td>
                    <td>
                      <div className="ad-keywords">
                        {(flag.matched_keywords ?? []).map((kw, i) => (
                          <span key={i} className="ad-keyword">{kw}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="ad-excerpt">{flag.message_excerpt}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.95rem" }}>
                        {flag.llm_confirmed ? "✓" : "✗"}
                      </span>
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                      {formatDate(flag.created_at)}
                    </td>
                    <td>
                      <span
                        className={`ad-badge ${flag.reviewed ? "ad-badge--resolved" : "ad-badge--high"}`}
                      >
                        {flag.reviewed ? "Resolved" : "Open"}
                      </span>
                    </td>
                    <td>
                      {!flag.reviewed && (
                        <button
                          onClick={() => handleResolve(flag.id)}
                          disabled={resolving === flag.id}
                          className="ad-action-btn ad-action-btn--resolve"
                        >
                          {resolving === flag.id ? "..." : "Resolve"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
