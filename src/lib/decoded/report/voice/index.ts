/**
 * Decoded Report — Adaptive Narrative Voice System
 *
 * Public API exports for the voice subsystem.
 * Import from '@/lib/decoded/report/voice' to access all voice functionality.
 *
 * Architecture: DECODED_NARRATIVE_VOICES_ARCHITECTURE.md §3.2
 * PRD: DECODED_NARRATIVE_VOICES_PRD.md §6.9 (NVR35)
 */

// ── Types ──
export type {
  VoiceId,
  VoiceProfile,
  WritingDimensions,
  ToneModifier,
  ToneModifierTrigger,
  ScoreThresholdTrigger,
  InterpretationMatchTrigger,
  CompoundTrigger,
  ModifierId,
  SectionVoiceOverride,
  CoachDimension,
  CoachProfileSeed,
  CoachModifierDelta,
  VoiceContext,
  StoredVoiceProfile,
  ReportVersionRow,
  VoiceFeedbackRecord,
} from './types';

// ── Const arrays (runtime values, not just types) ──
export { VOICE_IDS, MODIFIER_IDS } from './types';

// ── Config ──
export {
  VOICE_PROFILES,
  ARCHETYPE_VOICE_MAP,
  TONE_MODIFIERS,
  SECTION_VOICE_OVERRIDES,
  COACH_PROFILE_SEED,
  COACH_MODIFIER_DELTAS,
  FALLBACK_VOICE,
  GLOBAL_VOICE_RULES,
} from './config';

// ── Classification ──
export { classifyVoice, getVoiceById, getVoiceIdForArchetype } from './voice-classifier';

// ── Modifier Resolution ──
export { resolveModifiers } from './modifier-resolver';

// ── Prompt Assembly ──
export { assembleVoicePrompt, buildVoicePromptBlock } from './voice-prompt-assembler';

// ── Pipeline (S13) ──
export { buildVoicePipeline, buildRewritePipeline } from './pipeline';
export type { VoicePipelineResult, SectionPromptSet } from './pipeline';
