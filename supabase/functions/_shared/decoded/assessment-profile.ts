/**
 * Decoded → Coach Handoff: Assessment Profile Builder
 *
 * Transforms raw assessment scores into a structured coaching profile
 * that the prompt assembler can inject as a new context layer.
 *
 * Architecture: This is the bridge between Decoded (assessment) and
 * Mastery Coach (coaching engine). The profile is a concise, human-readable
 * summary of what the coach needs to know about the user — NOT a data dump.
 *
 * Why structured JSON instead of prose: The prompt assembler needs to
 * conditionally include/exclude sections and the LLM needs consistent
 * field names for reliable pattern matching across conversations.
 *
 * Sprint 0.4 — S0.4.1
 */

// ─── Assessment Profile Schema ────────────────────────────

export interface AssessmentProfile {
  /** When the assessment was completed */
  assessedAt: string;

  /** The user's archetype classification */
  archetype: {
    base: string;           // e.g., "Catalyst"
    sublabel: string;       // e.g., "The Restless Innovator"
    tagline: string;        // e.g., "You build at the edge of what's possible"
  };

  /** Big Five personality dimensions — the foundation */
  bigFive: {
    openness: { score: number; percentile: number; label: string };
    conscientiousness: { score: number; percentile: number; label: string };
    extraversion: { score: number; percentile: number; label: string };
    agreeableness: { score: number; percentile: number; label: string };
    neuroticism: { score: number; percentile: number; label: string };
  };

  /** Attachment style — how they connect with others */
  attachment: {
    style: string;          // 'secure' | 'anxious' | 'avoidant' | 'disorganized'
    anxietyLevel: number;   // 1–7 scale
    avoidanceLevel: number; // 1–7 scale
  };

  /** Emotional regulation capacity */
  emotionalRegulation: {
    totalScore: number;
    areas: {
      clarity: number;
      impulseControl: number;
      goalDirected: number;
      selfAcceptance: number;
      copingStrategies: number;
      awareness: number;
    };
    coachingNote: string;   // e.g., "Struggles most with impulse control under stress"
  } | null;

  /** Self-compassion profile */
  selfCompassion: {
    totalScore: number;
    strengths: string[];    // e.g., ["mindfulness", "common humanity"]
    growthAreas: string[];  // e.g., ["self-judgment", "isolation"]
  } | null;

  /** Career/motivation alignment */
  motivation: {
    hollandCode: string;    // e.g., "AIS" (Artistic, Investigative, Social)
    sdiScore: number;       // Self-Determination Index (autonomous vs controlled)
    motivationType: string; // 'highly autonomous' | 'moderately autonomous' | 'controlled'
  } | null;

  /** Wellness snapshot */
  wellness: {
    overallScore: number;   // 0–100
    flourishingLevel: string;
    lifeSatisfaction: number;
    redFlags: string[];     // e.g., ["sedentary", "sleep deficit", "social isolation"]
    strengths: string[];    // e.g., ["high purpose", "good nutrition"]
  } | null;

  /** Clinical screening flags — handle with care */
  screeningFlags: {
    anxietySeverity: string | null;     // 'minimal' | 'mild' | 'moderate' | 'severe'
    adhdScreenPositive: boolean | null;
    couplesDistress: boolean | null;
    aceScore: number | null;
  };

  /** Top coaching priorities derived from the full profile */
  coachingPriorities: string[];
}

// ─── Profile Builder ──────────────────────────────────────

interface ScoreRow {
  instrument_id: string;
  total_score?: number;
  subscale_scores?: Record<string, number>;
  percentile_scores?: Record<string, number>;
  interpretation?: Record<string, unknown>;
}

interface ReportRow {
  archetype_base: string | null;
  archetype_sublabel: string | null;
  archetype_tagline: string | null;
  generated_at: string | null;
}

/**
 * Build a coaching-ready assessment profile from raw score data.
 * Pure function — no DB access, no side effects.
 */
export function buildAssessmentProfile(
  scores: ScoreRow[],
  report: ReportRow
): AssessmentProfile {
  const scoreMap = new Map(scores.map(s => [s.instrument_id, s]));

  return {
    assessedAt: report.generated_at ?? new Date().toISOString(),
    archetype: buildArchetype(report),
    bigFive: buildBigFive(scoreMap.get('ipip50')),
    attachment: buildAttachment(scoreMap.get('ecr_r_short')),
    emotionalRegulation: buildDERS(scoreMap.get('ders16')),
    selfCompassion: buildSelfCompassion(scoreMap.get('scs_sf')),
    motivation: buildMotivation(scoreMap.get('riasec'), scoreMap.get('weims')),
    wellness: buildWellness(
      scoreMap.get('wellness_check'),
      scoreMap.get('flourishing'),
      scoreMap.get('swls')
    ),
    screeningFlags: buildScreeningFlags(
      scoreMap.get('gad7'),
      scoreMap.get('asrs'),
      scoreMap.get('csi4'),
      scoreMap.get('ace3')
    ),
    coachingPriorities: deriveCoachingPriorities(scores, scoreMap),
  };
}

// ─── Sub-builders ─────────────────────────────────────────

function buildArchetype(report: ReportRow) {
  return {
    base: report.archetype_base ?? 'Unknown',
    sublabel: report.archetype_sublabel ?? '',
    tagline: report.archetype_tagline ?? '',
  };
}

function buildBigFive(score: ScoreRow | undefined) {
  const sub = score?.subscale_scores ?? {};
  const pct = score?.percentile_scores ?? {};

  function dimensionLabel(percentile: number): string {
    if (percentile >= 75) return 'high';
    if (percentile <= 25) return 'low';
    return 'moderate';
  }

  return {
    openness: { score: sub.openness ?? 0, percentile: pct.openness ?? 50, label: dimensionLabel(pct.openness ?? 50) },
    conscientiousness: { score: sub.conscientiousness ?? 0, percentile: pct.conscientiousness ?? 50, label: dimensionLabel(pct.conscientiousness ?? 50) },
    extraversion: { score: sub.extraversion ?? 0, percentile: pct.extraversion ?? 50, label: dimensionLabel(pct.extraversion ?? 50) },
    agreeableness: { score: sub.agreeableness ?? 0, percentile: pct.agreeableness ?? 50, label: dimensionLabel(pct.agreeableness ?? 50) },
    neuroticism: { score: sub.neuroticism ?? 0, percentile: pct.neuroticism ?? 50, label: dimensionLabel(pct.neuroticism ?? 50) },
  };
}

function buildAttachment(score: ScoreRow | undefined) {
  const sub = score?.subscale_scores ?? {};
  const interp = score?.interpretation ?? {};

  return {
    style: (interp.attachmentStyle as string) ?? 'unknown',
    anxietyLevel: sub.anxiety ?? 0,
    avoidanceLevel: sub.avoidance ?? 0,
  };
}

function buildDERS(score: ScoreRow | undefined) {
  if (!score) return null;

  const sub = score.subscale_scores ?? {};
  const total = score.total_score ?? 0;

  // Find the weakest area for the coaching note
  const areas = {
    clarity: sub.clarity ?? 0,
    impulseControl: sub.impulse ?? 0,
    goalDirected: sub.goals ?? 0,
    selfAcceptance: sub.nonAcceptance ?? 0,
    copingStrategies: sub.strategies ?? 0,
    awareness: sub.awareness ?? 0,
  };

  // Higher DERS subscale = more difficulty. Find the highest.
  const weakest = Object.entries(areas).sort(([, a], [, b]) => b - a)[0];
  const areaLabels: Record<string, string> = {
    clarity: 'emotional clarity',
    impulseControl: 'impulse control under stress',
    goalDirected: 'staying goal-directed when upset',
    selfAcceptance: 'accepting difficult emotions',
    copingStrategies: 'finding effective coping strategies',
    awareness: 'emotional awareness',
  };

  return {
    totalScore: total,
    areas,
    coachingNote: `Struggles most with ${areaLabels[weakest[0]] ?? weakest[0]}`,
  };
}

function buildSelfCompassion(score: ScoreRow | undefined) {
  if (!score) return null;

  const sub = score.subscale_scores ?? {};
  const total = score.total_score ?? 0;

  // Positive subscales (higher = strength): selfKindness, commonHumanity, mindfulness
  // Negative subscales (higher = growth area): selfJudgment, isolation, overIdentification
  const strengths: string[] = [];
  const growthAreas: string[] = [];

  if ((sub.selfKindness ?? 0) >= 3.5) strengths.push('self-kindness');
  if ((sub.commonHumanity ?? 0) >= 3.5) strengths.push('common humanity');
  if ((sub.mindfulness ?? 0) >= 3.5) strengths.push('mindfulness');

  if ((sub.selfJudgment ?? 0) >= 3.5) growthAreas.push('self-judgment');
  if ((sub.isolation ?? 0) >= 3.5) growthAreas.push('isolation');
  if ((sub.overIdentification ?? 0) >= 3.5) growthAreas.push('over-identification with emotions');

  return { totalScore: total, strengths, growthAreas };
}

function buildMotivation(riasec: ScoreRow | undefined, weims: ScoreRow | undefined) {
  if (!riasec && !weims) return null;

  const hollandCode = (riasec?.interpretation?.hollandCode as string) ?? '';
  const sdi = (weims?.interpretation?.sdi as number) ?? 0;

  let motivationType: string;
  if (sdi >= 12) motivationType = 'highly autonomous';
  else if (sdi >= 4) motivationType = 'moderately autonomous';
  else if (sdi >= -4) motivationType = 'balanced';
  else motivationType = 'externally driven';

  return { hollandCode, sdiScore: sdi, motivationType };
}

function buildWellness(
  wellness: ScoreRow | undefined,
  flourishing: ScoreRow | undefined,
  swls: ScoreRow | undefined
) {
  if (!wellness && !flourishing && !swls) return null;

  const wSub = wellness?.subscale_scores ?? {};
  const overallScore = (wellness?.interpretation?.overallWellness as number) ?? 0;
  const flourishingLevel = (flourishing?.interpretation?.level as string) ?? 'unknown';
  const lifeSatisfaction = swls?.total_score ?? 0;

  // Identify red flags and strengths from wellness subscales
  const redFlags: string[] = [];
  const strengths: string[] = [];

  if ((wSub.exercise ?? 5) <= 1) redFlags.push('sedentary lifestyle');
  if ((wSub.sleep ?? 5) <= 2) redFlags.push('sleep deficit');
  if ((wSub.stress ?? 0) >= 4) redFlags.push('high stress');
  if ((wSub.social ?? 5) <= 1) redFlags.push('social isolation');
  if ((wSub.screenTime ?? 0) >= 4) redFlags.push('excessive screen time');
  if ((wSub.energy ?? 5) <= 2) redFlags.push('low energy');

  if ((wSub.purpose ?? 0) >= 4) strengths.push('strong sense of purpose');
  if ((wSub.nutrition ?? 0) >= 4) strengths.push('good nutrition habits');
  if ((wSub.coping ?? 0) >= 4) strengths.push('effective coping strategies');
  if ((wSub.exercise ?? 0) >= 4) strengths.push('active exercise routine');
  if ((wSub.social ?? 0) >= 4) strengths.push('strong social connections');

  return { overallScore, flourishingLevel, lifeSatisfaction, redFlags, strengths };
}

function buildScreeningFlags(
  gad7: ScoreRow | undefined,
  asrs: ScoreRow | undefined,
  csi4: ScoreRow | undefined,
  ace3: ScoreRow | undefined
) {
  return {
    anxietySeverity: (gad7?.interpretation?.severity as string) ?? null,
    adhdScreenPositive: (asrs?.interpretation?.screenPositive as boolean) ?? null,
    couplesDistress: (csi4?.interpretation?.distressed as boolean) ?? null,
    aceScore: ace3?.total_score ?? null,
  };
}

// ─── Coaching Priorities Derivation ───────────────────────

/**
 * Derives the top 3-5 coaching priorities from the full assessment.
 * These become the coach's initial focus areas.
 *
 * Why: The coach shouldn't try to address everything at once.
 * These priorities are ordered by clinical urgency first,
 * then by impact potential.
 */
function deriveCoachingPriorities(
  _scores: ScoreRow[],
  scoreMap: Map<string, ScoreRow>
): string[] {
  const priorities: Array<{ priority: string; weight: number }> = [];

  // Clinical urgency: anxiety screening
  const gad7 = scoreMap.get('gad7');
  const anxietySeverity = gad7?.interpretation?.severity as string | undefined;
  if (anxietySeverity === 'moderate' || anxietySeverity === 'severe') {
    priorities.push({ priority: 'Address anxiety management strategies (screened moderate/severe)', weight: 10 });
  }

  // Emotional regulation difficulties
  const ders = scoreMap.get('ders16');
  if (ders && (ders.total_score ?? 0) >= 48) {
    priorities.push({ priority: 'Build emotional regulation skills (DERS indicates significant difficulty)', weight: 9 });
  }

  // High neuroticism + low conscientiousness = execution gap
  const ipip50 = scoreMap.get('ipip50');
  const nScore = ipip50?.percentile_scores?.neuroticism ?? 50;
  const cScore = ipip50?.percentile_scores?.conscientiousness ?? 50;
  if (nScore >= 75 && cScore <= 30) {
    priorities.push({ priority: 'Close the intention-action gap (high emotional reactivity + low follow-through)', weight: 8 });
  } else if (nScore >= 75) {
    priorities.push({ priority: 'Develop stress resilience (high neuroticism)', weight: 7 });
  }

  // Insecure attachment pattern
  const ecr = scoreMap.get('ecr_r_short');
  const attachStyle = ecr?.interpretation?.attachmentStyle as string | undefined;
  if (attachStyle && attachStyle !== 'secure') {
    priorities.push({ priority: `Explore ${attachStyle} attachment patterns in relationships`, weight: 6 });
  }

  // Low self-compassion
  const scs = scoreMap.get('scs_sf');
  if (scs && (scs.total_score ?? 5) < 3.0) {
    priorities.push({ priority: 'Cultivate self-compassion (currently low — impacts resilience and self-talk)', weight: 6 });
  }

  // Wellness red flags
  const wellness = scoreMap.get('wellness_check');
  const wSub = wellness?.subscale_scores ?? {};
  if ((wSub.exercise ?? 5) <= 1 || (wSub.sleep ?? 5) <= 2) {
    priorities.push({ priority: 'Establish foundational wellness habits (exercise and/or sleep deficit)', weight: 5 });
  }
  if ((wSub.social ?? 5) <= 1) {
    priorities.push({ priority: 'Strengthen social connections (isolation detected)', weight: 5 });
  }

  // Motivation alignment
  const weims = scoreMap.get('weims');
  const sdi = (weims?.interpretation?.sdi as number) ?? 0;
  if (sdi < -4) {
    priorities.push({ priority: 'Reconnect with intrinsic motivation (currently externally driven)', weight: 4 });
  }

  // Low life satisfaction
  const swls = scoreMap.get('swls');
  if (swls && (swls.total_score ?? 25) <= 15) {
    priorities.push({ priority: 'Explore sources of life dissatisfaction', weight: 4 });
  }

  // Sort by weight, take top 5
  return priorities
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map(p => p.priority);
}
