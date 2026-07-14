/**
 * Brand-aware page metadata (link previews, favicons, Open Graph).
 *
 * Why this exists: Next merges metadata SHALLOWLY per key — a page that sets
 * `title` but not `openGraph`/`icons` inherits the ROOT layout's Mastery Coach
 * og:title and favicon set wholesale. Link-preview crawlers (iMessage, Slack,
 * WhatsApp) never run the client-side brand script that swaps icons in the
 * browser, and most of them prefer og:title over <title>. Net effect before
 * this helper: relatti.com links previewed with the MasteryTV icon and, on
 * pages without their own og block, the Mastery Coach title.
 *
 * Rules:
 * - Relatti-only static pages (marketing) call `relattiPageMetadata` in their
 *   static `metadata` export — pure data, so they STAY statically rendered.
 * - Pages serving both brands resolve the brand first (getBrandFromRequest)
 *   and call `brandPageMetadata(brand.id, …)` from `generateMetadata`.
 * - Never set only `title` on a shared page — always go through this helper
 *   so og + icons follow the brand.
 */
import type { Metadata } from "next";
import type { BrandId } from "./brand";

const BRAND_ICONS: Record<BrandId, Metadata["icons"]> = {
  masterytv: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  relatti: {
    icon: [
      { url: "/relatti/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/relatti/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/relatti/apple-touch-icon.png",
  },
};

const SITE_NAME: Record<BrandId, string> = {
  masterytv: "Mastery Coach",
  relatti: "Relatti",
};

export interface BrandPageMeta {
  title: string;
  description?: string;
  /** Preview-card title when it should differ from the tab title. */
  ogTitle?: string;
  ogDescription?: string;
  noindex?: boolean;
}

export function brandPageMetadata(brandId: BrandId, page: BrandPageMeta): Metadata {
  const ogTitle = page.ogTitle ?? page.title;
  const ogDescription = page.ogDescription ?? page.description;
  return {
    title: page.title,
    ...(page.description ? { description: page.description } : {}),
    icons: BRAND_ICONS[brandId],
    openGraph: {
      title: ogTitle,
      ...(ogDescription ? { description: ogDescription } : {}),
      type: "website",
      siteName: SITE_NAME[brandId],
      locale: "en_US",
    },
    twitter: {
      card: "summary",
      title: ogTitle,
      ...(ogDescription ? { description: ogDescription } : {}),
    },
    ...(page.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

export function relattiPageMetadata(page: BrandPageMeta): Metadata {
  return brandPageMetadata("relatti", page);
}
