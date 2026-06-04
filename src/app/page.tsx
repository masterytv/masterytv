import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "MasteryTV — The Personality Test That Gives You a Coach",
  description:
    "15 validated personality tests in 30 minutes. Get a deep report, your archetype, and an AI coach that knows everything about you. Free.",
  keywords: [
    "personality test",
    "personality assessment",
    "AI coaching",
    "Big Five personality",
    "attachment style",
    "relationship compatibility",
    "personal development",
    "self-discovery",
    "career assessment",
    "emotional intelligence",
  ],
  openGraph: {
    title: "MasteryTV — The Personality Test That Gives You a Coach",
    description:
      "Know yourself deeper than ever. 15 validated instruments in 30 minutes, a personalized report, and an AI coach that remembers everything.",
    type: "website",
    siteName: "MasteryTV",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "MasteryTV — The Personality Test That Gives You a Coach",
    description:
      "15 personality tests. 30 minutes. A coach that knows everything about you.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://masterytv.com",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "MasteryTV — Decoded",
  description:
    "Comprehensive personality assessment combining 15 validated instruments with AI coaching. Covers Big Five, attachment style, emotional regulation, career interests, and relationship compatibility.",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      name: "Free",
      description:
        "Full personality assessment, 13-section report, archetype, 1 compatibility report, 5 AI coaching messages per day",
    },
  ],
  featureList: [
    "15 validated personality instruments",
    "Big Five personality profiling",
    "Attachment style assessment",
    "Emotional regulation mapping",
    "Career interest alignment",
    "Relationship compatibility reports",
    "AI coaching with full personality context",
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
