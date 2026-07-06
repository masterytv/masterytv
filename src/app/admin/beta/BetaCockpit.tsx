"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, ClipboardCheck, Send, CheckCircle2, MessageSquareText,
  MessageSquare, Sunrise, Clock, UserCheck, ChevronRight, ChevronDown, Search,
  KeyRound, Plus, Copy, Check, Power,
} from "lucide-react";
import { FUNNEL_STAGES, type Tester, type CohortMetrics, type BetaCode } from "./funnel";

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

export default function BetaCockpit({ testers, metrics, codes }: { testers: Tester[]; metrics: CohortMetrics; codes: BetaCode[] }) {
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

        {/* Invite codes */}
        <BetaCodesPanel codes={codes} />

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
                                {t.codeRedeemed && <span>Code {t.codeRedeemed}</span>}
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

/** Admin panel to create + activate/deactivate invite codes. Server data is
 *  re-fetched via router.refresh() after each mutation. */
function BetaCodesPanel({ codes }: { codes: BetaCode[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [days, setDays] = useState("");
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  async function create() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/beta-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          maxUses: Number(maxUses) || 1,
          expiresInDays: days ? Number(days) : undefined,
          code: custom,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not create code.");
        return;
      }
      setLabel("");
      setMaxUses("1");
      setDays("");
      setCustom("");
      router.refresh();
    } catch {
      setError("Could not create code.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: string, active: boolean) {
    await fetch("/api/admin/beta-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", id, active }),
    });
    router.refresh();
  }

  function copy(code: string) {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500);
    });
  }

  return (
    <div className="ad-table-wrap">
      <div className="ad-table-header" style={{ alignItems: "flex-start", flexDirection: "column", gap: "0.75rem" }}>
        <span className="ad-table-header__title">Invite codes ({codes.length})</span>
        <div className="ad-beta-form">
          <input className="ad-beta-input" style={{ minWidth: 180 }} placeholder="Label (e.g. Friends & family)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <input className="ad-beta-input" style={{ width: 92 }} type="number" min={1} placeholder="Max uses" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          <input className="ad-beta-input" style={{ width: 118 }} type="number" min={1} placeholder="Expires (days)" value={days} onChange={(e) => setDays(e.target.value)} />
          <input className="ad-beta-input" style={{ width: 140 }} placeholder="Custom code (opt.)" value={custom} onChange={(e) => setCustom(e.target.value.toUpperCase())} />
          <button className="ad-beta-btn" onClick={create} disabled={busy}>
            <Plus size={14} /> {busy ? "Creating…" : "Create code"}
          </button>
        </div>
        {error && <span style={{ fontSize: "0.75rem", color: "var(--danger-hex)" }}>{error}</span>}
      </div>

      {codes.length === 0 ? (
        <div className="ad-beta-empty">No codes yet — create one to gate the beta.</div>
      ) : (
        <table className="ad-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Label</th>
              <th>Used</th>
              <th>Expires</th>
              <th>Status</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => {
              const exhausted = c.uses >= c.maxUses;
              const expired = c.expiresAt != null && new Date(c.expiresAt).getTime() <= Date.now();
              return (
                <tr key={c.id}>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                      <KeyRound size={13} style={{ color: "var(--color-primary)" }} />
                      <span className="ad-beta-code-mono">{c.code}</span>
                      <button className="ad-beta-iconbtn" onClick={() => copy(c.code)} aria-label="Copy code">
                        {copied === c.code ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </span>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>{c.label || <span className="ad-beta-muted">—</span>}</td>
                  <td>
                    {c.uses} <span className="ad-beta-muted">/ {c.maxUses}</span>
                  </td>
                  <td style={{ color: "var(--text-hint)", fontSize: "0.78rem" }}>{c.expiresAt ? shortDate(c.expiresAt) : "never"}</td>
                  <td>
                    <span className={`ad-badge ${c.active && !exhausted && !expired ? "ad-badge--active" : "ad-badge--danger"}`}>
                      {!c.active ? "off" : expired ? "expired" : exhausted ? "full" : "live"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="ad-beta-iconbtn"
                      onClick={() => toggle(c.id, !c.active)}
                      aria-label={c.active ? "Deactivate" : "Activate"}
                      title={c.active ? "Deactivate" : "Activate"}
                    >
                      <Power size={14} style={{ color: c.active ? "var(--success-hex)" : "var(--text-disabled)" }} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
