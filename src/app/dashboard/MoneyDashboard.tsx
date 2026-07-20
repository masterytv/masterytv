"use client";

/**
 * The Money Decision Room — money's bespoke primary surface (MONEY_EXPERIENCE.md
 * §8, the founder-pinned V1 spine; ADR-P03: bespoke, NOT a re-themed executive
 * dashboard or report viewer).
 *
 * The user brings a live money decision → the money coach applies their WHOLE
 * trait profile to it in a thread (Layer 4.5) → they leave a WRITTEN DECISION
 * RECORD here. This decision log is the Money OS's (§9) first durable artifact and
 * the retention spine. The richer Money OS living-doc fields (enough-number,
 * non-negotiables, mission, self-sabotage patterns) are the next phase.
 *
 * Data is loaded CLIENT-side (loadMyMoneyMap + listMyDecisions) and degrades
 * gracefully: the money_decisions table is a STAGED migration (applied on a
 * founder "go"), and money is dark/undeployed, so an absent table simply yields an
 * empty log — never a crash. The shared server page.tsx must never read the table
 * (it serves every brand; a missing-table throw there would break all of them).
 *
 * BRAND.md: semantic tokens only (money's emerald [data-brand="money"] palette
 * resolves in both themes with no per-brand rules here); Lucide marks only
 * (Compass/ArrowRight/Check/MessageSquare/PenLine/Undo2 — never Sparkles/Zap);
 * public strings use the LOCKED mechanic name "MoneyTraits". FTC: process + felt
 * change, never wealth outcomes.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Compass, ArrowRight, Check, MessageSquare, PenLine, Undo2 } from "lucide-react";
import { loadMyMoneyMap } from "@/lib/decoded/load-my-money-map";
import type { StoredMoneyMap } from "@/lib/decoded/scoring/money-maps";
import { describeFear } from "@/components/money/money-map-card-format";
import {
  listMyDecisions,
  createDecision,
  markDecided,
  reopenDecision,
  type MoneyDecision,
} from "@/lib/decoded/money-decisions";
import "@/components/money/decision-room.css";

// A few founder-native decisions (MONEY_EXPERIENCE.md §8) to break blank-page
// paralysis — tapping one prefills the composer, never auto-submits.
const EXAMPLE_DECISIONS = [
  "Raise a round, or bootstrap another year?",
  "Drop my price to close this deal?",
  "Hire now, or wait another quarter?",
  "Walk away from this client?",
];

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function MoneyDashboard({
  userName,
  hasAssessment,
  userId,
  programSlug,
}: {
  userName: string;
  hasAssessment: boolean;
  userId: string;
  programSlug: string;
}) {
  const router = useRouter();
  const [moneyMap, setMoneyMap] = useState<StoredMoneyMap | null>(null);
  // null = still loading; [] = loaded, none yet (or table not applied).
  const [decisions, setDecisions] = useState<MoneyDecision[] | null>(null);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Which decision is currently capturing its record, and the draft text.
  const [capturingId, setCapturingId] = useState<string | null>(null);
  const [captureText, setCaptureText] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !hasAssessment) {
      setDecisions([]);
      return;
    }
    let cancelled = false;
    loadMyMoneyMap(userId, programSlug)
      .then((m) => !cancelled && setMoneyMap(m))
      .catch(() => {});
    listMyDecisions(userId, programSlug)
      .then((d) => !cancelled && setDecisions(d))
      .catch(() => !cancelled && setDecisions([]));
    return () => {
      cancelled = true;
    };
  }, [userId, programSlug, hasAssessment]);

  async function handleCreate() {
    const clean = title.trim();
    if (!clean || creating) return;
    setCreating(true);
    setCreateError(null);
    // Pre-generate the coach thread id so the decision links straight back to it
    // (the coach fn creates the conversation under this id on the first turn).
    const conversationId = crypto.randomUUID();
    const row = await createDecision(userId, programSlug, clean, conversationId);
    if (!row) {
      setCreating(false);
      setCreateError("Couldn't start that just now. Try again in a moment.");
      return;
    }
    router.push(
      `/dashboard/chat?c=${conversationId}&context=money_decision&topic=${encodeURIComponent(clean)}`,
    );
  }

  async function handleSaveRecord(id: string) {
    const text = captureText.trim();
    if (!text || savingId) return;
    setSavingId(id);
    const ok = await markDecided(id, text);
    setSavingId(null);
    if (!ok) return;
    setDecisions((prev) =>
      (prev ?? []).map((d) =>
        d.id === id
          ? { ...d, status: "decided", resolution: text, decided_at: new Date().toISOString() }
          : d,
      ),
    );
    setCapturingId(null);
    setCaptureText("");
  }

  async function handleReopen(id: string) {
    const ok = await reopenDecision(id);
    if (!ok) return;
    setDecisions((prev) =>
      (prev ?? []).map((d) =>
        d.id === id ? { ...d, status: "open", resolution: d.resolution, decided_at: null } : d,
      ),
    );
  }

  // ── No assessment yet → the door to MoneyTraits (Rung 0). ──
  if (!hasAssessment) {
    return (
      <div className="dr-root">
        <div className="dr-gate">
          <span className="dr-gate__mark">
            <Compass size={26} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h1 className="dr-gate__title">Welcome, {userName}</h1>
          <p className="dr-gate__body">
            The Decision Room is where you bring a real money decision and think it through with a
            coach who knows how you&apos;re wired. It starts with MoneyTraits — a 3-minute measure of
            the psychology under your money calls.
          </p>
          <Link href="/assess" className="dr-btn dr-btn--primary dr-gate__cta">
            Measure my traits
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  const open = (decisions ?? []).filter((d) => d.status !== "decided");
  const decided = (decisions ?? []).filter((d) => d.status === "decided");

  return (
    <div className="dr-root">
      <div className="dr-container">
        {/* Identity + the coaching anchor */}
        <header className="dr-header">
          <div className="dr-eyebrow">
            <Compass size={14} strokeWidth={2} aria-hidden="true" />
            <span>MoneyTraits™ · Decision Room</span>
          </div>
          <h1 className="dr-title">The Decision Room</h1>
          <p className="dr-lede">
            Bring a real money decision. Your coach thinks it through with your whole trait profile —
            and you keep the record of what you decided, and why.
          </p>
          {moneyMap && (
            <Link href="/dashboard/chat" className="dr-anchor">
              <span className="dr-anchor__label">Coaching from</span>
              <span className="dr-anchor__type">{moneyMap.archetype}</span>
              <span className="dr-anchor__sep" aria-hidden="true">·</span>
              <span className="dr-anchor__leap">
                The Fear: {describeFear(moneyMap.leap.band, moneyMap.leap.tilt)}
              </span>
            </Link>
          )}
        </header>

        {/* The composer — bring a decision */}
        <section className="dr-composer" aria-label="Bring a decision">
          <label htmlFor="dr-decision-input" className="dr-composer__label">
            What are you deciding?
          </label>
          <div className="dr-composer__row">
            <input
              id="dr-decision-input"
              ref={inputRef}
              className="dr-composer__input"
              type="text"
              value={title}
              maxLength={300}
              placeholder="e.g. Raise a round, or bootstrap another year?"
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
            <button
              type="button"
              className="dr-btn dr-btn--primary dr-composer__submit"
              onClick={handleCreate}
              disabled={!title.trim() || creating}
            >
              {creating ? "Opening…" : "Think it through"}
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
          {createError && <p className="dr-composer__error">{createError}</p>}
          <div className="dr-examples">
            {EXAMPLE_DECISIONS.map((ex) => (
              <button
                key={ex}
                type="button"
                className="dr-example"
                onClick={() => {
                  setTitle(ex);
                  inputRef.current?.focus();
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        </section>

        {/* Loading shimmer line while the log resolves */}
        {decisions === null && <p className="dr-loading">Loading your decisions…</p>}

        {/* First-run: assessment done, no decisions yet */}
        {decisions !== null && decisions.length === 0 && (
          <p className="dr-empty">
            No decisions yet. When a real one is weighing on you, name it above — that&apos;s where the
            coaching gets sharp.
          </p>
        )}

        {/* Open decisions */}
        {open.length > 0 && (
          <section className="dr-section">
            <h2 className="dr-section__label">Open</h2>
            <ul className="dr-list">
              {open.map((d) => (
                <li key={d.id} className="dr-item">
                  <div className="dr-item__head">
                    <span className="dr-item__title">{d.title}</span>
                    <span className="dr-item__meta">Started {shortDate(d.created_at)}</span>
                  </div>
                  <div className="dr-item__actions">
                    {d.conversation_id && (
                      <Link
                        href={`/dashboard/chat?c=${d.conversation_id}`}
                        className="dr-btn dr-btn--ghost"
                      >
                        <MessageSquare size={15} strokeWidth={2} aria-hidden="true" />
                        Continue
                      </Link>
                    )}
                    <button
                      type="button"
                      className="dr-btn dr-btn--ghost"
                      onClick={() => {
                        setCapturingId(capturingId === d.id ? null : d.id);
                        setCaptureText("");
                      }}
                    >
                      <PenLine size={15} strokeWidth={2} aria-hidden="true" />
                      Record the decision
                    </button>
                  </div>
                  {capturingId === d.id && (
                    <div className="dr-capture">
                      <textarea
                        className="dr-capture__input"
                        value={captureText}
                        maxLength={2000}
                        rows={3}
                        placeholder="What did you decide, and why? A couple of honest sentences."
                        onChange={(e) => setCaptureText(e.target.value)}
                        autoFocus
                      />
                      <div className="dr-capture__actions">
                        <button
                          type="button"
                          className="dr-btn dr-btn--primary"
                          onClick={() => handleSaveRecord(d.id)}
                          disabled={!captureText.trim() || savingId === d.id}
                        >
                          <Check size={15} strokeWidth={2} aria-hidden="true" />
                          {savingId === d.id ? "Saving…" : "Save record"}
                        </button>
                        <button
                          type="button"
                          className="dr-btn dr-btn--quiet"
                          onClick={() => {
                            setCapturingId(null);
                            setCaptureText("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Decided — the written records */}
        {decided.length > 0 && (
          <section className="dr-section">
            <h2 className="dr-section__label">Decided</h2>
            <ul className="dr-list">
              {decided.map((d) => (
                <li key={d.id} className="dr-item dr-item--decided">
                  <div className="dr-item__head">
                    <span className="dr-item__title">
                      <Check
                        className="dr-item__check"
                        size={15}
                        strokeWidth={2.25}
                        aria-hidden="true"
                      />
                      {d.title}
                    </span>
                    <span className="dr-item__meta">
                      {d.decided_at ? `Decided ${shortDate(d.decided_at)}` : "Decided"}
                    </span>
                  </div>
                  {d.resolution && <p className="dr-item__record">{d.resolution}</p>}
                  <div className="dr-item__actions">
                    {d.conversation_id && (
                      <Link
                        href={`/dashboard/chat?c=${d.conversation_id}`}
                        className="dr-btn dr-btn--ghost"
                      >
                        <MessageSquare size={15} strokeWidth={2} aria-hidden="true" />
                        Revisit
                      </Link>
                    )}
                    <button
                      type="button"
                      className="dr-btn dr-btn--quiet"
                      onClick={() => handleReopen(d.id)}
                    >
                      <Undo2 size={15} strokeWidth={2} aria-hidden="true" />
                      Reopen
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
