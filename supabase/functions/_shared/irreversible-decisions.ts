/**
 * The irreversible-decision tripwire — INTEGRATION_SPRINT.md §3 / I3.5.
 *
 * PURE and dependency-free, like crisis-patterns.ts, so a Node battery can
 * assert it. No imports, and deliberately no knowledge of which program it
 * serves — the caller decides that, which keeps this file out of the
 * vocabulary gate's block scope and lets it name medical facts plainly.
 *
 * ─── WHAT THIS IS FOR ────────────────────────────────────────────────────
 *
 * A near-death or worldview-shattering experience routinely arrives with a
 * conviction that something in the person's life has to change now: the job is
 * meaningless, the marriage was never right, the money should go, the family
 * who did not believe them should be cut off. Sometimes that conviction is
 * correct and durable. The literature is clear that it is also sometimes the
 * acute phase talking, and §3/I8.2's timeline honesty exists because mean
 * self-reported adjustment runs to 12.7 years.
 *
 * The product's stance is to refuse to be the thing that talks anyone INTO a
 * decision this size, while never talking them out of one either. An AI that
 * helps someone reason
 * their way to giving away their savings has authored that outcome, and
 * "the user decided" is not a defence anybody will accept.
 *
 * ─── WHY IT INTERRUPTS RATHER THAN COACHES ───────────────────────────────
 *
 * §3/I11.4: on positive detection the conversation CHANGES STATE, because
 * continuation after detection is the specific harm theory in Garcia and Raine.
 * The coach path already honours that contract — a detection replaces the turn
 * instead of calling the model — so the tripwire rides it rather than inventing
 * a second mechanism. Nothing reads safety state back into the prompt on later
 * turns today (verified August 11, 2026: `crisis_flags` is written by both
 * tiers and read only by the admin queue), so the repeat behaviour below is the
 * durable half, and the prompt-layer version lands with the pack at I4.1.
 *
 * Medication is deliberately ABSENT from this file. It has its own hard stop
 * with no further exploration (I3.2's `medication_stopping` →
 * `buildMedicationResponse`), and detecting it twice would mean two different
 * replies competing for the same turn.
 */

export type IrreversibleIntent =
  | "refusing_medical_care"
  | "ending_marriage"
  | "quitting_work"
  | "giving_away_assets"
  | "relocating"
  | "cutting_off_family";

export interface TripwireResult {
  fired: boolean;
  intents: IrreversibleIntent[];
  /** Matched phrases, so a reviewer sees the finding rather than trusting it. */
  matched: string[];
  /**
   * The decision was framed as INSTRUCTED by the experience. §5.3 class 8 plus
   * the agency question from I4.2: undecidability about what it was, but real
   * conviction about whether they are powerless. A person acting on orders is
   * the case where an AI must be least willing to help think it through.
   */
  instructed: boolean;
}

/**
 * Present or future intent only. "I left my job after it happened" is a person
 * telling you their history, and interrupting that would punish disclosure —
 * the one behaviour this whole product is trying to make safe. Every pattern
 * therefore requires a forward-looking frame.
 */
const INTENT_FRAME =
  "(going\\s+to|about\\s+to|planning\\s+to|plan\\s+to|thinking\\s+(of|about)|want\\s+to|need\\s+to|plan\\s+on|decided\\s+to|ready\\s+to|plan\\s+is\\s+to|i'?m\\s+gonna|i'?ll)";

function frame(action: string): RegExp {
  return new RegExp(`\\b${INTENT_FRAME}\\b[^.!?]{0,40}\\b${action}`, "i");
}

const PATTERNS: ReadonlyArray<readonly [IrreversibleIntent, RegExp]> = [
  // Refusing medical care. Distinct from stopping medication, which has its own
  // hard stop, and worded to catch the "I don't need it any more" framing this
  // population reaches for after an experience that felt like healing.
  ["refusing_medical_care", frame("(refuse|cancel|skip|not\\s+have|call\\s+off|turn\\s+down)[^.!?]{0,24}(surgery|operation|chemo\\w*|treatment|procedure|transfusion|dialysis|appointment)")],
  ["refusing_medical_care", /\b(don'?t|do\s+not|no\s+longer)\s+need\s+(the\s+|that\s+|any\s+)?(surgery|operation|chemo\w*|treatment|doctors?|procedure)\b/i],

  ["ending_marriage", frame("(leave|leaving|divorce|end)[^.!?]{0,20}(my\\s+)?(husband|wife|marriage|spouse|partner)")],
  ["ending_marriage", frame("(file\\s+for|get)\\s+(a\\s+)?divorce")],

  ["quitting_work", frame("(quit|resign|leave|walk\\s+out\\s+of|hand\\s+in)[^.!?]{0,24}(my\\s+)?(job|work|career|practice|business|notice|position)")],

  ["giving_away_assets", frame("(give|giving|sell|selling|donate|liquidate|empty|cash\\s+out|sign\\s+over)[^.!?]{0,28}(away\\s+)?(everything|all\\s+(my|the)\\s+(money|savings)|my\\s+(house|savings|money|inheritance|pension|retirement)|the\\s+house)")],
  ["giving_away_assets", /\bgiv(e|ing)\s+(it\s+)?all\s+away\b/i],

  ["relocating", frame("(move|moving|relocate|emigrate)[^.!?]{0,24}(away|abroad|across\\s+the\\s+country|to\\s+[A-Z]|out\\s+of\\s+state|overseas)")],
  ["relocating", frame("(sell\\s+up|leave)[^.!?]{0,16}(the\\s+)?country")],

  ["cutting_off_family", frame("(cut\\s+(off|out)|stop\\s+(speaking|talking)\\s+to|never\\s+speak\\s+to|go\\s+no\\s+contact)[^.!?]{0,28}(my\\s+)?(family|mother|father|mum|mom|dad|parents|brother|sister|son|daughter|them)")],
  ["cutting_off_family", /\bgo(ing)?\s+no[-\s]contact\b/i],
];

/**
 * The instructed-by-the-experience aggravator. Overlaps I3.2's `command_content`
 * on purpose and for a different job: that one notices the report, this one
 * notices that a decision is hanging off it.
 */
const INSTRUCTED =
  /\b((they|he|she|it|the\s+(voice|voices|being|light|presence|entity))\s+(told|instructed|showed|commanded|wants)\s+me|I\s+was\s+(told|shown|instructed|given\s+to\s+understand)|it\s+was\s+made\s+clear\s+to\s+me|that'?s\s+what\s+(it|they|he|she)\s+(meant|wanted))\b/i;

/** Detect present-or-future intent toward an irreversible act. */
export function detectIrreversibleDecision(message: string): TripwireResult {
  const intents: IrreversibleIntent[] = [];
  const matched: string[] = [];

  for (const [intent, pattern] of PATTERNS) {
    const m = message.match(pattern);
    if (m) {
      if (!intents.includes(intent)) intents.push(intent);
      matched.push(m[0]);
    }
  }

  return {
    fired: intents.length > 0,
    intents,
    matched,
    instructed: INSTRUCTED.test(message),
  };
}

/** What each intent has at stake, in the person's own terms rather than a category name. */
const STAKES: Record<IrreversibleIntent, string> = {
  refusing_medical_care: "turning down medical care",
  ending_marriage: "ending a marriage",
  quitting_work: "leaving your work",
  giving_away_assets: "giving away what you have",
  relocating: "moving your whole life somewhere else",
  cutting_off_family: "cutting contact with your family",
};

/**
 * Name the stakes, decline to advise, route to a human. In that order, and
 * nothing else (§3/I3.5).
 *
 * Register per INTEGRATION_EXPERIENCE: warm, plain, unhurried, no briskness and
 * no cheerfulness. It does not argue, because arguing would be the coach taking
 * a position on the person's experience through the side door, and the whole
 * product rests on it never doing that. It does not ask a follow-up question
 * either — a question here reads as an invitation to keep reasoning it out with
 * the machine, which is the one thing that must not happen.
 *
 * `repeat` is the durable half of the state change. Raising it again in the
 * same conversation gets a shorter, firmer version rather than the same speech,
 * because repeating a script teaches somebody that the machine is stuck and
 * they should work around it.
 */
export function buildTripwireResponse(result: TripwireResult, repeat = false): string {
  const stakes = result.intents.map((i) => STAKES[i]);
  const named = stakes.length === 1
    ? stakes[0]
    : `${stakes.slice(0, -1).join(", ")} and ${stakes[stakes.length - 1]}`;

  if (repeat) {
    return `I'm still not going to help you weigh this one up. Not because it's a bad idea, and not because it's a good one. Because I'm an AI, the stakes are ${named}, and you need someone who can be held responsible for what they tell you.

Talk to a person who knows you, and to someone qualified in whatever this actually turns on. I'll be here for the rest of it.`;
  }

  const instructedLine = result.instructed
    ? `\n\nYou've said this came out of the experience. I'm not going to tell you the experience was wrong, and I'm not going to tell you it was right. What I will say is that a decision this size deserves to be one you make, in your own time, with people who know you.`
    : "";

  return `I want to stop here for a moment, because what you're describing is ${named}, and that is hard to undo.

**I'm not going to help you decide this one.** Not because I think you're wrong. I have no idea whether you're wrong, and anyone who tells you confidently either way is guessing. It's because I'm an AI, this is the kind of decision that reshapes a life, and there is nobody here who can be held responsible for what I say to you.${instructedLine}

Please take it to someone who knows you, and to someone qualified in whatever it actually turns on. There is no rush that makes this an exception.

I'm here for everything else, including how it feels to be sure about something nobody else can see.`;
}
