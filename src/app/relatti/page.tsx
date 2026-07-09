import type { Metadata } from "next";
import RelattiLanding from "./RelattiLanding";

/**
 * Relatti landing (PB4.1) — the relationship vertical's marketing surface.
 *
 * Previews at /relatti on any host; will also serve relatti.com's root once
 * DNS + the host rewrite (PB1 follow-up) are in place. Brand theming (warm
 * rose) is applied via data-brand="relatti", set by the inline script in the
 * root layout for Relatti routes — so this page stays statically rendered.
 */
export const metadata: Metadata = {
  title: "Relatti — The Relationship Coach for Both of You",
  description:
    "Built on a century of relationship science. Understand how you each love, bond, and handle hard moments — and turn understanding into a relationship that thrives.",
  openGraph: {
    title: "Relatti — The best relationships aren't lucky. They're understood.",
    description:
      "A relationship coach for both of you, built on a century of relationship science.",
    type: "website",
    siteName: "Relatti",
  },
  robots: { index: true, follow: true },
};

export default function RelattiPage() {
  return <RelattiLanding />;
}
