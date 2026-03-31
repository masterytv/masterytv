import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { jsonResponse } from "../_shared/errors.ts";

/**
 * Hello World Edge Function — validates the deployment pipeline.
 * Returns a 200 JSON response confirming the function is live.
 */
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  return jsonResponse({
    message: "Mastery Coach Edge Functions are live! 🚀",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});
