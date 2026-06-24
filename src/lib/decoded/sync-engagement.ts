import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * E3 dual-write — mirror a decoded_invites row into the Relatti engagement spine.
 *
 * Calls the idempotent DB function relatti_sync_invite(), which create-or-updates
 * the engagement + both participants + the partner stake + (when present) the
 * relationship Blueprint for one invite. See RELATIONSHIP_ARCHITECTURE.md §3/§7.
 *
 * Runs under the SERVICE ROLE because spine writes are service-role only by
 * design (ADR-R02) — the function is REVOKEd from anon/authenticated.
 *
 * NON-FATAL: any failure is logged, never thrown. The decoded_invites write has
 * already succeeded by the time this runs; the spine is a secondary mirror that
 * nothing reads until the coach cutover (E4). Never let it break the user flow.
 */
export async function syncEngagementForInvite(
  inviteId: string | null | undefined,
): Promise<void> {
  if (!inviteId) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('[syncEngagement] Missing Supabase service-role env; skipping spine sync.');
    return;
  }

  try {
    const admin = createServiceClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await admin.rpc('relatti_sync_invite', { p_invite_id: inviteId });
    if (error) {
      console.error('[syncEngagement] relatti_sync_invite failed:', error.message);
    }
  } catch (e) {
    console.error('[syncEngagement] Unexpected error:', (e as Error).message);
  }
}
