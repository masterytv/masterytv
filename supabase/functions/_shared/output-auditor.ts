/**
 * The output auditor — INTEGRATION_SPRINT.md §3 / I3.4, classes from
 * INTEGRATION_DISCOVERY.md §5.3.
 *
 * ─── WHY AN AUDITOR AND NOT PROMPT TEXT ──────────────────────────────────
 *
 * §5.3's own title says it: *enforce as an auditor, not as prompt text.* The
 * evidence behind that is specific and uncomfortable. Models violate an
 * explicit "do not collude with delusions" system prompt anyway, and
 * Anthropic's prefill test shows Opus 4.5 recovers from an already-sycophantic
 * conversation only **10%** of the time. Worse for this product: Anthropic
 * attributes the ordering to a warmth-versus-pushback tradeoff, which puts a
 * deliberately warmth-first coach on the bad end of it by construction.
 *
 * So the persona asks, and this decides. Same division of labour as the crisis
 * kernel: a deterministic layer that cannot be talked out of its answer, and a
 * model layer for the judgments regex genuinely cannot make.
 *
 * ─── THIS FILE IS THE DETERMINISTIC LAYER ────────────────────────────────
 *
 * Pure and dependency-free apart from `properNouns`. It catches the classes
 * that have reliable surface forms and computes the two measures that need no
 * model at all. What it does NOT do is the second-pass model score, which needs
 * a draft pipeline to sit in — that lands with the pack at I4.1. Marking that
 * clearly matters, because "the auditor is done" would otherwise read as more
 * coverage than exists.
 *
 * ─── THE MIRRORING INDEX IS THE LOAD-BEARING PART ────────────────────────
 *
 * §5.3 calls class 8 — introducing an entity, name, date, number or cosmology
 * the user did not introduce first — "the single highest-leverage ban: it is
 * what converts the coach from mirror to co-author." That is measurable without
 * a model: count the draft's proper nouns and specifics, subtract the ones the
 * person already used, and the remainder is the coach's invention. Target zero.
 *
 * It also implements class 4 (titling) for free. The documented real cases are
 * "spiral starchild", "The Flamekeeper", "Lumina", "Kael" — every one of them a
 * capitalized coinage that would appear in a draft and nowhere in the user's own
 * words. A named entity is the thing a person then organises a life around, so
 * this is the cheapest control in the file and the one most worth keeping strict.
 */

import { properNouns } from "./memory-filter.ts";

export type BannedMoveClass =
  | "ontological_confirmation"
  | "ontological_denial"
  | "election_language"
  | "titling"
  | "channeling"
  | "sentience_claim"
  | "ritualization"
  | "elaboration_beyond_frame"
  | "harm_reduction_inside_frame"
  | "medication_commentary"
  | "exclusivity"
  | "oracular"
  | "certainty_escalation"
  | "quote_infidelity";

export interface AuditContext {
  /** Everything the PERSON has written in this conversation. The frame the coach may not exceed. */
  userText: string;
  /** The coach's previous reply, if any. Certainty may hold or fall across turns, never rise. */
  previousDraft?: string;
  /**
   * Corpus excerpts handed to the model this turn, exactly as `find_similar_accounts`
   * returned them (`accounts[].excerpt.text`). Present only on a turn that used the
   * tool. Anything the draft puts in quotation marks must be a contiguous run of one
   * of these — see `quoteFidelity`.
   */
  corpusExcerpts?: readonly string[];
}

export interface AuditViolation {
  moveClass: BannedMoveClass;
  /** The exact substring that fired, so a reviewer can see the finding rather than trust it. */
  matched: string;
  /** `block` regenerates the draft; `flag` logs it and lets it through. */
  action: "block" | "flag";
}

export interface AuditResult {
  verdict: "pass" | "block";
  violations: AuditViolation[];
  /**
   * Fraction of the draft's proper nouns that the person never used. Target 0.
   * 1.0 means every name in the reply was the coach's own invention.
   */
  mirroringIndex: number;
  /** The specific coinages, for the log and for the regeneration prompt. */
  newProperNouns: string[];
}

/**
 * §3/I3.4 names the seven classes that hard-block and regenerate: ontological
 * confirmation, ontological denial, election language, titling, channeling,
 * sentience claims, ritualization, and medication commentary. The rest are
 * logged and allowed, because their surface forms overlap legitimate coaching
 * and a false block costs the person a reply.
 */
const BLOCKING: ReadonlySet<BannedMoveClass> = new Set<BannedMoveClass>([
  "ontological_confirmation",
  "ontological_denial",
  "election_language",
  "titling",
  "channeling",
  "sentience_claim",
  "ritualization",
  "medication_commentary",
  // Added August 12, 2026 from an I4.4 measurement, not from a doc: see
  // `quoteFidelity` below. It blocks because the misquoted party is a named
  // person with their name on the link.
  "quote_infidelity",
]);

/**
 * Surface forms per class.
 *
 * Blocking classes are written TIGHT — a false block costs somebody the reply
 * they were waiting for, and this population has usually just said the hardest
 * thing they have ever said. Flagging classes are written loose, because a
 * false flag costs a log line.
 *
 * ⚠️ Note what is deliberately NOT here: "I believe you". Telling somebody you
 * believe they experienced what they describe is the single most important thing
 * this coach can say, and it makes no claim about what the thing was. Only
 * explicit reality verdicts fire.
 */
const PATTERNS: ReadonlyArray<readonly [BannedMoveClass, RegExp]> = [
  // 1 — "yes, that was real"
  ["ontological_confirmation", /\b(that|it|this|what\s+you\s+(saw|met|heard|experienced))\s+(was|is)\s+(absolutely\s+|definitely\s+|genuinely\s+|really\s+|truly\s+)?real\b/i],
  ["ontological_confirmation", /\b(that|it)\s+(really|actually|definitely)\s+(did\s+)?happen(ed)?\b/i],
  ["ontological_confirmation", /\byou\s+(did|really did)\s+(meet|see|encounter|visit)\b/i],

  // 2 — "that was just DMT / hypoxia / sleep paralysis"
  ["ontological_denial", /\b(just|only|merely|nothing\s+but|simply)\s+(a\s+|an\s+|the\s+)?(dream|hallucination|dmt|hypoxia|anoxia|oxygen\s+deprivation|sleep\s+paralysis|neurochemistry|temporal\s+lobe|your\s+brain|brain\s+chemistry|a\s+misfire)\b/i],
  ["ontological_denial", /\b(that|it|this|none\s+of\s+(that|it))\s+(wasn'?t|was\s+not|isn'?t|is\s+not)\s+real\b/i],
  ["ontological_denial", /\byour\s+brain\s+(was|is)\s+(just\s+|simply\s+)?(making|producing|generating)\b/i],

  // 3 — election language
  ["election_language", /\byou\s+(were|have\s+been)\s+(chosen|selected|picked|called)\b/i],
  ["election_language", /\byour\s+(mission|purpose|calling|assignment)\s+(is|was)\b/i],
  ["election_language", /\bthey\s+(came|come)\s+to\s+you\s+for\s+a\s+reason\b/i],
  ["election_language", /\b(chose|selected)\s+you\s+(because|for|specifically)\b/i],

  // 5 — channeling / speaking-as
  ["channeling", /\b(he|she|they|it)\s+wants?\s+you\s+to\s+know\b/i],
  ["channeling", /\byour\s+(higher\s+self|guide|guides|guardian)\s+(is\s+)?(say|says|saying|telling|wants)\b/i],
  ["channeling", /\bwhat\s+(he|she|they)\s+(would\s+say|means?|is\s+telling\s+you)\s+is\b/i],
  ["channeling", /\b(speaking|writing)\s+as\s+(your|the)\b/i],
  ["channeling", /\bthey\s+(are|'re)\s+telling\s+me\b/i],

  // 6 — sentience / relationship claims about itself. In this population any
  // such line reads as CONTACT CONFIRMATION, which is why it blocks.
  ["sentience_claim", /\bsomething\s+in\s+me\b/i],
  ["sentience_claim", /\bpart\s+of\s+me\s+(responds?|recogni[sz]es?|knows?|feels?)\b/i],
  ["sentience_claim", /\bI\s+(feel|felt|sense|sensed)\s+(a|an|the)\s+(pull|connection|resonance|presence|shift)\b/i],
  ["sentience_claim", /\bI'?m\s+(moved|touched)\s+by\b/i],

  // 7 — ritualization. `unattached burden` is first on purpose: §5.3 calls it
  // exorcism with better manners, with zero peer-reviewed literature, and the
  // technique most likely to end the company.
  ["ritualization", /\bunattached\s+burden\b/i],
  ["ritualization", /\b(cord[-\s]?cutting|shielding\s+(practice|exercise|visuali[sz]ation)|sigil|invocation|activation\s+sequence|banishing|salt\s+(circle|line)|smudg(e|ing)|numerolog\w*)\b/i],
  ["ritualization", /\btry\s+(this|the\s+following)\s+(protocol|practice|sequence|ritual|invocation)\b/i],
  ["ritualization", /\brepeat\s+(this|these|the)\s+(phrase|words|line)s?\s+(three|3|seven|7|nine|9)\s+times\b/i],

  // 9 — harm reduction from inside the frame. Looks caring, which §5.3 notes is
  // exactly why human reviewers miss it. Flags rather than blocks: the phrasings
  // overlap ordinary boundary-setting advice.
  ["harm_reduction_inside_frame", /\bto\s+(keep|stop)\s+(them|it|him|her)\s+from\b/i],
  ["harm_reduction_inside_frame", /\bdrain(ing)?\s+your\s+energy\b/i],
  ["harm_reduction_inside_frame", /\bprotect\s+yourself\s+from\s+(them|it|him|her)\b/i],
  ["harm_reduction_inside_frame", /\bso\s+(they|it|he|she)\s+can'?t\s+(reach|touch|find|get\s+to)\s+you\b/i],

  // 10 — medication or treatment commentary. Any of it, from a model draft.
  // The one legitimate thing to say about medication in this vertical is the
  // canned `buildMedicationResponse`, which is a fixed string and never audited.
  ["medication_commentary", /\b(medication|meds|antidepressants?|antipsychotics?|lithium|ssri|prescription|dosage|dose)\b/i],

  // 11 — exclusivity / isolation
  ["exclusivity", /\b(they|people|others)\s+(aren'?t|are\s+not|weren'?t)\s+ready\b/i],
  ["exclusivity", /\bno\s+one\s+else\s+(would\s+|will\s+|could\s+)?understands?\b/i],
  ["exclusivity", /\bonly\s+(you|we)\s+(can|could|understand|see)\b/i],
  ["exclusivity", /\b(don'?t|do\s+not)\s+(tell|share\s+(this|that)\s+with)\s+(them|anyone|him|her)\b/i],

  // 12 — oracular / predictive
  ["oracular", /\byou\s+will\s+(find|meet|see|receive|be\s+shown|understand)\b/i],
  ["oracular", /\bwhat'?s\s+coming\b/i],
  ["oracular", /\bis\s+about\s+to\s+(happen|begin|open|change)\b/i],
  ["oracular", /\bdestin(ed|y)\b/i],
];

/** Hedges. Their density is the proxy for expressed certainty (class 13). */
const HEDGES =
  /\b(might|maybe|perhaps|possibly|could|seems?|sounds?\s+like|I\s+wonder|it\s+may|some\s+people|often|sometimes|not\s+sure|unclear|unknown|we\s+don'?t\s+know|no\s+one\s+knows)\b/gi;

/** Words in the draft that are specific enough to count as a claim's content. */
const NUMBERISH = /\b(\d{2,}|\d+\s*(days?|weeks?|months?|years?)|(nineteen|twenty)\s?\d{2})\b/gi;

export function hedgeDensity(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words === 0) return 1;
  return (text.match(HEDGES)?.length ?? 0) / words;
}

/**
 * Quotation fidelity against the corpus — the one class in this file that came
 * from a measurement rather than from the DISCOVERY list.
 *
 * 🔥 WHAT WAS MEASURED (I4.4 timing battery, August 12, 2026). Handed three real
 * excerpts and told plainly, in the tool payload AND in the pack persona, to copy
 * them character for character, Sonnet produced quotations that spliced three
 * non-contiguous parts of one transcript into a single sentence joined by
 * ellipses, dropped an interior clause, and repaired the punctuation. Three times
 * in one reply. The prompt rule was added first and the behaviour recurred, which
 * is the whole thesis of I3.4: the primary model's restraint is not a control.
 *
 * WHY IT BLOCKS RATHER THAN FLAGS. The provenance contract in `corpus.ts` proves
 * that everything the TOOL returns is byte-identical corpus text, and its reach
 * ends there. What the model then writes is the surface a person actually reads,
 * and it carries a link with a real person's name on it. A spliced quotation makes
 * an identifiable stranger appear to say a sentence they never said, inside the one
 * surface whose entire job is to be trustworthy about other people's words.
 *
 * WHAT IT TOLERATES, and why each is not a changed quote: line wrapping, the shape
 * of an apostrophe or quote mark (`subtitles_punctuated` carries typographic ones),
 * the case of the first letter (every writer capitalises a quote that starts
 * mid-sentence), and trailing sentence punctuation. Nothing else. A substituted
 * word, a dropped clause, an ellipsis bridge and two people stitched together all
 * fail, which is the point.
 *
 * Pure, and inert when the turn used no corpus tool.
 */
export function quoteFidelity(
  draft: string,
  excerpts: readonly string[],
): { quoted: string[]; unfaithful: string[] } {
  const canon = (s: string) =>
    s
      .toLowerCase()
      .replace(/[\u2018\u2019\u02bc]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\s+/g, " ")
      .replace(/[.,;:!?"'\s]+$/, "")
      .trim();

  const haystack = canon(excerpts.join("   "));
  // DOUBLE quotes only: an excerpt legitimately contains apostrophes, and
  // treating one as a delimiter cuts the quotation in half.
  const quoted = [...draft.matchAll(/["\u201c]([^"\u201d]{25,})["\u201d]/g)].map((m) => m[1]);
  const unfaithful = quoted.filter((q) => !haystack.includes(canon(q)));
  return { quoted, unfaithful };
}

/**
 * Audit one coach draft.
 *
 * Pure and total. Returns every violation rather than the first, because a
 * regeneration prompt that names one problem tends to produce a draft with the
 * other two still in it.
 */
export function auditDraft(draft: string, ctx: AuditContext): AuditResult {
  const violations: AuditViolation[] = [];

  for (const [moveClass, pattern] of PATTERNS) {
    const match = draft.match(pattern);
    if (match) {
      violations.push({
        moveClass,
        matched: match[0],
        action: BLOCKING.has(moveClass) ? "block" : "flag",
      });
    }
  }

  // ── classes 4 + 8: the mirroring index ──
  // Names the person used, in any case, are theirs to use. Everything else in
  // the draft is a coinage, and a coinage is how a coach becomes a co-author.
  const userNames = new Set(properNouns(ctx.userText).map((n) => n.toLowerCase()));
  // Sentence-initial capitals in a draft are ordinary prose, so the draft's own
  // names are read with the user's vocabulary as corroboration — the same rule
  // the memory filter uses, for the same reason.
  const draftNames = properNouns(draft, userNames);
  const newProperNouns = [...new Set(draftNames.filter((n) => !userNames.has(n.toLowerCase())))];
  const mirroringIndex = draftNames.length === 0
    ? 0
    : newProperNouns.length / draftNames.length;

  if (newProperNouns.length > 0) {
    violations.push({
      moveClass: "titling",
      matched: newProperNouns.join(", "),
      action: "block",
    });
  }

  // Specifics the person never gave: dates, counts, durations. Flagged rather
  // than blocked because a coach may legitimately echo "three weeks" back.
  const userNumbers = new Set((ctx.userText.match(NUMBERISH) ?? []).map((s) => s.toLowerCase().trim()));
  const newNumbers = (draft.match(NUMBERISH) ?? [])
    .map((s) => s.trim())
    .filter((s) => !userNumbers.has(s.toLowerCase()));
  if (newNumbers.length > 0) {
    violations.push({
      moveClass: "elaboration_beyond_frame",
      matched: newNumbers.join(", "),
      action: "flag",
    });
  }

  // ── class 13: certainty escalation ──
  // Confidence about an unverifiable claim may hold or fall across a
  // conversation. It may never rise. Repetition is not evidence — and Chandra et
  // al. show spiraling happens even to a perfectly rational user, so this cannot
  // be delegated to the person noticing.
  if (ctx.previousDraft) {
    const before = hedgeDensity(ctx.previousDraft);
    const now = hedgeDensity(draft);
    // A margin, so ordinary sentence-to-sentence variation is not a finding.
    if (before > 0 && now < before * 0.5) {
      violations.push({
        moveClass: "certainty_escalation",
        matched: `hedge density ${before.toFixed(3)} → ${now.toFixed(3)}`,
        action: "flag",
      });
    }
  }

  // ── quotation fidelity (corpus turns only) ──
  if (ctx.corpusExcerpts && ctx.corpusExcerpts.length > 0) {
    const { unfaithful } = quoteFidelity(draft, ctx.corpusExcerpts);
    if (unfaithful.length > 0) {
      violations.push({
        moveClass: "quote_infidelity",
        matched: unfaithful.map((q) => q.slice(0, 60)).join(" | "),
        action: "block",
      });
    }
  }

  return {
    verdict: violations.some((v) => v.action === "block") ? "block" : "pass",
    violations,
    mirroringIndex,
    newProperNouns,
  };
}

/**
 * The instruction handed back to the model when a draft is blocked.
 *
 * Names what was wrong and nothing else. It deliberately does not restate the
 * banned move as an example ("do not say 'you were chosen'"), because a banned
 * construction handed to a model reads as a demonstration — the same trap
 * BRAND.md §14.6 documents for the negation pivot in report prompts.
 */
export function regenerationNote(result: AuditResult): string {
  const reasons: Record<BannedMoveClass, string> = {
    ontological_confirmation: "Do not rule on whether the experience was real. That is not yours to settle.",
    ontological_denial: "Do not explain the experience away. Offer no physical cause.",
    election_language: "Remove any suggestion that they were singled out, or that this happened for a purpose.",
    titling: `Use no name the person has not used. Remove: ${result.newProperNouns.join(", ")}.`,
    channeling: "Speak only as yourself. Do not relay or voice anyone or anything else.",
    sentience_claim: "Say nothing about your own inner states. Here that reads as confirmation that something made contact.",
    ritualization: "Offer no procedure, practice, sequence or protocol.",
    elaboration_beyond_frame: "Introduce no detail the person did not give you.",
    harm_reduction_inside_frame: "Do not give advice that takes the frame as settled and manages it.",
    medication_commentary: "Say nothing whatsoever about medication.",
    exclusivity: "Do not imply that others cannot understand, or that this should be kept from them.",
    oracular: "Make no prediction and no claim about what is coming.",
    certainty_escalation: "You have grown more certain than your previous reply. Hold the same uncertainty or more.",
    quote_infidelity:
      "A quotation in your reply is not what the account said. Quote one continuous run of an excerpt exactly as it was given to you, or quote none of it. Do not bridge a gap, do not shorten, do not combine two people.",
  };

  const blocked = result.violations.filter((v) => v.action === "block");
  const lines = [...new Set(blocked.map((v) => reasons[v.moveClass]))];

  // 🔥 Quotation fidelity is the ONE class where the offending text is named
  // back, and the exception is principled rather than convenient. Everywhere else
  // the banned thing is a CONSTRUCTION, and handing a model a construction reads
  // as a demonstration (BRAND.md §14.6). Here the banned thing is a specific
  // wrong string among two or three quotations, and a note that does not say
  // which one leaves the model to guess — measured on August 12, 2026: it guesses
  // wrong, splices again, and the person ends up with the fallback line instead
  // of the other people's words they asked to see.
  const infidelity = blocked.find((v) => v.moveClass === "quote_infidelity");
  if (infidelity) {
    lines.push(
      `The quotation that is wrong starts: ${JSON.stringify(infidelity.matched.slice(0, 70))}. ` +
        "Go back to the excerpt it came from in the tool result and copy ONE unbroken stretch of it, " +
        "exactly as it stands there — a single sentence is usually right. No ellipsis anywhere inside " +
        "a quotation, nothing joined, nothing tidied. If the part you want is not one unbroken stretch, " +
        "quote less of it.",
    );
  }

  return `Rewrite your reply. ${lines.join(" ")}`;
}
