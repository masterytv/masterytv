/**
 * Relatti — relationship report CONTENT (Relatti-specific, NOT shared).
 *
 * This module owns everything that makes the report a *relationship* report:
 * the section order, the relationship-framed titles, and the templated
 * "challenges & what helps" content keyed to relationship style.
 *
 * ARCHITECTURE (founder rule, 2026-06-26): future verticals must NOT reuse this
 * report. A career/other vertical gets its OWN `src/lib/<vertical>/report-content.ts`
 * and its own gate — the shared ReportViewer only renders whichever content
 * module matches the report's program. Keeping the relationship content here (not
 * inline in ReportViewer) is what makes that separation real. See
 * directives/VERTICAL_PLAYBOOK.md.
 */

import { attachmentDisplay } from '@/lib/decoded/report/attachment-style';

// ── Section order + reframed titles ──────────────────────────────────────────
// A relationship report renders the SAME generated section data (the S-IDs),
// reordered to LEAD with the relationship and reframed so personality is
// described as what you bring to a relationship — not as the hero.
export const RELATIONSHIP_RENDER_ORDER = ['S5', 'S1', 'S2', 'S3', 'S8'] as const;

export const RELATIONSHIP_SECTION_META: Record<string, { title: string; subtitle: string }> = {
  S5: { title: 'How You Love & Connect', subtitle: 'Your attachment, your conflict pattern, and what you need to feel close' },
  S1: { title: 'You at a Glance', subtitle: 'A quick snapshot of who you are' },
  S2: { title: 'What You Bring to the Relationship', subtitle: 'How your personality shapes the way you connect' },
  S3: { title: 'Your Protective Patterns', subtitle: 'What shows up when you feel hurt — and why' },
  S8: { title: 'Growing Closer', subtitle: 'Small, specific steps to feel more connected' },
};

// ── Normalize / influence: "challenges you may face & what helps" ────────────
// Templated per relationship style. The intent is to make the reader feel KNOWN
// and to NORMALIZE their pattern (it makes sense, it's not broken), then leave
// them with hope + small steps. This report is analysis AND influence.
export interface RelationshipChallenges {
  /** Warm framing of the pattern — names it without indicting it. */
  intro: string;
  /** The honest hard parts, each with the "why" so it feels understood. */
  challenges: Array<{ title: string; why: string }>;
  /** Small, hopeful, doable moves. */
  whatHelps: string[];
}

// Keyed by canonical clinical label (same keys as ATTACHMENT_DISPLAY).
export const RELATIONSHIP_CHALLENGES: Record<string, RelationshipChallenges> = {
  'Secure': {
    intro:
      'Your secure foundation is a genuine gift — you can be close without losing yourself, and steady when things get hard. Even anchored partners hit rough patches, and naming them keeps the bond strong.',
    challenges: [
      {
        title: 'Quietly taking the bond for granted',
        why: 'Because closeness comes naturally to you, it’s easy to stop tending it — to assume the connection will hold without the small daily bids that built it.',
      },
      {
        title: 'Over-functioning for a less-secure partner',
        why: 'Your calm can become the thing that absorbs your partner’s anxiety or chases their distance — carrying the relationship’s emotional weight so they don’t have to.',
      },
    ],
    whatHelps: [
      'Keep making the small bids — a text, a touch, a real question. Security is maintained, not finished.',
      'Say what you need out loud, even when you’re "fine." Your steadiness shouldn’t cost you your own voice.',
      'Let your partner’s pattern be theirs to work on — support it, don’t fix it.',
    ],
  },
  'Anxious-Preoccupied': {
    intro:
      'You love deeply and you feel everything — that depth is your superpower, and sometimes your ache. Your nervous system is finely tuned to connection, which makes you a devoted partner and also one who hurts when closeness wobbles. None of this means you’re "too much."',
    challenges: [
      {
        title: 'Reading silence as rejection',
        why: 'Your alarm for disconnection runs sensitive, so a quiet or distracted partner can feel like a leaving one — even when nothing is actually wrong.',
      },
      {
        title: 'Reaching for reassurance in ways that push it away',
        why: 'When you’re scared, protest — texting more, pressing for an answer — is really a bid for closeness. To a partner who pulls back under pressure, it can land as the opposite.',
      },
    ],
    whatHelps: [
      'Name the fear instead of acting it out: "I’m spiraling a little — can you reassure me?" is disarming and works.',
      'Learn your partner’s real love signals so you’re not only listening for the absence of them.',
      'Build one self-soothing ritual that’s yours — so the relationship isn’t your only anchor when the wave hits.',
    ],
  },
  'Dismissive-Avoidant': {
    intro:
      'You’re steady, capable, and self-reliant — you handle life without needing to lean. That independence is a real strength, and it can also quietly keep the people who love you at arm’s length. You don’t avoid closeness because you don’t want it; you learned that depending was risky.',
    challenges: [
      {
        title: 'Going distant under stress',
        why: 'When things get emotionally intense, your instinct is to retreat and handle it alone. To a partner reaching for you, that withdrawal can feel like a door closing.',
      },
      {
        title: 'Minimizing needs — yours and theirs',
        why: '"I’m fine" protects you, but it starves the closeness your partner is trying to build. The bids you wave off are often their attempts to get closer.',
      },
    ],
    whatHelps: [
      'When you need space, say so AND name the return: "I need an hour, then let’s talk." It turns withdrawal into a promise.',
      'Share one small thing you’d normally keep inside. Letting someone in, in small doses, doesn’t cost you your independence.',
      'Treat a partner’s bid as information, not pressure — a chance to connect, not a demand to manage.',
    ],
  },
  'Fearful-Avoidant': {
    intro:
      'You crave deep connection and you protect it fiercely — reaching for closeness and bracing against it at the same time. That push-pull is exhausting, and it makes complete sense: somewhere you learned that the people you need most could also hurt you. Wanting both safety and distance isn’t a contradiction to fix — it’s a heart that’s trying to do both at once.',
    challenges: [
      {
        title: 'Hot-and-cold cycles',
        why: 'When you get close, the old alarm fires — "this could hurt" — so you pull back from the very thing you wanted. Then the distance hurts too, and the cycle loops.',
      },
      {
        title: 'Testing whether it’s really safe',
        why: 'Part of you needs proof your partner will stay. That can come out as distance, conflict, or bracing for the worst — even in the moments you most want to be held.',
      },
    ],
    whatHelps: [
      'Name the push-pull out loud — "part of me wants to be close and part of me is scared." Saying it disarms it.',
      'Go slow on purpose. Safety isn’t declared, it’s built — in small, repeated moments that prove it’s okay.',
      'Take one tiny risk at a time — a feeling shared, a need named — and let it land before reaching for the next.',
    ],
  },
};

const LEGACY_MAP: Record<string, string> = {
  secure: 'Secure',
  anxious: 'Anxious-Preoccupied',
  avoidant: 'Dismissive-Avoidant',
  disorganized: 'Fearful-Avoidant',
  'fearful-avoidant': 'Fearful-Avoidant',
};

/** Resolve the templated challenges for a stored attachment style. */
export function relationshipChallenges(style: string | null | undefined): RelationshipChallenges | null {
  if (!style) return null;
  const key = LEGACY_MAP[style] ?? style;
  return RELATIONSHIP_CHALLENGES[key] ?? null;
}

/** Warm display name for a style (re-export for convenience). */
export function relationshipStyleName(style: string | null | undefined): string {
  return attachmentDisplay(style).name;
}
