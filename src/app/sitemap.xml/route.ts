import { resolveBrand, type BrandId } from "@/lib/platform/brand";
import { BRAND_ORIGINS } from "@/lib/platform/brand-metadata";

/**
 * Brand-aware sitemap.xml (BRAND.md §15). One app serves many domains, so the
 * sitemap must vary by host: relatti.com lists the Relatti public surface,
 * masterytv.com the MasteryTV/Decoded one. URLs are emitted absolute against
 * the brand's canonical origin.
 *
 * ADD EVERY NEW PUBLIC (indexable) PAGE HERE when you ship it — the
 * brand-metadata gate guarantees the page's <head> carries the right brand,
 * but only this list gets it crawled. Authed/noindex pages do NOT belong here.
 */

const PUBLIC_PATHS: Record<BrandId, { path: string; priority: number }[]> = {
  relatti: [
    { path: "/", priority: 1.0 }, // middleware serves the Relatti landing at the root
    { path: "/couples", priority: 0.9 },
    { path: "/engaged", priority: 0.9 },
    { path: "/samefight", priority: 0.9 },
    { path: "/challenge", priority: 0.8 },
    { path: "/beta", priority: 0.8 },
    { path: "/science", priority: 0.7 },
    { path: "/why-ai", priority: 0.7 },
    { path: "/privacy", priority: 0.3 },
    { path: "/terms", priority: 0.3 },
    { path: "/disclaimer", priority: 0.3 },
  ],
  masterytv: [
    { path: "/", priority: 1.0 },
    { path: "/decoded/landing", priority: 0.9 },
    { path: "/types", priority: 0.8 },
    { path: "/privacy", priority: 0.3 },
    { path: "/terms", priority: 0.3 },
    { path: "/disclaimer", priority: 0.3 },
  ],
  // Money is DARK (pre-launch): the domain isn't pointed and it's noindex (not in
  // robots isProductionHost). Nothing public to advertise yet — add the landing +
  // legal paths here when the money surfaces + domain go live (launch task).
  money: [],
};

export async function GET(request: Request) {
  const brand = resolveBrand(request.headers.get("host"));
  const origin = BRAND_ORIGINS[brand.id];

  const urls = PUBLIC_PATHS[brand.id]
    .map(
      ({ path, priority }) => `  <url>
    <loc>${new URL(path, origin).toString()}</loc>
    <priority>${priority.toFixed(1)}</priority>
  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
  });
}
