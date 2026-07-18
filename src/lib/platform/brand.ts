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

export type BrandId = "masterytv" | "relatti" | "money";

/**
 * The program (vertical) axis, typed like BrandId (TENANCY_AUDIT.md T1).
 *
 * Why a union and not a bare string: brand-keyed code is exhaustive
 * Record<BrandId,…> and fails LOUDLY when a brand is added; program-keyed code
 * was ternaries and failed SILENTLY (career would have gotten the executive
 * coach, the Core battery, and MasteryTV's modules with zero compiler errors).
 * A new vertical arrives through the PROGRAM door — adding its slug here turns
 * every program-keyed Record in the codebase into a compile error until it's
 * handled.
 *
 * ⚠️ LOCKSTEP TWIN: supabase/functions/_shared/packs/index.ts declares the same
 * union (edge functions can't import from src/). Add new programs in BOTH.
 */
export type ProgramId = "general" | "relationship" | "money";

/** Type guard for a known program slug (raw DB strings, client hints). */
export function isProgramId(x?: string | null): x is ProgramId {
  return x === "general" || x === "relationship" || x === "money";
}

export interface Brand {
  id: BrandId;
  name: string;
  /** Tenant (workspace.slug). One workspace today; white-label adds rows later. */
  workspaceSlug: string;
  /** Vertical (program.slug) this brand's funnel + coach use. */
  programSlug: ProgramId;
  /** data-theme value applied at the root (PA3 theming). */
  themeId: string;
  // surfaceId REMOVED (TENANCY_AUDIT T5, 2026-07-16): it had zero consumers —
  // surface selection is byBrand() at DashboardLayoutClient, which is already
  // exhaustive per brand. Reintroduce only WITH the registry it promises.
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
    domains: ["masterytv.com", "www.masterytv.com", "staging.masterytv.com", "localhost"],
  },
  relatti: {
    id: "relatti",
    name: "Relatti",
    workspaceSlug: "masterytv",
    programSlug: "relationship",
    themeId: "relatti",
    domains: ["relatti.com", "www.relatti.com", "staging.relatti.com"],
  },
  // Money vertical (Money Maps™). FOUNDER-PINNED 2026-07-17: build on
  // moneymaps.masterytv.com for now; public brand name + domain still TBD
  // (Momatti candidate) — `name` uses the locked mechanic name "Money Maps",
  // not "Momatti". themeId "money" registered here; its [data-brand="money"]
  // globals.css palette is a later leaf (no money surface renders yet, so the
  // brand-tokens gate — which only checks brands WITH a block — stays green).
  // Staging subdomain = infra TODO (§5.9); dev access via ?brand=money on localhost.
  money: {
    id: "money",
    name: "Money Maps",
    workspaceSlug: "masterytv",
    programSlug: "money",
    themeId: "money",
    domains: ["moneymaps.masterytv.com"],
  },
};

export const DEFAULT_BRAND_ID: BrandId = "masterytv";

/**
 * Program -> brand, derived from the registry (never a ternary — a new brand's
 * programSlug is covered automatically, per TENANCY_AUDIT.md). Use this when a
 * stored `program` value (an invite, a conversation) must select branding.
 * Unknown / legacy program values fall back to the default brand.
 */
export function brandForProgram(programSlug?: string | null): Brand {
  if (programSlug) {
    for (const brand of Object.values(BRANDS)) {
      if (brand.programSlug === programSlug) return brand;
    }
  }
  return BRANDS[DEFAULT_BRAND_ID];
}

/** Type guard for a known brand id (used for ?brand= override + cookie). */
export function isBrandId(x?: string | null): x is BrandId {
  return !!x && x in BRANDS;
}

/**
 * Exhaustive per-brand value selection (TENANCY_AUDIT.md T2/T3). Use this
 * instead of `brand.id === "relatti" ? a : b` — the ternary silently hands a
 * NEW brand the else-branch (Mastery copy, Decoded components, the wrong legal
 * text); the Record parameter makes the same omission a compile error.
 */
export function byBrand<T>(map: Record<BrandId, T>, id: BrandId): T {
  return map[id];
}

/**
 * Hosts where the brand PREVIEW COOKIE is honored — local dev only.
 * Retired on deployed hosts 2026-07-14 (founder decision): a stale 30-day
 * preview cookie silently re-skinned staging.masterytv.com as Relatti and,
 * worse, flipped the coach `program` hint sent by the chat client. Now that
 * relatti has its own domains, deployed hosts resolve by host alone; the
 * explicit ?brand= param still works everywhere but no longer sticks outside
 * localhost.
 */
export function isPreviewHost(host?: string | null): boolean {
  if (!host) return false;
  const h = host.split(":")[0].toLowerCase().trim();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h.endsWith(".localhost");
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
 *   1. explicit ?brand= override (dev/preview on any host; visible, non-sticky
 *      outside localhost)
 *   2. a DEDICATED brand host (relatti.com) — the domain is authoritative, so a
 *      stale cookie or a stale inline script can never make it render as another
 *      brand. This is the key invariant that keeps host + chrome consistent.
 *   3. brand cookie — LOCALHOST ONLY (see isPreviewHost). Deployed hosts ignore
 *      it entirely.
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
  if (isBrandId(opts.cookie) && isPreviewHost(opts.host)) return opts.cookie; // dev-only preview cookie
  return hostId;
}
