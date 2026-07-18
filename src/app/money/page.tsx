import type { Metadata } from "next";
import { brandPageMetadata } from "@/lib/platform/brand-metadata";
import MoneyLanding from "./MoneyLanding";

/**
 * Money (Money Maps) landing route.
 *
 * Served at /money on any host, and at the ROOT of moneymaps.masterytv.com via
 * the middleware root-rewrite (/ → /money when the resolved brand is money) — the
 * same pattern Relatti uses (/ → /relatti). Emerald theming is applied by
 * data-brand="money" (the inline head script in the root layout), so this page
 * stays statically rendered.
 *
 * NOINDEX on purpose: money is pre-launch (dark) — the domain isn't pointed and
 * the public brand name is still founder-TBD. Flip noindex off (and add /money to
 * the sitemap + robots isProductionHost) at go-public.
 */
export const metadata: Metadata = brandPageMetadata("money", {
  title: "Money Maps — The psychology under your money decisions",
  description:
    "A coach for what's underneath your earning, spending, and pricing — the beliefs, fears, and patterns that decide what you do with money before you know you've decided. Psychology, not your bank account.",
  ogTitle: "Money Maps — your bank account is a symptom, not the problem",
  noindex: true,
});

export default function MoneyPage() {
  return <MoneyLanding />;
}
