/**
 * Decoded → Coach Handoff: Prompt Layer
 *
 * Converts an AssessmentProfile into a natural-language system prompt fragment
 * that plugs into the 11-layer prompt assembler as Layer 4.5 (between
 * User Profile and Entities).
 *
 * Why a separate layer: The coaching engine was designed for users who
 * start from zero context. Decoded users arrive with a rich personality
 * profile. This layer ensures the coach "already knows" them on day one,
 * eliminating the cold-start problem.
 *
 * Sprint 0.4 — S0.4.2
 */

import type { AssessmentProfile } from './assessment-profile';
import { attachmentNaming } from './attachment-style';

/**
 * Build the Decoded Assessment context block for the coaching system prompt.
 *
 * Design decisions:
 * - Uses natural language, not JSON — the LLM reads prose better than structured data
 * - Includes coaching notes and priorities — not just raw scores
 * - Flags sensitive areas explicitly — the coach must handle these with care
 * - Concise by design — ~400-600 tokens to avoid prompt bloat
 */
export function buildDecodedProfileLayer(profile: AssessmentProfile): string {
  const parts: string[] = [];

  // ── Header ──
  parts.push(`DECODED PERSONALITY ASSESSMENT (completed ${formatDate(profile.assessedAt)}):`);
  parts.push(`This user has completed a comprehensive personality assessment. You already know them deeply — use this knowledge naturally, not as a script to read aloud.`);
  parts.push('');

  // ── Archetype ──
  if (profile.archetype.base !== 'Unknown') {
    parts.push(`ARCHETYPE: "${profile.archetype.sublabel}" (${profile.archetype.base})`);
    if (profile.archetype.tagline) {
      parts.push(`  ${profile.archetype.tagline}`);
    }
    parts.push('');
  }

  // ── Big Five — the core personality landscape ──
  parts.push('PERSONALITY PROFILE (Big Five):');
  const b5 = profile.bigFive;
  parts.push(`  Openness: ${b5.openness.label} (${b5.openness.percentile}th percentile) — ${openessCoachNote(b5.openness.percentile)}`);
  parts.push(`  Conscientiousness: ${b5.conscientiousness.label} (${b5.conscientiousness.percentile}th percentile) — ${conscientiousnessCoachNote(b5.conscientiousness.percentile)}`);
  parts.push(`  Extraversion: ${b5.extraversion.label} (${b5.extraversion.percentile}th percentile) — ${extraversionCoachNote(b5.extraversion.percentile)}`);
  parts.push(`  Agreeableness: ${b5.agreeableness.label} (${b5.agreeableness.percentile}th percentile) — ${agreeablenessCoachNote(b5.agreeableness.percentile)}`);
  parts.push(`  Neuroticism: ${b5.neuroticism.label} (${b5.neuroticism.percentile}th percentile) — ${neuroticismCoachNote(b5.neuroticism.percentile)}`);
  parts.push('');

  // ── Attachment ──
  const att = attachmentNaming(profile.attachment.style);
  parts.push(`ATTACHMENT STYLE: ${att.name} (clinically: ${att.clinical})`);
  parts.push(`  LANGUAGE: call this "${att.name}" with the user — never the clinical label. Frame it as a strategy they learned to stay safe and loved (a starting point, not a flaw or diagnosis), described through what they need — not what they "fear" or "avoid".`);
  if (profile.attachment.style !== 'secure') {
    parts.push(`  Need for reassurance: ${profile.attachment.anxietyLevel.toFixed(1)}/7 | Need for space: ${profile.attachment.avoidanceLevel.toFixed(1)}/7`);
    parts.push(`  Note: Be aware of this in how you build trust and handle closeness/withdrawal patterns.`);
  }
  parts.push('');

  // ── Emotional Regulation (if available) ──
  if (profile.emotionalRegulation) {
    parts.push(`EMOTIONAL REGULATION: ${profile.emotionalRegulation.coachingNote}`);
    parts.push('');
  }

  // ── Self-Compassion (if available) ──
  if (profile.selfCompassion) {
    if (profile.selfCompassion.growthAreas.length > 0) {
      parts.push(`SELF-COMPASSION: Growth areas — ${profile.selfCompassion.growthAreas.join(', ')}`);
      if (profile.selfCompassion.strengths.length > 0) {
        parts.push(`  Strengths to leverage: ${profile.selfCompassion.strengths.join(', ')}`);
      }
      parts.push('');
    }
  }

  // ── Motivation (if available) ──
  if (profile.motivation) {
    parts.push(`MOTIVATION: ${capitalize(profile.motivation.motivationType)} (SDI: ${profile.motivation.sdiScore})`);
    if (profile.motivation.hollandCode) {
      parts.push(`  Holland Code: ${profile.motivation.hollandCode} — consider this when discussing career moves or projects.`);
    }
    parts.push('');
  }

  // ── Wellness (if available) ──
  if (profile.wellness) {
    const w = profile.wellness;
    parts.push(`WELLNESS SNAPSHOT: Overall ${w.overallScore}/100, Flourishing: ${w.flourishingLevel}, Life satisfaction: ${w.lifeSatisfaction}/35`);
    if (w.redFlags.length > 0) {
      parts.push(`  ⚠ Concerns: ${w.redFlags.join(', ')}`);
    }
    if (w.strengths.length > 0) {
      parts.push(`  ✓ Strengths: ${w.strengths.join(', ')}`);
    }
    parts.push('');
  }

  // ── Screening Flags — handle with professional boundaries ──
  const flags = profile.screeningFlags;
  const sensitiveFlags: string[] = [];
  if (flags.anxietySeverity === 'moderate' || flags.anxietySeverity === 'severe') {
    sensitiveFlags.push(`anxiety screening: ${flags.anxietySeverity}`);
  }
  if (flags.adhdScreenPositive) {
    sensitiveFlags.push('ADHD screening: positive (not diagnostic — suggest professional evaluation)');
  }
  if (flags.couplesDistress) {
    sensitiveFlags.push('relationship distress indicated');
  }
  if (flags.aceScore !== null && flags.aceScore >= 2) {
    sensitiveFlags.push(`ACE score: ${flags.aceScore} (handle with trauma-informed care)`);
  }

  if (sensitiveFlags.length > 0) {
    parts.push('SENSITIVE CLINICAL FLAGS (handle with care — you are NOT a therapist):');
    for (const f of sensitiveFlags) {
      parts.push(`  - ${f}`);
    }
    parts.push('  These flags inform your approach but do NOT discuss screening scores directly with the user unless they bring it up.');
    parts.push('');
  }

  // ── Coaching Priorities ──
  if (profile.coachingPriorities.length > 0) {
    parts.push('SUGGESTED COACHING PRIORITIES (from assessment):');
    for (let i = 0; i < profile.coachingPriorities.length; i++) {
      parts.push(`  ${i + 1}. ${profile.coachingPriorities[i]}`);
    }
    parts.push('  Use these as a starting compass, not a rigid agenda. Follow the user\'s energy.');
    parts.push('');
  }

  // ── Integration Instructions ──
  parts.push('HOW TO USE THIS ASSESSMENT DATA:');
  parts.push('- Reference insights naturally, as if you know the user well: "Given your high openness..." not "According to your assessment..."');
  parts.push('- Connect current problems to personality patterns when it adds value.');
  parts.push('- Never read out scores or percentiles unless the user asks.');
  parts.push('- Adapt your coaching style to their profile (e.g., high autonomy → more Catalytic questions).');
  parts.push('- When their behavior contradicts their profile, get curious — that\'s where growth happens.');

  return parts.join('\n');
}

// ─── Coaching Notes per Dimension ─────────────────────────

function openessCoachNote(pct: number): string {
  if (pct >= 75) return 'loves novelty and ideas; may struggle with follow-through or practical grounding';
  if (pct <= 25) return 'prefers proven methods; may resist new frameworks — earn buy-in first';
  return 'balanced openness; open to new approaches with evidence';
}

function conscientiousnessCoachNote(pct: number): string {
  if (pct >= 75) return 'highly disciplined and organized; may over-plan or resist flexibility';
  if (pct <= 25) return 'spontaneous; needs structure from coaching to translate insight into action';
  return 'moderate self-discipline; benefits from lightweight accountability';
}

function extraversionCoachNote(pct: number): string {
  if (pct >= 75) return 'energized by interaction; may avoid difficult solo reflection';
  if (pct <= 25) return 'reflective and reserved; give space, avoid rapid-fire questioning';
  return 'adaptable energy; comfortable in both interactive and reflective modes';
}

function agreeablenessCoachNote(pct: number): string {
  if (pct >= 75) return 'highly cooperative; may avoid conflict or under-advocate for themselves';
  if (pct <= 25) return 'direct and competitive; can handle confronting interventions well';
  return 'balanced; can both collaborate and push back when needed';
}

function neuroticismCoachNote(pct: number): string {
  if (pct >= 75) return 'emotionally reactive; lead with validation before challenge, build safety first';
  if (pct <= 25) return 'emotionally stable; can handle direct challenge — may underestimate emotional undercurrents';
  return 'moderate emotional sensitivity; standard coaching approach';
}

// ─── Utility ──────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return 'recently';
  }
}
