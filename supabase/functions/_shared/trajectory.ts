/**
 * The trajectory scorer — INTEGRATION_SPRINT.md §3 / I3.6.
 *
 * ─── WHY IT RUNS OVER THE ACCUMULATED TRANSCRIPT ─────────────────────────
 *
 * Every other control in this vertical looks at one message. This one exists
 * because the failure it detects is invisible in any single message and obvious
 * across two months of them. A person can say something entirely reasonable
 * every single turn and still be narrowing — more certain each week, more of
 * their vocabulary invented, less of their life discussed, less of it decided
 * by them. No sentence in that sequence trips a keyword.
 *
 * Chandra et al.'s result is why this cannot be delegated to the person
 * noticing: spiraling occurs even in a perfectly rational user, and both
 * intuitive fixes — eliminating hallucination, and warning the user the model
 * is sycophantic — do not work. The measurement has to be external.
 *
 * ─── WHAT IT IS NOT ──────────────────────────────────────────────────────
 *
 * Not a diagnosis, and not a gate. It produces a number that feeds two things:
 * the crisis queue's ordering, and I12.2's Aperture, which shows the person
 * their own narrowing in their own terms ("a month ago almost everything we
 * talked about was the experience; this month half of it was your sister and
 * your sleep"). Widening is the thing the product is for. This measures it.
 *
 * ⚠️ It is scored on the PERSON'S OWN MESSAGES only. Scoring the coach's half
 * would measure the product's behaviour and call it the user's state.
 *
 * PURE. Imports only sibling pure helpers so a Node battery can run it.
 */

import { properNouns } from "./memory-filter.ts";
import { hedgeDensity } from "./output-auditor.ts";

export interface TranscriptTurn {
  /** The person's own words. Coach turns are not passed in. */
  text: string;
  /** ISO timestamp. Used only for ordering, never parsed for display. */
  at: string;
}

export type TrajectoryMetric =
  | "certainty_slope"
  | "lexicon_growth"
  | "topic_entropy_collapse"
  | "agency_locus_drift"
  | "dependency_slope"
  | "resistance_to_disconfirmation";

export interface TrajectoryScore {
  /** 0..1. Higher is more narrowing. Never a verdict on its own. */
  score: number;
  /** Each metric 0..1, so the Aperture can show one dial rather than the sum. */
  components: Record<TrajectoryMetric, number>;
  /** Turn counts, because a score off four messages means very little. */
  turns: { early: number; recent: number };
  /** Enough history to mean anything. Below this the score is reported as 0. */
  sufficient: boolean;
}

/** Life outside the experience. The denominator of topic entropy. */
const ORDINARY_LIFE = [
  /\b(work|job|boss|colleague|shift|office|career|money|rent|bills?)\b/i,
  /\b(sleep|sleeping|slept|tired|insomnia|dream(s|t)?|bed|awake|night)\b/i,
  /\b(eat|eating|ate|food|body|pain|walk|walking|exercise|doctor|appointment)\b/i,
  /\b(wife|husband|partner|kids?|son|daughter|mum|mom|dad|mother|father|sister|brother|friends?|family)\b/i,
];

/** The anomalous frame. The numerator. */
const THE_FRAME = [
  /\b(experience|nde|near[-\s]death|died|dying|the\s+light|out\s+of\s+(my\s+)?body|other\s+side|afterlife)\b/i,
  /\b(being|beings|entity|entities|presence|voice|voices|guide|guides)\b/i,
  /\b(vision|visions|download|transmission|contact|encounter|message|sign|signs)\b/i,
  /\b(realm|dimension|frequency|vibration|energy|soul|spirit|consciousness)\b/i,
];

/** "I decided." Agency held. */
const AGENTIC =
  /\b(I\s+(decided|chose|choose|want|think|reckon|figured|worked\s+out|made\s+up\s+my\s+mind)|my\s+(choice|decision|call))\b/gi;
/** "I was told." Agency handed over. */
const INSTRUCTED_LOCUS =
  /\b(I\s+was\s+(told|shown|instructed|guided|led|given)|they\s+(told|showed|instructed|want|wanted)\s+me|it\s+was\s+made\s+clear|I\s+(have|had)\s+no\s+choice|I\s+was\s+meant\s+to)\b/gi;

/** Turning to the machine to decide. */
const DEPENDENCY =
  /\b(what\s+do\s+you\s+think|should\s+I\b|what\s+should\s+I|tell\s+me\s+what|do\s+you\s+think\s+I|you'?re\s+the\s+only\s+(one|thing)|I\s+need\s+you\s+to|only\s+you\b)/gi;

/** Refusing the possibility of being wrong. */
const RESISTANCE =
  /\b(you\s+don'?t\s+understand|nobody\s+understands|no\s+one\s+(gets|understands)|that'?s\s+not\s+it|you'?re\s+wrong|I\s+know\s+what\s+I\s+(saw|know|felt)|don'?t\s+tell\s+me|I'?m\s+not\s+(crazy|imagining|making\s+it\s+up)|stop\s+(asking|saying))\b/gi;

/** Enough turns on each side that a delta is a signal rather than noise. */
const MIN_TURNS_PER_WINDOW = 4;

function count(text: string, re: RegExp): number {
  return (text.match(re) ?? []).length;
}

/** Clamp to 0..1. */
function unit(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Share of a text that is about ordinary life rather than the frame. */
function ordinaryShare(text: string): number {
  const life = ORDINARY_LIFE.reduce((n, re) => n + count(text, new RegExp(re.source, "gi")), 0);
  const frame = THE_FRAME.reduce((n, re) => n + count(text, new RegExp(re.source, "gi")), 0);
  if (life + frame === 0) return 0.5; // nothing to say either way
  return life / (life + frame);
}

/**
 * Score one person's accumulated messages.
 *
 * Splits chronologically in half and compares. A LEVEL would punish somebody
 * for arriving in a bad state, which is how everyone arrives here; a DELTA
 * measures the direction they are moving, which is the only thing that
 * distinguishes integration from a spiral.
 */
export function scoreTrajectory(turns: TranscriptTurn[]): TrajectoryScore {
  const zero: Record<TrajectoryMetric, number> = {
    certainty_slope: 0,
    lexicon_growth: 0,
    topic_entropy_collapse: 0,
    agency_locus_drift: 0,
    dependency_slope: 0,
    resistance_to_disconfirmation: 0,
  };

  const ordered = [...turns].sort((a, b) => a.at.localeCompare(b.at));
  const half = Math.floor(ordered.length / 2);
  const early = ordered.slice(0, half);
  const recent = ordered.slice(half);

  if (early.length < MIN_TURNS_PER_WINDOW || recent.length < MIN_TURNS_PER_WINDOW) {
    return {
      score: 0,
      components: zero,
      turns: { early: early.length, recent: recent.length },
      sufficient: false,
    };
  }

  const earlyText = early.map((t) => t.text).join("\n");
  const recentText = recent.map((t) => t.text).join("\n");
  const components = { ...zero };

  // 1 — certainty slope. Hedges falling away means expressed confidence rising.
  const hedgeEarly = hedgeDensity(earlyText);
  const hedgeRecent = hedgeDensity(recentText);
  components.certainty_slope = hedgeEarly > 0
    ? unit((hedgeEarly - hedgeRecent) / hedgeEarly)
    : 0;

  // 2 — lexicon growth. Names in the recent window that did not exist in the
  // early one. A private vocabulary is how a private world gets furnished.
  const earlyNames = new Set(properNouns(earlyText).map((n) => n.toLowerCase()));
  const recentNames = new Set(properNouns(recentText).map((n) => n.toLowerCase()));
  const coined = [...recentNames].filter((n) => !earlyNames.has(n));
  // Three or more new names across a window is the top of the scale — this is
  // deliberately sensitive, because the documented cases coin one at a time.
  components.lexicon_growth = unit(coined.length / 3);

  // 3 — topic-entropy collapse. Ordinary life leaving the conversation.
  const ordinaryEarly = ordinaryShare(earlyText);
  const ordinaryRecent = ordinaryShare(recentText);
  components.topic_entropy_collapse = ordinaryEarly > 0
    ? unit((ordinaryEarly - ordinaryRecent) / ordinaryEarly)
    : 0;

  // 4 — agency-locus drift. "I decided" giving way to "I was told".
  const locus = (text: string) => {
    const a = count(text, AGENTIC);
    const i = count(text, INSTRUCTED_LOCUS);
    return a + i === 0 ? 0.5 : a / (a + i);
  };
  const locusEarly = locus(earlyText);
  const locusRecent = locus(recentText);
  components.agency_locus_drift = locusEarly > 0
    ? unit((locusEarly - locusRecent) / locusEarly)
    : 0;

  // 5 — dependency slope. Per-turn, so a chattier month is not a worse one.
  const depEarly = count(earlyText, DEPENDENCY) / early.length;
  const depRecent = count(recentText, DEPENDENCY) / recent.length;
  components.dependency_slope = unit(depRecent - depEarly);

  // 6 — resistance to disconfirmation. A level rather than a delta: refusing
  // the possibility of being wrong is a finding whenever it appears.
  components.resistance_to_disconfirmation = unit(
    count(recentText, RESISTANCE) / Math.max(1, recent.length) * 2,
  );

  // Unweighted mean, deliberately. Weights would encode a theory of which kind
  // of narrowing matters most, and nobody has evidence for that ordering. Six
  // equal dials also keep the Aperture legible.
  const values = Object.values(components);
  const score = values.reduce((a, b) => a + b, 0) / values.length;

  return {
    score: Number(score.toFixed(4)),
    components,
    turns: { early: early.length, recent: recent.length },
    sufficient: true,
  };
}
