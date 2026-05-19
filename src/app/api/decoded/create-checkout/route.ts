import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { getStripePriceId, isUpgrade } from '@/lib/decoded/billing/tiers';
import type { ReportTier } from '@/lib/decoded/report/prompts/types';

/**
 * POST /api/decoded/create-checkout
 *
 * Creates a Stripe Checkout Session for a Decoded tier upgrade.
 * User must be authenticated. Returns checkout URL for client redirect.
 *
 * Body: { tier: 'insight' | 'growth' | 'mastery', interval?: 'monthly' | 'annual' }
 */
export async function POST(req: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error('[decoded/create-checkout] STRIPE_SECRET_KEY not set');
      return NextResponse.json({ error: 'Payment system not configured.' }, { status: 500 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const tier = body.tier as ReportTier;
    const interval = (body.interval as 'monthly' | 'annual') ?? 'annual';

    // Validate tier
    if (!tier || !['insight', 'growth', 'mastery'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier.' }, { status: 400 });
    }

    // Check it's actually an upgrade
    // Why: prevent re-purchasing the same tier or downgrading via checkout
    const { data: userData } = await supabase
      .from('users')
      .select('decoded_tier, stripe_customer_id')
      .eq('id', user.id)
      .single();

    const currentTier = (userData?.decoded_tier as ReportTier) ?? 'free';
    if (!isUpgrade(currentTier, tier)) {
      return NextResponse.json({ error: 'Not a valid upgrade.' }, { status: 400 });
    }

    // Look up the Stripe Price ID
    const priceId = getStripePriceId(tier, interval);
    if (!priceId) {
      console.error(`[decoded/create-checkout] No price ID for ${tier}:${interval}`);
      return NextResponse.json({ error: 'Price not configured.' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey);
    const origin = req.headers.get('origin') || 'https://masterytv.com';

    // Reuse existing Stripe customer if available
    const customerParams: Stripe.Checkout.SessionCreateParams['customer_creation'] = 'always';
    const customerEmail = user.email ?? undefined;
    const existingCustomerId = userData?.stripe_customer_id ?? undefined;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : { customer_email: customerEmail, customer_creation: customerParams }),
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        decodedTier: tier,
        product: 'decoded',
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          decodedTier: tier,
          product: 'decoded',
        },
      },
      success_url: `${origin}/decoded/upgrade-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/decoded/report`,
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('[decoded/create-checkout] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session.' },
      { status: 500 }
    );
  }
}
