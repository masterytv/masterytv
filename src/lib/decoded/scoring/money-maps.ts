/**
 * Money Maps™ — the money vertical's deterministic scorer (program=money).
 *
 * SPEC: directives/MONEY_MAPS_INSTRUMENT.md §3–§4.
 * SPEC-LOCK: scripts/money-maps-scoring.mjs — this TS scorer reproduces that
 * reference algorithm and its 7 boundary tests exactly (money-maps.test.ts).
 *
 * WHY a separate scorer (not part of engine.ts): the money instrument doesn't
 * emit a plain psychometric `InstrumentScore` — it emits an ARCHETYPE bundle
 * (Map means → dominant/secondary → 1 of 12 named archetypes → overclock flags →
 * LEAP band+tilt) that feeds the card and the coach reveal. It's a leaf: pure,
 * no LLM, no DB, no cross-vertical surface. The reveal NARRATION (the coach's
 * first message) is written live from this bundle — but the scoring never is.
 *
 * Responses are keyed by the instrument's canonical item index as strings
 * ('1'..'16'), the same convention as every other scorer in engine.ts. The
 * index→Map binding is owned by the instrument (MONEY_MAP_ITEM_INDICES) so there
 * is a single source of truth; changing an item there re-points the scorer.
 */

import {
  MONEY_MAP_ITEM_INDICES,
  MONEY_LEAP_FACET_INDICES,
} from "../instruments/money-maps";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The four core Maps — stable traits that generate the archetype (§1). */
export type MoneyMap = "GUARD" | "DRIVE" | "MIRROR" | "SHADOW";

/** All five dimensions: the four core Maps + THE LEAP (a state, not an identity). */
export type MoneyDimension = MoneyMap | "LEAP";

/** THE LEAP band — how much fear is currently gating the edge (§3.4). */
export type LeapBand = "Low" | "Moderate" | "High";

/**
 * THE LEAP tilt — which facet dominates when the two are far enough apart.
 * `fear-of-failure` = loss-aversion (L1,L3); `fear-of-success` = identity/
 * success-ambivalence (L2,L4) — the rarer, higher-value read (§3.4).
 */
export type LeapTilt = "balanced" | "fear-of-failure" | "fear-of-success";

/** One archetype cell: derivation (dominant→secondary) + its one edge and one leak (§4). */
export interface MoneyArchetypeDef {
  dominant: MoneyMap;
  secondary: MoneyMap;
  name: string;
  /** The strength, dialed right. */
  edge: string;
  /** The governor's cost, dialed too high — the honesty lives here, never in the name (§4). */
  leak: string;
}

/**
 * THE 12 ARCHETYPES — the canonical, FOUNDER-APPROVED v1 table
 * (MONEY_MAPS_INSTRUMENT.md §4, 2026-07-17). Single source of truth: the
 * scorer derives the name from (dominant, secondary) here, and the card + the
 * coach reveal read the edge/leak from here. `as const` makes every name a
 * literal, so `MoneyArchetype` below is exactly these twelve — a new/renamed
 * archetype is a compile-surface change, not a silent string.
 *
 * ⚠️ Copy is canonical and un-gated (no check reads prose). Edge/leak are
 * transcribed verbatim from §4; do not paraphrase without a founder decision.
 * Derivation (dominant→secondary) is fixed; names are v1.
 */
export const MONEY_ARCHETYPES = [
  { dominant: "GUARD",  secondary: "DRIVE",  name: "The Fortress Builder",     edge: "builds safe and compounds; never blows up",            leak: "too walled-in to make the big leap — a treadmill with a moat" },
  { dominant: "GUARD",  secondary: "MIRROR", name: "The Quiet Titan",          edge: "composed, credible, controlled",                        leak: "guards so hard the win never feels like enough to enjoy" },
  { dominant: "GUARD",  secondary: "SHADOW", name: "The Vault",                edge: "disciplined, immune to greed",                          leak: "sits on opportunity; undercharges to stay safe" },
  { dominant: "DRIVE",  secondary: "GUARD",  name: "The Relentless Builder",   edge: "high-output founder, ambition with brakes",             leak: "the moving goalpost; can't enjoy the climb" },
  { dominant: "DRIVE",  secondary: "MIRROR", name: "The Mogul",                edge: "enormous motivation, plays big",                        leak: "worth rides on the scoreboard; never arrives" },
  { dominant: "DRIVE",  secondary: "SHADOW", name: "The Reluctant Rainmaker",  edge: "ambitious with a conscience",                           leak: "self-sabotages at the threshold; undercharges what they're best at" },
  { dominant: "MIRROR", secondary: "DRIVE",  name: "The Headliner",            edge: "magnetic, sells the dream, raises the room",            leak: "builds for the image; can feel hollow at the top" },
  { dominant: "MIRROR", secondary: "GUARD",  name: "The Curator",              edge: "tasteful, protects the brand, credible",                leak: "spends to signal; comparison quietly eats them" },
  { dominant: "MIRROR", secondary: "SHADOW", name: "The Aspirant",             edge: "high standards, reaching to matter",                    leak: "the gap between the image projected and the worth felt" },
  { dominant: "SHADOW", secondary: "GUARD",  name: "The Monk",                 edge: "grounded, principled, low-needs",                       leak: "\"I'm fine with less\" as a cage; leaves money and impact on the table" },
  { dominant: "SHADOW", secondary: "DRIVE",  name: "The Heart-First Creator",  edge: "mission-first, builds things that matter",              leak: "won't charge what it's worth; guilt throttles the ambition" },
  { dominant: "SHADOW", secondary: "MIRROR", name: "The Understated",          edge: "values-driven, quietly wants to matter",                leak: "torn between \"I don't care about money\" and \"I want to be respected\"" },
] as const satisfies readonly MoneyArchetypeDef[];

/** One entry of MONEY_ARCHETYPES with its literal `name`. */
export type MoneyArchetypeEntry = (typeof MONEY_ARCHETYPES)[number];

/** The 12 archetype names, derived from the canonical table (not re-typed). */
export type MoneyArchetype = MoneyArchetypeEntry["name"];

/** THE LEAP result — the coaching entry point (§3.4). */
export interface MoneyLeapResult {
  score: number;
  band: LeapBand;
  tilt: LeapTilt;
  /** fear of failure — mean(L1,L3). */
  failFacet: number;
  /** fear of success — mean(L2,L4). */
  succFacet: number;
}

/**
 * The scorer output bundle (§3.5) — feeds the card and the reveal.
 * `dims` values are rounded to 2dp FOR DISPLAY; ranking is done on the raw
 * (unrounded) means, so near-ties don't collapse spuriously (§3.1).
 */
export interface MoneyMapsScore {
  dims: Record<MoneyDimension, number>;
  dominant: MoneyMap;
  secondary: MoneyMap;
  archetype: MoneyArchetype;
  /** Core Maps running hot (mean ≥ 4.0), in fixed CORE order — the coach leads with the governor. */
  overclocked: MoneyMap[];
  leap: MoneyLeapResult;
}

// ---------------------------------------------------------------------------
// Scoring constants (spec-locked — do not tune without updating the tests)
// ---------------------------------------------------------------------------

/** Core Maps, in display order. LEAP is excluded — it's a state, not an archetype input (§3.2). */
const CORE: readonly MoneyMap[] = ["GUARD", "DRIVE", "MIRROR", "SHADOW"];

/**
 * Fixed priority for EXACT ties only (§3.2): DRIVE > GUARD > SHADOW > MIRROR.
 * A determinism convention (identical answers → identical result), not a claim
 * one Map "beats" another. Tunable.
 */
const TIEBREAK: readonly MoneyMap[] = ["DRIVE", "GUARD", "SHADOW", "MIRROR"];

/** A core Map is "running hot" at or above this mean (§3.3). */
const OVERCLOCK_THRESHOLD = 4.0;
/** LEAP bands, clean cutpoints, no gaps (§3.4): Low < 2.75 · Moderate 2.75–3.99 · High ≥ 4.0. */
const LEAP_HIGH = 4.0;
const LEAP_MODERATE = 2.75;
/** Tilt fires when the two facets differ by at least this margin (§3.4). */
const TILT_MARGIN = 0.5;

// ---------------------------------------------------------------------------
// Derivation lookup (built once from the canonical table)
// ---------------------------------------------------------------------------

const ARCHETYPE_BY_PAIR: ReadonlyMap<string, MoneyArchetypeEntry> = new Map(
  MONEY_ARCHETYPES.map((a) => [`${a.dominant}>${a.secondary}`, a] as const),
);

const ARCHETYPE_BY_NAME: ReadonlyMap<string, MoneyArchetypeEntry> = new Map(
  MONEY_ARCHETYPES.map((a) => [a.name, a] as const),
);

/**
 * The archetype for a (dominant, secondary) pair. Throws on an unknown pair
 * (e.g. dominant === secondary, which the scorer can never produce) — loud, not
 * a silent wrong archetype.
 */
export function archetypeForMaps(
  dominant: MoneyMap,
  secondary: MoneyMap,
): MoneyArchetypeEntry {
  const entry = ARCHETYPE_BY_PAIR.get(`${dominant}>${secondary}`);
  if (!entry) {
    throw new Error(
      `Money Maps: no archetype for dominant=${dominant} secondary=${secondary}`,
    );
  }
  return entry;
}

/** Look up an archetype's edge/leak metadata by name (for the card + reveal). Throws on unknown. */
export function getMoneyArchetype(name: MoneyArchetype): MoneyArchetypeEntry {
  const entry = ARCHETYPE_BY_NAME.get(name);
  if (!entry) throw new Error(`Money Maps: unknown archetype "${name}"`);
  return entry;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round to 2 decimals — display only; ranking uses raw means. */
const r2 = (x: number): number => Math.round(x * 100) / 100;

/**
 * Read one required response by canonical item index. Throws loudly on a
 * missing/NaN item — a wiring bug that dropped a response should be a visible
 * error, not a silently-skewed archetype (north star: make silent errors loud).
 */
function itemValue(responses: Record<string, number>, index: number): number {
  const v = responses[String(index)];
  if (typeof v !== "number" || Number.isNaN(v)) {
    throw new Error(
      `Money Maps scoring: missing or invalid response for item ${index}`,
    );
  }
  return v;
}

/** Mean of the given item indices (all positively keyed → plain mean, no reversal). */
function meanOf(
  responses: Record<string, number>,
  indices: readonly number[],
): number {
  const sum = indices.reduce((s, i) => s + itemValue(responses, i), 0);
  return sum / indices.length;
}

// ---------------------------------------------------------------------------
// The scorer
// ---------------------------------------------------------------------------

/**
 * Score a completed Money Maps™ assessment (16 items, 1–6 agreement, keyed
 * '1'..'16'). Fully deterministic — reproduces scripts/money-maps-scoring.mjs.
 */
export function scoreMoneyMaps(responses: Record<string, number>): MoneyMapsScore {
  // 1. Raw dimension means. Rank on RAW; round only for display (§3.1).
  const raw: Record<MoneyDimension, number> = {
    GUARD: meanOf(responses, MONEY_MAP_ITEM_INDICES.GUARD),
    DRIVE: meanOf(responses, MONEY_MAP_ITEM_INDICES.DRIVE),
    MIRROR: meanOf(responses, MONEY_MAP_ITEM_INDICES.MIRROR),
    SHADOW: meanOf(responses, MONEY_MAP_ITEM_INDICES.SHADOW),
    LEAP: meanOf(responses, MONEY_MAP_ITEM_INDICES.LEAP),
  };

  // 2. Dominant + secondary among the 4 core Maps; exact ties → fixed order (§3.2).
  const ranked = [...CORE].sort(
    (a, b) => raw[b] - raw[a] || TIEBREAK.indexOf(a) - TIEBREAK.indexOf(b),
  );
  const [dominant, secondary] = ranked;

  // 3. Archetype.  4. Overclock (≥ 4.0, in CORE order).  5. LEAP band + tilt.
  const archetype = archetypeForMaps(dominant, secondary).name;
  const overclocked = CORE.filter((m) => raw[m] >= OVERCLOCK_THRESHOLD);

  const leapScore = raw.LEAP;
  const band: LeapBand =
    leapScore >= LEAP_HIGH ? "High" : leapScore >= LEAP_MODERATE ? "Moderate" : "Low";

  const failFacet = meanOf(responses, MONEY_LEAP_FACET_INDICES.failure); // L1, L3
  const succFacet = meanOf(responses, MONEY_LEAP_FACET_INDICES.success); // L2, L4
  let tilt: LeapTilt = "balanced";
  if (failFacet - succFacet >= TILT_MARGIN) tilt = "fear-of-failure";
  else if (succFacet - failFacet >= TILT_MARGIN) tilt = "fear-of-success";

  return {
    dims: {
      GUARD: r2(raw.GUARD),
      DRIVE: r2(raw.DRIVE),
      MIRROR: r2(raw.MIRROR),
      SHADOW: r2(raw.SHADOW),
      LEAP: r2(raw.LEAP),
    },
    dominant,
    secondary,
    archetype,
    overclocked,
    leap: {
      score: r2(leapScore),
      band,
      tilt,
      failFacet: r2(failFacet),
      succFacet: r2(succFacet),
    },
  };
}
