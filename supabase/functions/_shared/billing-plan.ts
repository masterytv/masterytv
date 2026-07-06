/**
 * Pure billing decisions for the Stripe webhook — no Deno / Stripe-SDK / network
 * deps, so it is importable by both the Deno edge function (stripe-webhook) AND
 * Node/vitest (src/lib/billing/plan.test.ts). This is the ONE place the two
 * money-critical branches live:
 *
 *   1. resolveTier       — which subscription_tier a Stripe price maps to.
 *   2. planForSubscriptionEvent — what a webhook event should DO to the account,
 *      encoding the invariant that a FAILED payment must never downgrade a user
 *      (Stripe retries for ~3 weeks); ONLY an explicit deletion drops them to free.
 *
 * Billing is deferred past the free beta (E10); these are the guardrails for when
 * it turns on.
 */

export type Tier = "free" | "core" | "premium";

/** The Stripe price IDs we recognise (from env). Any may be undefined pre-config. */
export interface PriceCatalog {
  coreMonthly?: string;
  coreYearly?: string;
  premiumMonthly?: string;
  premiumYearly?: string;
}

/**
 * Map a Stripe price id → our tier. Falls back to the product name, then to
 * "core" (a safe paid default — never silently grants premium).
 *
 * Guard: an empty/undefined priceId never "matches" an empty/undefined env price
 * (`undefined === undefined`), which would wrongly grant premium.
 */
export function resolveTier(
  priceId: string | null | undefined,
  prices: PriceCatalog,
  productName?: string | null,
): Tier {
  if (priceId) {
    if (priceId === prices.premiumMonthly || priceId === prices.premiumYearly) return "premium";
    if (priceId === prices.coreMonthly || priceId === prices.coreYearly) return "core";
  }
  if ((productName ?? "").toLowerCase().includes("premium")) return "premium";
  return "core";
}

export type SubscriptionAction = "activate" | "downgrade_free" | "noop";

/**
 * What a Stripe event should do to the user's account.
 *
 * - checkout.session.completed / invoice.paid → activate (set/confirm paid tier)
 * - customer.subscription.updated → activate ONLY when active|trialing; any other
 *   status (past_due, unpaid, incomplete, canceled-but-not-yet-deleted) → noop.
 *   We do NOT downgrade on past_due — Stripe is still retrying.
 * - invoice.payment_failed → noop (log only; Stripe retries).
 * - customer.subscription.deleted → downgrade_free (the ONLY path to free).
 * - anything else → noop.
 */
export function planForSubscriptionEvent(
  eventType: string,
  status?: string,
): SubscriptionAction {
  switch (eventType) {
    case "checkout.session.completed":
    case "invoice.paid":
      return "activate";
    case "customer.subscription.updated":
      return status === "active" || status === "trialing" ? "activate" : "noop";
    case "customer.subscription.deleted":
      return "downgrade_free";
    case "invoice.payment_failed":
    default:
      return "noop";
  }
}
