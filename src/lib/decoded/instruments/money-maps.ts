/**
 * Money Maps™ — the money vertical's instrument (program=money).
 *
 * Founder-approved v1 (MONEY_MAPS_INSTRUMENT.md, 2026-07-17): 16 first-person,
 * entrepreneur-situated items on a 1–6 agreement scale, all POSITIVELY keyed to
 * their Map (agree = more of the construct → no reverse-coding). Five dimensions:
 * four core Maps (GUARD/DRIVE/MIRROR/SHADOW) that generate the archetype, plus
 * the Fear (user-facing name since 2026-07-20; stored/internal key "LEAP" — a
 * state: how much fear is gating the edge).
 *
 * ⚠️ ITEM TEXT LOCKSTEP: supabase/functions/money-generate-report/index.ts
 * inlines this item bank (edge can't import src/) — a re-field must update both.
 *
 * ⚠️ ITEM TEXT IS CANONICAL ONCE SHIPPED — changing it invalidates stored
 * responses and forces retakes (DECODED_SCORING.md rule). Every string below is
 * OUR OWN wording; the construct names are ours; "Money Maps™" is our mark. We
 * never use "Money Scripts®" (Klontz) or KMSI-R items.
 *
 * SCOPE OF THIS FILE: the item bank only (data). The deterministic SCORER (Map
 * means → dominant/secondary → archetype → overclock flags → LEAP band+tilt) and
 * the archetype card are a separate leaf — see scripts/money-maps-scoring.mjs for
 * the locked reference algorithm + its 7 boundary tests, to be reproduced as the
 * production TS scorer + vitest. The canonical index→Map binding the scorer
 * consumes lives in MONEY_MAP_ITEM_INDICES below, next to the items it maps.
 */

import type { InstrumentDef } from "./core";

/**
 * Money Maps™ — 16 items, grouped here by Map (delivery order is randomized at
 * presentation, MONEY_MAPS_INSTRUMENT.md §2). The `index` is the canonical,
 * permanent item id the scorer keys on — never renumber a shipped item.
 */
export const MONEY_MAPS: InstrumentDef = {
  id: "money_maps",
  name: "Money Maps",
  shortName: "Money Maps",
  layer: "core",
  itemCount: 16,
  scaleMin: 1,
  scaleMax: 6,
  // 6-point agreement, shown as clickable chips (no neutral midpoint — forces a lean).
  scaleLabels: [
    "Strongly\nDisagree",
    "Disagree",
    "Slightly\nDisagree",
    "Slightly\nAgree",
    "Agree",
    "Strongly\nAgree",
  ],
  scaleType: "likert",
  description:
    "How true is each of these for you right now? There are no right answers — the honest one is the useful one.",
  estimatedMinutes: 3,
  items: [
    // ── GUARD (protect · control · watch the downside) — items 1–3 ──
    { index: 1, text: "I sleep better when I know exactly where my money stands, down to the dollar." },
    { index: 2, text: "Spending money I've worked hard for makes me uneasy — even when I can clearly afford it." },
    { index: 3, text: "I've talked myself out of a good opportunity because committing the money felt too risky." },
    // ── DRIVE (more · fuel · progress-as-proof) — items 4–6 ──
    { index: 4, text: "When I hit a money goal, the number I'm chasing quietly moves up almost immediately." },
    { index: 5, text: "I tell myself I'll ease up and enjoy things once I reach the next milestone." },
    { index: 6, text: "Most of what's stressing me right now, more money would solve." },
    // ── MIRROR (signal · worth · being seen) — items 7–9 ──
    { index: 7, text: "How much I'm earning affects how much I respect myself." },
    { index: 8, text: "I track how my success stacks up against my peers more than I'd like to admit." },
    { index: 9, text: "Part of why I want to make it big is so certain people finally take me seriously." },
    // ── SHADOW (money-as-suspect · undeserving) — items 10–12 ──
    { index: 10, text: "There's a money task or number I keep avoiding, even though I know I should face it." },
    { index: 11, text: "I undercharge, or hesitate to raise my prices, even when my work is worth more." },
    { index: 12, text: "Some part of me feels that really wanting wealth is a little greedy or unspiritual." },
    // ── THE LEAP (fear of failure AND fear of success · risk posture) — items 13–16 ──
    { index: 13, text: "The fear of failing again with money makes me play smaller than I could." },
    { index: 14, text: "Quietly, I wonder if I'd lose myself — or who I'd become — if I actually got what I want." },
    { index: 15, text: "I'd rather protect what I have than risk it for a shot at something much bigger." },
    { index: 16, text: "When I picture my business really taking off, part of me feels dread as much as excitement." },
  ],
};

/**
 * Canonical index→Map binding for the deterministic scorer (the leaf).
 * Core Maps are 3 items each; THE LEAP carries a 4th (its signature weight).
 * LEAP facets (MONEY_MAPS_INSTRUMENT.md §3.4): failure = mean(L1,L3) = indices
 * 13,15 · success = mean(L2,L4) = indices 14,16. All items positively keyed.
 */
export const MONEY_MAP_ITEM_INDICES = {
  GUARD: [1, 2, 3],
  DRIVE: [4, 5, 6],
  MIRROR: [7, 8, 9],
  SHADOW: [10, 11, 12],
  LEAP: [13, 14, 15, 16],
} as const;

export const MONEY_LEAP_FACET_INDICES = {
  /** fear of failure — L1, L3 */
  failure: [13, 15],
  /** fear of success — L2, L4 */
  success: [14, 16],
} as const;
