/**
 * Edge Function: money-generate-report
 *
 * Writes the LONG-FORM Money Maps™ report narrative (founder decision
 * 2026-07-20, supersedes the card-only read of MONEY_EXPERIENCE.md §109): a
 * personalized, metaphor-driven dossier built from the deterministic scored
 * bundle PLUS everything else we know about the person (name, age, occupation,
 * relationship status, children, free-form context) PLUS their own strongest
 * item answers. The deterministic bundle stays the single source of numeric
 * truth — this function narrates it, never re-scores it.
 *
 * Request body: { report_id: string }
 *
 * Flow:
 *   1. Auth (user token) + ownership check
 *   2. Load the report row — requires sections.money_map (the write path's bundle)
 *   3. already_complete guard (a stored, non-errored narrative never regenerates)
 *   4. 202 immediately; generation continues via EdgeRuntime.waitUntil
 *   5. Load users profile row + raw item responses; derive ground-truth facts
 *      IN CODE (the LLM never does math or infers cross-data claims)
 *   6. Claude Sonnet primary (the money register is tuned against Claude, same
 *      as the money coach's forceClaude) → structural validation → one repair
 *      retry → GPT-4o fallback (the 2026-07-16 OpenAI-outage lesson, reversed)
 *   7. Save sections.money_narrative + generation_model + cost_tracking
 *
 * WHY a separate function (not a branch in decoded-generate-report): the money
 * report is ONE coherent narrative call with its own prompt system, not eight
 * templated sections; and it deploys independently, so iterating on the money
 * register can never move the Decoded/Relatti report path.
 *
 * Storage-vs-display seam: the stored bundle keys stay `leak`/`leap`/`dims.LEAP`
 * (T2 read contract — live rows + the deployed coach read them). The USER-FACING
 * vocabulary is "the Challenge" and "the Fear" (founder rename 2026-07-20); this
 * prompt writes ONLY the new vocabulary.
 *
 * Deploy with: supabase functions deploy money-generate-report --no-verify-jwt
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// The Supabase edge runtime injects EdgeRuntime (waitUntil keeps background
// work alive past the response). Declared here so local `deno check` passes
// outside the deployed runtime; guarded with typeof at the call site.
declare global {
  // deno-lint-ignore no-var
  var EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;
}

import { createSupabaseClient, createSupabaseClientWithAuth } from "../_shared/supabase.ts";
import { handleCors, getCorsHeaders } from "../_shared/cors.ts";
import { errorResponse, jsonResponse, logError, withRetry, isRetryableError } from "../_shared/errors.ts";
import { callClaudeJson } from "../_shared/anthropic.ts";
import type { StoredMoneyMap } from "../_shared/money-map-profile.ts";

const NARRATIVE_VERSION = 1;
const MAX_TOKENS = 8000;
const CLAUDE_TIMEOUT_MS = 150_000;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o";

/**
 * Cost per call. Claude Sonnet: $3/$15 per MTok. GPT-4o: $2.50/$10 per MTok.
 * Local (not the shared calculateCost) because that helper prices the coach's
 * gpt-4o-mini primary.
 */
function narrativeCost(
  usage: { input_tokens: number; output_tokens: number },
  isOpenAI: boolean,
): number {
  if (isOpenAI) {
    return (usage.input_tokens / 1_000_000) * 2.5 + (usage.output_tokens / 1_000_000) * 10;
  }
  return (usage.input_tokens / 1_000_000) * 3 + (usage.output_tokens / 1_000_000) * 15;
}

// ─────────────────────────────────────────────────────────────────────────────
// Item bank (inlined — Edge Functions can't import from src/)
// LOCKSTEP: src/lib/decoded/instruments/money-maps.ts is canonical. Item text is
// frozen once shipped (DECODED_SCORING.md rule), so this copy only changes if
// the instrument re-fields — update both together.
// ─────────────────────────────────────────────────────────────────────────────

type CoreMap = "GUARD" | "DRIVE" | "MIRROR" | "SHADOW";

const MONEY_ITEMS: Record<number, { text: string; map: CoreMap | "FEAR" }> = {
  1: { text: "I sleep better when I know exactly where my money stands, down to the dollar.", map: "GUARD" },
  2: { text: "Spending money I've worked hard for makes me uneasy — even when I can clearly afford it.", map: "GUARD" },
  3: { text: "I've talked myself out of a good opportunity because committing the money felt too risky.", map: "GUARD" },
  4: { text: "When I hit a money goal, the number I'm chasing quietly moves up almost immediately.", map: "DRIVE" },
  5: { text: "I tell myself I'll ease up and enjoy things once I reach the next milestone.", map: "DRIVE" },
  6: { text: "Most of what's stressing me right now, more money would solve.", map: "DRIVE" },
  7: { text: "How much I'm earning affects how much I respect myself.", map: "MIRROR" },
  8: { text: "I track how my success stacks up against my peers more than I'd like to admit.", map: "MIRROR" },
  9: { text: "Part of why I want to make it big is so certain people finally take me seriously.", map: "MIRROR" },
  10: { text: "There's a money task or number I keep avoiding, even though I know I should face it.", map: "SHADOW" },
  11: { text: "I undercharge, or hesitate to raise my prices, even when my work is worth more.", map: "SHADOW" },
  12: { text: "Some part of me feels that really wanting wealth is a little greedy or unspiritual.", map: "SHADOW" },
  13: { text: "The fear of failing again with money makes me play smaller than I could.", map: "FEAR" },
  14: { text: "Quietly, I wonder if I'd lose myself — or who I'd become — if I actually got what I want.", map: "FEAR" },
  15: { text: "I'd rather protect what I have than risk it for a shot at something much bigger.", map: "FEAR" },
  16: { text: "When I picture my business really taking off, part of me feels dread as much as excitement.", map: "FEAR" },
};

const SCALE_LABELS = [
  "Strongly disagree",
  "Disagree",
  "Slightly disagree",
  "Slightly agree",
  "Agree",
  "Strongly agree",
];

/**
 * One governing metaphor world per archetype. The prompt allows exactly ONE
 * world per report (a mixed metaphor reads as machine writing); seeding it here
 * keeps the world stable across regenerations instead of luck-of-the-draw.
 */
const METAPHOR_WORLDS: Record<string, string> = {
  "The Fortress Builder": "fortifications — walls, the moat, the drawbridge, what the fortress was built to keep out and what it now keeps in",
  "The Quiet Titan": "altitude — the mountain, thin air, the summit nobody watches you reach, weather you prepared for that never came",
  "The Vault": "the vault — the locked door, inventory counted in the dark, the combination only you hold, what appreciates unseen",
  "The Relentless Builder": "construction — scaffolding, the next floor, a building that never tops out, cranes that don't come down",
  "The Mogul": "the arena — the scoreboard, the season that never ends, box seats you never sit in, the roar that fades by the drive home",
  "The Reluctant Rainmaker": "weather — rain held at the threshold, the faucet half-closed, a storm you keep apologizing for, dry fields you could water",
  "The Headliner": "the stage — the lights, the front row, the encore, the quiet backstage after the house empties",
  "The Curator": "the gallery — the collection, the frames, what's hung where guests will see it, the piece kept in storage",
  "The Aspirant": "the window — the display, the room upstairs, the invitation list, the distance between the glass and the shelf",
  "The Monk": "the monastery — the vow, the bare table, the bell that structures the day, the harvest given away at the gate",
  "The Heart-First Creator": "the workshop — the craft, sawdust, work given away warm, the price tag left blank",
  "The Understated": "low volume — the unsigned work, backstage, the dial kept quiet, applause heard through a wall",
};

// ─────────────────────────────────────────────────────────────────────────────
// Ground truth (all derivation happens HERE, in code — never in the model)
// ─────────────────────────────────────────────────────────────────────────────

interface ProfileRow {
  name: string | null;
  age: number | null;
  gender: string | null;
  occupation: string | null;
  relationship_status: string | null;
  has_children: string | null;
  more_info: string | null;
}

const CORE_ORDER: CoreMap[] = ["GUARD", "DRIVE", "MIRROR", "SHADOW"];

const MAP_MEANING: Record<CoreMap, string> = {
  GUARD: "protection and control — watching the downside, safety as the first instinct",
  DRIVE: "more as fuel — progress-as-proof, the moving goalpost",
  MIRROR: "money as signal — worth, status, being seen and taken seriously",
  SHADOW: "money-as-suspect — avoidance, undercharging, quiet guilt about wanting it",
};

function describeGap(gap: number): string {
  if (gap < 0.35) return "a near tie";
  if (gap < 0.85) return "clearly ahead";
  return "far ahead";
}

function cleanStr(v: string | null | undefined, max = 160): string | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

/** The user-prompt ground-truth block. Everything the model may treat as fact. */
function buildGroundTruth(
  map: StoredMoneyMap,
  profile: ProfileRow | null,
  responses: Record<string, number> | null,
): string {
  const lines: string[] = [];

  // ── Who they are ──
  lines.push("WHO THEY ARE (use only what is present; NEVER invent or assume a missing fact):");
  const name = cleanStr(profile?.name, 60);
  const age = profile?.age && profile.age >= 18 && profile.age <= 120 ? profile.age : null;
  const occupation = cleanStr(profile?.occupation, 120);
  const rel = cleanStr(profile?.relationship_status, 40);
  const kids = cleanStr(profile?.has_children, 40);
  const more = cleanStr(profile?.more_info, 400);
  lines.push(`- Name: ${name ?? "(not given — never use a placeholder name)"}`);
  lines.push(`- Age: ${age ?? "(not given)"}`);
  lines.push(`- Occupation: ${occupation ?? "(not given)"}`);
  lines.push(`- Relationship status: ${rel ?? "(not given)"}`);
  lines.push(`- Children: ${kids ?? "(not given)"}`);
  if (more) lines.push(`- In their own words, shared at intake: "${more}"`);
  lines.push("");

  // ── The scored Map ──
  const dims = map.dims;
  const hot = new Set(map.overclocked ?? []);
  const ranked = [...CORE_ORDER].sort(
    (a, b) => (dims[b] - dims[a]) || (CORE_ORDER.indexOf(a) - CORE_ORDER.indexOf(b)),
  );
  lines.push("THEIR MONEY MAP (scored 1–6; 4.0+ = that Map is running hot / overclocked):");
  lines.push(`- Archetype: "${map.archetype}" (dominant ${map.dominant}, secondary ${map.secondary})`);
  for (const m of ranked) {
    lines.push(`- ${m} ${dims[m].toFixed(2)}${hot.has(m) ? " — RUNNING HOT" : ""} · ${MAP_MEANING[m as CoreMap]}`);
  }
  const domGap = dims[map.dominant as CoreMap] - dims[map.secondary as CoreMap];
  lines.push(`- ${map.dominant} vs ${map.secondary}: ${describeGap(domGap)} (gap ${domGap.toFixed(2)})`);
  const quiet = ranked[3] as CoreMap;
  const quietGap = dims[ranked[2] as CoreMap] - dims[quiet];
  lines.push(
    `- Quietest Map: ${quiet} at ${dims[quiet].toFixed(2)} (${quietGap >= 0.75 ? "distinctly quieter than the rest" : "only slightly behind the pack"})`,
  );
  lines.push("");

  // ── The card's canonical two lines ──
  lines.push("THE CARD'S TWO SEED LINES (founder-approved copy already shown on their archetype card — your edge and challenge sections must stay CONSISTENT with these and go far beyond them; never contradict them):");
  lines.push(`- Edge (the strength dialed right): "${map.edge}"`);
  lines.push(`- Challenge (the same strength dialed too high): "${map.leak}"`);
  lines.push("");

  // ── The Fear ──
  const leap = map.leap;
  lines.push("THE FEAR (state, not trait — how much fear is currently gating their edge; band cutoffs: Low <2.75, Moderate 2.75–3.99, High ≥4.0):");
  lines.push(`- Band: ${leap.band} (score ${Number(leap.score).toFixed(2)})`);
  lines.push(`- Fear of failure facet: ${Number(leap.failFacet).toFixed(2)} · Fear of success facet: ${Number(leap.succFacet).toFixed(2)}`);
  if (leap.tilt === "fear-of-success") {
    lines.push("- Tilt: toward FEAR OF SUCCESS — the rarer, sneakier read. It doesn't feel like fear; it feels like caution, humility, or 'being realistic'.");
  } else if (leap.tilt === "fear-of-failure") {
    lines.push("- Tilt: toward FEAR OF FAILURE — loss looms larger than the win; protecting beats reaching.");
  } else {
    lines.push("- Tilt: balanced between fear of failure and fear of success.");
  }
  lines.push("");

  // ── Their own answers as evidence ──
  if (responses) {
    const entries = Object.entries(responses)
      .map(([k, v]) => ({ index: Number(k), value: Number(v) }))
      .filter((e) => MONEY_ITEMS[e.index] && Number.isFinite(e.value));

    const agrees = entries.filter((e) => e.value >= 5).sort((a, b) => b.value - a.value).slice(0, 5);
    const disagrees = entries.filter((e) => e.value <= 2).sort((a, b) => a.value - b.value).slice(0, 3);

    if (agrees.length > 0) {
      lines.push("WHAT THEY ENDORSED HARDEST (their own answers — the strongest 'wow, they get me' material; reference at most three, woven in naturally):");
      for (const e of agrees) {
        const item = MONEY_ITEMS[e.index];
        lines.push(`- [${item.map}] "${item.text}" → ${SCALE_LABELS[e.value - 1]}`);
      }
      lines.push("");
    }
    if (disagrees.length > 0) {
      lines.push("WHAT THEY CLEARLY REJECTED (equally telling — what they are NOT):");
      for (const e of disagrees) {
        const item = MONEY_ITEMS[e.index];
        lines.push(`- [${item.map}] "${item.text}" → ${SCALE_LABELS[e.value - 1]}`);
      }
      lines.push("");
    }
  }

  // ── Metaphor world ──
  const world = METAPHOR_WORLDS[map.archetype];
  if (world) {
    lines.push(`GOVERNING METAPHOR WORLD for "${map.archetype}": ${world}.`);
    lines.push("Draw every metaphor in the report from this one world. Use it in section headlines, in the pull-quote, in scenes. Never introduce a second metaphor system.");
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// The prompt
// ─────────────────────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are the profile writer for Money Maps™ — you write the sharpest money-psychology read the reader has ever had done on them. The register: a performance psychologist who has watched them operate for a year, writing the private debrief they'd pay serious money for. Second person, present tense, unhurried confidence.

WHO YOU ARE WRITING FOR: one specific, intelligent, self-aware adult who is allergic to horoscope flattery and can smell a mail merge from the first sentence. The bar for EVERY sentence: it could not appear in a stranger's report. If a line would be true of most people, cut it and write the one that is only true of them.

WHAT MAKES THIS REPORT LAND (in priority order):

1. RECOGNITION BEFORE EXPLANATION. The "how did it know that" feeling comes from naming a specific, private behavior BEFORE naming any concept. Open scenes mid-behavior: the balance checked again though nothing changed; the quote typed, lowered, then defended. Let them see themselves first; explain second.

2. EVIDENCE OVER ASSERTION. You hold their exact answers. Build claims from them: "You didn't hesitate on this one." When you reference an answer, use only the ANSWER EVIDENCE provided — never invent an answer, a number, or a life fact they didn't give. Weave at most three answers in; quoting all of them back reads as a printout, not a mind-reader.

3. THE EDGE IS REAL. Their edge section is not a compliment sandwich — argue FOR their wiring like a proud corner-man who has seen it win. Name the specific advantages this exact configuration produces, the situations where they are the strongest person in the room. They should feel scouted, not consoled.

4. THE CHALLENGE IS THE SAME WIRING, OVERCLOCKED. Never a flaw, never a wound, never "self-sabotage" as an identity. It is the bill for the strength: "your caution is a superpower, slightly overclocked" is the register. Name the cost with respect and precision. No shame anywhere in the report — shame closes the tab; recognition gets screenshotted.

5. THE FEAR IS THE OPEN LOOP. The Fear section is where the report admits what a report cannot do: a score can see the pattern, but only a conversation can work it. Name the fear precisely (fear of success feels like caution, not fear — say so when it's theirs), then leave the tension genuinely unresolved and point it at their coach. Do not resolve it with advice.

6. ONE METAPHOR WORLD. A governing metaphor world is provided for their archetype. Every metaphor in the report — headlines, scenes, the pull-quote — comes from that single world. One sustained world reads as authored; mixed metaphors read as generated.

PERSONALIZATION (weave, never recite):
- Age → life-stage stakes (the compounding decade, the providing years, the stretch where "later" starts needing a date). Only if given.
- Occupation → set scenes inside THEIR working world: their kind of invoice, their kind of client, their kind of Sunday-night dread. Only if given. If absent, write scenes in a neutral working life without naming a profession.
- Relationship / children → who else lives inside their money decisions; what "enough" has to cover besides them. Only if given.
- Name → at most twice in the whole report, at moments of weight. Overuse reads as mail merge. If no name is given, never use a placeholder.
- Never assume gender roles, income level, wealth, debt, or any fact not in the ground truth. Write around gaps; never fill them.

TERMINOLOGY (exact, non-negotiable):
- The four Maps: GUARD, DRIVE, MIRROR, SHADOW — capitalize when naming them; use each at most a few times, as proper nouns.
- "the Challenge" — the cost of the overclocked strength. NEVER the word "leak".
- "the Fear" — the fifth measure, a state, not a trait. NEVER "the Leap" or "LEAP".
- "running hot" — a Map at or past its useful ceiling. Never "disorder", "dysfunction", "pathology".

HARD SAFETY LINES (violating any of these fails the report):
- Coaching and education on the PSYCHOLOGY of money only. No financial, investment, securities, tax, or accounting advice; never tell them what to do with money, name products, or suggest allocations.
- Never promise wealth, income, or any financial outcome. What changes is clarity, control, pricing power, the end of "never enough" — process and felt change only.
- No diagnosis, no therapy language, no clinical labels, no trauma framing. Patterns, not pathologies.
- The coach they'll meet is an AI coach — never call it a therapist, advisor, or human.

WRITING RULES (house style — every one is enforced):
- Do not use em dashes. Separate clauses with commas, colons, semicolons, parentheses, or full stops.
- Never expose raw scores or decimals in prose. Say "your loudest Map", "well past the line where it runs hot", "barely registers". The charts carry the numbers.
- Vary sentence openings; never start consecutive sentences with "You" or "Your". Vary sentence length: short declaratives for weight, longer builds for texture.
- Concrete over abstract, always. "The invoice you rounded down" beats "undervaluing your services".
- Short paragraphs, 2 to 4 sentences. No bullet lists, no headings, no markdown inside prose fields.
- Banned words and moves: "journey", "unlock", "empower", "delve", "tapestry", "testament", "navigate" (metaphorically), "it's important to note", "remember,", rhetorical questions as filler, and any sentence that begins "As a" followed by their occupation.
- Section headlines: 3 to 8 words, in the metaphor world where natural, no colons, sentence case, no generic labels ("Your Strengths" is dead; "The moat is working. That's the problem." is alive — that register).

THE PULL-QUOTE: one line, 18 words or fewer, that they would screenshot and send to someone who knows them. An identity claim, slightly dangerous, unmistakably theirs. No numbers, no Map names, no jargon. It should sting a little and flatter a little at the same time.

THE COACH HANDOFF: the last section earns the next click. One short paragraph that says, plainly: this report can name the pattern, and the pattern will out-argue a report; their coach starts where this page stops, already knowing everything in it. Then exactly three first_questions, phrased in the FIRST PERSON as the reader would ask their coach ("Why do I…", "What would it take for me to…"), each one specific to THEIR data, each one a question they have almost certainly asked themselves in private. No generic questions.

OUTPUT: Return ONLY a JSON object, exactly this shape (no extra keys, no markdown):
{
  "cold_open": "60–90 words. The mirror. A specific scene or behavioral read of THEM, mid-pattern, before any concept or Map name appears. No greeting, no 'welcome to your report'.",
  "archetype": { "headline": "3–8 words", "body": ["2 paragraphs, 170–240 words total: what their archetype actually is as an operating system, how their dominant and secondary Maps combine into it, why it was probably installed early and cheaply, held as a hypothesis to check, not a verdict"] },
  "edge": { "headline": "3–8 words", "body": ["2 paragraphs, 150–220 words total: the case FOR their wiring, argued with specifics"], "strengths": [{ "label": "2–4 word name", "line": "one sentence grounding it in their data or working world" }, { }, { }] },
  "challenge": { "headline": "3–8 words", "body": ["2 paragraphs, 150–220 words total: the same wiring overclocked, the bill it runs, with respect and zero shame"], "tells": ["3–4 items; each one sentence, present tense, a recognizable moment they will have lived this month — the register of 'You know your rate is low. You quote it anyway.'"] },
  "quiet_map": { "headline": "3–8 words", "body": ["1 paragraph, 70–110 words: what their QUIETEST Map says about them — the noise they don't have, the cost or blind spot of its silence"] },
  "fear": { "headline": "3–8 words", "body": ["2–3 paragraphs, 170–240 words total: name the band and tilt in plain language (never the score), what it protects, what it costs, ending on the open loop pointed at the coach — unresolved on purpose"] },
  "in_the_wild": { "headline": "3–8 words", "scenes": [{ "setting": "2–5 words, a moment in their real week", "moment": "40–70 words, second person, present tense: the pattern firing in that moment, written so precisely it feels surveilled (kindly)" }, { }, { }] },
  "dialed_right": { "headline": "3–8 words", "body": ["1–2 paragraphs, 120–180 words total: what the SAME wiring looks like dialed right — not a different person, the same person with the governor set on purpose; felt change only, no outcome promises"], "shifts": [{ "from": "short phrase, the overclocked setting", "to": "short phrase, the dialed-right setting" }, { }, { }] },
  "coach_handoff": { "body": ["1 short paragraph, 60–100 words"], "first_questions": ["3 first-person questions, each ≤ 20 words"] },
  "pull_quote": "≤ 18 words"
}`;
}

function buildUserPrompt(groundTruth: string): string {
  return `Here is the ground truth for this reader. Everything below is fact; nothing outside it may be treated as fact.

${groundTruth}

Write their Money Maps™ report now. Every sentence specific to THIS person. Return only the JSON object.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation (structure only — loud, listable failures for the repair retry)
// ─────────────────────────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
type J = Record<string, any>;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isStringArray(v: unknown, min: number, max: number): boolean {
  return Array.isArray(v) && v.length >= min && v.length <= max && v.every(isNonEmptyString);
}

/** Returns a list of problems; empty = valid. */
function validateNarrative(n: J): string[] {
  const problems: string[] = [];
  const need = (cond: boolean, msg: string) => { if (!cond) problems.push(msg); };

  need(isNonEmptyString(n.cold_open), "cold_open must be a non-empty string");
  need(isNonEmptyString(n.pull_quote), "pull_quote must be a non-empty string");

  for (const key of ["archetype", "edge", "challenge", "quiet_map", "fear", "in_the_wild", "dialed_right"]) {
    need(isNonEmptyString(n[key]?.headline), `${key}.headline must be a non-empty string`);
  }
  need(isStringArray(n.archetype?.body, 1, 3), "archetype.body must be 1–3 paragraphs");
  need(isStringArray(n.edge?.body, 1, 3), "edge.body must be 1–3 paragraphs");
  need(
    Array.isArray(n.edge?.strengths) && n.edge.strengths.length === 3 &&
      n.edge.strengths.every((s: J) => isNonEmptyString(s?.label) && isNonEmptyString(s?.line)),
    "edge.strengths must be exactly 3 {label, line} items",
  );
  need(isStringArray(n.challenge?.body, 1, 3), "challenge.body must be 1–3 paragraphs");
  need(isStringArray(n.challenge?.tells, 3, 4), "challenge.tells must be 3–4 one-sentence items");
  need(isStringArray(n.quiet_map?.body, 1, 2), "quiet_map.body must be 1–2 paragraphs");
  need(isStringArray(n.fear?.body, 1, 3), "fear.body must be 1–3 paragraphs");
  need(
    Array.isArray(n.in_the_wild?.scenes) && n.in_the_wild.scenes.length === 3 &&
      n.in_the_wild.scenes.every((s: J) => isNonEmptyString(s?.setting) && isNonEmptyString(s?.moment)),
    "in_the_wild.scenes must be exactly 3 {setting, moment} items",
  );
  need(isStringArray(n.dialed_right?.body, 1, 2), "dialed_right.body must be 1–2 paragraphs");
  need(
    Array.isArray(n.dialed_right?.shifts) && n.dialed_right.shifts.length === 3 &&
      n.dialed_right.shifts.every((s: J) => isNonEmptyString(s?.from) && isNonEmptyString(s?.to)),
    "dialed_right.shifts must be exactly 3 {from, to} items",
  );
  need(isStringArray(n.coach_handoff?.body, 1, 2), "coach_handoff.body must be 1–2 paragraphs");
  need(isStringArray(n.coach_handoff?.first_questions, 3, 3), "coach_handoff.first_questions must be exactly 3 questions");

  return problems;
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM callers
// ─────────────────────────────────────────────────────────────────────────────

interface LlmJsonResult {
  json: J;
  usage: { input_tokens: number; output_tokens: number };
  model: string;
  isOpenAI: boolean;
}

async function callClaudeNarrative(system: string, user: string): Promise<LlmJsonResult> {
  const r = await withRetry(
    () => callClaudeJson({ system, user, maxTokens: MAX_TOKENS, temperature: 0.8, timeoutMs: CLAUDE_TIMEOUT_MS }),
    { maxRetries: 1, baseDelay: 2000, functionName: "money-generate-report/claude", shouldRetry: isRetryableError },
  );
  return { ...r, isOpenAI: false };
}

async function callOpenAINarrative(system: string, user: string): Promise<LlmJsonResult> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not set — no fallback available");

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: MAX_TOKENS,
      response_format: { type: "json_object" },
      temperature: 0.8,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI error (${response.status}): ${errorBody.slice(0, 200)}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");
  return {
    json: JSON.parse(content),
    usage: {
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
    },
    model: data.model ?? OPENAI_MODEL,
    isOpenAI: true,
  };
}

/**
 * Generate + validate with a repair pass: primary attempt → if the structure
 * fails validation, one retry carrying the exact problems → next caller.
 * Usage from EVERY attempt is recorded (failed attempts still bill).
 */
async function generateValidated(
  system: string,
  user: string,
  recordUsage: (r: LlmJsonResult) => void,
): Promise<{ narrative: J; model: string }> {
  const callers: Array<(s: string, u: string) => Promise<LlmJsonResult>> = [
    callClaudeNarrative,
    callOpenAINarrative,
  ];

  let lastProblems: string[] = [];
  for (const call of callers) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let result: LlmJsonResult;
      try {
        const repairSuffix = attempt === 0
          ? ""
          : `\n\nYour previous attempt failed structural validation:\n- ${lastProblems.join("\n- ")}\nEmit the complete corrected JSON object, same content quality, exact schema.`;
        result = await call(system, user + repairSuffix);
      } catch (err) {
        console.warn(`[money-generate-report] caller failed: ${(err as Error).message}`);
        break; // this caller is down — move to the next caller, not another attempt
      }
      recordUsage(result);
      const problems = validateNarrative(result.json);
      if (problems.length === 0) return { narrative: result.json, model: result.model };
      lastProblems = problems;
      console.warn(`[money-generate-report] validation failed (${result.model}): ${problems.join("; ")}`);
    }
  }
  throw new Error(`Narrative failed validation on all models: ${lastProblems.join("; ")}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const headers = getCorsHeaders(req);

  try {
    if (req.method === "GET") {
      return jsonResponse({ status: "ok", function: "money-generate-report", version: NARRATIVE_VERSION }, 200, headers);
    }
    if (req.method !== "POST") {
      return errorResponse("METHOD_NOT_ALLOWED", "POST only", 405, headers);
    }

    const body = await req.json();
    const reportId = body?.report_id;
    if (!isNonEmptyString(reportId)) {
      return errorResponse("INVALID_INPUT", "report_id required", 400, headers);
    }

    const userClient = createSupabaseClientWithAuth(req);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401, headers);
    }

    const serviceClient = createSupabaseClient();
    const { data: report, error: reportError } = await serviceClient
      .from("assessment_reports")
      .select("id, assessment_id, user_id, program, sections, generation_model")
      .eq("id", reportId)
      .single();

    if (reportError || !report) {
      return errorResponse("NOT_FOUND", "Report not found", 404, headers);
    }
    if (report.user_id !== user.id) {
      return errorResponse("FORBIDDEN", "Not your report", 403, headers);
    }

    const sections = (report.sections ?? {}) as J;
    const moneyMap = sections["money_map"] as StoredMoneyMap | undefined;
    if (!moneyMap?.archetype || !moneyMap?.dims || !moneyMap?.leap) {
      return errorResponse("INVALID_STATE", "Report has no money_map bundle to narrate", 400, headers);
    }

    // A stored, non-errored narrative at the current version never regenerates
    // (same idempotency contract as decoded-generate-report's guard) — the
    // trigger fires on every report view, so this guard is what keeps that free.
    const existing = sections["money_narrative"] as J | undefined;
    if (existing && !("error" in existing) && existing.version === NARRATIVE_VERSION) {
      return jsonResponse({ status: "already_complete", report_id: reportId }, 200, headers);
    }

    const responsePromise = jsonResponse({ status: "generating", report_id: reportId }, 202, headers);

    const generatePromise = generateNarrative(
      serviceClient,
      reportId,
      report.assessment_id as string,
      user.id,
      (report.program as string | null) ?? "money",
      moneyMap,
      (report.generation_model as string | null) ?? null,
    );
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(generatePromise);
    } else {
      generatePromise.catch((err) => {
        console.error("[money-generate-report] Background generation failed:", err);
      });
    }

    return responsePromise;
  } catch (error) {
    const err = error as Error;
    console.error("[money-generate-report] Unhandled error:", err.message);
    await logError("money-generate-report", err);
    return errorResponse("INTERNAL_ERROR", "Internal server error", 500, headers);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Background generation
// ─────────────────────────────────────────────────────────────────────────────

async function generateNarrative(
  supabase: ReturnType<typeof createSupabaseClient>,
  reportId: string,
  assessmentId: string,
  userId: string,
  program: string,
  moneyMap: StoredMoneyMap,
  priorGenerationModel: string | null,
): Promise<void> {
  try {
    // Profile + raw answers load in parallel; both are optional inputs — the
    // report degrades to bundle-only ground truth rather than failing.
    const [profileRes, progressRes] = await Promise.all([
      supabase
        .from("users")
        .select("name, age, gender, occupation, relationship_status, has_children, more_info")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("assessment_progress")
        .select("responses")
        .eq("assessment_id", assessmentId)
        .maybeSingle(),
    ]);

    const profile = (profileRes.data ?? null) as ProfileRow | null;
    const allResponses = progressRes.data?.responses as Record<string, Record<string, number>> | null;
    const moneyResponses = allResponses?.["money_maps"] ?? null;

    const system = buildSystemPrompt();
    const user = buildUserPrompt(buildGroundTruth(moneyMap, profile, moneyResponses));

    const usageByModel = new Map<string, { input: number; output: number; isOpenAI: boolean }>();
    const recordUsage = (r: LlmJsonResult) => {
      const entry = usageByModel.get(r.model) ?? { input: 0, output: 0, isOpenAI: r.isOpenAI };
      entry.input += r.usage.input_tokens;
      entry.output += r.usage.output_tokens;
      usageByModel.set(r.model, entry);
    };

    let stored: J;
    let modelsUsed: string;
    try {
      const { narrative, model } = await generateValidated(system, user, recordUsage);
      stored = {
        version: NARRATIVE_VERSION,
        generated_at: new Date().toISOString(),
        model,
        ...narrative,
      };
      modelsUsed = model;
    } catch (err) {
      // Store the failure marker so the UI can say so honestly; the guard treats
      // an errored narrative as regenerable on the next report view.
      console.error("[money-generate-report] generation failed:", (err as Error).message);
      await logError("money-generate-report", err as Error, userId, { report_id: reportId });
      stored = { error: (err as Error).message, failed_at: new Date().toISOString() };
      modelsUsed = "";
    }

    // Read-modify-write against the FRESH row so we never clobber money_map (or
    // anything a concurrent writer added) with the stale copy we loaded at auth.
    const { data: fresh } = await supabase
      .from("assessment_reports")
      .select("sections")
      .eq("id", reportId)
      .single();
    const sections = { ...((fresh?.sections ?? {}) as J), money_narrative: stored };

    const generationModel = modelsUsed
      ? [priorGenerationModel, modelsUsed].filter(Boolean).join("+")
      : priorGenerationModel;

    const { error: updateError } = await supabase
      .from("assessment_reports")
      .update({ sections, generation_model: generationModel })
      .eq("id", reportId);
    if (updateError) {
      console.error("[money-generate-report] save failed:", updateError.message);
    }

    const costRows = [...usageByModel.entries()].map(([model, u]) => ({
      user_id: userId,
      purpose: "money-generate-report",
      model,
      tokens_in: u.input,
      tokens_out: u.output,
      cost_usd: narrativeCost({ input_tokens: u.input, output_tokens: u.output }, u.isOpenAI),
      metadata: { report_id: reportId, program },
    }));
    if (costRows.length > 0) {
      const { error: costError } = await supabase.from("cost_tracking").insert(costRows);
      if (costError) {
        console.error("[money-generate-report] cost_tracking insert failed:", costError.message);
      }
    }

    console.log(
      `[money-generate-report] ${"error" in stored ? "FAILED" : "complete"} for report=${reportId} model=${modelsUsed || "n/a"}`,
    );
  } catch (err) {
    console.error("[money-generate-report] unhandled background error:", (err as Error).message);
    await logError("money-generate-report", err as Error, userId, { report_id: reportId });
  }
}
