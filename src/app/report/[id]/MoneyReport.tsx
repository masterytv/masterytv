/**
 * MoneyReport — the money vertical's "Assessment Report" surface.
 *
 * MONEY_EXPERIENCE.md §109: the money first-result/report is "the card + the
 * live reveal, not a static 13-page PDF … vertical-first section order (the Map,
 * the edge, the leak, the one move) — never the engine default." So a money
 * report renders THIS, not the Decoded Big-Five ReportViewer (which would show
 * "Mastery Coach", Big-Five sections, and an LLM-generating spinner that never
 * resolves because a money report has no LLM sections — only sections.money_map).
 *
 * BRAND.md: reuses the brand-compliant MoneyMapCard for the read; the frame uses
 * semantic token utilities + the canonical money CTA (text-text-inverse on the
 * --cta gradient, mirroring MoneyLanding) so it takes the emerald palette in both
 * themes. Lucide marks only (Compass, ArrowRight); no sparkle/emoji. Renders
 * straight from the stored bundle — never re-scores.
 */

import Link from "next/link";
import { Compass, ArrowRight } from "lucide-react";
import DecodedNav from "@/app/decoded/DecodedNav";
import MoneyMapCard from "@/components/money/MoneyMapCard";
import type { StoredMoneyMap, MoneyMap } from "@/lib/decoded/scoring/money-maps";

// The four core Maps in display order (LEAP is a state, shown separately).
const MAP_ORDER: readonly MoneyMap[] = ["GUARD", "DRIVE", "MIRROR", "SHADOW"];

// One-line "reads" + overclock copy per Map (MONEY_MAPS_INSTRUMENT.md §1).
const MAP_META: Record<MoneyMap, { reads: string; hot: string }> = {
  GUARD: { reads: "protect · control · watch the downside", hot: "worry that won't update; hard to enjoy; fear-based no's" },
  DRIVE: { reads: "more · fuel · progress-as-proof", hot: "the moving goalpost; overwork; “I'll relax when…”" },
  MIRROR: { reads: "signal · worth · being seen", hot: "worth riding on the number; comparison; image-spend" },
  SHADOW: { reads: "money-as-suspect · undeserving", hot: "undercharging; avoiding the numbers; “fine with less” as a cage" },
};

const TILT_LABEL: Record<StoredMoneyMap["leap"]["tilt"], string> = {
  "balanced": "balanced",
  "fear-of-failure": "tilted to fear of failure",
  "fear-of-success": "tilted to fear of success",
};

// 1–6 agreement scale → fill fraction of the bar.
function fillPct(score: number): number {
  return Math.max(0, Math.min(100, ((score - 1) / 5) * 100));
}

export default function MoneyReport({
  map,
  dateLabel,
}: {
  map: StoredMoneyMap;
  dateLabel: string;
}) {
  const hot = new Set(map.overclocked);

  return (
    <>
      <DecodedNav backHref="/dashboard" backLabel="Dashboard" />

      <main className="mx-auto max-w-2xl px-6 pb-24 pt-10 text-text-primary">
        {/* Header */}
        <header className="mb-10 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            <Compass size={14} strokeWidth={2} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
            Money Maps&trade;
          </p>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Your Money Maps Report
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-text-secondary">
            A read on how you handle money &mdash; {dateLabel}. A snapshot, not a verdict; your coach
            builds on it, and it moves as you do.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed text-text-muted">
            Coaching and education on the psychology of money &mdash; not therapy, and not financial,
            investment, or tax advice.
          </p>
        </header>

        {/* Rung-0 read */}
        <MoneyMapCard map={map} />

        {/* The four Maps — the traits under the archetype */}
        <section className="mt-12" aria-label="The four Maps">
          <h2 className="font-display text-xl font-semibold tracking-tight">The four Maps</h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            The stable traits that generate your archetype. Each is an asset with a governor &mdash;
            the score is how loud it runs, not good or bad.
          </p>
          <ul className="mt-6 flex flex-col gap-6">
            {MAP_ORDER.map((m) => {
              const score = map.dims[m];
              const isHot = hot.has(m);
              return (
                <li key={m}>
                  <div className="flex items-baseline gap-3">
                    <span className="text-sm font-semibold uppercase tracking-[0.08em]">{m}</span>
                    <span className="flex-1 text-xs text-text-muted">{MAP_META[m].reads}</span>
                    <span className="font-display text-sm font-semibold tabular-nums text-text-secondary">
                      {score.toFixed(1)}
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 w-full overflow-hidden rounded-full"
                    style={{ background: "var(--color-surface-100)" }}
                    role="img"
                    aria-label={`${m} scores ${score.toFixed(1)} out of 6`}
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
        </section>

        {/* The Leap — the state / coaching entry point */}
        <section className="mt-12" aria-label="The Leap">
          <h2 className="font-display text-xl font-semibold tracking-tight">The Leap</h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            Not a trait &mdash; a state: how much fear is gating your edge right now, and which way it
            tilts. This is the coaching entry point &mdash; your &ldquo;what&rsquo;s stopping me.&rdquo;
          </p>
          <p className="mt-4 flex flex-wrap items-baseline gap-2">
            <span className="font-display text-2xl font-bold" style={{ color: "var(--color-primary)" }}>
              {map.leap.band}
            </span>
            <span className="text-sm text-text-secondary">&mdash; {TILT_LABEL[map.leap.tilt]}</span>
          </p>
        </section>

        {/* The one move — drive to the product (the Decision Room) */}
        <section
          className="mt-14 rounded-2xl p-8 text-center"
          style={{ background: "var(--color-surface-50)" }}
          aria-label="Your next move"
        >
          <h2 className="font-display text-xl font-semibold tracking-tight">
            The report is the read. The work is the next decision.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-text-secondary">
            Bring a live money call &mdash; a price, a hire, a spend, a leap you keep circling &mdash;
            to the Decision Room, and your coach applies this whole profile to it.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-text-inverse shadow-lg transition-opacity hover:opacity-90"
            style={{ backgroundImage: "linear-gradient(135deg, var(--cta-from), var(--cta-to))" }}
          >
            Open the Decision Room
            <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
          </Link>
        </section>
      </main>
    </>
  );
}
