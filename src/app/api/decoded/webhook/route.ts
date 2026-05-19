import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * POST /api/decoded/webhook
 *
 * Stripe webhook handler for Decoded subscription events.
 * Handles:
 *   - checkout.session.completed → upgrade user's decoded_tier
 *   - customer.subscription.updated → tier changes, cancellations
 *   - customer.subscription.deleted → downgrade to free
 *
 * IMPORTANT: Use a separate Stripe Webhook endpoint from the legacy one.
 * Filter events: checkout.session.completed, customer.subscription.updated,
 * customer.subscription.deleted.
 *
 * Set STRIPE_DECODED_WEBHOOK_SECRET in .env.local.
 */
export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_DECODED_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    console.error('[decoded/webhook] Missing Stripe keys');
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey);
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[decoded/webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Service-role client for admin-level DB updates
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Only handle Decoded checkouts
        if (session.metadata?.product !== 'decoded') break;

        const userId = session.metadata?.userId;
        const decodedTier = session.metadata?.decodedTier;

        if (!userId || !decodedTier) {
          console.error('[decoded/webhook] Missing metadata:', session.metadata);
          break;
        }

        // Update user's decoded tier + store Stripe IDs
        await supabase
          .from('users')
          .update({
            decoded_tier: decodedTier,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
          })
          .eq('id', userId);

        console.log(`[decoded/webhook] ✅ User ${userId} upgraded to ${decodedTier}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        // Only handle Decoded subscriptions
        if (subscription.metadata?.product !== 'decoded') break;

        const userId = subscription.metadata?.userId;
        if (!userId) break;

        // If subscription is cancelled/past_due, downgrade
        if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          await supabase
            .from('users')
            .update({ decoded_tier: 'free' })
            .eq('id', userId);

          console.log(`[decoded/webhook] ⬇ User ${userId} downgraded to free (${subscription.status})`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        if (subscription.metadata?.product !== 'decoded') break;

        const userId = subscription.metadata?.userId;
        if (!userId) break;

        await supabase
          .from('users')
          .update({
            decoded_tier: 'free',
            stripe_subscription_id: null,
          })
          .eq('id', userId);

        console.log(`[decoded/webhook] ❌ User ${userId} subscription deleted → free`);
        break;
      }

      default:
        // Acknowledge but ignore other event types
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[decoded/webhook] Processing error:', error);
    // Return 200 to prevent Stripe retries on our errors
    return NextResponse.json({ received: true, error: 'processing_failed' });
  }
}

// Stripe needs the raw body, disable Next.js body parsing
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
