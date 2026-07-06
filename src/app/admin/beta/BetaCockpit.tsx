"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Users, ClipboardCheck, Send, CheckCircle2, MessageSquareText,
  MessageSquare, Sunrise, Clock, UserCheck, ChevronRight, ChevronDown, Search,
} from "lucide-react";
import { FUNNEL_STAGES, type Tester, type CohortMetrics } from "./funnel";

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const wks = Math.floor(days / 7);
  if (wks < 5) return `${wks}w ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** 6 dots filled to the tester's furthest milestone; last dot greens at "both active". */
function StageDots({ stage }: { stage: number }) {
  return (
    <span className="ad-beta-dots" aria-label={`Stage: ${FUNNEL_STAGES[stage]}`}>
      {FUNNEL_STAGES.map((_, i) => (
        <span
          key={i}
          className={`ad-beta-dot${stage >= i ? " is-on" : ""}${stage >= i && i === FUNNEL_STAGES.length - 1 ? " is-final" : ""}`}
        />
      ))}
    </span>
  );
}

interface MetricCardProps { icon: React.ReactNode; label: string; value: string; hint?: string; }
function MetricCard({ icon, label, value, hint }: MetricCardProps) {
  return (
    <div className="ad-metric-card">
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-disabled)" }}>
        {icon}
        <span className="ad-metric-card__label">{label}</span>
      </div>
      <span className="ad-metric-card__value">{value}</span>
      {hint && <span className="ad-metric-card__hint">{hint}</span>}
    </div>
  );
}

export default function BetaCockpit({ testers, metrics }: { testers: Tester[]; metrics: CohortMetrics }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return testers;
    return testers.filter(
      (t) => t.email.toLowerCase().includes(q) || (t.name ?? "").toLowerCase().includes(q),
    );
  }, [testers, query]);

  // Per-milestone counts for the funnel bar (independent, real counts — not derived
  // from the max-stage, so drop-off between steps is accurate).
  const funnelCounts = useMemo(() => {
    const n = testers.length || 1;
    const counts = [
      testers.length,
      testers.filter((t) => t.startedAssessment).length,
      testers.filter((t) => t.hasReport).length,
      testers.filter((t) => t.invitesSent > 0 || t.dyads.length > 0).length,
      testers.filter((t) => t.partnerJoined).length,
      testers.filter((t) => t.bothActive).length,
    ];
    return counts.map((c) => ({ count: c, pct: Math.round((c / n) * 100) }));
  }, [testers]);

  return (
    <div className="ad-content">
      <div className="ad-content__inner">
        <h1 className="ad-page-title">Beta Cockpit</h1>
        <p style={{ color: "var(--text-hint)", fontSize: "0.85rem", marginTop: "-1.25rem", marginBottom: "1.75rem" }}>
          The tester funnel, reconstructed from the spine. Invite&nbsp;→&nbsp;claim is the metric that matters.
        </p>

        {/* Cohort metrics */}
        <div className="ad-metrics">
          <MetricCard icon={<Users size={14} />} label="Testers" value={String(metrics.testers)} hint="signed up" />
          <MetricCard
            icon={<ClipboardCheck size={14} />}
            label="Assessment done"
            value={`${metrics.completedAssessment}/${metrics.testers}`}
            hint={`${metrics.startedAssessment} started`}
          />
          <MetricCard
            icon={<Send size={14} />}
            label="Invites → claims"
            value={`${metrics.invitesClaimed} / ${metrics.invitesSent}`}
            hint={metrics.claimRatePct === null ? "no invites yet" : `${metrics.claimRatePct}% claimed · the metric`}
          />
          <MetricCard
            icon={<CheckCircle2 size={14} />}
            label="Active dyads"
            value={String(metrics.dyadsBothActive)}
            hint={`${metrics.dyadsPartnerJoined} with partner joined`}
          />
          <MetricCard icon={<MessageSquareText size={14} />} label="Feedback" value={String(metrics.feedbackCount)} hint="submissions" />
        </div>

        {/* Funnel bar */}
        <div className="ad-beta-funnel">
          {FUNNEL_STAGES.map((label, i) => (
            <div className="ad-beta-funnel__stage" key={label}>
              <span className="ad-beta-funnel__count">{funnelCounts[i].count}</span>
              <span className="ad-beta-funnel__label">{label}</span>
              <div className="ad-beta-funnel__bar" style={{ width: `${Math.max(funnelCounts[i].pct, 4)}%` }} />
            </div>
          ))}
        </div>

        {/* Tester table */}
        <div className="ad-table-wrap">
          <div className="ad-table-header">
            <span className="ad-table-header__title">Testers ({filtered.length})</span>
            <div className="ad-table-search">
              <Search className="ad-table-search__icon" />
              <input
                className="ad-table-search__input"
                placeholder="Search email or name"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="ad-beta-empty">No testers match.</div>
          ) : (
            <table className="ad-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }} />
                  <th>Tester</th>
                  <th>Stage</th>
                  <th>Invites</th>
                  <th>Msgs</th>
                  <th>Rituals</th>
                  <th>Last seen</th>
                  <th>Feedback</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const isOpen = open.has(t.id);
                  return (
                    <Fragment key={t.id}>
                      <tr className={isOpen ? "ad-beta-row--open" : undefined}>
                        <td>
                          <button className="ad-beta-toggle" onClick={() => toggle(t.id)} aria-label={isOpen ? "Collapse" : "Expand"}>
                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div>
                              <div style={{ color: "var(--text-heading)", fontWeight: 500 }}>{t.email}</div>
                              {t.name && <div style={{ color: "var(--text-hint)", fontSize: "0.72rem" }}>{t.name}</div>}
                            </div>
                            {t.betaAccess && <span className="ad-badge ad-badge--active">Beta</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <StageDots stage={t.stage} />
                            <span className="ad-beta-stage-label">{FUNNEL_STAGES[t.stage]}</span>
                          </div>
                        </td>
                        <td>
                          {t.invitesSent === 0 ? (
                            <span className="ad-beta-muted">—</span>
                          ) : (
                            <span style={{ color: "var(--text-body)" }}>
                              {t.invitesClaimed} <span className="ad-beta-muted">/ {t.invitesSent}</span>
                            </span>
                          )}
                        </td>
                        <td style={{ color: t.messageCount ? "var(--text-body)" : undefined }}>
                          {t.messageCount || <span className="ad-beta-muted">—</span>}
                        </td>
                        <td>{t.ritualCount || <span className="ad-beta-muted">—</span>}</td>
                        <td style={{ color: "var(--text-hint)", fontSize: "0.78rem" }}>{relativeTime(t.lastActivity)}</td>
                        <td>
                          {t.feedback.length ? (
                            <span className="ad-badge ad-badge--free">{t.feedback.length}</span>
                          ) : (
                            <span className="ad-beta-muted">—</span>
                          )}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={8} style={{ padding: 0 }}>
                            <div className="ad-beta-detail">
                              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", fontSize: "0.78rem", color: "var(--text-hint)" }}>
                                <span>Signed up {shortDate(t.createdAt)}</span>
                                <span>Report {shortDate(t.reportAt)}</span>
                                <span>Plan {t.tier ?? "—"}</span>
                              </div>

                              <div className="ad-beta-detail__group">
                                <div className="ad-beta-detail__title">Relationships</div>
                                {t.dyads.length === 0 ? (
                                  <div className="ad-beta-muted" style={{ fontSize: "0.8rem" }}>No dyad yet.</div>
                                ) : (
                                  t.dyads.map((d) => (
                                    <div className="ad-beta-dyad" key={d.engagementId}>
                                      <UserCheck size={14} color={d.partnerJoined ? "var(--success-hex)" : "var(--text-disabled)"} />
                                      <span style={{ color: "var(--text-heading)" }}>{d.partnerLabel}</span>
                                      <span
                                        className={`ad-badge ${d.bothActive ? "ad-badge--active" : "ad-badge--free"}`}
                                      >
                                        {d.bothActive ? "both active" : d.partnerJoined ? "partner joined" : "awaiting partner"}
                                      </span>
                                      <span className="ad-beta-muted">· engagement {d.status}</span>
                                    </div>
                                  ))
                                )}
                              </div>

                              <div className="ad-beta-detail__group">
                                <div className="ad-beta-detail__title">
                                  Activity — {t.messageCount} messages · {t.ritualCount} rituals
                                </div>
                                <div style={{ display: "flex", gap: "1.25rem", fontSize: "0.78rem", color: "var(--text-hint)" }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                                    <MessageSquare size={13} /> last {relativeTime(t.lastActivity)}
                                  </span>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                                    <Sunrise size={13} /> {t.ritualCount} ritual{t.ritualCount === 1 ? "" : "s"}
                                  </span>
                                </div>
                              </div>

                              {t.feedback.length > 0 && (
                                <div className="ad-beta-detail__group">
                                  <div className="ad-beta-detail__title">Feedback ({t.feedback.length})</div>
                                  {t.feedback.map((f) => (
                                    <div className="ad-beta-feedback" key={f.id}>
                                      <div className="ad-beta-feedback__meta">
                                        <span className="ad-badge ad-badge--free">{f.category}</span>
                                        {f.rating != null && (
                                          <span style={{ fontSize: "0.72rem", color: "var(--text-hint)" }}>rating {f.rating}/5</span>
                                        )}
                                        <span className="ad-badge ad-badge--core">{f.status}</span>
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.72rem", color: "var(--text-disabled)" }}>
                                          <Clock size={11} /> {shortDate(f.createdAt)}
                                        </span>
                                      </div>
                                      <div className="ad-beta-feedback__msg">{f.message}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
