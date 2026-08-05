import type { Metadata } from "next";
import { relattiPageMetadata } from "@/lib/platform/brand-metadata";
import RelattiLanding, { SAMEFIGHT_CONTENT } from "../relatti/RelattiLanding";

/**
 * /samefight — the original problem-first Relatti landing, preserved verbatim
 * when the home page repositioned to the aspirational/mission frame
 * (2026-07-09, see directives/HOME_CHALLENGE_COPY.md). Kept as (a) a reference
 * we can point back to, and (b) a live entry for distress-intent traffic —
 * the avatar this headline converts best. `legacy` keeps the old pillar copy
 * and hides the belief block. Brand themes rose via the layout inline
 * script's Relatti-path match.
 */
export const metadata: Metadata = relattiPageMetadata({
  canonical: "/samefight",
  title: "Relatti — The Coach That Knows Both of You",
  // Was a pair of bare negations ("Not couples therapy…") plus an em dash.
  // Repeated negation is the #1 LLM tell (BRAND.md §14.6) and this page
  // was one of the last two lines still carrying it. Founder unfroze it
  // 2026-08-05 so the gate could go blocking. The therapy distancing is kept
  // as a plain negation, which §14.6 explicitly permits and the gate spares.
  description:
    "Coaching, not therapy: a relationship coach grounded in both partners' psychology. It mediates real issues, runs gentle check-ins, and helps in the moment a fight is happening.",
  ogTitle: "Relatti — Stop having the same fight",
  ogDescription:
    "A relationship coach that knows both of you. Built on validated psychology for each partner.",
});

export default function SameFightPage() {
  return <RelattiLanding content={SAMEFIGHT_CONTENT} legacy />;
}
