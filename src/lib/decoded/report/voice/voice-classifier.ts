/**
 * Decoded Report — Voice Classifier
 *
 * Maps an archetype classification result to a narrative voice.
 * Pure function, deterministic, no API calls — O(1) map lookup.
 *
 * Architecture: DECODED_NARRATIVE_VOICES_ARCHITECTURE.md §3.2
 * ADR-02: Map lookup, not secondary z-score calculation
 */

import type { ArchetypeResult } from '../../archetypes/types';
import type { VoiceId, VoiceProfile } from './types';
import { ARCHETYPE_VOICE_MAP, VOICE_PROFILES, FALLBACK_VOICE } from './config';

/**
 * Classify an archetype result into a narrative voice.
 *
 * Algorithm:
 * 1. Look up primary archetype in ARCHETYPE_VOICE_MAP
 * 2. If not found (shouldn't happen — config validation catches this), use FALLBACK_VOICE
 * 3. Return the full VoiceProfile
 *
 * Uses primary archetype only — secondary/blended archetypes do not affect voice selection.
 * This keeps the system simple and deterministic (PRD: NVR03).
 *
 * Complexity: O(1) — two map lookups
 * Latency: <1ms
 */
export function classifyVoice(archetype: ArchetypeResult): VoiceProfile {
  const voiceId: VoiceId =
    ARCHETYPE_VOICE_MAP[archetype.primary.name] ?? FALLBACK_VOICE;

  return VOICE_PROFILES[voiceId];
}

/**
 * Get a VoiceProfile by its ID directly.
 * Used by the rewrite flow when the user selects a specific voice.
 *
 * Returns the fallback voice if the ID is invalid.
 */
export function getVoiceById(id: string): VoiceProfile {
  if (id in VOICE_PROFILES) {
    return VOICE_PROFILES[id as VoiceId];
  }
  return VOICE_PROFILES[FALLBACK_VOICE];
}

/**
 * Get the VoiceId for a given archetype name.
 * Returns the fallback voice ID if the archetype is unknown.
 */
export function getVoiceIdForArchetype(archetypeName: string): VoiceId {
  return (ARCHETYPE_VOICE_MAP as Record<string, VoiceId>)[archetypeName] ?? FALLBACK_VOICE;
}
