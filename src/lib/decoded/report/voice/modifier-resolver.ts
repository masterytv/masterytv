/**
 * Decoded Report — Tone Modifier Resolver
 *
 * Evaluates clinical instrument scores against configurable trigger
 * conditions to determine which tone modifiers are active.
 *
 * Architecture: DECODED_NARRATIVE_VOICES_ARCHITECTURE.md §3.2
 * PRD: NVR09–NVR14
 */

import type { InstrumentScore } from '../../scoring/types';
import type {
  ToneModifier,
  ToneModifierTrigger,
  ModifierId,
  ScoreThresholdTrigger,
  InterpretationMatchTrigger,
  CompoundTrigger,
} from './types';
import { TONE_MODIFIERS } from './config';

// Re-use the safety flags interface shape without importing the module
// to avoid a circular dependency. The resolver only needs the relevant fields.
interface SafetyFlagsInput {
  highDistress: boolean;
  emotionalRegulationConcern?: boolean;
  forceModifiers?: ModifierId[];
}

export interface ModifierResolutionResult {
  /** Active tone modifiers (deduplicated) */
  modifiers: ToneModifier[];
  /** Modifier IDs that were forced by the safety layer (not by trigger evaluation) */
  safetyForced: ModifierId[];
}

/**
 * Resolve which tone modifiers are active for this user's scores.
 *
 * Algorithm:
 * 1. Evaluate each modifier's trigger condition against the scores
 * 2. Check safety flag overrides (highDistress → compassion_boost + anxiety_softener)
 * 3. Return deduplicated array of active modifiers
 *
 * Complexity: O(M × I) where M = 4 modifiers, I = instruments. Effectively O(1).
 * Latency: <5ms
 */
export function resolveModifiers(
  scores: InstrumentScore[],
  safetyFlags: SafetyFlagsInput,
): ModifierResolutionResult {
  const active = new Map<ModifierId, ToneModifier>();
  const safetyForced: ModifierId[] = [];

  // 1. Evaluate trigger conditions for each modifier
  for (const modifier of Object.values(TONE_MODIFIERS)) {
    if (evaluateTrigger(modifier.trigger, scores)) {
      active.set(modifier.id, modifier);
    }
  }

  // 2. Safety overrides (NVR10, NVR11)
  // These are forced regardless of trigger evaluation
  if (safetyFlags.highDistress) {
    forceModifier('compassion_boost', active, safetyForced);
    forceModifier('anxiety_softener', active, safetyForced);
  }
  if (safetyFlags.emotionalRegulationConcern) {
    forceModifier('emotion_regulation_buffer', active, safetyForced);
  }

  // 3. Also respect any explicit forceModifiers from the safety layer
  if (safetyFlags.forceModifiers) {
    for (const modId of safetyFlags.forceModifiers) {
      forceModifier(modId, active, safetyForced);
    }
  }

  return {
    modifiers: Array.from(active.values()),
    safetyForced,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Trigger Evaluation Engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate a trigger condition against an array of instrument scores.
 * Supports three evaluation modes: score_threshold, interpretation_match, compound.
 */
export function evaluateTrigger(
  trigger: ToneModifierTrigger,
  scores: InstrumentScore[],
): boolean {
  switch (trigger.type) {
    case 'score_threshold':
      return evaluateScoreThreshold(trigger, scores);
    case 'interpretation_match':
      return evaluateInterpretationMatch(trigger, scores);
    case 'compound':
      return evaluateCompound(trigger, scores);
    default:
      // Exhaustive check — TypeScript will catch unhandled cases
      return false;
  }
}

/**
 * Evaluate a score_threshold trigger.
 * Extracts a numeric value from the specified score field and compares it.
 */
function evaluateScoreThreshold(
  trigger: ScoreThresholdTrigger,
  scores: InstrumentScore[],
): boolean {
  const instrument = scores.find((s) => s.instrumentId === trigger.instrumentId);
  if (!instrument) return false;

  const value = extractScoreValue(instrument, trigger.scoreField);
  if (value === null) return false;

  switch (trigger.operator) {
    case 'gte':
      return value >= trigger.threshold;
    case 'lte':
      return value <= trigger.threshold;
    default:
      return false;
  }
}

/**
 * Extract a numeric value from an InstrumentScore using a dot-path field reference.
 *
 * Supports:
 * - 'totalScore' → instrument.totalScore
 * - 'subscaleScores.<key>' → instrument.subscaleScores[key]
 */
function extractScoreValue(
  instrument: InstrumentScore,
  scoreField: string,
): number | null {
  if (scoreField === 'totalScore') {
    return instrument.totalScore ?? null;
  }

  // Handle subscaleScores.<key> paths
  if (scoreField.startsWith('subscaleScores.')) {
    const key = scoreField.slice('subscaleScores.'.length);
    const value = instrument.subscaleScores?.[key];
    return typeof value === 'number' ? value : null;
  }

  return null;
}

/**
 * Evaluate an interpretation_match trigger.
 * Checks if an interpretation field value matches any of the expected values.
 */
function evaluateInterpretationMatch(
  trigger: InterpretationMatchTrigger,
  scores: InstrumentScore[],
): boolean {
  const instrument = scores.find((s) => s.instrumentId === trigger.instrumentId);
  if (!instrument) return false;

  const fieldValue = instrument.interpretation?.[trigger.interpretationField];
  if (fieldValue === undefined || fieldValue === null) return false;

  // Convert to string for comparison (interpretation values can be string | boolean | number)
  const stringValue = String(fieldValue);
  return trigger.matchValues.includes(stringValue);
}

/**
 * Evaluate a compound trigger (AND/OR combinator with nested conditions).
 */
function evaluateCompound(
  trigger: CompoundTrigger,
  scores: InstrumentScore[],
): boolean {
  if (trigger.conditions.length === 0) return false;

  if (trigger.combinator === 'AND') {
    return trigger.conditions.every((condition) =>
      evaluateTrigger(condition, scores),
    );
  }

  // OR
  return trigger.conditions.some((condition) =>
    evaluateTrigger(condition, scores),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Force a modifier into the active set.
 * If it's already active from trigger evaluation, only add to safetyForced tracking.
 * If it's not active, add it from TONE_MODIFIERS and track as safety-forced.
 */
function forceModifier(
  id: ModifierId,
  active: Map<ModifierId, ToneModifier>,
  safetyForced: ModifierId[],
): void {
  const modifier = TONE_MODIFIERS[id];
  if (!modifier) return;

  // Track that this was safety-forced (even if it was already triggered)
  if (!safetyForced.includes(id)) {
    safetyForced.push(id);
  }

  // Add to active set if not already there
  if (!active.has(id)) {
    active.set(id, modifier);
  }
}
