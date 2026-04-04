import type { Metadata } from "next";
import LandingPage from "./landing";

/**
 * Landing Page — Server Component wrapper
 * S6.11 — Premium marketing page for Mastery Coach
 *
 * Handles: SEO metadata, OG tags, Twitter cards, JSON-LD structured data
 * Renders: <LandingPage /> client component (Framer Motion animations)
 */

export const metadata: Metadata = {
  title: "Mastery Coach — AI Coaching That Remembers Everything",
  description:
    "Not a chatbot. A coach that knows your name, your goals, and your blind spots. 20+ coaching frameworks. Adapted to how you think. Available 24/7 on web, email, and Telegram.",
  keywords: [
    "AI coaching",
    "executive coaching",
    "business coaching",
    "personal development",
    "AI coach",
    "founder coaching",
    "leadership coaching",
    "accountability coach",
  ],
  openGraph: {
    title: "Mastery Coach — AI Coaching That Remembers Everything",
    description:
      "Your people. Your goals. Your fears. Your wins. A coach that remembers everything and uses 20+ proven frameworks to coach you in your own style.",
    type: "website",
    siteName: "MasteryTV",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mastery Coach — AI Coaching That Remembers Everything",
    description:
      "Not a chatbot. A coach that knows your name, your goals, and your blind spots.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://masterytv.com",
  },
};

/* JSON-LD Structured Data — SoftwareApplication schema for rich results */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Mastery Coach",
  description:
    "AI coaching platform that remembers your people, goals, fears, and wins. Uses 20+ proven coaching frameworks adapted to your communication style.",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      name: "Free Tier",
      description: "5 messages per day, web chat, coaching letter",
    },
    {
      "@type": "Offer",
      price: "99",
      priceCurrency: "USD",
      name: "Core",
      description:
        "Unlimited messages, web + email + Telegram, morning briefings, 20+ frameworks",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "99",
        priceCurrency: "USD",
        billingDuration: "P1M",
      },
    },
  ],
  featureList: [
    "Persistent memory across conversations",
    "20+ coaching framework auto-selection",
    "8-dimension communication style adaptation",
    "Proactive morning briefings",
    "Accountability check-ins",
    "Multi-channel: web, email, Telegram",
    "Entity extraction (people, goals, patterns)",
    "Crisis detection and safety system",
  ],
  creator: {
    "@type": "Organization",
    name: "MasteryTV",
    url: "https://masterytv.com",
  },
};

export default function HomePage() {
  return (
    <>
      {/* JSON-LD structured data for search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  );
}
