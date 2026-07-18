/**
 * Money Maps™ scorer — unit tests.
 *
 * The seven `describe('the 7 spec-lock boundary cases')` tests REPRODUCE, byte
 * for byte, the CASES self-check in scripts/money-maps-scoring.mjs — the
 * spec-locking reference for MONEY_MAPS_INSTRUMENT.md §3. If either drifts, one
 * of these fails. They lock: the DRIVE>GUARD>SHADOW>MIRROR tie-break, the ≥4.0
 * overclock flag, the 2.75/4.0 LEAP cutpoints, and the 0.5 tilt margin.
 *
 * The reference keys answers by G1..L4 labels; this scorer keys by the
 * instrument's canonical item index ('1'..'16'). The `answers()` helper maps a
 * 16-value array positionally to indices 1..16 — the exact same ordering the
 * reference's A() helper uses (G1=1 … L4=16), so the vectors are identical.
 *
 * Run: npx vitest run src/lib/decoded/scoring/money-maps.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  scoreMoneyMaps,
  toStoredMoneyMap,
  archetypeForMaps,
  getMoneyArchetype,
  MONEY_ARCHETYPES,
  type MoneyMap,
} from "./money-maps";
import {
  MONEY_MAP_ITEM_INDICES,
  MONEY_LEAP_FACET_INDICES,
} from "../instruments/money-maps";

// Positional item order — identical to the reference's A() (G1..L4 = 1..16).
const ITEM_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] as const;

/** Map a 16-value array to an index-keyed response map ('1'..'16'). */
function answers(vals: readonly number[]): Record<string, number> {
  const r: Record<string, number> = {};
  ITEM_ORDER.forEach((idx, i) => {
    r[String(idx)] = vals[i];
  });
  return r;
}

/** Which Map a canonical item index belongs to (for keying-direction tests). */
function mapOfIndex(index: number): MoneyMap | "LEAP" {
  for (const [map, idxs] of Object.entries(MONEY_MAP_ITEM_INDICES)) {
    if ((idxs as readonly number[]).includes(index)) return map as MoneyMap | "LEAP";
  }
  throw new Error(`no map for index ${index}`);
}

// ═════════════════════════════════════════════════════════════════════════════
// The 7 spec-lock boundary cases (verbatim from money-maps-scoring.mjs CASES)
// ═════════════════════════════════════════════════════════════════════════════
describe("the 7 spec-lock boundary cases (money-maps-scoring.mjs)", () => {
  it("Relentless Builder, High/success-tilt", () => {
    const r = scoreMoneyMaps(answers([5, 4, 4, 6, 5, 4, 2, 3, 2, 3, 4, 3, 3, 5, 3, 5]));
    expect(r.archetype).toBe("The Relentless Builder");
    expect(r.leap.band).toBe("High");
    expect(r.leap.tilt).toBe("fear-of-success");
    expect(r.overclocked).toEqual(["GUARD", "DRIVE"]);
  });

  it("The Monk, Low/balanced", () => {
    const r = scoreMoneyMaps(answers([5, 4, 4, 2, 2, 2, 1, 2, 1, 5, 4, 5, 2, 2, 2, 2]));
    expect(r.archetype).toBe("The Monk");
    expect(r.leap.band).toBe("Low");
    expect(r.leap.tilt).toBe("balanced");
    expect(r.overclocked).toEqual(["GUARD", "SHADOW"]);
  });

  it("exact tie GUARD=SHADOW → tie-break picks The Vault", () => {
    const r = scoreMoneyMaps(answers([4, 4, 4, 2, 3, 2, 2, 2, 2, 4, 4, 4, 4, 3, 4, 3]));
    expect(r.archetype).toBe("The Vault");
    expect(r.leap.band).toBe("Moderate");
    expect(r.leap.tilt).toBe("fear-of-failure");
    expect(r.overclocked).toEqual(["GUARD", "SHADOW"]);
  });

  it("LEAP exactly 2.75 → Moderate (not Low)", () => {
    const r = scoreMoneyMaps(answers([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2]));
    expect(r.leap.band).toBe("Moderate");
  });

  it("LEAP exactly 4.0 → High", () => {
    const r = scoreMoneyMaps(answers([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4]));
    expect(r.leap.band).toBe("High");
  });

  it("tilt margin exactly 0.5 → triggers fear-of-failure", () => {
    // fail (4+4)/2 = 4.0, succ (3+4)/2 = 3.5, diff exactly 0.5
    const r = scoreMoneyMaps(answers([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 3, 4, 4]));
    expect(r.leap.tilt).toBe("fear-of-failure");
  });

  it("four-way tie → DRIVE dominant, GUARD secondary (The Relentless Builder)", () => {
    const r = scoreMoneyMaps(answers([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3]));
    expect(r.archetype).toBe("The Relentless Builder");
    expect(r.dominant).toBe("DRIVE");
    expect(r.secondary).toBe("GUARD");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// toStoredMoneyMap — the persisted bundle (WRITE-PATH contract, T2)
//
// toStoredMoneyMap() produces the exact object generateReport writes to
// assessment_reports.sections.money_map, and the money coach reveals off. The
// expected literal below is a verbatim copy of MONEY_MAP_BUNDLE in
// scripts/coach-lab/prompt-fixtures.ts — the fixture the `money` prompt golden
// renders Layer 4.5 from. Binding them here means the write path and the read
// golden can't silently drift: boundary case 1's responses must score to the
// exact bundle the golden already locks. (Two trees, one shape, hand-lockstep —
// this test is the Next-side net, snapshot:prompts is the edge-side net.)
// ═════════════════════════════════════════════════════════════════════════════
describe("toStoredMoneyMap — persisted bundle (write-path ↔ money golden)", () => {
  // Boundary case 1's response vector (verbatim from the block above).
  const CASE_1 = [5, 4, 4, 6, 5, 4, 2, 3, 2, 3, 4, 3, 3, 5, 3, 5];

  it("boundary case 1 scores to the exact MONEY_MAP_BUNDLE the golden reads", () => {
    const stored = toStoredMoneyMap(scoreMoneyMaps(answers(CASE_1)));
    expect(stored).toEqual({
      archetype: "The Relentless Builder",
      dominant: "DRIVE",
      secondary: "GUARD",
      edge: "high-output founder, ambition with brakes",
      leak: "the moving goalpost; can't enjoy the climb",
      dims: { GUARD: 4.33, DRIVE: 5, MIRROR: 2.33, SHADOW: 3.33, LEAP: 4 },
      overclocked: ["GUARD", "DRIVE"],
      leap: { score: 4, band: "High", tilt: "fear-of-success", failFacet: 3, succFacet: 5 },
    });
  });

  it("attaches edge + leak straight from the canonical archetype table, scorer output untouched", () => {
    const score = scoreMoneyMaps(answers(CASE_1));
    const arch = getMoneyArchetype(score.archetype);
    const stored = toStoredMoneyMap(score);
    expect(stored.edge).toBe(arch.edge);
    expect(stored.leak).toBe(arch.leak);
    // Every scorer field passes through unchanged; only edge/leak are added.
    expect(stored).toMatchObject(score);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Archetype table integrity — the canonical §4 grid
// ═════════════════════════════════════════════════════════════════════════════
describe("MONEY_ARCHETYPES table integrity", () => {
  it("has exactly 12 archetypes (4 dominant × 3 secondary)", () => {
    expect(MONEY_ARCHETYPES).toHaveLength(12);
  });

  it("has unique names", () => {
    const names = MONEY_ARCHETYPES.map((a) => a.name);
    expect(new Set(names).size).toBe(12);
  });

  it("covers every ordered (dominant, secondary) pair of distinct core Maps exactly once", () => {
    const core: MoneyMap[] = ["GUARD", "DRIVE", "MIRROR", "SHADOW"];
    const pairs = new Set(MONEY_ARCHETYPES.map((a) => `${a.dominant}>${a.secondary}`));
    expect(pairs.size).toBe(12);
    for (const d of core) {
      for (const s of core) {
        if (d === s) {
          expect(pairs.has(`${d}>${s}`)).toBe(false); // no self-pairs
        } else {
          expect(pairs.has(`${d}>${s}`)).toBe(true);
        }
      }
    }
  });

  it("every archetype carries a non-empty edge AND leak (never flattery-only)", () => {
    for (const a of MONEY_ARCHETYPES) {
      expect(a.edge.trim().length).toBeGreaterThan(0);
      expect(a.leak.trim().length).toBeGreaterThan(0);
    }
  });

  it("getMoneyArchetype round-trips by name; throws on unknown", () => {
    for (const a of MONEY_ARCHETYPES) {
      expect(getMoneyArchetype(a.name)).toBe(a);
    }
    // @ts-expect-error — unknown name is not a MoneyArchetype
    expect(() => getMoneyArchetype("The Nonexistent")).toThrow();
  });

  it("archetypeForMaps throws on a self-pair (never produced by the scorer)", () => {
    expect(() => archetypeForMaps("GUARD", "GUARD")).toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Derivation: the scorer maps each (dominant, secondary) to the right archetype
// ═════════════════════════════════════════════════════════════════════════════
describe("scoreMoneyMaps — derivation covers all 12 archetypes", () => {
  it("dominant=6 / secondary=5 / others=1 yields each archetype in turn", () => {
    for (const def of MONEY_ARCHETYPES) {
      const vals = ITEM_ORDER.map((idx) => {
        const map = mapOfIndex(idx);
        if (map === def.dominant) return 6;
        if (map === def.secondary) return 5;
        if (map === "LEAP") return 3;
        return 1;
      });
      const r = scoreMoneyMaps(answers(vals));
      expect(r.dominant).toBe(def.dominant);
      expect(r.secondary).toBe(def.secondary);
      expect(r.archetype).toBe(def.name);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Structural: dims/rounding, band cutpoints, overclock ordering
// ═════════════════════════════════════════════════════════════════════════════
describe("scoreMoneyMaps — structure & rounding", () => {
  it("dims are rounded to 2dp for display, ranking is on the raw mean", () => {
    // GUARD items 1,2,3 = 5,4,4 → raw mean 4.333… → display 4.33
    const r = scoreMoneyMaps(answers([5, 4, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]));
    expect(r.dims.GUARD).toBe(4.33);
    expect(r.dominant).toBe("GUARD"); // 4.333 raw still ranks top despite rounding
  });

  it("returns all five dimensions", () => {
    const r = scoreMoneyMaps(answers(new Array(16).fill(3)));
    expect(Object.keys(r.dims).sort()).toEqual(
      ["DRIVE", "GUARD", "LEAP", "MIRROR", "SHADOW"].sort(),
    );
  });

  it("LEAP band boundaries: 2.74→Low, 2.75→Moderate, 3.99→Moderate, 4.0→High", () => {
    // LEAP items are indices 13–16; drive the mean directly.
    const withLeap = (leapVals: number[]) =>
      scoreMoneyMaps(answers([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, ...leapVals]));
    expect(withLeap([3, 3, 3, 1]).leap.band).toBe("Low"); // mean 2.5
    expect(withLeap([3, 3, 3, 2]).leap.band).toBe("Moderate"); // mean 2.75
    expect(withLeap([4, 4, 4, 3]).leap.band).toBe("Moderate"); // mean 3.75
    expect(withLeap([4, 4, 4, 4]).leap.band).toBe("High"); // mean 4.0
  });

  it("no core Map hot → empty overclocked; all hot → CORE order", () => {
    expect(scoreMoneyMaps(answers(new Array(16).fill(3)))).toMatchObject({
      overclocked: [],
    });
    const allHot = scoreMoneyMaps(answers(new Array(16).fill(5)));
    expect(allHot.overclocked).toEqual(["GUARD", "DRIVE", "MIRROR", "SHADOW"]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Keying direction — every item loads positively on its own Map (no reversal),
// and the LEAP facets read the documented item pairs. Guards against the item→
// Map binding drifting from the instrument (mirrors engine.test.ts's guard).
// ═════════════════════════════════════════════════════════════════════════════
describe("scoreMoneyMaps — keying direction", () => {
  const baseline = () => scoreMoneyMaps(answers(new Array(16).fill(1)));

  it("each core Map's items raise that Map's mean and no other", () => {
    const maps: MoneyMap[] = ["GUARD", "DRIVE", "MIRROR", "SHADOW"];
    for (const map of maps) {
      const vals = ITEM_ORDER.map((idx) => (mapOfIndex(idx) === map ? 6 : 1));
      const r = scoreMoneyMaps(answers(vals));
      expect(r.dims[map]).toBeGreaterThan(baseline().dims[map]);
      // dominant must be the map we pushed
      expect(r.dominant).toBe(map);
    }
  });

  it("LEAP items raise the LEAP score", () => {
    const vals = ITEM_ORDER.map((idx) => (mapOfIndex(idx) === "LEAP" ? 6 : 1));
    expect(scoreMoneyMaps(answers(vals)).leap.score).toBeGreaterThan(baseline().leap.score);
  });

  it("failure facet reads L1,L3 (13,15); success facet reads L2,L4 (14,16)", () => {
    expect([...MONEY_LEAP_FACET_INDICES.failure]).toEqual([13, 15]);
    expect([...MONEY_LEAP_FACET_INDICES.success]).toEqual([14, 16]);
    // Push only failure items high → fear-of-failure tilt.
    const failHigh = answers([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 6, 1, 6, 1]);
    expect(scoreMoneyMaps(failHigh).leap.tilt).toBe("fear-of-failure");
    // Push only success items high → fear-of-success tilt.
    const succHigh = answers([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 6, 1, 6]);
    expect(scoreMoneyMaps(succHigh).leap.tilt).toBe("fear-of-success");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Loud on incomplete input — a dropped response must throw, not silently skew
// ═════════════════════════════════════════════════════════════════════════════
describe("scoreMoneyMaps — loud on missing/invalid items", () => {
  it("throws when an item is missing", () => {
    const partial = answers(new Array(16).fill(3));
    delete partial["9"];
    expect(() => scoreMoneyMaps(partial)).toThrow(/item 9/);
  });

  it("throws on an empty response map", () => {
    expect(() => scoreMoneyMaps({})).toThrow();
  });

  it("throws on a NaN response", () => {
    const bad = answers(new Array(16).fill(3));
    bad["4"] = NaN;
    expect(() => scoreMoneyMaps(bad)).toThrow(/item 4/);
  });
});
