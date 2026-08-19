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
import type { BrandId } from '@/lib/platform/brand';

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
      '5 coaching messages per day',
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
      '50 coaching messages per week',
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
      '300 coaching messages per month',
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
      'Unlimited coaching access',
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

// ─── HEARD (integration vertical) ────────────────────
//
// Same four prices, different product, so different words and different volume
// (founder, 2026-08-19). The tiers above sell a REPORT — Big Five radars,
// archetypes, compatibility. HEARD has none of those: its module set is CORE
// only and its assessment battery is empty, so the whole product is the
// conversation. The lists below say that plainly instead of listing surfaces
// this vertical does not have.
//
// ⚠️ The volume ladder is NOT monotonic and that is as specified, not a typo:
// Insight's 20/day is roughly 600 a month, so it carries MORE messages than
// Growth's 300/month while costing $40 less. Raised here so whoever reads it
// next does not "fix" it silently.
//
// Every line is scoped integration text, so `check:deny-list` applies: no
// therapy/counselling/clinical/treat/diagnose vocabulary, no "emotional
// support", no healing claim. And BRAND.md §14.6: no em dashes, no negation
// pivot, no AI vocabulary.

export const HEARD_TIERS: DecodedTierInfo[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'A place to say it',
    price: '$0',
    priceSubtext: 'forever',
    features: [
      'Start without making an account',
      '10 messages a day',
      'Accounts from other people, matched to yours',
      'Your conversation saved between visits',
    ],
  },
  {
    id: 'insight',
    name: 'Insight',
    tagline: 'Room to keep going',
    price: '$29',
    priceSubtext: '/year',
    features: [
      'Everything in Free',
      '20 messages a day',
      'Long sessions that do not stop you mid thought',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'For the longer work',
    price: '$69',
    priceSubtext: '/year',
    features: [
      'Everything in Insight',
      '300 messages a month',
      'Room to come back to it over months',
    ],
    recommended: true,
  },
  {
    id: 'mastery',
    name: 'Mastery',
    tagline: 'No ceiling',
    price: '$349',
    priceSubtext: '/year or $99/mo',
    features: [
      'Everything in Growth',
      'Unlimited messages',
      'Every conversation kept for as long as you want it',
    ],
  },
];

export const HEARD_MESSAGE_LIMITS: Record<ReportTier, { count: number; window: 'day' | 'week' | 'month'; label: string }> = {
  free: { count: 10, window: 'day', label: '10/day' },
  insight: { count: 20, window: 'day', label: '20/day' },
  growth: { count: 300, window: 'month', label: '300/month' },
  mastery: { count: Infinity, window: 'month', label: 'Unlimited' },
};

// ─── Per-brand selection ─────────────────────────────
//
// Record<BrandId, …> rather than a ternary or a default branch, per the tenancy
// rule: adding a brand makes these COMPILE ERRORS until somebody decides which
// plan surface it gets, instead of silently inheriting Decoded's.
//
// 🔑 Only the FREE row of these tables is enforced anywhere. The coach's
// checkMessageLimit exempts every paid tier outright (`subscription_tier !==
// "free"` returns early), so the paid numbers are a promise no code keeps —
// generously, since users get more than advertised rather than less. Two
// separate columns are also in play: this page reads `users.decoded_tier` while
// the coach enforces on `users.subscription_tier`. Both worth closing before
// anyone is actually billed.

export const TIERS_BY_BRAND: Record<BrandId, DecodedTierInfo[]> = {
  masterytv: DECODED_TIERS,
  relatti: DECODED_TIERS,
  money: DECODED_TIERS,
  heard: HEARD_TIERS,
};

export const MESSAGE_LIMITS_BY_BRAND: Record<BrandId, Record<ReportTier, { count: number; window: 'day' | 'week' | 'month'; label: string }>> = {
  masterytv: MESSAGE_LIMITS,
  relatti: MESSAGE_LIMITS,
  money: MESSAGE_LIMITS,
  heard: HEARD_MESSAGE_LIMITS,
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
