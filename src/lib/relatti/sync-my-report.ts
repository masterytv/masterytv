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
    // The spine this stamps (participant.report_id, decoded_invites.*_report_id)
    // is RELATIONSHIP-only, but the writes below are filtered by user_id alone —
    // they'd happily brand a Relatti dyad with a MasteryTV report id. Callers
    // are supposed to be brand-gated, and PC2.1d scoped the reportId they pass;
    // this verifies it rather than trusting it, because the blast radius is the
    // dyad coach and the compatibility report reading the wrong person's world.
    // (PC2.1g — directives/ASSESSMENT_PROGRAM_SCOPING.md.)
    const { data: report } = await admin
      .from("assessment_reports")
      .select("program")
      .eq("id", reportId)
      .maybeSingle();
    if (report?.program !== "relationship") {
      console.warn(
        `[sync-my-report] refusing to stamp a '${report?.program ?? "missing"}' report onto the dyad spine`,
      );
      return;
    }

    await Promise.all([
      // My participant rows across every engagement I'm in.
      admin.from("participant").update({ report_id: reportId })
        .eq("user_id", userId).or(`report_id.is.null,report_id.neq.${reportId}`),
      // Invites where I'm the inviter or the recipient — RELATIONSHIP invites
      // only (PC2.1h invariant 3): the report is verified relationship above,
      // and stamping it onto a user's general/Decoded invite would repoint that
      // link's identity (the §2 overwrite, via a second door).
      admin.from("decoded_invites").update({ inviter_report_id: reportId })
        .eq("inviter_id", userId).eq("program", "relationship")
        .or(`inviter_report_id.is.null,inviter_report_id.neq.${reportId}`),
      admin.from("decoded_invites").update({ recipient_report_id: reportId })
        .eq("recipient_id", userId).eq("program", "relationship")
        .or(`recipient_report_id.is.null,recipient_report_id.neq.${reportId}`),
    ]);

    // Un-stick the invitee. The claim (claimPendingInvites) only advances an
    // invite 'pending' → 'completed' on the FIRST claim *and* only if the
    // recipient already had a report — so a recipient who signed up before
    // finishing their assessment leaves the invite frozen at 'pending', which
    // freezes their partner participant at 'invited' and hides the dyad from
    // their dashboard ("Invite your partner"). We're here because this user now
    // HAS a report (reportId is non-null), so any still-pending invite where
    // they're the recipient is really complete: flip it and re-run the spine
    // sync, which promotes their participant/engagement invited → active.
    const { data: promoted } = await admin
      .from("decoded_invites")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("recipient_id", userId)
      .eq("status", "pending")
      .eq("program", "relationship") // this report only completes THIS program's invites
      .neq("recipient_email", "broadcast")
      .select("id");

    for (const inv of promoted ?? []) {
      const { error } = await admin.rpc("relatti_sync_invite", { p_invite_id: inv.id });
      if (error) console.error("[sync-my-report] relatti_sync_invite failed:", error.message);
    }
  } catch (err) {
    console.error("[sync-my-report] sync error:", err);
  }
}
