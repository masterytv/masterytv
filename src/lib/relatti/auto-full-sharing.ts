import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Couples auto-share their full report + compatibility — for the INVITE-LINK
 * onboarding flow only.
 *
 * The sharing-level negotiation was removed (founder decision 2026-07-06): a
 * couples product means both partners simply see each other fully. Amended
 * 2026-07-15 (founder): that consent story only holds when the partner joined
 * THROUGH the invite ("so your coach can understand you both" — taking the
 * quiz via the link is the consent). Two existing members connecting is a
 * REQUEST that invite-consent completes on explicit Accept; this function
 * skips those (upgrade_requested_by) and never resurrects a removed/declined
 * connection (revoked_at).
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
    // Consent guards (founder, 2026-07-15). This self-healer serves ONE flow:
    // the classic invite-link onboarding, where taking the quiz through your
    // partner's invite IS the consent. It must never:
    //   • resurrect a removed/declined connection (revoked_at stays authoritative
    //     — it used to null it out, silently undoing every revoke), or
    //   • complete a connect REQUEST to an existing member before they accept
    //     (upgrade_requested_by marks those; invite-consent completes them).
    const { data: invites } = await admin
      .from("decoded_invites")
      .select("id")
      .or(`inviter_id.eq.${userId},recipient_id.eq.${userId}`)
      .not("recipient_id", "is", null)
      .not("recipient_report_id", "is", null)
      .not("inviter_report_id", "is", null)
      .neq("recipient_email", "broadcast")
      .neq("share_with_human", "full")
      .is("revoked_at", null)
      .is("upgrade_requested_by", null);

    for (const inv of invites ?? []) {
      await admin
        .from("decoded_invites")
        .update({
          share_with_human: "full",
          share_with_coach: "full", // vestigial mirror; the real coach axis is participant.coach_share_level
          status: "consented",
          consented_at: new Date().toISOString(),
        })
        .eq("id", inv.id);
      const { error } = await admin.rpc("relatti_sync_invite", { p_invite_id: inv.id });
      if (error) console.error("[auto-full] relatti_sync_invite failed:", error.message);
    }
  } catch (err) {
    console.error("[auto-full] error:", err);
  }
}
