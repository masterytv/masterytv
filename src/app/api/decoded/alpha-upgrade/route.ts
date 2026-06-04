import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ReportTier } from '@/lib/decoded/report/prompts/types';

/**
 * POST /api/decoded/alpha-upgrade
 *
 * Alpha-only plan change flow — bypasses Stripe during testing.
 * Updates both decoded_tier and subscription_tier directly in the database.
 * Supports upgrades AND downgrades for testing purposes.
 * Will be replaced by Stripe Checkout when billing ships.
 *
 * Body: { tier: 'free' | 'insight' | 'growth' | 'mastery' }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { tier } = await req.json();

    // Validate tier
    const validTiers: ReportTier[] = ['free', 'insight', 'growth', 'mastery'];
    if (!tier || !validTiers.includes(tier as ReportTier)) {
      return NextResponse.json({ error: 'Invalid tier.' }, { status: 400 });
    }

    // Map decoded tiers to subscription_tier values (coach app uses different names)
    const subscriptionTierMap: Record<string, string> = {
      free: 'free',
      insight: 'core',
      growth: 'premium',
      mastery: 'premium',
    };

    // Alpha mode: update both tier columns directly (no payment required)
    const { error } = await supabase
      .from('users')
      .update({
        decoded_tier: tier,
        subscription_tier: subscriptionTierMap[tier] ?? 'free',
      })
      .eq('id', user.id);

    if (error) {
      console.error('[alpha-upgrade] DB update error:', error.message);
      return NextResponse.json({ error: 'Failed to change plan.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tier,
      message: `Plan changed to ${tier} (alpha — no payment required).`,
    });
  } catch (error) {
    console.error('[alpha-upgrade] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
