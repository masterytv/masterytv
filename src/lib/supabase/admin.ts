import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for server-side PRIVILEGED writes.
 *
 * ⚠️ Bypasses RLS entirely — the CALLER must authorize the request (verify
 * ownership / party membership) before writing. Use this only for columns or
 * tables that are locked to the service role by design:
 *   - public.users entitlement/role columns (see the 2026-07-19 users
 *     column-grant hardening migration)
 *   - public.decoded_invites consent state machine (share_with_human, status,
 *     upgrade_requested_*, …) — service-role-write-only so a client cannot forge
 *     or self-grant partner access (see …_lock_invite_consent_columns).
 *
 * Throws when the service env is missing so a route's existing try/catch returns
 * a 500 instead of silently degrading. Never import this into client components —
 * SUPABASE_SERVICE_ROLE_KEY is server-only.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "[supabase/admin] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
