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
  // Money-specific paths (NOT masterytv's — reusing those would leak the wrong
  // favicon onto money link previews). Assets under /public/money/ (emerald
  // compass tile, generated from icon.svg); mirrors the Relatti icon shape.
  money: {
    icon: [
      { url: "/money/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/money/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/money/apple-touch-icon.png",
  },
  // HEARD assets under /public/heard/ (slate wordmark tile, generated from
  // icon.svg with sharp, same shape as the Relatti and money sets). The tab
  // icon is one of this brand's privacy surfaces, not just chrome: it sits in
  // the tab strip and the bookmark bar of somebody who has not told the people
  // they live with, so it carries the wordmark and no imagery of what the
  // vertical is about.
  heard: {
    icon: [
      { url: "/heard/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/heard/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/heard/apple-touch-icon.png",
  },
};

const SITE_NAME: Record<BrandId, string> = {
  masterytv: "Mastery Coach",
  relatti: "Relatti",
  // Public brand locked 2026-07-20: MoneyTraits on moneytraits.com.
  money: "MoneyTraits",
  // Public brand locked 2026-08-13: HEARD on youheard.org. The wordmark is
  // all-caps (BRAND.md §1.1) and the domain carries the "you"; the site name
  // never does, so a preview card reads "HEARD" and not a sentence about the
  // reader.
  heard: "HEARD",
};

// Tab-title suffix — shorter than SITE_NAME so titles survive tab truncation
// ("Coach — Mastery", not "Coach — Mastery Coach").
const TITLE_SUFFIX: Record<BrandId, string> = {
  masterytv: "Mastery",
  relatti: "Relatti",
  money: "MoneyTraits",
  heard: "HEARD",
};

/** "{Page} — {Brand}" tab title, e.g. brandTitle("relatti", "Coach") → "Coach — Relatti". */
export function brandTitle(brandId: BrandId, page: string): string {
  return `${page} — ${TITLE_SUFFIX[brandId]}`;
}

// og:image / canonical / sitemap URLs must be ABSOLUTE — crawlers resolve
// nothing, and Next's inferred metadataBase would point at the vercel.app
// deployment host, not the brand's custom domain. Exported for the
// brand-aware robots.txt + sitemap.xml route handlers.
export const BRAND_ORIGINS: Record<BrandId, string> = {
  masterytv: "https://masterytv.com",
  relatti: "https://relatti.com",
  money: "https://moneytraits.com",
  heard: "https://youheard.org",
};

export interface BrandPageMeta {
  title: string;
  description?: string;
  /** Preview-card title when it should differ from the tab title. */
  ogTitle?: string;
  ogDescription?: string;
  noindex?: boolean;
  /**
   * Rich preview card (1200×630, rendered by /api/og from brand config).
   * Defaults ON for indexable pages, OFF for noindex ones; pass false to
   * opt a public page out, or a string to override the card's text.
   */
  ogImage?: boolean | string;
  /**
   * Canonical PATH ("/" or "/couples") — emitted absolute against the brand
   * origin. Set on indexable pages reachable at more than one URL (e.g. the
   * Relatti landing serves at relatti.com/, relatti.com/relatti AND
   * masterytv.com/relatti — canonical "/" points crawlers at relatti.com/).
   */
  canonical?: string;
}

export function brandPageMetadata(brandId: BrandId, page: BrandPageMeta): Metadata {
  const ogTitle = page.ogTitle ?? page.title;
  const ogDescription = page.ogDescription ?? page.description;

  const wantsImage = page.ogImage ?? !page.noindex;
  const cardTitle = typeof page.ogImage === "string" ? page.ogImage : ogTitle;
  const imageUrl = wantsImage
    ? `${BRAND_ORIGINS[brandId]}/api/og?brand=${brandId}&title=${encodeURIComponent(cardTitle)}`
    : null;

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
      ...(imageUrl
        ? { images: [{ url: imageUrl, width: 1200, height: 630, alt: cardTitle }] }
        : {}),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: ogTitle,
      ...(ogDescription ? { description: ogDescription } : {}),
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
    ...(page.noindex ? { robots: { index: false, follow: false } } : {}),
    ...(page.canonical
      ? { alternates: { canonical: new URL(page.canonical, BRAND_ORIGINS[brandId]).toString() } }
      : {}),
  };
}

export function relattiPageMetadata(page: BrandPageMeta): Metadata {
  return brandPageMetadata("relatti", page);
}

/**
 * HEARD-only static pages (the doors, the pre-account box).
 *
 * ⚠️ These default to `noindex` and that is deliberate, not a copy of the
 * Relatti helper with a flag flipped. The vertical is dark: youheard.org is not
 * pointed here, and I11 has not published the Privacy Policy, Terms or
 * Disclaimer, so an indexed HEARD page would be a live public service whose
 * legal documents say "not published yet". Pass `noindex: false` per page when
 * I11 lands, and add the path to the sitemap in the same change.
 */
export function heardPageMetadata(page: BrandPageMeta): Metadata {
  return brandPageMetadata("heard", { noindex: true, ...page });
}
