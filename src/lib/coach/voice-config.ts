/**
 * Coach Voice Configuration
 *
 * Maps the 6 narrative voices to coach_profiles dimension values.
 * Used by the voice switching API to update coach communication style.
 *
 * These values are derived from the voice personality profiles:
 * - Intellectual: analytical, data-driven, moderate warmth
 * - Adventurer: direct, action-oriented, opportunity-framing
 * - Connector: warm, relational, spacious pacing
 * - Steward: structured, evidence-based, external accountability
 * - Challenger: blunt, high-challenge, results-focused
 * - Sensitive: spacious, story-driven, high warmth
 *
 * Dimension scale: 1–10 (stored as float in coach_profiles)
 */

export const VOICE_IDS = [
  'intellectual',
  'adventurer',
  'connector',
  'steward',
  'challenger',
  'sensitive',
] as const;

export type CoachVoiceId = (typeof VOICE_IDS)[number];

export interface CoachVoiceOption {
  id: CoachVoiceId;
  label: string;
  shortDescription: string;
  /** Lucide icon name for dynamic rendering */
  iconName: 'Microscope' | 'Compass' | 'Heart' | 'ShieldCheck' | 'Zap' | 'Waves';
}

export const COACH_VOICE_OPTIONS: CoachVoiceOption[] = [
  {
    id: 'intellectual',
    label: 'The Intellectual',
    shortDescription: 'Precise, analytical, framework-driven',
    iconName: 'Microscope',
  },
  {
    id: 'adventurer',
    label: 'The Adventurer',
    shortDescription: 'Bold, direct, action-oriented',
    iconName: 'Compass',
  },
  {
    id: 'connector',
    label: 'The Connector',
    shortDescription: 'Warm, relational, empathetic',
    iconName: 'Heart',
  },
  {
    id: 'steward',
    label: 'The Steward',
    shortDescription: 'Structured, evidence-based, reassuring',
    iconName: 'ShieldCheck',
  },
  {
    id: 'challenger',
    label: 'The Challenger',
    shortDescription: 'Strategic, no-nonsense, results-focused',
    iconName: 'Zap',
  },
  {
    id: 'sensitive',
    label: 'The Sensitive',
    shortDescription: 'Spacious, poetic, deeply attuned',
    iconName: 'Waves',
  },
];

/**
 * Maps each voice to coach_profiles dimension values (1–10 scale).
 *
 * These determine how buildDeliveryStyle() in the prompt assembler
 * generates natural language style instructions for Claude.
 */
export const VOICE_TO_COACH_DIMENSIONS: Record<
  CoachVoiceId,
  {
    directness: number;
    framing: number;
    warmth: number;
    autonomy: number;
    pacing: number;
    evidence_style: number;
    accountability: number;
    challenge_level: number;
  }
> = {
  intellectual: {
    directness: 5,      // Balanced — presents analysis, not commands
    framing: 5,         // Neutral — weighs both sides
    warmth: 4,          // Professional but not cold
    autonomy: 7,        // Trusts the user to think independently
    pacing: 5,          // Measured, thorough
    evidence_style: 2,  // Data and frameworks over stories
    accountability: 4,  // Light structure, trusts internal process
    challenge_level: 6, // Intellectually rigorous
  },
  adventurer: {
    directness: 8,      // Cuts to the chase
    framing: 8,         // Opportunity and upside
    warmth: 5,          // Friendly but focused
    autonomy: 8,        // High independence
    pacing: 8,          // Fast, momentum-driven
    evidence_style: 5,  // Mix of data and real-world examples
    accountability: 5,  // Balanced — action-oriented but not micromanaging
    challenge_level: 7, // Pushes boundaries
  },
  connector: {
    directness: 3,      // Diplomatic, provides context first
    framing: 6,         // Gentle optimism
    warmth: 9,          // Relationship-first
    autonomy: 4,        // Collaborative, checks in
    pacing: 3,          // Spacious, unhurried
    evidence_style: 8,  // Stories, metaphors, personal connections
    accountability: 3,  // Internal trust, gentle nudges
    challenge_level: 3, // Supportive, not confrontational
  },
  steward: {
    directness: 6,      // Clear and organized
    framing: 4,         // Acknowledges risks, then offers structure
    warmth: 6,          // Reassuring presence
    autonomy: 4,        // Offers structure and guidance
    pacing: 5,          // Steady and consistent
    evidence_style: 3,  // Evidence-based, references research
    accountability: 8,  // External check-ins, progress tracking
    challenge_level: 5, // Firm but fair
  },
  challenger: {
    directness: 9,      // Blunt, no sugar-coating
    framing: 7,         // Results-focused, what's at stake
    warmth: 2,          // Substance over comfort
    autonomy: 6,        // Expects self-direction
    pacing: 7,          // Keeps pressure on
    evidence_style: 4,  // Strategic analysis, case studies
    accountability: 7,  // Strong external accountability
    challenge_level: 9, // Pushes hard
  },
  sensitive: {
    directness: 2,      // Gentle, softened language
    framing: 6,         // Hopeful, possibility-oriented
    warmth: 8,          // Deeply attuned
    autonomy: 5,        // Respects pace, doesn't push
    pacing: 2,          // Slow, spacious, lots of breathing room
    evidence_style: 9,  // Poetic, metaphorical, intuitive
    accountability: 2,  // Trusts inner process
    challenge_level: 2, // Holds space, doesn't confront
  },
};
