"use client";

/**
 * MoneyReport — the money vertical's long-form "Assessment Report" surface.
 *
 * Founder decision 2026-07-20 (supersedes MONEY_EXPERIENCE.md §109's card-only
 * read): the report is the payoff and the shareable artifact. Two layers:
 *   - DETERMINISTIC (instant): archetype card, radar, Map bars, Fear gauge —
 *     rendered straight from the stored sections.money_map bundle, never
 *     re-scored.
 *   - NARRATIVE (LLM, ~a minute): sections.money_narrative, written by the
 *     money-generate-report edge function from the bundle + profile + the
 *     user's own answers. This component POLLS for it while pending and fades
 *     sections in as they land; when it never lands, the deterministic layer +
 *     coach CTA still make a complete page (and the next page view re-fires
 *     generation server-side).
 *
 * The ladder: report → share (pull-quote) → coach. Every narrative section ends
 * pointed at the coach; the handoff chips deep-link the user's chosen question
 * straight into the chat (context=money_report_question).
 *
 * BRAND.md: semantic tokens only (emerald resolves via [data-brand="money"] in
 * both themes), Lucide marks only (Compass/ArrowUpRight/AlertTriangle/
 * MessageSquare/ArrowRight — never Sparkles/Zap), numbered section labels
 * (§14.4), no border dividers (tonal shifts + spacing), display/body type
 * contrast (§3). FTC: psychology-of-money coaching, never financial advice —
 * the disclaimer renders in the header and footer.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Compass,
  ArrowUpRight,
  AlertTriangle,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import DecodedNav from "@/app/decoded/DecodedNav";
import MoneyMapCard from "@/components/money/MoneyMapCard";
import MoneyMapsRadar from "@/components/money/MoneyMapsRadar";
import FearGauge from "@/components/money/FearGauge";
import { createClient } from "@/lib/supabase/client";
import {
  isMoneyNarrative,
  type MoneyNarrative,
} from "@/lib/decoded/report/money-narrative";
import type { StoredMoneyMap, MoneyMap } from "@/lib/decoded/scoring/money-maps";

// The four core Maps in display order (the Fear is a state, shown separately).
const MAP_ORDER: readonly MoneyMap[] = ["GUARD", "DRIVE", "MIRROR", "SHADOW"];

// One-line "reads" + running-hot copy per Map (MONEY_MAPS_INSTRUMENT.md §1).
const MAP_META: Record<MoneyMap, { reads: string; hot: string }> = {
  GUARD: { reads: "protect · control · watch the downside", hot: "worry that won't update; hard to enjoy; fear-based no's" },
  DRIVE: { reads: "more · fuel · progress-as-proof", hot: "the moving goalpost; overwork; “I'll relax when…”" },
  MIRROR: { reads: "signal · worth · being seen", hot: "worth riding on the number; comparison; image-spend" },
  SHADOW: { reads: "money-as-suspect · undeserving", hot: "undercharging; avoiding the numbers; “fine with less” as a cage" },
};

// How long we poll before conceding this visit (the next visit re-fires
// generation server-side, so "give up" only means "not this pageload").
const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 150_000;

// 1–6 agreement scale → fill fraction of a bar.
function fillPct(score: number): number {
  return Math.max(0, Math.min(100, ((score - 1) / 5) * 100));
}

// ─── Small presentational pieces ────────────────────────────────────────────

function SectionLabel({ n, kicker }: { n: string; kicker: string }) {
  return (
    <p className="flex items-baseline gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
      <span className="font-display text-sm font-bold tabular-nums" style={{ color: "var(--color-primary)" }}>
        {n}
      </span>
      {kicker}
    </p>
  );
}

function Headline({ text }: { text: string }) {
  return (
    <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-[1.75rem]">
      {text}
    </h2>
  );
}

function Prose({ paras, className = "" }: { paras: string[]; className?: string }) {
  return (
    <div className={className}>
      {paras.map((p, i) => (
        <p key={i} className="mt-4 text-base leading-relaxed text-text-secondary first:mt-0">
          {p}
        </p>
      ))}
    </div>
  );
}

/** Shimmer placeholder for a narrative block still being written. */
function Pending({ lines = 3, headline = true }: { lines?: number; headline?: boolean }) {
  return (
    <div className="animate-pulse" aria-hidden="true">
      {headline && (
        <div className="mt-3 h-7 w-3/5 rounded-lg" style={{ background: "var(--color-surface-100)" }} />
      )}
      <div className="mt-5 space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded"
            style={{ background: "var(--color-surface-100)", width: i === lines - 1 ? "72%" : "100%" }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── The report ─────────────────────────────────────────────────────────────

export default function MoneyReport({
  map,
  initialNarrative,
  dateLabel,
  firstName,
  reportId,
}: {
  map: StoredMoneyMap;
  initialNarrative: MoneyNarrative | null;
  dateLabel: string;
  firstName: string | null;
  reportId: string;
}) {
  const [narrative, setNarrative] = useState<MoneyNarrative | null>(initialNarrative);
  const [gaveUp, setGaveUp] = useState(false);
  const hot = new Set(map.overclocked);

  // Poll for the narrative while it generates (the page fired the edge function
  // server-side before rendering). Selects only the JSON path, never the S1–S8
  // blob shape of other verticals; scoped by report id (already owner-scoped by
  // RLS + the server page's ownership check).
  useEffect(() => {
    if (narrative) return;
    const supabase = createClient();
    const startedAt = Date.now();
    let cancelled = false;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("assessment_reports")
        .select("money_narrative:sections->money_narrative")
        .eq("id", reportId)
        .maybeSingle();
      if (cancelled) return;
      const candidate = data?.money_narrative as unknown;
      if (isMoneyNarrative(candidate)) {
        setNarrative(candidate);
        clearInterval(interval);
      } else if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setGaveUp(true);
        clearInterval(interval);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [narrative, reportId]);

  const pending = !narrative && !gaveUp;
  const n = narrative;

  const coachHref = "/dashboard/chat?context=money_reveal";
  const questionHref = (q: string) =>
    `/dashboard/chat?context=money_report_question&q=${encodeURIComponent(q)}`;

  return (
    <>
      <DecodedNav backHref="/dashboard" backLabel="Dashboard" />

      <main className="mx-auto max-w-2xl px-6 pb-24 pt-10 text-text-primary">
        {/* ── Header: the identity payoff ── */}
        <header className="text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            <Compass size={14} strokeWidth={2} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
            Money Maps&trade; · Personal report
          </p>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            {map.archetype}
          </h1>
          <p className="mt-4 text-sm text-text-muted">
            {firstName ? `Prepared for ${firstName} · ${dateLabel}` : `Prepared ${dateLabel}`}
          </p>
          <p className="mx-auto mt-4 max-w-xl text-xs leading-relaxed text-text-muted">
            A read, not a verdict — your coach pressure-tests it with you, and it moves as you do.
            Coaching and education on the psychology of money: not therapy, and not financial,
            investment, or tax advice.
          </p>
        </header>

        {/* ── The cold open: the mirror ── */}
        <section className="mt-12" aria-label="The read">
          {n ? (
            <p className="text-lg leading-relaxed text-text-primary sm:text-xl">{n.cold_open}</p>
          ) : gaveUp ? (
            <p className="text-base leading-relaxed text-text-secondary">
              The written part of your report is taking longer than usual — it&apos;ll be here the
              next time you open this page. Everything below is already yours.
            </p>
          ) : (
            <>
              <Pending lines={3} headline={false} />
              <p className="mt-4 text-xs text-text-muted">
                Your full report is being written from your answers — usually under a minute. The
                numbers below are already yours.
              </p>
            </>
          )}
        </section>

        {/* ── The card (the shareable rung-0 artifact) ── */}
        <div className="mt-10">
          <MoneyMapCard map={map} />
        </div>

        {/* ── 01 · The map ── */}
        <section className="mt-16" aria-label="The shape of your money">
          <SectionLabel n="01" kicker="The map" />
          {n ? <Headline text={n.archetype.headline} /> : <Headline text="The shape of your money" />}

          <div className="mt-8 grid items-start gap-8 sm:grid-cols-[minmax(0,300px)_1fr]">
            <MoneyMapsRadar dims={map.dims} overclocked={map.overclocked} />

            <ul className="flex flex-col gap-5">
              {MAP_ORDER.map((m) => {
                const score = map.dims[m];
                const isHot = hot.has(m);
                return (
                  <li key={m}>
                    <div className="flex items-baseline gap-3">
                      <span className="text-sm font-semibold uppercase tracking-[0.08em]">{m}</span>
                      <span className="min-w-0 flex-1 truncate text-xs text-text-muted">{MAP_META[m].reads}</span>
                      <span className="font-display text-sm font-semibold tabular-nums text-text-secondary">
                        {score.toFixed(1)}
                      </span>
                    </div>
                    <div
                      className="relative mt-2 h-2 w-full rounded-full"
                      style={{ background: "var(--color-surface-100)" }}
                      role="img"
                      aria-label={`${m} scores ${score.toFixed(1)} out of 6${isHot ? ", running hot" : ""}`}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${fillPct(score)}%`,
                          background: isHot
                            ? "var(--color-primary)"
                            : "color-mix(in oklch, var(--color-primary) 55%, transparent)",
                        }}
                      />
                      {/* The 4.0 running-hot threshold tick */}
                      <div
                        className="absolute top-1/2 h-3.5 w-px -translate-y-1/2"
                        style={{
                          left: `${fillPct(4)}%`,
                          background: "color-mix(in oklch, var(--color-text-muted) 45%, transparent)",
                        }}
                        aria-hidden="true"
                      />
                    </div>
                    {isHot && (
                      <p className="mt-1.5 text-xs text-text-muted">
                        <span className="font-semibold" style={{ color: "var(--color-primary)" }}>
                          Running hot
                        </span>{" "}
                        &mdash; {MAP_META[m].hot}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {n ? <Prose paras={n.archetype.body} className="mt-8" /> : pending && <Pending headline={false} lines={4} />}
        </section>

        {/* ── 02 · The edge ── */}
        <section className="mt-16" aria-label="Your edge">
          <SectionLabel n="02" kicker="The edge" />
          {n ? (
            <>
              <Headline text={n.edge.headline} />
              <Prose paras={n.edge.body} className="mt-5" />
              <ul className="mt-7 grid gap-3 sm:grid-cols-3">
                {n.edge.strengths.map((s) => (
                  <li key={s.label} className="rounded-xl p-4" style={{ background: "var(--color-surface-50)" }}>
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--color-primary)" }}>
                      <ArrowUpRight size={13} strokeWidth={2.25} aria-hidden="true" />
                      {s.label}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">{s.line}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Pending lines={5} />
          )}
        </section>

        {/* ── 03 · The challenge ── */}
        <section className="mt-16" aria-label="The challenge">
          <SectionLabel n="03" kicker="The challenge" />
          {n ? (
            <>
              <Headline text={n.challenge.headline} />
              <Prose paras={n.challenge.body} className="mt-5" />
              <div className="mt-7">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-text-muted">
                  <AlertTriangle size={13} strokeWidth={2.25} aria-hidden="true" />
                  The tells
                </p>
                <ul className="mt-4 space-y-4">
                  {n.challenge.tells.map((t) => (
                    <li key={t} className="font-display text-base font-semibold leading-snug sm:text-lg">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <Pending lines={5} />
          )}
        </section>

        {/* ── The pull-quote: the screenshot ── */}
        {n && (
          <figure
            className="mt-16 rounded-3xl px-8 py-12 text-center"
            style={{ background: "var(--color-surface-50)" }}
          >
            <blockquote className="mx-auto max-w-md font-display text-2xl font-bold leading-snug tracking-tight sm:text-[1.7rem]">
              &ldquo;{n.pull_quote}&rdquo;
            </blockquote>
            <figcaption className="mt-5 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
              <Compass size={12} strokeWidth={2} aria-hidden="true" />
              {map.archetype} · Money Maps&trade;
            </figcaption>
          </figure>
        )}

        {/* ── 04 · The quiet map ── */}
        <section className="mt-16" aria-label="The quiet map">
          <SectionLabel n="04" kicker="The quiet map" />
          {n ? (
            <>
              <Headline text={n.quiet_map.headline} />
              <Prose paras={n.quiet_map.body} className="mt-5" />
            </>
          ) : (
            <Pending lines={3} />
          )}
        </section>

        {/* ── 05 · The Fear ── */}
        <section className="mt-16" aria-label="The Fear">
          <SectionLabel n="05" kicker="The Fear" />
          {n ? <Headline text={n.fear.headline} /> : <Headline text="The Fear" />}
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            Not a trait &mdash; a state: how much fear is gating your edge right now, and which way
            it leans.
          </p>
          <div className="mt-7">
            <FearGauge leap={map.leap} />
          </div>
          {n ? <Prose paras={n.fear.body} className="mt-7" /> : pending && <Pending headline={false} lines={4} />}
        </section>

        {/* ── 06 · In the wild ── */}
        <section className="mt-16" aria-label="Your pattern in the wild">
          <SectionLabel n="06" kicker="In the wild" />
          {n ? (
            <>
              <Headline text={n.in_the_wild.headline} />
              <ul className="mt-7 flex flex-col gap-4">
                {n.in_the_wild.scenes.map((s) => (
                  <li key={s.setting} className="rounded-2xl p-6" style={{ background: "var(--color-surface-50)" }}>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">{s.setting}</p>
                    <p className="mt-2.5 text-base leading-relaxed text-text-secondary">{s.moment}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Pending lines={4} />
          )}
        </section>

        {/* ── 07 · Dialed right ── */}
        <section className="mt-16" aria-label="Dialed right">
          <SectionLabel n="07" kicker="Dialed right" />
          {n ? (
            <>
              <Headline text={n.dialed_right.headline} />
              <Prose paras={n.dialed_right.body} className="mt-5" />
              <ul className="mt-7 flex flex-col gap-3">
                {n.dialed_right.shifts.map((s) => (
                  <li
                    key={`${s.from}-${s.to}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-5 py-3.5"
                    style={{ background: "var(--color-surface-50)" }}
                  >
                    <span className="text-sm text-text-muted">{s.from}</span>
                    <ArrowRight
                      size={14}
                      strokeWidth={2.25}
                      style={{ color: "var(--color-primary)" }}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-semibold text-text-primary">{s.to}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Pending lines={4} />
          )}
        </section>

        {/* ── The handoff: where the map ends, the coach begins ── */}
        <section
          className="mt-16 rounded-3xl p-8 sm:p-10"
          style={{ background: "var(--color-surface-50)" }}
          aria-label="Take this to your coach"
        >
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            <MessageSquare size={13} strokeWidth={2.25} aria-hidden="true" />
            Where the map ends
          </p>
          {n ? (
            <Prose paras={n.coach_handoff.body} className="mt-4" />
          ) : (
            <p className="mt-4 text-base leading-relaxed text-text-secondary">
              A report can name the pattern; it can&apos;t argue with it. Your coach starts where
              this page stops &mdash; already knowing everything on it.
            </p>
          )}

          {n && (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-text-muted">
                Ask the one you&apos;ve been circling
              </p>
              <div className="mt-3 flex flex-col items-start gap-2">
                {n.coach_handoff.first_questions.map((q) => (
                  <Link
                    key={q}
                    href={questionHref(q)}
                    className="rounded-xl px-4 py-2.5 text-left text-sm leading-snug text-text-primary transition-colors"
                    style={{ background: "color-mix(in oklch, var(--color-primary) 12%, transparent)" }}
                  >
                    &ldquo;{q}&rdquo;
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link
              href={coachHref}
              className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-text-inverse shadow-lg transition-opacity hover:opacity-90"
              style={{ backgroundImage: "linear-gradient(135deg, var(--cta-from), var(--cta-to))" }}
            >
              Take this to your coach
              <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              Or bring a live decision to the Decision Room
            </Link>
          </div>
        </section>

        <p className="mt-10 text-center text-xs leading-relaxed text-text-muted">
          Money Maps is coaching and education on the psychology of money &mdash; not therapy, and
          not financial, investment, or tax advice.
        </p>
      </main>
    </>
  );
}
