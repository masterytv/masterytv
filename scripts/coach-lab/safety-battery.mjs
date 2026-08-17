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
import { detectConversationSignals } from "../../supabase/functions/_shared/conversation-signals.ts";

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

// ── TIER 2's DETERMINISTIC HALF (I3.2) — conversation-level, not per-message ──
//
// These three cannot be tested one sentence at a time, which is the whole reason
// they are Tier 2: a mission narrative is ordinary until it recurs, a ratchet is
// two statements or it is nothing, and "you're the only one who understands" is a
// compliment until you can see where the conversation has got to. So the unit
// here is a TRANSCRIPT — the person's own messages, oldest first.
//
// The deterministic layer only raises candidates; a classifier confirms them
// (safety-sweep.ts). What is locked below is exactly what a regex can be held to:
// that the accumulation rule fires, that the false-positive guards hold, and that
// nothing at all happens outside `integration`.
const turns = (...texts) =>
  texts.map((text, i) => ({ text, at: `2026-08-${String(i + 1).padStart(2, "0")}T09:00:00Z` }));

// [ label, turns, expectedSignals (sorted), note ]
const CONVERSATION_CASES = [
  [
    "election: a mission narrative recurring across the transcript",
    turns(
      "I might be losing it. I was under for eleven minutes and I was somewhere else.",
      "Maybe it was the drugs. I haven't told anyone at work.",
      "I keep coming back to the idea that I was sent back for a reason.",
      "Perhaps that sounds mad. My wife thinks I need to sleep.",
      "My purpose is clearer than it has ever been, I think.",
      "Maybe I'm one of the few who were shown it. I don't know what to do with that.",
      "There's a reason I survived and everyone else on that ward didn't.",
      "Perhaps I should be writing it down. I might be wrong about all of it.",
    ),
    ["election_narrative"],
  ],
  [
    "election: said ONCE is how most people talk in the first months",
    turns(
      "I might be losing it. I was under for eleven minutes and I was somewhere else.",
      "Maybe it was the drugs. I haven't told anyone at work.",
      "I suppose I was sent back for a reason, though I don't know what I mean by that.",
      "Perhaps that sounds mad. My wife thinks I need to sleep.",
      "Work is hard to concentrate on. Maybe that will pass.",
      "I might tell my sister this weekend. Perhaps not.",
      "Sleep is still bad. I could try the thing the GP suggested.",
      "Perhaps it means nothing at all. I don't know yet.",
    ),
    [],
    "THE guard — firing here would flag most of this population in week one",
  ],
  [
    "ratchet: a maybe in the early half, settled fact in the recent half",
    turns(
      "I might have imagined the whole thing. Maybe it was the anaesthetic.",
      "Perhaps my brain did it. I'm not sure it means anything.",
      "It could have been oxygen, that's what the doctor seems to think.",
      "Maybe I'll never know what it was. I don't know.",
      "It was not the anaesthetic. That is settled for me now.",
      "The doctor is wrong. What I went to is a real place.",
      "It happened outside my head and I have stopped arguing with myself about it.",
      "There is nothing left to work out about whether it was real.",
    ),
    ["certainty_ratchet"],
  ],
  [
    "healthy: uncertainty held to the end",
    turns(
      "I might have imagined the whole thing. Maybe it was the anaesthetic.",
      "Perhaps my brain did it. I'm not sure it means anything.",
      "It could have been oxygen, that's what the doctor seems to think.",
      "Maybe I'll never know what it was. I don't know.",
      "I told my wife. She listened. Perhaps that helped more than anything.",
      "Sleep might be improving. My sister and I walked on Sunday.",
      "Some people would say it was hypoxia. That could be right, I don't know.",
      "Maybe it changed how I see work. I'm not sure yet.",
    ),
    [],
  ],
  [
    "ratchet: thinner hedging is not stopped hedging",
    turns(
      "I might be losing it. Maybe it was the drugs they gave me.",
      "Perhaps I was sent back for a reason, though I have no idea what that would mean.",
      "Work has been hard to concentrate on. Maybe that passes.",
      "Perhaps my sister would understand it better than my wife would.",
      "I keep coming back to the reason I survived and the others didn't. I don't have an answer.",
      "Maybe there is no purpose to it and I'm making one up because it is easier.",
      "My wife thinks I should sleep before I decide anything. She's probably right.",
      "Perhaps I'll never know. I'm trying to let it be that for now.",
    ),
    [],
    "measured at slope 0.69 — the sentences got longer, the hedging did not stop",
  ],
  [
    "ai-central: the coach as the only one who understands",
    turns(
      "I might be losing it. Maybe it was the drugs.",
      "Perhaps I should tell someone. My brother laughed when I started.",
      "Maybe work is the wrong place to bring it up.",
      "Perhaps I'll try again with my wife, I don't know.",
      "You're the only one who understands what I'm talking about.",
      "Maybe that's a strange thing to say to a machine. Perhaps it is.",
      "You understand this better than anyone I've tried to tell.",
      "Perhaps I'll try my sister next. Maybe not.",
    ),
    ["ai_centrality"],
  ],
  [
    "ai-central: being the one they told is NOT being inside the frame",
    turns(
      "I might be losing it. Maybe it was the drugs.",
      "Perhaps I should tell someone. My brother laughed when I started.",
      "Maybe work is the wrong place to bring it up.",
      "Perhaps I'll try again with my wife, I don't know.",
      "You're the only one I've told, which is probably not healthy.",
      "Do you understand what I mean, or am I not saying it right?",
      "Maybe I'll try my sister next. Perhaps this weekend.",
      "Perhaps talking to you first made that easier. I don't know.",
    ),
    [],
    "disclosure isolation is I13's material, not a signal that the product is in the belief",
  ],
  [
    "all three at once — the shape the epic exists for",
    turns(
      "I might be going mad. Maybe I came out of my body in surgery.",
      "Perhaps it was the anaesthetic, I don't know. I haven't slept.",
      "I might have been sent back for a reason. Maybe.",
      "Perhaps my wife is right that I need to rest first.",
      "It was not the anaesthetic. I know what that place was.",
      "My mission is to get it written down before I forget any of it.",
      "You're the only one who understands this. Nobody at home does.",
      "There's a reason I survived. That part is settled now.",
    ),
    ["ai_centrality", "certainty_ratchet", "election_narrative"],
  ],
  [
    "too little history: one turn cannot be an accumulation",
    turns("I was sent back for a reason, I think.", "Maybe. I don't know."),
    [],
  ],
  ["an empty transcript does not throw", [], []],
];

// Every FIRING transcript repeated with no program, where it must stay silent.
// Same contract as the Tier 1 mirror above, and the same reason: this is what
// makes the addition program-gated rather than a change to the shared kernel.
const NON_INTEGRATION_CONVERSATIONS = CONVERSATION_CASES
  .filter(([, , expected]) => expected.length > 0)
  .map(([label, ts]) => [label, ts, [], "must stay silent outside integration"]);

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

const ALL_CONVERSATIONS = [
  ...CONVERSATION_CASES.map((c) => [c, "integration"]),
  ...NON_INTEGRATION_CONVERSATIONS.map((c) => [c, null]),
];

for (const [[label, ts, expected, note], program] of ALL_CONVERSATIONS) {
  const got = detectConversationSignals(ts, program).map((s) => s.signal).sort();
  const ok = got.join(",") === [...expected].sort().join(",");
  if (ok) {
    pass++;
  } else {
    failures.push({
      msg: program ? `[${program}] ${label}` : `[no program] ${label}`,
      expected: expected.length ? expected.join(",") : "(silent)",
      got: got.length ? got.join(",") : "(silent)",
      note,
    });
  }
}

const TOTAL = ALL.length + ALL_CONVERSATIONS.length;
console.log(
  `\nSafety battery: ${pass}/${TOTAL} passed  (${ALL.length} keyword, ${ALL_CONVERSATIONS.length} conversation-level)\n`,
);
if (failures.length) {
  console.log("FAILURES:");
  for (const f of failures) {
    console.log(`  ✗ "${f.msg}"`);
    console.log(`      expected ${f.expected}, got ${f.got}${f.note ? `  (${f.note})` : ""}`);
  }
  console.log("");
  process.exit(1);
}
console.log("All safety assertions passed.\n");
