/**
 * Decoded — Archetype Classification Types
 * 
 * Source of truth: DECODED_ARCHETYPES.md
 * 16 base types derived from Big Five cluster analysis.
 */

/** All 16 base archetype names */
export const ARCHETYPE_NAMES = [
  'Architect',
  'Explorer',
  'Advocate',
  'Sentinel',
  'Catalyst',
  'Sage',
  'Healer',
  'Commander',
  'Artist',
  'Diplomat',
  'Maverick',
  'Guardian',
  'Luminary',
  'Strategist',
  'Rebel',
  'Anchor',
] as const;

export type ArchetypeName = (typeof ARCHETYPE_NAMES)[number];

/** Big Five z-score vector — order is always [O, C, E, A, N] */
export interface BigFiveZScores {
  O: number; // Openness
  C: number; // Conscientiousness
  E: number; // Extraversion
  A: number; // Agreeableness
  N: number; // Neuroticism
}

/** Single archetype match with distance metric */
export interface ArchetypeMatch {
  name: ArchetypeName;
  distance: number;
}

/** Full classification result from the archetype engine */
export interface ArchetypeResult {
  /** Closest archetype by Euclidean distance in z-score space */
  primary: ArchetypeMatch;
  /** Second-closest archetype — used for sub-label generation nuance */
  secondary: ArchetypeMatch;
  /** True when top two archetypes are within 0.5 distance of each other */
  isBlended: boolean;
  /** The user's Big Five z-scores used for classification */
  zScores: BigFiveZScores;
  /** Euclidean distances to all 16 archetypes (sorted ascending) */
  allDistances: ArchetypeMatch[];
}

/** Centroid definition for a single archetype */
export interface ArchetypeCentroid {
  name: ArchetypeName;
  /** Z-score centroid vector: [O, C, E, A, N] */
  vector: [number, number, number, number, number];
  /** Human-readable description of this archetype */
  description: string;
}
