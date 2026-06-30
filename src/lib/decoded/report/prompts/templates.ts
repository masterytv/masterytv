/**
 * Decoded Report — GPT-4o Prompt Templates
 *
 * 12 section prompt templates (RS01–RS12) that transform scored
 * assessment data into personalized personality narratives.
 *
 * Architecture:
 * - DECODED_SAFETY_RULES: Immutable clinical safety + output format rules
 * - DECODED_DEFAULT_VOICE: Legacy voice block (used when voice system is inactive)
 * - DECODED_TONE_GUIDE: Combined legacy block (safety + default voice)
 *
 * The voice system (voice-prompt-assembler.ts) replaces DECODED_DEFAULT_VOICE
 * with a personalized voice block when active.
 */

import type { ReportSectionPrompt, SectionId } from './types';
import type { VoiceContext } from '../voice/types';
import { buildVoicePromptBlock } from '../voice/voice-prompt-assembler';

// ---------------------------------------------------------------------------
// Prompt Building Blocks (split for voice system integration)
// ---------------------------------------------------------------------------

/**
 * IMMUTABLE safety rules + output format.
 * These are NEVER modified by the voice system. They protect users
 * from clinical language, ensure growth framing, and enforce JSON output.
 */
const DECODED_SAFETY_RULES = `You are a senior personality coach writing a section of a premium personality report for Decoded (mastery.tv/decoded).

CRITICAL RULES:
- Never use diagnostic language ("you have", "you suffer from", "disorder", "condition")
- Frame all findings as patterns, not pathologies
- Always use growth-oriented framing ("an area for exploration", not "a problem")
- Never expose raw numerical scores in the narrative (use "above average", "notably high", etc.)
- End every section with agency: what the user CAN do, not what's wrong
- If scores indicate clinical-level distress, recommend professional support gently
- The coaching question at the end must be specific to THIS person's data, not generic

OUTPUT FORMAT:
Return valid JSON with exactly these fields:
{
  "content_markdown": "## Section Title\\n\\n...", 
  "coach_question": "A specific, thought-provoking question for this person",
  "data_viz": null
}

The content_markdown should use markdown formatting (##, **, *, >) for structure.
Do NOT include the section title as an H2 — it's rendered separately by the UI.`;

/**
 * Default voice block used when the adaptive voice system is NOT active.
 * This is the original "brutally honest but caring" coaching tone.
 * When the voice system IS active, this is replaced by the assembled voice prompt.
 */
const DECODED_DEFAULT_VOICE = `VOICE & TONE:
- Write in second person ("You tend to…", "Your pattern shows…")
- Be direct, warm, and specific. Not clinical. Not flattering. Not vague.
- Think of this as the first session of a coaching relationship: you've just read their full file
- Surprise them with insight they haven't heard before
- Every paragraph should make them feel SEEN, not labeled`;

/**
 * Combined legacy tone guide (safety + default voice).
 * Used by the backward-compatible buildSectionPrompt() function.
 * New code should use buildSectionPromptWithVoice() instead.
 */
const DECODED_TONE_GUIDE = `${DECODED_SAFETY_RULES}\n\n${DECODED_DEFAULT_VOICE}`;

// ---------------------------------------------------------------------------
// RS01: You, Decoded — Summary Dashboard
// ---------------------------------------------------------------------------

const RS01: ReportSectionPrompt = {
  sectionId: 'RS01',
  title: 'You, Decoded',
  systemPrompt: `${DECODED_TONE_GUIDE}

SECTION-SPECIFIC INSTRUCTIONS (RS01 — Summary Dashboard):
This is the FIRST thing they read. It must be immediately compelling.
- Open with a 2-sentence hook that captures their essence (not generic)
- Include their Decoded Score with context
- Present their archetype with the sub-label
- Summarize their top 3 strengths and top 3 growth edges
- Reference at least ONE surprising cross-instrument finding
- Keep this concise — it's a dashboard, not a deep dive
- Word count: 400–600

For data_viz, return a summary_table type with their key metrics.`,
  userPromptTemplate: `Here is the assessment data for this person:

ARCHETYPE: {{archetype}}
BIG FIVE PROFILE: {{bigFive}}
SECTION DATA: {{sectionData}}

Write the RS01 "You, Decoded" summary section.`,
  requiredInstruments: ['ipip50', 'flourishing', 'swls', 'wellness_check', 'gad7', 'ecr_r_short', 'riasec', 'weims'],
  minTier: 'free',
  targetWordCount: { min: 400, max: 600 },
};

// ---------------------------------------------------------------------------
// RS02: What We Found — Cross-Instrument Insights
// ---------------------------------------------------------------------------

const RS02: ReportSectionPrompt = {
  sectionId: 'RS02',
  title: 'What We Found',
  systemPrompt: `${DECODED_TONE_GUIDE}

SECTION-SPECIFIC INSTRUCTIONS (RS02 — Cross-Instrument Insights):
This is where you show them things no single test would reveal.
- Present exactly 5 named insights (give each a short, memorable name)
- Each insight must draw from AT LEAST 2 different instruments
- One insight should be a "surprise" — something that contradicts what they might expect
- Use the pattern: insight name → what the data shows → what it means for them
- This section should make them feel like the assessment was worth it
- Word count: 600–850`,
  userPromptTemplate: `Here is the assessment data for this person:

ARCHETYPE: {{archetype}}
BIG FIVE PROFILE: {{bigFive}}
SECTION DATA: {{sectionData}}

Write the RS02 "What We Found" cross-instrument insights section with 5 named findings.`,
  requiredInstruments: ['ipip50', 'ecr_r_short', 'ders16', 'scs_sf', 'gad7', 'flourishing', 'swls', 'wellness_check', 'weims'],
  minTier: 'free',
  targetWordCount: { min: 600, max: 850 },
};

// ---------------------------------------------------------------------------
// RS03: Your Decoded Archetype
// ---------------------------------------------------------------------------

const RS03: ReportSectionPrompt = {
  sectionId: 'RS03',
  title: 'Your Decoded Archetype',
  systemPrompt: `${DECODED_TONE_GUIDE}

SECTION-SPECIFIC INSTRUCTIONS (RS03 — Archetype Narrative):
This is the identity section. Make it feel like meeting yourself.
- Open with the archetype name and sub-label as a hero statement
- Write 2–3 paragraphs of narrative prose that synthesize Big Five + attachment + RIASEC into a coherent identity story
- Include exactly 3 "named sub-themes" — pattern names derived from cross-instrument interactions (e.g., "The Loneliness Paradox," "The Perfectionism Shield," "The Unfinished Arc")
- Each sub-theme gets a short paragraph (2–3 sentences)
- If blended type: acknowledge both archetypes and what the blend means
- Reference their Holland Code and attachment style naturally in the narrative
- Word count: 700–1000

For data_viz, return a radar_chart with their Big Five percentiles.`,
  userPromptTemplate: `Here is the assessment data for this person:

ARCHETYPE: {{archetype}}
BIG FIVE PROFILE: {{bigFive}}
SECTION DATA: {{sectionData}}

Write the RS03 "Your Decoded Archetype" narrative section.`,
  requiredInstruments: ['ipip50', 'ecr_r_short', 'riasec'],
  minTier: 'free',
  targetWordCount: { min: 700, max: 1000 },
};

// ---------------------------------------------------------------------------
// RS04: The Big Five — Core Patterns
// ---------------------------------------------------------------------------

const RS04: ReportSectionPrompt = {
  sectionId: 'RS04',
  title: 'The Big Five — Your Core Patterns',
  systemPrompt: `${DECODED_TONE_GUIDE}

SECTION-SPECIFIC INSTRUCTIONS (RS04 — Big Five Patterns):
Focus on how the traits INTERACT, not just individual descriptions.
- Identify exactly 3 named cross-trait patterns (e.g., "High O + Low C = The Visionary Who Struggles to Ship")
- For each pattern: what it creates in their life (strengths AND tensions)
- Don't just repeat what each trait means — show how they combine
- Reference real-world scenarios specific to their profile
- Word count: 600–850

For data_viz, return a radar_chart with axes [Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism] and their percentile values.`,
  userPromptTemplate: `Here is the assessment data for this person:

BIG FIVE PROFILE: {{bigFive}}
SECTION DATA: {{sectionData}}

Write the RS04 "Big Five Patterns" section with 3 named cross-trait interaction patterns.`,
  requiredInstruments: ['ipip50'],
  minTier: 'free',
  targetWordCount: { min: 600, max: 850 },
};

// ---------------------------------------------------------------------------
// RS05: Trait Deep Dive
// ---------------------------------------------------------------------------

const RS05: ReportSectionPrompt = {
  sectionId: 'RS05',
  title: 'Trait Deep Dive',
  systemPrompt: `${DECODED_TONE_GUIDE}

SECTION-SPECIFIC INSTRUCTIONS (RS05 — Per-Trait Breakdown):
Go through each Big Five trait individually.
- For each trait: a "Gift" (what this level gives them) and a "Challenge" (what it costs them)
- Be specific to their level (don't write generic high/low descriptions)
- Focus on the 2–3 most extreme traits more than average ones
- Keep average traits brief ("This is close to the population average — it gives you flexibility")
- Word count: 600–850

For data_viz, return a bar_chart with labels [O, C, E, A, N] and their percentile values.`,
  userPromptTemplate: `Here is the assessment data for this person:

BIG FIVE PROFILE: {{bigFive}}
SECTION DATA: {{sectionData}}

Write the RS05 "Trait Deep Dive" section with Gift + Challenge for each of the five traits.`,
  requiredInstruments: ['ipip50'],
  minTier: 'free',
  targetWordCount: { min: 600, max: 850 },
};

// ---------------------------------------------------------------------------
// RS06: Your Attachment Map
// ---------------------------------------------------------------------------

const RS06: ReportSectionPrompt = {
  sectionId: 'RS06',
  title: 'Your Attachment Map',
  systemPrompt: `${DECODED_TONE_GUIDE}

SECTION-SPECIFIC INSTRUCTIONS (RS06 — Attachment Map):
Explain their attachment style through the lens of their daily life.
- State their attachment style clearly, then immediately humanize it
- Explain what the anxiety and avoidance dimensions mean for them specifically
- Connect attachment to their Big Five (e.g., high N + anxious attachment = specific pattern)
- Include 2–3 concrete examples of how this shows up in relationships
- End with what "earning" secure attachment looks like for their specific profile
- Word count: 500–750

For data_viz, return a quadrant_plot with their anxiety/avoidance scores.`,
  userPromptTemplate: `Here is the assessment data for this person:

ARCHETYPE: {{archetype}}
BIG FIVE PROFILE: {{bigFive}}
SECTION DATA: {{sectionData}}

Write the RS06 "Attachment Map" section.`,
  requiredInstruments: ['ecr_r_short', 'ipip50'],
  minTier: 'free',
  targetWordCount: { min: 500, max: 750 },
};

// ---------------------------------------------------------------------------
// RS07: Your Inner System
// ---------------------------------------------------------------------------

const RS07: ReportSectionPrompt = {
  sectionId: 'RS07',
  title: 'Your Inner System',
  systemPrompt: `${DECODED_TONE_GUIDE}

SECTION-SPECIFIC INSTRUCTIONS (RS07 — Inner System):
This section uses IFS-informed language to explore internal protector patterns.
- Use data from emotional regulation (DERS-16), self-compassion (SCS-SF), and neuroticism to identify 2–3 "protector" patterns
- Give each protector a name (e.g., "The Critic," "The Withdrawer," "The People-Pleaser," "The Controller")
- For each protector: what it does, what it's protecting against, and what it costs them
- Frame protectors as adaptive — they developed for good reasons
- Avoid pathologizing; these are parts of a system, not disorders
- Reference the IFS concept of "Self" energy (calm, curious, compassionate)
- Close with how coaching can help them lead from Self rather than from protectors
- Word count: 600–850

NOTE: This section is based on interpretive synthesis from multiple instruments, not a dedicated IFS scale. Be transparent about this.`,
  userPromptTemplate: `Here is the assessment data for this person:

ARCHETYPE: {{archetype}}
BIG FIVE PROFILE: {{bigFive}}
SECTION DATA: {{sectionData}}

Write the RS07 "Your Inner System" section identifying 2-3 protector patterns from the scoring data.`,
  requiredInstruments: ['ipip50', 'ders16', 'scs_sf', 'gad7'],
  minTier: 'free',
  targetWordCount: { min: 600, max: 850 },
};

// ---------------------------------------------------------------------------
// RS08: Your Emotional Landscape (LOCKED — Insight tier)
// ---------------------------------------------------------------------------

const RS08: ReportSectionPrompt = {
  sectionId: 'RS08',
  title: 'Your Emotional Landscape',
  systemPrompt: `${DECODED_TONE_GUIDE}

SECTION-SPECIFIC INSTRUCTIONS (RS08 — Emotional Landscape):
Deep dive into their emotional regulation using DERS-16 subscales.
- Cover all 5 DERS dimensions: Clarity, Goals, Impulse, Non-Acceptance, Strategies
- Identify the 2 strongest and 2 weakest dimensions
- Explain what each dimension means in practical terms (not clinical definitions)
- Connect to their Big Five neuroticism level and self-compassion patterns
- If GAD-7 is moderate-to-severe, include a gentle note about professional support
- Word count: 600–850

For data_viz, return a bar_chart with the 5 DERS subscale scores.`,
  userPromptTemplate: `Here is the assessment data for this person:

BIG FIVE PROFILE: {{bigFive}}
SECTION DATA: {{sectionData}}

Write the RS08 "Emotional Landscape" section covering all 5 DERS dimensions.`,
  requiredInstruments: ['ders16', 'ipip50', 'scs_sf'],
  minTier: 'insight',
  targetWordCount: { min: 600, max: 850 },
};

// ---------------------------------------------------------------------------
// RS09: Motivation & Vocation (LOCKED — Insight tier)
// ---------------------------------------------------------------------------

const RS09: ReportSectionPrompt = {
  sectionId: 'RS09',
  title: 'Motivation & Vocation',
  systemPrompt: `${DECODED_TONE_GUIDE}

SECTION-SPECIFIC INSTRUCTIONS (RS09 — Motivation & Vocation):
Explore what drives them using WEIMS Self-Determination Index + RIASEC Holland Code.
- Explain their motivation profile: where they fall on the self-determination continuum
- Present their Holland Code (top 3) and what it means for career/life satisfaction
- Identify gaps between their motivation type and their current patterns
- Include practical suggestions for aligning work with intrinsic motivation
- Connect to Big Five O (curiosity) and C (discipline) as supports/barriers
- Word count: 600–850

For data_viz, return a radar_chart with the 6 RIASEC dimensions.`,
  userPromptTemplate: `Here is the assessment data for this person:

ARCHETYPE: {{archetype}}
BIG FIVE PROFILE: {{bigFive}}
SECTION DATA: {{sectionData}}

Write the RS09 "Motivation & Vocation" section integrating WEIMS and RIASEC data.`,
  requiredInstruments: ['weims', 'riasec', 'ipip50'],
  minTier: 'insight',
  targetWordCount: { min: 600, max: 850 },
};

// ---------------------------------------------------------------------------
// RS10: Relationship Patterns (LOCKED — Growth tier)
// ---------------------------------------------------------------------------

const RS10: ReportSectionPrompt = {
  sectionId: 'RS10',
  title: 'Relationship Patterns',
  systemPrompt: `${DECODED_TONE_GUIDE}

SECTION-SPECIFIC INSTRUCTIONS (RS10 — Relationship Patterns):
Deep dive into how their attachment, personality, and relationship satisfaction interact.
- Connect ECR-R attachment scores to specific relationship behaviors
- Integrate CSI-4 relationship satisfaction data
- Identify their likely conflict style based on Big Five A + N + E
- Provide specific, actionable relationship insights (not generic advice)
- If CSI-4 indicates distress, acknowledge it with care and suggest couples coaching
- Word count: 600–850

For data_viz, return a quadrant_plot with attachment anxiety/avoidance.`,
  userPromptTemplate: `Here is the assessment data for this person:

ARCHETYPE: {{archetype}}
BIG FIVE PROFILE: {{bigFive}}
SECTION DATA: {{sectionData}}

Write the RS10 "Relationship Patterns" section integrating attachment, personality, and relationship satisfaction.`,
  requiredInstruments: ['ecr_r_short', 'csi4', 'ipip50'],
  minTier: 'growth',
  targetWordCount: { min: 600, max: 850 },
};

// ---------------------------------------------------------------------------
// RS11: Wellness & Life Satisfaction (LOCKED — Growth tier)
// ---------------------------------------------------------------------------

const RS11: ReportSectionPrompt = {
  sectionId: 'RS11',
  title: 'Wellness & Life Satisfaction',
  systemPrompt: `${DECODED_TONE_GUIDE}

SECTION-SPECIFIC INSTRUCTIONS (RS11 — Wellness & Life Satisfaction):
The foundation section — physical and lifestyle factors that enable or undermine everything else.
- Integrate SWLS, Flourishing Scale, and Decoded Wellness Check
- Present their 10-dimension wellness profile (exercise, sleep, nutrition, energy, stress, coping, social, purpose, screen time, vitality)
- Highlight the 2–3 strongest dimensions (celebrate) and 2–3 weakest (actionable)
- Connect wellness to their personality (e.g., low C + poor sleep → specific pattern)
- Frame this as the "operating system" that everything else runs on
- Word count: 600–850

For data_viz, return a wellness_radar with all 10 wellness dimensions (values 0-100).`,
  userPromptTemplate: `Here is the assessment data for this person:

BIG FIVE PROFILE: {{bigFive}}
SECTION DATA: {{sectionData}}

Write the RS11 "Wellness & Life Satisfaction" section with the 10-dimension wellness analysis.`,
  requiredInstruments: ['swls', 'flourishing', 'wellness_check', 'ipip50'],
  minTier: 'growth',
  targetWordCount: { min: 600, max: 850 },
};

// ---------------------------------------------------------------------------
// RS12: Your Growth Map (LOCKED — Mastery tier)
// ---------------------------------------------------------------------------

const RS12: ReportSectionPrompt = {
  sectionId: 'RS12',
  title: 'Your Growth Map',
  systemPrompt: `${DECODED_TONE_GUIDE}

SECTION-SPECIFIC INSTRUCTIONS (RS12 — Growth Map):
The final, most valuable section. This is the coaching roadmap.
- Identify exactly 3 prioritized "Growth Edges" based on the full assessment
- For each edge: a name, WHY it matters for this person specifically, and 2–3 concrete actions
- Prioritize by impact: which changes would unlock the most progress?
- Reference specific data points to justify each priority
- Close with a bridge to coaching: "If you were my client, here's where we'd start…"
- This should feel like a personalized coaching plan, not a generic self-help list
- Word count: 700–1000`,
  userPromptTemplate: `Here is the full assessment data for this person:

ARCHETYPE: {{archetype}}
BIG FIVE PROFILE: {{bigFive}}
SECTION DATA: {{sectionData}}

Write the RS12 "Your Growth Map" section with 3 prioritized growth edges and specific actions for each.`,
  requiredInstruments: ['ipip50', 'ders16', 'ecr_r_short', 'gad7', 'ace3', 'asrs'],
  minTier: 'mastery',
  targetWordCount: { min: 700, max: 1000 },
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const REPORT_PROMPTS: Record<string, ReportSectionPrompt> = {
  RS01, RS02, RS03, RS04, RS05, RS06,
  RS07, RS08, RS09, RS10, RS11, RS12,
};

/**
 * Build the final prompt messages for a given section (LEGACY).
 *
 * Uses the default tone guide (no adaptive voice).
 * Kept for backward compatibility. New code should use buildSectionPromptWithVoice().
 *
 * @returns [systemMessage, userMessage] ready for the OpenAI API
 */
export function buildSectionPrompt(
  sectionId: string,
  scoreDataJson: string,
  archetypeJson: string,
  bigFiveJson: string,
): { system: string; user: string } {
  const template = REPORT_PROMPTS[sectionId];
  if (!template) throw new Error(`Unknown section ID: ${sectionId}`);

  const userPrompt = template.userPromptTemplate
    .replace('{{archetype}}', archetypeJson)
    .replace('{{bigFive}}', bigFiveJson)
    .replace('{{sectionData}}', scoreDataJson);

  return {
    system: template.systemPrompt,
    user: userPrompt,
  };
}

/**
 * Build prompts with the adaptive voice system.
 *
 * Replaces the default voice block in the system prompt with the
 * assembled voice context (voice profile + modifiers + section overrides).
 *
 * Architecture: DECODED_NARRATIVE_VOICES_ARCHITECTURE.md §3.2
 * PRD: NVR05–NVR08
 *
 * @param sectionId  Which report section (RS01–RS12)
 * @param scoreDataJson  JSON string of section-specific score data
 * @param archetypeJson  JSON string of archetype classification
 * @param bigFiveJson  JSON string of Big Five profile
 * @param voiceContext  Assembled voice context from assembleVoicePrompt()
 * @returns [systemMessage, userMessage] with personalized voice instructions
 */
export function buildSectionPromptWithVoice(
  sectionId: string,
  scoreDataJson: string,
  archetypeJson: string,
  bigFiveJson: string,
  voiceContext: VoiceContext,
): { system: string; user: string; voiceId: string } {
  const template = REPORT_PROMPTS[sectionId];
  if (!template) throw new Error(`Unknown section ID: ${sectionId}`);

  // Build the personalized voice prompt block
  const voiceBlock = buildVoicePromptBlock(voiceContext);

  // Replace the default voice block in the system prompt with the personalized one.
  // Section prompts are built as: DECODED_TONE_GUIDE + section-specific instructions.
  // DECODED_TONE_GUIDE = DECODED_SAFETY_RULES + DECODED_DEFAULT_VOICE.
  // We replace DECODED_DEFAULT_VOICE with the voice system output.
  const voiceAwareSystemPrompt = template.systemPrompt.replace(
    DECODED_DEFAULT_VOICE,
    voiceBlock,
  );

  const userPrompt = template.userPromptTemplate
    .replace('{{archetype}}', archetypeJson)
    .replace('{{bigFive}}', bigFiveJson)
    .replace('{{sectionData}}', scoreDataJson);

  return {
    system: voiceAwareSystemPrompt,
    user: userPrompt,
    voiceId: voiceContext.voice.id,
  };
}

/** Get the ordered list of all section IDs */
export function getAllSectionIds(): SectionId[] {
  return Object.keys(REPORT_PROMPTS) as SectionId[];
}

/**
 * Exported for testing: the immutable safety rules block.
 * Voice system NEVER modifies this.
 */
export { DECODED_SAFETY_RULES };

/**
 * Exported for testing: the default voice block.
 * Used to verify string replacement works in buildSectionPromptWithVoice.
 */
export { DECODED_DEFAULT_VOICE };
