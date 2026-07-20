import type { Metadata } from "next";
import { brandPageMetadata } from "@/lib/platform/brand-metadata";
import MoneyLanding from "./MoneyLanding";

/**
 * Money (MoneyTraits) homepage route.
 *
 * Served at /money on any host, and at the ROOT of moneytraits.com (plus the
 * legacy moneymaps.masterytv.com alias) via the middleware root-rewrite
 * (/ → /money when the resolved brand is money) — the same pattern Relatti uses
 * (/ → /relatti). Emerald theming is applied by data-brand="money" (the inline
 * head script in the root layout), so this page stays statically rendered.
 *
 * NOINDEX on purpose: money is pre-launch (dark). Flip noindex off (and add
 * /money to the sitemap + robots isProductionHost) at go-public.
 */
export const metadata: Metadata = brandPageMetadata("money", {
  title: "MoneyTraits — You don't run your money. Your traits do.",
  description:
    "Sixteen questions measure the four traits behind every dollar you've made, kept, or lost — then a coach helps you work them. Psychology, not your bank account. No budgets, no bank linking, ever.",
  ogTitle: "You don't run your money. Your traits do.",
  noindex: true,
});

export default function MoneyPage() {
  return <MoneyLanding />;
}
