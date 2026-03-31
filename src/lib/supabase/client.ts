import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for browser-side usage.
 * Uses the anon key — RLS policies enforce data isolation.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
