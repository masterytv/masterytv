/**
 * FearGauge — the Fear (stored key `leap`) as a banded scale + the two facets
 * underneath (fear of failure vs fear of success).
 *
 * Deterministic render of the stored bundle. Single-hue sequential (band zones
 * step up in tint; the active band saturates), 2px surface gaps between
 * segments per the dataviz spacer rule, marker carries a surface ring so it
 * reads over any zone. Text in text tokens; semantic custom properties only, so
 * the money palette and both themes resolve without per-theme code.
 */

import type { StoredMoneyMap } from "@/lib/decoded/scoring/money-maps";
import { describeFear } from "./money-map-card-format";

// Band cutpoints on the 1–6 scale (scorer §3.4): Low <2.75 · Moderate <4.0 · High ≥4.0.
const ZONES = [
  { band: "Low", from: 1, to: 2.75, tint: 16 },
  { band: "Moderate", from: 2.75, to: 4.0, tint: 34 },
  { band: "High", from: 4.0, to: 6, tint: 55 },
] as const;

function pct(v: number): number {
  return Math.max(0, Math.min(100, ((v - 1) / 5) * 100));
}

export default function FearGauge({ leap }: { leap: StoredMoneyMap["leap"] }) {
  const facets = [
    { label: "Fear of failure", value: leap.failFacet, leads: leap.tilt === "fear-of-failure" },
    { label: "Fear of success", value: leap.succFacet, leads: leap.tilt === "fear-of-success" },
  ];

  return (
    <figure
      className="m-0"
      role="img"
      aria-label={`The Fear: ${describeFear(leap.band, leap.tilt)}. Fear of failure ${leap.failFacet.toFixed(1)} of 6, fear of success ${leap.succFacet.toFixed(1)} of 6.`}
    >
      {/* The read */}
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-display text-3xl font-bold tracking-tight" style={{ color: "var(--color-primary)" }}>
          {leap.band}
        </span>
        {leap.tilt !== "balanced" && (
          <span className="text-sm text-text-secondary">
            — leaning {leap.tilt === "fear-of-success" ? "fear of success" : "fear of failure"}
          </span>
        )}
      </p>

      {/* Banded scale with the marker (the track is the positioning context, so
          the marker centers on the track, never drifting over the labels) */}
      <div className="mt-5">
        <div className="relative flex h-2.5 w-full gap-[2px]">
          {ZONES.map((z) => {
            const active = z.band === leap.band;
            return (
              <div
                key={z.band}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{
                  width: `${((z.to - z.from) / 5) * 100}%`,
                  background: `color-mix(in oklch, var(--color-primary) ${active ? 85 : z.tint}%, transparent)`,
                }}
              />
            );
          })}
          <div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${pct(leap.score)}%`,
              background: "var(--color-primary)",
              boxShadow: "0 0 0 3px var(--color-surface-0)",
            }}
            aria-hidden="true"
          />
        </div>
        <div className="mt-2 flex text-[10.5px] font-semibold uppercase tracking-[0.1em] text-text-muted">
          {ZONES.map((z) => (
            <span key={z.band} style={{ width: `${((z.to - z.from) / 5) * 100}%` }}>
              {z.band}
            </span>
          ))}
        </div>
      </div>

      {/* The two facets */}
      <div className="mt-6 flex flex-col gap-3.5">
        {facets.map((f) => (
          <div key={f.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className={`text-sm ${f.leads ? "font-semibold text-text-primary" : "text-text-secondary"}`}>
                {f.label}
              </span>
              <span className="font-display text-sm font-semibold tabular-nums text-text-secondary">
                {f.value.toFixed(1)}
              </span>
            </div>
            <div
              className="mt-1.5 h-2 w-full overflow-hidden rounded-full"
              style={{ background: "var(--color-surface-100)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct(f.value)}%`,
                  background: f.leads
                    ? "var(--color-primary)"
                    : "color-mix(in oklch, var(--color-primary) 45%, transparent)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <figcaption className="mt-3 text-xs leading-relaxed text-text-muted">
        Two facets, scored 1–6. When one clearly outweighs the other, that&apos;s the lean.
      </figcaption>
    </figure>
  );
}
