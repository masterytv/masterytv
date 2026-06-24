/**
 * Server-only brand helper (PLATFORM_ARCHITECTURE.md §4).
 *
 * Kept separate from ./brand.ts (which is pure + edge-safe) because it imports
 * next/headers, which only works in Server Components / route handlers — not in
 * middleware. Layouts and server components call getBrand() here.
 */
import { cookies, headers } from "next/headers";
import { resolveBrand, isBrandId, BRANDS, type Brand } from "./brand";

/**
 * Resolve the current request's brand in an RSC context.
 * Precedence: brand cookie (set from a ?brand= preview override by middleware)
 * > Host header. First-request ?brand= is handled by callers that read
 * searchParams directly (the cookie applies from the next request).
 */
export async function getBrand(): Promise<Brand> {
  const c = await cookies();
  const cookieBrand = c.get("brand")?.value;
  if (isBrandId(cookieBrand)) return BRANDS[cookieBrand];
  const h = await headers();
  return resolveBrand(h.get("host"));
}
