/**
 * Stripe Utilities — Shared Stripe integration helpers.
 *
 * S5.6-S5.8: Signature verification, product/price management,
 * checkout session creation, customer portal.
 *
 * Architecture: ARCHITECTURE.md §4.4
 *
 * Uses direct fetch (no SDK) for Deno Edge Function compatibility.
 */

const STRIPE_API_BASE = "https://api.stripe.com/v1";

// ─── TYPES ──────────────────────────────────────────────────────────────

export interface StripePrice {
  id: string;
  product: string;
  unit_amount: number;
  currency: string;
  recurring: {
    interval: "month" | "year";
  };
}

export interface StripeCheckoutSession {
  id: string;
  url: string;
}

export interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
    previous_attributes?: Record<string, unknown>;
  };
}

// Price IDs will be populated after creating products
// Stored as env vars so they can change without redeployment
export function getPriceIds(): Record<string, string> {
  return {
    core_monthly: Deno.env.get("STRIPE_PRICE_CORE_MONTHLY") ?? "",
    core_yearly: Deno.env.get("STRIPE_PRICE_CORE_YEARLY") ?? "",
    premium_monthly: Deno.env.get("STRIPE_PRICE_PREMIUM_MONTHLY") ?? "",
    premium_yearly: Deno.env.get("STRIPE_PRICE_PREMIUM_YEARLY") ?? "",
  };
}

// ─── API HELPERS ────────────────────────────────────────────────────────

function getSecretKey(): string {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return key;
}

async function stripeRequest<T>(
  path: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: Record<string, string>
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getSecretKey()}`,
  };

  const options: RequestInit = { method, headers };

  if (body && method === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    options.body = new URLSearchParams(body).toString();
  }

  const response = await fetch(`${STRIPE_API_BASE}${path}`, options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stripe API error (${response.status}): ${error}`);
  }

  return await response.json();
}

// ─── WEBHOOK VERIFICATION ───────────────────────────────────────────────

/**
 * Verify Stripe webhook signature.
 * Uses the raw request body (not parsed JSON) for HMAC verification.
 *
 * Stripe signs with: HMAC-SHA256(webhook_secret, timestamp.payload)
 * Header format: t=timestamp,v1=signature
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string
): Promise<boolean> {
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET not set");
    return false;
  }

  const elements = signatureHeader.split(",");
  const timestamp = elements
    .find((e) => e.startsWith("t="))
    ?.slice(2);
  const signature = elements
    .find((e) => e.startsWith("v1="))
    ?.slice(3);

  if (!timestamp || !signature) {
    return false;
  }

  // Check timestamp tolerance (5 minute window)
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp));
  if (age > 300) {
    console.warn(`[stripe] Webhook timestamp too old: ${age}s`);
    return false;
  }

  // Compute expected signature
  const payload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );

  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison
  if (expectedSignature.length !== signature.length) return false;

  let result = 0;
  for (let i = 0; i < expectedSignature.length; i++) {
    result |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
  }

  return result === 0;
}

// ─── CHECKOUT ───────────────────────────────────────────────────────────

/**
 * Create a Stripe Checkout session for subscription upgrade.
 */
export async function createCheckoutSession(params: {
  priceId: string;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
  stripeCustomerId?: string;
}): Promise<StripeCheckoutSession> {
  const body: Record<string, string> = {
    "mode": "subscription",
    "line_items[0][price]": params.priceId,
    "line_items[0][quantity]": "1",
    "success_url": params.successUrl,
    "cancel_url": params.cancelUrl,
    "customer_email": params.stripeCustomerId ? "" : params.userEmail,
    "metadata[user_id]": params.userId,
    "subscription_data[metadata][user_id]": params.userId,
  };

  // If user already has a Stripe customer, use it instead of email
  if (params.stripeCustomerId) {
    body["customer"] = params.stripeCustomerId;
    delete body["customer_email"];
  }

  return stripeRequest<StripeCheckoutSession>(
    "/checkout/sessions",
    "POST",
    body
  );
}

// ─── CUSTOMER PORTAL ────────────────────────────────────────────────────

/**
 * Create a Stripe Billing Portal session for subscription management.
 */
export async function createPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<{ url: string }> {
  return stripeRequest<{ url: string }>(
    "/billing_portal/sessions",
    "POST",
    {
      customer: stripeCustomerId,
      return_url: returnUrl,
    }
  );
}

// ─── PRODUCT CREATION ───────────────────────────────────────────────────

/**
 * Create a Stripe product with associated prices.
 * Used during initial setup (S5.6).
 */
export async function createProductWithPrices(params: {
  name: string;
  description: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
}): Promise<{
  productId: string;
  monthlyPriceId: string;
  yearlyPriceId: string;
}> {
  // Create product
  const product = await stripeRequest<{ id: string }>(
    "/products",
    "POST",
    {
      name: params.name,
      description: params.description,
    }
  );

  // Create monthly price
  const monthlyPrice = await stripeRequest<{ id: string }>(
    "/prices",
    "POST",
    {
      product: product.id,
      "unit_amount": params.monthlyPriceCents.toString(),
      currency: "usd",
      "recurring[interval]": "month",
    }
  );

  // Create yearly price
  const yearlyPrice = await stripeRequest<{ id: string }>(
    "/prices",
    "POST",
    {
      product: product.id,
      "unit_amount": params.yearlyPriceCents.toString(),
      currency: "usd",
      "recurring[interval]": "year",
    }
  );

  return {
    productId: product.id,
    monthlyPriceId: monthlyPrice.id,
    yearlyPriceId: yearlyPrice.id,
  };
}
