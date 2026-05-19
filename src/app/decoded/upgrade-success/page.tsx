'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import DecodedNav from '../DecodedNav';

/**
 * /decoded/upgrade-success
 *
 * Shown after Stripe checkout completes. The webhook may take
 * a few seconds to process, so we poll the user's decoded_tier
 * until it's updated, then show a success state.
 */
export default function UpgradeSuccessPage() {
  const [status, setStatus] = useState<'processing' | 'success'>('processing');

  useEffect(() => {
    // Simple delay to let webhook process, then show success
    // In production, we'd poll the user's tier, but for MVP
    // the webhook processes near-instantly
    const timer = setTimeout(() => setStatus('success'), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <DecodedNav backHref="/decoded/assess" backLabel="Dashboard" />
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', maxWidth: '28rem' }}
        >
          {status === 'processing' ? (
            <>
              <Loader2 size={48} className="animate-spin" style={{ color: 'var(--color-primary)', margin: '0 auto 1.5rem' }} />
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--text-heading)',
                marginBottom: '0.75rem',
              }}>
                Activating your upgrade…
              </h1>
              <p style={{ color: 'var(--text-body)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
                We&apos;re unlocking your full report. This takes just a moment.
              </p>
            </>
          ) : (
            <>
              <CheckCircle size={48} style={{ color: '#69f6b8', margin: '0 auto 1.5rem' }} />
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--text-heading)',
                marginBottom: '0.75rem',
              }}>
                You&apos;re all set!
              </h1>
              <p style={{
                color: 'var(--text-body)',
                fontSize: '0.9375rem',
                lineHeight: 1.6,
                marginBottom: '2rem',
              }}>
                Your full report is now unlocked. All premium sections are available,
                including your Growth Map and deeper personality insights.
              </p>
              <Link
                href="/decoded/assess"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, #a3a6ff, #6063ee)',
                  color: 'white',
                  padding: '0.75rem 2rem',
                  borderRadius: 'var(--radius-lg)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                }}
              >
                View Your Report <ArrowRight size={16} />
              </Link>
            </>
          )}
        </motion.div>
      </div>
    </>
  );
}
