/**
 * CORS headers for Edge Functions.
 * Production: masterytv.com (apex + www).
 * Staging: staging.masterytv.com (shared Supabase project, separate Vercel deploy).
 * Development: also allows localhost.
 */

const ALLOWED_ORIGINS = [
  "https://masterytv.com",
  "https://www.masterytv.com",
  "https://staging.masterytv.com",
  // Relatti vertical (same Supabase project, separate domains + Vercel deploy).
  "https://relatti.com",
  "https://www.relatti.com",
  "https://staging.relatti.com",
  // Money vertical: moneytraits.com (public brand since 2026-07-20) + the old
  // moneymaps.masterytv.com hosts as transition aliases until the cutover is
  // verified (MONEY_TRAITS_RENAME.md §5.7). §5.9 gotcha: "edge CORS per new
  // origin" — a new brand host needs BOTH brand.ts domains AND this allowlist
  // AND a redeploy of every browser-facing fn, else the browser gets
  // allow-origin=masterytv.com and blocks the coach fetch.
  "https://moneytraits.com",
  "https://www.moneytraits.com",
  "https://staging.moneytraits.com",
  "https://moneymaps.masterytv.com",
  "https://staging.moneymaps.masterytv.com",
  "http://localhost:3000",
  "http://localhost:3001",
];

/**
 * Returns the correct Access-Control-Allow-Origin for the request origin.
 * If the origin isn't in the whitelist, returns the production domain
 * (browser will block the request if it doesn't match).
 */
export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers?.get("Origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0]; // default to production

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Vary": "Origin",
  };
}

// Keep backward-compatible export for existing code that uses corsHeaders directly
// This defaults to production origin — prefer getCorsHeaders(req) for proper checking
export const corsHeaders = getCorsHeaders();

/**
 * Handles CORS preflight requests.
 * Call this at the top of every Edge Function.
 */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }
  return null;
}
