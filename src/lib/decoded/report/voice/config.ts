/**
 * Decoded Report — Adaptive Narrative Voice Configuration
 *
 * Single source of truth for all tunable parameters.
 * Validated at import time — if this module loads, config is valid.
 *
 * Architecture: DECODED_NARRATIVE_VOICES_ARCHITECTURE.md §3.2
 * PRD: DECODED_NARRATIVE_VOICES_PRD.md §4, §6
 */


import type { ArchetypeName } from '../../archetypes/types';
import { ARCHETYPE_NAMES } from '../../archetypes/types';
import type {
  VoiceId,
  VoiceProfile,
  WritingDimensions,
  ToneModifier,
  ModifierId,
  SectionVoiceOverride,
  CoachProfileSeed,
  CoachModifierDelta,
} from './types';
import { VOICE_IDS, MODIFIER_IDS } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Validation Helpers (no external dependencies — Zod not in project)
// ─────────────────────────────────────────────────────────────────────────────

const DIMENSION_KEYS: (keyof WritingDimensions)[] = [
  'sentenceStructure', 'metaphorDensity', 'directness',
  'warmth', 'pacing', 'structurePreference',
];

function validateDimensions(dims: WritingDimensions, label: string): void {
  for (const key of DIMENSION_KEYS) {
    const val = dims[key];
    if (typeof val !== 'number' || val < 1 || val > 10) {
      throw new Error(`[Voice Config] ${label}.${key} must be 1–10, got: ${val}`);
    }
  }
}

function validateProfile(profile: VoiceProfile): void {
  if (!profile.id || !profile.displayName || !profile.promptBlock) {
    throw new Error(`[Voice Config] Profile "${profile.id}" missing required fields`);
  }
  if (profile.description.length < 10) {
    throw new Error(`[Voice Config] Profile "${profile.id}" description too short`);
  }
  if (!profile.archetypes.length) {
    throw new Error(`[Voice Config] Profile "${profile.id}" has no archetypes`);
  }
  if (profile.examplePhrases.length < 3) {
    throw new Error(`[Voice Config] Profile "${profile.id}" needs ≥3 example phrases`);
  }
  validateDimensions(profile.dimensions, `Profile "${profile.id}"`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Global Voice Rules (injected into every voice prompt by the assembler)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rules applied to EVERY voice to prevent AI-sounding output.
 * Injected by buildVoicePromptBlock() before the voice-specific block.
 * Keep this list short and positively framed (LLMs struggle with negatives).
 */
export const GLOBAL_VOICE_RULES = `WRITING RULES (apply to every voice):
- Separate clauses with commas, colons, semicolons, or parentheses. Do not use em dashes.
- Express contrasts as progressions: "less about distance and more about freedom" or "closer to responsibility than clinical anxiety."
- Create emphasis with short standalone sentences rather than dramatic punctuation.
- Vary sentence openings across each paragraph. Avoid starting consecutive sentences with "You" or "Your."
- Choose specific language over vague intensifiers (replace "really" and "incredibly" with precise words).
- Write in a natural, human cadence. Avoid formulaic AI patterns like numbered lists of affirmations or bullet-point pep talks.`;

// ─────────────────────────────────────────────────────────────────────────────
// Voice Profiles — 6 base voices
// ─────────────────────────────────────────────────────────────────────────────

export const VOICE_PROFILES: Record<VoiceId, VoiceProfile> = {
  // ── THE INTELLECTUAL ──
  // Mapped from: Architect, Sage, Strategist
  // Writing style: Precise, analytical, frameworks-first
  intellectual: {
    id: 'intellectual',
    displayName: 'The Intellectual',
    description: 'Precise, analytical, and framework-driven — for minds that think in systems.',
    archetypes: ['Architect', 'Sage', 'Strategist'] as ArchetypeName[],
    dimensions: {
      sentenceStructure: 8,   // Complex, multi-clause sentences
      metaphorDensity: 4,     // Occasional — prefers precision over poetry
      directness: 7,          // Clear and assertive, not hedged
      warmth: 4,              // Professional rather than warm
      pacing: 6,              // Measured — neither rushed nor spacious
      structurePreference: 9, // Highly organized, uses headers and lists
    },
    promptBlock: `VOICE & TONE: THE INTELLECTUAL
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
    examplePhrases: [
      'Your data reveals an interesting tension: high openness paired with moderate conscientiousness creates what researchers call "structured curiosity." You want novelty, but only within frameworks you trust.',
      'This is a design choice your personality makes, not a deficit. The tradeoff is predictable: you gain depth at the cost of breadth.',
      'Notice the asymmetry here. Your avoidance scores suggest you maintain emotional independence not because you lack connection, but because you\'ve learned that self-reliance is more predictable than dependence.',
    ],
  },

  // ── THE ADVENTURER ──
  // Mapped from: Explorer, Catalyst, Maverick, Rebel
  // Writing style: Dynamic, vivid, challenge-oriented
  adventurer: {
    id: 'adventurer',
    displayName: 'The Adventurer',
    description: 'Bold, vivid, and action-oriented — for those who learn by doing.',
    archetypes: ['Explorer', 'Catalyst', 'Maverick', 'Rebel'] as ArchetypeName[],
    dimensions: {
      sentenceStructure: 4,   // Short, punchy — momentum matters
      metaphorDensity: 7,     // Rich metaphors and vivid imagery
      directness: 8,          // Bold and confrontational — no sugarcoating
      warmth: 5,              // Warm through challenge, not coddling
      pacing: 3,              // Fast — clipped, energetic
      structurePreference: 3, // Flowing narrative, fewer headers
    },
    promptBlock: `VOICE & TONE: THE ADVENTURER
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
    examplePhrases: [
      'You don\'t walk into rooms. You land in them. High extraversion plus high openness means every new environment is a playground, and you\'re already looking for the edge.',
      'Here\'s the thing about your attachment pattern: you\'re not afraid of people. You\'re afraid of standing still. The avoidance is less about distance and more about freedom.',
      'Your conscientiousness score tells a story you probably already know. Structure bores you. Plans feel like cages. But here\'s what the data shows: when you build your own structure, you outperform everyone.',
    ],
  },

  // ── THE CONNECTOR ──
  // Mapped from: Advocate, Diplomat, Luminary
  // Writing style: Warm, relational, story-driven
  connector: {
    id: 'connector',
    displayName: 'The Connector',
    description: 'Warm, relational, and story-driven — for people who think through relationships.',
    archetypes: ['Advocate', 'Diplomat', 'Luminary'] as ArchetypeName[],
    dimensions: {
      sentenceStructure: 5,   // Conversational — natural flow
      metaphorDensity: 6,     // Stories and relational metaphors
      directness: 5,          // Balanced — honest but gentle
      warmth: 9,              // High warmth — feels like a friend
      pacing: 7,              // Spacious — room to breathe and feel
      structurePreference: 4, // Narrative flow over rigid organization
    },
    promptBlock: `VOICE & TONE: THE CONNECTOR
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
    examplePhrases: [
      'You\'re the person people come to when they don\'t know what they\'re feeling yet. High agreeableness and extraversion make you a natural emotional translator. You hear what people mean, not just what they say.',
      'Your attachment pattern tells a love story. The anxiety in your scores is really the volume of your caring turned up too high. You love hard, and that means you worry hard too.',
      'Here\'s something beautiful about your profile: your openness means you\'re constantly evolving, and your warmth means you bring people along for the ride. You don\'t just grow. You grow together.',
    ],
  },

  // ── THE STEWARD ──
  // Mapped from: Sentinel, Guardian, Anchor
  // Writing style: Structured, evidence-based, reassuring
  steward: {
    id: 'steward',
    displayName: 'The Steward',
    description: 'Structured, grounded, and evidence-based — for those who value reliability and clarity.',
    archetypes: ['Sentinel', 'Guardian', 'Anchor'] as ArchetypeName[],
    dimensions: {
      sentenceStructure: 6,   // Clear, well-constructed — not flashy
      metaphorDensity: 3,     // Minimal — prefers concrete evidence
      directness: 6,          // Clear but not confrontational
      warmth: 6,              // Reassuring without being effusive
      pacing: 7,              // Deliberate — no rushing
      structurePreference: 8, // Well-organized, clear sections
    },
    promptBlock: `VOICE & TONE: THE STEWARD
You are writing for someone who values reliability, evidence, and clear structure. They trust data over dramatic language and want to understand exactly where they stand.

WRITING STYLE:
- Clear, well-structured sentences with no unnecessary flourishes
- Lead with evidence, then interpretation: "Your score of 38 places you in the 72nd percentile, which means..."
- Be reassuring without being patronizing. They worry, so give them solid ground to stand on
- Use concrete examples over abstract metaphors
- Organize clearly: consistent patterns, logical flow, no surprises
- Acknowledge their conscientiousness. They've thought about this already
- Aim for "trusted family doctor reading lab results": competent, thorough, reassuring

TONE ANCHORS:
- Stability and groundedness in every paragraph
- Validation that their careful, structured approach is a strength
- Honest about challenges, but always with a clear path forward`,
    examplePhrases: [
      'Your conscientiousness score of 42 places you well above the population mean (33.2). In practical terms, the systems and routines you\'ve built are more than habits. They\'re a core expression of who you are.',
      'Let\'s look at what the data actually shows. Your neuroticism is moderate (28th percentile), not elevated. The vigilance you feel is closer to responsibility than clinical anxiety. You notice risks because you take your commitments seriously.',
      'Your attachment profile shows a secure base with slightly elevated anxiety. In relationships, this likely shows up as reliability with occasional over-checking. The good news: this pattern responds well to awareness alone, and simply knowing the pattern often softens it.',
    ],
  },

  // ── THE CHALLENGER ──
  // Mapped from: Commander
  // Writing style: Direct, confrontational, action-focused
  challenger: {
    id: 'challenger',
    displayName: 'The Challenger',
    description: 'Direct, confrontational, and action-focused — for those who respect blunt honesty.',
    archetypes: ['Commander'] as ArchetypeName[],
    dimensions: {
      sentenceStructure: 3,   // Short, declarative — no filler
      metaphorDensity: 5,     // Strategic metaphors (war, chess, building)
      directness: 10,         // Maximum — no hedging, no softening
      warmth: 3,              // Respect, not warmth
      pacing: 2,              // Fast and dense — no wasted words
      structurePreference: 7, // Organized but not rigid
    },
    promptBlock: `VOICE & TONE: THE CHALLENGER
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
    examplePhrases: [
      'You scored 45 on conscientiousness. Top 95th percentile. This is your operating system, not just discipline. The risk: you\'ve optimized so hard that flexibility feels like failure.',
      'Your agreeableness is low. Good. It means you make decisions on data, not approval. The cost: people don\'t always tell you the truth because your directness makes them defensive. That\'s a blind spot, and it\'s costing you information.',
      'Bottom line: your personality is built for leadership. High extraversion, high conscientiousness, low neuroticism. The gap is empathy bandwidth. You process people like problems to solve. Sometimes they need to be heard, not fixed.',
    ],
  },

  // ── THE SENSITIVE ──
  // Mapped from: Healer, Artist
  // Writing style: Gentle, spacious, emotionally attuned
  sensitive: {
    id: 'sensitive',
    displayName: 'The Sensitive',
    description: 'Gentle, spacious, and deeply attuned — for those who feel the world intensely.',
    archetypes: ['Healer', 'Artist'] as ArchetypeName[],
    dimensions: {
      sentenceStructure: 5,   // Flowing, varied — matches emotional rhythm
      metaphorDensity: 9,     // Rich, layered — deeply figurative
      directness: 3,          // Soft approach — never blunt
      warmth: 10,             // Maximum — deeply caring
      pacing: 9,              // Very spacious — room to breathe
      structurePreference: 2, // Flowing narrative — minimal structure
    },
    promptBlock: `VOICE & TONE: THE SENSITIVE
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
    examplePhrases: [
      'There\'s something your scores reveal that you may have always felt but never had words for: you experience the world at a higher resolution than most people. Where others see a moment, you see layers. The feeling beneath the feeling. The meaning behind the gesture.',
      'Your neuroticism score is the price of admission to the depth you carry. The same nervous system that makes you anxious in crowds is the one that makes you cry at music, notice when someone is quietly hurting, and create things that move people.',
      'Let\'s sit with this for a moment. Your attachment pattern shows you reach toward people and pull back in the same breath. Not because you\'re confused, but because you\'ve learned that the people you love the most are also the ones who can hurt you the most. That\'s wisdom wearing a quiet disguise.',
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Archetype → Voice Mapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps all 16 archetype names to their narrative voice.
 * ADR-02: Simple map lookup, not secondary z-score calculation.
 */
export const ARCHETYPE_VOICE_MAP: Record<ArchetypeName, VoiceId> = {
  Architect:  'intellectual',
  Sage:       'intellectual',
  Strategist: 'intellectual',
  Explorer:   'adventurer',
  Catalyst:   'adventurer',
  Maverick:   'adventurer',
  Rebel:      'adventurer',
  Advocate:   'connector',
  Diplomat:   'connector',
  Luminary:   'connector',
  Sentinel:   'steward',
  Guardian:   'steward',
  Anchor:     'steward',
  Commander:  'challenger',
  Healer:     'sensitive',
  Artist:     'sensitive',
};

// ─────────────────────────────────────────────────────────────────────────────
// Tone Modifiers — 4 clinical instrument-based adjustments
// ─────────────────────────────────────────────────────────────────────────────

export const TONE_MODIFIERS: Record<ModifierId, ToneModifier> = {
  compassion_boost: {
    id: 'compassion_boost',
    displayName: 'Compassion Boost',
    triggerDescription: 'Activated when self-compassion is low (SCS-SF ≤ 2.5) or self-judgment is high (≥ 4.0)',
    sourceInstruments: ['scs_sf'],
    trigger: {
      type: 'compound',
      combinator: 'OR',
      conditions: [
        {
          type: 'score_threshold',
          instrumentId: 'scs_sf',
          scoreField: 'totalScore',
          operator: 'lte',
          threshold: 2.5,
        },
        {
          type: 'score_threshold',
          instrumentId: 'scs_sf',
          scoreField: 'subscaleScores.selfJudgment',
          operator: 'gte',
          threshold: 4.0,
        },
      ],
    },
    promptBlock: `MODIFIER: COMPASSION BOOST
This person is notably self-critical. Your tone must counterbalance their inner critic without being saccharine.
- Normalize difficulties: "Many people with your profile experience this..."
- Frame challenges as patterns to understand rather than flaws to fix
- When noting a low score, immediately follow with what it reveals about their values or effort
- Avoid any phrasing that could be internalized as further criticism
- Use "and" instead of "but" when transitioning to challenges`,
    voiceInteractions: {
      // Challenger's directness needs softening when compassion is low
      challenger: { directness: -3, warmth: +2 },
      // Adventurer's boldness needs slight warming
      adventurer: { warmth: +1, directness: -1 },
    },
  },

  anxiety_softener: {
    id: 'anxiety_softener',
    displayName: 'Anxiety Softener',
    triggerDescription: 'Activated when anxiety is moderate-to-severe (GAD-7 ≥ 10 or severity matches)',
    sourceInstruments: ['gad7'],
    trigger: {
      type: 'compound',
      combinator: 'OR',
      conditions: [
        {
          type: 'score_threshold',
          instrumentId: 'gad7',
          scoreField: 'totalScore',
          operator: 'gte',
          threshold: 10,
        },
        {
          type: 'interpretation_match',
          instrumentId: 'gad7',
          interpretationField: 'severity',
          matchValues: ['Moderate', 'Severe'],
        },
      ],
    },
    promptBlock: `MODIFIER: ANXIETY SOFTENER
This person experiences significant anxiety. Your writing must provide ground, not amplify worry.
- Lead with what's stable and secure in their profile before noting challenges
- Avoid catastrophic framing. Instead of "this could become a problem," write "this is something to stay aware of"
- Give them specific, actionable next steps (anxious minds need handles, not open questions)
- When presenting data, contextualize: "This is common, about 1 in 4 adults experience this level"
- Pace sensitive information: one insight per paragraph, then breathing room`,
    voiceInteractions: {
      // Adventurer's fast pacing needs slowing for anxious readers
      adventurer: { pacing: +2, directness: -1 },
      // Challenger's bluntness needs substantial softening
      challenger: { directness: -2, warmth: +2, pacing: +2 },
    },
  },

  emotion_regulation_buffer: {
    id: 'emotion_regulation_buffer',
    displayName: 'Emotion Regulation Buffer',
    triggerDescription: 'Activated when emotion dysregulation is elevated (DERS-16 total ≥ 52)',
    sourceInstruments: ['ders16'],
    trigger: {
      type: 'score_threshold',
      instrumentId: 'ders16',
      scoreField: 'totalScore',
      operator: 'gte',
      threshold: 52,
    },
    promptBlock: `MODIFIER: EMOTION REGULATION BUFFER
This person may struggle with emotional overwhelm. Structure your writing to be containing, not triggering.
- Present emotional findings in a structured, predictable format with no surprises
- Use grounding language: "Let's look at this step by step"
- When discussing emotional patterns, always include "what you can do" alongside "what's happening"
- Avoid emotional cliffhangers or dramatic reveals. Aim for steady, contained pacing
- Frame regulation challenges as skills to build rather than deficits to overcome
- Include brief breathing space between heavy sections`,
    voiceInteractions: {
      // Sensitive's deep emotional pacing is already good — add structure
      sensitive: { structurePreference: +2 },
      // Challenger's confrontational style needs buffering
      challenger: { directness: -2, pacing: +2, warmth: +1 },
    },
  },

  attachment_sensitivity: {
    id: 'attachment_sensitivity',
    displayName: 'Attachment Sensitivity',
    triggerDescription: 'Activated when attachment anxiety is high (ECR-R anxiety ≥ 3.5) or attachment style is insecure',
    sourceInstruments: ['ecr_r_short'],
    trigger: {
      type: 'compound',
      combinator: 'OR',
      conditions: [
        {
          type: 'score_threshold',
          instrumentId: 'ecr_r_short',
          scoreField: 'subscaleScores.anxiety',
          operator: 'gte',
          threshold: 3.5,
        },
        {
          type: 'interpretation_match',
          instrumentId: 'ecr_r_short',
          interpretationField: 'attachmentStyle',
          matchValues: ['anxious', 'disorganized'],
        },
      ],
    },
    promptBlock: `MODIFIER: ATTACHMENT SENSITIVITY
This person has heightened sensitivity around relationship patterns. Handle attachment content with extra care.
- When discussing attachment, emphasize that patterns are adaptive (not pathological)
- Use language of "learned response" rather than "attachment disorder"
- Validate the courage it takes to look at relationship patterns honestly
- When presenting insecure attachment data, immediately contextualize: "About 40% of adults share this pattern"
- Frame growth in terms of awareness, not overhaul. "Noticing this pattern is itself a step toward change"
- In non-attachment sections, these adjustments do not apply`,
    voiceInteractions: {
      // Intellectual's clinical distance needs warming for attachment content
      intellectual: { warmth: +2 },
      // Challenger's directness needs substantial softening on relationship topics
      challenger: { directness: -3, warmth: +3 },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Section Voice Overrides
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Section-level dimension adjustments applied after voice + modifiers.
 * These handle cases where a specific section needs a different feel
 * regardless of the user's voice assignment.
 */
export const SECTION_VOICE_OVERRIDES: SectionVoiceOverride[] = [
  {
    // RS07: Inner System (IFS-informed) — needs extra warmth and softness
    sectionId: 'RS07',
    dimensionAdjustments: { warmth: +2, directness: -1 },
    additionalPrompt: 'This section uses an Internal Family Systems lens. Approach "protector" parts with curiosity and respect, never pathologizing them.',
  },
  {
    // RS08: Emotional Landscape (DERS) — deliberate pacing for heavy content
    sectionId: 'RS08',
    dimensionAdjustments: { pacing: +1 },
  },
  {
    // RS12: Growth Map — needs clear structure regardless of voice
    sectionId: 'RS12',
    dimensionAdjustments: { structurePreference: +2, directness: +1 },
    additionalPrompt: 'This section must end with 3 specific, actionable next steps. Be prescriptive — the user is asking "what do I do now?"',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Coach Profile Seeds (V1 Contract — NVR34)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initial coach_profiles dimension values derived from voice classification.
 * Values are 0.0–1.0 (matching coach_profiles table schema).
 *
 * The Coach Profile Seeder (V2) will consume this to set starting dimensions
 * when a user first opens their coach after completing Decoded.
 *
 * Coach dimensions: directness, framing, warmth, autonomy,
 *                   pacing, evidence_style, accountability, challenge_level
 */
export const COACH_PROFILE_SEED: CoachProfileSeed = {
  intellectual: {
    directness: 0.7,       // Clear and assertive
    framing: 0.6,          // Balanced but leaning analytical
    warmth: 0.4,           // Professional, not cold
    autonomy: 0.7,         // Respect their independence
    pacing: 0.5,           // Measured
    evidence_style: 0.7,   // Data and frameworks preferred
    accountability: 0.5,   // Moderate — they self-monitor
    challenge_level: 0.6,  // Can handle intellectual challenge
  },
  adventurer: {
    directness: 0.8,       // Bold and direct
    framing: 0.4,          // Action-oriented, less analytical
    warmth: 0.5,           // Warm through challenge
    autonomy: 0.8,         // High independence
    pacing: 0.7,           // Fast-paced
    evidence_style: 0.4,   // Stories over data
    accountability: 0.6,   // Push them forward
    challenge_level: 0.8,  // They want to be pushed
  },
  connector: {
    directness: 0.4,       // Gentle, diplomatic
    framing: 0.5,          // Balanced
    warmth: 0.9,           // Very warm
    autonomy: 0.5,         // Collaborative
    pacing: 0.4,           // Spacious
    evidence_style: 0.5,   // Mix of stories and data
    accountability: 0.4,   // Supportive, not pushy
    challenge_level: 0.3,  // Gentle challenges
  },
  steward: {
    directness: 0.5,       // Clear but not confrontational
    framing: 0.7,          // Evidence-based framing
    warmth: 0.6,           // Reassuring
    autonomy: 0.4,         // They appreciate guidance
    pacing: 0.4,           // Deliberate, not rushed
    evidence_style: 0.8,   // Data-driven
    accountability: 0.6,   // Structured accountability
    challenge_level: 0.4,  // Moderate — they're already diligent
  },
  challenger: {
    directness: 0.9,       // Maximum directness
    framing: 0.3,          // Action over analysis
    warmth: 0.3,           // Respect, not warmth
    autonomy: 0.6,         // They make their own decisions
    pacing: 0.8,           // Fast — no wasted time
    evidence_style: 0.5,   // Efficient evidence
    accountability: 0.8,   // High accountability
    challenge_level: 0.9,  // Maximum challenge
  },
  sensitive: {
    directness: 0.2,       // Very gentle
    framing: 0.6,          // Reflective framing
    warmth: 0.9,           // Maximum warmth
    autonomy: 0.6,         // Respect their inner wisdom
    pacing: 0.3,           // Very spacious
    evidence_style: 0.4,   // Stories and metaphors
    accountability: 0.3,   // Gentle nudges only
    challenge_level: 0.2,  // Minimal challenge — build safety first
  },
};

/**
 * Coach dimension adjustments when tone modifiers are active.
 * Applied additively on top of voice seed values, clamped to 0.0–1.0.
 */
export const COACH_MODIFIER_DELTAS: CoachModifierDelta = {
  compassion_boost: {
    warmth: +0.1,
    challenge_level: -0.1,
    directness: -0.1,
  },
  anxiety_softener: {
    pacing: -0.1,           // Slow down
    warmth: +0.1,
    challenge_level: -0.15,
    accountability: -0.1,   // Reduce pressure
  },
  emotion_regulation_buffer: {
    pacing: -0.1,
    warmth: +0.1,
    challenge_level: -0.1,
  },
  attachment_sensitivity: {
    warmth: +0.15,
    challenge_level: -0.1,
    directness: -0.1,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Fallback
// ─────────────────────────────────────────────────────────────────────────────

/** Fallback voice when classification fails (NVR04) */
export const FALLBACK_VOICE: VoiceId = 'connector';

// ─────────────────────────────────────────────────────────────────────────────
// Build-time Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate configuration at import time.
 * If any validation fails, the module throws — catching errors before production.
 *
 * Checks:
 * 1. All voice profiles have valid fields and dimension ranges
 * 2. All 16 archetypes are mapped to a voice
 * 3. All modifier IDs reference valid voice IDs in voiceInteractions
 * 4. Fallback voice exists in VOICE_PROFILES
 */
function validateConfig(): void {
  // 1. Validate voice profiles (replaces Zod — same checks, no dependency)
  for (const profile of Object.values(VOICE_PROFILES)) {
    validateProfile(profile);
  }

  // 2. Verify all archetypes are mapped
  for (const archetype of ARCHETYPE_NAMES) {
    if (!(archetype in ARCHETYPE_VOICE_MAP)) {
      throw new Error(
        `[Voice Config] Archetype "${archetype}" is not mapped in ARCHETYPE_VOICE_MAP`,
      );
    }
  }

  // 3. Verify all archetype map values are valid voice IDs
  for (const [archetype, voiceId] of Object.entries(ARCHETYPE_VOICE_MAP)) {
    if (!VOICE_IDS.includes(voiceId)) {
      throw new Error(
        `[Voice Config] Archetype "${archetype}" maps to invalid voice "${voiceId}"`,
      );
    }
  }

  // 4. Verify modifier voice interactions reference valid voice IDs
  for (const [modId, modifier] of Object.entries(TONE_MODIFIERS)) {
    for (const voiceId of Object.keys(modifier.voiceInteractions)) {
      if (!VOICE_IDS.includes(voiceId as VoiceId)) {
        throw new Error(
          `[Voice Config] Modifier "${modId}" references invalid voice "${voiceId}"`,
        );
      }
    }
  }

  // 5. Verify fallback voice exists
  if (!VOICE_PROFILES[FALLBACK_VOICE]) {
    throw new Error(
      `[Voice Config] Fallback voice "${FALLBACK_VOICE}" not found`,
    );
  }
}

// Run validation at import time
validateConfig();
