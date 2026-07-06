import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Couples auto-share their full report + compatibility.
 *
 * The sharing-level negotiation was removed (founder decision 2026-07-06): a
 * couples product means both partners simply see each other fully. This self-heals
 * any of the user's CONNECTED dyads (partner joined + both have a report) to
 * `share_with_human = 'full'` and re-runs `relatti_sync_invite` so the value
 * propagates to `participant.share_level` — which is what the compatibility report
 * ("View their full report") and the dyad coach read.
 *
 * Runs on the compatibility page load. Idempotent: the `.neq('share_with_human',
 * 'full')` filter means each dyad is upgraded exactly once. The separate coach
 * axis (`participant.coach_share_level`, what YOUR coach sees of you) is untouched.
 */
export async function ensureCoupleFullSharing(userId: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const admin = createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: invites } = await admin
      .from("decoded_invites")
      .select("id")
      .or(`inviter_id.eq.${userId},recipient_id.eq.${userId}`)
      .not("recipient_id", "is", null)
      .not("recipient_report_id", "is", null)
      .not("inviter_report_id", "is", null)
      .neq("recipient_email", "broadcast")
      .neq("share_with_human", "full");

    for (const inv of invites ?? []) {
      await admin
        .from("decoded_invites")
        .update({
          share_with_human: "full",
          share_with_coach: "full", // vestigial mirror; the real coach axis is participant.coach_share_level
          status: "consented",
          consented_at: new Date().toISOString(),
          revoked_at: null, // couples always share fully — clear any stale Private guard
        })
        .eq("id", inv.id);
      const { error } = await admin.rpc("relatti_sync_invite", { p_invite_id: inv.id });
      if (error) console.error("[auto-full] relatti_sync_invite failed:", error.message);
    }
  } catch (err) {
    console.error("[auto-full] error:", err);
  }
}
