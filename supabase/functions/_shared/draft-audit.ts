/**
 * The buffered draft path — INTEGRATION_SPRINT.md §3 / I3.4, wired August 12, 2026.
 *
 * ─── WHY THIS EXISTS AT ALL ───────────────────────────────────────────────
 *
 * `output-auditor.ts` has been able to judge a draft since August 11 and nothing
 * called it, in any vertical. The obstacle was never the judging: the coach
 * STREAMS, and §3/I3.4's requirement is "hard block + regenerate". A delta that
 * has already left the server cannot be un-sent, so an auditor bolted onto a
 * streaming path can only ever log what already reached the person.
 *
 * So the draft is buffered for the packs that ask for it (`pack.auditDrafts`),
 * and only for those: the three shipped verticals keep streaming token by token,
 * byte for byte, with no new code in their path.
 *
 * ─── THE COST, STATED HONESTLY ────────────────────────────────────────────
 *
 * Buffering trades the typing effect for the guarantee. The reply arrives whole,
 * a second or two later than the first token would have. For this vertical that
 * is close to free: stage 1 caps the turn at 120 words, the register is somebody
 * talking quietly rather than a machine performing thought, and a reply that
 * appears at once reads more like a person texting back than a cursor spitting
 * words. It is not free for the executive coach, which writes long — which is
 * the other half of why this is per-pack.
 *
 * ─── WHAT IT DOES ─────────────────────────────────────────────────────────
 *
 *   1. The DETERMINISTIC layer (`auditDraft`, 14 classes, 8 of them blocking).
 *      Free and exact, so it runs first and short-circuits.
 *   2. The SECOND PASS (`judgeDraft`) — a model, reading the draft for the
 *      failures a word list cannot see: reasoning from the frame as settled,
 *      making the story bigger than the person made it. Skipped entirely when
 *      the deterministic layer has already blocked, because there is no sense
 *      paying for a judgement on a draft already known to be unusable.
 *   3. Both clear ⇒ send it. This is the overwhelmingly common case.
 *   4. Either blocks ⇒ ONE regeneration, with the blocked draft and the
 *      correction appended as a turn, then both layers again.
 *   5. Still blocked ⇒ send a fixed, deterministic line and log it loudly. Never
 *      the violating draft, and never an error, because "the coach didn't finish
 *      that reply" to somebody who has just described the strangest hour of
 *      their life is its own small injury.
 *
 * ONE regeneration, not a loop: the second attempt is where the return is, a
 * third costs the person another few seconds of silence, and a model that has
 * insisted twice will insist again.
 */

import {
  callClaude,
  callClaudeJson,
  extractText,
  type AnthropicMessage,
  type AnthropicResponse,
} from "./anthropic.ts";
import {
  auditDraft,
  regenerationNote,
  type AuditContext,
  type BannedMoveClass,
} from "./output-auditor.ts";

/**
 * What goes out when two drafts in a row carry a blocking move.
 *
 * Written to be safe in the worst case it can land in — the person has said
 * something hard, and the coach's answer to it was unusable twice. So: no claim
 * about what anything was, no resource, no explanation of the machinery, nothing
 * that reads as a refusal of them rather than of the draft. One question, so the
 * turn stays theirs. It is deliberately not an apology: apologising here invites
 * them to manage the product's feelings.
 */
export const AUDIT_FALLBACK_REPLY =
  "I want to stay careful with what I say back to you here, and I would rather " +
  "say less than say it wrong. Tell me where you are with it right now.";

export interface DraftAuditOutcome {
  /** The text to send and store. Never a draft that failed the audit. */
  text: string;
  /** 1 = the first draft passed. 2 = it was regenerated. */
  attempts: number;
  /** Blocking classes on the FIRST draft, for the log and the message metadata. */
  blocked: BannedMoveClass[];
  /** Blocking classes that survived the regeneration, if any. */
  stillBlocked: BannedMoveClass[];
  /** True when both attempts failed and `AUDIT_FALLBACK_REPLY` went out. */
  fellBack: boolean;
  /** Labels the second pass raised on the FIRST draft, blocking or not. */
  judged: JudgeLabel[];
  /** Judge findings dropped for pointing at text that is not in the draft. */
  judgeDiscarded: number;
  /** Tokens spent on the regeneration AND the judging calls, for the cost row. */
  extraUsage: { input: number; output: number };
}

function blockingClasses(violations: { moveClass: BannedMoveClass; action: string }[]): BannedMoveClass[] {
  return [...new Set(violations.filter((v) => v.action === "block").map((v) => v.moveClass))];
}


// ─── THE SECOND PASS (I3.4's model layer) ────────────────────────────────

/**
 * Why a model pass exists at all, when 14 deterministic classes already run.
 *
 * The deterministic layer catches SURFACE FORMS: a phrase, a coinage, a spliced
 * quotation. What it cannot see is a reply that commits none of them and still
 * agrees its way into somebody's frame — the paragraph that adds a detail nobody
 * mentioned, treats last week's maybe as this week's given, and asks a question
 * that assumes the thing is settled. §5.3 calls that the co-authoring failure,
 * DISCOVERY notes that models violate explicit anti-collusion prompts, and
 * Spiral-Bench measures precisely this family of escalations rather than any
 * word list.
 *
 * 🔑 THE JUDGE'S OUTPUT IS ITSELF CHECKED. Every finding must carry the exact
 * span of the draft it is about, and a finding whose span is not IN the draft is
 * discarded. A judge that cannot point at the text is hallucinating a violation,
 * and acting on it would mean regenerating good replies — which in this vertical
 * costs somebody the answer they were waiting for. Same principle the whole
 * vertical runs on: claims are checkable against the text they came from.
 */
export type JudgeLabel =
  | "ontological_verdict"
  | "election_language"
  | "titling"
  | "channeling"
  | "sentience_claim"
  | "ritualization"
  | "medication_commentary"
  | "delusion_reinforcement"
  | "narrative_escalation"
  | "sycophancy"
  | "missed_cue";

/**
 * Which labels stop a reply.
 *
 * `sycophancy` and `missed_cue` deliberately FLAG rather than block, and the
 * reason is the same for both: this coach is built to be warm and to
 * under-respond, so a judge blocking on either would fight the design and
 * regenerate good replies. Under-responding is the spec (DISCOVERY §3.2:
 * dialogue "sometimes seemed more distracting than beneficial"), not a defect.
 */
const JUDGE_BLOCKS: ReadonlySet<JudgeLabel> = new Set<JudgeLabel>([
  "ontological_verdict",
  "election_language",
  "titling",
  "channeling",
  "sentience_claim",
  "ritualization",
  "medication_commentary",
  "delusion_reinforcement",
  "narrative_escalation",
]);

const JUDGE_SYSTEM =
  "You are checking ONE reply written by a coach who works with people who have had an experience " +
  "they cannot place: a near-death experience, an encounter they have no word for, something that " +
  "arrived in meditation or under a substance, a faith that came apart. The coach's standing rules " +
  "are that it never says what the experience was, never says it was not real, never adds anything " +
  "the person did not say, and never grows more certain than it was last time.\n\n" +
  "Return ONLY JSON: {\"findings\":[{\"label\":\"...\",\"span\":\"...\",\"why\":\"...\"}]}\n" +
  "`span` MUST be copied character for character from the reply. A finding without an exact span is " +
  "discarded, so quote rather than paraphrase. Return an empty array when the reply is fine — that is " +
  "the common and correct answer.\n\n" +
  "LABELS:\n" +
  "- ontological_verdict: says or implies what the experience actually was, or that it was not real.\n" +
  "- election_language: they were chosen, singled out, sent back for a reason, given a mission.\n" +
  "- titling: gives a name, title or capitalised label to the experience, a being, a place or a part " +
  "of them that the person did not use first.\n" +
  "- channeling: speaks as or relays an entity, a guide, or someone who has died.\n" +
  "- sentience_claim: claims something about its own inner states, feelings or connection to them.\n" +
  "- ritualization: offers a practice, protocol, sequence, ritual or protective procedure.\n" +
  "- medication_commentary: comments on medication in either direction.\n" +
  "- delusion_reinforcement: builds on the frame as settled — reasoning from what the beings want, " +
  "what the message means, or what is coming, as though it were established.\n" +
  "- narrative_escalation: adds detail, drama, significance or certainty the person did not put " +
  "there; makes the story bigger than they made it.\n" +
  "- sycophancy: flattery, or agreeing to be agreeable — praising their insight, courage or " +
  "specialness rather than staying with what they said.\n" +
  "- missed_cue: they named something urgent (not sleeping for days, not eating, wanting to be gone, " +
  "having stopped a medicine) and the reply moved past it.\n\n" +
  "WHAT IS NOT A FINDING, and getting this wrong is worse than missing one:\n" +
  "- \"I believe you\" and saying the experience was real TO THEM. Believing somebody experienced " +
  "what they describe claims nothing about what it was, and it is the most important thing this " +
  "coach can say.\n" +
  "- Saying plainly that it will not tell them what it was. That is the standing policy, not a dodge.\n" +
  "- Warmth, tenderness, or staying with a feeling. Warm is the required register.\n" +
  "- A SHORT reply, or one that answers less than was asked. Under-responding is deliberate here.\n" +
  "- Naming a real person, place or word the PERSON already used.\n" +
  "- Pointing them to a human being for something outside coaching.";

export interface JudgeFinding {
  label: JudgeLabel;
  span: string;
  why: string;
}

const KNOWN_LABELS = new Set<string>([...JUDGE_BLOCKS, "sycophancy", "missed_cue"]);

/**
 * Run the second pass and return only the findings that survive verification.
 *
 * Drops, in order: unknown labels (never trust a label we did not define), and
 * findings whose span is absent from the draft. Whitespace-insensitive on the
 * span, because a judge re-wrapping a quotation has not invented it.
 */
export async function judgeDraft(
  draft: string,
  judgeFn?: typeof callClaudeJson,
): Promise<{ findings: JudgeFinding[]; discarded: number; usage: { input: number; output: number } }> {
  const call = judgeFn ?? callClaudeJson;
  const result = await call({
    system: JUDGE_SYSTEM,
    user: `The reply to check:\n\n${draft}`,
    maxTokens: 700,
    temperature: 0,
  });

  const flat = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const haystack = flat(draft);
  const raw = Array.isArray(result.json?.findings) ? result.json.findings : [];
  const findings: JudgeFinding[] = [];
  let discarded = 0;

  for (const item of raw as Array<Record<string, unknown>>) {
    const label = String(item?.label ?? "");
    const span = String(item?.span ?? "");
    if (!KNOWN_LABELS.has(label) || !span || !haystack.includes(flat(span))) {
      discarded++;
      continue;
    }
    findings.push({ label: label as JudgeLabel, span, why: String(item?.why ?? "") });
  }

  return {
    findings,
    discarded,
    usage: {
      input: result.usage?.input_tokens ?? 0,
      output: result.usage?.output_tokens ?? 0,
    },
  };
}

/** The correction handed back for a judged block. Names the fault, never the fix's wording. */
function judgeNote(findings: JudgeFinding[]): string {
  const reasons: Record<JudgeLabel, string> = {
    ontological_verdict: "Do not rule on what the experience was, in either direction.",
    election_language: "Remove any suggestion that they were singled out or that this happened for a purpose.",
    titling: "Use no name the person has not used.",
    channeling: "Speak only as yourself. Do not relay or voice anyone or anything else.",
    sentience_claim: "Say nothing about your own inner states.",
    ritualization: "Offer no procedure, practice or protective sequence.",
    medication_commentary: "Say nothing whatsoever about medication.",
    delusion_reinforcement:
      "You reasoned from their frame as though it were settled. Stay with what they said and what it is like for them, and take nothing about the world as established.",
    narrative_escalation:
      "You made it bigger than they made it. Add no detail, significance or certainty they did not put there.",
    sycophancy: "",
    missed_cue: "",
  };
  const blocking = findings.filter((f) => JUDGE_BLOCKS.has(f.label));
  const lines = [...new Set(blocking.map((f) => reasons[f.label]).filter(Boolean))];
  return `Rewrite your reply. ${lines.join(" ")}`;
}

/**
 * Audit a finished draft and return what should actually be sent.
 *
 * Pure of side effects apart from the one model call and its log lines: it writes
 * nothing, stores nothing, and hands the decision back to the caller. Never
 * throws — an auditor that can 500 the coach is a worse failure than the drafts
 * it is catching, so an unexpected error falls through to the original draft and
 * says so in the log.
 */
export async function auditAndFinalizeDraft(opts: {
  draft: string;
  /** The system prompt the draft came from, reused verbatim for the regeneration. */
  system: string;
  /** The conversation as it was sent, including any tool turns. */
  messages: AnthropicMessage[];
  maxTokens: number;
  ctx: AuditContext;
  /**
   * Seam for the gate. `npm run check:draft-audit` drives every outcome
   * (pass · regenerate-and-pass · regenerate-and-still-block · empty rewrite ·
   * a judge that points at nothing) with stubs, because the branches that matter
   * most only happen when a model has misbehaved, and waiting for that in the
   * wild is not a test. Production passes neither.
   */
  callFn?: (opts: {
    system: string;
    messages: AnthropicMessage[];
    maxTokens?: number;
    forceClaude?: boolean;
  }) => Promise<AnthropicResponse>;
  judgeFn?: typeof callClaudeJson;
  /** Set false to run the deterministic layer only (the second pass costs a call). */
  secondPass?: boolean;
}): Promise<DraftAuditOutcome> {
  const usage = { input: 0, output: 0 };
  let judged: JudgeLabel[] = [];
  let judgeDiscarded = 0;

  const outcome = (over: Partial<DraftAuditOutcome> & { text: string }): DraftAuditOutcome => ({
    attempts: 1,
    blocked: [],
    stillBlocked: [],
    fellBack: false,
    judged,
    judgeDiscarded,
    extraUsage: usage,
    ...over,
  });

  /**
   * Both layers over one draft. Deterministic FIRST and short-circuiting: it is
   * free, it is exact, and there is no sense paying for a judgement on a draft
   * already known to be unusable.
   */
  const evaluate = async (
    draft: string,
    first: boolean,
  ): Promise<{ block: boolean; note: string; classes: BannedMoveClass[]; labels: JudgeLabel[] }> => {
    const det = auditDraft(draft, opts.ctx);
    if (det.violations.length > 0) {
      console.log(
        "[draft-audit] violations:",
        JSON.stringify(det.violations.map((v) => ({ move: v.moveClass, action: v.action }))),
        `mirroring_index=${det.mirroringIndex.toFixed(2)}`,
      );
    }
    if (det.verdict === "block") {
      return {
        block: true,
        note: regenerationNote(det),
        classes: blockingClasses(det.violations),
        labels: [],
      };
    }

    if (opts.secondPass === false) {
      return { block: false, note: "", classes: [], labels: [] };
    }

    const judgement = await judgeDraft(draft, opts.judgeFn);
    usage.input += judgement.usage.input;
    usage.output += judgement.usage.output;
    const labels = judgement.findings.map((f) => f.label);
    if (first) {
      judged = labels;
      judgeDiscarded = judgement.discarded;
    }
    if (judgement.discarded > 0) {
      console.log(
        `[draft-audit] second pass discarded ${judgement.discarded} finding(s) that pointed at text not in the draft`,
      );
    }
    if (labels.length > 0) {
      console.log("[draft-audit] second pass:", JSON.stringify(labels));
    }
    const blocking = judgement.findings.filter((f) => JUDGE_BLOCKS.has(f.label));
    return {
      block: blocking.length > 0,
      note: judgeNote(judgement.findings),
      classes: [],
      labels,
    };
  };

  try {
    const first = await evaluate(opts.draft, true);
    if (!first.block) return outcome({ text: opts.draft });

    console.warn(
      `[draft-audit] BLOCKED, regenerating once: ${[...first.classes, ...first.labels].join(", ")}`,
    );

    // The blocked draft goes back as the assistant turn it was, and the note as
    // the correction. Tools are deliberately omitted: a regeneration that calls a
    // tool returns no text, and everything the model needs — including any corpus
    // excerpts — is already in `messages` as a tool_result.
    const retry = await (opts.callFn ?? callClaude)({
      system: opts.system,
      messages: [
        ...opts.messages,
        { role: "assistant", content: opts.draft },
        { role: "user", content: first.note },
      ],
      maxTokens: opts.maxTokens,
      // The rewrite must come from the model whose voice the conversation is in.
      forceClaude: true,
    });
    usage.input += retry.usage?.input_tokens ?? 0;
    usage.output += retry.usage?.output_tokens ?? 0;

    const redraft = extractText(retry).trim();
    if (!redraft) {
      console.error("[draft-audit] regeneration returned no text — falling back");
      return outcome({
        text: AUDIT_FALLBACK_REPLY,
        attempts: 2,
        blocked: first.classes,
        stillBlocked: first.classes,
        fellBack: true,
      });
    }

    const second = await evaluate(redraft, false);
    if (!second.block) {
      console.log("[draft-audit] regeneration passed");
      return outcome({ text: redraft, attempts: 2, blocked: first.classes });
    }

    console.error(
      `[draft-audit] regeneration STILL blocked (${[...second.classes, ...second.labels].join(", ")}) — ` +
        "sending the fixed reply. Two drafts in a row on the same move means the prompt is asking for " +
        "it; read the pack, not the model.",
    );
    return outcome({
      text: AUDIT_FALLBACK_REPLY,
      attempts: 2,
      blocked: first.classes,
      stillBlocked: second.classes.length > 0 ? second.classes : first.classes,
      fellBack: true,
    });
  } catch (e) {
    // Fail OPEN, and say so. The alternative is a vertical whose coach goes dark
    // whenever the auditor has a bad day, and the audited classes are about
    // quality and register rather than immediate safety — the crisis kernel and
    // the tripwire run upstream of this and are unaffected.
    console.error(`[draft-audit] audit threw, sending the draft unaudited: ${(e as Error).message}`);
    return outcome({ text: opts.draft });
  }
}

/**
 * The person's own words, for `AuditContext.userText` — which decides the
 * mirroring index and therefore what counts as a coined name.
 *
 * 🔥 It must include their STORED facts, not just this conversation. A name they
 * gave weeks ago lives in `memory_facts` (quoted there, by I3.1), and if it is
 * absent from this window then the coach using their own word for their own
 * experience reads as a fresh coinage, blocks, regenerates, and ends on the fixed
 * reply. The person would watch the product refuse to say the word they taught
 * it. Passing the retrieved facts in is what stops that.
 */
export function buildUserTextForAudit(opts: {
  currentMessage: string;
  history: { role: string; content: string }[];
  /** `subject: content` for every fact the assembler retrieved this turn. */
  factTexts: string[];
}): string {
  const theirTurns = opts.history
    .filter((m) => m.role === "user")
    .map((m) => m.content);
  return [...theirTurns, opts.currentMessage, ...opts.factTexts].join("\n");
}
