import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Backfill the signed-in user's completed report id onto the dyad spine so the
 * OTHER partner can see "completed" status.
 *
 * Why this exists: a participant can only read their OWN assessment rows (RLS),
 * so the relationship card derives each person's assessment status from shared
 * spine fields — participant.report_id and decoded_invites.{inviter,recipient}_
 * report_id, both readable by both partners. Those fields aren't always written
 * when a user completes (the recipient_report_id backfill gap seen in testing),
 * so we reconcile them here, under the service role, on dashboard load.
 *
 * Idempotent and cheap: only touches this user's own spine rows where the report
 * id is still missing. No-op when the service env is unavailable or no report.
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
      admin.from("participant").update({ report_id: reportId }).eq("user_id", userId).is("report_id", null),
      // Invites where I'm the inviter or the recipient.
      admin.from("decoded_invites").update({ inviter_report_id: reportId }).eq("inviter_id", userId).is("inviter_report_id", null),
      admin.from("decoded_invites").update({ recipient_report_id: reportId }).eq("recipient_id", userId).is("recipient_report_id", null),
    ]);
  } catch (err) {
    console.error("[sync-my-report] backfill error:", err);
  }
}
