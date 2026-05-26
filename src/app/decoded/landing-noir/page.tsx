import type { Metadata } from "next";
import DecodedNoirLanding from "./DecodedNoirLanding";

export const metadata: Metadata = {
  title: "Decoded — The Most Complete Personality Intelligence Report",
  description:
    "13 validated psychological instruments. One adaptive assessment. A free 30-page intelligence report and an AI coach who already knows you. Start free.",
  openGraph: {
    title: "Decoded — Personal Intelligence Briefing",
    description:
      "13 validated instruments. 30-page AI-written report. A coach pre-loaded with your results. Free to start.",
    type: "website",
    siteName: "Mastery Coach",
  },
  twitter: {
    card: "summary_large_image",
    title: "Decoded — Personal Intelligence Briefing",
    description:
      "13 validated instruments. 30-page AI-written report. A coach pre-loaded with your results. Free to start.",
  },
};

export default function LandingNoirPage() {
  return <DecodedNoirLanding />;
}
