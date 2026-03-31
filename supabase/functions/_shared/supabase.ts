import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Creates a Supabase client with service role key for Edge Functions.
 * Service role bypasses RLS — use for writing coach messages, system data, etc.
 */
export function createSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

/**
 * Creates a Supabase client with the user's JWT for Edge Functions.
 * Uses the anon key + user's Authorization header. RLS is enforced.
 */
export function createSupabaseClientWithAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");

  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    }
  );
}
