import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Keep the signed-in user's CURRENT report id on the dyad spine so the OTHER
 * partner can see "completed" status — and so a retake propagates.
 *
 * Why this exists: a participant can only read their OWN assessment rows (RLS),
 * so the relationship card derives each person's assessment status from shared
 * spine fields — participant.report_id and decoded_invites.{inviter,recipient}_
 * report_id, both readable by both partners. Those fields aren't always written
 * when a user completes (the recipient_report_id backfill gap seen in testing),
 * so we reconcile them here, under the service role, on dashboard load.
 *
 * Latest-tracking (not just null-backfill): `reportId` is the user's latest
 * non-superseded report. After a RETAKE the user has a new report id, so these
 * pointers must follow it — otherwise the compatibility report would regenerate
 * from stale data and staleness detection (report.generated_at vs
 * compatibility_generated_at) couldn't fire. We only write rows whose value
 * actually differs (null OR an older report id), so steady-state loads are no-ops.
 */
function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[sync-my-report] Missing Supabase service-role env; skipping.");
    return null;
  }
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function syncMyReportToSpine(
  userId: string,
  reportId: string | null
): Promise<void> {
  if (!reportId) return;
  const admin = serviceClient();
  if (!admin) return;

  try {
    await Promise.all([
      // My participant rows across every engagement I'm in.
      admin.from("participant").update({ report_id: reportId })
        .eq("user_id", userId).or(`report_id.is.null,report_id.neq.${reportId}`),
      // Invites where I'm the inviter or the recipient.
      admin.from("decoded_invites").update({ inviter_report_id: reportId })
        .eq("inviter_id", userId).or(`inviter_report_id.is.null,inviter_report_id.neq.${reportId}`),
      admin.from("decoded_invites").update({ recipient_report_id: reportId })
        .eq("recipient_id", userId).or(`recipient_report_id.is.null,recipient_report_id.neq.${reportId}`),
    ]);
  } catch (err) {
    console.error("[sync-my-report] sync error:", err);
  }
}
