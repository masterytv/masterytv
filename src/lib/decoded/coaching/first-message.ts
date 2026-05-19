/**
 * Decoded → Coach: First Message Generator
 *
 * Generates the coach's opening message for Decoded users.
 * This replaces the cold-start "What brings you here today?"
 * with a warm, personalized greeting that references the user's
 * assessment findings — proving the coach already knows them.
 *
 * Called once when a Decoded user first opens the coaching interface.
 * The message is stored as the first "assistant" message in the conversation.
 *
 * Sprint 0.4 — S0.4.3
 */

import type { AssessmentProfile } from './assessment-profile';

/**
 * Build the coach's first message for a Decoded user.
 *
 * Design principles:
 * - Warm, not clinical. This is a coach, not a report.
 * - Reference 2-3 specific findings — enough to prove depth, not so many it's overwhelming.
 * - End with a coaching question that invites the user to steer.
 * - Never recite scores. Speak to patterns and meaning.
 */
export function generateFirstMessage(
  profile: AssessmentProfile,
  userName: string
): string {
  const name = userName || 'there';
  const parts: string[] = [];

  // ── Opening — reference the archetype (their identity in the system) ──
  if (profile.archetype.base !== 'Unknown') {
    parts.push(
      `Hey ${name} — I've been looking forward to this. Your Decoded assessment came through, and I have to say, your profile is really interesting.`
    );
    parts.push('');
    parts.push(
      `You came out as a ${profile.archetype.base} — "${profile.archetype.sublabel}." ${profile.archetype.tagline ? profile.archetype.tagline + '.' : ''} That tracks with what I see in your data, and I think it says a lot about how you approach the world.`
    );
  } else {
    parts.push(
      `Hey ${name} — thanks for completing the assessment. I've gone through your results, and I already feel like I have a real sense of how you operate.`
    );
  }

  parts.push('');

  // ── Body — pick the 2 most interesting/actionable observations ──
  const observations: string[] = [];

  // Big Five tension (most coachable insight)
  const b5 = profile.bigFive;
  if (b5.openness.label === 'high' && b5.conscientiousness.label === 'low') {
    observations.push(
      `One thing that jumped out: you score high on openness — you're drawn to new ideas and possibilities — but lower on conscientiousness. That's a pattern I see in creative, high-potential people who sometimes struggle to convert their best ideas into finished work. Sound familiar?`
    );
  } else if (b5.neuroticism.label === 'high') {
    observations.push(
      `I noticed your emotional sensitivity runs high. That's not a weakness — it means you feel things deeply and care intensely. But it also means stress can hit harder, and it's easy to get stuck in loops. We'll work on building a stronger relationship with that inner intensity.`
    );
  } else if (b5.extraversion.label === 'low' && b5.openness.label === 'high') {
    observations.push(
      `Your profile shows someone with a rich inner world — deeply reflective with a lot of creative energy, but more reserved in how you express it outwardly. That's a powerful combination when you learn to channel it. Let's explore how.`
    );
  }

  // Attachment pattern (relationship coaching hook)
  if (profile.attachment.style !== 'secure' && profile.attachment.style !== 'unknown') {
    const attachNotes: Record<string, string> = {
      anxious: `Your attachment style leans anxious — you might notice yourself seeking reassurance in relationships or reading into silences. That's something we can work with. It often shows up in professional relationships too, not just personal ones.`,
      avoidant: `Your attachment style leans avoidant — you might notice yourself pulling back when things get emotionally intense, or preferring to handle things alone. Understanding this pattern can unlock a lot, both at work and in close relationships.`,
      disorganized: `Your attachment profile is complex — you might feel pulled between wanting closeness and needing distance. That push-pull can be exhausting, but it's also very workable once we understand the triggers.`,
    };
    const note = attachNotes[profile.attachment.style];
    if (note) observations.push(note);
  }

  // Wellness red flags (immediate actionable)
  if (profile.wellness && profile.wellness.redFlags.length > 0) {
    const flags = profile.wellness.redFlags.slice(0, 2);
    observations.push(
      `On the wellness side, I want to flag: ${flags.join(' and ')}. These aren't just lifestyle details — they directly affect your energy, focus, and emotional capacity. Small shifts here can create outsized impact.`
    );
  }

  // Self-compassion (inner critic coaching hook)
  if (profile.selfCompassion && profile.selfCompassion.growthAreas.includes('self-judgment')) {
    observations.push(
      `One more thing — your self-compassion scores suggest a strong inner critic. You probably hold yourself to a high standard (which is useful), but you might also beat yourself up more than necessary (which isn't). We'll keep an eye on that.`
    );
  }

  // Take the top 2 observations
  for (const obs of observations.slice(0, 2)) {
    parts.push(obs);
    parts.push('');
  }

  // ── Closing — coaching question that gives the user control ──
  if (profile.coachingPriorities.length > 0) {
    parts.push(
      `Based on everything, I see a few natural starting points for us — but I want to hear from you first. What's the thing that's most on your mind right now? What brought you here beyond the assessment itself?`
    );
  } else {
    parts.push(
      `So — now that we've broken the ice, what's most on your mind? What would make this coaching relationship actually useful for you right now?`
    );
  }

  return parts.join('\n');
}
