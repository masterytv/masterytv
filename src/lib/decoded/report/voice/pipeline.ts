/**
 * Decoded Report — Voice-Aware Report Generation Orchestrator (S13)
 *
 * Ties the voice pipeline into the report generation flow:
 * 1. Archetype engine classifies the user → archetype
 * 2. Voice classifier maps archetype → voice profile
 * 3. Safety layer evaluates clinical flags
 * 4. Modifier resolver determines active tone modifiers
 * 5. Voice assembler builds section-level voice context
 * 6. Template builder injects voice into section prompts
 *
 * This module is consumed by:
 * - The Edge Function (decoded-generate-report) for initial generation
 * - The rewrite Edge Function (decoded-rewrite-voice) for voice rewrites
 *
 * Architecture: DECODED_NARRATIVE_VOICES_ARCHITECTURE.md §3.2
 * PRD: NVR05–NVR08, NVR20–NVR23
 */

import type { ArchetypeResult } from '../../archetypes/types';
import type { InstrumentScore } from '../../scoring/types';
import type { SectionId } from '../prompts/types';
import type {
  VoiceId,
  VoiceContext,
  VoiceProfile,
  ModifierId,
  StoredVoiceProfile,
} from '../voice/types';

import { classifyVoice, getVoiceById } from '../voice/voice-classifier';
import { resolveModifiers } from '../voice/modifier-resolver';
import { assembleVoicePrompt } from '../voice/voice-prompt-assembler';
import { buildSectionPromptWithVoice, getAllSectionIds } from '../prompts/templates';
import { evaluateSafetyFlags, buildVoiceSafetyInput } from '../safety';

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface VoicePipelineResult {
  /** The classified or requested voice profile */
  voice: VoiceProfile;
  /** Active tone modifiers (from trigger evaluation + safety) */
  activeModifierIds: ModifierId[];
  /** Modifier IDs forced by the safety layer specifically */
  safetyForcedModifierIds: ModifierId[];
  /** The StoredVoiceProfile JSONB to write to assessment_reports.voice_profile */
  storedProfile: StoredVoiceProfile;
  /** Pre-assembled prompts for every section, ready for LLM calls */
  sectionPrompts: SectionPromptSet[];
}

export interface SectionPromptSet {
  sectionId: SectionId;
  system: string;
  user: string;
  voiceId: VoiceId;
}

/**
 * Run the full voice-aware generation pipeline for a new report.
 *
 * This is the main entry point for initial report generation.
 * The archetype result drives voice classification automatically.
 *
 * @param archetype   Result from the archetype classification engine
 * @param scores      All scored instrument results
 * @param scoreDataFn Function that returns serialized score data for a given section
 * @param archetypeJson  Serialized archetype data for prompt injection
 * @param bigFiveJson    Serialized Big Five data for prompt injection
 */
export function buildVoicePipeline(
  archetype: ArchetypeResult,
  scores: InstrumentScore[],
  scoreDataFn: (sectionId: SectionId) => string,
  archetypeJson: string,
  bigFiveJson: string,
): VoicePipelineResult {
  // 1. Classify voice from archetype
  const voice = classifyVoice(archetype);

  // 2. Evaluate safety flags
  const safetyFlags = evaluateSafetyFlags(scores);
  const voiceSafety = buildVoiceSafetyInput(safetyFlags);

  // 3. Resolve tone modifiers
  const { modifiers, safetyForced } = resolveModifiers(scores, voiceSafety);

  // 4. Build section prompts with voice context
  const sectionPrompts: SectionPromptSet[] = [];

  for (const sectionId of getAllSectionIds()) {
    // Assemble voice context for this specific section
    const voiceContext = assembleVoicePrompt(
      voice,
      modifiers,
      sectionId,
      safetyForced,
    );

    // Build the prompt pair
    const prompt = buildSectionPromptWithVoice(
      sectionId,
      scoreDataFn(sectionId),
      archetypeJson,
      bigFiveJson,
      voiceContext,
    );

    sectionPrompts.push({
      sectionId,
      system: prompt.system,
      user: prompt.user,
      voiceId: prompt.voiceId as VoiceId,
    });
  }

  // 5. Build the stored profile for the DB
  const storedProfile: StoredVoiceProfile = {
    voiceId: voice.id,
    modifiers: modifiers.map((m) => m.id),
    classificationInput: {
      archetype: archetype.primary.name,
      zScores: archetype.zScores as unknown as Record<string, number>,
    },
  };

  return {
    voice,
    activeModifierIds: modifiers.map((m) => m.id),
    safetyForcedModifierIds: safetyForced,
    storedProfile,
    sectionPrompts,
  };
}

/**
 * Run the voice pipeline for a REWRITE in a specific voice.
 *
 * Same as buildVoicePipeline but uses a user-selected voice
 * instead of auto-classifying from the archetype.
 *
 * @param voiceId       The user-selected voice to rewrite in
 * @param scores        All scored instrument results
 * @param scoreDataFn   Function that returns serialized score data for a given section
 * @param archetypeJson Serialized archetype data for prompt injection
 * @param bigFiveJson   Serialized Big Five data for prompt injection
 */
export function buildRewritePipeline(
  voiceId: VoiceId,
  scores: InstrumentScore[],
  scoreDataFn: (sectionId: SectionId) => string,
  archetypeJson: string,
  bigFiveJson: string,
): Omit<VoicePipelineResult, 'storedProfile'> & { sectionPrompts: SectionPromptSet[] } {
  // 1. Get voice by explicit ID (user chose this)
  const voice = getVoiceById(voiceId);

  // 2. Evaluate safety flags (same modifiers apply regardless of voice choice)
  const safetyFlags = evaluateSafetyFlags(scores);
  const voiceSafety = buildVoiceSafetyInput(safetyFlags);

  // 3. Resolve tone modifiers
  const { modifiers, safetyForced } = resolveModifiers(scores, voiceSafety);

  // 4. Build section prompts with voice context
  const sectionPrompts: SectionPromptSet[] = [];

  for (const sectionId of getAllSectionIds()) {
    const voiceContext = assembleVoicePrompt(
      voice,
      modifiers,
      sectionId,
      safetyForced,
    );

    const prompt = buildSectionPromptWithVoice(
      sectionId,
      scoreDataFn(sectionId),
      archetypeJson,
      bigFiveJson,
      voiceContext,
    );

    sectionPrompts.push({
      sectionId,
      system: prompt.system,
      user: prompt.user,
      voiceId: prompt.voiceId as VoiceId,
    });
  }

  return {
    voice,
    activeModifierIds: modifiers.map((m) => m.id),
    safetyForcedModifierIds: safetyForced,
    sectionPrompts,
  };
}
