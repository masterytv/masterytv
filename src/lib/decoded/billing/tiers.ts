/**
 * Decoded Billing — Tier definitions and Stripe price mapping
 *
 * Architecture: Decoded tiers are separate from Coach App tiers.
 * A user can be on Coach App "free" but Decoded "insight".
 * The `decoded_tier` column on assessment_reports (and eventually
 * a user-level column) determines what sections are unlocked.
 *
 * Stripe Setup Required:
 * Create these products/prices in Stripe Dashboard:
 *   Product: "Decoded Insight" → price_insight_annual ($29/yr)
 *   Product: "Decoded Growth"  → price_growth_annual ($69/yr)
 *   Product: "Decoded Mastery" → price_mastery_monthly ($99/mo)
 *   Product: "Decoded Mastery" → price_mastery_annual ($349/yr)
 *
 * Then set DECODED_STRIPE_PRICES in .env.local with the price IDs.
 */

import type { ReportTier } from '@/lib/decoded/report/prompts/types';

// ─── Tier Metadata ────────────────────────────────────

export interface DecodedTierInfo {
  id: ReportTier;
  name: string;
  tagline: string;
  price: string;
  priceSubtext: string;
  features: string[];
  /** Stripe Price ID — set from env at runtime */
  stripePriceId?: string;
  recommended?: boolean;
}

export const DECODED_TIERS: DecodedTierInfo[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'See the surface',
    price: '$0',
    priceSubtext: 'forever',
    features: [
      '7 narrative sections (RS01–RS07)',
      'Personality radar + attachment map',
      'Decoded Archetype label',
      'Browser PDF export',
    ],
  },
  {
    id: 'insight',
    name: 'Insight',
    tagline: 'See below the surface',
    price: '$29',
    priceSubtext: '/year',
    features: [
      'Everything in Free',
      'RS08 — Emotional Landscape',
      'RS09 — Motivation & Vocation',
      '50 coach messages per week',
      'AI Compatibility Report',
    ],
    recommended: true,
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'Start changing',
    price: '$69',
    priceSubtext: '/year',
    features: [
      'Everything in Insight',
      'RS10 — Relationship Patterns',
      'RS11 — Wellness & Life Satisfaction',
      '300 coach messages per month',
      'Compare AI analysis',
    ],
  },
  {
    id: 'mastery',
    name: 'Mastery',
    tagline: 'Full transformation',
    price: '$349',
    priceSubtext: '/year or $99/mo',
    features: [
      'Everything in Growth',
      'RS12 — Your Growth Map',
      'Unlimited coach access',
      'Full framework library',
      'Depth Layer add-ons (RD01–RD04)',
    ],
  },
];

// ─── Stripe Price Mapping ────────────────────────────

/**
 * Maps billing intervals to Stripe Price IDs.
 * Values come from env vars — set after creating prices in Stripe.
 *
 * Format in .env.local:
 *   STRIPE_DECODED_INSIGHT_ANNUAL=price_xxxx
 *   STRIPE_DECODED_GROWTH_ANNUAL=price_xxxx
 *   STRIPE_DECODED_MASTERY_MONTHLY=price_xxxx
 *   STRIPE_DECODED_MASTERY_ANNUAL=price_xxxx
 */
export function getStripePriceId(tier: ReportTier, interval: 'monthly' | 'annual'): string | null {
  const prices: Record<string, string | undefined> = {
    'insight:annual': process.env.STRIPE_DECODED_INSIGHT_ANNUAL,
    'growth:annual': process.env.STRIPE_DECODED_GROWTH_ANNUAL,
    'mastery:monthly': process.env.STRIPE_DECODED_MASTERY_MONTHLY,
    'mastery:annual': process.env.STRIPE_DECODED_MASTERY_ANNUAL,
  };
  return prices[`${tier}:${interval}`] ?? null;
}

// ─── Message Rate Limits ─────────────────────────────

export const MESSAGE_LIMITS: Record<ReportTier, { count: number; window: 'day' | 'week' | 'month'; label: string }> = {
  free: { count: 5, window: 'day', label: '5/day' },
  insight: { count: 50, window: 'week', label: '50/week' },
  growth: { count: 300, window: 'month', label: '300/month' },
  mastery: { count: Infinity, window: 'month', label: 'Unlimited' },
};

// ─── Tier Comparison ─────────────────────────────────

/** Check if upgrading from currentTier to targetTier is valid */
export function isUpgrade(currentTier: ReportTier, targetTier: ReportTier): boolean {
  const order: ReportTier[] = ['free', 'insight', 'growth', 'mastery'];
  return order.indexOf(targetTier) > order.indexOf(currentTier);
}

/** Get the next tier up from the current one */
export function getNextTier(current: ReportTier): ReportTier | null {
  const order: ReportTier[] = ['free', 'insight', 'growth', 'mastery'];
  const idx = order.indexOf(current);
  return idx < order.length - 1 ? order[idx + 1] : null;
}
