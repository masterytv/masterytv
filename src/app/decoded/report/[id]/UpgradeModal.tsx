'use client';

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
}

export default function UpgradeModal({ isOpen, onClose, currentTier }: UpgradeModalProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleUpgrade(tier: ReportTier) {
    setLoading(tier);
    try {
      const res = await fetch('/api/decoded/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, interval: 'annual' }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        console.error('[UpgradeModal] No checkout URL:', data);
        setLoading(null);
      }
    } catch (err) {
      console.error('[UpgradeModal] Checkout error:', err);
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

            {/* Header */}
            <div className="upgrade-modal__header">
              <h2 className="upgrade-modal__title">There&apos;s more to you than this.</h2>
              <p className="upgrade-modal__subtitle">
                Your free report covers the fundamentals. Unlock the rest to see how
                your emotions, relationships, and daily habits connect — and what
                to do about it.
              </p>
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
                      <><Loader2 size={16} className="animate-spin" /> Processing...</>
                    ) : (
                      <>Upgrade to {tier.name} <ArrowRight size={16} /></>
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <p className="upgrade-modal__footer">
              Secure checkout via Stripe. Cancel anytime. All plans include a 7-day money-back guarantee.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
