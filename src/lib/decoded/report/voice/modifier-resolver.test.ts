/**
 * Modifier Resolver — Unit Tests (S08)
 *
 * Validates trigger evaluation (score_threshold, interpretation_match, compound),
 * safety flag overrides, deduplication, and edge cases.
 *
 * Run with: npx vitest run src/lib/decoded/report/voice/modifier-resolver.test.ts
 */

import { describe, it, expect } from 'vitest';
import type { InstrumentScore } from '../../scoring/types';
import { resolveModifiers, evaluateTrigger } from './modifier-resolver';
import { TONE_MODIFIERS } from './config';

// ── Test Fixtures ────────────────────────────────────────────────────────────

/** Create a minimal InstrumentScore for a given instrument */
function makeScore(
  instrumentId: string,
  overrides: {
    totalScore?: number;
    subscaleScores?: Record<string, number>;
    interpretation?: Record<string, string | boolean | number>;
  } = {},
): InstrumentScore {
  return {
    instrumentId,
    totalScore: overrides.totalScore,
    subscaleScores: overrides.subscaleScores ?? {},
    interpretation: overrides.interpretation ?? {},
  };
}

/** Default safety flags (no overrides) */
const NO_SAFETY = { highDistress: false };

// ── Compassion Boost Trigger ─────────────────────────────────────────────────

describe('compassion_boost trigger', () => {
  it('activates when SCS-SF totalScore ≤ 2.5', () => {
    const scores = [makeScore('scs_sf', { totalScore: 2.0 })];
    const result = resolveModifiers(scores, NO_SAFETY);
    const ids = result.modifiers.map((m) => m.id);
    expect(ids).toContain('compassion_boost');
  });

  it('activates when SCS-SF totalScore exactly 2.5', () => {
    const scores = [makeScore('scs_sf', { totalScore: 2.5 })];
    const result = resolveModifiers(scores, NO_SAFETY);
    const ids = result.modifiers.map((m) => m.id);
    expect(ids).toContain('compassion_boost');
  });

  it('does NOT activate when SCS-SF totalScore > 2.5 and selfJudgment < 4.0', () => {
    const scores = [makeScore('scs_sf', {
      totalScore: 3.0,
      subscaleScores: { selfJudgment: 3.5 },
    })];
    const result = resolveModifiers(scores, NO_SAFETY);
    const ids = result.modifiers.map((m) => m.id);
    expect(ids).not.toContain('compassion_boost');
  });

  it('activates when selfJudgment ≥ 4.0 (even if totalScore is fine)', () => {
    const scores = [makeScore('scs_sf', {
      totalScore: 3.5,
      subscaleScores: { selfJudgment: 4.0 },
    })];
    const result = resolveModifiers(scores, NO_SAFETY);
    const ids = result.modifiers.map((m) => m.id);
    expect(ids).toContain('compassion_boost');
  });
});

// ── Anxiety Softener Trigger ─────────────────────────────────────────────────

describe('anxiety_softener trigger', () => {
  it('activates when GAD-7 totalScore ≥ 10', () => {
    const scores = [makeScore('gad7', { totalScore: 12 })];
    const result = resolveModifiers(scores, NO_SAFETY);
    const ids = result.modifiers.map((m) => m.id);
    expect(ids).toContain('anxiety_softener');
  });

  it('activates at exactly 10', () => {
    const scores = [makeScore('gad7', { totalScore: 10 })];
    const result = resolveModifiers(scores, NO_SAFETY);
    expect(result.modifiers.map((m) => m.id)).toContain('anxiety_softener');
  });

  it('does NOT activate when GAD-7 < 10 and severity is Mild', () => {
    const scores = [makeScore('gad7', {
      totalScore: 7,
      interpretation: { severity: 'Mild' },
    })];
    const result = resolveModifiers(scores, NO_SAFETY);
    expect(result.modifiers.map((m) => m.id)).not.toContain('anxiety_softener');
  });

  it('activates when severity is "Moderate" (interpretation match)', () => {
    const scores = [makeScore('gad7', {
      totalScore: 7,
      interpretation: { severity: 'Moderate' },
    })];
    const result = resolveModifiers(scores, NO_SAFETY);
    expect(result.modifiers.map((m) => m.id)).toContain('anxiety_softener');
  });

  it('activates when severity is "Severe"', () => {
    const scores = [makeScore('gad7', {
      totalScore: 5,
      interpretation: { severity: 'Severe' },
    })];
    const result = resolveModifiers(scores, NO_SAFETY);
    expect(result.modifiers.map((m) => m.id)).toContain('anxiety_softener');
  });
});

// ── Emotion Regulation Buffer Trigger ────────────────────────────────────────

describe('emotion_regulation_buffer trigger', () => {
  it('activates when DERS-16 totalScore ≥ 52', () => {
    const scores = [makeScore('ders16', { totalScore: 55 })];
    const result = resolveModifiers(scores, NO_SAFETY);
    expect(result.modifiers.map((m) => m.id)).toContain('emotion_regulation_buffer');
  });

  it('activates at exactly 52', () => {
    const scores = [makeScore('ders16', { totalScore: 52 })];
    const result = resolveModifiers(scores, NO_SAFETY);
    expect(result.modifiers.map((m) => m.id)).toContain('emotion_regulation_buffer');
  });

  it('does NOT activate at 51', () => {
    const scores = [makeScore('ders16', { totalScore: 51 })];
    const result = resolveModifiers(scores, NO_SAFETY);
    expect(result.modifiers.map((m) => m.id)).not.toContain('emotion_regulation_buffer');
  });
});

// ── Attachment Sensitivity Trigger ───────────────────────────────────────────

describe('attachment_sensitivity trigger', () => {
  it('activates when ECR-R anxiety ≥ 3.5', () => {
    const scores = [makeScore('ecr_r_short', {
      subscaleScores: { anxiety: 4.0 },
    })];
    const result = resolveModifiers(scores, NO_SAFETY);
    expect(result.modifiers.map((m) => m.id)).toContain('attachment_sensitivity');
  });

  it('activates at exactly 3.5', () => {
    const scores = [makeScore('ecr_r_short', {
      subscaleScores: { anxiety: 3.5 },
    })];
    const result = resolveModifiers(scores, NO_SAFETY);
    expect(result.modifiers.map((m) => m.id)).toContain('attachment_sensitivity');
  });

  it('does NOT activate when anxiety < 3.5 and attachment is secure', () => {
    const scores = [makeScore('ecr_r_short', {
      subscaleScores: { anxiety: 2.0 },
      interpretation: { attachmentStyle: 'secure' },
    })];
    const result = resolveModifiers(scores, NO_SAFETY);
    expect(result.modifiers.map((m) => m.id)).not.toContain('attachment_sensitivity');
  });

  it('activates for anxious attachment style', () => {
    const scores = [makeScore('ecr_r_short', {
      subscaleScores: { anxiety: 2.0 },
      interpretation: { attachmentStyle: 'anxious' },
    })];
    const result = resolveModifiers(scores, NO_SAFETY);
    expect(result.modifiers.map((m) => m.id)).toContain('attachment_sensitivity');
  });

  it('activates for disorganized attachment style', () => {
    const scores = [makeScore('ecr_r_short', {
      subscaleScores: { anxiety: 2.0 },
      interpretation: { attachmentStyle: 'disorganized' },
    })];
    const result = resolveModifiers(scores, NO_SAFETY);
    expect(result.modifiers.map((m) => m.id)).toContain('attachment_sensitivity');
  });
});

// ── Safety Flag Overrides ────────────────────────────────────────────────────

describe('safety flag overrides', () => {
  it('highDistress forces compassion_boost + anxiety_softener', () => {
    const scores: InstrumentScore[] = []; // No scores at all
    const result = resolveModifiers(scores, { highDistress: true });
    const ids = result.modifiers.map((m) => m.id);
    expect(ids).toContain('compassion_boost');
    expect(ids).toContain('anxiety_softener');
    expect(result.safetyForced).toContain('compassion_boost');
    expect(result.safetyForced).toContain('anxiety_softener');
  });

  it('emotionalRegulationConcern forces emotion_regulation_buffer', () => {
    const scores: InstrumentScore[] = [];
    const result = resolveModifiers(scores, {
      highDistress: false,
      emotionalRegulationConcern: true,
    });
    expect(result.modifiers.map((m) => m.id)).toContain('emotion_regulation_buffer');
    expect(result.safetyForced).toContain('emotion_regulation_buffer');
  });

  it('explicit forceModifiers adds specified modifiers', () => {
    const scores: InstrumentScore[] = [];
    const result = resolveModifiers(scores, {
      highDistress: false,
      forceModifiers: ['attachment_sensitivity'],
    });
    expect(result.modifiers.map((m) => m.id)).toContain('attachment_sensitivity');
    expect(result.safetyForced).toContain('attachment_sensitivity');
  });

  it('deduplicates: trigger + safety force does not create duplicates', () => {
    // SCS-SF 2.0 triggers compassion_boost via threshold
    // highDistress also forces compassion_boost via safety
    const scores = [makeScore('scs_sf', { totalScore: 2.0 })];
    const result = resolveModifiers(scores, { highDistress: true });
    const compassionCount = result.modifiers.filter((m) => m.id === 'compassion_boost').length;
    expect(compassionCount).toBe(1);
    // It should still appear in safetyForced even though trigger activated it first
    expect(result.safetyForced).toContain('compassion_boost');
  });
});

// ── evaluateTrigger (direct unit tests) ──────────────────────────────────────

describe('evaluateTrigger', () => {
  it('score_threshold: gte operator', () => {
    const trigger = TONE_MODIFIERS.emotion_regulation_buffer.trigger;
    expect(evaluateTrigger(trigger, [makeScore('ders16', { totalScore: 52 })])).toBe(true);
    expect(evaluateTrigger(trigger, [makeScore('ders16', { totalScore: 51 })])).toBe(false);
  });

  it('score_threshold: lte operator (compassion boost first condition)', () => {
    const compassionTrigger = TONE_MODIFIERS.compassion_boost.trigger;
    // This is a compound trigger, but we can test the evaluator handles it
    expect(evaluateTrigger(compassionTrigger, [makeScore('scs_sf', { totalScore: 2.0 })])).toBe(true);
    expect(evaluateTrigger(compassionTrigger, [makeScore('scs_sf', { totalScore: 3.0 })])).toBe(false);
  });

  it('returns false when instrument is missing from scores', () => {
    const trigger = TONE_MODIFIERS.emotion_regulation_buffer.trigger;
    expect(evaluateTrigger(trigger, [])).toBe(false);
    expect(evaluateTrigger(trigger, [makeScore('ipip50', { totalScore: 100 })])).toBe(false);
  });

  it('compound OR: passes if any condition is true', () => {
    const trigger = TONE_MODIFIERS.anxiety_softener.trigger;
    // Only interpretation matches, score is low
    const scores = [makeScore('gad7', {
      totalScore: 3,
      interpretation: { severity: 'Severe' },
    })];
    expect(evaluateTrigger(trigger, scores)).toBe(true);
  });

  it('compound OR: fails if no condition is true', () => {
    const trigger = TONE_MODIFIERS.anxiety_softener.trigger;
    const scores = [makeScore('gad7', {
      totalScore: 5,
      interpretation: { severity: 'Mild' },
    })];
    expect(evaluateTrigger(trigger, scores)).toBe(false);
  });
});

// ── Multiple Modifiers Active Simultaneously ─────────────────────────────────

describe('multiple modifier activation', () => {
  it('can activate all 4 modifiers at once with extreme scores', () => {
    const scores = [
      makeScore('scs_sf', { totalScore: 1.5 }),
      makeScore('gad7', { totalScore: 18 }),
      makeScore('ders16', { totalScore: 70 }),
      makeScore('ecr_r_short', { subscaleScores: { anxiety: 5.0 } }),
    ];
    const result = resolveModifiers(scores, NO_SAFETY);
    expect(result.modifiers).toHaveLength(4);
    const ids = result.modifiers.map((m) => m.id);
    expect(ids).toContain('compassion_boost');
    expect(ids).toContain('anxiety_softener');
    expect(ids).toContain('emotion_regulation_buffer');
    expect(ids).toContain('attachment_sensitivity');
  });

  it('returns empty array when no triggers fire and no safety flags', () => {
    const scores = [
      makeScore('scs_sf', { totalScore: 4.0, subscaleScores: { selfJudgment: 2.0 } }),
      makeScore('gad7', { totalScore: 3, interpretation: { severity: 'Minimal' } }),
      makeScore('ders16', { totalScore: 30 }),
      makeScore('ecr_r_short', {
        subscaleScores: { anxiety: 2.0 },
        interpretation: { attachmentStyle: 'secure' },
      }),
    ];
    const result = resolveModifiers(scores, NO_SAFETY);
    expect(result.modifiers).toHaveLength(0);
    expect(result.safetyForced).toHaveLength(0);
  });
});

// ── Modifier Prompt Block Integrity ──────────────────────────────────────────

describe('modifier prompt integrity', () => {
  it('no modifier prompt block contains em dashes', () => {
    for (const modifier of Object.values(TONE_MODIFIERS)) {
      expect(modifier.promptBlock, `${modifier.id} promptBlock`).not.toContain('—');
    }
  });

  it('all modifiers have non-empty prompt blocks', () => {
    for (const modifier of Object.values(TONE_MODIFIERS)) {
      expect(modifier.promptBlock.length, `${modifier.id}`).toBeGreaterThan(50);
    }
  });

  it('all modifiers have at least one voiceInteraction', () => {
    for (const modifier of Object.values(TONE_MODIFIERS)) {
      const interactionCount = Object.keys(modifier.voiceInteractions).length;
      expect(interactionCount, `${modifier.id}`).toBeGreaterThanOrEqual(1);
    }
  });
});
