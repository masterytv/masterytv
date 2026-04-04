/**
 * Stripe Product Setup — One-time setup to create products and prices.
 *
 * S5.6: Run this Edge Function once to create the Mastery Coach subscription
 * products and prices in Stripe. Stores the price IDs for future reference.
 *
 * POST /functions/v1/stripe-setup
 * Auth: Service role only (internal use)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createProductWithPrices } from "../_shared/stripe.ts";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Create Core product ($99/mo, $990/yr)
    console.log("[stripe-setup] Creating Core product...");
    const core = await createProductWithPrices({
      name: "Mastery Coach — Core",
      description:
        "Unlimited AI coaching across all channels. Morning briefings, accountability check-ins, weekly coaching sessions, and real-time factual grounding.",
      monthlyPriceCents: 9900,
      yearlyPriceCents: 99000,
    });

    console.log("[stripe-setup] Core product created:", core);

    // Create Premium product ($199/mo, $1990/yr)
    console.log("[stripe-setup] Creating Premium product...");
    const premium = await createProductWithPrices({
      name: "Mastery Coach — Premium",
      description:
        "Everything in Core plus priority response times, advanced coaching frameworks, deep-dive monthly strategy sessions, and white-glove onboarding.",
      monthlyPriceCents: 19900,
      yearlyPriceCents: 199000,
    });

    console.log("[stripe-setup] Premium product created:", premium);

    // Return the price IDs — these need to be saved as env vars
    const result = {
      message:
        "Products and prices created successfully. Set these as Supabase Edge Function secrets:",
      env_vars: {
        STRIPE_PRICE_CORE_MONTHLY: core.monthlyPriceId,
        STRIPE_PRICE_CORE_YEARLY: core.yearlyPriceId,
        STRIPE_PRICE_PREMIUM_MONTHLY: premium.monthlyPriceId,
        STRIPE_PRICE_PREMIUM_YEARLY: premium.yearlyPriceId,
      },
      stripe_products: {
        core: core.productId,
        premium: premium.productId,
      },
    };

    return new Response(JSON.stringify(result, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[stripe-setup] Error:", (error as Error).message);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
