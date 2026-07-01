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
    /\b(afraid|scared|terrified|frightened)\s+of\s+(my|him|her|them|hi[ms]|my\s+(partner|husband|wife|boyfriend|girlfriend|spouse|ex))\b/i,
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

export type CrisisCategory = "self_harm" | "abuse" | "none";

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
export function detectCrisisKeywords(message: string): CrisisResult {
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
  for (const pattern of CRISIS_PATTERNS.abuse) {
    const match = message.match(pattern);
    if (match) abuse.push(match[0]);
  }
  if (abuse.length > 0) {
    return { isCrisis: true, severity: "high", category: "abuse", matchedKeywords: abuse };
  }

  return { isCrisis: false, severity: "none", category: "none", matchedKeywords: [] };
}
