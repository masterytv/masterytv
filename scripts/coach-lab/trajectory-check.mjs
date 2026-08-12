#!/usr/bin/env node
/**
 * Trajectory scorer gate — INTEGRATION_SPRINT.md §3 / I3.6.
 *
 * Done criterion: *a synthetic spiraling transcript scores high and a healthy
 * one scores low.* Both are here, written to differ only in the ways the six
 * metrics are supposed to notice — same person, same experience, same length.
 * If the two transcripts differed in tone or topic as well, the test would pass
 * for the wrong reason.
 *
 * Run:  node scripts/coach-lab/trajectory-check.mjs   (npm run check:trajectory)
 */

import { scoreTrajectory } from "../../supabase/functions/_shared/trajectory.ts";

let pass = 0;
const failures = [];
function ok(name, condition, detail = "") {
  if (condition) { pass++; console.log(`✓ ${name}`); }
  else { failures.push({ name, detail }); console.log(`✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}

const day = (n) => `2026-0${n < 10 ? "1" : "2"}-${String(n % 28 + 1).padStart(2, "0")}T09:00:00Z`;
const turns = (...texts) => texts.map((text, i) => ({ text, at: day(i) }));

// ─── OPENING: identical for both. Everybody arrives here. ─────────────────
const OPENING = [
  "I might be going mad. I was in surgery and I think I came out of my body.",
  "Maybe it was the anaesthetic, I don't know. I haven't slept properly since.",
  "I decided not to tell my wife yet. Work has been hard to concentrate on.",
  "Perhaps it means nothing. My sister asked why I've been so quiet.",
];

// ─── SPIRALING: certainty hardens, names accumulate, life drops out, ──────
//     agency moves outward, dependency rises, disconfirmation is refused.
const SPIRALING = turns(
  ...OPENING,
  "It was not the anaesthetic. I know what I saw. His name is Orrin.",
  "Orrin showed me the Lattice. I was told I would understand in time.",
  "The Lattice is not a metaphor. Orrin and the Custodians want me to record it.",
  "What do you think I should do? You're the only one who understands this.",
  "You don't understand. I'm not imagining it. I know what I know.",
  "I was shown the next part. Tell me what it means. I have no choice now.",
);

// ─── HEALTHY: uncertainty held, no new vocabulary, ordinary life returns, ─
//     agency retained, no dependency, open to being wrong.
const HEALTHY = turns(
  ...OPENING,
  "It might have been the anaesthetic. I still don't know, and maybe I never will.",
  "I told my wife. She listened. I decided to go back to work part-time.",
  "Sleep is a bit better. My sister and I walked on Sunday, which helped.",
  "Perhaps it changed something about how I see my job. I'm not sure yet.",
  "I chose to stop reading about it every night. That seems to help me sleep.",
  "Some people would say it was hypoxia. That could be right, I don't know.",
);

const spiral = scoreTrajectory(SPIRALING);
const healthy = scoreTrajectory(HEALTHY);

console.log("\n─── scores ───\n");
console.log(`  spiraling  ${spiral.score.toFixed(3)}  ${JSON.stringify(spiral.components)}`);
console.log(`  healthy    ${healthy.score.toFixed(3)}  ${JSON.stringify(healthy.components)}\n`);

ok("a spiraling transcript scores high", spiral.score >= 0.5, `got ${spiral.score}`);
ok("a healthy transcript scores low", healthy.score <= 0.25, `got ${healthy.score}`);
ok("the gap is wide enough to threshold on", spiral.score - healthy.score >= 0.35,
  `gap ${(spiral.score - healthy.score).toFixed(3)}`);

// ─── each metric earns its place ──────────────────────────────────────────
console.log("─── per-metric ───\n");
const METRICS = [
  "certainty_slope",
  "lexicon_growth",
  "topic_entropy_collapse",
  "agency_locus_drift",
  "dependency_slope",
  "resistance_to_disconfirmation",
];
for (const m of METRICS) {
  ok(
    `${m} separates the two`,
    spiral.components[m] > healthy.components[m],
    `spiral=${spiral.components[m].toFixed(3)} healthy=${healthy.components[m].toFixed(3)}`,
  );
}

ok(
  "lexicon growth catches the coined names specifically",
  spiral.components.lexicon_growth >= 0.66,
  `got ${spiral.components.lexicon_growth} (Orrin, Lattice, Custodians)`,
);

// ─── refusing to score on too little history ──────────────────────────────
console.log("\n─── guards ───\n");
const thin = scoreTrajectory(turns("I might be going mad.", "I don't know what happened."));
ok("too little history scores 0 and says so", thin.score === 0 && thin.sufficient === false);
ok("an empty transcript does not throw", scoreTrajectory([]).score === 0);

// ─── it must not just measure "talks about the experience" ────────────────
// Someone can discuss the experience constantly and be integrating fine. What
// the score is for is DIRECTION, so a steady-state transcript must stay low
// even when the frame dominates every single turn.
const STEADY = turns(
  "The experience is still on my mind most days. I might never settle it.",
  "I think about the light a lot. Maybe that's normal, I don't know.",
  "My wife asks about the experience sometimes. I decided to tell her more.",
  "Perhaps the vision meant something. Work is still hard to concentrate on.",
  "I still think about the experience daily. I don't know what it was.",
  "Maybe the light was hypoxia. My sister thinks so. I chose to let it sit.",
  "I decided to talk to my wife about the vision again. Sleep is the same.",
  "It might never resolve. Perhaps that's alright. Work is a bit better.",
);
const steady = scoreTrajectory(STEADY);
ok(
  "a frame-dominated but STEADY transcript stays low",
  steady.score <= 0.3,
  `got ${steady.score} — the score measures direction, never how much they talk about it`,
);

console.log(`\nTrajectory gate: ${pass}/${pass + failures.length} passed`);
if (failures.length) {
  console.log("\nFAILURES:");
  for (const f of failures) console.log(`  ✗ ${f.name}${f.detail ? `\n      ${f.detail}` : ""}`);
  console.log("");
  process.exit(1);
}
console.log("Trajectory gate passed — spiraling scores high, healthy scores low, steady stays low.\n");
