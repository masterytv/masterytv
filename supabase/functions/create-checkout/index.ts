/**
 * Create Checkout — Stripe checkout + customer portal.
 *
 * POST /functions/v1/create-checkout
 * Body: { tier: 'core' | 'premium', interval: 'monthly' | 'yearly' }
 *   OR  { action: 'portal' }
 * Auth: JWT required
 *
 * S5.7 + S5.10: Creates Stripe Checkout or Customer Portal session.
 *
 * Architecture: ARCHITECTURE.md §4.4
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient, createSupabaseClientWithAuth } from "../_shared/supabase.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/errors.ts";
import { createCheckoutSession, createPortalSession, getPriceIds } from "../_shared/stripe.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST is allowed", 405, corsHeaders);
  }

  try {
    // ── 1. Authenticate ──
    const supabaseAuth = createSupabaseClientWithAuth(req);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", "Invalid or missing JWT", 401, corsHeaders);
    }

    const body = await req.json();
    const supabase = createSupabaseClient();
    const baseUrl = Deno.env.get("NEXT_PUBLIC_SITE_URL") || "https://masterytv.com";

    // ── 2a. Customer portal flow ──
    if (body.action === "portal") {
      const { data: portalUser } = await supabase
        .from("users")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .single();

      if (!portalUser?.stripe_customer_id) {
        return errorResponse("NOT_FOUND", "No billing account found", 404, corsHeaders);
      }

      const portal = await createPortalSession(
        portalUser.stripe_customer_id,
        `${baseUrl}/coachapp/dashboard/settings`
      );

      return new Response(
        JSON.stringify({ portal_url: portal.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2b. Checkout flow ──
    const tier = body.tier as string;
    const interval = body.interval as string || "monthly";

    if (!["core", "premium"].includes(tier)) {
      return errorResponse("BAD_REQUEST", "tier must be 'core' or 'premium'", 400, corsHeaders);
    }
    if (!["monthly", "yearly"].includes(interval)) {
      return errorResponse("BAD_REQUEST", "interval must be 'monthly' or 'yearly'", 400, corsHeaders);
    }

    // ── 3. Resolve price ID ──
    const priceKey = `${tier}_${interval}`;
    const prices = getPriceIds();
    const priceId = prices[priceKey];

    if (!priceId) {
      return errorResponse(
        "CONFIGURATION_ERROR",
        `Price not configured for ${tier}/${interval}. Set STRIPE_PRICE_${tier.toUpperCase()}_${interval.toUpperCase()} env var.`,
        500,
        corsHeaders
      );
    }

    // ── 4. Check existing subscription ──
    const { data: userRecord } = await supabase
      .from("users")
      .select("email, name, stripe_customer_id, subscription_tier")
      .eq("id", user.id)
      .single();

    if (!userRecord) {
      return errorResponse("NOT_FOUND", "User not found", 404, corsHeaders);
    }

    if (userRecord.subscription_tier === tier) {
      return errorResponse(
        "ALREADY_SUBSCRIBED",
        `You are already on the ${tier} plan`,
        400,
        corsHeaders
      );
    }

    // ── 5. Create Checkout session ──
    const session = await createCheckoutSession({
      priceId,
      userId: user.id,
      userEmail: userRecord.email,
      successUrl: `${baseUrl}/coachapp/dashboard/settings?checkout=success`,
      cancelUrl: `${baseUrl}/coachapp/dashboard/settings?checkout=cancelled`,
      stripeCustomerId: userRecord.stripe_customer_id || undefined,
    });

    return new Response(
      JSON.stringify({ checkout_url: session.url, session_id: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[create-checkout] Error:", (error as Error).message);
    return errorResponse("INTERNAL_ERROR", "Failed to create checkout session", 500, corsHeaders);
  }
});
