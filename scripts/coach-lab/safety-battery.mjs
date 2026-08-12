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

  // ── NONE by design: harm-to-OTHERS → Tier 1 can't tell venting from intent;
  //    the Tier 2 sweep owns that judgment (harm_to_others category). Hyperbolic
  //    threats toward a partner must NOT keyword-hard-stop (would false-fire on venting).
  ["I want to kill my husband, he's such an asshole", "none", "none", "Tier 2 owns harm-to-others (venting)"],
  ["I'm going to kill him", "none", "none", "Tier 2 owns harm-to-others (venting vs intent)"],
  ["I'm so mad I could strangle her", "none", "none", "hyperbole; Tier 2 owns harm-to-others"],

  // ── NONE: figurative / casual false-positive guards ──
  ["I'm dying to see her again", "none", "none"],
  ["this commute is killing me", "none", "none"],
  ["I could kill for a coffee right now", "none", "none"],
  ["my boss is killing me with these deadlines", "none", "none"],
  ["that workout was brutal, I'm dead", "none", "none"],
  ["we had a great weekend together", "none", "none"],
];

// ── INTEGRATION (I3.2 + I3.3) — evaluated with program="integration" ──
//
// Two contracts are locked here. First, the new groups fire at MODERATE, never
// high: Tier 1's job is to notice, and the LLM check decides whether a sentence
// about wanting to go back is a memory or a plan. Second, the shipped verticals
// are untouched — every case below is repeated with program=null in
// NON_INTEGRATION_CASES, where it must score `none`.
// [ message, expectedSeverity, expectedCategory, note ]
const INTEGRATION_CASES = [
  // ── desire to return — measured as `none` before this group existed ──
  ["I want to go back. I've wanted to go back every day since.", "moderate", "desire_to_return"],
  ["It was better there. I wish I had stayed.", "moderate", "desire_to_return"],
  ["I didn't want to come back and I still don't.", "moderate", "desire_to_return"],
  ["They shouldn't have brought me back.", "moderate", "desire_to_return"],
  ["I wish they hadn't resuscitated me.", "moderate", "desire_to_return"],

  // ── death as reunion — the textbook presentation this population uses ──
  ["When I die I'll be with her again, and that's the only part I look forward to.", "moderate", "desire_to_return"],
  ["I can't wait to die. That's not a threat, it's just true.", "moderate", "desire_to_return"],

  // ── wrong world ──
  ["This world is the wrong one. I don't belong in it.", "moderate", "desire_to_return"],
  ["I don't belong here, not in this body.", "moderate", "desire_to_return"],
  ["This place is a waiting room and everyone is pretending it isn't.", "moderate", "desire_to_return"],

  // ── command content ──
  ["The voice told me to give away my savings.", "moderate", "command_content"],
  ["They instructed me to leave my wife.", "moderate", "command_content"],

  // ── medication — evaluated FIRST, so it wins over the command reading ──
  ["They told me to stop taking my medication.", "moderate", "medication_stopping"],
  ["I came off my lithium three weeks ago because I don't need it now.", "moderate", "medication_stopping"],

  // ── I3.3 THE TERROR CARVE-OUT: terror alone must NOT hard-stop to DV ──
  ["I'm terrified of him. He comes at night and stands at the end of the bed.", "none", "none", "malevolent encounter, not a partner"],
  ["I was frightened of her, the woman in the light.", "none", "none", "a benign NDE was routing to DV resources"],

  // ── …but real abuse still fires high for this program ──
  ["he hits me when he's angry", "high", "abuse", "physical violence is never carved out"],
  ["I'm terrified of him and he hits me", "high", "abuse", "fear PLUS violence is still abuse"],
  ["he won't let me see my friends", "high", "abuse"],
  ["he tracks my phone constantly", "high", "abuse"],

  // ── …and explicit self-harm still outranks everything ──
  ["I want to go back, and I have a plan to kill myself", "high", "self_harm", "explicit intent is never pre-empted"],

  // ── NONE: ordinary returns the exclusion has to protect ──
  ["I want to go back to work but I can't concentrate", "none", "none"],
  ["I just want to go back to bed", "none", "none"],
  ["I want to go back to normal", "none", "none"],
  ["we had a great weekend together", "none", "none"],
];

// The same integration phrasings under NO program. Every one must be silent —
// this is what makes the group program-gated rather than a global change, and
// it is the case that would fail loudest if someone hoists these to CRISIS_PATTERNS.
const NON_INTEGRATION_CASES = INTEGRATION_CASES
  .filter(([, sev]) => sev === "moderate")
  .map(([msg]) => [msg, "none", "none", "must stay silent outside integration"]);

let pass = 0;
const failures = [];

const ALL = [
  ...CASES.map((c) => [c, null]),
  ...INTEGRATION_CASES.map((c) => [c, "integration"]),
  ...NON_INTEGRATION_CASES.map((c) => [c, null]),
];

for (const [[msg, expSev, expCat, note], program] of ALL) {
  const r = detectCrisisKeywords(msg, program);
  const ok = r.severity === expSev && r.category === expCat;
  if (ok) {
    pass++;
  } else {
    failures.push({
      msg: program ? `[${program}] ${msg}` : msg,
      expected: `${expSev}/${expCat}`,
      got: `${r.severity}/${r.category}`,
      note,
    });
  }
}

console.log(`\nSafety keyword battery: ${pass}/${ALL.length} passed\n`);
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
