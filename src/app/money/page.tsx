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
  title: "Money Maps — You don't have a money problem. You have a pattern.",
  description:
    "Sixteen questions name the pattern under how you earn, price, and risk — then a coach works on the cause, not the symptoms. Psychology, not your bank account. No budgets, no bank linking, ever.",
  ogTitle: "You don't have a money problem. You have a money pattern.",
  noindex: true,
});

export default function MoneyPage() {
  return <MoneyLanding />;
}
