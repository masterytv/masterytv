/**
 * Decoded Report — Score Transformer
 *
 * Transforms raw InstrumentScore[] + ArchetypeResult into
 * section-specific score data packages for GPT-4o prompts.
 *
 * This is the bridge between the scoring engine and the prompt templates.
 */

import type { InstrumentScore } from '../../scoring/types';
import type { ArchetypeResult } from '../../archetypes/types';
import type { SectionId, SectionScoreData } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get a specific instrument's scores from the array */
function getScore(scores: InstrumentScore[], id: string): InstrumentScore | undefined {
  return scores.find((s) => s.instrumentId === id);
}

/** Safely get subscale scores */
function getSubscales(scores: InstrumentScore[], id: string): Record<string, number> {
  return getScore(scores, id)?.subscaleScores ?? {};
}

/** Safely get interpretation fields */
function getInterpretation(scores: InstrumentScore[], id: string): Record<string, string | boolean | number> {
  return (getScore(scores, id)?.interpretation ?? {}) as Record<string, string | boolean | number>;
}

/** Safely get percentile scores */
function getPercentiles(scores: InstrumentScore[], id: string): Record<string, number> {
  return getScore(scores, id)?.percentileScores ?? {};
}

/** Safely get total score */
function getTotal(scores: InstrumentScore[], id: string): number | undefined {
  return getScore(scores, id)?.totalScore;
}

// ---------------------------------------------------------------------------
// Base score data (shared across all sections)
// ---------------------------------------------------------------------------

function buildBaseData(
  archetype: ArchetypeResult,
  scores: InstrumentScore[],
): Omit<SectionScoreData, 'sectionId' | 'sectionData'> {
  const ipip = getScore(scores, 'ipip50');
  return {
    archetype: {
      primary: archetype.primary.name,
      secondary: archetype.secondary.name,
      isBlended: archetype.isBlended,
    },
    bigFive: {
      raw: ipip?.subscaleScores ?? {},
      percentiles: ipip?.percentileScores ?? {},
      zScores: archetype.zScores as unknown as Record<string, number>,
    },
  };
}

// ---------------------------------------------------------------------------
// Section-Specific Transformers
// ---------------------------------------------------------------------------

function transformRS01(scores: InstrumentScore[], archetype: ArchetypeResult): Record<string, unknown> {
  // Summary dashboard — needs everything
  return {
    allInstrumentSummaries: scores.map((s) => ({
      instrument: s.instrumentId,
      total: s.totalScore,
      subscales: s.subscaleScores,
      interpretation: s.interpretation,
    })),
    flourishing: getTotal(scores, 'flourishing'),
    swls: getTotal(scores, 'swls'),
    wellnessOverall: getInterpretation(scores, 'wellness_check').overallWellness,
    gad7Severity: getInterpretation(scores, 'gad7').severity,
    attachmentStyle: getInterpretation(scores, 'ecr_r_short').attachmentStyle,
    hollandCode: getInterpretation(scores, 'riasec').hollandCode,
    sdi: getInterpretation(scores, 'weims').sdi,
  };
}

function transformRS02(scores: InstrumentScore[]): Record<string, unknown> {
  // Cross-instrument insights — needs key intersections
  return {
    bigFiveSubscales: getSubscales(scores, 'ipip50'),
    bigFivePercentiles: getPercentiles(scores, 'ipip50'),
    attachment: getSubscales(scores, 'ecr_r_short'),
    attachmentStyle: getInterpretation(scores, 'ecr_r_short').attachmentStyle,
    dersSubscales: getSubscales(scores, 'ders16'),
    scsSubscales: getSubscales(scores, 'scs_sf'),
    gad7Total: getTotal(scores, 'gad7'),
    gad7Severity: getInterpretation(scores, 'gad7').severity,
    flourishing: getTotal(scores, 'flourishing'),
    swls: getTotal(scores, 'swls'),
    wellnessSubscales: getSubscales(scores, 'wellness_check'),
    sdi: getInterpretation(scores, 'weims').sdi,
  };
}

function transformRS03(scores: InstrumentScore[], archetype: ArchetypeResult): Record<string, unknown> {
  // Archetype deep dive
  return {
    primaryDistance: archetype.primary.distance,
    secondaryDistance: archetype.secondary.distance,
    allDistances: archetype.allDistances.slice(0, 5), // Top 5
    attachmentStyle: getInterpretation(scores, 'ecr_r_short').attachmentStyle,
    hollandCode: getInterpretation(scores, 'riasec').hollandCode,
    riasecSubscales: getSubscales(scores, 'riasec'),
  };
}

function transformRS04(scores: InstrumentScore[]): Record<string, unknown> {
  // Big Five patterns
  return {
    subscales: getSubscales(scores, 'ipip50'),
    percentiles: getPercentiles(scores, 'ipip50'),
  };
}

function transformRS05(scores: InstrumentScore[]): Record<string, unknown> {
  // Big Five per-trait breakdown
  return {
    subscales: getSubscales(scores, 'ipip50'),
    percentiles: getPercentiles(scores, 'ipip50'),
  };
}

function transformRS06(scores: InstrumentScore[]): Record<string, unknown> {
  // Attachment map
  return {
    anxiety: getSubscales(scores, 'ecr_r_short').anxiety,
    avoidance: getSubscales(scores, 'ecr_r_short').avoidance,
    attachmentStyle: getInterpretation(scores, 'ecr_r_short').attachmentStyle,
    neuroticism: getSubscales(scores, 'ipip50').neuroticism,
    neuroticismPercentile: getPercentiles(scores, 'ipip50').neuroticism,
    agreeableness: getSubscales(scores, 'ipip50').agreeableness,
    agreeablenessPercentile: getPercentiles(scores, 'ipip50').agreeableness,
  };
}

function transformRS07(scores: InstrumentScore[]): Record<string, unknown> {
  // Inner system (IFS-informed via Big Five N + DERS + SCS)
  return {
    neuroticism: getSubscales(scores, 'ipip50').neuroticism,
    neuroticismPercentile: getPercentiles(scores, 'ipip50').neuroticism,
    dersSubscales: getSubscales(scores, 'ders16'),
    dersTotal: getTotal(scores, 'ders16'),
    scsSubscales: getSubscales(scores, 'scs_sf'),
    scsTotal: getTotal(scores, 'scs_sf'),
    gad7Total: getTotal(scores, 'gad7'),
    gad7Severity: getInterpretation(scores, 'gad7').severity,
  };
}

function transformRS08(scores: InstrumentScore[]): Record<string, unknown> {
  // Emotional landscape
  return {
    dersSubscales: getSubscales(scores, 'ders16'),
    dersTotal: getTotal(scores, 'ders16'),
    neuroticism: getSubscales(scores, 'ipip50').neuroticism,
    neuroticismPercentile: getPercentiles(scores, 'ipip50').neuroticism,
    scsSubscales: getSubscales(scores, 'scs_sf'),
  };
}

function transformRS09(scores: InstrumentScore[]): Record<string, unknown> {
  // Motivation & vocation
  return {
    weimsSubscales: getSubscales(scores, 'weims'),
    sdi: getInterpretation(scores, 'weims').sdi,
    riasecSubscales: getSubscales(scores, 'riasec'),
    hollandCode: getInterpretation(scores, 'riasec').hollandCode,
    conscientiousness: getSubscales(scores, 'ipip50').conscientiousness,
    openness: getSubscales(scores, 'ipip50').openness,
  };
}

function transformRS10(scores: InstrumentScore[]): Record<string, unknown> {
  // Relationships
  return {
    attachment: getSubscales(scores, 'ecr_r_short'),
    attachmentStyle: getInterpretation(scores, 'ecr_r_short').attachmentStyle,
    csi4Total: getTotal(scores, 'csi4'),
    csi4Distressed: getInterpretation(scores, 'csi4').distressed,
    agreeableness: getSubscales(scores, 'ipip50').agreeableness,
    agreeablenessPercentile: getPercentiles(scores, 'ipip50').agreeableness,
    extraversion: getSubscales(scores, 'ipip50').extraversion,
  };
}

function transformRS11(scores: InstrumentScore[]): Record<string, unknown> {
  // Wellness & life satisfaction
  return {
    swls: getTotal(scores, 'swls'),
    swlsLevel: getInterpretation(scores, 'swls').level,
    flourishing: getTotal(scores, 'flourishing'),
    flourishingLevel: getInterpretation(scores, 'flourishing').level,
    wellnessSubscales: getSubscales(scores, 'wellness_check'),
    wellnessOverall: getInterpretation(scores, 'wellness_check').overallWellness,
  };
}

function transformRS12(scores: InstrumentScore[], archetype: ArchetypeResult): Record<string, unknown> {
  // Growth map — needs everything synthesized
  return {
    allScoreSummaries: scores.map((s) => ({
      instrument: s.instrumentId,
      total: s.totalScore,
      interpretation: s.interpretation,
    })),
    gad7Severity: getInterpretation(scores, 'gad7').severity,
    dersTotal: getTotal(scores, 'ders16'),
    attachmentStyle: getInterpretation(scores, 'ecr_r_short').attachmentStyle,
    ace3Total: getTotal(scores, 'ace3'),
    asrsPositive: getInterpretation(scores, 'asrs').screenPositive,
  };
}

// ---------------------------------------------------------------------------
// Main Transformer
// ---------------------------------------------------------------------------

const SECTION_TRANSFORMERS: Record<
  SectionId,
  (scores: InstrumentScore[], archetype: ArchetypeResult) => Record<string, unknown>
> = {
  RS01: transformRS01,
  RS02: (s) => transformRS02(s),
  RS03: transformRS03,
  RS04: (s) => transformRS04(s),
  RS05: (s) => transformRS05(s),
  RS06: (s) => transformRS06(s),
  RS07: (s) => transformRS07(s),
  RS08: (s) => transformRS08(s),
  RS09: (s) => transformRS09(s),
  RS10: (s) => transformRS10(s),
  RS11: (s) => transformRS11(s),
  RS12: transformRS12,
};

/**
 * Transform scoring data into a prompt-ready package for a specific report section.
 */
export function transformScoreDataForSection(
  sectionId: SectionId,
  scores: InstrumentScore[],
  archetype: ArchetypeResult,
): SectionScoreData {
  const base = buildBaseData(archetype, scores);
  const transformer = SECTION_TRANSFORMERS[sectionId];
  const sectionData = transformer(scores, archetype);

  return {
    ...base,
    sectionId,
    sectionData,
  };
}

/**
 * Compute the Decoded Score (0–100 composite growth-readiness metric).
 * 
 * Weights (approved):
 * - Flourishing (25%)
 * - Self-compassion (20%)
 * - SWLS (15%)
 * - Wellness (20%)
 * - Low-DERS (10%)
 * - Low-neuroticism (10%)
 */
export function computeDecodedScore(scores: InstrumentScore[]): number {
  // Flourishing: 8–56 → normalize to 0–100
  const flourishing = getTotal(scores, 'flourishing') ?? 32;
  const flourishingNorm = Math.round(((flourishing - 8) / 48) * 100);

  // SCS-SF total: 12–60 → normalize to 0–100
  const scsTotal = getTotal(scores, 'scs_sf') ?? 36;
  const scsNorm = Math.round(((scsTotal - 12) / 48) * 100);

  // SWLS: 5–35 → normalize to 0–100
  const swls = getTotal(scores, 'swls') ?? 20;
  const swlsNorm = Math.round(((swls - 5) / 30) * 100);

  // Wellness overall: 0–100 already
  const wellness = (getInterpretation(scores, 'wellness_check').overallWellness as number) ?? 50;

  // DERS-16 total: 16–80 (lower is better) → invert to 0–100
  const ders = getTotal(scores, 'ders16') ?? 40;
  const dersInverted = Math.round(((80 - ders) / 64) * 100);

  // Neuroticism: 10–50 (lower is better) → invert to 0–100
  const neuro = getSubscales(scores, 'ipip50').neuroticism ?? 26;
  const neuroInverted = Math.round(((50 - neuro) / 40) * 100);

  // Weighted average
  const score = Math.round(
    flourishingNorm * 0.25 +
    scsNorm * 0.20 +
    swlsNorm * 0.15 +
    wellness * 0.20 +
    dersInverted * 0.10 +
    neuroInverted * 0.10,
  );

  // Clamp 0–100
  return Math.max(0, Math.min(100, score));
}
