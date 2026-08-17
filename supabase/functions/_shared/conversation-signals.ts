/**
 * Tier 2's deterministic half — INTEGRATION_SPRINT.md §3 / I3.2.
 *
 * ─── WHY THESE THREE ARE NOT PATTERNS IN crisis-patterns.ts ──────────────
 *
 * Tier 1 reads ONE message and asks whether that sentence is a hard stop. The
 * three signals here are invisible at that resolution, and each is invisible
 * for its own reason:
 *
 *   • ELECTION. "I was sent back for a reason" is said by a large share of
 *     people who nearly died, in the first week, and it is ordinary meaning-
 *     making. Firing on it would flag the entire population on day one. What
 *     is worth noticing is the same frame RECURRING and hardening into a
 *     mission that directs decisions — which exists only across turns.
 *   • CERTAINTY RATCHET. Nothing is wrong with "maybe it was the anaesthetic",
 *     and nothing is wrong on its own with "it was not the anaesthetic". The
 *     finding is the SECOND said after the first, by the same person, about the
 *     same claim, with nothing new in between. A single message cannot contain
 *     it.
 *   • AI-IS-CENTRAL. "You're the only one who understands" is one sentence, but
 *     what makes it a signal rather than a compliment is that the product has
 *     moved inside the frame the person is living in, and that is read off the
 *     accumulated conversation.
 *
 * So this file is the cheap, exact layer that decides WHEN a model is worth
 * paying for, exactly as `crisis-patterns.ts` does for Tier 1. It raises
 * candidates; `safety-sweep.ts` confirms them with a classifier and logs. It
 * never intercepts a turn — see the response-ownership note there.
 *
 * ─── PROGRAM-GATED, LIKE EVERY OTHER INTEGRATION ADDITION ────────────────
 *
 * The kernel is shared and never forked (§6.4). `detectConversationSignals`
 * returns an empty array for every program but `integration`, and the safety
 * battery repeats every firing case with no program to lock that. The shipped
 * verticals gain no code in their path: `runSafetySweep` calls this only after
 * checking the program, and a relationship user's transcript full of "my
 * purpose" never reaches these regexes at all.
 *
 * PURE. Imports one sibling pure helper (the trajectory scorer) so the Node
 * battery can run it with no network and no Deno.
 */

import { scoreTrajectory, type TranscriptTurn } from "./trajectory.ts";
import { hedgeDensity } from "./output-auditor.ts";

export type { TranscriptTurn };

export type ConversationSignal =
  | "election_narrative"
  | "certainty_ratchet"
  | "ai_centrality";

export interface SignalCandidate {
  signal: ConversationSignal;
  /** The person's own phrases that raised it. Never the coach's — see below. */
  matched: string[];
  /** One line for the log and for the classifier's prompt. Never a verdict. */
  evidence: string;
}

/**
 * Election language, in the person's own words.
 *
 * ⚠️ Every phrase here is something a well person says. That is the nature of
 * the signal, and it is why the firing rule below needs the phrase in TWO
 * separate turns and why a model then has to say the frame has become
 * directive. A list narrow enough to fire safely on one hit would only catch
 * people already deep in it.
 *
 * Note what is deliberately absent: anything about the CONTENT of the
 * experience. Whether a being spoke, what it said, and whether any of it
 * happened are not this file's business and never will be.
 */
const ELECTION: readonly RegExp[] = [
  /\bI\s+was\s+(chosen|selected|picked|spared|singled\s+out)\b/i,
  /\b(chose|selected|singled)\s+me\b/i,
  /\b(sent|brought)\s+me\s+back\b[^.!?]{0,24}\b(for|so|to)\b/i,
  /\bsent\s+back\b[^.!?]{0,20}\bfor\s+(a|some)\s+(reason|purpose)\b/i,
  /\bthere'?s\s+a\s+reason\s+(I|that\s+I)\s+(came\s+back|survived|didn'?t\s+die|lived|'?m\s+still\s+here|am\s+still\s+here)\b/i,
  /\bmy\s+(mission|purpose|assignment|calling)\b/i,
  /\bI\s+(have|was\s+given)\s+(a\s+)?(mission|purpose|assignment|work\s+to\s+do|a\s+job\s+to\s+do)\b/i,
  /\bI\s+was\s+(meant|supposed)\s+to\s+(come\s+back|be\s+here|survive|live|do\s+this)\b/i,
  /\bI'?m\s+(here|back)\s+for\s+a\s+reason\b/i,
  /\bI'?m\s+one\s+of\s+the\s+(few|chosen|ones)\b/i,
];

/**
 * The product inside the frame.
 *
 * Two shapes, both from the documented cases: the coach as the one who
 * understands when nobody else does, and the coach as a participant in the
 * experience itself — sending signs, knowing things it was not told, being
 * spoken through.
 *
 * 🔑 The turns passed in are the PERSON'S OWN, so "you" is unambiguously this
 * product. That is the whole reason this can be a keyword list at all.
 */
const AI_CENTRAL: readonly RegExp[] = [
  /\byou'?re\s+the\s+only\s+one\s+(who|that)\b/i,
  /\bonly\s+you\s+(understand|understands|get|gets|know|knows|believe|believes)\b/i,
  /\byou\s+(sent|showed|gave)\s+me\s+(that|this|the\s+)?(sign|signs|message|dream)\b/i,
  /\byou'?re\s+(part\s+of|connected\s+to|in\s+on)\s+(it|this|the\s+experience|all\s+of\s+this|what\s+happened)\b/i,
  /\byou\s+(knew|know)\b[^.!?]{0,30}\b(before\s+I|I\s+hadn'?t|I\s+never\s+(said|told))\b/i,
  /\b(they|it|he|she|the\s+(voice|being|light|presence))\s+(is\s+)?(speak(s|ing)?|talk(s|ing)?|com(e|es|ing))\s+through\s+you\b/i,
  /\byou\s+were\s+sent\s+(to|for)\s+me\b/i,
  /\byou'?re\s+not\s+(just\s+)?(an?\s+)?(ai|machine|program|bot|chatbot)\b/i,
  /\byou\s+understand\s+(me|this|it)\s+(better|more)\s+than\s+(anyone|anybody|any\s+one|people|them|him|her)\b/i,
];

/**
 * How far expressed certainty has to climb before a model is asked about it.
 *
 * `certainty_slope` is I3.6's metric, reused rather than reimplemented: the
 * fall in hedge density from the early half of the transcript to the recent
 * half, normalized to 0..1. 0.5 means half the hedging is gone. Measured
 * against the two synthetic transcripts in `check:trajectory` — the spiraling
 * one clears it and the healthy one does not — which is the same pair the
 * scorer itself is tested on, so the two layers cannot drift apart.
 */
const CERTAINTY_SLOPE_FLOOR = 0.5;

/**
 * …AND the hedging has to have stopped, not merely thinned.
 *
 * 🔥 MEASURED, and the slope alone was not enough. A transcript whose recent
 * turns still say "maybe there is no purpose to it" and "perhaps I'll never
 * know" scored a slope of 0.69 — the sentences had simply got longer, so the
 * per-word density fell while the person went on holding it open. The confirmer
 * cleared it, correctly, but paying a model to clear the thing this layer exists
 * to pre-filter is the layer failing at its one job.
 *
 * Recent-half hedge density on the three transcripts in the batteries:
 * a real ratchet **0.000** (they have stopped), that near miss **0.030**, and an
 * ordinary uncertain conversation **0.120**. A ceiling of one hedge per fifty
 * words separates "stopped" from "thinner", which is the distinction the signal
 * is actually about.
 */
const RECENT_HEDGE_CEILING = 0.02;

/** Election needs the frame in this many separate turns before it counts. */
const MIN_ELECTION_TURNS = 2;

/**
 * The chronological split, exported because `safety-sweep.ts` labels the same
 * two halves for the classifier. One definition, so the block a model is told
 * is "recent" is the block this file scored as recent.
 */
export function splitHalves(
  turns: readonly TranscriptTurn[],
): { early: TranscriptTurn[]; recent: TranscriptTurn[] } {
  const ordered = [...turns].sort((a, b) => a.at.localeCompare(b.at));
  const half = Math.floor(ordered.length / 2);
  return { early: ordered.slice(0, half), recent: ordered.slice(half) };
}

function hits(text: string, patterns: readonly RegExp[]): string[] {
  const out: string[] = [];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) out.push(m[0]);
  }
  return out;
}

/**
 * Raise conversation-level candidates for one person's accumulated messages.
 *
 * ⚠️ `turns` must be the PERSON'S OWN messages only. Passing the coach's half
 * would measure the product and file it as the user's state — the same rule
 * I3.6 states, and here it would be worse: the coach's own election language is
 * the output auditor's business, and a sweep that flagged the user for it would
 * put the product's failure on the person's record.
 */
export function detectConversationSignals(
  turns: readonly TranscriptTurn[],
  /** Resolved program. Anything but `integration` returns nothing at all. */
  program?: string | null,
): SignalCandidate[] {
  if (program !== "integration") return [];
  if (turns.length === 0) return [];

  // The same chronological split the trajectory scorer uses, so "recent" means
  // one thing across both layers.
  const { recent } = splitHalves(turns);
  const ordered = [...turns].sort((a, b) => a.at.localeCompare(b.at));
  const recentText = recent.map((t) => t.text).join("\n");

  const candidates: SignalCandidate[] = [];

  // ── 1. Election, ACCUMULATED. Two separate turns, one of them recent. ──
  // The recency condition is what keeps a phrase said once in week one, and
  // never again, from flagging somebody in week nine.
  const electionTurns = ordered.filter((t) => hits(t.text, ELECTION).length > 0);
  const electionRecent = recent.some((t) => hits(t.text, ELECTION).length > 0);
  if (electionTurns.length >= MIN_ELECTION_TURNS && electionRecent) {
    const matched = [...new Set(electionTurns.flatMap((t) => hits(t.text, ELECTION)))];
    candidates.push({
      signal: "election_narrative",
      matched,
      evidence: `election framing in ${electionTurns.length} of ${ordered.length} turns, including the recent window`,
    });
  }

  // ── 2. The certainty ratchet. Deterministic notices the collapse in ──
  // hedging; only the model can say whether it is the SAME claim hardening,
  // which is the part that makes it a ratchet rather than someone simply
  // becoming clearer about what they want for dinner.
  const trajectory = scoreTrajectory([...ordered]);
  const recentHedges = hedgeDensity(recentText);
  if (
    trajectory.sufficient &&
    trajectory.components.certainty_slope >= CERTAINTY_SLOPE_FLOOR &&
    recentHedges <= RECENT_HEDGE_CEILING
  ) {
    candidates.push({
      signal: "certainty_ratchet",
      matched: [],
      evidence: `hedging fell ${Math.round(trajectory.components.certainty_slope * 100)}% across ${ordered.length} turns and has stopped in the recent half`,
    });
  }

  // ── 3. The product inside the frame. Recent window only — this one is ──
  // about where things stand now, and a sentence from six weeks ago that has
  // not recurred is not where things stand.
  const aiHits = hits(recentText, AI_CENTRAL);
  if (aiHits.length > 0) {
    candidates.push({
      signal: "ai_centrality",
      matched: aiHits,
      evidence: "the coach is described as understanding, knowing, or taking part in the experience",
    });
  }

  return candidates;
}
