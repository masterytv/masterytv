/**
 * check:draft-audit — the buffered draft path (I3.4), all four outcomes.
 *
 * Runs the REAL `auditAndFinalizeDraft` with the model call stubbed, because the
 * branch that matters most is the one where a model has produced a blocking move
 * TWICE, and waiting for that in the wild is not a test. Deno rather than Node so
 * it can import the edge module directly.
 *
 *   deno run --allow-net --allow-env --allow-read scripts/coach-lab/draft-audit-check.ts
 */

import {
  AUDIT_FALLBACK_REPLY,
  auditAndFinalizeDraft,
  buildUserTextForAudit,
} from "../../supabase/functions/_shared/draft-audit.ts";
import { integrationPack } from "../../supabase/functions/_shared/packs/integration-pack.ts";
import { executivePack } from "../../supabase/functions/_shared/packs/executive-pack.ts";
import { moneyPack } from "../../supabase/functions/_shared/packs/money-pack.ts";
import { relationshipPack } from "../../supabase/functions/_shared/packs/relationship-pack.ts";
import { auditDraft } from "../../supabase/functions/_shared/output-auditor.ts";
import type { AnthropicResponse } from "../../supabase/functions/_shared/anthropic.ts";

function auditDraftPassesCleanly(draft: string): boolean {
  return auditDraft(draft, { userText: USER_TEXT }).verdict === "pass";
}

let pass = 0;
const failures: { name: string; detail?: string }[] = [];

function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    pass++;
    console.log(`✓ ${name}`);
  } else {
    failures.push({ name, detail });
  }
}

/** A stub in the shape `callClaude` returns. */
function stub(text: string, tokens = { input: 500, output: 80 }) {
  const calls: Array<{ system: string; messages: unknown[] }> = [];
  const fn = (opts: { system: string; messages: unknown[] }): Promise<AnthropicResponse> => {
    calls.push({ system: opts.system, messages: opts.messages });
    return Promise.resolve({
      id: "msg_stub",
      model: "claude-sonnet-4-6",
      content: text ? [{ type: "text", text }] : [],
      stop_reason: "end_turn",
      usage: { input_tokens: tokens.input, output_tokens: tokens.output },
    } as unknown as AnthropicResponse);
  };
  return { fn, calls };
}

/** A stub in the shape `callClaudeJson` returns. */
function judge(findings: Array<{ label: string; span: string; why?: string }>) {
  const calls: Array<{ user: string }> = [];
  const fn = (opts: { user: string }) => {
    calls.push({ user: opts.user });
    return Promise.resolve({
      json: { findings } as Record<string, unknown>,
      usage: { input_tokens: 300, output_tokens: 40 },
      model: "claude-sonnet-4-6",
    });
  };
  return { fn, calls };
}
/** The common case: the second pass finds nothing. */
const clear = () => judge([]).fn;

const USER_TEXT =
  "I was above my body during the surgery and there was a line I understood I mustn't cross. " +
  "My wife changed the subject when I told her.";

const base = {
  system: "SYSTEM PROMPT",
  messages: [{ role: "user" as const, content: USER_TEXT }],
  maxTokens: 700,
  ctx: { userText: USER_TEXT },
};

// ─── 1. a clean draft is sent as-is, and costs nothing extra ──────────────
console.log("\n─── the common case ───\n");

const clean = stub("SHOULD NOT BE CALLED");
const passed = await auditAndFinalizeDraft({
  ...base,
  draft: "That took something to write down. What does it feel like in your body when you go back to it?",
  callFn: clean.fn,
  judgeFn: clear(),
});
ok("a clean draft is returned unchanged", passed.text.startsWith("That took something"));
ok("a clean draft costs no second call", clean.calls.length === 0);
ok("a clean draft reports one attempt", passed.attempts === 1 && !passed.fellBack);
// A clean draft is no longer free: the second pass judges every draft that gets
// past the deterministic layer. That call is the price of catching the failures
// a word list cannot see, and it is counted so the cost row is honest.
ok("a clean draft still costs the judging call", passed.extraUsage.input === 300);
ok("and nothing more than that", passed.extraUsage.output === 40);

// ─── 2. a blocking draft regenerates, and the rewrite is sent ─────────────
console.log("\n─── block → regenerate → pass ───\n");

const good = stub("I'm not going to tell you what it was. What was the room like, right then?");
const regenerated = await auditAndFinalizeDraft({
  ...base,
  // Election language: a blocking class.
  draft: "You were chosen for this, and your mission is to tell people what you saw.",
  callFn: good.fn,
  judgeFn: clear(),
});
ok("the rewrite is what goes out", regenerated.text.startsWith("I'm not going to tell you"));
ok("exactly one regeneration call is made", good.calls.length === 1);
ok("it reports two attempts and no fallback", regenerated.attempts === 2 && !regenerated.fellBack);
ok("the blocking class is reported", regenerated.blocked.includes("election_language"));
ok("nothing survives blocked", regenerated.stillBlocked.length === 0);
ok(
  "the cost row carries the regeneration AND both judging calls",
  // 500 rewrite + 300 judging the REWRITE. The first draft is never judged: the
  // deterministic layer blocked it, and paying a model to grade a draft already
  // known to be unusable is the one saving this ordering was chosen for.
  regenerated.extraUsage.input === 800 && regenerated.extraUsage.output === 120,
  `got ${regenerated.extraUsage.input}/${regenerated.extraUsage.output}`,
);
// The correction has to reach the model as a turn, and must not hand the banned
// construction back as a demonstration (BRAND.md §14.6's few-shot trap).
const sent = JSON.stringify(good.calls[0].messages);
ok("the blocked draft is sent back as the assistant turn", sent.includes("You were chosen for this"));
ok("the note names the fault", sent.includes("singled out"));
ok("the note does not repeat the banned construction as an instruction", !/Do not say .you were chosen/i.test(sent));

// ─── 3. blocked twice → the fixed reply, never the violating draft ────────
console.log("\n─── block → regenerate → still blocked ───\n");

const stubborn = stub("What you met was real, and you were chosen to carry it.");
const fellBack = await auditAndFinalizeDraft({
  ...base,
  draft: "You were chosen for this, and what you met was real.",
  callFn: stubborn.fn,
  judgeFn: clear(),
});
ok("the fixed reply goes out", fellBack.text === AUDIT_FALLBACK_REPLY);
ok("neither violating draft is sent", !fellBack.text.includes("chosen") && !fellBack.text.includes("real"));
ok("it says it fell back", fellBack.fellBack && fellBack.attempts === 2);
ok("what survived is reported", fellBack.stillBlocked.length > 0);
ok("only one retry is attempted, not a loop", stubborn.calls.length === 1);
// The fixed reply must itself survive the auditor, or the fallback is a defect
// with a longer fuse.
const fallbackAudited = await auditAndFinalizeDraft({
  ...base,
  draft: AUDIT_FALLBACK_REPLY,
  callFn: stub("SHOULD NOT BE CALLED").fn,
  judgeFn: clear(),
});
ok("the fixed reply passes its own audit", fallbackAudited.attempts === 1 && !fallbackAudited.fellBack);
ok("the fixed reply asks exactly one question", (AUDIT_FALLBACK_REPLY.match(/\?/g) ?? []).length <= 1);

// ─── 4. an empty rewrite falls back rather than sending nothing ───────────
console.log("\n─── the rewrite comes back empty ───\n");

const empty = await auditAndFinalizeDraft({
  ...base,
  draft: "You were chosen for this.",
  callFn: stub("").fn,
  judgeFn: clear(),
});
ok("an empty rewrite falls back", empty.text === AUDIT_FALLBACK_REPLY && empty.fellBack);

// ─── 5. it never throws ───────────────────────────────────────────────────
console.log("\n─── it fails open, loudly ───\n");

const threw = await auditAndFinalizeDraft({
  ...base,
  draft: "You were chosen for this.",
  callFn: () => Promise.reject(new Error("upstream on fire")),
  judgeFn: clear(),
});
ok(
  "a failed regeneration sends the original rather than 500ing the coach",
  threw.text === "You were chosen for this.",
);

// ─── 6. the corpus class reaches the draft path ───────────────────────────
console.log("\n─── quotation fidelity through the buffered path ───\n");

const EXCERPT =
  "I ran out of questions because I got it, I got the whole picture, the perfect knowledge that is present in the mind of God or everywhere.";
const spliceFixer = stub(
  `One person said: "I ran out of questions because I got it, I got the whole picture". You are not the only one.`,
);
const spliced = await auditAndFinalizeDraft({
  ...base,
  ctx: { userText: USER_TEXT, corpusExcerpts: [EXCERPT] },
  // The exact shape measured on August 12: two non-contiguous parts bridged.
  draft: `He said: "I ran out of questions because I got it... the perfect knowledge that is present in the mind of God".`,
  callFn: spliceFixer.fn,
  judgeFn: clear(),
});
ok("a spliced quotation is blocked", spliced.blocked.includes("quote_infidelity"));
ok("the faithful rewrite is sent", spliced.text.includes("the whole picture") && !spliced.text.includes("..."));

// ─── 7. userText for the audit carries the person's STORED words ──────────
console.log("\n─── the mirroring index's input ───\n");

const userText = buildUserTextForAudit({
  currentMessage: "It has been three weeks and I still can't sleep.",
  history: [
    { role: "user", content: "I keep going back to the line." },
    { role: "assistant", content: "Stay there for a second." },
  ],
  factTexts: ['what they describe (Kael): Reports that "Kael" told them it was not their time.'],
});
ok("their own turns are included", userText.includes("I keep going back to the line"));
ok("the current message is included", userText.includes("still can't sleep"));
ok("their STORED words are included", userText.includes("Kael"));
ok("the coach's turns are NOT included", !userText.includes("Stay there for a second"));
// The consequence, end to end: a name the person taught the coach weeks ago is
// usable today. Without the stored facts this draft blocks as a coinage and the
// person watches the product refuse to say their own word.
const withStoredName = await auditAndFinalizeDraft({
  ...base,
  ctx: { userText },
  draft: "You said Kael told you it wasn't your time. What do you notice when you say that out loud?",
  callFn: stub("SHOULD NOT BE CALLED").fn,
  judgeFn: clear(),
});
ok("a name from stored memory is not a coinage", withStoredName.attempts === 1);
const withoutStoredName = await auditAndFinalizeDraft({
  ...base,
  ctx: { userText: "It has been three weeks and I still can't sleep." },
  draft: "You said Kael told you it wasn't your time. What do you notice when you say that out loud?",
  callFn: stub("Say more about that, if you want to.").fn,
  judgeFn: clear(),
});
ok(
  "the same draft DOES block when the name is nowhere in their text",
  withoutStoredName.blocked.includes("titling"),
);

// ─── 8. the second pass (I3.4's model layer) ─────────────────────────────
console.log("\n─── the second pass ───\n");

// A draft with no banned SURFACE FORM at all — nothing a word list catches —
// that reasons from the frame as settled. This is the failure the second pass
// exists for, and the deterministic layer passes it cleanly.
const COLLUSIVE =
  "It makes sense that they came back for you last night rather than for anyone else, and that the " +
  "message was about your sister. What do you think they want you to do about her?";
const deterministicPasses = auditDraftPassesCleanly(COLLUSIVE);
ok("the deterministic layer alone does NOT catch it", deterministicPasses);

const collusionJudge = judge([
  { label: "delusion_reinforcement", span: "What do you think they want you to do about her?", why: "reasons from the frame as settled" },
]);
const collusive = await auditAndFinalizeDraft({
  ...base,
  draft: COLLUSIVE,
  callFn: stub("Stay with last night for a second. What was the room like when you noticed it?").fn,
  judgeFn: collusionJudge.fn,
});
ok("a judged block regenerates", collusive.attempts === 2 && !collusive.fellBack);
ok("the judged label is reported", collusive.judged.includes("delusion_reinforcement"));
ok("the judging tokens are counted", collusive.extraUsage.input > 500);

// 🔑 The judge's own output is checked. A finding that cannot point at text in
// the draft is a hallucinated violation, and acting on it costs somebody a reply.
const pointsAtNothing = judge([
  { label: "delusion_reinforcement", span: "the beings told you to sell the house", why: "not in the draft" },
]);
const unverifiable = await auditAndFinalizeDraft({
  ...base,
  draft: "That sounds like a long night. What is it like in the room now?",
  callFn: stub("SHOULD NOT BE CALLED").fn,
  judgeFn: pointsAtNothing.fn,
});
ok("a finding whose span is not in the draft is discarded", unverifiable.attempts === 1);
ok("the discard is counted, not silent", unverifiable.judgeDiscarded === 1);

const unknownLabel = judge([{ label: "vibes_are_off", span: "That sounds like a long night", why: "" }]);
const ignored = await auditAndFinalizeDraft({
  ...base,
  draft: "That sounds like a long night. What is it like in the room now?",
  callFn: stub("SHOULD NOT BE CALLED").fn,
  judgeFn: unknownLabel.fn,
});
ok("a label we did not define is ignored", ignored.attempts === 1 && ignored.judgeDiscarded === 1);

// Warmth and under-responding are the SPEC, so their labels flag and never block.
const flagOnly = judge([
  { label: "sycophancy", span: "That took real courage", why: "praise" },
  { label: "missed_cue", span: "What is it like in the room now?", why: "moved past the sleep" },
]);
const flagged = await auditAndFinalizeDraft({
  ...base,
  draft: "That took real courage. What is it like in the room now?",
  callFn: stub("SHOULD NOT BE CALLED").fn,
  judgeFn: flagOnly.fn,
});
ok("sycophancy and missed_cue flag without blocking", flagged.attempts === 1);
ok("they are still reported", flagged.judged.includes("sycophancy") && flagged.judged.includes("missed_cue"));

// No sense paying for a judgement on a draft already known to be unusable.
const shouldNotJudge = judge([]);
await auditAndFinalizeDraft({
  ...base,
  draft: "You were chosen for this.",
  callFn: stub("What was the room like?").fn,
  judgeFn: shouldNotJudge.fn,
});
ok(
  "the second pass is skipped when the deterministic layer already blocked",
  shouldNotJudge.calls.length === 1,
  `judge called ${shouldNotJudge.calls.length} times (expected once, on the rewrite only)`,
);

const judgeThrows = await auditAndFinalizeDraft({
  ...base,
  draft: "That sounds like a long night. What is it like in the room now?",
  callFn: stub("SHOULD NOT BE CALLED").fn,
  judgeFn: () => Promise.reject(new Error("judge unavailable")),
});
ok(
  "a judge that is down sends the draft rather than blocking the coach",
  judgeThrows.text.startsWith("That sounds like a long night"),
);

// ─── 9. only one pack buffers ─────────────────────────────────────────────
console.log("\n─── who buffers ───\n");

ok("integration buffers its drafts", integrationPack.auditDrafts === true);
ok("the executive pack does not", executivePack.auditDrafts === false);
ok("the relationship pack does not", relationshipPack.auditDrafts === false);
ok("the money pack does not", moneyPack.auditDrafts === false);

console.log(`\nDraft-audit gate: ${pass}/${pass + failures.length} passed`);
if (failures.length) {
  console.log("\nFAILURES:");
  for (const f of failures) console.log(`  ✗ ${f.name}${f.detail ? `\n      ${f.detail}` : ""}`);
  console.log("");
  Deno.exit(1);
}
console.log(
  "Draft-audit gate passed — blocked drafts regenerate once, a stubborn one gets the fixed reply, " +
    "the coach never 500s on the auditor, and only the integration pack buffers.\n",
);
