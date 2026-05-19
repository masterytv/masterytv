/**
 * Decoded Report — Safety Layer
 *
 * Pre-generation safety checks and content guardrails.
 * Ensures report content is clinically responsible without
 * being clinical — growth-oriented framing always.
 */

import type { InstrumentScore } from '../scoring/types';

export interface SafetyFlags {
  /** ACE ≥ 1 AND (GAD-7 ≥ 15 OR DERS-16 ≥ 60) → show crisis resources */
  showCrisisResources: boolean;
  /** GAD-7 severity = "Severe" → add professional support note to RS08 */
  highDistress: boolean;
  /** DERS-16 total ≥ 60 → flag emotional regulation concerns */
  emotionalRegulationConcern: boolean;
  /** Overall risk level for prompt injection */
  riskLevel: 'standard' | 'elevated' | 'high';
}

/**
 * Evaluate safety flags from scored instruments.
 * These flags modify prompt content and add disclaimers.
 */
export function evaluateSafetyFlags(scores: InstrumentScore[]): SafetyFlags {
  const gad7 = scores.find((s) => s.instrumentId === 'gad7');
  const ace3 = scores.find((s) => s.instrumentId === 'ace3');
  const ders16 = scores.find((s) => s.instrumentId === 'ders16');

  const gad7Total = gad7?.totalScore ?? 0;
  const ace3Total = ace3?.totalScore ?? 0;
  const ders16Total = ders16?.totalScore ?? 16;
  const gad7Severity = (gad7?.interpretation?.severity as string) ?? 'minimal';

  const highDistress = gad7Severity === 'Severe' || gad7Total >= 15;
  const emotionalRegulationConcern = ders16Total >= 60;

  // Crisis resources: elevated ACE + clinical-level distress
  const showCrisisResources = ace3Total >= 1 && (gad7Total >= 15 || ders16Total >= 60);

  // Overall risk
  let riskLevel: SafetyFlags['riskLevel'] = 'standard';
  if (showCrisisResources) riskLevel = 'high';
  else if (highDistress || emotionalRegulationConcern) riskLevel = 'elevated';

  return {
    showCrisisResources,
    highDistress,
    emotionalRegulationConcern,
    riskLevel,
  };
}

/**
 * Safety prompt addendum injected when risk flags are elevated.
 * Appended to the system prompt for relevant sections.
 */
export function getSafetyPromptAddendum(flags: SafetyFlags): string {
  const parts: string[] = [];

  if (flags.highDistress) {
    parts.push(
      `SAFETY NOTE: This person's anxiety scores indicate significant distress. ` +
      `In your narrative, gently acknowledge that some of these patterns may feel overwhelming right now. ` +
      `Include a brief, non-clinical suggestion to explore professional support: ` +
      `"If any of this feels like more than you can navigate alone, a licensed therapist can be a powerful ally." ` +
      `Do NOT diagnose or use clinical language.`,
    );
  }

  if (flags.emotionalRegulationConcern) {
    parts.push(
      `SAFETY NOTE: Emotional regulation scores suggest significant difficulty in managing intense emotions. ` +
      `Frame this as a skill gap (learnable), not a character flaw. ` +
      `Mention that these patterns often respond well to targeted work with a coach or therapist.`,
    );
  }

  return parts.join('\n\n');
}

/** Non-clinical disclaimer shown at the top of every report */
export const REPORT_DISCLAIMER = 
  `This report is for personal insight and growth — not a clinical diagnosis. ` +
  `The assessments used are validated research instruments, but their application here ` +
  `is for self-understanding, not medical evaluation. If you're experiencing significant ` +
  `distress, please consult a licensed mental health professional.`;

/** Crisis resources shown when safety flags indicate high risk */
export const CRISIS_RESOURCES = [
  { name: '988 Suicide & Crisis Lifeline', contact: 'Call or text 988', region: 'US' },
  { name: 'Crisis Text Line', contact: 'Text HOME to 741741', region: 'US' },
  { name: 'SAMHSA Helpline', contact: '1-800-662-4357', region: 'US' },
  { name: 'International Association for Suicide Prevention', contact: 'https://www.iasp.info/resources/Crisis_Centres/', region: 'Global' },
];
