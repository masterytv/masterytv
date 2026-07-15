import type { Metadata } from "next";
import { relattiPageMetadata } from "@/lib/platform/brand-metadata";
import RelattiLanding from "../relatti/RelattiLanding";

/**
 * /engaged — Relatti V1 funnel (PB4.2). Engaged/premarital intent; high intent,
 * clear trigger (the wedding). Brand themes rose via the inline script's
 * Relatti-path match. Deeper entry_segment content is GTM (out of scope).
 */
export const metadata: Metadata = relattiPageMetadata({
  canonical: "/engaged",
  title: "Relatti for Engaged Couples — Start marriage already understanding each other",
  description:
    "Premarital coaching grounded in both partners' psychology. Understand how you'll handle conflict, money, and closeness — before the wedding, not after.",
  ogTitle: "Relatti for Engaged Couples",
  ogDescription: "Walk into marriage already understanding each other.",
});

export default function EngagedPage() {
  return (
    <RelattiLanding
      content={{
        eyebrow: "For engaged couples",
        headlineTop: "Begin your marriage",
        headlineAccent: "already understanding each other.",
        subhead:
          "Before the wedding, find out how you each handle conflict, closeness, and stress — and get a coach that knows both of you, ready for the hard conversations that actually matter.",
      }}
    />
  );
}
