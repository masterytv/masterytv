import type { Metadata } from "next";
import { brandPageMetadata } from "@/lib/platform/brand-metadata";
import MoneyLanding from "../money/MoneyLanding";

/**
 * /land2 — alias of the MoneyTraits homepage.
 *
 * The rewrite shipped here as a copy experiment on 2026-07-24 and was
 * founder-approved as THE homepage the same day; the component now lives at
 * src/app/money/MoneyLanding.tsx (served at / and /money on money hosts).
 * This route stays so comparison links already shared keep working. Safe to
 * delete once nobody's holding a /land2 link.
 *
 * NOINDEX like /money (pre-launch) — and permanently, as a duplicate route.
 */
export const metadata: Metadata = brandPageMetadata("money", {
  title: "MoneyTraits — You keep making the same money mistake.",
  description:
    "Sixteen questions put a name on the pattern behind your money decisions. About three minutes, free, and we never ask to see your bank account.",
  ogTitle: "You keep making the same money mistake. You already know which one.",
  noindex: true,
  ogImage: true,
});

export default function Land2Page() {
  return <MoneyLanding />;
}
