'use client';

/**
 * InviteLanding — brand-aware public invite page.
 *
 * Relatti: relationship-framed, no Decoded logo / archetype art — a clean rose
 * card ("{inviter} invited you to understand your relationship together").
 * MasteryTV: the original Decoded archetype-card invite.
 *
 * BRAND.md: Lucide only, semantic tokens, light + dark safe.
 */

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Fingerprint, ArrowRight, Check, Heart } from 'lucide-react';
import { FloatingThemeToggle } from '@/components/floating-theme-toggle';
import type { BrandId } from '@/lib/platform/brand';

interface InviteLandingProps {
  brandId: BrandId;
  inviterName: string;
  archetypeName: string | null;
  archetypeSublabel: string | null;
  archetypeSlug: string | null;
  inviteCode: string;
}

export default function InviteLanding({
  brandId,
  inviterName,
  archetypeName,
  archetypeSublabel,
  archetypeSlug,
  inviteCode,
}: InviteLandingProps) {
  // The invite carries through sign-up so the dyad links on the other side.
  const ctaHref = `/login?invite=${inviteCode}`;

  // ── Relatti: relationship-framed, no Decoded chrome ──
  if (brandId === 'relatti') {
    const bullets = [
      'What kind of partner you are — your archetype',
      'Your attachment style — how you bond and seek closeness',
      'How you each handle closeness and conflict',
      'Where you click, and where you clash',
    ];
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <FloatingThemeToggle />
        <motion.div
          className="w-full max-w-md rounded-3xl bg-surface-50 p-8 text-center sm:p-10"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <span
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'color-mix(in oklch, var(--color-primary) 12%, transparent)' }}
          >
            <Heart className="h-7 w-7" style={{ color: 'var(--color-primary)' }} strokeWidth={1.5} />
          </span>

          <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
            {inviterName} invited you
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">
            {inviterName} took the Relatti relationship quiz and invited you to take yours —
            so your coach can understand you both.
          </p>

          <div className="mt-7 rounded-2xl bg-surface-0 p-5 text-left">
            <p className="mb-3 text-sm font-semibold text-text-primary">What you&apos;ll discover</p>
            <ul className="space-y-2.5">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-text-secondary">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                    style={{ background: 'var(--color-primary)' }}
                  />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <Link
            href={ctaHref}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-text-inverse transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}
          >
            Take the quiz
            <ArrowRight className="h-4 w-4" />
          </Link>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-text-muted">
            <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5" /> ~10 minutes</span>
            <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Private</span>
            <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Free</span>
          </div>

          <p className="mt-7 flex items-center justify-center gap-1.5 text-xs text-text-muted">
            <Heart className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
            Relatti — a coach that knows both of you
          </p>
        </motion.div>
      </div>
    );
  }

  // ── MasteryTV: original Decoded archetype-card invite ──
  const hasArchetype = archetypeName && archetypeSlug;
  return (
    <div className="invite-page">
      <FloatingThemeToggle />
      <div className="invite-page__glow" aria-hidden="true">
        <div className="invite-page__glow-orb invite-page__glow-orb--primary" />
        <div className="invite-page__glow-orb invite-page__glow-orb--accent" />
      </div>

      <motion.div
        className="invite-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="invite-badge">
          <div className="invite-badge__icon"><Fingerprint strokeWidth={1.5} /></div>
          <span className="invite-badge__label">Decoded</span>
        </div>

        {hasArchetype && (
          <motion.div
            className="invite-card__image-wrap"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            <Image
              src={`/decoded/cards/${archetypeSlug}/animal.png`}
              alt={`${inviterName}'s archetype — The ${archetypeName}`}
              width={600}
              height={600}
              className="invite-card__image"
              priority
            />
          </motion.div>
        )}

        <motion.h1
          className="invite-card__sender"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          {inviterName} invited you
        </motion.h1>

        {hasArchetype && (
          <motion.p
            className="invite-card__archetype"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            Their type: The {archetypeName}
            {archetypeSublabel && ` — ${archetypeSublabel}`}
          </motion.p>
        )}

        <motion.p
          className="invite-card__teaser"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          {inviterName} took the Decoded personality assessment and wants to
          compare results with you. Take the same assessment and discover how
          you complement each other.
        </motion.p>

        <motion.div
          className="invite-discover"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <h2 className="invite-discover__title">What you&apos;ll discover</h2>
          <ul className="invite-discover__list">
            <li className="invite-discover__item"><span className="invite-discover__dot" />Your Big Five personality profile</li>
            <li className="invite-discover__item"><span className="invite-discover__dot" />Career interests and work motivation</li>
            <li className="invite-discover__item"><span className="invite-discover__dot" />Attachment style and emotional patterns</li>
            <li className="invite-discover__item"><span className="invite-discover__dot" />AI compatibility report with {inviterName}</li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
        >
          <Link href={ctaHref} className="invite-cta">
            Take the Assessment
            <ArrowRight className="invite-cta__arrow" />
          </Link>
        </motion.div>

        <motion.div
          className="invite-trust"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.4 }}
        >
          <span className="invite-trust__item"><Check className="invite-trust__check" />13 validated instruments</span>
          <span className="invite-trust__item"><Check className="invite-trust__check" />~30 minutes</span>
          <span className="invite-trust__item"><Check className="invite-trust__check" />Free</span>
          <span className="invite-trust__item"><Check className="invite-trust__check" />Results are private</span>
        </motion.div>

        <div className="invite-footer">
          <p className="invite-footer__text">
            Decoded by MasteryTV — Personality science for personal growth
          </p>
        </div>
      </motion.div>
    </div>
  );
}
