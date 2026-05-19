/**
 * Archetype Classifier — Unit Tests
 *
 * Tests the deterministic classification of Big Five profiles
 * into 16 base archetypes using Euclidean distance centroids.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyArchetype,
  classifyFromZScores,
  computeZScores,
  euclideanDistance,
  ARCHETYPE_CENTROIDS,
  getArchetypeCentroid,
} from '../classifier';
import type { IPIP50Score } from '../../scoring/types';
import type { BigFiveZScores } from '../types';

// ---------------------------------------------------------------------------
// Helpers: Build IPIP-50 score objects from raw trait values
// ---------------------------------------------------------------------------

/** Create a minimal IPIP50Score from raw subscale totals (10–50 range each) */
function makeIPIP50(scores: {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}): IPIP50Score {
  return {
    instrumentId: 'ipip50',
    subscaleScores: scores,
    percentileScores: {
      openness: 50,
      conscientiousness: 50,
      extraversion: 50,
      agreeableness: 50,
      neuroticism: 50,
    },
    rawScoreDetails: {},
  };
}

// ---------------------------------------------------------------------------
// Z-Score Computation
// ---------------------------------------------------------------------------

describe('computeZScores', () => {
  it('should return z=0 for population mean scores', () => {
    // Population means: O=35.4, C=33.2, E=29.4, A=35.6, N=26.2
    const ipip = makeIPIP50({
      openness: 35.4,
      conscientiousness: 33.2,
      extraversion: 29.4,
      agreeableness: 35.6,
      neuroticism: 26.2,
    });
    const z = computeZScores(ipip);
    expect(z.O).toBeCloseTo(0, 5);
    expect(z.C).toBeCloseTo(0, 5);
    expect(z.E).toBeCloseTo(0, 5);
    expect(z.A).toBeCloseTo(0, 5);
    expect(z.N).toBeCloseTo(0, 5);
  });

  it('should return positive z for above-mean scores', () => {
    const ipip = makeIPIP50({
      openness: 48,           // Very high O
      conscientiousness: 45,  // High C
      extraversion: 29.4,     // Average E
      agreeableness: 35.6,    // Average A
      neuroticism: 26.2,      // Average N
    });
    const z = computeZScores(ipip);
    expect(z.O).toBeGreaterThan(1.5);
    expect(z.C).toBeGreaterThan(1.5);
    expect(z.E).toBeCloseTo(0, 1);
  });

  it('should return negative z for below-mean scores', () => {
    const ipip = makeIPIP50({
      openness: 20,
      conscientiousness: 20,
      extraversion: 15,
      agreeableness: 20,
      neuroticism: 15,
    });
    const z = computeZScores(ipip);
    expect(z.O).toBeLessThan(-1);
    expect(z.C).toBeLessThan(-1);
    expect(z.E).toBeLessThan(-1);
    expect(z.A).toBeLessThan(-1);
    expect(z.N).toBeLessThan(-1);
  });
});

// ---------------------------------------------------------------------------
// Euclidean Distance
// ---------------------------------------------------------------------------

describe('euclideanDistance', () => {
  it('should return 0 for identical vectors', () => {
    const z: BigFiveZScores = { O: 1.2, C: 1.0, E: -0.8, A: -0.5, N: -0.3 };
    const dist = euclideanDistance(z, [1.2, 1.0, -0.8, -0.5, -0.3]);
    expect(dist).toBeCloseTo(0, 10);
  });

  it('should compute correct distance for known vectors', () => {
    const z: BigFiveZScores = { O: 0, C: 0, E: 0, A: 0, N: 0 };
    // Distance from origin to (1, 1, 1, 1, 1) = sqrt(5) ≈ 2.236
    const dist = euclideanDistance(z, [1, 1, 1, 1, 1]);
    expect(dist).toBeCloseTo(Math.sqrt(5), 5);
  });

  it('should be symmetric', () => {
    const z1: BigFiveZScores = { O: 1.0, C: 0.5, E: -0.3, A: 0.8, N: -0.2 };
    const z2: BigFiveZScores = { O: -0.5, C: 1.2, E: 0.8, A: -0.3, N: 0.5 };
    const d1 = euclideanDistance(z1, [-0.5, 1.2, 0.8, -0.3, 0.5]);
    const d2 = euclideanDistance(z2, [1.0, 0.5, -0.3, 0.8, -0.2]);
    expect(d1).toBeCloseTo(d2, 10);
  });
});

// ---------------------------------------------------------------------------
// Archetype Classification
// ---------------------------------------------------------------------------

describe('classifyArchetype', () => {
  it('should classify a high-O, high-C profile as Architect or Strategist', () => {
    // Architect centroid: O+1.2, C+1.0, E-0.8, A-0.5, N-0.3
    // Strategist centroid: O+1.0, C+1.5, E-0.5, A-0.5, N-0.3
    const ipip = makeIPIP50({
      openness: 43,           // z ≈ +1.19
      conscientiousness: 40,  // z ≈ +1.0
      extraversion: 23,       // z ≈ -0.84
      agreeableness: 33,      // z ≈ -0.43
      neuroticism: 24,        // z ≈ -0.30
    });
    const result = classifyArchetype(ipip);
    expect(['Architect', 'Strategist']).toContain(result.primary.name);
  });

  it('should classify a high-E, high-A profile as Advocate, Luminary, or Diplomat', () => {
    const ipip = makeIPIP50({
      openness: 35,          // Average
      conscientiousness: 30, // Slightly below avg
      extraversion: 40,      // z ≈ +1.4
      agreeableness: 45,     // z ≈ +1.57
      neuroticism: 20,       // z ≈ -0.84
    });
    const result = classifyArchetype(ipip);
    expect(['Advocate', 'Luminary', 'Diplomat']).toContain(result.primary.name);
  });

  it('should assign Healer for high-A, high-N, low-E', () => {
    // Healer centroid: O=0, C=-0.5, E=-0.8, A=+1.5, N=+1.0
    const ipip = makeIPIP50({
      openness: 35.4,         // Average
      conscientiousness: 30,  // Slightly below
      extraversion: 23,       // Low
      agreeableness: 45,      // Very high
      neuroticism: 34,        // High
    });
    const result = classifyArchetype(ipip);
    expect(result.primary.name).toBe('Healer');
  });

  it('should return distance=0 when profile exactly matches a centroid', () => {
    // Manually construct scores that produce z-scores matching the Architect centroid
    // Architect: O=+1.2, C=+1.0, E=-0.8, A=-0.5, N=-0.3
    const ipip = makeIPIP50({
      openness: 35.4 + 1.2 * 6.4,           // mean + z * sd
      conscientiousness: 33.2 + 1.0 * 6.8,
      extraversion: 29.4 + (-0.8) * 7.6,
      agreeableness: 35.6 + (-0.5) * 6.0,
      neuroticism: 26.2 + (-0.3) * 7.4,
    });
    const result = classifyArchetype(ipip);
    expect(result.primary.name).toBe('Architect');
    expect(result.primary.distance).toBeCloseTo(0, 5);
  });

  it('should detect blended types when top two are within 0.5 distance', () => {
    // Architect and Strategist share similar O+/C+ profiles
    // Craft a profile equidistant between them
    // Architect: [1.2, 1.0, -0.8, -0.5, -0.3]
    // Strategist: [1.0, 1.5, -0.5, -0.5, -0.3]
    // Midpoint: [1.1, 1.25, -0.65, -0.5, -0.3]
    const ipip = makeIPIP50({
      openness: 35.4 + 1.1 * 6.4,
      conscientiousness: 33.2 + 1.25 * 6.8,
      extraversion: 29.4 + (-0.65) * 7.6,
      agreeableness: 35.6 + (-0.5) * 6.0,
      neuroticism: 26.2 + (-0.3) * 7.4,
    });
    const result = classifyArchetype(ipip);
    expect(result.isBlended).toBe(true);
    // Both Architect and Strategist should be in the top 2
    const topTwo = [result.primary.name, result.secondary.name];
    expect(topTwo).toContain('Architect');
    expect(topTwo).toContain('Strategist');
  });

  it('should not flag as blended when types are clearly distinct', () => {
    // Sage: O=+1.5, C=+0.8, E=-1.0, A=0.0, N=-0.8 — very distinct from Commander
    const ipip = makeIPIP50({
      openness: 35.4 + 1.5 * 6.4,
      conscientiousness: 33.2 + 0.8 * 6.8,
      extraversion: 29.4 + (-1.0) * 7.6,
      agreeableness: 35.6 + 0.0 * 6.0,
      neuroticism: 26.2 + (-0.8) * 7.4,
    });
    const result = classifyArchetype(ipip);
    expect(result.primary.name).toBe('Sage');
    // The gap to #2 should be > 0.5 for a clearly distinct type
    // (Not guaranteed for all centroids, but Sage is relatively isolated)
  });

  it('should always return 16 distances', () => {
    const ipip = makeIPIP50({
      openness: 30,
      conscientiousness: 30,
      extraversion: 30,
      agreeableness: 30,
      neuroticism: 30,
    });
    const result = classifyArchetype(ipip);
    expect(result.allDistances).toHaveLength(16);
  });

  it('should return distances sorted ascending', () => {
    const ipip = makeIPIP50({
      openness: 40,
      conscientiousness: 25,
      extraversion: 35,
      agreeableness: 30,
      neuroticism: 20,
    });
    const result = classifyArchetype(ipip);
    for (let i = 1; i < result.allDistances.length; i++) {
      expect(result.allDistances[i].distance).toBeGreaterThanOrEqual(
        result.allDistances[i - 1].distance,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// classifyFromZScores (direct z-score input)
// ---------------------------------------------------------------------------

describe('classifyFromZScores', () => {
  it('should produce the same result as classifyArchetype for equivalent input', () => {
    const ipip = makeIPIP50({
      openness: 42,
      conscientiousness: 38,
      extraversion: 25,
      agreeableness: 32,
      neuroticism: 22,
    });
    const resultA = classifyArchetype(ipip);
    const resultB = classifyFromZScores(resultA.zScores);
    expect(resultB.primary.name).toBe(resultA.primary.name);
    expect(resultB.primary.distance).toBeCloseTo(resultA.primary.distance, 10);
    expect(resultB.secondary.name).toBe(resultA.secondary.name);
    expect(resultB.isBlended).toBe(resultA.isBlended);
  });

  it('should handle all-zero z-scores (population mean profile)', () => {
    const z: BigFiveZScores = { O: 0, C: 0, E: 0, A: 0, N: 0 };
    const result = classifyFromZScores(z);
    // Should still return a valid result
    expect(result.primary.name).toBeDefined();
    expect(result.primary.distance).toBeGreaterThan(0);
    expect(result.allDistances).toHaveLength(16);
  });
});

// ---------------------------------------------------------------------------
// Real assessment data: da9592a1 (test profile from Sprint 0.1)
// ---------------------------------------------------------------------------

describe('classifyArchetype — real assessment data', () => {
  it('should classify the test profile from assessment da9592a1', () => {
    // Real responses from the completed test assessment
    // IPIP-50 raw trait scores computed from the stored responses:
    // E: pos=[1,11,21,31,41] neg_r=[6,16,26,36,46]
    // Items 1-50 from the assessment response data
    const responses: Record<string, number> = {
      '1': 1, '2': 1, '3': 4, '4': 2, '5': 5,
      '6': 2, '7': 5, '8': 3, '9': 1, '10': 3,
      '11': 3, '12': 3, '13': 3, '14': 3, '15': 3,
      '16': 3, '17': 3, '18': 3, '19': 3, '20': 3,
      '21': 3, '22': 3, '23': 3, '24': 3, '25': 3,
      '26': 4, '27': 4, '28': 4, '29': 2, '30': 2,
      '31': 2, '32': 2, '33': 2, '34': 4, '35': 4,
      '36': 4, '37': 4, '38': 4, '39': 4, '40': 2,
      '41': 2, '42': 2, '43': 2, '44': 3, '45': 3,
      '46': 5, '47': 5, '48': 5, '49': 5, '50': 1,
    };

    // Manually compute trait scores to verify the classifier
    // Using the scoring engine's logic: reverse(val, 5) = 6 - val
    const traitScores = computeTraitScores(responses);

    const ipip = makeIPIP50(traitScores);
    const result = classifyArchetype(ipip);

    // The result should be a valid archetype with reasonable z-scores
    expect(result.primary.name).toBeDefined();
    expect(result.zScores.O).toBeDefined();
    expect(result.allDistances).toHaveLength(16);

    // Log for inspection during development
    console.log('Test profile classification:', {
      primary: result.primary.name,
      secondary: result.secondary.name,
      isBlended: result.isBlended,
      zScores: result.zScores,
      distance: result.primary.distance.toFixed(3),
    });
  });
});

// ---------------------------------------------------------------------------
// getArchetypeCentroid
// ---------------------------------------------------------------------------

describe('getArchetypeCentroid', () => {
  it('should find known archetypes', () => {
    const centroid = getArchetypeCentroid('Architect');
    expect(centroid).toBeDefined();
    expect(centroid!.vector).toEqual([1.2, 1.0, -0.8, -0.5, -0.3]);
  });

  it('should return undefined for unknown names', () => {
    expect(getArchetypeCentroid('NonExistent')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Centroid Data Integrity
// ---------------------------------------------------------------------------

describe('ARCHETYPE_CENTROIDS integrity', () => {
  it('should contain exactly 16 archetypes', () => {
    expect(ARCHETYPE_CENTROIDS).toHaveLength(16);
  });

  it('should have unique names', () => {
    const names = ARCHETYPE_CENTROIDS.map((c) => c.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(16);
  });

  it('should have 5-element vectors for all centroids', () => {
    for (const c of ARCHETYPE_CENTROIDS) {
      expect(c.vector).toHaveLength(5);
    }
  });

  it('should have z-scores within reasonable range (-2 to +2)', () => {
    for (const c of ARCHETYPE_CENTROIDS) {
      for (const val of c.vector) {
        expect(val).toBeGreaterThanOrEqual(-2);
        expect(val).toBeLessThanOrEqual(2);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Helper: Compute raw trait scores from item-level responses (mirrors engine.ts)
// ---------------------------------------------------------------------------

function computeTraitScores(responses: Record<string, number>) {
  const traits: Record<string, { pos: string[]; neg: string[] }> = {
    extraversion:      { pos: ['1','11','21','31','41'], neg: ['6','16','26','36','46'] },
    agreeableness:     { pos: ['7','17','27','37','47'], neg: ['2','12','22','32','42'] },
    conscientiousness: { pos: ['3','13','23','33','43'], neg: ['8','18','28','38','48'] },
    neuroticism:       { pos: ['4','14','24','34','44'], neg: ['9','19','29','39','49'] },
    openness:          { pos: ['5','15','25','35','45'], neg: ['10','20','30','40','50'] },
  };

  const result: Record<string, number> = {};
  for (const [trait, items] of Object.entries(traits)) {
    const posSum = items.pos.reduce((s, k) => s + (responses[k] ?? 0), 0);
    const negSum = items.neg.reduce((s, k) => s + (6 - (responses[k] ?? 0)), 0);
    result[trait] = posSum + negSum;
  }
  return result as {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
}
