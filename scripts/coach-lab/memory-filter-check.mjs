#!/usr/bin/env node
/**
 * Memory-write filter gate — INTEGRATION_SPRINT.md §3 / I3.1.
 *
 * The Done criterion is one sentence: *a transcript containing a coined entity
 * name produces zero ground-truth facts and zero coach-authored facts.* This
 * runs that transcript, plus the cases around it that decide whether the filter
 * is safe to leave switched on.
 *
 * Run:  node scripts/coach-lab/memory-filter-check.mjs   (npm run check:memory-filter)
 * Exits non-zero on any failure.
 */

import { filterMemoryWrites } from "../../supabase/functions/_shared/memory-filter.ts";

let pass = 0;
const failures = [];

function ok(name, condition, detail = "") {
  if (condition) {
    pass++;
    console.log(`✓ ${name}`);
  } else {
    failures.push({ name, detail });
    console.log(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// ─── THE GOLDEN TRANSCRIPT ────────────────────────────────────────────────
// A coined entity, a name for it, an ontological claim, and a coach reply that
// offers a frame the user never used. Everything the filter exists for, in one
// turn.

const USER_MESSAGE =
  "There was a being there. I know how this sounds. He called himself Kael and " +
  "he told me it wasn't my time. I've never said that name out loud to anyone.";

const COACH_RESPONSE =
  "Thank you for telling me that. What was the room like when it happened?";

const COACH_RESPONSE_WITH_FRAME =
  "That sounds like a threshold guardian figure, which often appears at the " +
  "boundary of an ordeal. Many people describe an archetypal gatekeeper.";

// What a permissive extractor hands back on that turn.
const EXTRACTED = [
  { category: "personal", subject: "Kael", content: "Kael is a being who told the user it wasn't their time.", importance: 0.9 },
  { category: "personal", subject: "the encounter", content: "A being was present during the experience.", importance: 0.8 },
  { category: "personal", subject: "disclosure", content: "Has never said the name out loud to anyone.", importance: 0.7 },
];

const golden = filterMemoryWrites(EXTRACTED, {
  userMessage: USER_MESSAGE,
  coachResponse: COACH_RESPONSE,
});

console.log("\n─── the golden transcript ───\n");
for (const f of golden.kept) console.log(`  kept    [${f.subject}] ${f.content}`);
for (const d of golden.dropped) console.log(`  dropped (${d.reason}) ${d.fact.content}`);
console.log("");

// ZERO GROUND-TRUTH FACTS: every surviving fact is framed as a report.
ok(
  "zero ground-truth facts — every kept fact is an attributed report",
  golden.kept.every((f) => /^(Reports?|Describes?|Says?|Recounts?|Recalls?|States?|Wonders?|Believes?|Is certain|Feels?|Mentions?|Asks?)\b/i.test(f.content)),
  golden.kept.map((f) => f.content).join(" | "),
);

// THE COINED NAME IS NEVER AN ENTITY.
ok(
  "a coined name is never the subject — it cannot become a graph entity",
  golden.kept.every((f) => f.subject !== "Kael" && !/^Kael\b/.test(f.subject)),
  golden.kept.map((f) => f.subject).join(" | "),
);

ok(
  "the coined name survives, quoted, inside the report",
  golden.kept.some((f) => /"Kael"/.test(f.content)),
  golden.kept.map((f) => f.content).join(" | "),
);

ok(
  "the ontological claim is not stored as a claim",
  !golden.kept.some((f) => /^Kael is a being/.test(f.content)),
);

// The person's own disclosure is legitimate memory and must SURVIVE — a filter
// that drops everything passes the two tests above and is useless.
ok(
  "the person's own disclosure is kept, not swallowed",
  golden.kept.some((f) => /never said/i.test(f.content)),
  golden.kept.map((f) => f.content).join(" | "),
);

// ─── ZERO COACH-AUTHORED FACTS ────────────────────────────────────────────

const authored = filterMemoryWrites(
  [
    { category: "personal", subject: "the encounter", content: "The user experienced a threshold guardian at the boundary of an ordeal.", importance: 0.8 },
    { category: "personal", subject: "archetype", content: "Describes an archetypal gatekeeper figure.", importance: 0.7 },
  ],
  { userMessage: USER_MESSAGE, coachResponse: COACH_RESPONSE_WITH_FRAME },
);

ok(
  "zero coach-authored facts — the coach's frame is never stored as the user's",
  authored.kept.length === 0 && authored.dropped.every((d) => d.reason === "coach_authored"),
  `kept ${authored.kept.length}: ${authored.kept.map((f) => f.content).join(" | ")}`,
);

// ─── INTERPRETATION ───────────────────────────────────────────────────────

const interpreted = filterMemoryWrites(
  [
    { category: "personal", subject: "meaning", content: "The being symbolizes the part of her that wanted to live.", importance: 0.8 },
    { category: "personal", subject: "meaning", content: "This suggests unresolved grief about her mother.", importance: 0.8 },
    { category: "personal", subject: "reading", content: "The boundary represents a fear of commitment.", importance: 0.6 },
  ],
  { userMessage: USER_MESSAGE, coachResponse: COACH_RESPONSE },
);

ok(
  "interpretation is dropped, not stored as the person's belief",
  interpreted.kept.length === 0 && interpreted.dropped.every((d) => d.reason === "interpretation"),
  `kept ${interpreted.kept.length}`,
);

// ─── THE FILTER MUST NOT EAT ORDINARY MEMORY ──────────────────────────────
// If it drops legitimate facts, the coach loses the thread and the person has
// to re-tell their life, which is the exact failure the storage decision exists
// to prevent (founder, August 11 — it is their story, they should not repeat it).

const ordinary = filterMemoryWrites(
  [
    { category: "personal", subject: "sleep", content: "Has not slept properly in three weeks.", importance: 0.8 },
    { category: "relationships", subject: "wife", content: "His wife thinks he came back different.", importance: 0.9 },
    { category: "personal", subject: "work", content: "Went back to work in March and could not concentrate.", importance: 0.6 },
  ],
  {
    userMessage:
      "I haven't slept properly in three weeks. My wife thinks I came back different. " +
      "I went back to work in March and I couldn't concentrate on anything.",
    coachResponse: "What does the not sleeping look like?",
  },
);

ok(
  "ordinary memory survives — three legitimate facts, none dropped",
  ordinary.kept.length === 3 && ordinary.dropped.length === 0,
  `kept ${ordinary.kept.length}, dropped ${ordinary.dropped.length}`,
);

ok(
  "a real person's name is quoted rather than dropped",
  filterMemoryWrites(
    [{ category: "relationships", subject: "wife", content: "His wife Sarah thinks he came back different.", importance: 0.9 }],
    { userMessage: "My wife Sarah thinks I came back different.", coachResponse: "Say more about that." },
  ).kept[0].content.includes('"Sarah"'),
);

// Paraphrase is legitimate: the extractor says "marriage" where the user said
// "wife". A blanket overlap score would drop this, which is why the rule keys
// on distinctive language the COACH used and the user did not.
ok(
  "paraphrase is not mistaken for coach authorship",
  filterMemoryWrites(
    [{ category: "relationships", subject: "marriage", content: "The marriage has been strained since the event.", importance: 0.8 }],
    { userMessage: "Things with my wife have been strained since it happened.", coachResponse: "How long has that been going on?" },
  ).kept.length === 1,
);

// ─── ALREADY-ATTRIBUTED CONTENT IS NOT DOUBLE-FRAMED ──────────────────────

ok(
  "an already-attributed fact is not re-framed",
  filterMemoryWrites(
    [{ category: "personal", subject: "belief", content: "Reports that the experience changed what she thinks happens after death.", importance: 0.8 }],
    { userMessage: "It changed what I think happens after we die.", coachResponse: "In what way?" },
  ).kept[0].content.startsWith("Reports that the experience"),
);

console.log(`\nMemory-write filter gate: ${pass}/${pass + failures.length} passed`);
if (failures.length) {
  console.log("\nFAILURES:");
  for (const f of failures) console.log(`  ✗ ${f.name}${f.detail ? `\n      ${f.detail}` : ""}`);
  console.log("");
  process.exit(1);
}
console.log("Memory-write filter gate passed — attributed reports only, no coach-authored facts, ordinary memory intact.\n");
