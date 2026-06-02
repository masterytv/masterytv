/**
 * Decoded Report — Adaptive Narrative Voice Types
 *
 * All type definitions for the voice classification, tone modifier,
 * and prompt assembly system.
 *
 * Architecture: DECODED_NARRATIVE_VOICES_ARCHITECTURE.md §2
 * PRD: DECODED_NARRATIVE_VOICES_PRD.md §4, §6.9
 */

import type { ArchetypeName } from '../../archetypes/types';
import type { SectionId, ReportSectionContent } from '../prompts/types';

// ─────────────────────────────────────────────────────────────────────────────
// Voice Identifiers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The 6 narrative voice identifiers.
 * These are stable strings — never use numeric indices.
 * Referenced by: voice config, assessment_reports.voice_profile, coach profile seeder (V2).
 */
export const VOICE_IDS = [
  'intellectual',
  'adventurer',
  'connector',
  'steward',
  'challenger',
  'sensitive',
] as const;

export type VoiceId = (typeof VOICE_IDS)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Writing Dimensions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 6 writing dimensions that define a voice's prose style.
 * Each is a 1–10 scale with named anchors at low/mid/high.
 *
 * These are REPORT dimensions (monologue), not coach dimensions (dialogue).
 * The mapping to coach dimensions is defined in config.coachProfileSeed.
 */
export interface WritingDimensions {
  /** Simple/short (1) ↔ Complex/compound (10) */
  sentenceStructure: number;
  /** Literal/concrete (1) ↔ Figurative/abstract (10) */
  metaphorDensity: number;
  /** Softened/hedged (1) ↔ Blunt/confrontational (10) */
  directness: number;
  /** Professional distance (1) ↔ Intimate care (10) */
  warmth: number;
  /** Fast/clipped (1) ↔ Slow/spacious (10) */
  pacing: number;
  /** Flowing narrative (1) ↔ Organized sections (10) */
  structurePreference: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice Profile
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Complete voice profile definition.
 * Each voice includes its identity, dimensions, prompt text, and example phrases.
 */
export interface VoiceProfile {
  /** Stable identifier — matches VoiceId union */
  id: VoiceId;
  /** Human-readable name shown in UI (e.g., "The Intellectual") */
  displayName: string;
  /** One-line description for the voice picker */
  description: string;
  /** Which archetypes map to this voice (configurable, set in config.ts) */
  archetypes: ArchetypeName[];
  /** Writing dimension values for this voice */
  dimensions: WritingDimensions;
  /**
   * The prompt block (~200–400 tokens) injected into the system prompt.
   * Replaces DECODED_TONE_GUIDE's voice section.
   */
  promptBlock: string;
  /**
   * 3+ example phrases the LLM uses as style anchors.
   * Included in the prompt block for few-shot guidance.
   */
  examplePhrases: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tone Modifiers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tone modifier identifiers — 4 clinical instrument-based adjustments.
 */
export const MODIFIER_IDS = [
  'compassion_boost',
  'anxiety_softener',
  'emotion_regulation_buffer',
  'attachment_sensitivity',
] as const;

export type ModifierId = (typeof MODIFIER_IDS)[number];

/**
 * Trigger configuration for a tone modifier.
 * All thresholds are config-driven (NVR24–NVR26).
 *
 * Supports three evaluation modes:
 * - `score_threshold`: Compare a single score field against a threshold
 * - `interpretation_match`: Check if an interpretation field matches expected values
 * - `compound`: Combine multiple conditions with AND/OR logic
 */
export type ToneModifierTrigger =
  | ScoreThresholdTrigger
  | InterpretationMatchTrigger
  | CompoundTrigger;

export interface ScoreThresholdTrigger {
  type: 'score_threshold';
  /** Instrument to evaluate (e.g., 'scs_sf', 'gad7') */
  instrumentId: string;
  /**
   * Which score field to check.
   * 'totalScore' checks the top-level total.
   * 'subscaleScores.<key>' checks a subscale (e.g., 'subscaleScores.selfJudgment').
   */
  scoreField: 'totalScore' | `subscaleScores.${string}`;
  /** Comparison operator */
  operator: 'gte' | 'lte';
  /** The threshold value */
  threshold: number;
}

export interface InterpretationMatchTrigger {
  type: 'interpretation_match';
  /** Instrument to evaluate */
  instrumentId: string;
  /** Interpretation field to check (e.g., 'severity', 'attachmentStyle') */
  interpretationField: string;
  /** Values that trigger this modifier (e.g., ['Moderate', 'Severe']) */
  matchValues: string[];
}

export interface CompoundTrigger {
  type: 'compound';
  /** How to combine the sub-conditions */
  combinator: 'AND' | 'OR';
  /** Nested trigger conditions */
  conditions: ToneModifierTrigger[];
}

/**
 * Tone modifier definition.
 * Each modifier has a trigger condition and a prompt block.
 */
export interface ToneModifier {
  id: ModifierId;
  displayName: string;
  /** Human-readable description of when this modifier activates */
  triggerDescription: string;
  /** Source instrument(s) for the trigger condition */
  sourceInstruments: string[];
  /**
   * Evaluator configuration — determines whether this modifier activates.
   * Defined in config, not hardcoded in the resolver.
   */
  trigger: ToneModifierTrigger;
  /**
   * The prompt block (~100–200 tokens) appended after the voice block.
   */
  promptBlock: string;
  /**
   * Interaction rules — how this modifier adjusts writing dimensions
   * when paired with specific voices.
   * Key = VoiceId, value = partial WritingDimension adjustments (additive).
   */
  voiceInteractions: Partial<Record<VoiceId, Partial<WritingDimensions>>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Voice Overrides
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Section-level voice dimension overrides.
 * Applied after voice + modifiers to fine-tune specific sections.
 */
export interface SectionVoiceOverride {
  sectionId: SectionId;
  /** Partial dimension adjustments — additive (clamped to 1–10) */
  dimensionAdjustments: Partial<WritingDimensions>;
  /** Optional additional prompt text for this section */
  additionalPrompt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Coach Profile Integration (V1 Contract — NVR34)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The 8 coach profile dimensions (matches coach_profiles table).
 * These are DIALOGUE dimensions (chat), not report dimensions.
 *
 * V1 contract: the voice system defines this mapping so the future
 * Coach Profile Seeder (V2) can consume it without rework.
 */
export type CoachDimension =
  | 'directness'
  | 'framing'
  | 'warmth'
  | 'autonomy'
  | 'pacing'
  | 'evidence_style'
  | 'accountability'
  | 'challenge_level';

/**
 * Coach profile seed mapping.
 * Maps each voice to initial coach_profiles dimension values (0.0–1.0).
 * The seeder (V2) consumes this to set coach dimensions from Decoded data.
 */
export type CoachProfileSeed = Record<VoiceId, Record<CoachDimension, number>>;

/**
 * Coach modifier delta mapping.
 * Maps each modifier to additive deltas on coach profile dimensions.
 * Applied on top of the voice seed values, clamped to 0.0–1.0.
 */
export type CoachModifierDelta = Record<ModifierId, Partial<Record<CoachDimension, number>>>;

// ─────────────────────────────────────────────────────────────────────────────
// Assembled Voice Context
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The complete voice context passed to the prompt assembler.
 * Produced by the voice pipeline, consumed by voice-prompt-assembler.
 */
export interface VoiceContext {
  /** The resolved voice profile */
  voice: VoiceProfile;
  /** Active tone modifiers (0–4) */
  activeModifiers: ToneModifier[];
  /** Section-level override for the current section (if any) */
  sectionOverride: SectionVoiceOverride | null;
  /** Modifier IDs that were forced by the safety layer */
  safetyForcedModifiers: ModifierId[];
  /** The effective writing dimensions after all layers are applied */
  effectiveDimensions: WritingDimensions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Types (Database JSONB Shapes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stored in assessment_reports.voice_profile JSONB (NVR31, NVR36).
 * Written once at report generation time.
 */
export interface StoredVoiceProfile {
  voiceId: VoiceId;
  modifiers: ModifierId[];
  /** Big Five z-scores at time of classification (for audit trail) */
  classificationInput: {
    archetype: string;
    zScores: Record<string, number>;
  };
}

/**
 * Row in assessment_report_versions table (ADR-06).
 * Each voice rewrite gets its own row — not embedded in JSONB.
 *
 * Separate table avoids row bloat on assessment_reports
 * (~20-25KB per version × 6 versions = ~150KB avoided).
 */
export interface ReportVersionRow {
  id: string;
  report_id: string;
  user_id: string;
  voice_id: VoiceId;
  sections: Record<string, ReportSectionContent>;
  status: 'generating' | 'complete' | 'failed';
  sections_completed: number;
  total_sections: number;
  created_at: string;
  completed_at: string | null;
}

/**
 * Voice feedback record — stored in voice_feedback table.
 * Collected after a user reads a voice rewrite.
 */
export interface VoiceFeedbackRecord {
  id: string;
  assessment_id: string;
  user_id: string;
  original_voice_id: VoiceId;
  rewrite_voice_id: VoiceId | null;
  preferred_voice_id: VoiceId | null;
  free_text: string | null;
  created_at: string;
}
