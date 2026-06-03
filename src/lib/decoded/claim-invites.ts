import type { SupabaseClient } from '@supabase/supabase-js';

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
    .limit(1)
    .maybeSingle();

  // Determine the new status: if user has a completed report, mark as 'completed'
  // (both parties have results). Otherwise keep as 'pending' but still link the user.
  const newStatus = hasReport ? 'completed' : 'pending';

  const { data, error } = await supabase
    .from('decoded_invites')
    .update({
      recipient_id: userId,
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

  return data?.map((row) => row.id) ?? [];
}
