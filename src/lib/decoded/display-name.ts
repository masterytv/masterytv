/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A service-role client. Typed permissively on purpose: the call sites build
 * clients with different generic parameters, and a bare `SupabaseClient`
 * resolves to a stricter shape than any of them produce.
 */
export type AdminClient = SupabaseClient<any, any, any, any, any>;

/**
 * The one place that answers "what do we call this user?".
 *
 * Why this exists: three call sites read a `decoded_profiles.display_name` —
 * a table that DOES NOT EXIST (never created by any migration). PostgREST
 * returns an error, the code reads `data?.display_name` on null, and the name
 * silently resolves to nothing. So the report's OG share card has never carried
 * a name, and the shared-report banner fell through to the owner's raw email.
 * Nothing threw; it just quietly never worked.
 *
 * The real source is `users.name` — the same conclusion the coach reached on
 * 2026-07-15 when it was telling people their partner was named "Partner".
 *
 * Returns null (never a placeholder) so each caller picks its own fallback.
 */
export async function getDisplayName(
  admin: AdminClient,
  userId: string
): Promise<string | null> {
  const { data } = await admin
    .from("users")
    .select("name")
    .eq("id", userId)
    .maybeSingle();

  const name = (data as { name?: unknown } | null)?.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}
