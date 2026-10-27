import { AI_CRAWLERS } from "@/lib/platform/ai-crawlers";
import { resolveBrand } from "@/lib/platform/brand";
import { BRAND_ORIGINS } from "@/lib/platform/brand-metadata";

/**
 * Brand-aware robots.txt (BRAND.md §15). One app serves many domains, so this
 * cannot be a static app/robots.ts — the crawl policy and sitemap URL depend
 * on the requesting host.
 *
 * Non-production hosts (staging.*, *.vercel.app, localhost) get a blanket
 * Disallow so preview deployments never enter the index and never compete
 * with the real domain as duplicate content.
 *
 * AI crawlers (GPTBot, ClaudeBot, PerplexityBot, … — the list lives in
 * ai-crawlers.ts) are disallowed everywhere. Founder decision 2026-10-27: this
 * reverses the earlier AEO welcome, after crawler traffic helped push the
 * Vercel Hobby team past its Active CPU limit. Middleware also answers them
 * 403, but this file stays reachable so they can read the ask.
 */

// Private/authed surfaces — never crawlable on any brand.
const DISALLOW = [
  "/dashboard/",
  "/admin/",
  "/api/",
  "/auth/",
  "/onboarding",
  "/coachapp/",
  "/upgrade-success",
];

function isProductionHost(host: string | null): boolean {
  if (!host) return false;
  const h = host.split(":")[0].toLowerCase();
  return (
    ["masterytv.com", "www.masterytv.com", "relatti.com", "www.relatti.com"].includes(h)
  );
}

export async function GET(request: Request) {
  const host = request.headers.get("host");

  const body = isProductionHost(host)
    ? [
        "User-agent: *",
        "Allow: /",
        ...DISALLOW.map((p) => `Disallow: ${p}`),
        "",
        // AI crawlers: off the whole site (see ai-crawlers.ts).
        ...AI_CRAWLERS.map((bot) => `User-agent: ${bot}`),
        "Disallow: /",
        "",
        `Sitemap: ${BRAND_ORIGINS[resolveBrand(host).id]}/sitemap.xml`,
        "",
      ].join("\n")
    : // Staging / preview / localhost: invisible to every crawler.
      "User-agent: *\nDisallow: /\n";

  return new Response(body, {
    headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
