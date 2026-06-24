import type { Metadata } from "next";
import RelattiLanding from "../relatti/RelattiLanding";

/**
 * /couples — Relatti V1 funnel (PB4.2). Couples-intent entry; brand themes rose
 * via the inline script's Relatti-path match. Segment copy below; deeper
 * entry_segment-driven content is GTM (out of architecture scope).
 */
export const metadata: Metadata = {
  title: "Relatti for Couples — Stop having the same fight",
  description:
    "A relationship coach that knows both of you. Built on each partner's validated psychology — it mediates the recurring fight instead of taking sides.",
  openGraph: {
    title: "Relatti for Couples",
    description: "A coach that knows both of you — and helps you stop having the same fight.",
    type: "website",
    siteName: "Relatti",
  },
};

export default function CouplesPage() {
  return (
    <RelattiLanding
      content={{
        eyebrow: "For couples",
        headlineTop: "The same fight,",
        headlineAccent: "finally finished.",
        subhead:
          "Relatti is a coach that understands both of you — your attachment styles, how you each handle conflict, what you each need to feel close — and helps you break the loop instead of repeating it.",
      }}
    />
  );
}
