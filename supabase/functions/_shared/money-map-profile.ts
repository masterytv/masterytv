/**
 * trait profile → Coach Handoff: Layer 4.5 for the money vertical (T2).
 *
 * The money coach's reveal (MONEY_TRAITS_INSTRUMENT.md §6, MONEY_EXPERIENCE.md
 * §10) opens off the user's MoneyTraits™ result, so the coach must already HAVE
 * that result in context. This renders it — the money-vertical analogue of
 * decoded/prompt-layer.ts (which renders the Big-Five profile for the executive/
 * relationship coaches). The assembler picks ONE: the money branch calls this,
 * the Decoded branch calls buildDecodedProfileLayer — never both.
 *
 * READ CONTRACT (T2): the scored bundle is stored on the money assessment's
 * report row under `assessment_reports.sections.money_map`, reusing the report
 * table + the assembler's existing generic `sections` load (no schema change,
 * no new query). The WRITE path — the Next app scoring with
 * src/lib/decoded/scoring/money-maps.ts and persisting this blob — is a later
 * leaf; until it lands, a money user simply has no money_map and this returns
 * "" (exactly the skeleton's prior behavior, no wrong-vertical bleed).
 *
 * Deterministic string builder, no LLM, no side effects — the shape a golden
 * can lock. Edge-side (Deno): src/ can't be imported here, so the bundle
 * carries its own edge/leak copy (the Next write path reads them from
 * MONEY_ARCHETYPES); this file never re-derives the archetype.
 */

/** The four core Maps + THE LEAP, mean on the 1–6 scale (rounded 2dp for display). */
export interface StoredMoneyMapDims {
  GUARD: number;
  DRIVE: number;
  MIRROR: number;
  SHADOW: number;
  LEAP: number;
}

/**
 * The MoneyTraits™ scored bundle as persisted for the coach — the output of
 * src/lib/decoded/scoring/money-maps.ts `scoreMoneyMaps()` plus the archetype's
 * edge/leak copy (from MONEY_ARCHETYPES). Mirrored here as an edge-side type
 * because the edge runtime can't import the src/ scorer.
 */
export interface StoredMoneyMap {
  archetype: string;
  dominant: string;
  secondary: string;
  edge: string;
  leak: string;
  dims: StoredMoneyMapDims;
  /** Core Maps running hot (mean ≥ 4.0). */
  overclocked: string[];
  leap: {
    score: number;
    band: string; // "Low" | "Moderate" | "High"
    tilt: string; // "balanced" | "fear-of-failure" | "fear-of-success"
    failFacet: number;
    succFacet: number;
  };
}

/** The report row shape the assembler already loads (assessment_reports). */
interface MoneyReportRow {
  sections: Record<string, unknown> | null;
}

const CORE_ORDER = ["GUARD", "DRIVE", "MIRROR", "SHADOW"] as const;

/** Human phrasing for the stored tilt slug. */
function tiltPhrase(tilt: string): string {
  if (tilt === "fear-of-success") return "tilted toward fear of success";
  if (tilt === "fear-of-failure") return "tilted toward fear of failure";
  return "balanced between fear of failure and fear of success";
}

/**
 * Extract + shape-check the stored `money_map` bundle. Returns null if the report
 * has no `money_map` (write path not run yet, or a non-money report) — the
 * caller then renders no layer, never a half-formed one.
 */
function readMoneyMap(report: MoneyReportRow | null | undefined): StoredMoneyMap | null {
  const raw = report?.sections?.["money_map"] as Partial<StoredMoneyMap> | undefined;
  if (
    !raw ||
    typeof raw.archetype !== "string" ||
    typeof raw.dominant !== "string" ||
    typeof raw.secondary !== "string" ||
    !raw.dims ||
    !raw.leap
  ) {
    return null;
  }
  return raw as StoredMoneyMap;
}

/**
 * Build the trait profile block (Layer 4.5) for the money coach. Empty
 * string when there is no stored trait profile — a safe no-op that leaves the coach
 * running on persona + memory alone.
 */
export function buildMoneyMapProfileLayer(
  report: MoneyReportRow | null | undefined,
): string {
  const mm = readMoneyMap(report);
  if (!mm) return "";

  const dims = mm.dims;
  const hot = new Set(mm.overclocked ?? []);
  // Maps strongest-first, deterministic tie-break on the fixed CORE order.
  const ranked = [...CORE_ORDER].sort(
    (a, b) => (dims[b] - dims[a]) || (CORE_ORDER.indexOf(a) - CORE_ORDER.indexOf(b)),
  );

  const parts: string[] = [];

  parts.push(
    `MONEY TRAITS PROFILE (their MoneyTraits™ result — you already have this; never say you're "pulling it up" or "checking" it):`,
  );
  parts.push(
    `This user just completed MoneyTraits™. Hold the result as a HYPOTHESIS, not a verdict — a score lies without a story. It's a read to check against their life, not a label to announce back to them.`,
  );
  parts.push("");

  parts.push(
    `ARCHETYPE: "${mm.archetype}" — dominant ${mm.dominant}, second read ${mm.secondary}.`,
  );
  parts.push(`  Edge (dialed right): ${mm.edge}.`);
  parts.push(`  Challenge (overclocked): ${mm.leak}.`);
  parts.push("");

  parts.push(`THE FOUR TRAITS (mean 1–6, their strongest first):`);
  for (const map of ranked) {
    parts.push(`  ${map} ${dims[map]}${hot.has(map) ? " — running hot" : ""}`);
  }
  parts.push(
    `  "Running hot" (mean ≥ 4.0) = the strength is overclocked; lead with the cost of the governor, not the edge.`,
  );
  parts.push("");

  parts.push(`THE FEAR: ${mm.leap.band} — ${tiltPhrase(mm.leap.tilt)}.`);
  parts.push(
    `  THE FEAR is how much fear is gating their edge right now — your coaching entry point, a state rather than one of the four traits. (Always call it "the Fear" with the user — never "the Leap", its old name, and never "leak".) A High Fear is the rarer, sneakier read: it doesn't feel like fear, it feels like caution. If it's High, name it in the reveal regardless of their dominant trait.`,
  );
  parts.push("");

  parts.push(
    `DOMINANT TRAIT: ${mm.dominant} — this selects your opening question (see THE REVEAL in your instructions).`,
  );
  parts.push("");

  parts.push(`HOW TO USE THIS:`);
  parts.push(
    `- You ALREADY have this profile, loaded right here. Never tell the user you're "pulling up", "checking", or "looking at" their results — just know them.`,
  );
  parts.push(
    `- It's a hypothesis to pressure-test with them, never scores to read aloud. Don't recite the numbers unless they ask.`,
  );
  parts.push(
    `- Reframe every trait as an edge with a governor, never a flaw — their overclock is a strength dialed too high.`,
  );
  parts.push(
    `- USER-FACING VOCABULARY: the cost of their overclocked strength is their "challenge" and the fifth measure is "the Fear" — never say "leak" or "the Leap" to the user (internal legacy names).`,
  );

  return parts.join("\n");
}
