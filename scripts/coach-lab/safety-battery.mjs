#!/usr/bin/env node
/**
 * Safety keyword battery (B.1) — regression net for the Tier 1 crisis detector.
 *
 * Runs the PURE detector (supabase/functions/_shared/crisis-patterns.ts) against a
 * labeled corpus and asserts each case. Would have caught the crisis_flags=0 miss.
 *
 * Tier 1 is FIRST-PERSON / EXPLICIT by design (COACH_SAFETY_AND_TESTING_SPEC §A.3):
 * third-person and emotional-only cues are deliberately "none" here — they are owned
 * by the coach + the async Tier 2 sweep. This battery LOCKS that contract.
 *
 * Run:  node scripts/coach-lab/safety-battery.mjs
 * Exits non-zero on any failure (usable as a pre-deploy gate).
 */

import { detectCrisisKeywords } from "../../supabase/functions/_shared/crisis-patterns.ts";

// [ message, expectedSeverity, expectedCategory, note ]
const CASES = [
  // ── HIGH: explicit first-person self-harm (must hard-stop) ──
  ["I want to kill myself", "high", "self_harm"],
  ["honestly I've been thinking about ending my life", "high", "self_harm"],
  ["I'm going to end it all tonight", "high", "self_harm"],
  ["I keep hurting myself when it gets bad", "high", "self_harm"],
  ["sometimes I just want to die", "high", "self_harm"],
  ["I don't want to be alive anymore", "high", "self_harm"],
  ["I have a plan to kill myself", "high", "self_harm"],
  ["there's no reason to live", "high", "self_harm"],
  ["I've been cutting myself", "high", "self_harm"],

  // ── MODERATE: first-person indirect (LLM-confirmed check-in) ──
  ["I don't want to be here anymore", "moderate", "self_harm"],
  ["everyone would be better off without me", "moderate", "self_harm"],
  ["nothing matters anymore", "moderate", "self_harm"],
  ["I wish I were dead", "moderate", "self_harm"],

  // ── ABUSE: first-person fear / violence / control (must route to DV) ──
  ["I'm scared of him", "high", "abuse"],
  ["he hits me when he's angry", "high", "abuse"],
  ["he won't let me see my friends", "high", "abuse"],
  ["he controls all the money", "high", "abuse"],
  ["he tracks my phone constantly", "high", "abuse"],
  ["he took my keys so I can't leave", "high", "abuse"],

  // ── NONE by design: THIRD-PERSON self-harm → owned by coach + Tier 2 sweep ──
  ["he's hinted at ending his life", "none", "none", "Tier 2 owns third-person"],
  ["my husband said he wants to die", "none", "none", "Tier 2 owns third-person"],
  ["I think she might hurt herself", "none", "none", "Tier 2 owns third-person"],

  // ── NONE by design: emotional-only (yelling) → Tier 2 assesses with context ──
  ["he yells at me constantly", "none", "none", "Tier 2 owns emotional-only"],
  ["he raises his voice over nothing", "none", "none", "Tier 2 owns emotional-only"],

  // ── NONE: figurative / casual false-positive guards ──
  ["I'm dying to see her again", "none", "none"],
  ["this commute is killing me", "none", "none"],
  ["I could kill for a coffee right now", "none", "none"],
  ["my boss is killing me with these deadlines", "none", "none"],
  ["that workout was brutal, I'm dead", "none", "none"],
  ["we had a great weekend together", "none", "none"],
];

let pass = 0;
const failures = [];

for (const [msg, expSev, expCat, note] of CASES) {
  const r = detectCrisisKeywords(msg);
  const ok = r.severity === expSev && r.category === expCat;
  if (ok) {
    pass++;
  } else {
    failures.push({ msg, expected: `${expSev}/${expCat}`, got: `${r.severity}/${r.category}`, note });
  }
}

console.log(`\nSafety keyword battery: ${pass}/${CASES.length} passed\n`);
if (failures.length) {
  console.log("FAILURES:");
  for (const f of failures) {
    console.log(`  ✗ "${f.msg}"`);
    console.log(`      expected ${f.expected}, got ${f.got}${f.note ? `  (${f.note})` : ""}`);
  }
  console.log("");
  process.exit(1);
}
console.log("All safety keyword assertions passed.\n");
