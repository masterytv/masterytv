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
  title: "MoneyTraits — You keep making the same money mistake.",
  description:
    "Sixteen questions put a name on the pattern behind your money decisions. About three minutes, free, and we never ask to see your bank account.",
  ogTitle: "You keep making the same money mistake. You already know which one.",
  noindex: true,
  // ogImage ON despite noindex: the helper's default couples the two, but they
  // answer different questions — noindex keeps us out of the SEARCH index while
  // pre-launch; the card is what renders when the founder texts the link to a
  // tester. Without it iMessage falls back to a bare title + domain bubble.
  ogImage: true,
});

export default function MoneyPage() {
  return <MoneyLanding />;
}
