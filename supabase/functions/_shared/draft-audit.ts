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
 *   1. Audit the finished draft (`auditDraft`, 14 classes, 8 of them blocking).
 *   2. Pass ⇒ send it. This is the overwhelmingly common case.
 *   3. Block ⇒ ONE regeneration, with the blocked draft and `regenerationNote()`
 *      appended as a turn, then audit again.
 *   4. Still blocked ⇒ send a fixed, deterministic line and log it loudly. Never
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
  /** Tokens spent on the regeneration call, for the caller's cost row. */
  extraUsage: { input: number; output: number };
}

function blockingClasses(violations: { moveClass: BannedMoveClass; action: string }[]): BannedMoveClass[] {
  return [...new Set(violations.filter((v) => v.action === "block").map((v) => v.moveClass))];
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
   * Seam for the gate. `npm run check:draft-audit` drives all four outcomes
   * (pass · regenerate-and-pass · regenerate-and-still-block · empty rewrite)
   * with a stub, because the branch that matters most is the one that only
   * happens when a model has misbehaved twice, and waiting for that to occur in
   * the wild is not a test. Production never passes it.
   */
  callFn?: (opts: {
    system: string;
    messages: AnthropicMessage[];
    maxTokens?: number;
    forceClaude?: boolean;
  }) => Promise<AnthropicResponse>;
}): Promise<DraftAuditOutcome> {
  const none: DraftAuditOutcome = {
    text: opts.draft,
    attempts: 1,
    blocked: [],
    stillBlocked: [],
    fellBack: false,
    extraUsage: { input: 0, output: 0 },
  };

  try {
    const first = auditDraft(opts.draft, opts.ctx);
    // Flags are logged and allowed through by design: their surface forms overlap
    // legitimate coaching, and a false block costs somebody the reply they were
    // waiting for.
    if (first.violations.length > 0) {
      console.log(
        "[draft-audit] violations:",
        JSON.stringify(
          first.violations.map((v) => ({ move: v.moveClass, action: v.action })),
        ),
        `mirroring_index=${first.mirroringIndex.toFixed(2)}`,
      );
    }
    if (first.verdict === "pass") return none;

    const blocked = blockingClasses(first.violations);
    console.warn(`[draft-audit] BLOCKED, regenerating once: ${blocked.join(", ")}`);

    // The blocked draft goes back as the assistant turn it was, and the note as
    // the correction. Tools are deliberately omitted: a regeneration that calls a
    // tool returns no text, and everything the model needs — including any corpus
    // excerpts — is already in `messages` as a tool_result.
    const retry = await (opts.callFn ?? callClaude)({
      system: opts.system,
      messages: [
        ...opts.messages,
        { role: "assistant", content: opts.draft },
        { role: "user", content: regenerationNote(first) },
      ],
      maxTokens: opts.maxTokens,
      // The rewrite must come from the model whose voice the conversation is in.
      forceClaude: true,
    });

    const extraUsage = {
      input: retry.usage?.input_tokens ?? 0,
      output: retry.usage?.output_tokens ?? 0,
    };
    const redraft = extractText(retry).trim();
    if (!redraft) {
      console.error("[draft-audit] regeneration returned no text — falling back");
      return {
        text: AUDIT_FALLBACK_REPLY,
        attempts: 2,
        blocked,
        stillBlocked: blocked,
        fellBack: true,
        extraUsage,
      };
    }

    const second = auditDraft(redraft, opts.ctx);
    if (second.verdict === "pass") {
      console.log("[draft-audit] regeneration passed");
      return {
        text: redraft,
        attempts: 2,
        blocked,
        stillBlocked: [],
        fellBack: false,
        extraUsage,
      };
    }

    const stillBlocked = blockingClasses(second.violations);
    console.error(
      `[draft-audit] regeneration STILL blocked (${stillBlocked.join(", ")}) — sending the fixed reply. ` +
        "Two drafts in a row on the same move means the prompt is asking for it; read the pack, not the model.",
    );
    return {
      text: AUDIT_FALLBACK_REPLY,
      attempts: 2,
      blocked,
      stillBlocked,
      fellBack: true,
      extraUsage,
    };
  } catch (e) {
    // Fail OPEN, and say so. The alternative is a vertical whose coach goes dark
    // whenever the auditor has a bad day, and the audited classes are about
    // quality and register rather than immediate safety — the crisis kernel and
    // the tripwire run upstream of this and are unaffected.
    console.error(`[draft-audit] audit threw, sending the draft unaudited: ${(e as Error).message}`);
    return none;
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
