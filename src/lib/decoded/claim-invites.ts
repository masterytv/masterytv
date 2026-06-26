import type { SupabaseClient } from '@supabase/supabase-js';
import { syncEngagementForInvite } from './sync-engagement';

/**
 * Claim any pending invites that match the user's email.
 *
 * When a user is invited via email, we create a decoded_invites row with
 * recipient_id = null. When they sign up and load a dashboard page, we
 * need to link them to the invite by setting recipient_id and marking
 * the invite as "completed" (both parties have assessment results).
 *
 * This is idempotent — calling it multiple times is safe.
 *
 * @returns Array of claimed invite IDs (empty if none claimed)
 */
export async function claimPendingInvites(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
): Promise<string[]> {
  // Check if user has completed an assessment (needed for "completed" status)
  const { data: hasReport } = await supabase
    .from('assessment_reports')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Determine the new status: if user has a completed report, mark as 'completed'
  // (both parties have results). Otherwise keep as 'pending' but still link the user.
  const newStatus = hasReport ? 'completed' : 'pending';

  const { data, error } = await supabase
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
 * Detected via recipient_id (set by claimPendingInvites). Call this AFTER the
 * claim so a freshly-arrived invitee is already linked. RLS-safe: the
 * "Recipient can read own" policy lets a user read invites where they are the
 * recipient. Returns false on any error (fail open to the normal flow).
 */
export async function isUserInvitee(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from('decoded_invites')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId);

  if (error) {
    console.error('[isUserInvitee] Error:', error.message);
    return false;
  }
  return (count ?? 0) > 0;
}
