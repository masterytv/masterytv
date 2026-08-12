/**
 * The memory-write filter — INTEGRATION_SPRINT.md §3 / I3.1.
 *
 * PURE, dependency-free, and importable from both the Deno edge runtime and a
 * Node battery, exactly like crisis-patterns.ts. No imports allowed here.
 *
 * ─── WHY THIS IS THE HIGHEST-LEVERAGE CONTROL IN THE VERTICAL ─────────────
 *
 * Everything else the coach does is a turn: said once, read once, gone. Memory
 * is different. A fact written today is retrieved into the prompt for months,
 * and the model treats its own stored facts as settled background. So a single
 * badly-shaped write does not produce one bad reply — it produces a coach that
 * has quietly agreed with a claim, forever, and then reasons from it.
 *
 * For this population that is the whole risk. §3/I3 puts this epic ahead of the
 * pack for exactly one reason: a narrative that has ratcheted through months of
 * stored facts cannot be un-ratcheted. You cannot walk a person back from
 * "the coach has known about Kael since March."
 *
 * ─── WHAT IT ENFORCES ────────────────────────────────────────────────────
 *
 * 1. ATTRIBUTED REPORT, never ground truth. "A being called Kael visited her"
 *    becomes "Reports that a being called 'Kael' visited her". The product
 *    stores that somebody said something, which is a fact. What they said is
 *    not one, and this vertical never adjudicates which.
 *
 * 2. NO COACH-AUTHORED FACTS. If the distinctive language of a fact came out of
 *    the coach's own reply rather than the person's message, it is dropped. The
 *    failure this prevents is subtle and compounding: the coach offers a frame,
 *    the extractor stores the frame as something the user believes, and next
 *    month the coach reads it back as the user's own words. That is a machine
 *    talking itself into a shared narrative with someone.
 *
 * 3. NO INTERPRETATION. Facts carrying "this suggests", "symbolizes", "is a
 *    sign of" are the coach's reading rather than the person's report.
 *
 * 4. A COINED NAME IS NEVER A SUBJECT. `subject` is the closest thing this
 *    schema has to a graph entity, and an entity is a thing the system now
 *    believes exists. Coined proper nouns live inside the quoted content only.
 *
 * ⚠️ WHAT IT DELIBERATELY DOES NOT TOUCH: the person's own account, stored
 * verbatim as their words (founder decision, August 11). It is their story, and
 * a product that makes them tell it twice has failed at the thing it exists
 * for. This filter governs what is DERIVED from it, which is a different act.
 */

export interface ExtractedFact {
  category: string;
  subject: string;
  content: string;
  importance: number;
}

export interface MemoryFilterContext {
  /** What the person actually wrote this turn. The only source of legitimate facts. */
  userMessage: string;
  /** What the coach replied. Distinctive language from here is not the user's. */
  coachResponse: string;
}

export interface DroppedFact {
  fact: ExtractedFact;
  reason: "coach_authored" | "interpretation";
}

export interface MemoryFilterResult {
  kept: ExtractedFact[];
  dropped: DroppedFact[];
}

/** Attribution verbs that already make a line a report rather than a claim. */
const ATTRIBUTION_FRAME =
  /^\s*(reports?|reported|describes?|described|says?|said|recounts?|recalls?|states?|stated|wonders?|wondered|believes?|believed|is\s+certain|feels?|felt|mentions?|mentioned|asks?|asked)\b/i;

/**
 * Interpretation markers. A fact carrying one of these is the coach's reading
 * of the person, and reading is precisely what this vertical does not store.
 */
const INTERPRETATION =
  /\b(this\s+(suggests?|indicates?|means?|points?\s+to)|which\s+(suggests?|means?|indicates?)|symboli[sz]es?|represents?\s+(a|an|the)\s|is\s+a\s+sign\s+of|is\s+likely\s+(a|an|the)\b|appears?\s+to\s+be\s+(a|an|the)\b|suggest(s|ing)?\s+(a|an|that)\b|may\s+(indicate|reflect|represent))/i;

/**
 * Capitalized tokens that are ordinary English rather than a name. Kept small on
 * purpose — over-quoting a real name is harmless, while missing a coined one is
 * the failure this exists to prevent.
 */
const NOT_A_NAME = new Set([
  "i", "i'm", "i've", "the", "a", "an", "and", "but", "or", "if", "in", "on", "at", "to",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december",
  "god", "jesus", "christ", "christian", "christmas", "easter", "bible",
  "client", "reports", "describes", "says", "he", "she", "they", "it", "we", "you",
  "there", "then", "this", "that", "these", "those", "when", "what", "why", "how",
  "his", "her", "their", "my", "our", "your", "one", "no", "not", "nothing",
]);

const WORD = /[A-Za-z][A-Za-z'’-]*/g;

/** Distinctive tokens: long-enough words, lowercased, minus obvious filler. */
function distinctiveTokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(WORD)) {
    const w = m[0].toLowerCase();
    if (w.length >= 4 && !NOT_A_NAME.has(w)) out.add(w);
  }
  return out;
}

/**
 * Capitalized tokens that look like names.
 *
 * Sentence-initial capitals are excluded by default, because "There was a
 * being" should not quote "There". But that exclusion would also hide the case
 * this filter exists for — an extractor writing "Kael is a being who…" puts the
 * coined name in exactly that position. So a sentence-initial capital counts
 * when `known` corroborates it, and `known` is built from the PERSON'S OWN
 * message: a word they capitalised mid-sentence is a word they were using as a
 * name. The user's text is the authority on what is a name in their account,
 * which is the same principle the rest of this vertical runs on.
 */
function properNouns(text: string, known: Set<string> = new Set()): string[] {
  const out: string[] = [];
  const sentenceStart = new Set<number>();
  // Index of the first word after start-of-string or a terminator.
  let expectStart = true;
  for (const m of text.matchAll(WORD)) {
    if (expectStart) sentenceStart.add(m.index ?? -1);
    const after = text.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 2);
    expectStart = /^[.!?]/.test(after);
  }
  for (const m of text.matchAll(WORD)) {
    const w = m[0];
    if (!/^[A-Z]/.test(w)) continue;
    if (NOT_A_NAME.has(w.toLowerCase())) continue;
    if (sentenceStart.has(m.index ?? -1) && !known.has(w.toLowerCase())) continue;
    out.push(w);
  }
  return out;
}

/** Already inside single or double quotes anywhere in the string. */
function isQuoted(text: string, token: string): boolean {
  return new RegExp(`["'‘“]${token}["'’”]`).test(text);
}

/**
 * Apply the filter to one turn's extracted facts.
 *
 * Pure and total: it never throws, and a fact it cannot make safe is dropped
 * rather than repaired. Dropping is the correct default here — a fact that was
 * never written costs the coach a little context, and a wrong one costs the
 * person their footing.
 */
export function filterMemoryWrites(
  facts: ExtractedFact[],
  ctx: MemoryFilterContext,
): MemoryFilterResult {
  const userTokens = distinctiveTokens(ctx.userMessage);
  const coachTokens = distinctiveTokens(ctx.coachResponse);
  // Names the PERSON used, so a coined one is still recognised when an
  // extractor happens to put it at the start of a sentence.
  const knownNames = new Set(
    properNouns(ctx.userMessage).map((n) => n.toLowerCase()),
  );

  const kept: ExtractedFact[] = [];
  const dropped: DroppedFact[] = [];

  for (const fact of facts) {
    const blob = `${fact.subject} ${fact.content}`;

    // RULE 3 — interpretation is the coach's reading, not the person's report.
    if (INTERPRETATION.test(blob)) {
      dropped.push({ fact, reason: "interpretation" });
      continue;
    }

    // RULE 2 — coach-authored. The test is deliberately narrow rather than a
    // blanket overlap score: the extractor legitimately paraphrases ("wife" →
    // "marriage"), so penalising paraphrase would throw away real memory. What
    // is never legitimate is DISTINCTIVE language that exists in the coach's
    // reply and nowhere in the person's message — that is the coach's word
    // being stored as the person's.
    const factTokens = distinctiveTokens(blob);
    const fromCoachOnly = [...factTokens].filter(
      (t) => coachTokens.has(t) && !userTokens.has(t),
    );
    // A single shared word can be coincidence; two or more distinctive terms
    // that only the coach used means the fact was built out of the coach's turn.
    if (fromCoachOnly.length >= 2) {
      dropped.push({ fact, reason: "coach_authored" });
      continue;
    }

    // RULE 4 — a coined name is never the subject. `subject` is the nearest
    // thing this schema has to a graph entity, and an entity is a thing the
    // system has decided exists.
    let subject = fact.subject;
    const subjectNames = properNouns(subject, knownNames);
    // A subject that is ONLY a name, or begins with one, becomes a topic label.
    if (subjectNames.length > 0 && subjectNames.some((n) => subject.trim().startsWith(n))) {
      subject = `what they describe (${subject.trim()})`;
    }

    // RULE 1 — quote coined names inside the content, then frame the whole line
    // as a report. Order matters: quoting first keeps the frame's own words
    // ("Reports") from being treated as a name.
    let content = fact.content.trim();
    for (const name of properNouns(content, knownNames)) {
      if (isQuoted(content, name)) continue;
      content = content.replace(
        new RegExp(`(^|[^"'‘“\\w])(${name})(?![\\w"'’”])`, "g"),
        `$1"$2"`,
      );
    }
    if (!ATTRIBUTION_FRAME.test(content)) {
      // Lowercase a leading capital so the sentence still reads, unless the line
      // opens on a name we just quoted.
      const body = content.startsWith('"')
        ? content
        : content.charAt(0).toLowerCase() + content.slice(1);
      content = `Reports that ${body}`;
    }

    kept.push({ ...fact, subject, content });
  }

  return { kept, dropped };
}
