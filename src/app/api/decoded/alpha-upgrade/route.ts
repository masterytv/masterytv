import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isUpgrade } from '@/lib/decoded/billing/tiers';
import type { ReportTier } from '@/lib/decoded/report/prompts/types';

/**
 * POST /api/decoded/alpha-upgrade
 *
 * Alpha-only upgrade flow — bypasses Stripe during testing.
 * Updates the user's decoded_tier directly in the database.
 * Will be replaced by Stripe Checkout when Sprint 0.3 ships.
 *
 * Body: { tier: 'insight' | 'growth' | 'mastery' }
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
    const validTiers: ReportTier[] = ['insight', 'growth', 'mastery'];
    if (!tier || !validTiers.includes(tier as ReportTier)) {
      return NextResponse.json({ error: 'Invalid tier.' }, { status: 400 });
    }

    // Get current tier to verify it's an upgrade
    const { data: userData } = await supabase
      .from('users')
      .select('decoded_tier')
      .eq('id', user.id)
      .single();

    const currentTier = (userData?.decoded_tier as ReportTier) ?? 'free';

    if (!isUpgrade(currentTier, tier as ReportTier)) {
      return NextResponse.json(
        { error: 'You already have this tier or higher.' },
        { status: 400 }
      );
    }

    // Alpha mode: update tier directly (no payment required)
    const { error } = await supabase
      .from('users')
      .update({ decoded_tier: tier })
      .eq('id', user.id);

    if (error) {
      console.error('[alpha-upgrade] DB update error:', error.message);
      return NextResponse.json({ error: 'Failed to upgrade.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tier,
      message: `Upgraded to ${tier} tier (alpha — no payment required).`,
    });
  } catch (error) {
    console.error('[alpha-upgrade] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
