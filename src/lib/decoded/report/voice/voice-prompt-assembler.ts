/**
 * Decoded Report — Voice Prompt Assembler
 *
 * Merges voice profile + tone modifiers + section overrides into
 * the final voice prompt block injected into section system prompts.
 *
 * Architecture: DECODED_NARRATIVE_VOICES_ARCHITECTURE.md §3.2
 * PRD: NV05, NVR05–NVR08
 */

import type { SectionId } from '../prompts/types';
import type {
  VoiceContext,
  VoiceProfile,
  ToneModifier,
  WritingDimensions,
  ModifierId,
  SectionVoiceOverride,
} from './types';
import { SECTION_VOICE_OVERRIDES, GLOBAL_VOICE_RULES } from './config';

/**
 * Assemble the complete voice context for a given section.
 *
 * This produces the VoiceContext that tells the prompt builder
 * exactly how to write this section for this user.
 *
 * Assembly order:
 * 1. Start with base voice dimensions
 * 2. Apply modifier voiceInteractions (dimension adjustments per voice×modifier)
 * 3. Apply section-level overrides (RS07, RS08, RS12)
 * 4. Clamp all dimensions to 1–10
 *
 * Token budget: ≤800 tokens for voice-injected content.
 * Full system prompt ~1200–1600 tokens total (including static preamble + rules).
 */
export function assembleVoicePrompt(
  voice: VoiceProfile,
  modifiers: ToneModifier[],
  sectionId: SectionId,
  safetyForcedModifiers: ModifierId[],
): VoiceContext {
  // 1. Start with base voice dimensions (deep copy to avoid mutation)
  let effectiveDimensions: WritingDimensions = { ...voice.dimensions };

  // 2. Apply modifier interactions for this specific voice
  for (const modifier of modifiers) {
    const interaction = modifier.voiceInteractions[voice.id];
    if (interaction) {
      effectiveDimensions = mergeDimensions(effectiveDimensions, interaction);
    }
  }

  // 3. Apply section-level overrides
  const sectionOverride =
    SECTION_VOICE_OVERRIDES.find((o) => o.sectionId === sectionId) ?? null;
  if (sectionOverride) {
    effectiveDimensions = mergeDimensions(
      effectiveDimensions,
      sectionOverride.dimensionAdjustments,
    );
  }

  return {
    voice,
    activeModifiers: modifiers,
    sectionOverride,
    safetyForcedModifiers,
    effectiveDimensions,
  };
}

/**
 * Build the prompt string from a VoiceContext.
 * Called by the modified buildSectionPrompt() in templates.ts.
 *
 * Output structure:
 * 0. Global writing rules (anti-AI patterns, ~100 tokens)
 * 1. Voice identity block (200–400 tokens)
 * 2. Active modifier blocks (0–400 tokens)
 * 3. Section override prompt (0–100 tokens)
 * 4. Effective dimensions calibration summary
 *
 * @returns A single string to inject as the VOICE & TONE section of the system prompt
 */
export function buildVoicePromptBlock(ctx: VoiceContext): string {
  const parts: string[] = [];

  // 0. Global writing rules (apply to every voice)
  parts.push(GLOBAL_VOICE_RULES);

  // 1. Voice identity + dimensions + examples
  parts.push(ctx.voice.promptBlock);

  // 2. Active modifier blocks
  for (const modifier of ctx.activeModifiers) {
    parts.push(modifier.promptBlock);
  }

  // 3. Section-specific override prompt
  if (ctx.sectionOverride?.additionalPrompt) {
    parts.push(ctx.sectionOverride.additionalPrompt);
  }

  // 4. Effective dimensions summary (helps the LLM calibrate)
  parts.push(formatDimensionsSummary(ctx.effectiveDimensions));

  return parts.join('\n\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension Arithmetic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Merge partial dimension adjustments onto a base dimension set.
 * Adjustments are additive and the result is clamped to [1, 10].
 */
export function mergeDimensions(
  base: WritingDimensions,
  delta: Partial<WritingDimensions>,
): WritingDimensions {
  const result = { ...base };

  for (const [key, adjustment] of Object.entries(delta)) {
    if (
      adjustment !== undefined &&
      key in result
    ) {
      const k = key as keyof WritingDimensions;
      result[k] = clamp(result[k] + adjustment, 1, 10);
    }
  }

  return result;
}

/**
 * Clamp a value between min and max (inclusive).
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Format a human-readable dimensions summary for LLM calibration.
 * Included at the end of the voice prompt block to give the LLM
 * concrete numerical anchors for each dimension.
 */
function formatDimensionsSummary(dimensions: WritingDimensions): string {
  return `WRITING CALIBRATION (1–10 scale):
- Sentence complexity: ${dimensions.sentenceStructure}/10
- Metaphor density: ${dimensions.metaphorDensity}/10
- Directness: ${dimensions.directness}/10
- Warmth: ${dimensions.warmth}/10
- Pacing (spaciousness): ${dimensions.pacing}/10
- Structure preference: ${dimensions.structurePreference}/10`;
}
