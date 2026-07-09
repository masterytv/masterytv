import type { Metadata } from "next";
import ChallengeLanding from "./ChallengeLanding";

interface PageProps {
  searchParams: Promise<{ code?: string }>;
}

/**
 * /challenge — the 14-Day Challenge entry (see directives/HOME_CHALLENGE_COPY.md).
 *
 * The positive, forwardable framing of the same beta funnel: share as
 * relatti.com/challenge?code=XXXX and the code rides every CTA into /beta,
 * which owns redemption + the before check-in. Brand themes rose via the
 * layout inline script's Relatti-path match (like /couples, /engaged).
 */
export const metadata: Metadata = {
  title: "The Relatti 14-Day Challenge — Fourteen Days. The Two of You.",
  description:
    "Take the free 14-day relationship challenge together: one quiz each, a map of how you two work, and a coach that knows you both. See what two weeks changes.",
  openGraph: {
    title: "The Relatti 14-Day Challenge",
    description: "Fourteen days. The two of you. See what changes.",
    type: "website",
    siteName: "Relatti",
  },
  robots: { index: true, follow: true },
};

export default async function ChallengePage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <ChallengeLanding initialCode={(params.code ?? "").trim()} />;
}
