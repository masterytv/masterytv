/**
 * Decoded Assessment — Scoring Engine
 * 
 * Pure scoring functions for all 13 instruments.
 * Each function takes a Record<string, number> of item responses
 * and returns a typed InstrumentScore.
 * 
 * Scoring keys: DECODED_SCORING.md (authoritative)
 */

import type {
  InstrumentScore,
  IPIP50Score,
  RIASECScore,
  ECRRShortScore,
  SWLSScore,
  SCSSFScore,
  DERS16Score,
  WEIMSScore,
  FlourishingScore,
  WellnessCheckScore,
  GAD7Score,
  ASRSScore,
  CSI4Score,
  ACE3Score,
  CoachingFlags,
  ValidityCheckResult,
  ValidityIssue,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reverse-score: for a 1–N scale, reversed = (N+1) - raw */
function reverse(raw: number, scaleMax: number): number {
  return scaleMax + 1 - raw;
}

/** Sum specified item keys from a response map */
function sumItems(responses: Record<string, number>, keys: string[]): number {
  return keys.reduce((total, key) => total + (responses[key] ?? 0), 0);
}

/** Mean of specified item keys */
function meanItems(responses: Record<string, number>, keys: string[]): number {
  const sum = sumItems(responses, keys);
  return keys.length > 0 ? sum / keys.length : 0;
}

/** Get value or 0 */
function val(responses: Record<string, number>, key: string): number {
  return responses[key] ?? 0;
}

// ---------------------------------------------------------------------------
// IPIP-50 Normative Data (General Adult Population)
// Source: IPIP manual, representative norms (N~2000)
// These are approximate — will be refined with real user data post-launch
// ---------------------------------------------------------------------------
const IPIP50_NORMS: Record<string, { mean: number; sd: number }> = {
  openness:          { mean: 35.4, sd: 6.4 },
  conscientiousness: { mean: 33.2, sd: 6.8 },
  extraversion:      { mean: 29.4, sd: 7.6 },
  agreeableness:     { mean: 35.6, sd: 6.0 },
  neuroticism:       { mean: 26.2, sd: 7.4 },
};

/** Convert raw score to approximate percentile using z-score + normal CDF */
function rawToPercentile(raw: number, mean: number, sd: number): number {
  const z = (raw - mean) / sd;
  // Approximation of the standard normal CDF (Abramowitz & Stegun)
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327; // 1/sqrt(2*pi)
  const p = d * Math.exp(-z * z / 2);
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const cdf = z >= 0 ? 1 - p * poly : p * poly;
  return Math.round(cdf * 100);
}

// ---------------------------------------------------------------------------
// 1. IPIP-50 (Big Five)
// ---------------------------------------------------------------------------

export function scoreIPIP50(responses: Record<string, number>): IPIP50Score {
  // Item mapping: items are keyed as "1" through "50"
  // Canonical IPIP-50 (Goldberg) keying — NOT a clean 5-pos/5-neg split. Only
  // the items worded *against* the trait are reverse-scored; the rest are direct.
  // (Previously this assumed 5/5 per factor, wrongly reversing items 42, 48,
  // 29/39/49, 40/50 — inflating/deflating A, C, N and O.)
  const traits: Record<string, { pos: string[]; neg: string[] }> = {
    extraversion:      { pos: ['1','11','21','31','41'], neg: ['6','16','26','36','46'] },
    agreeableness:     { pos: ['7','17','27','37','42','47'], neg: ['2','12','22','32'] },
    conscientiousness: { pos: ['3','13','23','33','43','48'], neg: ['8','18','28','38'] },
    neuroticism:       { pos: ['4','14','24','29','34','39','44','49'], neg: ['9','19'] },
    openness:          { pos: ['5','15','25','35','40','45','50'], neg: ['10','20','30'] },
  };

  const subscaleScores: Record<string, number> = {};
  const percentileScores: Record<string, number> = {};
  const rawScoreDetails: Record<string, number> = {};

  for (const [trait, items] of Object.entries(traits)) {
    const posSum = items.pos.reduce((s, k) => s + val(responses, k), 0);
    const negSum = items.neg.reduce((s, k) => s + reverse(val(responses, k), 5), 0);
    const rawScore = posSum + negSum; // Range: 10–50
    subscaleScores[trait] = rawScore;
    rawScoreDetails[`${trait}_raw`] = rawScore;
    
    const norms = IPIP50_NORMS[trait];
    percentileScores[trait] = rawToPercentile(rawScore, norms.mean, norms.sd);
  }

  return {
    instrumentId: 'ipip50',
    subscaleScores: subscaleScores as IPIP50Score['subscaleScores'],
    percentileScores: percentileScores as IPIP50Score['percentileScores'],
    rawScoreDetails,
  };
}

// ---------------------------------------------------------------------------
// 2. RIASEC / Holland Code
// ---------------------------------------------------------------------------

export function scoreRIASEC(responses: Record<string, number>): RIASECScore {
  const types: Record<string, string[]> = {
    realistic:     ['1','7','13','19','25'],
    investigative: ['2','8','14','20','26'],
    artistic:      ['3','9','15','21','27'],
    social:        ['4','10','16','22','28'],
    enterprising:  ['5','11','17','23','29'],
    conventional:  ['6','12','18','24','30'],
  };

  const subscaleScores: Record<string, number> = {};
  for (const [type, items] of Object.entries(types)) {
    subscaleScores[type] = sumItems(responses, items); // Range: 5–25
  }

  // Rank types to get Holland Code (top 3)
  const ranked = Object.entries(subscaleScores)
    .sort((a, b) => b[1] - a[1])
    .map(([type]) => type[0].toUpperCase());
  const hollandCode = ranked.slice(0, 3).join('');

  return {
    instrumentId: 'riasec',
    subscaleScores: subscaleScores as RIASECScore['subscaleScores'],
    interpretation: { hollandCode },
  };
}

// ---------------------------------------------------------------------------
// 3. ECR-R Short (Attachment)
// ---------------------------------------------------------------------------

export function scoreECR_R_Short(responses: Record<string, number>): ECRRShortScore {
  // Anxiety: items 1-6 — ALL worded in the high-anxiety direction (e.g. "I worry
  // a lot about my relationships"), so agree = more anxious and NONE are reverse-
  // keyed. The subscale is the plain mean.
  const anxietyScore = (
    val(responses, '1') + val(responses, '2') + val(responses, '3') +
    val(responses, '4') + val(responses, '5') + val(responses, '6')
  ) / 6;

  // Avoidance: items 7-12 — all worded high-avoidance EXCEPT item 8 ("I feel
  // comfortable sharing my private thoughts…"), the single low-avoidance item,
  // which is reverse-keyed. (Previously items 7/9/11 were wrongly reversed and
  // 8 was not, which inflated secure responders into Fearful-Avoidant.)
  const avoidanceScore = (
    reverse(val(responses, '8'), 7) +
    val(responses, '7') + val(responses, '9') +
    val(responses, '10') + val(responses, '11') + val(responses, '12')
  ) / 6;

  // Quadrant classification — uses full Bartholomew & Horowitz (1991) labels
  // to match the quadrant chart display exactly
  let attachmentStyle: string;
  if (anxietyScore < 3.5 && avoidanceScore < 3.5) {
    attachmentStyle = 'Secure';
  } else if (anxietyScore >= 3.5 && avoidanceScore < 3.5) {
    attachmentStyle = 'Anxious-Preoccupied';
  } else if (anxietyScore < 3.5 && avoidanceScore >= 3.5) {
    attachmentStyle = 'Dismissive-Avoidant';
  } else {
    attachmentStyle = 'Fearful-Avoidant';
  }

  return {
    instrumentId: 'ecr_r_short',
    subscaleScores: {
      anxiety: Math.round(anxietyScore * 100) / 100,
      avoidance: Math.round(avoidanceScore * 100) / 100,
    },
    interpretation: { attachmentStyle },
  };
}

// ---------------------------------------------------------------------------
// 4. SWLS (Satisfaction With Life Scale)
// ---------------------------------------------------------------------------

export function scoreSWLS(responses: Record<string, number>): SWLSScore {
  const total = sumItems(responses, ['1','2','3','4','5']); // Range: 5–35

  let level: string;
  if (total >= 31) level = 'Extremely satisfied';
  else if (total >= 26) level = 'Satisfied';
  else if (total >= 21) level = 'Slightly satisfied';
  else if (total === 20) level = 'Neutral';
  else if (total >= 15) level = 'Slightly dissatisfied';
  else if (total >= 10) level = 'Dissatisfied';
  else level = 'Extremely dissatisfied';

  return {
    instrumentId: 'swls',
    totalScore: total,
    interpretation: { level },
  };
}

// ---------------------------------------------------------------------------
// 5. SCS-SF (Self-Compassion Scale — Short Form)
// ---------------------------------------------------------------------------

export function scoreSCS_SF(responses: Record<string, number>): SCSSFScore {
  // Positive subscales (no reversal): Self-Kindness (2,6), Common Humanity (5,10), Mindfulness (3,7)
  // Negative subscales (reverse-scored): Self-Judgment (11,12), Isolation (4,8), Over-Identification (1,9)
  
  const selfKindness = meanItems(responses, ['2','6']);
  const selfJudgment = meanItems(responses, ['11','12']); // Note: raw scores, reversed for total
  const commonHumanity = meanItems(responses, ['5','10']);
  const isolation = meanItems(responses, ['4','8']); // raw scores, reversed for total
  const mindfulness = meanItems(responses, ['3','7']);
  const overIdentification = meanItems(responses, ['1','9']); // raw scores, reversed for total

  // Total: reverse the negative subscales, then mean of all 12
  const reversedItems = [
    val(responses, '2'), val(responses, '6'),     // Self-Kindness (keep)
    reverse(val(responses, '11'), 5), reverse(val(responses, '12'), 5), // Self-Judgment (reverse)
    val(responses, '5'), val(responses, '10'),     // Common Humanity (keep)
    reverse(val(responses, '4'), 5), reverse(val(responses, '8'), 5),   // Isolation (reverse)
    val(responses, '3'), val(responses, '7'),      // Mindfulness (keep)
    reverse(val(responses, '1'), 5), reverse(val(responses, '9'), 5),   // Over-Identification (reverse)
  ];
  const total = reversedItems.reduce((s, v) => s + v, 0) / 12;

  return {
    instrumentId: 'scs_sf',
    totalScore: Math.round(total * 100) / 100,
    subscaleScores: {
      selfKindness: Math.round(selfKindness * 100) / 100,
      selfJudgment: Math.round(selfJudgment * 100) / 100,
      commonHumanity: Math.round(commonHumanity * 100) / 100,
      isolation: Math.round(isolation * 100) / 100,
      mindfulness: Math.round(mindfulness * 100) / 100,
      overIdentification: Math.round(overIdentification * 100) / 100,
    },
  };
}

// ---------------------------------------------------------------------------
// 6. DERS-16 (Difficulty in Emotion Regulation)
// ---------------------------------------------------------------------------

export function scoreDERS16(responses: Record<string, number>): DERS16Score {
  // Canonical Bjureberg (2016) DERS-16 — J Psychopathol Behav Assess 38:284–296
  // (PMC4882111). Five facets, NO Awareness facet, and NO reverse-keyed items:
  // every item is worded toward difficulty (higher = more difficulty). The
  // item→facet map and administration order follow the published appendix.
  //
  // Re-fielded 2026-06-30: replaced the earlier DERS-SF/DERS-16 hybrid that
  // carried a reverse-scored Awareness item ("I pay attention to how I feel").
  // Re-fielding changes item text, which invalidates previously stored DERS
  // responses by design — done for psychometric fidelity while pre-launch
  // (founder-approved; assessments will be retaken). See DECODED_SCORING.md §6.
  const clarity = sumItems(responses, ['1', '2']);                        // make sense of / confused about feelings
  const goals = sumItems(responses, ['3', '7', '15']);                    // work done / focusing / thinking about anything else
  const impulse = sumItems(responses, ['4', '8', '11']);                  // out of control / out of control / controlling behaviors
  const strategies = sumItems(responses, ['5', '6', '12', '14', '16']);   // remain upset / depressed / nothing helps / bad about self / overwhelmed
  const nonAcceptance = sumItems(responses, ['9', '10', '13']);           // ashamed / weak / irritated at self for feeling

  // Total: plain sum of all 16 items (no reversals). Range 16–80; higher = more difficulty.
  const total = sumItems(responses,
    ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16']
  );

  return {
    instrumentId: 'ders16',
    totalScore: total,
    subscaleScores: {
      clarity,
      goals,
      impulse,
      nonAcceptance,
      strategies,
    },
  };
}

// ---------------------------------------------------------------------------
// 7. WEIMS (Work Extrinsic & Intrinsic Motivation Scale)
// ---------------------------------------------------------------------------

export function scoreWEIMS(responses: Record<string, number>): WEIMSScore {
  const types: Record<string, string[]> = {
    intrinsic:    ['4','8','15'],
    integrated:   ['5','10','18'],
    identified:   ['1','7','14'],
    introjected:  ['6','11','13'],
    external:     ['2','9','16'],
    amotivation:  ['3','12','17'],
  };

  const subscaleScores: Record<string, number> = {};
  for (const [type, items] of Object.entries(types)) {
    subscaleScores[type] = Math.round(meanItems(responses, items) * 100) / 100;
  }

  // Work Self-Determination Index (W-SDI) — canonical weighting from Tremblay
  // et al. (2009), grounded in the SDT autonomy continuum:
  //   W-SDI = +3·IM + 2·INTEG + 1·IDEN − 1·INTRO − 2·EXT − 3·AMO
  // With subscale MEANS on the 1–7 scale this ranges ±36 (±24 on a 5-pt scale);
  // positive = self-determined, negative = controlled/amotivated.
  // (Previously used non-canonical weights +2/+1/+1/−1/−1/−2, which both
  // mis-weighted the regulations and compressed the range.)
  const sdi =
    (3 * subscaleScores.intrinsic + 2 * subscaleScores.integrated + subscaleScores.identified)
    - (subscaleScores.introjected + 2 * subscaleScores.external + 3 * subscaleScores.amotivation);

  return {
    instrumentId: 'weims',
    subscaleScores: subscaleScores as WEIMSScore['subscaleScores'],
    interpretation: { sdi: Math.round(sdi * 100) / 100 },
  };
}

// ---------------------------------------------------------------------------
// 8. Flourishing Scale
// ---------------------------------------------------------------------------

export function scoreFlourishingScale(responses: Record<string, number>): FlourishingScore {
  const total = sumItems(responses, ['1','2','3','4','5','6','7','8']); // Range: 8–56

  let level: string;
  if (total >= 48) level = 'High flourishing';
  else if (total >= 40) level = 'Moderate-high flourishing';
  else if (total >= 32) level = 'Moderate flourishing';
  else if (total >= 24) level = 'Low-moderate flourishing';
  else level = 'Low flourishing';

  return {
    instrumentId: 'flourishing',
    totalScore: total,
    interpretation: { level },
  };
}

// ---------------------------------------------------------------------------
// 9. Decoded Wellness Check (Custom — DWC)
// ---------------------------------------------------------------------------

export function scoreWellnessCheck(responses: Record<string, number>): WellnessCheckScore {
  // Item scales and normalization:
  // 1: exercise (0-7)    → normalize to 0-100
  // 2: sleep (1-6)       → normalize to 0-100
  // 3: nutrition (1-5)   → normalize to 0-100
  // 4: energy drain (1-5) → INVERT then normalize (higher raw = worse)
  // 5: stress impact (1-5) → INVERT then normalize (higher raw = worse)
  // 6: coping (1-5)      → normalize to 0-100
  // 7: social (1-5)      → normalize to 0-100
  // 8: purpose (1-5)     → normalize to 0-100
  // 9: screen time (1-6) → INVERT then normalize (higher raw = worse)
  // 10: vitality (1-5)   → normalize to 0-100

  const normalize = (value: number, min: number, max: number) => 
    Math.round(((value - min) / (max - min)) * 100);
  
  const exercise = normalize(val(responses, '1'), 0, 7);
  const sleep = normalize(val(responses, '2'), 1, 6);
  const nutrition = normalize(val(responses, '3'), 1, 5);
  const energy = normalize(reverse(val(responses, '4'), 5), 1, 5);    // Invert: high raw = low energy
  const stress = normalize(reverse(val(responses, '5'), 5), 1, 5);    // Invert: high raw = high stress (bad)
  const coping = normalize(val(responses, '6'), 1, 5);
  const social = normalize(val(responses, '7'), 1, 5);
  const purpose = normalize(val(responses, '8'), 1, 5);
  const screenTime = normalize(reverse(val(responses, '9'), 6), 1, 6); // Invert: high raw = lots of screen time (bad)
  const vitality = normalize(val(responses, '10'), 1, 5);

  const dimensions = { exercise, sleep, nutrition, energy, stress, coping, social, purpose, screenTime, vitality };
  const overallWellness = Math.round(
    Object.values(dimensions).reduce((s, v) => s + v, 0) / 10
  );

  return {
    instrumentId: 'wellness_check',
    subscaleScores: dimensions,
    interpretation: { overallWellness },
  };
}

// ---------------------------------------------------------------------------
// 10. GAD-7 (Generalized Anxiety)
// ---------------------------------------------------------------------------

export function scoreGAD7(responses: Record<string, number>): GAD7Score {
  const total = sumItems(responses, ['1','2','3','4','5','6','7']); // Range: 0–21

  let severity: string;
  if (total >= 15) severity = 'Severe';
  else if (total >= 10) severity = 'Moderate';
  else if (total >= 5) severity = 'Mild';
  else severity = 'Minimal';

  return {
    instrumentId: 'gad7',
    totalScore: total,
    interpretation: { severity },
  };
}

// ---------------------------------------------------------------------------
// 11. ASRS-v1.1 (ADHD Self-Report Screener)
// ---------------------------------------------------------------------------

export function scoreASRS(responses: Record<string, number>): ASRSScore {
  // Items 1–3: score ≥ 2 counts as positive
  // Items 4–6: score ≥ 3 counts as positive
  let positiveCount = 0;
  for (let i = 1; i <= 3; i++) {
    if (val(responses, String(i)) >= 2) positiveCount++;
  }
  for (let i = 4; i <= 6; i++) {
    if (val(responses, String(i)) >= 3) positiveCount++;
  }

  return {
    instrumentId: 'asrs',
    interpretation: {
      positiveCount,
      screenPositive: positiveCount >= 4,
    },
  };
}

// ---------------------------------------------------------------------------
// 12. CSI-4 (Couples Satisfaction Index — Short)
// ---------------------------------------------------------------------------

export function scoreCSI4(responses: Record<string, number>): CSI4Score {
  // Item 1: 0–6; Items 2–4: 0–5. Total: 0–21
  const total = sumItems(responses, ['1','2','3','4']);

  return {
    instrumentId: 'csi4',
    totalScore: total,
    interpretation: {
      distressed: total <= 13.5,
    },
  };
}

// ---------------------------------------------------------------------------
// 13. ACE-3 (Adverse Childhood Experiences — Short)
// ---------------------------------------------------------------------------

export function scoreACE3(responses: Record<string, number>): ACE3Score {
  const total = sumItems(responses, ['1','2','3']); // Range: 0–3

  return {
    instrumentId: 'ace3',
    totalScore: total,
  };
}

// ---------------------------------------------------------------------------
// Coaching Flags Derivation
// ---------------------------------------------------------------------------

export function deriveCoachingFlags(scores: InstrumentScore[]): CoachingFlags {
  const ipip = scores.find(s => s.instrumentId === 'ipip50') as IPIP50Score | undefined;
  const ecr = scores.find(s => s.instrumentId === 'ecr_r_short') as ECRRShortScore | undefined;
  const wellness = scores.find(s => s.instrumentId === 'wellness_check') as WellnessCheckScore | undefined;

  return {
    highNeuroticism: (ipip?.subscaleScores?.neuroticism ?? 0) >= 38,
    lowConscientiousness: (ipip?.subscaleScores?.conscientiousness ?? 50) <= 20,
    insecureAttachment: (ecr?.subscaleScores?.anxiety ?? 0) >= 4.0 || (ecr?.subscaleScores?.avoidance ?? 0) >= 4.0,
    sedentary: (wellness?.subscaleScores?.exercise ?? 100) === 0,
    sleepDeficit: (wellness?.subscaleScores?.sleep ?? 100) < 30, // Mapped from <6h
    highStress: (wellness?.subscaleScores?.stress ?? 0) <= 25, // Low stress score (inverted) = high stress
    socialIsolation: (wellness?.subscaleScores?.social ?? 100) === 0,
    lowOverallWellness: (wellness?.interpretation?.overallWellness ?? 100) < 40,
  };
}

// ---------------------------------------------------------------------------
// Response Validity Check (S0.1.5a)
// ---------------------------------------------------------------------------

export function checkResponseValidity(
  responses: Record<string, number>,
  instrumentId: string,
  reverseItems: string[],
  positiveItems: string[],
): ValidityCheckResult {
  const issues: ValidityIssue[] = [];

  // 1. Straight-lining: ≥10 consecutive items with same value
  const keys = Object.keys(responses).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    return isNaN(numA) || isNaN(numB) ? a.localeCompare(b) : numA - numB;
  });

  let consecutiveCount = 1;
  for (let i = 1; i < keys.length; i++) {
    if (responses[keys[i]] === responses[keys[i - 1]]) {
      consecutiveCount++;
      if (consecutiveCount >= 10) {
        issues.push({
          type: 'straight_lining',
          instrumentId,
          description: `${consecutiveCount} consecutive identical responses (value: ${responses[keys[i]]})`,
          severity: 'warning',
        });
        break; // Only flag once
      }
    } else {
      consecutiveCount = 1;
    }
  }

  // 2. Contradictory reverse-scored pairs
  // For items that are reverse-scored, check if the user answered the same
  // for both a positive and its corresponding reverse item
  // This is a heuristic: if pos item = 5 and reverse item = 5 on a 1-5 scale,
  // they should logically disagree — this suggests careless responding
  if (reverseItems.length > 0 && positiveItems.length > 0) {
    const pairsToCheck = Math.min(reverseItems.length, positiveItems.length);
    let contradictions = 0;
    
    for (let i = 0; i < pairsToCheck; i++) {
      const posVal = responses[positiveItems[i]];
      const negVal = responses[reverseItems[i]];
      if (posVal !== undefined && negVal !== undefined) {
        // If both are at the same extreme (both high or both low), that's contradictory
        if (posVal === negVal && (posVal === 1 || posVal === 5)) {
          contradictions++;
        }
      }
    }
    
    if (contradictions >= 3) {
      issues.push({
        type: 'contradictory_reverse',
        instrumentId,
        description: `${contradictions} contradictory pairs between positive and reverse-scored items`,
        severity: contradictions >= 5 ? 'critical' : 'warning',
      });
    }
  }

  return {
    isValid: issues.filter(i => i.severity === 'critical').length === 0,
    issues,
  };
}

// ---------------------------------------------------------------------------
// Master Scorer — Runs all applicable instruments
// ---------------------------------------------------------------------------

export function scoreAllInstruments(
  allResponses: Record<string, Record<string, number>>,
): InstrumentScore[] {
  const scores: InstrumentScore[] = [];

  if (allResponses.ipip50) scores.push(scoreIPIP50(allResponses.ipip50));
  if (allResponses.riasec) scores.push(scoreRIASEC(allResponses.riasec));
  if (allResponses.ecr_r_short) scores.push(scoreECR_R_Short(allResponses.ecr_r_short));
  if (allResponses.swls) scores.push(scoreSWLS(allResponses.swls));
  if (allResponses.scs_sf) scores.push(scoreSCS_SF(allResponses.scs_sf));
  if (allResponses.ders16) scores.push(scoreDERS16(allResponses.ders16));
  if (allResponses.weims) scores.push(scoreWEIMS(allResponses.weims));
  if (allResponses.flourishing) scores.push(scoreFlourishingScale(allResponses.flourishing));
  if (allResponses.wellness_check) scores.push(scoreWellnessCheck(allResponses.wellness_check));
  if (allResponses.gad7) scores.push(scoreGAD7(allResponses.gad7));
  if (allResponses.asrs) scores.push(scoreASRS(allResponses.asrs));
  if (allResponses.csi4) scores.push(scoreCSI4(allResponses.csi4));
  if (allResponses.ace3) scores.push(scoreACE3(allResponses.ace3));

  return scores;
}
