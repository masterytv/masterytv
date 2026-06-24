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

export default function RelattiPage() {
  return <RelattiLanding />;
}
