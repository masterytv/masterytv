import type { Metadata } from "next";
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
export const metadata: Metadata = {
  title: "Relatti — The Coach That Knows Both of You",
  description:
    "Not couples therapy. Not a journaling app. A relationship coach grounded in both partners' psychology — it mediates real issues, runs gentle check-ins, and helps in the moment a fight is happening.",
  openGraph: {
    title: "Relatti — Stop having the same fight",
    description:
      "A relationship coach that knows both of you. Built on validated psychology for each partner.",
    type: "website",
    siteName: "Relatti",
  },
  robots: { index: true, follow: true },
};

export default function SameFightPage() {
  return <RelattiLanding content={SAMEFIGHT_CONTENT} legacy />;
}
