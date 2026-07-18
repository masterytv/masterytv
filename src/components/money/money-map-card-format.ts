/**
 * Money Maps™ card — pure display formatters.
 *
 * Split out of MoneyMapCard.tsx so they carry no JSX/CSS import and can be
 * unit-tested directly (money-map-card-format.test.ts). These are DISPLAY-ONLY
 * stylizations of the stored bundle — they never re-derive anything the scorer
 * owns (SPEC: MONEY_MAPS_INSTRUMENT.md §5, the card).
 */

import type { LeapBand, LeapTilt, MoneyMap } from "@/lib/decoded/scoring/money-maps";

/**
 * The secondary Map rendered as the mockup's adjective form — "DRIVE · guarded"
 * (§5). Purely presentational: the data is the Map name ("GUARD"); this is how
 * the card *reads* it beneath the dominant. Exhaustive over MoneyMap so a new
 * core Map would fail the typecheck here rather than fall through to a default.
 */
const SECONDARY_ADJECTIVE: Record<MoneyMap, string> = {
  GUARD: "guarded",
  DRIVE: "driven",
  MIRROR: "mirrored",
  SHADOW: "shadowed",
};

export function secondaryAdjective(map: MoneyMap): string {
  return SECONDARY_ADJECTIVE[map];
}

/**
 * THE LEAP line value (§5: "High — tilted to fear of success"). The band is the
 * state; the tilt is the rarer, higher-value read (fear of success vs failure)
 * and is only surfaced when the facets diverged enough to earn it — a `balanced`
 * leap renders the band alone, never an invented tilt. The "The Leap" label is
 * rendered by the component; this returns only the value.
 */
export function describeLeap(band: LeapBand, tilt: LeapTilt): string {
  if (tilt === "fear-of-success") return `${band} — tilted to fear of success`;
  if (tilt === "fear-of-failure") return `${band} — tilted to fear of failure`;
  return band;
}
