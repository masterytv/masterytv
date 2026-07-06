import { describe, it, expect } from "vitest";
// The webhook is a Deno edge fn (can't import from src/), so the pure logic lives
// in _shared and is imported here by relative path. Keep this the single spec for it.
import {
  resolveTier,
  planForSubscriptionEvent,
  type PriceCatalog,
} from "../../../supabase/functions/_shared/billing-plan";

const PRICES: PriceCatalog = {
  coreMonthly: "price_core_m",
  coreYearly: "price_core_y",
  premiumMonthly: "price_prem_m",
  premiumYearly: "price_prem_y",
};

describe("resolveTier", () => {
  it("maps known premium price ids → premium", () => {
    expect(resolveTier("price_prem_m", PRICES)).toBe("premium");
    expect(resolveTier("price_prem_y", PRICES)).toBe("premium");
  });

  it("maps known core price ids → core", () => {
    expect(resolveTier("price_core_m", PRICES)).toBe("core");
    expect(resolveTier("price_core_y", PRICES)).toBe("core");
  });

  it("falls back to the product name when the price id is unknown", () => {
    expect(resolveTier("price_unknown", PRICES, "Relatti Premium")).toBe("premium");
    expect(resolveTier("price_unknown", PRICES, "Core Plan")).toBe("core");
  });

  it("defaults to 'core' (never silently premium) when nothing matches", () => {
    expect(resolveTier("price_unknown", PRICES)).toBe("core");
    expect(resolveTier("price_unknown", PRICES, "")).toBe("core");
  });

  it("GUARD: an undefined price id must NOT match undefined env prices (no accidental premium)", () => {
    // Pre-config: env price ids are undefined AND the sub has no price id.
    expect(resolveTier(undefined, {})).toBe("core");
    expect(resolveTier(null, {}, null)).toBe("core");
    // Even if a catalog slot is undefined, an undefined priceId can't match it.
    expect(resolveTier(undefined, { premiumMonthly: undefined })).toBe("core");
  });
});

describe("planForSubscriptionEvent — money-critical invariant matrix", () => {
  it("activates on first payment and renewals", () => {
    expect(planForSubscriptionEvent("checkout.session.completed")).toBe("activate");
    expect(planForSubscriptionEvent("invoice.paid")).toBe("activate");
  });

  it("activates a subscription update only for active/trialing", () => {
    expect(planForSubscriptionEvent("customer.subscription.updated", "active")).toBe("activate");
    expect(planForSubscriptionEvent("customer.subscription.updated", "trialing")).toBe("activate");
  });

  it("NEVER downgrades on a failed payment or a still-retrying status", () => {
    expect(planForSubscriptionEvent("invoice.payment_failed")).toBe("noop");
    expect(planForSubscriptionEvent("customer.subscription.updated", "past_due")).toBe("noop");
    expect(planForSubscriptionEvent("customer.subscription.updated", "unpaid")).toBe("noop");
    expect(planForSubscriptionEvent("customer.subscription.updated", "incomplete")).toBe("noop");
  });

  it("downgrades to free ONLY on an explicit subscription deletion", () => {
    expect(planForSubscriptionEvent("customer.subscription.deleted")).toBe("downgrade_free");

    // Prove exclusivity: across a representative event set, nothing else downgrades.
    const others: Array<[string, string?]> = [
      ["checkout.session.completed"],
      ["invoice.paid"],
      ["invoice.payment_failed"],
      ["customer.subscription.updated", "active"],
      ["customer.subscription.updated", "past_due"],
      ["customer.subscription.updated", "canceled"],
      ["some.unhandled.event"],
    ];
    for (const [type, status] of others) {
      expect(planForSubscriptionEvent(type, status)).not.toBe("downgrade_free");
    }
  });

  it("treats unhandled events as noop", () => {
    expect(planForSubscriptionEvent("customer.created")).toBe("noop");
    expect(planForSubscriptionEvent("")).toBe("noop");
  });
});
