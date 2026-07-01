/**
 * Server-only brand helper (PLATFORM_ARCHITECTURE.md §4).
 *
 * Kept separate from ./brand.ts (which is pure + edge-safe) because it imports
 * next/headers, which only works in Server Components / route handlers — not in
 * middleware. Layouts and server components call getBrand() here.
 */
import { cookies, headers } from "next/headers";
import { resolveBrandId, BRANDS, type Brand } from "./brand";

/**
 * Resolve the current request's brand in an RSC context. Uses the shared
 * resolveBrandId rule: a dedicated brand host (relatti.com) is authoritative; the
 * brand cookie only overrides on the default host. First-request ?brand= is
 * handled by callers that read searchParams directly.
 */
export async function getBrand(): Promise<Brand> {
  const c = await cookies();
  const h = await headers();
  return BRANDS[resolveBrandId({ host: h.get("host"), cookie: c.get("brand")?.value })];
}

/**
 * Like getBrand(), but also honors a first-request ?brand= override read from a
 * page's searchParams. Use this in server components that render brand-specific
 * content and must theme correctly on a preview host (localhost/staging) before
 * the brand cookie is set — e.g. the (legal) pages behind ?brand=relatti.
 */
export async function getBrandFromRequest(param?: string | null): Promise<Brand> {
  const c = await cookies();
  const h = await headers();
  return BRANDS[
    resolveBrandId({ host: h.get("host"), param, cookie: c.get("brand")?.value })
  ];
}
