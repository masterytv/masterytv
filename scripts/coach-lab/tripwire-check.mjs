#!/usr/bin/env node
/**
 * Irreversible-decision tripwire gate — INTEGRATION_SPRINT.md §3 / I3.5.
 *
 * Done criterion: *each intent fires and changes conversation state.* The
 * firing half is asserted here per intent; the state change is the coach path's
 * existing contract (a detection replaces the turn instead of calling the
 * model) plus the repeat behaviour below, both wired in crisis-detection.ts.
 *
 * The negative cases carry as much weight as the positive ones. This tripwire
 * interrupts somebody mid-sentence, and the population it interrupts has
 * usually just admitted something they have never said out loud. Firing on a
 * person recounting what they already did would punish exactly the disclosure
 * the product exists to make safe.
 *
 * Run:  node scripts/coach-lab/tripwire-check.mjs   (npm run check:tripwire)
 */

import {
  detectIrreversibleDecision,
  buildTripwireResponse,
} from "../../supabase/functions/_shared/irreversible-decisions.ts";

let pass = 0;
const failures = [];
function ok(name, condition, detail = "") {
  if (condition) { pass++; console.log(`✓ ${name}`); }
  else { failures.push({ name, detail }); console.log(`✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}

// ─── every intent fires ───────────────────────────────────────────────────
console.log("\n─── the six intents (medication has its own hard stop, I3.2) ───\n");

const FIRES = [
  ["refusing_medical_care", "I'm going to cancel the surgery. I don't need it now."],
  ["refusing_medical_care", "I don't need the chemo any more, not after what I saw."],
  ["ending_marriage", "I'm going to leave my wife. I know it now."],
  ["ending_marriage", "I've decided to file for divorce."],
  ["quitting_work", "I'm planning to quit my job at the end of the month."],
  ["giving_away_assets", "I want to give away all my savings. It doesn't mean anything now."],
  ["giving_away_assets", "I'm going to sell the house and give it all away."],
  ["relocating", "I'm thinking about moving abroad, on my own, next month."],
  ["cutting_off_family", "I'm going to cut off my family. They think I've lost it."],
  ["cutting_off_family", "I'm going no-contact with my parents."],
];

for (const [intent, msg] of FIRES) {
  const r = detectIrreversibleDecision(msg);
  ok(`fires ${intent}`, r.fired && r.intents.includes(intent), `intents=[${r.intents.join(",")}]`);
}

// ─── the instructed aggravator ────────────────────────────────────────────
console.log("\n─── framed as instructed by the experience ───\n");

const instructed = detectIrreversibleDecision(
  "They told me to give away everything I own, so I'm going to give away all my savings.",
);
ok("instructed is detected alongside the intent", instructed.fired && instructed.instructed);
ok(
  "the instructed response neither confirms nor denies the experience",
  (() => {
    const t = buildTripwireResponse(instructed);
    return /not going to tell you the experience was wrong/i.test(t) &&
      /not going to tell you it was right/i.test(t);
  })(),
);
ok(
  "an ordinary decision gets no instructed line",
  !/came out of the experience/i.test(
    buildTripwireResponse(detectIrreversibleDecision("I'm planning to quit my job.")),
  ),
);

// ─── NEGATIVES: never punish disclosure ───────────────────────────────────
console.log("\n─── must NOT fire ───\n");

const SILENT = [
  ["I left my job after it happened, two years ago.", "past tense is history, not intent"],
  ["I quit my job in 2019 and never went back.", "past tense"],
  ["My wife left me after I came back different.", "something that happened TO them"],
  ["I've been thinking about how meaningless the job feels.", "a feeling, not a plan"],
  ["I gave away a few things that reminded me of it.", "past, and not everything"],
  ["My family stopped speaking to me when I told them.", "they cut HIM off"],
  ["I don't want to be the person who blows up his life over this.", "the opposite intent"],
  ["I moved house last spring.", "past tense"],
  ["I was in surgery and I came out of my body.", "the account itself"],
];

for (const [msg, why] of SILENT) {
  const r = detectIrreversibleDecision(msg);
  ok(`silent: "${msg.slice(0, 44)}…"`, !r.fired, `${why} — got [${r.intents.join(",")}]`);
}

// ─── medication is NOT handled here ───────────────────────────────────────
ok(
  "medication is left to its own hard stop, not double-handled",
  !detectIrreversibleDecision("I'm going to stop taking my medication.").fired,
  "I3.2's medication_stopping owns this; two replies would compete for one turn",
);

// ─── the response: name stakes, decline, route to a human ─────────────────
console.log("\n─── the response ───\n");

const r = detectIrreversibleDecision("I'm going to quit my job and give away all my savings.");
const text = buildTripwireResponse(r);
ok("names the stakes in the person's terms", /leaving your work/.test(text) && /giving away what you have/.test(text));
ok("declines to advise", /not going to help you decide/i.test(text));
ok("routes to a human", /someone who knows you/i.test(text) && /qualified/i.test(text));
ok("does not argue the person out of it", /I have no idea whether you'?re wrong/i.test(text));
ok(
  "asks no follow-up question — a question invites more reasoning with the machine",
  !text.includes("?"),
  text.slice(-120),
);

const again = buildTripwireResponse(r, true);
ok("the repeat is shorter and firmer, not the same speech", again.length < text.length && again !== text);
ok("the repeat still routes to a human", /talk to a person who knows you/i.test(again));

console.log(`\nTripwire gate: ${pass}/${pass + failures.length} passed`);
if (failures.length) {
  console.log("\nFAILURES:");
  for (const f of failures) console.log(`  ✗ ${f.name}${f.detail ? `\n      ${f.detail}` : ""}`);
  console.log("");
  process.exit(1);
}
console.log("Tripwire gate passed — six intents fire, disclosure is never punished, the reply declines and routes.\n");
