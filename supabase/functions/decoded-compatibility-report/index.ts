/**
 * Edge Function: decoded-compatibility-report
 *
 * Generates per-user compatibility reports written in each person's narrative voice.
 * Follows the same architecture as decoded-generate-report:
 *   auth → data load → OpenAI (Claude Sonnet fallback) → save.
 *
 * Request body:
 *   { invite_id: string, force_regenerate?: boolean }
 *
 * Flow:
 *   1. Validate auth + invite membership
 *   2. Return cached report if available
 *   3. Verify consent (status = consented|connected)
 *   4. Load both users' assessment reports via service-role
 *   5. Resolve narrative voices from archetypes
 *   6. Generate TWO reports in parallel (one per user, each in their voice)
 *   7. Save both to decoded_invites, update status to 'connected'
 *   8. Return the caller's personalized report
 *
 * Deploy with: supabase functions deploy decoded-compatibility-report --no-verify-jwt
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient, createSupabaseClientWithAuth } from "../_shared/supabase.ts";
import { handleCors, getCorsHeaders } from "../_shared/cors.ts";
import { errorResponse, jsonResponse, logError, withRetry, isRetryableError } from "../_shared/errors.ts";
import { callClaudeJson } from "../_shared/anthropic.ts";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o";
// The couples report is long-form (several thousand tokens); the Claude
// fallback needs an explicit output budget (OpenAI defaults to the model max).
const CLAUDE_MAX_TOKENS = 8192;

/**
 * Cost per call, following the shared calculateCost(usage, isFallback)
 * convention (isFallback=true = Claude Sonnet rates). Local because the
 * shared helper prices the coach's gpt-4o-mini primary; reports run gpt-4o.
 * gpt-4o: $2.50/$10 per MTok. Claude Sonnet: $3/$15 per MTok.
 */
function calculateReportCost(
  usage: { input_tokens: number; output_tokens: number },
  isFallback: boolean,
): number {
  if (isFallback) {
    return (usage.input_tokens / 1_000_000) * 3 + (usage.output_tokens / 1_000_000) * 15;
  }
  return (usage.input_tokens / 1_000_000) * 2.5 + (usage.output_tokens / 1_000_000) * 10;
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice Configuration (mirrors decoded-generate-report/index.ts)
// Edge Functions can't import from src/ — must inline.
// ─────────────────────────────────────────────────────────────────────────────

type VoiceId = "intellectual" | "adventurer" | "connector" | "steward" | "challenger" | "sensitive";

/**
 * Archetype → Voice mapping (mirrors src/lib/decoded/report/voice/config.ts)
 * 16 archetypes → 6 voices. ADR-02: Simple map lookup.
 */
const ARCHETYPE_VOICE_MAP: Record<string, VoiceId> = {
  Architect: "intellectual",
  Sage: "intellectual",
  Strategist: "intellectual",
  Explorer: "adventurer",
  Catalyst: "adventurer",
  Maverick: "adventurer",
  Rebel: "adventurer",
  Advocate: "connector",
  Diplomat: "connector",
  Luminary: "connector",
  Sentinel: "steward",
  Guardian: "steward",
  Anchor: "steward",
  Commander: "challenger",
  Healer: "sensitive",
  Artist: "sensitive",
};

const FALLBACK_VOICE: VoiceId = "connector";

// ─────────────────────────────────────────────────────────────────────────────
// Voice Prompt Blocks (mirrors VOICE_PROFILES[id].promptBlock from config.ts)
// ─────────────────────────────────────────────────────────────────────────────

const VOICE_PROMPT_BLOCKS: Record<VoiceId, string> = {
  intellectual: `VOICE & TONE: THE INTELLECTUAL
You are writing for someone who thinks in systems, patterns, and frameworks. They value precision over platitudes and insight over encouragement.

WRITING STYLE:
- Use complex, multi-clause sentences that show how ideas connect
- Lead with the insight, then provide evidence. Do not bury the point
- Use frameworks and models when they illuminate (e.g., "This creates a feedback loop between...")
- Be assertive and clear. Avoid hedging language: "might," "perhaps," "it seems"
- Structure matters: use logical progression, cause to effect, pattern to implication
- Occasional metaphors are fine, but only if they sharpen understanding. Never for decoration
- Aim for "respected colleague sharing a research finding": intellectually generous, not emotionally effusive

TONE ANCHORS:
- Professional respect rather than clinical distance
- Curiosity about their complexity rather than judgment of their contradictions
- Insight that makes them stop and think rather than feel-good affirmations`,

  adventurer: `VOICE & TONE: THE ADVENTURER
You are writing for someone who lives in motion. They get bored with theory and crave insight they can act on immediately. They respect honesty more than comfort.

WRITING STYLE:
- Short, punchy sentences. Momentum over explanation
- Use vivid metaphors and concrete imagery. Make abstract traits feel tangible
- Be bold and direct. They respect confrontation more than diplomacy
- Challenge them. Point out contradictions, dare them to act
- Use action verbs: "You charge into...", "You resist...", "You break through..."
- Vary rhythm: short declarative sentences followed by one longer one for emphasis
- Aim for "trail guide who's done this route before": confident, energetic, no hand-holding

TONE ANCHORS:
- Respect their independence. Never condescending
- Energy that matches theirs, not clinical or detached
- Challenge that says "you can handle the truth"`,

  connector: `VOICE & TONE: THE CONNECTOR
You are writing for someone who understands the world through relationships. They process insight through "how does this affect the people I care about?" They value being seen, not just analyzed.

WRITING STYLE:
- Write conversationally, like the first hour of a deep friendship
- Use relational metaphors: bridges, circles, conversations, rooms
- Balance honesty with gentleness. They can handle truth, but delivery matters
- Connect traits to relationships: "This shows up in how you argue, how you love, how you listen"
- Give them spacious pacing, room to feel what they're reading
- Use second person warmly: "You tend to..." not "Subjects with this profile..."
- Aim for "trusted friend who happens to be a therapist": intimate, specific, caring

TONE ANCHORS:
- Warmth that feels genuine rather than performative
- Insight that connects their inner world to their outer relationships
- Make them feel understood rather than categorized`,

  steward: `VOICE & TONE: THE STEWARD
You are writing for someone who values reliability, evidence, and clear structure. They trust data over dramatic language and want to understand exactly where they stand.

WRITING STYLE:
- Clear, well-structured sentences with no unnecessary flourishes
- Lead with evidence, then interpretation
- Be reassuring without being patronizing. They worry, so give them solid ground to stand on
- Use concrete examples over abstract metaphors
- Organize clearly: consistent patterns, logical flow, no surprises
- Acknowledge their conscientiousness. They've thought about this already
- Aim for "trusted family doctor reading lab results": competent, thorough, reassuring

TONE ANCHORS:
- Stability and groundedness in every paragraph
- Validation that their careful, structured approach is a strength
- Honest about challenges, but always with a clear path forward`,

  challenger: `VOICE & TONE: THE CHALLENGER
You are writing for someone who leads, decides, and acts. They have zero patience for vagueness and respect people who can match their intensity. Don't soften, don't hedge, don't ramble.

WRITING STYLE:
- Short, declarative sentences. Say it once. Say it well
- No hedging: replace "you might consider" with "do this"
- Use strategic metaphors: chess moves, architecture, leverage
- Point out blind spots without apologizing. They respect the mirror, even when it's unflattering
- Be action-oriented: every insight should end with an implication or a move
- Never repeat yourself. They got it the first time
- Aim for "executive coach who charges $500/hour": efficient, incisive, unapologetic

TONE ANCHORS:
- Respect their competence. Never explain the obvious
- Challenge at their level. They've heard the basics
- Treat weakness as untapped leverage rather than something to fix`,

  sensitive: `VOICE & TONE: THE SENSITIVE
You are writing for someone who experiences the world at high resolution. They feel everything: beauty, pain, nuance, contradiction. They need to feel safe before they can hear difficult truths.

WRITING STYLE:
- Spacious, flowing prose. Give them room to breathe between insights
- Rich metaphors and sensory language. They think in images and feelings
- Approach difficult findings gently. Lead with validation, then the observation
- Honor their depth: "Your sensitivity is how you access what most people miss"
- Use nature and art metaphors: "like turning a painting to see it in different light"
- Never label them as "too sensitive" or suggest they need to "toughen up"
- Aim for "poet-therapist who truly sees you": tender, specific, never dismissive

TONE ANCHORS:
- Safety first. They need to trust you before they'll open up
- Reverence for their inner world, which is rich and worthy of exploration
- Gentle honesty that honors their courage in taking this assessment`,
};

const GLOBAL_VOICE_RULES = `CRITICAL WRITING RULES (apply to every voice):
- Separate clauses with commas, colons, semicolons, or parentheses. Do not use em dashes.
- Express contrasts as progressions: "less about distance and more about freedom."
- Create emphasis with short standalone sentences rather than dramatic punctuation.
- Vary sentence openings across each paragraph. Avoid starting consecutive sentences with "You" or "Your."
- Choose specific language over vague intensifiers.
- Write in a natural, human cadence. Avoid formulaic AI patterns.`;

// ─────────────────────────────────────────────────────────────────────────────
// Relatti couples voice — ONE fixed voice for the relationship couples report,
// used for BOTH partners (replaces the 6 personality voices on the relationship
// path). Keeps the two per-person reports equal in register + depth, and keeps
// the couples report plain and warm instead of styled like a personality essay.
// The Decoded compatibility path still uses the per-reader personality voices.
// ─────────────────────────────────────────────────────────────────────────────

const RELATTI_COUPLES_VOICE = `VOICE & TONE: THE RELATTI COUPLES VOICE
Write like a warm, plain-spoken couples coach talking with one person about their relationship. Picture a trusted friend who knows the research, sitting across the kitchen table. Not a personality essay, not a clinical write-up, not a greeting card.

- Warm but honest and grounded. You understand them; you never flatter them.
- Second person and direct: "You reach out. They pull back." Not "There is a dynamic in which one partner reaches while the other withdraws."
- Show the moment, then name it, in the same register as the "It might look like this:" examples.
- Almost no metaphor. At most one plain image in a whole section, only if it sharpens the point, never for decoration.
- The relationship is the subject. Make it specific to THESE two people, never generic.`;

// ─────────────────────────────────────────────────────────────────────────────
// System Prompt Builder
// ─────────────────────────────────────────────────────────────────────────────

function buildSystemPrompt(
  readerName: string,
  otherName: string,
  voiceBlock: string,
): string {
  return `You are a personality compatibility analyst for Decoded by MasteryTV. 
You produce PUNCHY, insightful compatibility reports between two people across THREE relationship contexts.

${GLOBAL_VOICE_RULES}

${voiceBlock}

IMPORTANT PERSPECTIVE RULES:
- You are writing FOR ${readerName}. They are "you" throughout.
- ${otherName} is the other person — refer to them by name.
- "advice_for_reader" = advice directed at ${readerName} (use "you")
- "advice_for_other" = advice about how ${readerName} should understand ${otherName}
- Frame everything from ${readerName}'s perspective — what THEY should know about this relationship.
- Each field: 2-3 sentences MAX.
- No generic "communication is key" advice. Be specific to their actual profiles.
- Each context should feel DIFFERENT — what works romantically may not work at work.

Return JSON with this structure:
{
  "headline": "A one-line summary of the dynamic, framed for ${readerName} (e.g., 'Your fire meets their earth')",
  "intimate": {
    "label": "Intimate / Partnership",
    "chemistry": "What naturally clicks between you and ${otherName} as romantic partners (2-3 sentences)",
    "friction": "Where you'll clash in a relationship and why (2-3 sentences)",
    "superpower": "What makes you powerful as a couple (2 sentences)",
    "watch_out": "The pattern that could quietly erode this relationship (2 sentences)",
    "advice_for_reader": "Specific advice for you as a partner (1-2 sentences, use 'you')",
    "advice_for_other": "What you should know about how ${otherName} operates as a partner (1-2 sentences)"
  },
  "family_friendship": {
    "label": "Family / Friendship",
    "chemistry": "Why you'd naturally enjoy ${otherName}'s company as friends or family (2-3 sentences)",
    "friction": "The recurring tension point in this friendship/family dynamic (2-3 sentences)",
    "superpower": "What this friendship or family bond brings out in both of you (2 sentences)",
    "watch_out": "The habit that could create distance between you (2 sentences)",
    "advice_for_reader": "Specific advice for you as a friend/family member (1-2 sentences, use 'you')",
    "advice_for_other": "What you should know about how ${otherName} operates as a friend (1-2 sentences)"
  },
  "work": {
    "label": "Working Relationship",
    "chemistry": "Why you and ${otherName} would work well together professionally (2-3 sentences)",
    "friction": "Where professional tension will show up between you (2-3 sentences)",
    "superpower": "What you can accomplish together that neither could alone (2 sentences)",
    "watch_out": "The dynamic that could undermine your professional relationship (2 sentences)",
    "advice_for_reader": "Specific advice for you as a colleague (1-2 sentences, use 'you')",
    "advice_for_other": "What you should know about working with ${otherName} (1-2 sentences)"
  },
  "compatibility_dimensions": [
    { "dimension": "Communication", "score": 1-10, "insight": "one sentence" },
    { "dimension": "Emotional Connection", "score": 1-10, "insight": "one sentence" },
    { "dimension": "Conflict Style", "score": 1-10, "insight": "one sentence" },
    { "dimension": "Growth Alignment", "score": 1-10, "insight": "one sentence" },
    { "dimension": "Values Match", "score": 1-10, "insight": "one sentence" }
  ]
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Relationship style (attachment quadrant) — derived from ECR-R anxiety/avoidance
// Mirrors the warm naming used across Relatti (Anchored / Devoted / Independent /
// Guarded Heart). Axes are on the 1–7 ECR-R scale; ~4 is the practical midpoint.
// ─────────────────────────────────────────────────────────────────────────────

interface RelationshipStyle {
  name: string;
  needForReassurance: string; // low | moderate | high (anxiety)
  needForSpace: string; // low | moderate | high (avoidance)
  summary: string;
}

function band(v: number | null | undefined): "low" | "moderate" | "high" {
  if (v == null) return "moderate";
  if (v >= 4.5) return "high";
  if (v <= 3) return "low";
  return "moderate";
}

function deriveRelationshipStyle(
  anxiety: number | null | undefined,
  avoidance: number | null | undefined,
): RelationshipStyle {
  const a = band(anxiety);
  const v = band(avoidance);
  const highA = a === "high";
  const highV = v === "high";
  let name = "Anchored";
  let summary = "tends to feel secure reaching for closeness and giving space";
  if (highA && highV) {
    name = "The Guarded Heart";
    summary = "longs for closeness and fears it at once, so they protect themselves even when they want to draw near";
  } else if (highA && !highV) {
    name = "The Devoted";
    summary = "loves deeply and needs reassurance that the bond is safe; distance can read as danger";
  } else if (!highA && highV) {
    name = "The Independent";
    summary = "values autonomy and steadies under pressure by stepping back; closeness can feel like a loss of self";
  } else {
    name = "Anchored";
    summary = "generally trusts the bond, can ask for what they need, and offers steadiness in return";
  }
  return { name, needForReassurance: a, needForSpace: v, summary };
}

interface ProfileFacts {
  style: RelationshipStyle;
  anxiety: number | null; // ECR-R, 1–7
  avoidance: number | null; // ECR-R, 1–7
  bigFive: Record<string, number> | null;
  satisfaction: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dyad dynamic — computed DETERMINISTICALLY from the two ECR-R profiles so the
// model can't invent (or reverse) who reaches and who withdraws. The model is
// told to treat this as ground truth and never contradict it. This is what
// prevents the two per-person reports from disagreeing about who is "the steady
// one." A higher anxiety score = stronger pull to reach for reassurance; a
// higher avoidance score = stronger pull to need space.
// ─────────────────────────────────────────────────────────────────────────────

function compareAxis(
  aVal: number | null,
  bVal: number | null,
  aName: string,
  bName: string,
  axis: string,
): string {
  if (aVal == null || bVal == null) return `${axis}: not enough data to compare.`;
  const diff = aVal - bVal;
  const mag = Math.abs(diff);
  if (mag < 0.5) return `${axis}: about the same for both of you (${aName} ${aVal.toFixed(1)}, ${bName} ${bVal.toFixed(1)}).`;
  const higher = diff > 0 ? aName : bName;
  const word = mag >= 1.5 ? "notably" : "somewhat";
  return `${axis}: ${higher}'s is ${word} higher (${aName} ${aVal.toFixed(1)}, ${bName} ${bVal.toFixed(1)}).`;
}

function buildDyadDynamic(
  reader: ProfileFacts,
  other: ProfileFacts,
  readerName: string,
  otherName: string,
): string {
  const lines: string[] = [];
  lines.push(`${readerName}'s relationship style: ${reader.style.name} (need for reassurance: ${reader.style.needForReassurance}, need for space: ${reader.style.needForSpace}).`);
  lines.push(`${otherName}'s relationship style: ${other.style.name} (need for reassurance: ${other.style.needForReassurance}, need for space: ${other.style.needForSpace}).`);
  lines.push(compareAxis(reader.anxiety, other.anxiety, readerName, otherName, "Need for reassurance"));
  lines.push(compareAxis(reader.avoidance, other.avoidance, readerName, otherName, "Need for space"));

  if (reader.style.name === other.style.name) {
    lines.push(`SHARED STYLE: you both have the same relationship style (${reader.style.name}). Write this as "you're both…". You tend toward the SAME moves under stress, so neither of you is automatically the calm anchor — say that plainly and explain what sharing this style means, rather than casting one of you as the steady one and the other as the anxious one.`);
  }

  // The likely cycle, by who carries the stronger pull on each axis.
  const rA = reader.anxiety, oA = other.anxiety, rV = reader.avoidance, oV = other.avoidance;
  if (rA != null && oA != null && rV != null && oV != null) {
    const sameAnx = Math.abs(rA - oA) < 0.5;
    const sameAvo = Math.abs(rV - oV) < 0.5;
    const pursuer = rA >= oA ? readerName : otherName; // higher anxiety reaches
    const distancer = rV >= oV ? readerName : otherName; // higher avoidance withdraws
    const steadier = (rA + rV) <= (oA + oV) ? readerName : otherName; // lower overall = more anchored
    const guarded = steadier === readerName ? otherName : readerName;

    if (sameAnx && sameAvo) {
      lines.push(`LIKELY CYCLE: you respond to stress in very similar ways. The risk is that you both reach (or both pull back) at the same time, with neither of you steady enough in that moment to anchor the other. Do NOT portray one of you as calm and the other as anxious.`);
    } else if (pursuer === distancer) {
      lines.push(`LIKELY CYCLE: ${guarded} carries the stronger pull on both sides — more likely to reach for reassurance AND to need space, so ${guarded} tends to protest-then-retreat under stress. ${steadier} runs lower on both and is the more anchored, steadying presence. Be accurate about this direction: ${steadier} is the steadier one, ${guarded} is the more guarded one.`);
    } else {
      lines.push(`LIKELY CYCLE: under stress ${pursuer} tends to reach for reassurance while ${distancer} tends to need space. Left unmanaged, ${pursuer}'s reaching can increase ${distancer}'s need to withdraw, which in turn increases ${pursuer}'s anxiety — the classic pursue-withdraw loop. Keep this direction exactly; do not reverse it.`);
    }
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Relationship (Relatti) system prompt — a deep couples analysis grounded in
// Gottman, EFT (Sue Johnson), and Self-Determination Theory. Produces the brief
// intimate cards + dimensions AND a long-form, compelling "couples report."
// ─────────────────────────────────────────────────────────────────────────────

function buildRelationshipSystemPrompt(
  readerName: string,
  otherName: string,
  voiceBlock: string,
): string {
  return `You are a couples coach and relationship writer for Relatti. You write a deep, warm, specific analysis of a real relationship between two people, grounded in established relationship science. This is NOT a personality quiz result. The relationship is the subject. The reader should feel "wow, that's us" and come away understanding their partner with more compassion.

${GLOBAL_VOICE_RULES}

${voiceBlock}

GROUND YOUR ANALYSIS IN THE SCIENCE (use the ideas, never the jargon unless it helps the reader):
- Attachment / EFT (Sue Johnson): underneath conflict are attachment needs. Externalize "the cycle" (the pattern is the enemy, not the partner). Every fight is really asking: Are you there for me? Will you respond? Am I worth it? (Accessible, Responsive, Engaged). Use each person's reassurance/space needs to explain how they reach and how they protect.
- Gottman: relationships are built in small bids for connection and turning toward them. Name the Four Horsemen risks (criticism, contempt, defensiveness, stonewalling) without lecturing, and point to their antidotes. Stable couples repair faster, they are not conflict-free.
- Self-Determination Theory: people change through autonomy, competence, and relatedness, never shame. Offer choices, make steps small and winnable, frame everything as moving toward each other.

PERSPECTIVE RULES:
- You are writing FOR ${readerName}. They are "you" throughout. ${otherName} is their partner, referred to by name.
- Be specific to the ACTUAL data provided (attachment needs, Big Five, relationship satisfaction, profile summaries). No generic horoscope lines. No "communication is key."
- Never take sides or villainize ${otherName}. Hold both people with empathy. Name patterns, not blame.
- Honest about challenges, but always leave the reader believing the relationship can grow.

ACCURACY — NON-NEGOTIABLE (this is what makes the report trustworthy):
- A "RELATIONSHIP DYNAMIC (GROUND TRUTH)" block is provided in the user message. It states each person's relationship style, who has the higher need for reassurance, who has the higher need for space, and the likely cycle. Treat it as fact. Do NOT contradict it or reverse its direction.
- Derive who reaches, who withdraws, and who is the steadier/anchoring presence ONLY from that ground truth — NEVER from personality archetype, voice, or vibe. (For example, do not assume the more "empathetic" archetype is the anxious one.)
- Do NOT cast one partner as "the steady/calm one" and the other as "the anxious one" unless the ground truth's reassurance/space comparison actually shows that asymmetry. When the two of you are similar, say so ("you're both…").
- The title and headline describe the RELATIONSHIP, not a mash-up of the two personality archetype names.
- If a data point is "not available," do not invent it.

READING LEVEL & PLAIN LANGUAGE (STRICT, non-negotiable — this is what makes it land):
- Write so a 7th grader reads it easily. Aim for a Flesch-Kincaid grade of 6 to 7. Simpler always beats more sophisticated here.
- Most sentences under 14 words. One idea per sentence. Break every long, multi-clause sentence into two short ones.
- Use plain, everyday words: "fits together" not "complements", "balance each other" not "complement", "naming the pattern" not "externalizing the cycle", "work together" not "harmonize", "ups and downs" not "ebbs and flows", "closeness" not "emotional intimacy", "handle" or "work through" not "navigate".
- BANNED words and phrases, and anything like them: "complement", "complements", "harmonize", "beautifully", "perfectly", "beautiful", "dance" (as in "a dance of..."), "tapestry", "weather the storm", "ebbs and flows", "a testament to", "journey", "truly special", "flourish". They are generic filler; they read as AI, and they push the level up.
- No cheerleading or flattery. Warmth comes from being specific and from understanding them, never from praise words.
- Concrete beats abstract every time. The "It might look like this:" example fields below are the target register for the ENTIRE report. Write every paragraph that plainly, that grounded, that human.
- Do NOT reuse any example wording from these instructions (for instance the sample headline). Write every line fresh for these two people.
- Equal depth for both partners: every couples_report field that asks for "2 short paragraphs" must be EXACTLY two short paragraphs (2-3 sentences each), separated by a blank line. Do not write one paragraph, and do not write three.

ILLUSTRATIVE EXAMPLES (the *_example fields):
- For the cycle, the challenges, loving well, and repair, include ONE short, concrete everyday scene (2-4 sentences) that shows the pattern in action, grounded in YOUR actual dynamic.
- Open each with "It might look like this:" so it reads as an illustration, never an assumption about their life.
- Keep examples nearly universal. Do NOT assume the couple lives together, is married, has kids, their genders, their finances, religion, or culture. Lean on near-universal moments: a message left unanswered, going quiet after a disagreement, needing an evening alone, a plan that falls through.
- Make the scene specific and human (a real moment), but small. No melodrama.

Return JSON with EXACTLY this structure:
{
  "headline": "A warm, specific one-line portrait of the two of you, framed for ${readerName} (e.g., 'Your steadiness gives their worry a place to rest')",
  "intimate": {
    "label": "Intimate / Partnership",
    "chemistry": "What naturally clicks between you and ${otherName} (2-3 sentences, specific to the data)",
    "friction": "Where the two of you tend to clash and WHY, in attachment terms (2-3 sentences)",
    "superpower": "What you are powerful at as a couple (2 sentences)",
    "watch_out": "The quiet pattern that could erode this bond if unattended (2 sentences)",
    "advice_for_reader": "One specific, small, do-able move for you (1-2 sentences, use 'you')",
    "advice_for_other": "What to understand about how ${otherName} loves and protects themselves (1-2 sentences)"
  },
  "compatibility_dimensions": [
    { "dimension": "Communication", "score": 1-10, "insight": "one sentence grounded in their data" },
    { "dimension": "Emotional Attunement", "score": 1-10, "insight": "one sentence" },
    { "dimension": "Conflict & Repair", "score": 1-10, "insight": "one sentence" },
    { "dimension": "Closeness & Space", "score": 1-10, "insight": "one sentence" },
    { "dimension": "Shared Vision", "score": 1-10, "insight": "one sentence" }
  ],
  "couples_report": {
    "title": "An evocative, warm title for the two of you together (a short phrase, not a sentence)",
    "intro": "2 short paragraphs. A vivid, specific portrait of this relationship that makes ${readerName} feel deeply seen. Set up who these two people are together. Separate paragraphs with a blank line.",
    "dynamic": "2-3 short paragraphs naming THE CYCLE between you: when stress hits, how you reach or protect (from your reassurance/space needs), how ${otherName} reaches or protects, and how those moves feed each other. Externalize the pattern as the shared challenge. This is the heart of the report.",
    "dynamic_example": "It might look like this: a short, hypothetical everyday scene (2-4 sentences) showing this cycle in motion. Near-universal, no life assumptions.",
    "empathy": "2 short paragraphs helping you genuinely understand what it is like to be ${otherName}: their inner world, what they fear, what they need to feel safe and close. Build compassion, not a fix-list.",
    "strengths": "2 short paragraphs on what the two of you build together that neither could alone. Specific and earned, not flattery.",
    "challenges": "2 short paragraphs on the real growth edges: where it gets hard and why, the Four-Horsemen risks specific to your dynamic, named with care and zero blame.",
    "challenges_example": "It might look like this: a short, hypothetical everyday scene (2-4 sentences) showing a hard moment between you. Near-universal, no life assumptions.",
    "loving_well": "2 short paragraphs of concrete, attachment-aware ways to love each other well: small bids, specific reassurance or space, turning-toward moves tuned to each person's actual needs.",
    "loving_well_example": "It might look like this: a short, hypothetical everyday scene (2-4 sentences) showing one of you turning toward the other well. Near-universal, no life assumptions.",
    "repair": "1-2 short paragraphs on how to find your way back after a rupture: your repair language, de-escalation, how to answer 'are you there for me?' for each other.",
    "repair_example": "It might look like this: a short, hypothetical everyday scene (2-4 sentences) showing a repair after a rough moment. Near-universal, no life assumptions.",
    "closing": "1 short paragraph: an honest, hopeful close that leaves you believing in the relationship and clear on the one thing that matters most."
  }
}

The couples_report is the centerpiece. Make it genuinely compelling to read, paragraphed, human, and unmistakably about THESE two people.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM Helpers (OpenAI primary with retry, Claude Sonnet fallback — same
// resilience pattern as decoded-generate-report)
// ─────────────────────────────────────────────────────────────────────────────

interface LlmJsonResult {
  json: Record<string, unknown>;
  usage: { input_tokens: number; output_tokens: number };
  model: string;
  isFallback: boolean;
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  temperature = 0.7,
): Promise<LlmJsonResult> {
  if (!apiKey) throw new Error("OpenAI API key not configured in Supabase secrets");

  const response = await withRetry(
    async () => {
      const res = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          temperature,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`OpenAI API ${res.status}: ${body}`);
      }

      return res;
    },
    {
      maxRetries: 2,
      baseDelay: 1000,
      functionName: "decoded-compatibility-report",
      shouldRetry: isRetryableError,
    },
  );

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  return {
    json: JSON.parse(content),
    usage: {
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
    },
    model: data.model ?? MODEL,
    isFallback: false,
  };
}

/**
 * OpenAI-primary, Claude-fallback. A billing lapse or OpenAI outage falls
 * through to Claude Sonnet instead of failing the report (the coach path has
 * had this since _shared/anthropic.ts; the 2026-07-16 429 took reports down).
 */
async function generateJson(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  temperature: number,
): Promise<LlmJsonResult> {
  try {
    return await callOpenAI(systemPrompt, userPrompt, apiKey, temperature);
  } catch (err) {
    console.warn(
      `[decoded-compatibility-report] OpenAI failed, falling back to Claude: ${(err as Error).message}`,
    );
  }

  const claude = await withRetry(
    () => callClaudeJson({
      system: systemPrompt,
      user: userPrompt,
      maxTokens: CLAUDE_MAX_TOKENS,
      temperature,
    }),
    {
      maxRetries: 1,
      baseDelay: 2000,
      functionName: "decoded-compatibility-report-claude",
      shouldRetry: isRetryableError,
    },
  );
  return { ...claude, isFallback: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const headers = getCorsHeaders(req);

  try {
    // Health check
    if (req.method === "GET") {
      return jsonResponse(
        { status: "ok", function: "decoded-compatibility-report", version: 1 },
        200,
        headers,
      );
    }

    if (req.method !== "POST") {
      return errorResponse("METHOD_NOT_ALLOWED", "POST only", 405, headers);
    }

    const body = await req.json();
    const { invite_id, force_regenerate, program } = body;
    const isRelationship = program === "relationship";

    if (!invite_id) {
      return errorResponse("INVALID_INPUT", "invite_id required", 400, headers);
    }

    // Auth — verify the caller is a real user
    const userClient = createSupabaseClientWithAuth(req);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401, headers);
    }

    // Service-role client bypasses RLS to read both users' data
    const admin = createSupabaseClient();

    // Load the invite
    const { data: invite, error: inviteError } = await admin
      .from("decoded_invites")
      .select("*")
      .eq("id", invite_id)
      .single();

    if (inviteError || !invite) {
      return errorResponse("NOT_FOUND", "Invite not found", 404, headers);
    }

    // Verify caller is part of this invite
    if (invite.inviter_id !== user.id && invite.recipient_id !== user.id) {
      return errorResponse("FORBIDDEN", "Not authorized for this invite", 403, headers);
    }

    // Only generate if both parties have consented
    if (invite.status !== "consented" && invite.status !== "connected") {
      return errorResponse(
        "PRECONDITION_FAILED",
        "Both users must consent before generating a compatibility report",
        400,
        headers,
      );
    }

    const isInviter = invite.inviter_id === user.id;

    // ── Return cached per-user report if available ──
    if (!force_regenerate) {
      const cachedReport = isInviter
        ? invite.compatibility_report_inviter
        : invite.compatibility_report_recipient;

      if (cachedReport) {
        console.log(`[decoded-compatibility-report] Returning cached report for ${isInviter ? "inviter" : "recipient"}`);
        return jsonResponse({ success: true, report: cachedReport, cached: true }, 200, headers);
      }

      // Fallback: legacy shared report
      if (invite.compatibility_report) {
        return jsonResponse({ success: true, report: invite.compatibility_report, cached: true }, 200, headers);
      }
    }

    // ── Load both users' assessment reports ──
    const [inviterReportResult, recipientReportResult] = await Promise.all([
      invite.inviter_report_id
        ? admin.from("assessment_reports")
            .select("sections, archetype_base, voice_profile, assessment_id")
            .eq("id", invite.inviter_report_id)
            .single()
        : null,
      invite.recipient_report_id
        ? admin.from("assessment_reports")
            .select("sections, archetype_base, voice_profile, assessment_id")
            .eq("id", invite.recipient_report_id)
            .single()
        : null,
    ]);

    if (!inviterReportResult?.data || !recipientReportResult?.data) {
      const missing = [];
      if (!invite.inviter_report_id) missing.push("inviter_report_id is null");
      if (!invite.recipient_report_id) missing.push("recipient_report_id is null");
      if (invite.inviter_report_id && !inviterReportResult?.data) missing.push("inviter report not found");
      if (invite.recipient_report_id && !recipientReportResult?.data) missing.push("recipient report not found");

      console.error(`[decoded-compatibility-report] Missing reports: ${missing.join(", ")}`);
      return errorResponse(
        "PRECONDITION_FAILED",
        `Both users must have completed reports (${missing.join(", ")})`,
        400,
        headers,
      );
    }

    // ── Extract profile data ──
    const inviterSections = inviterReportResult.data.sections as Record<string, unknown> | null;
    const recipientSections = recipientReportResult.data.sections as Record<string, unknown> | null;
    const inviterS1 = inviterSections?.S1;
    const recipientS1 = recipientSections?.S1;
    const inviterArchetype = inviterReportResult.data.archetype_base as string | null;
    const recipientArchetype = recipientReportResult.data.archetype_base as string | null;

    // ── Load the real instrument scores (relationship reports lean on these) ──
    // ECR-R attachment (anxiety/avoidance), Big Five percentiles (ipip50), and
    // relationship satisfaction (csi4) — the substance of a grounded analysis.
    const inviterAssessmentId = inviterReportResult.data.assessment_id as string | null;
    const recipientAssessmentId = recipientReportResult.data.assessment_id as string | null;

    interface ScoreRow {
      instrument_id: string;
      subscale_scores: Record<string, number> | null;
      percentile_scores: Record<string, number> | null;
      total_score: number | string | null;
    }
    async function loadScores(assessmentId: string | null): Promise<ScoreRow[]> {
      if (!assessmentId) return [];
      const { data } = await admin
        .from("assessment_scores")
        .select("instrument_id, subscale_scores, percentile_scores, total_score")
        .eq("assessment_id", assessmentId);
      return (data ?? []) as ScoreRow[];
    }
    const [inviterScores, recipientScores] = await Promise.all([
      loadScores(inviterAssessmentId),
      loadScores(recipientAssessmentId),
    ]);

    function profileFacts(scores: ScoreRow[]): ProfileFacts {
      const ecr = scores.find((s) => s.instrument_id === "ecr_r_short");
      const ipip = scores.find((s) => s.instrument_id === "ipip50");
      const csi = scores.find((s) => s.instrument_id === "csi4");
      const anxiety = ecr?.subscale_scores?.anxiety ?? null;
      const avoidance = ecr?.subscale_scores?.avoidance ?? null;
      const sat = csi?.total_score != null ? Number(csi.total_score) : null;
      return {
        style: deriveRelationshipStyle(anxiety, avoidance),
        anxiety,
        avoidance,
        bigFive: ipip?.percentile_scores && Object.keys(ipip.percentile_scores).length > 0
          ? ipip.percentile_scores
          : ipip?.subscale_scores ?? null,
        satisfaction: sat,
      };
    }
    const inviterFacts = profileFacts(inviterScores);
    const recipientFacts = profileFacts(recipientScores);

    // ── Resolve names ──
    const inviterName = invite.inviter_name || "Person A";
    const recipientName = invite.recipient_email?.split("@")[0] || "Person B";

    // ── Resolve narrative voices ──
    const inviterVoiceId = inviterArchetype
      ? (ARCHETYPE_VOICE_MAP[inviterArchetype] ?? FALLBACK_VOICE)
      : FALLBACK_VOICE;
    const recipientVoiceId = recipientArchetype
      ? (ARCHETYPE_VOICE_MAP[recipientArchetype] ?? FALLBACK_VOICE)
      : FALLBACK_VOICE;

    console.log(
      `[decoded-compatibility-report] Generating for invite ${invite_id}: ` +
      `${inviterName} (${inviterArchetype}/${inviterVoiceId}) ↔ ` +
      `${recipientName} (${recipientArchetype}/${recipientVoiceId})`,
    );

    // ── Build the data payload ──
    function personBlock(
      name: string,
      archetype: string | null,
      facts: { style: RelationshipStyle; bigFive: Record<string, number> | null; satisfaction: number | null },
      s1: unknown,
      sections: Record<string, unknown> | null,
    ): string {
      if (!isRelationship) {
        return `## ${name}
Archetype: ${archetype || "Unknown"}
Profile Summary: ${JSON.stringify(s1 || "No profile data")}`;
      }
      const bf = facts.bigFive
        ? Object.entries(facts.bigFive).map(([k, v]) => `${k} ${v}${v <= 100 ? "%ile" : ""}`).join(", ")
        : "not available";
      return `## ${name}
Relationship style: ${facts.style.name} (need for reassurance: ${facts.style.needForReassurance}, need for space: ${facts.style.needForSpace}) — ${facts.style.summary}
Big Five: ${bf}
Relationship satisfaction (CSI-4, 0-21): ${facts.satisfaction ?? "not available"}
Personality archetype: ${archetype || "Unknown"}
At-a-glance: ${JSON.stringify(s1 || "n/a")}
How they relate (relationship section): ${JSON.stringify(sections?.S5 ?? "n/a")}`;
    }

    // Authoritative, code-computed dynamic per reader — prevents the two reports
    // from disagreeing about who reaches / who is steadier (relationship only).
    const inviterDynamic = isRelationship
      ? `RELATIONSHIP DYNAMIC (GROUND TRUTH — do not contradict):\n${buildDyadDynamic(inviterFacts, recipientFacts, inviterName, recipientName)}\n\n`
      : "";
    const recipientDynamic = isRelationship
      ? `RELATIONSHIP DYNAMIC (GROUND TRUTH — do not contradict):\n${buildDyadDynamic(recipientFacts, inviterFacts, recipientName, inviterName)}\n\n`
      : "";

    const inviterDataPayload = `${inviterDynamic}${personBlock(inviterName, inviterArchetype, inviterFacts, inviterS1, inviterSections)}

${personBlock(recipientName, recipientArchetype, recipientFacts, recipientS1, recipientSections)}`;
    // Same facts, ordered with the reader first (keeps "you" grounded in their own data).
    const recipientDataPayload = `${recipientDynamic}${personBlock(recipientName, recipientArchetype, recipientFacts, recipientS1, recipientSections)}

${personBlock(inviterName, inviterArchetype, inviterFacts, inviterS1, inviterSections)}`;

    const promptFor = isRelationship ? buildRelationshipSystemPrompt : buildSystemPrompt;
    const taskWord = isRelationship ? "couples report" : "compatibility report";
    // Relationship reports bill to the Relatti OpenAI account; fall back to main.
    const apiKey =
      (isRelationship ? Deno.env.get("OPENAI_API_KEY_RELATTI") : null) ||
      Deno.env.get("OPENAI_API_KEY") ||
      "";

    // Voice block: Decoded compatibility uses the reader's personality voice; the
    // Relatti couples report uses ONE fixed plain-warm voice for BOTH partners, so
    // the two sides come out equal in depth + reading level and consistently plain
    // (the relationship is the subject, not a personality-styled essay).
    const inviterVoiceBlock = isRelationship ? RELATTI_COUPLES_VOICE : VOICE_PROMPT_BLOCKS[inviterVoiceId];
    const recipientVoiceBlock = isRelationship ? RELATTI_COUPLES_VOICE : VOICE_PROMPT_BLOCKS[recipientVoiceId];
    const voiceLine = isRelationship ? "in the Relatti couples voice" : "written in your assigned voice";

    // ── Generate both reports in parallel (OpenAI primary, Claude fallback) ──
    const [inviterCall, recipientCall] = await Promise.all([
      generateJson(
        promptFor(inviterName, recipientName, inviterVoiceBlock),
        `Generate a ${taskWord} for ${inviterName}, ${voiceLine}.\n\n${inviterDataPayload}`,
        apiKey,
        isRelationship ? 0.4 : 0.7,
      ),
      generateJson(
        promptFor(recipientName, inviterName, recipientVoiceBlock),
        `Generate a ${taskWord} for ${recipientName}, ${voiceLine}.\n\n${recipientDataPayload}`,
        apiKey,
        isRelationship ? 0.4 : 0.7,
      ),
    ]);
    const inviterCompatReport = inviterCall.json;
    const recipientCompatReport = recipientCall.json;

    // Record spend per model — a run that fell back mid-way spans two models,
    // and Claude fallback tokens bill at Claude rates.
    const usageByModel = new Map<string, { input: number; output: number; isFallback: boolean }>();
    for (const call of [inviterCall, recipientCall]) {
      const entry = usageByModel.get(call.model) ?? { input: 0, output: 0, isFallback: call.isFallback };
      entry.input += call.usage.input_tokens;
      entry.output += call.usage.output_tokens;
      usageByModel.set(call.model, entry);
    }
    const { error: costError } = await admin.from("cost_tracking").insert(
      [...usageByModel.entries()].map(([model, u]) => ({
        user_id: user.id,
        purpose: "decoded-compatibility-report",
        model,
        tokens_in: u.input,
        tokens_out: u.output,
        cost_usd: calculateReportCost({ input_tokens: u.input, output_tokens: u.output }, u.isFallback),
        // PC5.5 brand attribution: stamp the request's program ("general" =
        // the MasteryTV column, same convention as the coach/cron writers).
        metadata: { invite_id, program: program ?? "general" },
      })),
    );
    if (costError) {
      console.error("[decoded-compatibility-report] cost_tracking insert failed:", costError.message);
    }

    // ── Save both per-user reports and update status ──
    const { error: updateError } = await admin
      .from("decoded_invites")
      .update({
        compatibility_report_inviter: inviterCompatReport,
        compatibility_report_recipient: recipientCompatReport,
        // Backward compat: store inviter version as the shared report
        compatibility_report: inviterCompatReport,
        // Staleness baseline: record when this report was written so a later
        // partner retake (new assessment_report.generated_at) flags it as stale.
        compatibility_generated_at: new Date().toISOString(),
        status: "connected",
      })
      .eq("id", invite_id);

    if (updateError) {
      console.error("[decoded-compatibility-report] Failed to save:", updateError.message);
      return errorResponse("SAVE_FAILED", "Failed to save compatibility reports", 500, headers);
    }

    console.log(`[decoded-compatibility-report] ✓ Saved both reports for invite ${invite_id}`);

    // E3 dual-write: the dyad just connected + compat payload exists — sync the
    // engagement spine so its status flips to 'active' and the Blueprint artifact
    // is (re)built. Non-fatal: never block the report response on this.
    const { error: syncError } = await admin.rpc("relatti_sync_invite", { p_invite_id: invite_id });
    if (syncError) {
      console.error("[decoded-compatibility-report] spine sync failed:", syncError.message);
    }

    // Return the report for the requesting user
    const callerReport = isInviter ? inviterCompatReport : recipientCompatReport;
    return jsonResponse({ success: true, report: callerReport }, 200, headers);

  } catch (error) {
    const err = error as Error;
    console.error("[decoded-compatibility-report] Unhandled error:", err.message, err.stack);
    await logError("decoded-compatibility-report", err);
    return errorResponse("INTERNAL_ERROR", err.message, 500, headers);
  }
});
