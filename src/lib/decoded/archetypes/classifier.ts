/**
 * Decoded — Archetype Classifier
 *
 * Deterministic classification using Euclidean distance from
 * Big Five z-score centroids. No AI dependency.
 *
 * Algorithm: DECODED_ARCHETYPES.md §Classification Algorithm
 * Centroids: DECODED_ARCHETYPES.md §Archetype Centroid Definitions
 */

import type { IPIP50Score } from '../scoring/types';
import type {
  ArchetypeCentroid,
  ArchetypeMatch,
  ArchetypeResult,
  BigFiveZScores,
} from './types';

// ---------------------------------------------------------------------------
// Population norms for IPIP-50 (mirrors scoring/engine.ts)
// Raw trait scores range 10–50 on a 1–5 Likert scale (10 items per trait)
// ---------------------------------------------------------------------------
const IPIP50_NORMS: Record<string, { mean: number; sd: number }> = {
  openness:          { mean: 35.4, sd: 6.4 },
  conscientiousness: { mean: 33.2, sd: 6.8 },
  extraversion:      { mean: 29.4, sd: 7.6 },
  agreeableness:     { mean: 35.6, sd: 6.0 },
  neuroticism:       { mean: 26.2, sd: 7.4 },
};

// ---------------------------------------------------------------------------
// Archetype Centroids — z-score space [O, C, E, A, N]
// Source: DECODED_ARCHETYPES.md §Archetype Centroid Definitions
// These are initial estimates; refined with real user data post-launch
// ---------------------------------------------------------------------------
export const ARCHETYPE_CENTROIDS: ArchetypeCentroid[] = [
  { name: 'Architect',  vector: [+1.2, +1.0, -0.8, -0.5, -0.3], description: 'Systematic visionary who builds frameworks and structures' },
  { name: 'Explorer',   vector: [+1.5, -0.8, +1.0,  0.0, -0.5], description: 'Curiosity-driven adventurer who thrives on novelty' },
  { name: 'Advocate',   vector: [+0.3, -0.3, +1.0, +1.5, -0.5], description: 'People-centered champion who fights for others' },
  { name: 'Sentinel',   vector: [-0.5, +1.5, -0.5, +1.0,  0.0], description: 'Reliable protector who values tradition and duty' },
  { name: 'Catalyst',   vector: [+1.0, -0.5, +1.5, -0.5, -0.3], description: 'Energetic change-maker who disrupts the status quo' },
  { name: 'Sage',       vector: [+1.5, +0.8, -1.0,  0.0, -0.8], description: 'Deep thinker who seeks understanding over action' },
  { name: 'Healer',     vector: [ 0.0, -0.5, -0.8, +1.5, +1.0], description: 'Empathic nurturer who absorbs others\' pain' },
  { name: 'Commander',  vector: [-0.3, +1.2, +1.5, -0.8, -0.5], description: 'Decisive leader who takes charge naturally' },
  { name: 'Artist',     vector: [+1.5, -1.0, -0.5,  0.0, +1.2], description: 'Sensitive creator who channels emotion into expression' },
  { name: 'Diplomat',   vector: [-0.3,  0.0, +1.0, +1.2, -0.5], description: 'Harmony-seeking bridge-builder in every room' },
  { name: 'Maverick',   vector: [+1.2, -1.0, +1.2, -0.8,  0.0], description: 'Rule-breaking innovator who trusts instinct over process' },
  { name: 'Guardian',   vector: [-0.5, +1.2, -0.8,  0.0, +1.0], description: 'Anxious protector who plans for every contingency' },
  { name: 'Luminary',   vector: [+0.3, -0.3, +1.5, +1.0, -0.8], description: 'Charismatic inspirer who lights up rooms' },
  { name: 'Strategist', vector: [+1.0, +1.5, -0.5, -0.5, -0.3], description: 'Long-range planner who sees three moves ahead' },
  { name: 'Rebel',      vector: [+1.2, -1.0,  0.0, -1.0, +1.0], description: 'Intense individualist who resists conformity' },
  { name: 'Anchor',     vector: [-0.5, +1.0,  0.0, +1.2, -1.0], description: 'Steady, grounding presence others rely on' },
];

// ---------------------------------------------------------------------------
// Core Classification Logic
// ---------------------------------------------------------------------------

/**
 * Convert raw IPIP-50 subscale scores to z-scores using population norms.
 * Each raw trait score is on a 10–50 scale.
 */
export function computeZScores(ipip50: IPIP50Score): BigFiveZScores {
  const { subscaleScores } = ipip50;
  return {
    O: (subscaleScores.openness          - IPIP50_NORMS.openness.mean)          / IPIP50_NORMS.openness.sd,
    C: (subscaleScores.conscientiousness - IPIP50_NORMS.conscientiousness.mean) / IPIP50_NORMS.conscientiousness.sd,
    E: (subscaleScores.extraversion      - IPIP50_NORMS.extraversion.mean)      / IPIP50_NORMS.extraversion.sd,
    A: (subscaleScores.agreeableness     - IPIP50_NORMS.agreeableness.mean)     / IPIP50_NORMS.agreeableness.sd,
    N: (subscaleScores.neuroticism       - IPIP50_NORMS.neuroticism.mean)       / IPIP50_NORMS.neuroticism.sd,
  };
}

/**
 * Compute Euclidean distance between a user's z-score profile
 * and an archetype centroid vector.
 */
export function euclideanDistance(
  zScores: BigFiveZScores,
  centroid: [number, number, number, number, number],
): number {
  const userVector = [zScores.O, zScores.C, zScores.E, zScores.A, zScores.N];
  return Math.sqrt(
    userVector.reduce((sum, val, i) => sum + (val - centroid[i]) ** 2, 0),
  );
}

/**
 * Classify a user's IPIP-50 scores into an archetype.
 *
 * Algorithm:
 * 1. Normalize raw Big Five scores to z-scores
 * 2. Compute Euclidean distance to each of 16 archetype centroids
 * 3. Primary = minimum distance, Secondary = second minimum
 * 4. Blended flag if top 2 distances are within 0.5 of each other
 *
 * @param ipip50 — Scored IPIP-50 result from the scoring engine
 * @returns ArchetypeResult with primary, secondary, blend status, and all distances
 */
export function classifyArchetype(ipip50: IPIP50Score): ArchetypeResult {
  const zScores = computeZScores(ipip50);

  // Compute distance to every centroid
  const distances: ArchetypeMatch[] = ARCHETYPE_CENTROIDS.map((centroid) => ({
    name: centroid.name,
    distance: euclideanDistance(zScores, centroid.vector),
  }));

  // Sort by distance ascending (closest first)
  distances.sort((a, b) => a.distance - b.distance);

  const primary = distances[0];
  const secondary = distances[1];

  // Blended if the gap between top two is ≤ 0.5
  const isBlended = secondary.distance - primary.distance <= 0.5;

  return {
    primary,
    secondary,
    isBlended,
    zScores,
    allDistances: distances,
  };
}

/**
 * Classify from raw z-scores directly (useful when z-scores are already computed).
 * Same algorithm as classifyArchetype but skips the normalization step.
 */
export function classifyFromZScores(zScores: BigFiveZScores): ArchetypeResult {
  const distances: ArchetypeMatch[] = ARCHETYPE_CENTROIDS.map((centroid) => ({
    name: centroid.name,
    distance: euclideanDistance(zScores, centroid.vector),
  }));

  distances.sort((a, b) => a.distance - b.distance);

  const primary = distances[0];
  const secondary = distances[1];
  const isBlended = secondary.distance - primary.distance <= 0.5;

  return {
    primary,
    secondary,
    isBlended,
    zScores,
    allDistances: distances,
  };
}

/**
 * Get the centroid definition for a specific archetype name.
 */
export function getArchetypeCentroid(name: string): ArchetypeCentroid | undefined {
  return ARCHETYPE_CENTROIDS.find((c) => c.name === name);
}
