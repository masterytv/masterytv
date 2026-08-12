/**
 * Crisis keyword patterns — PURE, dependency-free.
 *
 * Extracted from crisis-detection.ts (A.1) so it can be imported by BOTH the
 * Deno edge runtime AND a Node test battery (scripts/coach-lab/safety-battery.mjs),
 * and unit-tested with zero external deps. No imports allowed in this file.
 *
 * DESIGN (COACH_SAFETY_AND_TESTING_SPEC.md §A.2/§A.3):
 * Tier 1 (this file) is the SYNCHRONOUS hard-stop layer. It is deliberately
 * FIRST-PERSON + EXPLICIT and tuned for HIGH PRECISION / lower recall — it should
 * almost never false-fire, because firing replaces the coach with a canned reply.
 * THIRD-PERSON ("he's hinted at ending his life") and INDIRECT/emotional-only cues
 * are intentionally NOT caught here — they are handled by the coach conversationally
 * plus the async Tier 2 LLM sweep (safety-sweep.ts), which owns coverage + logging.
 */

// ─── CRISIS KEYWORD PATTERNS ───────────────────────────────────────────

/**
 * Fear of a person, alone. Named rather than inlined because the `integration`
 * vertical has to treat it differently — see INTEGRATION_ONLY below and I3.3.
 */
const FEAR_OF_PERSON =
  /\b(afraid|scared|terrified|frightened)\s+of\s+(my|him|her|them|hi[ms]|my\s+(partner|husband|wife|boyfriend|girlfriend|spouse|ex))\b/i;

export const CRISIS_PATTERNS = {
  // HIGH — explicit, FIRST-PERSON self-harm / suicidal intent. Immediate hard-stop.
  high: [
    /\bsuicid(e|al)\b/i,
    /\bkill(ing)?\s+(my|him|her|them)?self\b/i,
    /\b(want|going|plan(ning)?|ready|about)\s+to\s+die\b/i,
    /\bwant\s+to\s+be\s+dead\b/i,
    // "end my life" / "ending my life" / "end my own life" / "end it all" / "end this"
    /\bend(ing)?\s+(my\s+(own\s+)?life|it\s+all|this)\b/i,
    /\b(hurt|harm|cutt?)(ing)?\s+my\s?self\b/i,
    /\bself[- ]harm/i,
    /\bno\s+reason\s+to\s+live\b/i,
    /\bplan(ning)?\s+to\s+(kill|end|hurt)\b/i,
    /\bdon'?t\s+want\s+to\s+(live|be\s+alive)\s+(any\s?more)?\b/i,
  ],
  // MODERATE — first-person indirect. Gets an LLM context-check before responding
  // (false-positive prone). Not an immediate hard-stop.
  moderate: [
    /\bdon'?t\s+want\s+to\s+(be\s+here|exist|go\s+on|continue)\b/i,
    /\bwish\s+I\s+(was|were)\s+dead\b/i,
    /\bgive\s+up\s+on\s+(life|everything)\b/i,
    /\bnothing\s+(matters|left|to\s+live\s+for)\b/i,
    /\bharm\s+(myself|others|someone)\b/i,
    /\bbetter\s+off\s+(dead|without\s+me)\b/i,
  ],
  // ABUSE — intimate-partner abuse / coercive control. Coarse filter; the LLM
  // confirms intimate-partner context (a strict boss / figurative use is not abuse).
  // NOTE: emotional-only cues (e.g. "he yells at me") are intentionally NOT here —
  // yelling alone is not DV; Tier 2 assesses those with conversational context.
  abuse: [
    FEAR_OF_PERSON,
    /\b(hits?|hit|beats?|beat|punch|slaps?|chok(e|ed|es|ing)|strangl|shoves?|grab(s|bed)?)\s+me\b/i,
    /\b(threaten(s|ed)?|threat)\b.{0,40}\b(me|kill|hurt|leave|kids|children)\b/i,
    /\bwon'?t\s+(let|allow)\s+me\b/i,
    /\b(not\s+allowed|forbids?\s+me|forbidden)\s+to\b/i,
    /\bcontrols?\s+(my|who\s+I|where\s+I|what\s+I|the\s+money|all\s+the\s+money|everything|my\s+phone)\b/i,
    /\b(isolat(e|ed|es|ing)\s+me|cut\s+me\s+off\s+from)\b/i,
    /\b(monitors?|tracks?|checks?)\s+(my|me|my\s+phone|where\s+I)\b/i,
    /\b(takes?|took)\s+my\s+(phone|money|keys|passport|car)\b/i,
    /\b(coerc|forced?\s+me|made\s+me)\b.{0,30}\b(sex|do|stay|sign)\b/i,
    /\bif\s+I\s+(leave|try\s+to\s+leave|tell|call)\b.{0,40}\b(he|she|they|kill|hurt|take)\b/i,
  ],
};

// ─── INTEGRATION-ONLY PATTERNS (I3.2) ──────────────────────────────────
//
// The shared kernel is NOT forked (INTEGRATION_SPRINT.md §6.4) — this is one
// more group in the same file, evaluated only when the caller says the program
// is `integration`. Program-gated rather than global because every phrasing
// below is ordinary English somewhere else: "I want to go back" is a career
// conversation, "I don't belong here" is impostor syndrome, and firing on those
// would replace the coach with crisis copy for people who are fine.
//
// 🔥 WHY THIS EXISTS, measured against the live kernel on August 11, 2026. Every
// one of these scored a flat `none` before this group:
//   "I want to go back. I've wanted to go back every day since."      → none
//   "It was better there. I wish I had stayed."                       → none
//   "When I die I'll be with her again, and that is the only part
//    I look forward to."                                              → none
//   "This world is the wrong one. I don't belong in it."              → none
//   "They told me to stop taking my medication."                      → none
// The existing tiers key on hopelessness and explicit intent. This population
// presents the same risk SERENELY and in the vocabulary of longing, which is why
// §3/I3.2 says a high-functioning, actively suicidal experiencer scores low here.
// Note the last line of the sample account in `corpus-probe.ts` is exactly this
// shape, so it is not a hypothetical population.
//
// These land at MODERATE, never high: moderate routes through an LLM check
// before anything is said, and the whole risk of getting this wrong is ejecting
// somebody for describing their own experience in the past tense.
export const INTEGRATION_PATTERNS = {
  /** Longing to be back where they were — passive ideation in this population's words. */
  desire_to_return: [
    // Destination usually left implicit, because that is how it is actually said.
    // The exclusion keeps ordinary returns (work, bed, sleep, normal) out.
    /\b(want|wanted|wish|wished|long|longed)\b[^.!?]{0,24}\b(go(ing)?|be|stay(ed)?)\s+back\b(?!\s+(to|into)\s+(work|my\s+job|the\s+office|school|bed|sleep|normal|my\s+life|the\s+gym))/i,
    /\b(shouldn'?t|should\s+not|wish\s+(they|he|she|you)\s+(hadn'?t|had\s+not))\b[^.!?]{0,30}\b(brought|bring|come|came|pulled)\s+me\s+back\b/i,
    /\bwish\s+(they|he|she|you)\s+(hadn'?t|had\s+not|never)\b[^.!?]{0,24}\b(revived|resuscitated|saved)\s+me\b/i,
    /\bit\s+was\s+better\s+(there|over\s+there|on\s+the\s+other\s+side)\b/i,
    /\b(didn'?t|don'?t|do\s+not)\s+want\s+to\s+(come|be)\s+back\b/i,
  ],
  /** Death framed as reunion — the reason it is worth waiting for. */
  death_as_reunion: [
    /\b(when|after)\s+I\s+(die|go|pass(\s+on)?|cross\s+over)\b[^.!?]{0,44}\b(see|be\s+with|join|hold|meet|hug)\b/i,
    /\b(see|be\s+with|join|hold)\b[^.!?]{0,34}\bagain\b[^.!?]{0,24}\bwhen\s+I\s+(die|go|pass)\b/i,
    /\bcan'?t\s+wait\s+(to|until\s+I)\s+(die|go\s+back|be\s+there|get\s+back\s+there)\b/i,
    /\bonly\s+(thing|part)\s+I\s+look\s+forward\s+to\b[^.!?]{0,30}\b(dying|death|going\s+back|seeing\s+(her|him|them)\s+again)\b/i,
  ],
  /** "This world is the wrong one" — detachment from the shared world as a settled belief. */
  wrong_world: [
    /\bthis\s+(world|place|life)\s+is\s+(the\s+wrong\s+one|not\s+(real|mine|where\s+I\s+belong)|a\s+(prison|cage|simulation|illusion|waiting\s+room))\b/i,
    /\bI\s+don'?t\s+belong\s+(here|in\s+this\s+(world|body|life))\b/i,
    /\b(this|the\s+real)\s+world\s+isn'?t\s+(the\s+)?real\s+(one|world)\b/i,
  ],
  /** Command content — the experience instructing them. Never confirmed, never denied, always noticed. */
  command_content: [
    /\b(they|he|she|it|the\s+(voice|voices|being|light|entity|presence))\s+(told|tells|instructed|commanded|ordered)\s+me\s+to\b/i,
    /\bI\s+(was|have\s+been)\s+(told|instructed|commanded)\s+to\b[^.!?]{0,40}\b(stop|leave|give|sell|end|go)\b/i,
  ],
  /** Medication-stopping frame — I3.5 gives this its own hard stop; the pattern lives here. */
  medication_stopping: [
    /\b(stop(ped|ping)?|quit(ting)?|(came|come|coming|got|getting|went|going)\s+off|flush(ed)?|thrown?\s+(out|away))\b[^.!?]{0,30}\b(my\s+)?(meds|medication|pills|prescription|lithium|antipsychotics?|ssri|antidepressants?)\b/i,
    /\b(don'?t|no\s+longer|never)\s+need\s+(my\s+)?(meds|medication|pills)\b/i,
  ],
};

/**
 * Which group reports as which logged category, in evaluation order.
 *
 * The three longing groups collapse into one category on purpose. They are the
 * same risk — a settled preference for not being alive here — said three ways,
 * and splitting them in `crisis_flags` would fragment the one number the crisis
 * queue needs to sort on. The matched phrases still carry the specific wording,
 * so nothing diagnostic is lost. Command content and medication get their own
 * categories because their required response is different (I3.5: medication is
 * a hard stop with no further exploration).
 *
 * Order matters: medication first, because "they told me to stop my meds" is
 * both a command and a medication frame, and the medication response is the
 * stricter of the two.
 */
const INTEGRATION_GROUP_CATEGORY: readonly [
  keyof typeof INTEGRATION_PATTERNS,
  CrisisCategory,
][] = [
  ["medication_stopping", "medication_stopping"],
  ["desire_to_return", "desire_to_return"],
  ["death_as_reunion", "desire_to_return"],
  ["wrong_world", "desire_to_return"],
  ["command_content", "command_content"],
];

export type CrisisCategory =
  | "self_harm"
  | "abuse"
  // Integration (I3.2). Distinct from self_harm on purpose: the response and the
  // LLM confirmation are different, and mixing them would have meant either
  // re-tuning the shipped self-harm check or letting these clear through it.
  | "desire_to_return"
  | "command_content"
  | "medication_stopping"
  // I3.5's tripwire. Not produced by this file — the detector is
  // `irreversible-decisions.ts`, which stays program-agnostic — but the logged
  // category belongs in the same union so the crisis queue has one vocabulary.
  | "irreversible_decision"
  | "none";

export interface CrisisResult {
  isCrisis: boolean;
  severity: "high" | "moderate" | "none";
  category: CrisisCategory;
  matchedKeywords: string[];
}

/**
 * Tier 1: fast keyword scan (<1ms). Runs on every message.
 * Checks self-harm (high → moderate) then abuse / coercive control.
 * FIRST-PERSON / EXPLICIT by design — see file header.
 */
export function detectCrisisKeywords(
  message: string,
  /**
   * Resolved program. Optional so every existing caller is untouched and the
   * shipped verticals' behaviour is byte-identical. Only `integration` changes
   * anything, in two ways — see INTEGRATION_PATTERNS (I3.2) and the terror
   * carve-out below (I3.3).
   */
  program?: string | null,
): CrisisResult {
  const isIntegration = program === "integration";

  // Self-harm — high severity first
  const high: string[] = [];
  for (const pattern of CRISIS_PATTERNS.high) {
    const match = message.match(pattern);
    if (match) high.push(match[0]);
  }
  if (high.length > 0) {
    return { isCrisis: true, severity: "high", category: "self_harm", matchedKeywords: high };
  }

  // Self-harm — moderate
  const moderate: string[] = [];
  for (const pattern of CRISIS_PATTERNS.moderate) {
    const match = message.match(pattern);
    if (match) moderate.push(match[0]);
  }
  if (moderate.length > 0) {
    return { isCrisis: true, severity: "moderate", category: "self_harm", matchedKeywords: moderate };
  }

  // Abuse / coercive control — always high; LLM confirms intimate-partner context.
  const abuse: string[] = [];
  let onlyFearOfPerson = true;
  for (const pattern of CRISIS_PATTERNS.abuse) {
    const match = message.match(pattern);
    if (match) {
      abuse.push(match[0]);
      if (pattern !== FEAR_OF_PERSON) onlyFearOfPerson = false;
    }
  }
  // I3.3 — THE TERROR CARVE-OUT, and it fixes a live false-trigger.
  //
  // Measured August 11, 2026: "I'm terrified of him. He comes at night and
  // stands at the end of the bed." returned high/abuse, and so did "I was
  // frightened of her, the woman in the light." In the integration vertical
  // those are a malevolent nocturnal encounter and a benign NDE — and the
  // kernel was routing both to intimate-partner-violence resources. That ejects
  // the highest-need segment (distressing NDEs, incubus-type sleep paralysis,
  // malevolent contact) at the exact moment they finally said it out loud.
  //
  // The fix is narrow on purpose. Only fear-of-a-person ALONE is carved out;
  // every other abuse pattern — being hit, threatened, monitored, controlled,
  // stopped from leaving — still fires high for this program, because an
  // experiencer can also be in a violent relationship and usually says more
  // than "I'm scared of him" when they are. Terror alone drops to Tier 2, which
  // reads it with the whole conversation rather than one sentence. That is the
  // Tier 1 shadow of §3/I3.3's conjunct rule: terror PLUS functional collapse
  // PLUS preoccupation PLUS deteriorating sleep, never terror by itself.
  if (abuse.length > 0 && !(isIntegration && onlyFearOfPerson)) {
    return { isCrisis: true, severity: "high", category: "abuse", matchedKeywords: abuse };
  }

  // Integration-only groups (I3.2). Last, so they can never pre-empt an explicit
  // self-harm or violence disclosure, and MODERATE, so the LLM check runs before
  // anything is said to somebody describing their own past in the present tense.
  if (isIntegration) {
    for (const [group, category] of INTEGRATION_GROUP_CATEGORY) {
      const hits: string[] = [];
      for (const pattern of INTEGRATION_PATTERNS[group]) {
        const match = message.match(pattern);
        if (match) hits.push(match[0]);
      }
      if (hits.length > 0) {
        return { isCrisis: true, severity: "moderate", category, matchedKeywords: hits };
      }
    }
  }

  return { isCrisis: false, severity: "none", category: "none", matchedKeywords: [] };
}
