import type { Metadata } from "next";
import { relattiPageMetadata } from "@/lib/platform/brand-metadata";
import { cookies } from "next/headers";
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
export const metadata: Metadata = relattiPageMetadata({
  title: "The Relatti 14-Day Challenge — Fourteen Days. The Two of You.",
  description:
    "Take the free 14-day relationship challenge together: one quiz each, a map of how you two work, and a coach that knows you both. See what two weeks changes.",
  ogTitle: "The Relatti 14-Day Challenge",
  ogDescription: "Fourteen days. The two of you. See what changes.",
});

export default async function ChallengePage({ searchParams }: PageProps) {
  const params = await searchParams;
  // Fall back to the middleware-persisted beta_code cookie (set by any
  // marketing link carrying ?code=) so CTAs and the copyable partner message
  // still embed the code for visitors who arrived here without one.
  const cookieCode = (await cookies()).get("beta_code")?.value ?? "";
  return <ChallengeLanding initialCode={(params.code ?? "").trim() || cookieCode.trim()} />;
}
