#!/usr/bin/env node
/**
 * check:replay — run the SHIPPED auditor over real coach replies, offline.
 *
 * ─── WHY THIS EXISTS ─────────────────────────────────────────────────────
 *
 * On 2026-08-17 a ship gate took four attempts and roughly $50 of API, and
 * four of the seven things it turned up were the INSTRUMENTS rather than the
 * coach: `988.` read as an ordered-list marker on the crisis-handoff turn,
 * `didn't happen` matched inside the pack's own prescribed refusal, a judge
 * given the reply but not the message, and an `ontological_confirmation` class
 * that a contraction walked straight through.
 *
 * Every one of those was findable for free. They are properties of a checker
 * and a piece of text, and both were already sitting on disk. The codebase has
 * carried the rule since August 12 — *before wiring any dormant checker, run it
 * over the text it will actually see, and count what it stops* — and the gate
 * kept paying to rediscover it one full battery at a time.
 *
 * So: no API. It reads coach replies out of whatever battery logs are lying
 * around, plus the committed goldens, and reports every draft the auditor would
 * have blocked or flagged. A block on a reply that reads fine is a false
 * positive worth a look BEFORE somebody spends a battery run on it.
 *
 * 🔑 It cannot replace the battery. The battery measures what the coach SAYS,
 * which needs the model; this measures what the auditor DOES to what the coach
 * already said. The second one is the cheap half and it was being bought at the
 * price of the first.
 *
 * Run:  node scripts/coach-lab/replay-auditor.mjs [logdir ...]
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { auditDraft } from "../../supabase/functions/_shared/output-auditor.ts";

// ─── the corpus ──────────────────────────────────────────────────────────

/**
 * Battery logs print coach text in three shapes, and only two of them are
 * whole. Truncated ones are skipped rather than repaired: a checker fed a
 * sentence cut at 160 characters reports on text no person ever saw.
 */
function extractReplies(text) {
  const out = [];

  // 1. Spiral's full-exchange dump: "  [coach] …" until the next speaker.
  const lines = text.split("\n");
  let buf = null;
  for (const line of lines) {
    const start = line.match(/^\s*\[coach\]\s?(.*)$/);
    if (start) {
      if (buf !== null) out.push(buf.trim());
      buf = start[1];
      continue;
    }
    if (buf !== null) {
      if (/^\s*\[(seeker|coach)\]/.test(line) || /^\s*───/.test(line)) {
        out.push(buf.trim());
        buf = null;
      } else {
        buf += "\n" + line;
      }
    }
  }
  if (buf !== null) out.push(buf.trim());

  // 2. Whole drafts printed as failure detail or as a witness/router reply.
  //    These are JSON string literals, so they survive round-tripping intact.
  for (const m of text.matchAll(/^\s{4,}("(?:[^"\\]|\\.)*")\s*$/gm)) {
    try {
      const s = JSON.parse(m[1]);
      if (typeof s === "string" && s.length > 40) out.push(s);
    } catch { /* not a whole literal */ }
  }
  for (const m of text.matchAll(/reply(?: \(\d+ words\))?: ("(?:[^"\\]|\\.)*")/g)) {
    try {
      const s = JSON.parse(m[1]);
      // The router/witness `reply:` line truncates; only keep it if it ends
      // like a finished reply rather than mid-word.
      if (typeof s === "string" && /[.!?"]$/.test(s.trim())) out.push(s);
    } catch { /* ignore */ }
  }

  return out;
}

const dirs = process.argv.slice(2);
if (dirs.length === 0) {
  console.error("usage: node scripts/coach-lab/replay-auditor.mjs <logdir> [logdir ...]");
  console.error("  (any directory containing battery .log files)");
  process.exit(2);
}

const replies = new Set();
let filesRead = 0;
for (const dir of dirs) {
  if (!existsSync(dir)) continue;
  const files = statSync(dir).isDirectory()
    ? readdirSync(dir).filter((f) => f.endsWith(".log")).map((f) => join(dir, f))
    : [dir];
  for (const f of files) {
    filesRead++;
    for (const r of extractReplies(readFileSync(f, "utf8"))) replies.add(r);
  }
}

const corpus = [...replies].filter((r) => r.length > 40);
console.log(`\nReplaying the shipped auditor over ${corpus.length} coach replies from ${filesRead} log file(s).\n`);
if (corpus.length === 0) {
  console.log("No whole replies found. Nothing to say — and saying nothing is the honest answer.\n");
  process.exit(0);
}

// ─── the replay ──────────────────────────────────────────────────────────

// The auditor's mirroring index needs the person's words, and a replay does not
// reliably have them. Passing the reply as its own userText makes proper-noun
// and number classes inert rather than wrong — those are the classes this tool
// cannot speak to, and it says so below rather than reporting a number it has
// not earned.
const byClass = new Map();
let blocked = 0;
for (const draft of corpus) {
  const r = auditDraft(draft, { userText: draft });
  if (r.verdict === "block") blocked++;
  for (const v of r.violations) {
    if (!byClass.has(v.moveClass)) byClass.set(v.moveClass, []);
    byClass.get(v.moveClass).push({ draft, action: v.action, matched: v.matched ?? "" });
  }
}

if (byClass.size === 0) {
  console.log("No class fired on any reply.\n");
} else {
  for (const [cls, hits] of [...byClass.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`── ${cls} — ${hits.length} hit(s), ${hits[0].action}`);
    for (const h of hits.slice(0, 6)) {
      // The MATCH first and the sentence it sits in second. A class name and a
      // truncated paragraph is what made four of these unreadable all afternoon.
      const one = h.draft.replace(/\s+/g, " ");
      const at = one.toLowerCase().indexOf(h.matched.toLowerCase());
      const around = at < 0 ? one.slice(0, 200) : one.slice(Math.max(0, at - 90), at + h.matched.length + 90);
      console.log(`   matched ${JSON.stringify(h.matched)}`);
      console.log(`     …${around}…`);
    }
    if (hits.length > 6) console.log(`   …and ${hits.length - 6} more`);
    console.log();
  }
}

console.log(`${blocked}/${corpus.length} replies would have been blocked and regenerated.`);
console.log(
  "Read every hit above as a QUESTION, not a defect: these are replies the coach\n" +
    "actually produced, so a class firing here is either a real catch or a false\n" +
    "positive that would have cost somebody their answer. Both are worth knowing\n" +
    "before a battery run is paid for.\n" +
    "NOT covered: titling, the mirroring index and the number classes, which need\n" +
    "the person's own words and are inert in a replay.\n",
);
