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
