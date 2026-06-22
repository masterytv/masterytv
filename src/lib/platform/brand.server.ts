/**
 * Server-only brand helper (PLATFORM_ARCHITECTURE.md §4).
 *
 * Kept separate from ./brand.ts (which is pure + edge-safe) because it imports
 * next/headers, which only works in Server Components / route handlers — not in
 * middleware. Layouts and server components call getBrand() here.
 */
import { headers } from "next/headers";
import { resolveBrand, type Brand } from "./brand";

/**
 * Resolve the current request's brand from the Host header. Always available
 * in an RSC context; does not depend on the middleware-set x-brand header.
 */
export async function getBrand(): Promise<Brand> {
  const h = await headers();
  return resolveBrand(h.get("host"));
}
