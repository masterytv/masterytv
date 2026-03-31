/**
 * CORS headers for Edge Functions.
 * Allows requests from masterytv.com and localhost for development.
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Tighten to masterytv.com in production
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

/**
 * Handles CORS preflight requests.
 * Call this at the top of every Edge Function.
 */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}
