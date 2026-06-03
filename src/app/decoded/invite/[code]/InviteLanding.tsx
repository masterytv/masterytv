'use client';

/**
 * InviteLanding — Premium editorial invite landing page.
 *
 * Shows the inviter's archetype card + teaser + CTA to take the assessment.
 * Follows BRAND.md: Manrope + Inter, no emoji/sparkles, glassmorphism,
 * accent-gold for single CTA.
 */

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Fingerprint, ArrowRight, Check } from 'lucide-react';
import { FloatingThemeToggle } from '@/components/floating-theme-toggle';

interface InviteLandingProps {
  inviterName: string;
  archetypeName: string | null;
  archetypeSublabel: string | null;
  archetypeSlug: string | null;
  inviteCode: string;
}

export default function InviteLanding({
  inviterName,
  archetypeName,
  archetypeSublabel,
  archetypeSlug,
  inviteCode,
}: InviteLandingProps) {
  const hasArchetype = archetypeName && archetypeSlug;
  const ctaHref = `/decoded?invite=${inviteCode}`;

  return (
    <div className="invite-page">
      <FloatingThemeToggle />

      {/* Ambient glow */}
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
        {/* Badge */}
        <div className="invite-badge">
          <div className="invite-badge__icon">
            <Fingerprint strokeWidth={1.5} />
          </div>
          <span className="invite-badge__label">Decoded</span>
        </div>

        {/* Archetype card image */}
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

        {/* Inviter identity */}
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

        {/* What you'll discover */}
        <motion.div
          className="invite-discover"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <h2 className="invite-discover__title">What you&apos;ll discover</h2>
          <ul className="invite-discover__list">
            <li className="invite-discover__item">
              <span className="invite-discover__dot" />
              Your Big Five personality profile
            </li>
            <li className="invite-discover__item">
              <span className="invite-discover__dot" />
              Career interests and work motivation
            </li>
            <li className="invite-discover__item">
              <span className="invite-discover__dot" />
              Attachment style and emotional patterns
            </li>
            <li className="invite-discover__item">
              <span className="invite-discover__dot" />
              AI compatibility report with {inviterName}
            </li>
          </ul>
        </motion.div>

        {/* Gold CTA — single conversion point */}
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

        {/* Trust signals */}
        <motion.div
          className="invite-trust"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.4 }}
        >
          <span className="invite-trust__item">
            <Check className="invite-trust__check" />
            13 validated instruments
          </span>
          <span className="invite-trust__item">
            <Check className="invite-trust__check" />
            ~30 minutes
          </span>
          <span className="invite-trust__item">
            <Check className="invite-trust__check" />
            Free
          </span>
          <span className="invite-trust__item">
            <Check className="invite-trust__check" />
            Results are private
          </span>
        </motion.div>

        {/* Footer */}
        <div className="invite-footer">
          <p className="invite-footer__text">
            Decoded by MasteryTV — Personality science for personal growth
          </p>
        </div>
      </motion.div>
    </div>
  );
}
