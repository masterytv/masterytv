import type { Metadata } from "next";
import { brandPageMetadata } from "@/lib/platform/brand-metadata";
import { createClient } from "@/lib/supabase/server";
import LandingPage from "./landing";

/**
 * Landing Page — Server Component wrapper
 *
 * Checks auth state to pass logged-in context to the client landing page.
 * Logged-out users see conversion page; logged-in users see welcome-back hero.
 *
 * SEO: Targets "personality test + coaching" positioning.
 */

// Through the helper (BRAND.md §15) rather than a hand-rolled object: the old
// literal set og:title/description but no og:image and no icons, so texting
// masterytv.com previewed as a bare title bubble while relatti.com rendered a
// full card. The helper emits title + og + twitter + the brand icon set as one
// unit, so no key can fall back or go missing.
export const metadata: Metadata = {
  ...brandPageMetadata("masterytv", {
    title: "MasteryTV — The Personality Test That Gives You a Coach",
    description:
      "15 validated personality tests in 30 minutes. Get a deep report, your archetype, and a coach that knows everything about you. Free.",
    ogTitle: "The personality test that gives you a coach.",
    ogDescription:
      "Know yourself deeper than ever. 15 validated instruments in 30 minutes, a personalized report, and a coach that remembers everything.",
    canonical: "/",
  }),
  keywords: [
    "personality test",
    "personality assessment",
    "personal coaching",
    "Big Five personality",
    "attachment style",
    "relationship compatibility",
    "personal development",
    "self-discovery",
    "career assessment",
    "emotional intelligence",
  ],
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "MasteryTV — Decoded",
  description:
    "Comprehensive personality assessment combining 15 validated instruments with personal coaching. Covers Big Five, attachment style, emotional regulation, career interests, and relationship compatibility.",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      name: "Free",
      description:
        "Full personality assessment, 13-section report, archetype, 1 compatibility report, 5 coaching messages per day",
    },
  ],
  featureList: [
    "15 validated personality instruments",
    "Big Five personality profiling",
    "Attachment style assessment",
    "Emotional regulation mapping",
    "Career interest alignment",
    "Relationship compatibility reports",
    "Coaching with full personality context",
    "Personalized archetype identification",
  ],
  creator: {
    "@type": "Organization",
    name: "MasteryTV",
    url: "https://masterytv.com",
  },
};

export default async function HomePage() {
  // Check auth state for logged-in/logged-out hero switch
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user;
  const userName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "there";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage isLoggedIn={isLoggedIn} userName={userName} />
    </>
  );
}
