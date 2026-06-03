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
    tagline: 'Your personality, mapped',
    price: '$0',
    priceSubtext: 'forever',
    features: [
      '7 in-depth narrative sections',
      'Big Five personality radar',
      'Attachment style mapping',
      'Your Decoded Archetype',
      '1 compatibility report',
      '5 AI coaching messages per day',
    ],
  },
  {
    id: 'insight',
    name: 'Insight',
    tagline: 'Understand what drives you',
    price: '$29',
    priceSubtext: '/year',
    features: [
      'Everything in Free',
      'Your emotional patterns decoded',
      'Career and motivation alignment',
      '3 compatibility reports',
      '50 AI coaching messages per week',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'Change what isn\u2019t working',
    price: '$69',
    priceSubtext: '/year',
    features: [
      'Everything in Insight',
      'Unlimited compatibility reports',
      'Relationship dynamics analysis',
      'Wellness and life satisfaction map',
      '300 AI coaching messages per month',
    ],
    recommended: true,
  },
  {
    id: 'mastery',
    name: 'Mastery',
    tagline: 'The full picture, with a guide',
    price: '$349',
    priceSubtext: '/year or $99/mo',
    features: [
      'Everything in Growth',
      'Your personalized growth roadmap',
      'Unlimited AI coaching access',
      'Unlimited compatibility reports',
      'Complete coaching framework library',
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
