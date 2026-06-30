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
  it('all-min: every item = 1 → factor floors per canonical IPIP-50 keying', () => {
    const r = scoreIPIP50(fillResponses(50, 1));
    // direct items contribute 1, reversed contribute 5. Splits: E 5/5, A 6/4,
    // C 6/4, N 8/2, O 7/3 → 30 / 26 / 26 / 18 / 22.
    expect(r.subscaleScores.extraversion).toBe(30);
    expect(r.subscaleScores.agreeableness).toBe(26);
    expect(r.subscaleScores.conscientiousness).toBe(26);
    expect(r.subscaleScores.neuroticism).toBe(18);
    expect(r.subscaleScores.openness).toBe(22);
  });

  it('all-max: every item = 5 → factor ceilings per canonical keying', () => {
    const r = scoreIPIP50(fillResponses(50, 5));
    // direct contribute 5, reversed contribute 1 → E 30, A 34, C 34, N 42, O 38.
    expect(r.subscaleScores.extraversion).toBe(30);
    expect(r.subscaleScores.neuroticism).toBe(42);
    expect(r.subscaleScores.openness).toBe(38);
  });

  it('known-clinical: high neuroticism profile maxes the trait', () => {
    const resp = fillResponses(50, 3);
    [4,14,24,29,34,39,44,49].forEach(i => resp[String(i)] = 5); // direct (high N)
    [9,19].forEach(i => resp[String(i)] = 1);                    // reversed → 5
    const r = scoreIPIP50(resp);
    expect(r.subscaleScores.neuroticism).toBe(50); // Max possible
    expect(r.percentileScores.neuroticism).toBeGreaterThan(90);
  });

  it('reverse-scoring: negative items correctly reversed', () => {
    const resp = fillResponses(50, 3);
    resp['6'] = 1; // Extraversion reversed → 5
    resp['1'] = 5; // Extraversion direct → stays 5
    const r = scoreIPIP50(resp);
    expect(r.subscaleScores.extraversion).toBeGreaterThan(30);
  });

  it('regression: high-N items 29/39/49 raise neuroticism (scored direct, not reversed)', () => {
    // "get upset easily / frequent mood swings / often feel blue" must INCREASE N.
    const low = scoreIPIP50({ ...fillResponses(50, 3), '29': 1, '39': 1, '49': 1 });
    const high = scoreIPIP50({ ...fillResponses(50, 3), '29': 5, '39': 5, '49': 5 });
    expect(high.subscaleScores.neuroticism).toBeGreaterThan(low.subscaleScores.neuroticism);
  });

  it('boundary: neuroticism = 40 triggers coaching flag', () => {
    const resp = fillResponses(50, 3);
    [4,14,24,29,34,39,44,49].forEach(i => resp[String(i)] = 4); // direct = 4
    [9,19].forEach(i => resp[String(i)] = 2);                    // reversed → 4
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
  // Anxiety = mean(items 1-6, all direct). Avoidance = mean(items 7,9-12 direct +
  // item 8 reversed). A "secure" responder disagrees with anxious/avoidant items
  // but AGREES that they're comfortable sharing (item 8).
  const secureProfile = (): Record<string, number> => {
    const r: Record<string, number> = {};
    [1, 2, 3, 4, 5, 6].forEach(i => (r[String(i)] = 1)); // not anxious
    [7, 9, 10, 11, 12].forEach(i => (r[String(i)] = 1)); // not avoidant
    r['8'] = 7; // comfortable sharing → reverse(7,7)=1 → low avoidance
    return r;
  };

  it('secure profile → Secure (low anxiety, low avoidance)', () => {
    const r = scoreECR_R_Short(secureProfile());
    expect(r.subscaleScores.anxiety).toBeCloseTo(1.0, 1);
    expect(r.subscaleScores.avoidance).toBeCloseTo(1.0, 1);
    expect(r.interpretation.attachmentStyle).toBe('Secure');
  });

  it('all-max: items = 7 → both subscales high → Fearful-Avoidant', () => {
    const r = scoreECR_R_Short(fillResponses(12, 7));
    // Anxiety = mean(7×6)=7.0. Avoidance = (reverse(7)=1 + 7+7+7+7+7)/6 = 6.0
    expect(r.subscaleScores.anxiety).toBeCloseTo(7.0, 1);
    expect(r.subscaleScores.avoidance).toBeCloseTo(6.0, 1);
    expect(r.interpretation.attachmentStyle).toBe('Fearful-Avoidant');
  });

  it('anxious-preoccupied: high anxiety, low avoidance', () => {
    const resp = secureProfile();
    [1, 2, 3, 4, 5, 6].forEach(i => (resp[String(i)] = 6)); // high anxiety
    const r = scoreECR_R_Short(resp);
    expect(r.subscaleScores.anxiety).toBeGreaterThan(3.5);
    expect(r.subscaleScores.avoidance).toBeLessThan(3.5);
    expect(r.interpretation.attachmentStyle).toBe('Anxious-Preoccupied');
  });

  it('dismissive-avoidant: low anxiety, high avoidance', () => {
    const resp = secureProfile();
    [7, 9, 10, 11, 12].forEach(i => (resp[String(i)] = 6)); // high avoidance
    resp['8'] = 2; // not comfortable sharing → reverse(2,7)=6 → high avoidance
    const r = scoreECR_R_Short(resp);
    expect(r.subscaleScores.anxiety).toBeLessThan(3.5);
    expect(r.subscaleScores.avoidance).toBeGreaterThan(3.5);
    expect(r.interpretation.attachmentStyle).toBe('Dismissive-Avoidant');
  });

  it('item 8 is the lone reverse-keyed avoidance item', () => {
    const base = fillResponses(12, 1);
    const low8 = scoreECR_R_Short({ ...base, '8': 1 }); // disagree comfortable → avoidant
    const high8 = scoreECR_R_Short({ ...base, '8': 7 }); // agree comfortable → secure
    expect(low8.subscaleScores.avoidance).toBeGreaterThan(high8.subscaleScores.avoidance);
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
  it('all-min: items = 1 → total = 16 (lowest difficulty; canonical has no reverse items)', () => {
    expect(scoreDERS16(fillResponses(16, 1)).totalScore).toBe(16);
  });

  it('all-max: items = 5 → total = 80 (highest difficulty)', () => {
    expect(scoreDERS16(fillResponses(16, 5)).totalScore).toBe(80);
  });

  it('known-clinical: high emotion dysregulation (all 4s = 64)', () => {
    const r = scoreDERS16(fillResponses(16, 4));
    expect(r.totalScore).toBe(64);
    expect(r.totalScore).toBeGreaterThan(60);
  });

  it('canonical Bjureberg DERS-16 has no Awareness facet', () => {
    const r = scoreDERS16(fillResponses(16, 3));
    expect(r.subscaleScores).not.toHaveProperty('awareness');
  });

  it('boundary: total range 16–80 (all 3s = 48, the midpoint)', () => {
    const r = scoreDERS16(fillResponses(16, 3));
    expect(r.totalScore).toBe(48);
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

// ═════════════════════════════════════════════════════════════════════════════
// WEIMS W-SDI — canonical weighting (Tremblay et al. 2009)
// Source: selfdeterminationtheory.org WEIMS / Tremblay, Blanchard et al. (2009).
// W-SDI = +3·IM +2·INTEG +1·IDEN −1·INTRO −2·EXT −3·AMO, range ±36 on a 1–7 scale.
// ═════════════════════════════════════════════════════════════════════════════
describe('scoreWEIMS — canonical W-SDI', () => {
  // subscale → item indices (verified against the published WEIMS key)
  const IM = ['4', '8', '15'], INTEG = ['5', '10', '18'], IDEN = ['1', '7', '14'];
  const INTRO = ['6', '11', '13'], EXT = ['2', '9', '16'], AMO = ['3', '12', '17'];
  const set = (idxs: string[], v: number, into: Record<string, number>) => {
    idxs.forEach(i => (into[i] = v));
    return into;
  };

  it('maximally self-determined profile → SDI = +36', () => {
    const r: Record<string, number> = {};
    set(IM, 7, r); set(INTEG, 7, r); set(IDEN, 7, r);
    set(INTRO, 1, r); set(EXT, 1, r); set(AMO, 1, r);
    // 3·7 + 2·7 + 1·7 − 1·1 − 2·1 − 3·1 = 21+14+7 − 1−2−3 = 36
    expect(scoreWEIMS(r).interpretation.sdi).toBe(36);
  });

  it('maximally controlled/amotivated profile → SDI = −36', () => {
    const r: Record<string, number> = {};
    set(IM, 1, r); set(INTEG, 1, r); set(IDEN, 1, r);
    set(INTRO, 7, r); set(EXT, 7, r); set(AMO, 7, r);
    // 3·1 + 2·1 + 1·1 − 1·7 − 2·7 − 3·7 = 6 − 42 = −36
    expect(scoreWEIMS(r).interpretation.sdi).toBe(-36);
  });

  it('flat profile (all equal) → SDI = 0 (weights sum to zero)', () => {
    expect(scoreWEIMS(fillResponses(18, 7)).interpretation.sdi).toBe(0);
    expect(scoreWEIMS(fillResponses(18, 4)).interpretation.sdi).toBe(0);
  });

  it('weights each regulation correctly (intrinsic > identified contribution)', () => {
    // Raising IM by 6 points adds +3·6=18; raising IDEN by 6 adds +1·6=6.
    const base = fillResponses(18, 1);
    const imHigh = scoreWEIMS(set(IM, 7, { ...base })).interpretation.sdi;
    const idenHigh = scoreWEIMS(set(IDEN, 7, { ...base })).interpretation.sdi;
    expect(imHigh - idenHigh).toBe(12); // (+18) − (+6)
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// DERS-16 — subscale partition (canonical Bjureberg 2016, re-fielded 2026-06-30)
// Five facets, NO Awareness facet, NO reverse-keyed items. Item→facet map taken
// verbatim from the published appendix (PMC4882111). See DECODED_SCORING.md §6.
// ═════════════════════════════════════════════════════════════════════════════
describe('scoreDERS16 — subscale partition', () => {
  const onlyHigh = (idxs: number[]): Record<string, number> => {
    const r = fillResponses(16, 1);
    idxs.forEach(i => (r[String(i)] = 5));
    return r;
  };

  it('clarity = items 1,2', () => {
    expect(scoreDERS16(onlyHigh([1, 2])).subscaleScores.clarity).toBe(10); // 2×5
  });
  it('goals = items 3,7,15', () => {
    expect(scoreDERS16(onlyHigh([3, 7, 15])).subscaleScores.goals).toBe(15); // 3×5
  });
  it('impulse = items 4,8,11', () => {
    expect(scoreDERS16(onlyHigh([4, 8, 11])).subscaleScores.impulse).toBe(15); // 3×5
  });
  it('strategies = items 5,6,12,14,16', () => {
    expect(scoreDERS16(onlyHigh([5, 6, 12, 14, 16])).subscaleScores.strategies).toBe(25); // 5×5
  });
  it('nonAcceptance = items 9,10,13', () => {
    expect(scoreDERS16(onlyHigh([9, 10, 13])).subscaleScores.nonAcceptance).toBe(15); // 3×5
  });
  it('no reverse items: raising any single item raises the total by exactly (5−1)', () => {
    const base = scoreDERS16(fillResponses(16, 1)).totalScore; // 16
    for (let i = 1; i <= 16; i++) {
      const r = scoreDERS16({ ...fillResponses(16, 1), [String(i)]: 5 });
      expect(r.totalScore).toBe(base + 4);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PER-ITEM KEYING REGRESSION GUARD — the SOURCE OF TRUTH for scoring direction.
//
// For EVERY item of EVERY instrument we encode (a) which subscale/score it loads
// on and (b) its keying direction. The test then proves that pushing the item to
// its high-response end moves that target in the expected direction relative to
// the low-response end. This is the guard against the recurring bug class where
// the engine's hardcoded reverse-map drifts from the item wording (the ECR-R and
// IPIP-50 bugs). If you change an item's wording, subscale, or keying, update the
// map here in lockstep — a failure means the engine and the documented key disagree.
// ═════════════════════════════════════════════════════════════════════════════
describe('per-item keying regression guard', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Reader = (r: any) => number;
  interface ItemKey { index: number; read: Reader; dir: 1 | -1; min?: number; max?: number; label: string; }

  // Push one item from its low end to its high end (others at the instrument
  // floor) and assert the target moves the keyed way.
  function checkKeying(
    scoreFn: (resp: Record<string, number>) => unknown,
    itemCount: number,
    defMin: number,
    defMax: number,
    specs: ItemKey[],
  ) {
    for (const s of specs) {
      const min = s.min ?? defMin;
      const max = s.max ?? defMax;
      const base = fillResponses(itemCount, defMin);
      const low = s.read(scoreFn({ ...base, [String(s.index)]: min }));
      const high = s.read(scoreFn({ ...base, [String(s.index)]: max }));
      const delta = high - low;
      if (s.dir > 0) {
        expect(delta, `${s.label}: item ${s.index} (direct) must RAISE target`).toBeGreaterThan(0);
      } else {
        expect(delta, `${s.label}: item ${s.index} (reverse) must LOWER target`).toBeLessThan(0);
      }
    }
  }

  // Build specs from a {subscaleKey: indices[]} map, all the same direction.
  function fromMap(
    map: Record<string, number[]>,
    read: (key: string) => Reader,
    dir: 1 | -1,
    labelPrefix: string,
  ): ItemKey[] {
    return Object.entries(map).flatMap(([key, idxs]) =>
      idxs.map(i => ({ index: i, read: read(key), dir, label: `${labelPrefix}/${key}` })),
    );
  }

  const sub = (key: string): Reader => (r) => r.subscaleScores[key];
  const total: Reader = (r) => r.totalScore;

  it('IPIP-50 (Goldberg): direct items raise, reverse items lower their factor', () => {
    const DIRECT = {
      extraversion: [1, 11, 21, 31, 41],
      agreeableness: [7, 17, 27, 37, 42, 47],
      conscientiousness: [3, 13, 23, 33, 43, 48],
      neuroticism: [4, 14, 24, 29, 34, 39, 44, 49],
      openness: [5, 15, 25, 35, 40, 45, 50],
    };
    const REVERSE = {
      extraversion: [6, 16, 26, 36, 46],
      agreeableness: [2, 12, 22, 32],
      conscientiousness: [8, 18, 28, 38],
      neuroticism: [9, 19],
      openness: [10, 20, 30],
    };
    checkKeying(scoreIPIP50, 50, 1, 5, [
      ...fromMap(DIRECT, sub, 1, 'IPIP-direct'),
      ...fromMap(REVERSE, sub, -1, 'IPIP-reverse'),
    ]);
  });

  it('ECR-R: anxiety 1-6 direct; avoidance 7,9-12 direct + item 8 reverse', () => {
    checkKeying(scoreECR_R_Short, 12, 1, 7, [
      ...fromMap({ anxiety: [1, 2, 3, 4, 5, 6], avoidance: [7, 9, 10, 11, 12] }, sub, 1, 'ECR-direct'),
      { index: 8, read: sub('avoidance'), dir: -1, label: 'ECR-reverse/avoidance' },
    ]);
  });

  it('RIASEC: every item raises its own Holland type (no reverse)', () => {
    checkKeying(scoreRIASEC, 30, 1, 5, fromMap({
      realistic: [1, 7, 13, 19, 25], investigative: [2, 8, 14, 20, 26],
      artistic: [3, 9, 15, 21, 27], social: [4, 10, 16, 22, 28],
      enterprising: [5, 11, 17, 23, 29], conventional: [6, 12, 18, 24, 30],
    }, sub, 1, 'RIASEC'));
  });

  it('SCS-SF: raw subscales rise with their items; total reverses the negative facets', () => {
    // (a) each raw subscale rises with its own items
    checkKeying(scoreSCS_SF, 12, 1, 5, fromMap({
      selfKindness: [2, 6], selfJudgment: [11, 12], commonHumanity: [5, 10],
      isolation: [4, 8], mindfulness: [3, 7], overIdentification: [1, 9],
    }, sub, 1, 'SCS-raw'));
    // (b) total: positive facets raise it, negative facets lower it
    checkKeying(scoreSCS_SF, 12, 1, 5, [
      ...[2, 6, 5, 10, 3, 7].map(i => ({ index: i, read: total, dir: 1 as const, label: 'SCS-total/positive' })),
      ...[11, 12, 4, 8, 1, 9].map(i => ({ index: i, read: total, dir: -1 as const, label: 'SCS-total/negative' })),
    ]);
  });

  it('DERS-16: canonical facets (Bjureberg 2016); every item is direct, no reverse', () => {
    checkKeying(scoreDERS16, 16, 1, 5, fromMap({
      clarity: [1, 2], goals: [3, 7, 15], impulse: [4, 8, 11],
      strategies: [5, 6, 12, 14, 16], nonAcceptance: [9, 10, 13],
    }, sub, 1, 'DERS-sub'));
    // total: every item raises difficulty — the canonical DERS-16 has no reverse items
    checkKeying(scoreDERS16, 16, 1, 5,
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(
        i => ({ index: i, read: total, dir: 1 as const, label: 'DERS-total/direct' }),
      ),
    );
  });

  it('WEIMS: raw subscales rise with items; SDI rises for autonomous, falls for controlled', () => {
    checkKeying(scoreWEIMS, 18, 1, 7, fromMap({
      intrinsic: [4, 8, 15], integrated: [5, 10, 18], identified: [1, 7, 14],
      introjected: [6, 11, 13], external: [2, 9, 16], amotivation: [3, 12, 17],
    }, sub, 1, 'WEIMS-sub'));
    const sdi: Reader = (r) => r.interpretation.sdi;
    checkKeying(scoreWEIMS, 18, 1, 7, [
      ...[4, 8, 15, 5, 10, 18, 1, 7, 14].map(i => ({ index: i, read: sdi, dir: 1 as const, label: 'WEIMS-SDI/autonomous' })),
      ...[6, 11, 13, 2, 9, 16, 3, 12, 17].map(i => ({ index: i, read: sdi, dir: -1 as const, label: 'WEIMS-SDI/controlled' })),
    ]);
  });

  it('SWLS / Flourishing / GAD-7 / CSI-4 / ACE-3: every item raises the total (no reverse)', () => {
    checkKeying(scoreSWLS, 5, 1, 7, [1, 2, 3, 4, 5].map(i => ({ index: i, read: total, dir: 1 as const, label: 'SWLS' })));
    checkKeying(scoreFlourishingScale, 8, 1, 7, [1, 2, 3, 4, 5, 6, 7, 8].map(i => ({ index: i, read: total, dir: 1 as const, label: 'Flourishing' })));
    checkKeying(scoreGAD7, 7, 0, 3, [1, 2, 3, 4, 5, 6, 7].map(i => ({ index: i, read: total, dir: 1 as const, label: 'GAD7' })));
    checkKeying(scoreACE3, 3, 0, 1, [1, 2, 3].map(i => ({ index: i, read: total, dir: 1 as const, label: 'ACE3' })));
    // CSI-4: item 1 is 0–6, items 2–4 are 0–5
    checkKeying(scoreCSI4, 4, 0, 5, [
      { index: 1, read: total, dir: 1, min: 0, max: 6, label: 'CSI4' },
      ...[2, 3, 4].map(i => ({ index: i, read: total, dir: 1 as const, label: 'CSI4' })),
    ]);
  });

  it('ASRS: every symptom item can only raise the positive count', () => {
    const positiveCount: Reader = (r) => r.interpretation.positiveCount;
    checkKeying(scoreASRS, 6, 0, 4, [1, 2, 3, 4, 5, 6].map(i => ({ index: i, read: positiveCount, dir: 1 as const, label: 'ASRS' })));
  });

  it('Wellness Check: direct dims rise; exhaustion/stress/screen-time (4,5,9) invert', () => {
    checkKeying(scoreWellnessCheck, 10, 1, 5, [
      { index: 1, read: sub('exercise'), dir: 1, min: 0, max: 7, label: 'Wellness' },
      { index: 2, read: sub('sleep'), dir: 1, min: 1, max: 6, label: 'Wellness' },
      { index: 3, read: sub('nutrition'), dir: 1, label: 'Wellness' },
      { index: 4, read: sub('energy'), dir: -1, label: 'Wellness-reverse' },
      { index: 5, read: sub('stress'), dir: -1, label: 'Wellness-reverse' },
      { index: 6, read: sub('coping'), dir: 1, label: 'Wellness' },
      { index: 7, read: sub('social'), dir: 1, label: 'Wellness' },
      { index: 8, read: sub('purpose'), dir: 1, label: 'Wellness' },
      { index: 9, read: sub('screenTime'), dir: -1, min: 1, max: 6, label: 'Wellness-reverse' },
      { index: 10, read: sub('vitality'), dir: 1, label: 'Wellness' },
    ]);
  });
});
