'use client';

/**
 * UpgradeModal — Alpha upgrade flow for Decoded tiers.
 *
 * During alpha testing, all tiers are available without payment.
 * Users select a tier and it's activated immediately via the
 * alpha-upgrade API route (direct DB update, no Stripe).
 *
 * Will be replaced with Stripe Checkout when Sprint 0.3 ships.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowRight, Loader2 } from 'lucide-react';
import { DECODED_TIERS, type DecodedTierInfo } from '@/lib/decoded/billing/tiers';
import type { ReportTier } from '@/lib/decoded/report/prompts/types';
import './upgrade-modal.css';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: ReportTier;
  /** Called after a successful upgrade — parent should refresh tier state */
  onUpgradeComplete?: (newTier: ReportTier) => void;
}

export default function UpgradeModal({ isOpen, onClose, currentTier, onUpgradeComplete }: UpgradeModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [upgraded, setUpgraded] = useState<ReportTier | null>(null);
  const [error, setError] = useState('');

  async function handleUpgrade(tier: ReportTier) {
    setLoading(tier);
    setError('');
    try {
      const res = await fetch('/api/decoded/alpha-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Upgrade failed.');
        setLoading(null);
        return;
      }

      setUpgraded(tier);
      setLoading(null);
      onUpgradeComplete?.(tier);
    } catch (err) {
      console.error('[UpgradeModal] Error:', err);
      setError('Something went wrong. Please try again.');
      setLoading(null);
    }
  }

  // Only show tiers that are upgrades from current
  const availableTiers = DECODED_TIERS.filter(t => {
    const order: ReportTier[] = ['free', 'insight', 'growth', 'mastery'];
    return order.indexOf(t.id) > order.indexOf(currentTier);
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="upgrade-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="upgrade-modal"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button className="upgrade-modal__close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>

            {upgraded ? (
              /* ── Success state ── */
              <div className="upgrade-modal__success">
                <div className="upgrade-modal__success-icon">
                  <Check size={32} />
                </div>
                <h2 className="upgrade-modal__title">
                  You&apos;re on {upgraded.charAt(0).toUpperCase() + upgraded.slice(1)}
                </h2>
                <p className="upgrade-modal__subtitle">
                  All {upgraded} sections are now unlocked. Scroll down to read them.
                </p>
                <button
                  className="upgrade-modal__done-btn"
                  onClick={onClose}
                >
                  Continue Reading <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="upgrade-modal__header">
                  <h2 className="upgrade-modal__title">There&apos;s more to you than this.</h2>
                  <p className="upgrade-modal__subtitle">
                    Your free report covers the fundamentals. Unlock the rest to see how
                    your emotions, relationships, and daily habits connect — and what
                    to do about it.
                  </p>
                </div>

                {/* Alpha notice */}
                <div className="upgrade-modal__alpha-notice">
                  <div className="upgrade-modal__alpha-badge">ALPHA</div>
                  <span>
                    During alpha testing, all tiers are available without payment.
                    Select any tier to unlock instantly.
                  </span>
                </div>

                {/* Tier cards */}
                <div className="upgrade-tiers">
                  {availableTiers.map((tier: DecodedTierInfo) => (
                    <div
                      key={tier.id}
                      className={`upgrade-tier-card ${tier.recommended ? 'upgrade-tier-card--recommended' : ''}`}
                    >
                      {tier.recommended && (
                        <div className="upgrade-tier-card__badge">Most Popular</div>
                      )}
                      <div className="upgrade-tier-card__name">{tier.name}</div>
                      <div className="upgrade-tier-card__tagline">{tier.tagline}</div>
                      <div className="upgrade-tier-card__price">
                        <span className="upgrade-tier-card__amount">{tier.price}</span>
                        <span className="upgrade-tier-card__interval">{tier.priceSubtext}</span>
                      </div>
                      <div className="upgrade-tier-card__price-note">
                        Free during alpha
                      </div>
                      <ul className="upgrade-tier-card__features">
                        {tier.features.map((f, i) => (
                          <li key={i}>
                            <Check size={14} className="upgrade-tier-card__check" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <button
                        className={`upgrade-tier-card__cta ${tier.recommended ? 'upgrade-tier-card__cta--primary' : ''}`}
                        onClick={() => handleUpgrade(tier.id)}
                        disabled={loading !== null}
                      >
                        {loading === tier.id ? (
                          <><Loader2 size={16} className="animate-spin" /> Activating...</>
                        ) : (
                          <>Unlock {tier.name} <ArrowRight size={16} /></>
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                {error && (
                  <p className="upgrade-modal__error">{error}</p>
                )}

                {/* Footer */}
                <p className="upgrade-modal__footer">
                  Alpha testing — all features are free. Paid tiers via Stripe coming soon.
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
