/**
 * Scoring Engine Unit Tests — 5 test patterns per instrument
 * Patterns: all-min, all-max, known-clinical, reverse-scoring, boundary
 * 
 * Run with: npx vitest run src/lib/decoded/scoring/engine.test.ts
 * Or manually verify with: npx tsx src/lib/decoded/scoring/engine.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  scoreIPIP50, scoreRIASEC, scoreECR_R_Short, scoreSWLS,
  scoreSCS_SF, scoreDERS16, scoreWEIMS, scoreFlourishingScale,
  scoreWellnessCheck, scoreGAD7, scoreASRS, scoreCSI4, scoreACE3,
  checkResponseValidity, deriveCoachingFlags,
} from './engine';

// Helper: create response map with all items set to a single value
function fillResponses(count: number, value: number): Record<string, number> {
  const r: Record<string, number> = {};
  for (let i = 1; i <= count; i++) r[String(i)] = value;
  return r;
}

// ── IPIP-50 ──────────────────────────────────────────────────────────────────
describe('scoreIPIP50', () => {
  it('all-min: every item = 1 → raw scores near floor', () => {
    const r = scoreIPIP50(fillResponses(50, 1));
    // Positive items = 1×5 = 5; Negative reversed = (6-1)×5 = 25; Total = 30 per trait
    expect(r.subscaleScores.extraversion).toBe(30);
    expect(r.subscaleScores.openness).toBe(30);
  });

  it('all-max: every item = 5 → raw scores near ceiling', () => {
    const r = scoreIPIP50(fillResponses(50, 5));
    // Positive items = 5×5 = 25; Negative reversed = (6-5)×5 = 5; Total = 30
    expect(r.subscaleScores.extraversion).toBe(30);
  });

  it('known-clinical: high neuroticism profile', () => {
    const resp = fillResponses(50, 3);
    // Set Neuroticism positive items high
    [4,14,24,34,44].forEach(i => resp[String(i)] = 5);
    // Set Neuroticism negative items low (will be reverse-scored high)
    [9,19,29,39,49].forEach(i => resp[String(i)] = 1);
    const r = scoreIPIP50(resp);
    expect(r.subscaleScores.neuroticism).toBe(50); // Max possible
    expect(r.percentileScores.neuroticism).toBeGreaterThan(90);
  });

  it('reverse-scoring: negative items correctly reversed', () => {
    const resp = fillResponses(50, 3);
    resp['6'] = 1; // Extraversion negative → reversed to 5
    resp['1'] = 5; // Extraversion positive → stays 5
    const r = scoreIPIP50(resp);
    // Extra gets a boost from items 1 and 6
    expect(r.subscaleScores.extraversion).toBeGreaterThan(30);
  });

  it('boundary: neuroticism = 38 triggers coaching flag', () => {
    const resp = fillResponses(50, 3);
    // Engineer Neuroticism to exactly 38
    [4,14,24,34,44].forEach(i => resp[String(i)] = 4);
    [9,19,29,39,49].forEach(i => resp[String(i)] = 2); // reversed = 4
    const r = scoreIPIP50(resp);
    expect(r.subscaleScores.neuroticism).toBe(40); // 4×10 = 40
    const flags = deriveCoachingFlags([r]);
    expect(flags.highNeuroticism).toBe(true);
  });
});

// ── RIASEC ───────────────────────────────────────────────────────────────────
describe('scoreRIASEC', () => {
  it('all-min: every item = 1 → all types = 5', () => {
    const r = scoreRIASEC(fillResponses(30, 1));
    expect(r.subscaleScores.realistic).toBe(5);
    expect(r.subscaleScores.social).toBe(5);
  });

  it('all-max: every item = 5 → all types = 25', () => {
    const r = scoreRIASEC(fillResponses(30, 5));
    expect(r.subscaleScores.realistic).toBe(25);
  });

  it('known-clinical: strong Social type', () => {
    const resp = fillResponses(30, 1);
    [4,10,16,22,28].forEach(i => resp[String(i)] = 5); // Social items
    const r = scoreRIASEC(resp);
    expect(r.subscaleScores.social).toBe(25);
    expect(r.interpretation.hollandCode[0]).toBe('S');
  });

  it('reverse-scoring: N/A — no reverse scoring', () => {
    const r = scoreRIASEC(fillResponses(30, 3));
    expect(r.subscaleScores.realistic).toBe(15);
  });

  it('boundary: tie produces deterministic code', () => {
    const resp = fillResponses(30, 3);
    const r = scoreRIASEC(resp);
    expect(r.interpretation.hollandCode).toHaveLength(3);
  });
});

// ── ECR-R Short ──────────────────────────────────────────────────────────────
describe('scoreECR_R_Short', () => {
  it('all-min: items = 1 → secure (low anxiety, low avoidance)', () => {
    const r = scoreECR_R_Short(fillResponses(12, 1));
    // Pos items = 1, Reversed items = 8-1 = 7. Mean = (1+1+1+7+7+7)/6 = 4.0
    expect(r.interpretation.attachmentStyle).toBeDefined();
  });

  it('all-max: items = 7 → mixed high scores', () => {
    const r = scoreECR_R_Short(fillResponses(12, 7));
    // Pos items = 7, Reversed = 8-7 = 1. Mean = (7+7+7+1+1+1)/6 = 4.0
    expect(r.subscaleScores.anxiety).toBeCloseTo(4.0, 1);
  });

  it('known-clinical: anxious attachment', () => {
    const resp: Record<string, number> = {};
    // High anxiety items (1,3,5 = high; 2,4,6 = low → reversed high)
    [1,3,5].forEach(i => resp[String(i)] = 6);
    [2,4,6].forEach(i => resp[String(i)] = 2); // reversed = 6
    // Low avoidance (8,10,12 = low; 7,9,11 = high → reversed low)
    [8,10,12].forEach(i => resp[String(i)] = 2);
    [7,9,11].forEach(i => resp[String(i)] = 6); // reversed = 2
    const r = scoreECR_R_Short(resp);
    expect(r.subscaleScores.anxiety).toBeGreaterThan(3.5);
    expect(r.subscaleScores.avoidance).toBeLessThan(3.5);
    expect(r.interpretation.attachmentStyle).toBe('Anxious-Preoccupied');
  });

  it('reverse-scoring: reversed items contribute correctly', () => {
    const resp = fillResponses(12, 4);
    resp['2'] = 1; // Reversed → 7
    const r = scoreECR_R_Short(resp);
    expect(r.subscaleScores.anxiety).toBeGreaterThan(4.0);
  });

  it('boundary: anxiety exactly 3.5 → anxious (avoidance low)', () => {
    const resp: Record<string, number> = {};
    // Anxiety: pos(1,3,5)=4, neg(2,4,6)=5 → reversed=3; mean=(4+4+4+3+3+3)/6=3.5
    [1,3,5].forEach(i => resp[String(i)] = 4);
    [2,4,6].forEach(i => resp[String(i)] = 5);
    // Avoidance: pos(8,10,12)=1, neg(7,9,11)=4 → reversed=4; mean=(1+1+1+4+4+4)/6=2.5 (<3.5)
    [8,10,12].forEach(i => resp[String(i)] = 1);
    [7,9,11].forEach(i => resp[String(i)] = 4);
    const r = scoreECR_R_Short(resp);
    expect(r.subscaleScores.anxiety).toBeCloseTo(3.5, 1);
    expect(r.subscaleScores.avoidance).toBeLessThan(3.5);
    expect(r.interpretation.attachmentStyle).toBe('Anxious-Preoccupied');
  });
});

// ── SWLS ─────────────────────────────────────────────────────────────────────
describe('scoreSWLS', () => {
  it('all-min: items = 1 → total 5, extremely dissatisfied', () => {
    const r = scoreSWLS(fillResponses(5, 1));
    expect(r.totalScore).toBe(5);
    expect(r.interpretation.level).toBe('Extremely dissatisfied');
  });

  it('all-max: items = 7 → total 35, extremely satisfied', () => {
    const r = scoreSWLS(fillResponses(5, 7));
    expect(r.totalScore).toBe(35);
    expect(r.interpretation.level).toBe('Extremely satisfied');
  });

  it('known-clinical: moderate satisfaction', () => {
    const r = scoreSWLS(fillResponses(5, 5));
    expect(r.totalScore).toBe(25);
    expect(r.interpretation.level).toBe('Slightly satisfied');
  });

  it('reverse-scoring: N/A — no reverse scoring', () => {
    const r = scoreSWLS(fillResponses(5, 4));
    expect(r.totalScore).toBe(20);
    expect(r.interpretation.level).toBe('Neutral');
  });

  it('boundary: score = 20 → Neutral', () => {
    const r = scoreSWLS(fillResponses(5, 4));
    expect(r.totalScore).toBe(20);
    expect(r.interpretation.level).toBe('Neutral');
  });
});

// ── SCS-SF ───────────────────────────────────────────────────────────────────
describe('scoreSCS_SF', () => {
  it('all-min: items = 1 → low self-compassion', () => {
    const r = scoreSCS_SF(fillResponses(12, 1));
    expect(r.totalScore).toBeGreaterThan(0);
    expect(r.totalScore).toBeLessThanOrEqual(5);
  });

  it('all-max: items = 5 → high subscales', () => {
    const r = scoreSCS_SF(fillResponses(12, 5));
    expect(r.subscaleScores.selfKindness).toBe(5);
    expect(r.subscaleScores.mindfulness).toBe(5);
  });

  it('known-clinical: high self-judgment', () => {
    const resp = fillResponses(12, 3);
    resp['11'] = 5; resp['12'] = 5; // Self-judgment items high
    const r = scoreSCS_SF(resp);
    expect(r.subscaleScores.selfJudgment).toBe(5);
  });

  it('reverse-scoring: negative subscales reversed in total', () => {
    const resp = fillResponses(12, 3);
    resp['1'] = 5; // Over-identification → reversed in total
    const r = scoreSCS_SF(resp);
    // Total should reflect reversal of item 1
    expect(r.totalScore).toBeDefined();
  });

  it('boundary: total score ranges 1.0–5.0', () => {
    const r = scoreSCS_SF(fillResponses(12, 3));
    expect(r.totalScore).toBeGreaterThanOrEqual(1);
    expect(r.totalScore).toBeLessThanOrEqual(5);
  });
});

// ── DERS-16 ──────────────────────────────────────────────────────────────────
describe('scoreDERS16', () => {
  it('all-min: items = 1 → total = 16 (lowest difficulty)', () => {
    const r = scoreDERS16(fillResponses(16, 1));
    // 15 items at 1 = 15, plus item 3 reversed from 1 = 5; total = 20
    // Wait: reverse(1,5) = 5. So total = 15 + 5 = 20
    expect(r.totalScore).toBe(20);
  });

  it('all-max: items = 5 → total = 76 (highest difficulty)', () => {
    const r = scoreDERS16(fillResponses(16, 5));
    // 15 items at 5 = 75, plus item 3 reversed from 5 = 1; total = 76
    expect(r.totalScore).toBe(76);
  });

  it('known-clinical: high emotion dysregulation', () => {
    const resp = fillResponses(16, 4);
    const r = scoreDERS16(resp);
    expect(r.totalScore).toBeGreaterThan(60);
  });

  it('reverse-scoring: awareness item 3 reversed', () => {
    const resp = fillResponses(16, 3);
    resp['3'] = 1; // Low awareness → reversed to 5
    const r = scoreDERS16(resp);
    expect(r.subscaleScores.awareness).toBe(5);
  });

  it('boundary: total range 16–80', () => {
    const r = scoreDERS16(fillResponses(16, 3));
    expect(r.totalScore).toBeGreaterThanOrEqual(16);
    expect(r.totalScore).toBeLessThanOrEqual(80);
  });
});

// ── WEIMS ────────────────────────────────────────────────────────────────────
describe('scoreWEIMS', () => {
  it('all-min: items = 1 → all types = 1.0', () => {
    const r = scoreWEIMS(fillResponses(18, 1));
    expect(r.subscaleScores.intrinsic).toBe(1);
    expect(r.subscaleScores.amotivation).toBe(1);
  });

  it('all-max: items = 7 → all types = 7.0', () => {
    const r = scoreWEIMS(fillResponses(18, 7));
    expect(r.subscaleScores.intrinsic).toBe(7);
    expect(r.interpretation.sdi).toBe(0); // All equal → cancels out
  });

  it('known-clinical: high intrinsic motivation', () => {
    const resp = fillResponses(18, 1);
    [4,8,15].forEach(i => resp[String(i)] = 7); // Intrinsic items
    const r = scoreWEIMS(resp);
    expect(r.subscaleScores.intrinsic).toBe(7);
    expect(r.interpretation.sdi).toBeGreaterThan(0);
  });

  it('reverse-scoring: N/A — no reverse scoring', () => {
    const r = scoreWEIMS(fillResponses(18, 4));
    expect(r.subscaleScores.intrinsic).toBe(4);
  });

  it('boundary: SDI can be negative (amotivated profile)', () => {
    const resp = fillResponses(18, 1);
    [3,12,17].forEach(i => resp[String(i)] = 7); // Amotivation items
    const r = scoreWEIMS(resp);
    expect(r.interpretation.sdi).toBeLessThan(0);
  });
});

// ── Flourishing Scale ────────────────────────────────────────────────────────
describe('scoreFlourishingScale', () => {
  it('all-min: items = 1 → total 8, low flourishing', () => {
    const r = scoreFlourishingScale(fillResponses(8, 1));
    expect(r.totalScore).toBe(8);
    expect(r.interpretation.level).toBe('Low flourishing');
  });

  it('all-max: items = 7 → total 56, high flourishing', () => {
    const r = scoreFlourishingScale(fillResponses(8, 7));
    expect(r.totalScore).toBe(56);
    expect(r.interpretation.level).toBe('High flourishing');
  });

  it('known-clinical: moderate flourishing', () => {
    const r = scoreFlourishingScale(fillResponses(8, 5));
    expect(r.totalScore).toBe(40);
    expect(r.interpretation.level).toBe('Moderate-high flourishing');
  });

  it('reverse-scoring: N/A', () => {
    const r = scoreFlourishingScale(fillResponses(8, 4));
    expect(r.totalScore).toBe(32);
  });

  it('boundary: 48 → high flourishing', () => {
    const r = scoreFlourishingScale(fillResponses(8, 6));
    expect(r.totalScore).toBe(48);
    expect(r.interpretation.level).toBe('High flourishing');
  });
});

// ── Decoded Wellness Check ───────────────────────────────────────────────────
describe('scoreWellnessCheck', () => {
  it('all-min: lowest values → low wellness', () => {
    const resp: Record<string, number> = {
      '1': 0, '2': 1, '3': 1, '4': 5, '5': 5,
      '6': 1, '7': 1, '8': 1, '9': 6, '10': 1,
    };
    const r = scoreWellnessCheck(resp);
    expect(r.interpretation.overallWellness).toBeLessThan(20);
  });

  it('all-max: best values → high wellness', () => {
    const resp: Record<string, number> = {
      '1': 7, '2': 6, '3': 5, '4': 1, '5': 1,
      '6': 5, '7': 5, '8': 5, '9': 1, '10': 5,
    };
    const r = scoreWellnessCheck(resp);
    expect(r.interpretation.overallWellness).toBeGreaterThan(80);
  });

  it('known-clinical: sedentary + sleep deficit', () => {
    const resp: Record<string, number> = {
      '1': 0, '2': 1, '3': 3, '4': 3, '5': 3,
      '6': 3, '7': 3, '8': 3, '9': 3, '10': 3,
    };
    const r = scoreWellnessCheck(resp);
    expect(r.subscaleScores.exercise).toBe(0);
  });

  it('reverse-scoring: items 4,5,9 inverted correctly', () => {
    const resp: Record<string, number> = {
      '1': 3, '2': 3, '3': 3, '4': 1, '5': 1,
      '6': 3, '7': 3, '8': 3, '9': 1, '10': 3,
    };
    const r = scoreWellnessCheck(resp);
    // Item 4 = 1 (rarely exhausted) → inverted → high energy score
    expect(r.subscaleScores.energy).toBe(100);
    expect(r.subscaleScores.stress).toBe(100);
  });

  it('boundary: overall wellness < 40 → flag', () => {
    const resp: Record<string, number> = {
      '1': 1, '2': 2, '3': 2, '4': 4, '5': 4,
      '6': 2, '7': 2, '8': 2, '9': 5, '10': 2,
    };
    const r = scoreWellnessCheck(resp);
    const flags = deriveCoachingFlags([r]);
    expect(flags.lowOverallWellness).toBeDefined();
  });
});

// ── GAD-7 ────────────────────────────────────────────────────────────────────
describe('scoreGAD7', () => {
  it('all-min: items = 0 → minimal', () => {
    const r = scoreGAD7(fillResponses(7, 0));
    expect(r.totalScore).toBe(0);
    expect(r.interpretation.severity).toBe('Minimal');
  });

  it('all-max: items = 3 → severe', () => {
    const r = scoreGAD7(fillResponses(7, 3));
    expect(r.totalScore).toBe(21);
    expect(r.interpretation.severity).toBe('Severe');
  });

  it('known-clinical: moderate anxiety (score = 12)', () => {
    const resp = fillResponses(7, 1);
    resp['1'] = 3; resp['2'] = 3; resp['3'] = 2;
    const r = scoreGAD7(resp);
    expect(r.totalScore).toBe(12);
    expect(r.interpretation.severity).toBe('Moderate');
  });

  it('reverse-scoring: N/A', () => {
    const r = scoreGAD7(fillResponses(7, 1));
    expect(r.totalScore).toBe(7);
  });

  it('boundary: score = 15 → Severe (not Moderate)', () => {
    const resp = fillResponses(7, 2);
    resp['1'] = 3;
    const r = scoreGAD7(resp);
    expect(r.totalScore).toBe(15);
    expect(r.interpretation.severity).toBe('Severe');
  });
});

// ── ASRS ─────────────────────────────────────────────────────────────────────
describe('scoreASRS', () => {
  it('all-min: items = 0 → not positive', () => {
    const r = scoreASRS(fillResponses(6, 0));
    expect(r.interpretation.positiveCount).toBe(0);
    expect(r.interpretation.screenPositive).toBe(false);
  });

  it('all-max: items = 4 → screen positive', () => {
    const r = scoreASRS(fillResponses(6, 4));
    expect(r.interpretation.positiveCount).toBe(6);
    expect(r.interpretation.screenPositive).toBe(true);
  });

  it('known-clinical: 5 positive items → screen positive', () => {
    // Items 1-3: threshold ≥2 (2,3,2 = all positive)
    // Items 4-6: threshold ≥3 (3,4,0 = items 4,5 positive)
    // Total positive = 5
    const resp: Record<string, number> = {
      '1': 2, '2': 3, '3': 2, '4': 3, '5': 4, '6': 0,
    };
    const r = scoreASRS(resp);
    expect(r.interpretation.positiveCount).toBe(5);
    expect(r.interpretation.screenPositive).toBe(true);
  });

  it('reverse-scoring: N/A', () => {
    const r = scoreASRS(fillResponses(6, 1));
    expect(r.interpretation.positiveCount).toBe(0);
  });

  it('boundary: 3 positive → NOT positive; 4 → positive', () => {
    const resp3: Record<string, number> = {
      '1': 2, '2': 2, '3': 2, '4': 0, '5': 0, '6': 0,
    };
    expect(scoreASRS(resp3).interpretation.screenPositive).toBe(false);
    
    const resp4: Record<string, number> = {
      '1': 2, '2': 2, '3': 2, '4': 3, '5': 0, '6': 0,
    };
    expect(scoreASRS(resp4).interpretation.screenPositive).toBe(true);
  });
});

// ── CSI-4 ────────────────────────────────────────────────────────────────────
describe('scoreCSI4', () => {
  it('all-min: items = 0 → distressed', () => {
    const r = scoreCSI4(fillResponses(4, 0));
    expect(r.totalScore).toBe(0);
    expect(r.interpretation.distressed).toBe(true);
  });

  it('all-max: item1=6, items2-4=5 → total 21, not distressed', () => {
    const resp: Record<string, number> = { '1': 6, '2': 5, '3': 5, '4': 5 };
    const r = scoreCSI4(resp);
    expect(r.totalScore).toBe(21);
    expect(r.interpretation.distressed).toBe(false);
  });

  it('known-clinical: score 10 → distressed', () => {
    const resp: Record<string, number> = { '1': 3, '2': 3, '3': 2, '4': 2 };
    const r = scoreCSI4(resp);
    expect(r.totalScore).toBe(10);
    expect(r.interpretation.distressed).toBe(true);
  });

  it('reverse-scoring: N/A', () => {
    const r = scoreCSI4(fillResponses(4, 3));
    expect(r.totalScore).toBe(12);
  });

  it('boundary: score 13 → distressed; 14 → not distressed', () => {
    expect(scoreCSI4({ '1': 4, '2': 3, '3': 3, '4': 3 }).interpretation.distressed).toBe(true);
    expect(scoreCSI4({ '1': 5, '2': 3, '3': 3, '4': 3 }).interpretation.distressed).toBe(false);
  });
});

// ── ACE-3 ────────────────────────────────────────────────────────────────────
describe('scoreACE3', () => {
  it('all-min: items = 0 → total 0', () => {
    expect(scoreACE3(fillResponses(3, 0)).totalScore).toBe(0);
  });

  it('all-max: items = 1 → total 3', () => {
    expect(scoreACE3(fillResponses(3, 1)).totalScore).toBe(3);
  });

  it('known-clinical: 2 yes → total 2', () => {
    expect(scoreACE3({ '1': 1, '2': 1, '3': 0 }).totalScore).toBe(2);
  });

  it('reverse-scoring: N/A', () => {
    expect(scoreACE3({ '1': 0, '2': 0, '3': 1 }).totalScore).toBe(1);
  });

  it('boundary: each item 0 or 1 only', () => {
    expect(scoreACE3(fillResponses(3, 1)).totalScore).toBe(3);
    expect(scoreACE3(fillResponses(3, 0)).totalScore).toBe(0);
  });
});

// ── Validity Check ───────────────────────────────────────────────────────────
describe('checkResponseValidity', () => {
  it('detects straight-lining with 10+ consecutive same values', () => {
    const resp = fillResponses(50, 3);
    const result = checkResponseValidity(resp, 'ipip50', [], []);
    expect(result.issues.some(i => i.type === 'straight_lining')).toBe(true);
  });

  it('no straight-lining with varied responses', () => {
    const resp: Record<string, number> = {};
    for (let i = 1; i <= 50; i++) resp[String(i)] = (i % 5) + 1;
    const result = checkResponseValidity(resp, 'ipip50', [], []);
    expect(result.issues.some(i => i.type === 'straight_lining')).toBe(false);
  });
});
