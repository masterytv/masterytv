import type { Metadata } from "next";
import { brandPageMetadata } from "@/lib/platform/brand-metadata";
import TellLanding from "./TellLanding";

/**
 * The Money Tell landing route (/tell) — the money vertical's edge-leaning
 * second door (poker frame), alongside the generic-and-credible MoneyTraits
 * homepage at /money. Served at moneytraits.com/tell; on any other host it
 * still renders money-branded because the root layout's head script treats
 * /tell as a money path (same mechanism as /money).
 *
 * NOINDEX on purpose: money is pre-launch (dark). At go-public, flip noindex
 * off and add /tell to the sitemap + this brand's robots allowances alongside
 * /money.
 */
export const metadata: Metadata = brandPageMetadata("money", {
  title: "The Money Tell — Everyone at the table has a tell.",
  description:
    "Yours shows up in what you charge, when you sell, and which opportunities you watch yourself not take. Sixteen questions spot the tell that's been playing your hand — then a coach in your corner teaches you to play it cold. No bank linking, ever.",
  ogTitle: "Everyone at the table has a tell. Nobody can see their own.",
  noindex: true,
});

export default function TellPage() {
  return <TellLanding />;
}
