/**
 * Template Split + Voice Integration — Unit Tests (S10)
 *
 * Validates:
 * - DECODED_TONE_GUIDE split into safety rules + default voice
 * - buildSectionPrompt() backward compatibility
 * - buildSectionPromptWithVoice() correctly replaces voice block
 * - Safety rules are NEVER removed when voice is injected
 *
 * Run with: npx vitest run src/lib/decoded/report/prompts/templates.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  buildSectionPrompt,
  buildSectionPromptWithVoice,
  getAllSectionIds,
  REPORT_PROMPTS,
  DECODED_SAFETY_RULES,
  DECODED_DEFAULT_VOICE,
} from './templates';
import type { VoiceContext, VoiceProfile, WritingDimensions } from '../voice/types';
import { VOICE_PROFILES, TONE_MODIFIERS } from '../voice/config';

// ── Test Fixtures ────────────────────────────────────────────────────────────

/** Minimal VoiceContext for testing the integration path */
function makeVoiceContext(voiceId: keyof typeof VOICE_PROFILES = 'intellectual'): VoiceContext {
  const voice = VOICE_PROFILES[voiceId];
  return {
    voice,
    activeModifiers: [],
    sectionOverride: null,
    safetyForcedModifiers: [],
    effectiveDimensions: { ...voice.dimensions },
  };
}

/** VoiceContext with a modifier active */
function makeVoiceContextWithModifier(
  voiceId: keyof typeof VOICE_PROFILES = 'challenger',
): VoiceContext {
  const voice = VOICE_PROFILES[voiceId];
  return {
    voice,
    activeModifiers: [TONE_MODIFIERS.compassion_boost],
    sectionOverride: null,
    safetyForcedModifiers: ['compassion_boost'],
    effectiveDimensions: { ...voice.dimensions },
  };
}

const SCORE_DATA = '{"test": "data"}';
const ARCHETYPE_DATA = '{"primary": "Architect"}';
const BIG_FIVE_DATA = '{"openness": 85}';

// ── Template Split Integrity ─────────────────────────────────────────────────

describe('template split', () => {
  it('DECODED_SAFETY_RULES contains critical safety language', () => {
    expect(DECODED_SAFETY_RULES).toContain('Never use diagnostic language');
    expect(DECODED_SAFETY_RULES).toContain('Frame all findings as patterns');
    expect(DECODED_SAFETY_RULES).toContain('growth-oriented framing');
    expect(DECODED_SAFETY_RULES).toContain('clinical-level distress');
  });

  it('DECODED_SAFETY_RULES contains output format spec', () => {
    expect(DECODED_SAFETY_RULES).toContain('OUTPUT FORMAT');
    expect(DECODED_SAFETY_RULES).toContain('content_markdown');
    expect(DECODED_SAFETY_RULES).toContain('coach_question');
  });

  it('DECODED_DEFAULT_VOICE contains the legacy voice instructions', () => {
    expect(DECODED_DEFAULT_VOICE).toContain('VOICE & TONE');
    expect(DECODED_DEFAULT_VOICE).toContain('second person');
    expect(DECODED_DEFAULT_VOICE).toContain('feel SEEN');
  });

  it('DECODED_SAFETY_RULES does NOT contain voice/tone instructions', () => {
    // Safety rules should be voice-agnostic
    expect(DECODED_SAFETY_RULES).not.toContain('VOICE & TONE');
    expect(DECODED_SAFETY_RULES).not.toContain('second person');
  });

  it('every section system prompt contains safety rules', () => {
    for (const [id, template] of Object.entries(REPORT_PROMPTS)) {
      expect(
        template.systemPrompt,
        `${id} missing safety rules`,
      ).toContain('Never use diagnostic language');
    }
  });

  it('every section system prompt contains the default voice block', () => {
    for (const [id, template] of Object.entries(REPORT_PROMPTS)) {
      expect(
        template.systemPrompt,
        `${id} missing default voice`,
      ).toContain('VOICE & TONE');
    }
  });
});

// ── buildSectionPrompt (backward compat) ─────────────────────────────────────

describe('buildSectionPrompt (legacy)', () => {
  it('returns system + user for a valid section', () => {
    const result = buildSectionPrompt('RS01', SCORE_DATA, ARCHETYPE_DATA, BIG_FIVE_DATA);
    expect(result.system).toContain('Never use diagnostic language');
    expect(result.system).toContain('VOICE & TONE');
    expect(result.user).toContain(ARCHETYPE_DATA);
  });

  it('replaces all template placeholders', () => {
    const result = buildSectionPrompt('RS01', SCORE_DATA, ARCHETYPE_DATA, BIG_FIVE_DATA);
    expect(result.user).not.toContain('{{archetype}}');
    expect(result.user).not.toContain('{{bigFive}}');
    expect(result.user).not.toContain('{{sectionData}}');
  });

  it('throws for unknown section ID', () => {
    expect(() => buildSectionPrompt('RS99', SCORE_DATA, ARCHETYPE_DATA, BIG_FIVE_DATA))
      .toThrow('Unknown section ID');
  });

  it('works for every section', () => {
    for (const id of getAllSectionIds()) {
      const result = buildSectionPrompt(id, SCORE_DATA, ARCHETYPE_DATA, BIG_FIVE_DATA);
      expect(result.system.length).toBeGreaterThan(100);
      expect(result.user.length).toBeGreaterThan(10);
    }
  });
});

// ── buildSectionPromptWithVoice ──────────────────────────────────────────────

describe('buildSectionPromptWithVoice', () => {
  it('replaces default voice with personalized voice block', () => {
    const ctx = makeVoiceContext('intellectual');
    const result = buildSectionPromptWithVoice('RS01', SCORE_DATA, ARCHETYPE_DATA, BIG_FIVE_DATA, ctx);

    // Should contain the voice profile's prompt block
    expect(result.system).toContain('THE INTELLECTUAL');
    // Should NOT contain the default voice block
    expect(result.system).not.toContain('feel SEEN, not labeled');
  });

  it('preserves safety rules when voice is injected', () => {
    const ctx = makeVoiceContext('challenger');
    const result = buildSectionPromptWithVoice('RS01', SCORE_DATA, ARCHETYPE_DATA, BIG_FIVE_DATA, ctx);

    // Safety rules must ALWAYS be present
    expect(result.system).toContain('Never use diagnostic language');
    expect(result.system).toContain('Frame all findings as patterns');
    expect(result.system).toContain('OUTPUT FORMAT');
    expect(result.system).toContain('content_markdown');
  });

  it('includes global writing rules', () => {
    const ctx = makeVoiceContext('connector');
    const result = buildSectionPromptWithVoice('RS03', SCORE_DATA, ARCHETYPE_DATA, BIG_FIVE_DATA, ctx);

    expect(result.system).toContain('WRITING RULES (apply to every voice)');
    expect(result.system).toContain('Do not use em dashes');
  });

  it('includes modifier prompt when modifier is active', () => {
    const ctx = makeVoiceContextWithModifier('challenger');
    const result = buildSectionPromptWithVoice('RS07', SCORE_DATA, ARCHETYPE_DATA, BIG_FIVE_DATA, ctx);

    expect(result.system).toContain('COMPASSION BOOST');
    expect(result.system).toContain('THE CHALLENGER');
  });

  it('includes writing calibration dimensions', () => {
    const ctx = makeVoiceContext('sensitive');
    const result = buildSectionPromptWithVoice('RS01', SCORE_DATA, ARCHETYPE_DATA, BIG_FIVE_DATA, ctx);

    expect(result.system).toContain('WRITING CALIBRATION');
    expect(result.system).toContain('Sentence complexity:');
    expect(result.system).toContain('/10');
  });

  it('returns the voiceId used', () => {
    const ctx = makeVoiceContext('adventurer');
    const result = buildSectionPromptWithVoice('RS01', SCORE_DATA, ARCHETYPE_DATA, BIG_FIVE_DATA, ctx);
    expect(result.voiceId).toBe('adventurer');
  });

  it('preserves section-specific instructions', () => {
    const ctx = makeVoiceContext('steward');
    const result = buildSectionPromptWithVoice('RS07', SCORE_DATA, ARCHETYPE_DATA, BIG_FIVE_DATA, ctx);

    // RS07 has IFS-specific instructions
    expect(result.system).toContain('IFS-informed');
    expect(result.system).toContain('protector');
  });

  it('replaces template placeholders in user prompt', () => {
    const ctx = makeVoiceContext('intellectual');
    const result = buildSectionPromptWithVoice('RS01', SCORE_DATA, ARCHETYPE_DATA, BIG_FIVE_DATA, ctx);

    expect(result.user).not.toContain('{{archetype}}');
    expect(result.user).not.toContain('{{bigFive}}');
    expect(result.user).not.toContain('{{sectionData}}');
    expect(result.user).toContain(SCORE_DATA);
  });

  it('throws for unknown section ID', () => {
    const ctx = makeVoiceContext('intellectual');
    expect(() =>
      buildSectionPromptWithVoice('RS99', SCORE_DATA, ARCHETYPE_DATA, BIG_FIVE_DATA, ctx),
    ).toThrow('Unknown section ID');
  });

  it('works for every section with every voice', () => {
    const voices = ['intellectual', 'adventurer', 'connector', 'steward', 'challenger', 'sensitive'] as const;
    for (const sectionId of getAllSectionIds()) {
      for (const voiceId of voices) {
        const ctx = makeVoiceContext(voiceId);
        const result = buildSectionPromptWithVoice(sectionId, SCORE_DATA, ARCHETYPE_DATA, BIG_FIVE_DATA, ctx);
        // Safety rules always present
        expect(result.system, `${sectionId}/${voiceId} missing safety`).toContain('Never use diagnostic language');
        // Voice always injected
        expect(result.system, `${sectionId}/${voiceId} missing voice`).toContain('WRITING CALIBRATION');
        // Default voice always removed
        expect(result.system, `${sectionId}/${voiceId} has default voice`).not.toContain('feel SEEN, not labeled');
      }
    }
  });
});

// ── getAllSectionIds ──────────────────────────────────────────────────────────

describe('getAllSectionIds', () => {
  it('returns all 12 sections', () => {
    const ids = getAllSectionIds();
    expect(ids).toHaveLength(12);
    expect(ids[0]).toBe('RS01');
    expect(ids[11]).toBe('RS12');
  });
});
