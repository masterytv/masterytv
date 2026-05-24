import type { Metadata } from "next";
import DecodedMarketingLanding from "./DecodedMarketingLanding";

export const metadata: Metadata = {
  title: "Decoded — Finally Understand Why You Are the Way You Are",
  description:
    "15 validated psychological instruments. One adaptive assessment. A free 30-page personalized report — and an AI coach who already knows you. Personality, attachment, emotional regulation, career interests, and more.",
  openGraph: {
    title: "Decoded — You, Decoded.",
    description:
      "The most comprehensive personality assessment built for people who want to actually do something with it. Free core assessment and 30-page AI report.",
    type: "website",
    url: "https://mastery.tv/decoded/landing",
  },
  twitter: {
    card: "summary_large_image",
    title: "Decoded — You, Decoded.",
    description:
      "15 validated instruments. Free 30-page report. A coach who already knows you.",
  },
};

/**
 * /decoded/landing — Public marketing landing page for Decoded.
 * No auth gate — pure marketing page. CTAs link to /decoded (auth entry point).
 */
export default function DecodedLandingPage() {
  return <DecodedMarketingLanding />;
}
