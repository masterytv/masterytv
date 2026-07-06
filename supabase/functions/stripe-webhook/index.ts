/**
 * Stripe Webhook Handler — Processes Stripe subscription events.
 *
 * POST /functions/v1/stripe-webhook
 * Auth: Stripe signature verification (no JWT)
 *
 * S5.8: Critical payment event handler.
 * Handles the full subscription lifecycle with idempotent operations.
 *
 * Event Matrix:
 * - checkout.session.completed → link customer, activate subscription
 * - invoice.paid → confirm subscription active
 * - invoice.payment_failed → log warning (Stripe retries automatically)
 * - customer.subscription.updated → handle tier/period changes
 * - customer.subscription.deleted → downgrade to free
 *
 * Security: Every request verified via Stripe webhook signature (HMAC-SHA256).
 * Deployed with --no-verify-jwt since Stripe uses its own auth.
 *
 * Architecture: ARCHITECTURE.md §6.3
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";
import { verifyWebhookSignature } from "../_shared/stripe.ts";
import { resolveTier, planForSubscriptionEvent } from "../_shared/billing-plan.ts";

const FUNCTION_NAME = "stripe-webhook";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // ── 1. Verify Stripe signature ──
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.warn(`[${FUNCTION_NAME}] Missing stripe-signature header`);
    return new Response("Missing signature", { status: 400 });
  }

  const rawBody = await req.text();

  const isValid = await verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    console.warn(`[${FUNCTION_NAME}] Invalid webhook signature`);
    return new Response("Invalid signature", { status: 401 });
  }

  // ── 2. Parse event ──
  let event: {
    id: string;
    type: string;
    data: { object: Record<string, unknown>; previous_attributes?: Record<string, unknown> };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const supabase = createSupabaseClient();

  console.log(`[${FUNCTION_NAME}] Event: ${event.type} (${event.id})`);

  // ── 3. Route by event type ──
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(supabase, event.data.object);
        break;

      case "invoice.paid":
        await handleInvoicePaid(supabase, event.data.object);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(supabase, event.data.object);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(supabase, event.data.object, event.data.previous_attributes);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(supabase, event.data.object);
        break;

      default:
        console.log(`[${FUNCTION_NAME}] Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(
      `[${FUNCTION_NAME}] Error handling ${event.type}:`,
      (error as Error).message
    );
    // Still return 200 — Stripe will retry on 5xx, and we don't want that
    // for application errors. Log + alert instead.
    await supabase.from("error_log").insert({
      function_name: FUNCTION_NAME,
      error_message: `${event.type}: ${(error as Error).message}`,
      stack_trace: (error as Error).stack,
      context: { event_id: event.id, event_type: event.type },
    });
  }

  // Always return 200 so Stripe doesn't retry
  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

// ─── EVENT HANDLERS ─────────────────────────────────────────────────────

/**
 * checkout.session.completed
 * First payment successful. Link Stripe customer to our user, activate subscription.
 */
async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createSupabaseClient>,
  session: Record<string, unknown>
): Promise<void> {
  const userId = (session.metadata as Record<string, string>)?.user_id;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    console.error(
      `[${FUNCTION_NAME}] checkout.session.completed missing user_id in metadata`
    );
    return;
  }

  // Determine tier from the subscription
  const tier = await getTierFromSubscription(subscriptionId);

  // Idempotent: only update if not already set
  const { data: existingUser } = await supabase
    .from("users")
    .select("stripe_subscription_id")
    .eq("id", userId)
    .single();

  if (existingUser?.stripe_subscription_id === subscriptionId) {
    console.log(
      `[${FUNCTION_NAME}] checkout.session.completed already processed for ${userId}`
    );
    return;
  }

  await supabase
    .from("users")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_tier: tier,
    })
    .eq("id", userId);

  console.log(
    `[${FUNCTION_NAME}] User ${userId} activated: ${tier} (customer: ${customerId})`
  );
}

/**
 * invoice.paid
 * Confirms subscription is active (covers renewals too).
 */
async function handleInvoicePaid(
  supabase: ReturnType<typeof createSupabaseClient>,
  invoice: Record<string, unknown>
): Promise<void> {
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) return; // One-time invoice, not subscription

  const tier = await getTierFromSubscription(subscriptionId);

  // Find user by Stripe customer ID
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!user) {
    console.warn(
      `[${FUNCTION_NAME}] invoice.paid: No user found for customer ${customerId}`
    );
    return;
  }

  // Ensure subscription_tier is correct (idempotent)
  await supabase
    .from("users")
    .update({
      subscription_tier: tier,
      stripe_subscription_id: subscriptionId,
    })
    .eq("id", user.id);
}

/**
 * invoice.payment_failed
 * Don't downgrade yet — Stripe retries automatically (3 attempts over ~3 weeks).
 * Log a warning for potential follow-up.
 */
async function handlePaymentFailed(
  supabase: ReturnType<typeof createSupabaseClient>,
  invoice: Record<string, unknown>
): Promise<void> {
  const customerId = invoice.customer as string;
  const attemptCount = invoice.attempt_count as number;

  const { data: user } = await supabase
    .from("users")
    .select("id, email")
    .eq("stripe_customer_id", customerId)
    .single();

  console.warn(
    `[${FUNCTION_NAME}] Payment failed for customer ${customerId} (attempt ${attemptCount}). User: ${user?.id ?? "unknown"}`
  );

  // Log for admin visibility (don't downgrade — Stripe handles retries)
  await supabase.from("error_log").insert({
    function_name: FUNCTION_NAME,
    error_message: `Payment failed (attempt ${attemptCount}) for customer ${customerId}`,
    user_id: user?.id,
    context: { attempt_count: attemptCount, customer_id: customerId },
  });
}

/**
 * customer.subscription.updated
 * Handle tier changes, period changes, cancellation scheduling.
 */
async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createSupabaseClient>,
  subscription: Record<string, unknown>,
  _previousAttributes?: Record<string, unknown>
): Promise<void> {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id as string;
  const status = subscription.status as string;

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!user) return;

  const action = planForSubscriptionEvent("customer.subscription.updated", status);
  if (action === "activate") {
    const tier = await getTierFromSubscription(subscriptionId);
    await supabase
      .from("users")
      .update({
        subscription_tier: tier,
        stripe_subscription_id: subscriptionId,
      })
      .eq("id", user.id);
  } else {
    // noop → do NOT downgrade (past_due / unpaid / incomplete: Stripe is still
    // retrying). Only customer.subscription.deleted drops a user to free.
    console.warn(
      `[${FUNCTION_NAME}] Subscription ${subscriptionId} status='${status}' for user ${user.id} — no tier change`
    );
  }
}

/**
 * customer.subscription.deleted
 * Subscription fully cancelled (after retries exhausted or user cancelled).
 * Downgrade to free tier.
 */
async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createSupabaseClient>,
  subscription: Record<string, unknown>
): Promise<void> {
  const customerId = subscription.customer as string;

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!user) return;

  await supabase
    .from("users")
    .update({
      subscription_tier: "free",
      stripe_subscription_id: null,
    })
    .eq("id", user.id);

  console.log(
    `[${FUNCTION_NAME}] User ${user.id} downgraded to free (subscription deleted)`
  );
}

// ─── HELPERS ────────────────────────────────────────────────────────────

/**
 * Determine the tier from a Stripe subscription's price metadata.
 * Falls back to checking product name if metadata isn't set.
 */
async function getTierFromSubscription(
  subscriptionId: string
): Promise<string> {
  try {
    const apiKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!apiKey) return "core"; // Safe default

    const response = await fetch(
      `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );

    if (!response.ok) return "core";

    const sub = await response.json();
    const item = sub.items?.data?.[0];

    return resolveTier(
      item?.price?.id,
      {
        coreMonthly: Deno.env.get("STRIPE_PRICE_CORE_MONTHLY"),
        coreYearly: Deno.env.get("STRIPE_PRICE_CORE_YEARLY"),
        premiumMonthly: Deno.env.get("STRIPE_PRICE_PREMIUM_MONTHLY"),
        premiumYearly: Deno.env.get("STRIPE_PRICE_PREMIUM_YEARLY"),
      },
      item?.price?.product?.name,
    );
  } catch {
    return "core"; // Safe default
  }
}
