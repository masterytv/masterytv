/**
 * Platform brand resolution (PLATFORM_ARCHITECTURE.md §4).
 *
 * A "brand" is the per-domain identity that selects which vertical a visitor
 * sees: workspace (tenant) + program (vertical) + theme + primary surface.
 * One modular app serves many domains; this maps host -> brand.
 *
 * PA2 scope: resolve + expose the brand. Nothing consumes it to change UI yet
 * (theming = PA3, surfaces = PB2). Everything defaults to MasteryTV, so adding
 * this is zero-behavior-change until a brand's domain is actually pointed here.
 *
 * For now brands are a static code map. They can move to the DB later
 * (entry_segment.domain already exists) without changing callers.
 *
 * This module is PURE (no next/headers) so it is safe to import from edge
 * middleware. The server-only getBrand() helper lives in ./brand.server.ts.
 */

export type BrandId = "masterytv" | "relatti";

export interface Brand {
  id: BrandId;
  name: string;
  /** Tenant (workspace.slug). One workspace today; white-label adds rows later. */
  workspaceSlug: string;
  /** Vertical (program.slug) this brand's funnel + coach use. */
  programSlug: string;
  /** data-theme value applied at the root (PA3 theming). */
  themeId: string;
  /** Primary logged-in surface this brand registers (PB2 surface registry). */
  surfaceId: string;
  /** Hosts (no port) that resolve to this brand. */
  domains: string[];
}

export const BRANDS: Record<BrandId, Brand> = {
  masterytv: {
    id: "masterytv",
    name: "MasteryTV",
    workspaceSlug: "masterytv",
    programSlug: "general",
    themeId: "masterytv",
    surfaceId: "coach_chat",
    domains: ["masterytv.com", "www.masterytv.com", "staging.masterytv.com", "localhost"],
  },
  relatti: {
    id: "relatti",
    name: "Relatti",
    workspaceSlug: "masterytv",
    programSlug: "relationship",
    themeId: "relatti",
    surfaceId: "relationship_dyad",
    domains: ["relatti.com", "www.relatti.com", "staging.relatti.com"],
  },
};

export const DEFAULT_BRAND_ID: BrandId = "masterytv";

/** Type guard for a known brand id (used for ?brand= override + cookie). */
export function isBrandId(x?: string | null): x is BrandId {
  return !!x && x in BRANDS;
}

/** Pure host -> brand lookup. Unknown / missing host falls back to the default. */
export function resolveBrand(host?: string | null): Brand {
  if (!host) return BRANDS[DEFAULT_BRAND_ID];
  const h = host.split(":")[0].toLowerCase().trim(); // strip port
  for (const brand of Object.values(BRANDS)) {
    if (brand.domains.includes(h)) return brand;
  }
  return BRANDS[DEFAULT_BRAND_ID];
}

/**
 * Unified brand resolution — the single rule for middleware, server, and client.
 *
 * Precedence:
 *   1. explicit ?brand= override (dev/preview on any host)
 *   2. a DEDICATED brand host (relatti.com) — the domain is authoritative, so a
 *      stale cookie or a stale inline script can never make it render as another
 *      brand. This is the key invariant that keeps host + chrome consistent.
 *   3. brand cookie — only on the default host (localhost / masterytv.com), which
 *      is how relatti previews there without owning the domain.
 *   4. default.
 */
export function resolveBrandId(opts: {
  host?: string | null;
  param?: string | null;
  cookie?: string | null;
}): BrandId {
  if (isBrandId(opts.param)) return opts.param;
  const hostId = resolveBrand(opts.host).id;
  if (hostId !== DEFAULT_BRAND_ID) return hostId; // dedicated brand domain wins
  if (isBrandId(opts.cookie)) return opts.cookie; // preview override on default host
  return hostId;
}
