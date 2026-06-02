/**
 * Edge Function: decoded-generate-report
 *
 * Generates a Decoded v2 report with voice-aware structured JSON sections.
 * Called fire-and-forget from generate.ts after creating the report row.
 *
 * Request body:
 *   { assessment_id: string, report_id: string }
 *
 * Flow:
 *   1. Validate auth + ownership
 *   2. Load scores from assessment_scores
 *   3. Classify voice from archetype_base → voiceId (map lookup)
 *   4. Evaluate tone modifiers from clinical instrument scores
 *   5. Generate 8 v2 sections sequentially with GPT-4o
 *   6. Progressive save after each section
 *   7. Update report with voice_profile and final sections
 *
 * Architecture: DECODED_NARRATIVE_VOICES_ARCHITECTURE.md §3.2
 * Deploy with: supabase functions deploy decoded-generate-report --no-verify-jwt
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient, createSupabaseClientWithAuth } from "../_shared/supabase.ts";
import { handleCors, getCorsHeaders } from "../_shared/cors.ts";
import { errorResponse, jsonResponse, logError, withRetry, isRetryableError } from "../_shared/errors.ts";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o";
const MAX_TOKENS_PER_SECTION = 3000;

// ─────────────────────────────────────────────────────────────────────────────
// Voice Types & Configuration (inlined — Edge Functions can't import from src/)
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
// Archetype Classifier (inlined from src/lib/decoded/archetypes/classifier.ts)
// Pure math — Euclidean distance from Big Five z-score centroids.
// ─────────────────────────────────────────────────────────────────────────────

const IPIP50_NORMS: Record<string, { mean: number; sd: number }> = {
  openness:          { mean: 35.4, sd: 6.4 },
  conscientiousness: { mean: 33.2, sd: 6.8 },
  extraversion:      { mean: 29.4, sd: 7.6 },
  agreeableness:     { mean: 35.6, sd: 6.0 },
  neuroticism:       { mean: 26.2, sd: 7.4 },
};

interface ArchetypeCentroid {
  name: string;
  vector: [number, number, number, number, number]; // [O, C, E, A, N]
  description: string;
}

const ARCHETYPE_CENTROIDS: ArchetypeCentroid[] = [
  { name: "Architect",  vector: [+1.2, +1.0, -0.8, -0.5, -0.3], description: "Systematic visionary who builds frameworks and structures" },
  { name: "Explorer",   vector: [+1.5, -0.8, +1.0,  0.0, -0.5], description: "Curiosity-driven adventurer who thrives on novelty" },
  { name: "Advocate",   vector: [+0.3, -0.3, +1.0, +1.5, -0.5], description: "People-centered champion who fights for others" },
  { name: "Sentinel",   vector: [-0.5, +1.5, -0.5, +1.0,  0.0], description: "Reliable protector who values tradition and duty" },
  { name: "Catalyst",   vector: [+1.0, -0.5, +1.5, -0.5, -0.3], description: "Energetic change-maker who disrupts the status quo" },
  { name: "Sage",       vector: [+1.5, +0.8, -1.0,  0.0, -0.8], description: "Deep thinker who seeks understanding over action" },
  { name: "Healer",     vector: [ 0.0, -0.5, -0.8, +1.5, +1.0], description: "Empathic nurturer who absorbs others' pain" },
  { name: "Commander",  vector: [-0.3, +1.2, +1.5, -0.8, -0.5], description: "Decisive leader who takes charge naturally" },
  { name: "Artist",     vector: [+1.5, -1.0, -0.5,  0.0, +1.2], description: "Sensitive creator who channels emotion into expression" },
  { name: "Diplomat",   vector: [-0.3,  0.0, +1.0, +1.2, -0.5], description: "Harmony-seeking bridge-builder in every room" },
  { name: "Maverick",   vector: [+1.2, -1.0, +1.2, -0.8,  0.0], description: "Rule-breaking innovator who trusts instinct over process" },
  { name: "Guardian",   vector: [-0.5, +1.2, -0.8,  0.0, +1.0], description: "Anxious protector who plans for every contingency" },
  { name: "Luminary",   vector: [+0.3, -0.3, +1.5, +1.0, -0.8], description: "Charismatic inspirer who lights up rooms" },
  { name: "Strategist", vector: [+1.0, +1.5, -0.5, -0.5, -0.3], description: "Long-range planner who sees three moves ahead" },
  { name: "Rebel",      vector: [+1.2, -1.0,  0.0, -1.0, +1.0], description: "Intense individualist who resists conformity" },
  { name: "Anchor",     vector: [-0.5, +1.0,  0.0, +1.2, -1.0], description: "Steady, grounding presence others rely on" },
];

interface ArchetypeClassification {
  primary: string;
  primaryDescription: string;
  secondary: string;
  isBlended: boolean;
  zScores: Record<string, number>;
}

/**
 * Classify archetype from IPIP-50 subscale scores.
 * Pure math — Euclidean distance in z-score space.
 */
function classifyArchetypeFromScores(ipipSubscales: Record<string, number>): ArchetypeClassification {
  // Compute z-scores
  const zScores: Record<string, number> = {};
  for (const [trait, norms] of Object.entries(IPIP50_NORMS)) {
    const raw = ipipSubscales[trait] ?? 0;
    zScores[trait.charAt(0).toUpperCase()] = (raw - norms.mean) / norms.sd;
  }

  // Euclidean distance to each centroid
  const userVector = [zScores["O"] ?? 0, zScores["C"] ?? 0, zScores["E"] ?? 0, zScores["A"] ?? 0, zScores["N"] ?? 0];

  const distances = ARCHETYPE_CENTROIDS.map(c => ({
    name: c.name,
    description: c.description,
    distance: Math.sqrt(
      userVector.reduce((sum, val, i) => sum + (val - c.vector[i]) ** 2, 0)
    ),
  }));

  distances.sort((a, b) => a.distance - b.distance);

  return {
    primary: distances[0].name,
    primaryDescription: distances[0].description,
    secondary: distances[1].name,
    isBlended: distances[1].distance - distances[0].distance <= 0.5,
    zScores,
  };
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Tone Modifier Prompt Blocks
// ─────────────────────────────────────────────────────────────────────────────

interface ToneModifierConfig {
  id: string;
  promptBlock: string;
  evaluate: (scores: ScoreRow[]) => boolean;
}

interface ScoreRow {
  instrument_id: string;
  total_score: number | null;
  subscale_scores: Record<string, number> | null;
  percentile_scores: Record<string, number> | null;
  interpretation: Record<string, unknown> | null;
}

const TONE_MODIFIER_CONFIGS: ToneModifierConfig[] = [
  {
    id: "compassion_boost",
    promptBlock: `MODIFIER: COMPASSION BOOST
This person is notably self-critical. Your tone must counterbalance their inner critic without being saccharine.
- Normalize difficulties: "Many people with your profile experience this..."
- Frame challenges as patterns to understand rather than flaws to fix
- When noting a low score, immediately follow with what it reveals about their values or effort
- Avoid any phrasing that could be internalized as further criticism
- Use "and" instead of "but" when transitioning to challenges`,
    evaluate: (scores: ScoreRow[]) => {
      const scs = scores.find(s => s.instrument_id === "scs" || s.instrument_id === "scs_sf");
      if (!scs) return false;
      const total = scs.total_score ?? 0;
      const selfJudgment = scs.subscale_scores?.selfJudgment ?? scs.subscale_scores?.self_judgment ?? 0;
      return total <= 2.5 || selfJudgment >= 4.0;
    },
  },
  {
    id: "anxiety_softener",
    promptBlock: `MODIFIER: ANXIETY SOFTENER
This person experiences significant anxiety. Your writing must provide ground, not amplify worry.
- Lead with what's stable and secure in their profile before noting challenges
- Avoid catastrophic framing. Instead of "this could become a problem," write "this is something to stay aware of"
- Give them specific, actionable next steps (anxious minds need handles, not open questions)
- When presenting data, contextualize: "This is common, about 1 in 4 adults experience this level"
- Pace sensitive information: one insight per paragraph, then breathing room`,
    evaluate: (scores: ScoreRow[]) => {
      const gad7 = scores.find(s => s.instrument_id === "gad7");
      if (!gad7) return false;
      const total = gad7.total_score ?? 0;
      const severity = gad7.interpretation?.severity as string | undefined;
      return total >= 10 || severity === "Moderate" || severity === "Severe";
    },
  },
  {
    id: "emotion_regulation_buffer",
    promptBlock: `MODIFIER: EMOTION REGULATION BUFFER
This person may struggle with emotional overwhelm. Structure your writing to be containing, not triggering.
- Present emotional findings in a structured, predictable format with no surprises
- Use grounding language: "Let's look at this step by step"
- When discussing emotional patterns, always include "what you can do" alongside "what's happening"
- Avoid emotional cliffhangers or dramatic reveals. Aim for steady, contained pacing
- Frame regulation challenges as skills to build rather than deficits to overcome`,
    evaluate: (scores: ScoreRow[]) => {
      const ders = scores.find(s => s.instrument_id === "ders18" || s.instrument_id === "ders16");
      if (!ders) return false;
      return (ders.total_score ?? 0) >= 52;
    },
  },
  {
    id: "attachment_sensitivity",
    promptBlock: `MODIFIER: ATTACHMENT SENSITIVITY
This person has heightened sensitivity around relationship patterns. Handle attachment content with extra care.
- When discussing attachment, emphasize that patterns are adaptive (not pathological)
- Use language of "learned response" rather than "attachment disorder"
- Validate the courage it takes to look at relationship patterns honestly
- When presenting insecure attachment data, immediately contextualize: "About 40% of adults share this pattern"
- Frame growth in terms of awareness, not overhaul. "Noticing this pattern is itself a step toward change"`,
    evaluate: (scores: ScoreRow[]) => {
      const ecr = scores.find(s => s.instrument_id === "ecr_r_short");
      if (!ecr) return false;
      const anxiety = ecr.subscale_scores?.anxiety ?? 0;
      const style = ecr.interpretation?.attachmentStyle as string | undefined;
      return anxiety >= 3.5 || style === "anxious" || style === "disorganized";
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Writing Calibration — simplified dimension rendering for Edge Functions
// ─────────────────────────────────────────────────────────────────────────────

const VOICE_DIMENSIONS: Record<VoiceId, string> = {
  intellectual: `WRITING CALIBRATION (1–10 scale):
- Sentence complexity: 8/10
- Metaphor density: 4/10
- Directness: 7/10
- Warmth: 4/10
- Pacing (spaciousness): 6/10
- Structure preference: 9/10`,

  adventurer: `WRITING CALIBRATION (1–10 scale):
- Sentence complexity: 4/10
- Metaphor density: 7/10
- Directness: 8/10
- Warmth: 5/10
- Pacing (spaciousness): 3/10
- Structure preference: 3/10`,

  connector: `WRITING CALIBRATION (1–10 scale):
- Sentence complexity: 5/10
- Metaphor density: 6/10
- Directness: 5/10
- Warmth: 9/10
- Pacing (spaciousness): 7/10
- Structure preference: 4/10`,

  steward: `WRITING CALIBRATION (1–10 scale):
- Sentence complexity: 6/10
- Metaphor density: 3/10
- Directness: 6/10
- Warmth: 6/10
- Pacing (spaciousness): 7/10
- Structure preference: 8/10`,

  challenger: `WRITING CALIBRATION (1–10 scale):
- Sentence complexity: 3/10
- Metaphor density: 5/10
- Directness: 10/10
- Warmth: 3/10
- Pacing (spaciousness): 2/10
- Structure preference: 7/10`,

  sensitive: `WRITING CALIBRATION (1–10 scale):
- Sentence complexity: 5/10
- Metaphor density: 9/10
- Directness: 3/10
- Warmth: 10/10
- Pacing (spaciousness): 9/10
- Structure preference: 2/10`,
};

// ─────────────────────────────────────────────────────────────────────────────
// V2 Section Templates (inlined from templates-v2.ts)
// ─────────────────────────────────────────────────────────────────────────────

const V2_SAFETY_RULES = `You are a senior personality coach writing a section of a premium personality report for Decoded (mastery.tv/decoded).

CRITICAL RULES:
- Never use diagnostic language ("you have", "you suffer from", "disorder", "condition")
- Frame all findings as patterns, not pathologies
- Always use growth-oriented framing ("an area for exploration", not "a problem")
- Never expose raw numerical scores in the narrative (use "above average", "notably high", etc.)
- End every section with agency: what the user CAN do, not what's wrong
- If scores indicate clinical-level distress, recommend professional support gently
- The coaching question at the end must be specific to THIS person's data, not generic

WRITING RULES (apply to every voice):
- Separate clauses with commas, colons, semicolons, or parentheses. Do not use em dashes.
- Express contrasts as progressions: "less about distance and more about freedom."
- Create emphasis with short standalone sentences rather than dramatic punctuation.
- Vary sentence openings across each paragraph. Avoid starting consecutive sentences with "You" or "Your."
- Choose specific language over vague intensifiers.
- Write in a natural, human cadence. Avoid formulaic AI patterns.`;

interface SectionTemplate {
  sectionId: string;
  title: string;
  minTier: string;
  sectionInstructions: string;
}

const V2_SECTION_TEMPLATES: SectionTemplate[] = [
  {
    sectionId: "S1",
    title: "You at a Glance",
    minTier: "free",
    sectionInstructions: `SECTION-SPECIFIC INSTRUCTIONS (S1 — You at a Glance):
This is the FIRST thing they read. It must be immediately valuable and scannable.

Return valid JSON with exactly this structure:
{
  "tldr": "One bold sentence that captures their essence",
  "summary_table": [
    { "dimension": "Core Personality", "summary": "1-line interpretation" },
    { "dimension": "Attachment Style", "summary": "1-line interpretation" },
    { "dimension": "Top Values", "summary": "1-line interpretation" },
    { "dimension": "Career Fit", "summary": "1-line interpretation" },
    { "dimension": "Emotional Pattern", "summary": "1-line interpretation" },
    { "dimension": "Current Wellbeing", "summary": "1-line interpretation" }
  ],
  "top_strengths": [
    { "label": "Named Strength", "description": "One sentence explanation grounded in their data" }
  ],
  "growth_edges": [
    { "label": "Named Edge", "description": "One sentence explanation grounded in their data" }
  ],
  "coach_question": "A specific question for THIS person"
}

RULES:
- summary_table must have exactly 6 rows, one per dimension
- Each summary must be ONE concise sentence (max 25 words), deeply personalized
- top_strengths: exactly 3 items. Each label should be a memorable 2-3 word name
- growth_edges: exactly 3 items. Same naming pattern. Frame as growth opportunities, not flaws.
- Do NOT include raw scores in summaries`,
  },
  {
    sectionId: "S2",
    title: "Your Personality",
    minTier: "free",
    sectionInstructions: `SECTION-SPECIFIC INSTRUCTIONS (S2 — Your Personality):
This section covers the Big Five personality traits with per-trait cards and a signature pattern.

Return valid JSON with exactly this structure:
{
  "tldr": "One bold sentence about their personality pattern",
  "narrative": "2-3 paragraph overview of how their traits interact as a system",
  "trait_cards": [
    {
      "trait_name": "Openness",
      "percentile": 80,
      "label": "The Visionary",
      "gifts": ["Gift 1 sentence", "Gift 2 sentence"],
      "challenges": ["Challenge 1 sentence", "Challenge 2 sentence"]
    }
  ],
  "signature_pattern": {
    "name": "A Memorable Pattern Name",
    "description": "2-3 sentences explaining how 2+ traits interact to create a unique behavioral pattern"
  },
  "coach_question": "A specific question for THIS person"
}

RULES:
- trait_cards: exactly 5 items (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism)
- Each trait gets a creative 2-3 word label
- gifts and challenges: exactly 2 items each, 1 sentence per item
- percentile: use the actual percentile from the data`,
  },
  {
    sectionId: "S3",
    title: "Your Inner World",
    minTier: "free",
    sectionInstructions: `SECTION-SPECIFIC INSTRUCTIONS (S3 — Your Inner World):
This section explores the internal protective system (IFS-informed) and coping patterns.

Return valid JSON with exactly this structure:
{
  "tldr": "One bold sentence about their inner system",
  "protectors": [
    {
      "name": "The Caretaker",
      "role": "What this protector does and why it exists",
      "cost": "What it costs them when this protector runs unchecked",
      "score": 75
    }
  ],
  "vulnerability_themes": "1-2 paragraphs about what the protectors are guarding",
  "coping_style": "1 paragraph about their proactive vs reactive coping balance",
  "coach_question": "A specific question for THIS person"
}

RULES:
- protectors: 2-3 items, ordered by prominence
- role: 1-2 sentences explaining WHAT it does and WHY it developed
- cost: 1 sentence about the downside when it's overactive
- These are normal, adaptive responses, not diagnoses`,
  },
  {
    sectionId: "S4",
    title: "Your Emotions",
    minTier: "free",
    sectionInstructions: `SECTION-SPECIFIC INSTRUCTIONS (S4 — Your Emotions):
This section covers emotional regulation (DERS), self-compassion, and triggers.

Return valid JSON with exactly this structure:
{
  "tldr": "One bold sentence about their emotional pattern",
  "dimensions": [
    {
      "name": "Awareness",
      "score_label": "Above average",
      "interpretation": "1-2 sentences about what this means for them specifically"
    }
  ],
  "emotional_triggers": [
    { "label": "Trigger Name", "description": "1 sentence explaining when and why this fires" }
  ],
  "self_compassion": "1-2 paragraphs about their relationship with self-kindness",
  "coach_question": "A specific question for THIS person"
}

RULES:
- dimensions: exactly 6 items (Awareness, Clarity, Acceptance, Impulse Control, Goal-Directed Behavior, Strategy Access)
- score_label: use natural language, never raw numbers
- emotional_triggers: 2-4 items
- Frame everything in terms of capacity and growth, never deficit`,
  },
  {
    sectionId: "S5",
    title: "Your Relationships",
    minTier: "insight",
    sectionInstructions: `SECTION-SPECIFIC INSTRUCTIONS (S5 — Your Relationships):
This is the most emotionally resonant section. It covers attachment, love patterns, conflict stages, and what they need to hear.

Return valid JSON with exactly this structure:
{
  "tldr": "One bold sentence about their relationship pattern",
  "attachment_tldr": "One bold sentence summarizing their attachment style",
  "how_you_love": "2-3 paragraphs about how they form bonds, show affection, and experience intimacy",
  "how_you_fight": [
    {
      "stage_number": 1,
      "title": "Tension Builds",
      "description": "2-3 sentences describing what happens at this stage, specific to THEIR pattern"
    }
  ],
  "what_you_need_to_hear": [
    {
      "phrase": "I'm not going anywhere.",
      "why": "1-2 sentences explaining why this phrase lands for THIS person"
    }
  ],
  "coach_question": "A specific question for THIS person"
}

RULES:
- how_you_fight: exactly 5 stages
- what_you_need_to_hear: exactly 5 phrases
- This section should feel deeply personal. Generic relationship advice is unacceptable.`,
  },
  {
    sectionId: "S6",
    title: "Your Career & Motivation",
    minTier: "insight",
    sectionInstructions: `SECTION-SPECIFIC INSTRUCTIONS (S6 — Your Career & Motivation):
This section covers vocational interests, values, motivation type, and work environment fit.

Return valid JSON with exactly this structure:
{
  "tldr": "One bold sentence about their career wiring",
  "top_values": [
    { "label": "Value Name", "description": "1 sentence about why this matters to them" }
  ],
  "bottom_values": [
    { "label": "Value Name", "description": "1 sentence about why this ranks low" }
  ],
  "motivation_type": "2 paragraphs about intrinsic vs extrinsic motivation balance",
  "career_environments": [
    "Description of an ideal work environment, 1-2 sentences"
  ],
  "coach_question": "A specific question for THIS person"
}

RULES:
- top_values: exactly 3 items
- bottom_values: exactly 3 items. Frame neutrally, not as deficits.
- career_environments: 3-4 items`,
  },
  {
    sectionId: "S7",
    title: "Your Wellbeing",
    minTier: "growth",
    sectionInstructions: `SECTION-SPECIFIC INSTRUCTIONS (S7 — Your Wellbeing):
This section covers life satisfaction, wellness dimensions, and any screening flags.

Return valid JSON with exactly this structure:
{
  "tldr": "One bold sentence about their wellbeing state",
  "life_satisfaction": "1-2 paragraphs interpreting their life satisfaction and flourishing data",
  "screening_flags": [
    {
      "area": "Area Name",
      "finding": "What the data shows, framed gently",
      "recommendation": "Growth-oriented next step"
    }
  ],
  "coach_question": "A specific question for THIS person"
}

RULES:
- screening_flags: 0-4 items. Only include where data indicates a pattern worth addressing.
- Frame every flag as an observation, not a diagnosis.
- If scores indicate clinical-level distress, include professional support gently.`,
  },
  {
    sectionId: "S8",
    title: "Your Growth Map",
    minTier: "mastery",
    sectionInstructions: `SECTION-SPECIFIC INSTRUCTIONS (S8 — Your Growth Map):
This is the action section. Specific, prioritized, and personalized.

Return valid JSON with exactly this structure:
{
  "tldr": "One bold sentence about their growth path",
  "growth_edges": [
    {
      "priority": 1,
      "title": "Growth Edge Name",
      "why": "1-2 sentences explaining why this is their top priority based on data",
      "actions": [
        "Specific action 1",
        "Specific action 2",
        "Specific action 3"
      ]
    }
  ],
  "thirty_day_challenge": "A specific, achievable 30-day challenge tailored to their top growth edge",
  "coach_question": "A specific question for THIS person"
}

RULES:
- growth_edges: exactly 3 items, ordered by priority (1 = most impactful)
- actions: exactly 3 per edge. Must be concrete and doable
- This section should feel empowering. They should finish reading and feel like they CAN do this.`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const headers = getCorsHeaders(req);

  try {
    // Health check endpoint
    if (req.method === "GET") {
      return jsonResponse({ status: "ok", function: "decoded-generate-report", version: 2 }, 200, headers);
    }
    if (req.method !== "POST") {
      return errorResponse("METHOD_NOT_ALLOWED", "POST only", 405, headers);
    }

    const body = await req.json();
    const { assessment_id, report_id } = body;

    if (!assessment_id || !report_id) {
      return errorResponse("INVALID_INPUT", "assessment_id and report_id required", 400, headers);
    }

    // Auth
    const userClient = createSupabaseClientWithAuth(req);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401, headers);
    }

    const serviceClient = createSupabaseClient();

    // Verify report exists and belongs to user
    const { data: report, error: reportError } = await serviceClient
      .from("assessment_reports")
      .select("id, assessment_id, user_id, archetype_base, archetype_sublabel, archetype_tagline, report_version, sections")
      .eq("id", report_id)
      .single();

    if (reportError || !report) {
      return errorResponse("NOT_FOUND", "Report not found", 404, headers);
    }

    if (report.user_id !== user.id) {
      return errorResponse("FORBIDDEN", "Not your report", 403, headers);
    }

    // If sections already populated (8 sections = complete), return early
    const existingSections = report.sections as Record<string, unknown> | null;
    if (existingSections && Object.keys(existingSections).length >= 8) {
      return jsonResponse({ status: "already_complete", report_id }, 200, headers);
    }

    // Load scores
    const { data: scoreRows, error: scoresError } = await serviceClient
      .from("assessment_scores")
      .select("instrument_id, total_score, subscale_scores, percentile_scores, interpretation")
      .eq("assessment_id", assessment_id);

    if (scoresError || !scoreRows || scoreRows.length === 0) {
      return errorResponse("NOT_FOUND", "Assessment scores not found", 404, headers);
    }

    // Classify archetype if not already set on the report
    let archetypeName = report.archetype_base as string | null;
    let archetypeSublabel = report.archetype_sublabel as string | null;
    let archetypeTagline = report.archetype_tagline as string | null;
    let classifiedZScores: Record<string, number> = {};

    if (!archetypeName || archetypeName === "Unknown") {
      const ipip = (scoreRows as ScoreRow[]).find(s => s.instrument_id === "ipip50");
      if (ipip?.subscale_scores) {
        const classification = classifyArchetypeFromScores(ipip.subscale_scores);
        archetypeName = classification.primary;
        classifiedZScores = classification.zScores;

        // Write archetype to report immediately (UI needs it)
        await serviceClient
          .from("assessment_reports")
          .update({
            archetype_base: archetypeName,
          })
          .eq("id", report_id);

        console.log(`[decoded-generate-report] Classified archetype: ${archetypeName}`);
      } else {
        archetypeName = "Unknown";
      }
    }

    // Respond immediately with 202 — generation runs in background
    const responsePromise = jsonResponse(
      { status: "generating", report_id, archetype: archetypeName },
      202,
      headers,
    );

    // Fire-and-forget background generation
    const generatePromise = generateReport(
      serviceClient,
      report_id,
      archetypeName,
      archetypeSublabel,
      archetypeTagline,
      scoreRows as ScoreRow[],
      user.id,
      classifiedZScores,
    );

    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(generatePromise);
    } else {
      generatePromise.catch((err) => {
        console.error("[decoded-generate-report] Background generation failed:", err);
      });
    }

    return responsePromise;
  } catch (error) {
    const err = error as Error;
    console.error("[decoded-generate-report] Unhandled error:", err.message);
    await logError("decoded-generate-report", err);
    return errorResponse("INTERNAL_ERROR", "Internal server error", 500, headers);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Background Generation
// ─────────────────────────────────────────────────────────────────────────────

async function generateReport(
  supabase: ReturnType<typeof createSupabaseClient>,
  reportId: string,
  archetypeName: string,
  archetypeSublabel: string | null,
  archetypeTagline: string | null,
  scoreRows: ScoreRow[],
  userId: string,
  classifiedZScores: Record<string, number> = {},
): Promise<void> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    console.error("[decoded-generate-report] OPENAI_API_KEY not set");
    return;
  }

  // 1. Classify voice from archetype
  const voiceId: VoiceId = ARCHETYPE_VOICE_MAP[archetypeName] ?? FALLBACK_VOICE;
  console.log(`[decoded-generate-report] Voice classified: ${archetypeName} → ${voiceId}`);

  // 2. Evaluate tone modifiers
  const activeModifiers = TONE_MODIFIER_CONFIGS.filter(m => m.evaluate(scoreRows));
  const activeModifierIds = activeModifiers.map(m => m.id);
  console.log(`[decoded-generate-report] Active modifiers: ${activeModifierIds.join(", ") || "none"}`);

  // 3. Build voice block: voice prompt + modifier prompts + calibration
  const voiceBlock = buildFullVoiceBlock(voiceId, activeModifiers);

  // 4. Generate sublabel if not already set
  if (!archetypeSublabel) {
    try {
      const sublabelResult = await callOpenAI(openaiKey, 
        `You are a personality coach. Generate a creative, personal sublabel for someone classified as "The ${archetypeName}" archetype. Return JSON: { "sublabel": "The [Creative 2-3 word descriptor]", "tagline": "One short sentence about their essence" }`,
        `Archetype: ${archetypeName}\nBig Five z-scores: ${JSON.stringify(classifiedZScores)}\n\nCreate a unique, memorable sublabel that captures what makes THIS variant of the ${archetypeName} special.`
      );
      archetypeSublabel = (sublabelResult.sublabel as string) ?? null;
      archetypeTagline = (sublabelResult.tagline as string) ?? null;

      // Persist sublabel to report row
      await supabase
        .from("assessment_reports")
        .update({
          archetype_sublabel: archetypeSublabel,
          archetype_tagline: archetypeTagline,
        })
        .eq("id", reportId);

      console.log(`[decoded-generate-report] Sublabel: ${archetypeSublabel}`);
    } catch (err) {
      console.warn(`[decoded-generate-report] Sublabel generation failed, continuing:`, (err as Error).message);
      // Non-fatal — report still generates fine without sublabel
    }
  }

  // 5. Store voice_profile on report (write early so UI can display it)
  const storedVoiceProfile = {
    voiceId,
    modifiers: activeModifierIds,
    classificationInput: {
      archetype: archetypeName,
      zScores: classifiedZScores,
    },
  };

  await supabase
    .from("assessment_reports")
    .update({ voice_profile: storedVoiceProfile })
    .eq("id", reportId);

  // 6. Build context strings for prompts
  const archetypeJson = JSON.stringify({
    base: archetypeName,
    sublabel: archetypeSublabel,
    tagline: archetypeTagline,
  });

  const ipip = scoreRows.find(s => s.instrument_id === "ipip50");
  const bigFiveJson = JSON.stringify(ipip?.percentile_scores ?? ipip?.subscale_scores ?? {});
  const allScoresJson = JSON.stringify(scoreRows);

  // 7. Generate each section sequentially
  const sections: Record<string, unknown> = {};
  let completedCount = 0;

  for (const template of V2_SECTION_TEMPLATES) {
    try {
      const systemPrompt = `${V2_SAFETY_RULES}

${voiceBlock}

${template.sectionInstructions}`;

      const userPrompt = `Here is the assessment data for this person:

ARCHETYPE: ${archetypeJson}
BIG FIVE PROFILE: ${bigFiveJson}
ALL SCORES: ${allScoresJson}

Write the ${template.sectionId} "${template.title}" section.`;

      const sectionContent = await withRetry(
        () => callOpenAI(openaiKey, systemPrompt, userPrompt),
        {
          maxRetries: 2,
          baseDelay: 2000,
          functionName: `decoded-generate-report/${template.sectionId}`,
          shouldRetry: isRetryableError,
        },
      );

      sections[template.sectionId] = {
        title: template.title,
        content_markdown: JSON.stringify(sectionContent),
        coach_question: sectionContent.coach_question ?? null,
        min_tier: template.minTier,
        generated_at: new Date().toISOString(),
      };

      completedCount++;

      // Progressive save
      await supabase
        .from("assessment_reports")
        .update({
          sections,
          report_version: 2,
        })
        .eq("id", reportId);

      console.log(`[decoded-generate-report] ✅ ${template.sectionId} complete (${completedCount}/${V2_SECTION_TEMPLATES.length})`);
    } catch (error) {
      const err = error as Error;
      console.error(`[decoded-generate-report] ❌ ${template.sectionId} failed:`, err.message);
      await logError("decoded-generate-report", err, userId, {
        section_id: template.sectionId,
        report_id: reportId,
      });

      // Partial failure: store error marker, continue to next section
      sections[template.sectionId] = {
        title: template.title,
        content_markdown: "_This section could not be generated. Please try again._",
        coach_question: null,
        min_tier: template.minTier,
        error: err.message,
      };
      completedCount++;
    }
  }

  // Final save
  await supabase
    .from("assessment_reports")
    .update({
      sections,
      report_version: 2,
    })
    .eq("id", reportId);

  console.log(
    `[decoded-generate-report] Complete: ${completedCount}/${V2_SECTION_TEMPLATES.length} sections for report=${reportId}, voice=${voiceId}`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the full voice block for injection into system prompts.
 * Combines: voice prompt + active modifier prompts + calibration dimensions.
 */
function buildFullVoiceBlock(
  voiceId: VoiceId,
  activeModifiers: ToneModifierConfig[],
): string {
  const parts: string[] = [];

  // Voice identity block
  parts.push(VOICE_PROMPT_BLOCKS[voiceId]);

  // Active modifier blocks
  for (const modifier of activeModifiers) {
    parts.push(modifier.promptBlock);
  }

  // Writing calibration dimensions
  parts.push(VOICE_DIMENSIONS[voiceId]);

  return parts.join("\n\n");
}

/**
 * Call OpenAI GPT-4o with JSON response format.
 */
async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: MAX_TOKENS_PER_SECTION,
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(60000), // 60s per section
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  return JSON.parse(content);
}
