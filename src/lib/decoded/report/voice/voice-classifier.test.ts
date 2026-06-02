/**
 * Voice Classifier — Unit Tests (S04)
 *
 * Validates the deterministic archetype → voice mapping,
 * fallback behavior, and direct voice lookup.
 *
 * Run with: npx vitest run src/lib/decoded/report/voice/voice-classifier.test.ts
 */

import { describe, it, expect } from 'vitest';
import type { ArchetypeResult } from '../../archetypes/types';
import type { VoiceId } from './types';
import { classifyVoice, getVoiceById, getVoiceIdForArchetype } from './voice-classifier';
import { VOICE_PROFILES, ARCHETYPE_VOICE_MAP, FALLBACK_VOICE } from './config';

// ── Test Fixtures ────────────────────────────────────────────────────────────

/** Minimal ArchetypeResult factory. Only `primary.name` matters for voice classification. */
function makeArchetype(name: string, distance = 0.5): ArchetypeResult {
  return {
    primary: { name: name as ArchetypeResult['primary']['name'], distance },
    secondary: { name: 'Sage' as ArchetypeResult['secondary']['name'], distance: 1.2 },
    isBlended: false,
    zScores: { O: 0, C: 0, E: 0, A: 0, N: 0 },
    allDistances: [],
  };
}

// ── classifyVoice ────────────────────────────────────────────────────────────

describe('classifyVoice', () => {
  it('maps Architect → intellectual', () => {
    const result = classifyVoice(makeArchetype('Architect'));
    expect(result.id).toBe('intellectual');
    expect(result.displayName).toBe('The Intellectual');
  });

  it('maps Sage → intellectual', () => {
    const result = classifyVoice(makeArchetype('Sage'));
    expect(result.id).toBe('intellectual');
  });

  it('maps Strategist → intellectual', () => {
    const result = classifyVoice(makeArchetype('Strategist'));
    expect(result.id).toBe('intellectual');
  });

  it('maps Explorer → adventurer', () => {
    const result = classifyVoice(makeArchetype('Explorer'));
    expect(result.id).toBe('adventurer');
  });

  it('maps Catalyst → adventurer', () => {
    const result = classifyVoice(makeArchetype('Catalyst'));
    expect(result.id).toBe('adventurer');
  });

  it('maps Maverick → adventurer', () => {
    const result = classifyVoice(makeArchetype('Maverick'));
    expect(result.id).toBe('adventurer');
  });

  it('maps Rebel → adventurer', () => {
    const result = classifyVoice(makeArchetype('Rebel'));
    expect(result.id).toBe('adventurer');
  });

  it('maps Advocate → connector', () => {
    const result = classifyVoice(makeArchetype('Advocate'));
    expect(result.id).toBe('connector');
  });

  it('maps Diplomat → connector', () => {
    const result = classifyVoice(makeArchetype('Diplomat'));
    expect(result.id).toBe('connector');
  });

  it('maps Luminary → connector', () => {
    const result = classifyVoice(makeArchetype('Luminary'));
    expect(result.id).toBe('connector');
  });

  it('maps Sentinel → steward', () => {
    const result = classifyVoice(makeArchetype('Sentinel'));
    expect(result.id).toBe('steward');
  });

  it('maps Guardian → steward', () => {
    const result = classifyVoice(makeArchetype('Guardian'));
    expect(result.id).toBe('steward');
  });

  it('maps Anchor → steward', () => {
    const result = classifyVoice(makeArchetype('Anchor'));
    expect(result.id).toBe('steward');
  });

  it('maps Commander → challenger', () => {
    const result = classifyVoice(makeArchetype('Commander'));
    expect(result.id).toBe('challenger');
  });

  it('maps Healer → sensitive', () => {
    const result = classifyVoice(makeArchetype('Healer'));
    expect(result.id).toBe('sensitive');
  });

  it('maps Artist → sensitive', () => {
    const result = classifyVoice(makeArchetype('Artist'));
    expect(result.id).toBe('sensitive');
  });

  it('returns a full VoiceProfile with all required fields', () => {
    const result = classifyVoice(makeArchetype('Architect'));
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('displayName');
    expect(result).toHaveProperty('description');
    expect(result).toHaveProperty('dimensions');
    expect(result).toHaveProperty('promptBlock');
    expect(result).toHaveProperty('examplePhrases');
    expect(result.examplePhrases.length).toBeGreaterThanOrEqual(3);
  });

  it('falls back to connector for unknown archetypes', () => {
    const result = classifyVoice(makeArchetype('UnknownType'));
    expect(result.id).toBe(FALLBACK_VOICE);
    expect(result.id).toBe('connector');
  });

  it('is deterministic: same input always produces same output', () => {
    const a = classifyVoice(makeArchetype('Commander'));
    const b = classifyVoice(makeArchetype('Commander'));
    expect(a.id).toBe(b.id);
    expect(a.promptBlock).toBe(b.promptBlock);
  });

  it('ignores secondary archetype (uses primary only)', () => {
    const arch = makeArchetype('Commander');
    arch.secondary = { name: 'Healer' as ArchetypeResult['secondary']['name'], distance: 0.6 };
    arch.isBlended = true;
    const result = classifyVoice(arch);
    // Should be challenger (from Commander), not sensitive (from Healer)
    expect(result.id).toBe('challenger');
  });
});

// ── getVoiceById ─────────────────────────────────────────────────────────────

describe('getVoiceById', () => {
  it('returns correct profile for each valid voice ID', () => {
    const ids: VoiceId[] = ['intellectual', 'adventurer', 'connector', 'steward', 'challenger', 'sensitive'];
    for (const id of ids) {
      const result = getVoiceById(id);
      expect(result.id).toBe(id);
    }
  });

  it('returns fallback voice for invalid ID', () => {
    const result = getVoiceById('nonexistent');
    expect(result.id).toBe(FALLBACK_VOICE);
  });

  it('returns fallback voice for empty string', () => {
    const result = getVoiceById('');
    expect(result.id).toBe(FALLBACK_VOICE);
  });
});

// ── getVoiceIdForArchetype ───────────────────────────────────────────────────

describe('getVoiceIdForArchetype', () => {
  it('returns correct voice ID for every mapped archetype', () => {
    for (const [archetype, expectedVoice] of Object.entries(ARCHETYPE_VOICE_MAP)) {
      expect(getVoiceIdForArchetype(archetype)).toBe(expectedVoice);
    }
  });

  it('returns fallback voice ID for unknown archetype', () => {
    expect(getVoiceIdForArchetype('FakeArchetype')).toBe(FALLBACK_VOICE);
  });
});

// ── Config Integrity ─────────────────────────────────────────────────────────

describe('config integrity', () => {
  it('all 16 archetypes are mapped to a voice', () => {
    const mapped = Object.keys(ARCHETYPE_VOICE_MAP);
    expect(mapped).toHaveLength(16);
  });

  it('all archetype map values are valid voice IDs', () => {
    const validVoiceIds = Object.keys(VOICE_PROFILES);
    for (const voiceId of Object.values(ARCHETYPE_VOICE_MAP)) {
      expect(validVoiceIds).toContain(voiceId);
    }
  });

  it('all 6 voice profiles have dimensions in range 1-10', () => {
    for (const profile of Object.values(VOICE_PROFILES)) {
      for (const [key, value] of Object.entries(profile.dimensions)) {
        expect(value, `${profile.id}.${key}`).toBeGreaterThanOrEqual(1);
        expect(value, `${profile.id}.${key}`).toBeLessThanOrEqual(10);
      }
    }
  });

  it('no voice profile prompt block contains em dashes', () => {
    for (const profile of Object.values(VOICE_PROFILES)) {
      expect(profile.promptBlock, `${profile.id} promptBlock`).not.toContain('—');
      for (const phrase of profile.examplePhrases) {
        expect(phrase, `${profile.id} examplePhrase`).not.toContain('—');
      }
    }
  });

  it('fallback voice exists in VOICE_PROFILES', () => {
    expect(VOICE_PROFILES[FALLBACK_VOICE]).toBeDefined();
  });
});
