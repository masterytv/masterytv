import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { syncEngagementForInvite } from './sync-engagement';

/**
 * A service-role client for the privileged invite-linking operations below.
 *
 * WHY service role: linking an invite to its recipient is a server-trusted
 * operation, not a user one. The "Recipient can claim by email" RLS UPDATE
 * policy was meant to let the invitee's own client do it, but in practice the
 * policy's USING clause (which calls auth.jwt()->>'email') silently fails to
 * match during UPDATE evaluation — the claim updated 0 rows and every invitee
 * was left unlinked (recipient_id null), which in turn broke dyad formation and
 * the invitee "skip the invite screen" detection.
 *
 * The callers run in server components AFTER supabase.auth.getUser() has
 * verified the user, and we only ever claim invites whose recipient_email
 * equals that verified email — exactly what the RLS policy intended, just done
 * reliably. Returns null when the service env is unavailable (callers fall back
 * to a no-op).
 */
function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('[claim-invites] Missing Supabase service-role env; skipping.');
    return null;
  }
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Claim any pending invites that match the user's (verified) email.
 *
 * When a user is invited via email, we create a decoded_invites row with
 * recipient_id = null. When they sign up and load a dashboard/assess page, we
 * link them to the invite by setting recipient_id (and marking it "completed"
 * once they have an assessment report — both parties then have results).
 *
 * Idempotent — calling it multiple times is safe (it only touches rows that are
 * still unclaimed for this email).
 *
 * @param _userClient kept for call-site compatibility; the privileged work runs
 *   under the service role (see serviceClient() above).
 * @returns Array of claimed invite IDs (empty if none claimed)
 */
export async function claimPendingInvites(
  _userClient: SupabaseClient,
  userId: string,
  userEmail: string,
): Promise<string[]> {
  const admin = serviceClient();
  if (!admin) return [];

  // Does the user have a completed report yet? (drives "completed" vs "pending")
  const { data: hasReport } = await admin
    .from('assessment_reports')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const newStatus = hasReport ? 'completed' : 'pending';

  const { data, error } = await admin
    .from('decoded_invites')
    .update({
      recipient_id: userId,
      recipient_report_id: hasReport?.id ?? null,
      status: newStatus,
      ...(hasReport ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq('recipient_email', userEmail.toLowerCase())
    .is('recipient_id', null)
    .select('id');

  if (error) {
    console.error('[claimPendingInvites] Error:', error.message);
    return [];
  }

  if (data && data.length > 0) {
    console.log(`[claimPendingInvites] Claimed ${data.length} invite(s) for ${userEmail}`);
  }

  const claimedIds = data?.map((row) => row.id) ?? [];

  // E3 dual-write: a claim sets recipient_id/report — mirror each into the spine
  // so the partner participant gets linked (non-fatal).
  for (const id of claimedIds) {
    await syncEngagementForInvite(id);
  }

  return claimedIds;
}

/**
 * Is this user the recipient of someone else's invitation (the invited partner
 * in a dyad)? Used to suppress the "invite someone" screen for invitees — they
 * were the one invited, so asking them to invite a partner is wrong.
 *
 * Matches on EITHER an already-linked invite (recipient_id) OR a still-pending
 * invite addressed to their verified email — so it's correct even if the claim
 * hasn't run yet. Runs under the service role for a deterministic read (the
 * unclaimed-by-email row isn't visible under the recipient's own RLS). Returns
 * false on any error (fail open to the normal flow).
 */
export async function isUserInvitee(
  _userClient: SupabaseClient,
  userId: string,
  userEmail?: string,
): Promise<boolean> {
  const admin = serviceClient();
  if (!admin) return false;

  let query = admin
    .from('decoded_invites')
    .select('id', { count: 'exact', head: true });

  query = userEmail
    ? query.or(`recipient_id.eq.${userId},recipient_email.eq.${userEmail.toLowerCase()}`)
    : query.eq('recipient_id', userId);

  const { count, error } = await query;

  if (error) {
    console.error('[isUserInvitee] Error:', error.message);
    return false;
  }
  return (count ?? 0) > 0;
}
