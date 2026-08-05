/**
 * Decoded → Coach: First Message Generator
 *
 * Generates the coach's personalized coaching letter for Decoded users.
 * This replaces the cold-start "What brings you here today?" with a warm,
 * deeply personalized letter that proves the coach already knows them.
 *
 * Called when:
 * 1. A Decoded user first opens coaching (onboarding fast-track)
 * 2. A user redoes their coaching onboarding
 *
 * Design: Zero tokens — no LLM call. Template-based from assessment data.
 * The letter references archetype, personality tensions, coaching priorities,
 * attachment insights, and wellness flags. ~300-400 words.
 *
 * Sprint 0.4 — S0.4.3
 */

import type { AssessmentProfile } from './assessment-profile';

/**
 * Build a rich coaching letter for a Decoded user.
 *
 * Principles:
 * - Warm, not clinical. This is a coach writing a letter, not a report.
 * - Reference 3-4 specific findings — enough to prove depth, not overwhelming.
 * - Include coaching priorities so the user sees a clear path forward.
 * - End with a coaching question that gives the user steering power.
 * - Never recite scores. Speak to patterns and meaning.
 */
export function generateFirstMessage(
  profile: AssessmentProfile,
  userName: string
): string {
  const name = userName || 'there';
  const parts: string[] = [];

  // ── Opening — identity framing via archetype ──
  if (profile.archetype.base !== 'Unknown') {
    parts.push(
      `Hey ${name} — I've been looking forward to this.`
    );
    parts.push('');
    parts.push(
      `I've read your full Decoded assessment, and I want you to know — I'm not starting from scratch here. I already have a real sense of how you think, what drives you, and where the friction points might be.`
    );
    parts.push('');
    parts.push(
      `## Your Archetype: The ${profile.archetype.base}`
    );
    parts.push('');
    parts.push(
      `You came out as **${profile.archetype.sublabel || profile.archetype.base}**.${profile.archetype.tagline ? ' ' + profile.archetype.tagline + '.' : ''} Think of it as a lens: it tells me how you naturally approach problems, relationships, and growth.`
    );
  } else {
    parts.push(
      `Hey ${name} — thanks for completing the assessment. I've gone through your results carefully, and I feel like I already have a real sense of how you operate. Let me share what I see.`
    );
  }

  parts.push('');

  // ── Personality insight — pick the most coachable Big Five tension ──
  parts.push(`## What I Notice`);
  parts.push('');

  const insightParts: string[] = [];
  const b5 = profile.bigFive;

  // High openness + low conscientiousness = the "brilliant but scattered" pattern
  if (b5.openness.label === 'high' && b5.conscientiousness.label === 'low') {
    insightParts.push(
      `Your mind is wired for ideas and possibility — you score high on openness, which means you're drawn to the new, the creative, the unconventional. But your conscientiousness runs lower, which means converting those ideas into finished work can be a real struggle. This is one of the most coachable patterns I see. It's not a discipline problem — it's a systems problem, and we can solve it.`
    );
  } else if (b5.neuroticism.label === 'high' && b5.conscientiousness.label === 'high') {
    insightParts.push(
      `You're someone who holds yourself to a very high standard — disciplined, organized, and driven. But your emotional sensitivity also runs high, which means you can be hard on yourself when things don't go perfectly. That combination produces results, but it can also produce burnout. We'll work on keeping the drive without the self-punishment.`
    );
  } else if (b5.neuroticism.label === 'high' && b5.extraversion.label === 'low') {
    insightParts.push(
      `You have a rich inner world — deep reflection, strong emotional awareness — but you tend to process things internally rather than externally. That can be a superpower (you think before you speak), but it can also mean stress builds up without an outlet. One of our goals will be creating safe spaces for you to externalize what's going on inside.`
    );
  } else if (b5.openness.label === 'high' && b5.agreeableness.label === 'low') {
    insightParts.push(
      `You're an original thinker who isn't afraid to challenge the status quo. You score high on openness and lower on agreeableness, which means you have strong convictions and aren't easily swayed. That's a leadership asset — but it can sometimes create friction in relationships. We'll explore how to channel that directness effectively.`
    );
  } else if (b5.extraversion.label === 'low' && b5.openness.label === 'high') {
    insightParts.push(
      `Your profile shows someone with a rich inner world — deeply reflective with creative energy, but more reserved in how you express it outwardly. That's a powerful combination when you learn to channel it. Let's explore how to make your internal insights more visible to the people around you.`
    );
  } else if (b5.neuroticism.label === 'high') {
    insightParts.push(
      `I noticed your emotional sensitivity runs high. That's not a weakness — it means you feel things deeply and care intensely. But it also means stress can hit harder, and it's easy to get stuck in loops. Building a stronger relationship with that inner intensity will be a big part of our work together.`
    );
  } else if (b5.conscientiousness.label === 'high' && b5.openness.label === 'low') {
    insightParts.push(
      `You're methodical and reliable — the kind of person people count on to get things done. But you might find yourself defaulting to proven methods even when a new approach would serve you better. Our coaching will be about strategic flexibility — knowing when to stick to the plan and when to improvise.`
    );
  } else {
    insightParts.push(
      `Your personality profile shows a well-balanced foundation — no extreme scores pulling you in one direction. That gives us flexibility in how we work together. The interesting coaching happens in the nuances — the specific situations where your patterns help or hinder you.`
    );
  }

  // Add attachment insight if non-secure
  if (profile.attachment.style !== 'secure' && profile.attachment.style !== 'unknown') {
    const attachNotes: Record<string, string> = {
      anxious: `On the relationship side, your attachment style leans anxious — you might notice yourself seeking reassurance or reading into silences. This shows up in professional relationships too, not just personal ones. We'll build awareness around these patterns.`,
      avoidant: `In relationships, you tend toward independence — sometimes pulling back when things get emotionally intense. Understanding this pattern can unlock a lot, both at work and in close relationships. We'll explore the triggers.`,
      disorganized: `Your attachment profile is complex — you might feel pulled between wanting closeness and needing distance. That push-pull is exhausting, but it's also very workable once we map the triggers.`,
    };
    const note = attachNotes[profile.attachment.style];
    if (note) insightParts.push(note);
  }

  // Add wellness callout if red flags
  if (profile.wellness && profile.wellness.redFlags.length > 0) {
    const flags = profile.wellness.redFlags.slice(0, 2);
    insightParts.push(
      `On the wellness side, I want to flag: **${flags.join(' and ')}**. These aren't just lifestyle details — they directly affect your energy, focus, and emotional capacity. Small shifts here can create outsized impact, and they're often the easiest wins.`
    );
  }

  // Self-compassion inner critic
  if (profile.selfCompassion && profile.selfCompassion.growthAreas.includes('self-judgment')) {
    insightParts.push(
      `One more thing — your self-compassion scores suggest a strong inner critic. You probably hold yourself to a high standard (useful), but you might also beat yourself up more than necessary (not useful). We'll keep an eye on that voice.`
    );
  }

  // Take the top 3 insights
  for (const insight of insightParts.slice(0, 3)) {
    parts.push(insight);
    parts.push('');
  }

  // ── Coaching priorities — the forward-looking section ──
  if (profile.coachingPriorities.length > 0) {
    parts.push(`## Where I Think We Should Focus`);
    parts.push('');
    parts.push(`Based on your full assessment, here are the areas where I see the most potential for impact:`);
    parts.push('');

    const topPriorities = profile.coachingPriorities.slice(0, 3);
    for (const priority of topPriorities) {
      // Clean up the priority text — remove parenthetical clinical notes
      const cleanPriority = priority.replace(/\s*\([^)]+\)\s*/g, '');
      parts.push(`- **${cleanPriority}**`);
    }
    parts.push('');
    parts.push(
      `These aren't a rigid agenda — they're starting compass points. As we talk, we'll refine what matters most to you right now.`
    );
  }

  parts.push('');

  // ── Closing — coaching question tied to their profile ──
  const closingQuestions: string[] = [];

  if (profile.coachingPriorities.length > 0) {
    closingQuestions.push(
      `I've shared what I see in the data — now I want to hear from you. **What's the one thing that's most on your mind right now?** It might be something from the list above, or something completely different. Either way, that's where we start.`
    );
  }

  if (closingQuestions.length === 0) {
    closingQuestions.push(
      `So — now that we've broken the ice, **what's most on your mind?** What would make this coaching relationship actually useful for you right now?`
    );
  }

  parts.push(closingQuestions[0]);

  return parts.join('\n');
}
