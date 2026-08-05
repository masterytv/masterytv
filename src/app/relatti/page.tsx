import type { Metadata } from "next";
import { relattiPageMetadata } from "@/lib/platform/brand-metadata";
import RelattiLanding from "./RelattiLanding";

/**
 * Relatti landing (PB4.1) — the relationship vertical's marketing surface.
 *
 * Previews at /relatti on any host; will also serve relatti.com's root once
 * DNS + the host rewrite (PB1 follow-up) are in place. Brand theming (warm
 * rose) is applied via data-brand="relatti", set by the inline script in the
 * root layout for Relatti routes — so this page stays statically rendered.
 */
/**
 * Copy audit 2026-08-05 (option B, founder pick). The og:* pair matters more
 * than the tab title here: this page's link preview is what a partner sees when
 * the first partner forwards the link, and that forward is the funnel's only
 * real failure point (assessment→partner-invite 0/3). It has to read as an
 * invitation, not a diagnosis. Researchers named rather than "a century of
 * relationship science" — consistent with /science ("EFT and Gottman findings").
 */
export const metadata: Metadata = relattiPageMetadata({
  canonical: "/",
  title: "Relatti — The Relationship Coach for Both of You",
  description:
    "Ten minutes tells you how you attach and what you need to hear when things get hard. Send it to your partner, and the coach starts knowing you both. Grounded in Gottman's research and the attachment science behind EFT.",
  ogTitle: "Relatti — Find out what you're like to love.",
  ogDescription:
    "Ten minutes on how you love and what you need when things get hard. Then hear what your partner would say.",
});

export default function RelattiPage() {
  return <RelattiLanding />;
}
