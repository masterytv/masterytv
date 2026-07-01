/**
 * Delete User Data — TD-006 + E15.3 (Relatti-aware, partner-safe).
 *
 * POST /functions/v1/delete-user-data
 * Auth: JWT required (a user can only delete their own data)
 * Body: { confirm: true }
 *
 * Permanently deletes the requesting user's own data across every content table,
 * then deletes public.users and the auth.users record. Irreversible.
 *
 * ── Couples / Relatti behaviour (founder decision, 2026-07-01) ──
 * A Relatti user is one half of a shared dyad. On deletion we:
 *   1. Collect the connected partner(s) up front (so we can notify them).
 *   2. Remove ALL compatibility data (the couples/compatibility reports live on
 *      decoded_invites) — it is no longer relevant once one partner leaves.
 *   3. PRESERVE the partner: their engagement, conversations, assessments, and
 *      account are untouched, so they can keep chatting. We only DETACH the
 *      leaving user (null engagement.created_by / source_invite_id, delete their
 *      participant row) rather than destroy the shared engagement.
 *   4. Email each partner: their partner left, the shared compatibility data has
 *      been removed, but their own conversations are preserved.
 *
 * ── Deletion order ──
 * FK-safe order was verified against live data via a rolled-back DO-block probe
 * (2026-07-01): participant + decoded_invites are removed BEFORE the leaving
 * user's assessment_reports (both reference reports with NO ACTION), and
 * engagement.created_by / source_invite_id + contacts.converted_user_id are
 * nulled BEFORE deleting public.users (all NO ACTION → otherwise block).
 *
 * Architecture: ARCHITECTURE.md §7 (Data Governance); RELATIONSHIP_ARCHITECTURE.md (spine).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient, createSupabaseClientWithAuth } from "../_shared/supabase.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { logError, errorResponse, jsonResponse } from "../_shared/errors.ts";
import { sendEmail } from "../_shared/resend.ts";

const FUNCTION_NAME = "delete-user-data";

// The requesting user's own content, deleted by user_id in FK-safe (leaf → root)
// order. Message-referencing children precede messages; assessment children
// precede assessments; everything precedes public.users. `participant`,
// `decoded_invites`, and `engagement` are handled separately (shared spine).
const USER_DATA_TABLES = [
  // message-referencing children (source_message_id / message_id are NO ACTION)
  "framework_usage",
  "memory_facts",
  "user_entities",
  "commitments",
  "coaching_challenges",
  "coaching_agenda",
  // conversation layer
  "conversation_summaries",
  "messages",
  "crisis_flags",
  "conversations",
  // proactive engine + setup
  "scheduled_messages",
  "nagging_tracker",
  "onboarding_state",
  "telegram_connect_tokens",
  // Relatti engagement-scoped own content
  "ritual_responses",
  "ritual_settings",
  "engagement_activity",
  "feedback",
  "report_events",
  "share_unlocks",
  "viral_events",
  "coach_message_usage",
  // personalization
  "coach_profiles",
  "coach_profile_history",
  // assessment layer (children before assessments; assessments cascades the rest)
  "assessment_responses",
  "assessment_scores",
  "assessment_profiles",
  "assessment_progress",
  "voice_feedback",
  "assessment_report_versions",
  "assessment_reports",
  "assessments",
] as const;

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

interface Partner {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Collect the distinct connected partners for `userId` from decoded_invites —
 * the other side of every invite the user sent or received — with their email.
 * Called BEFORE we sever the connection so we can notify them afterwards.
 */
async function collectPartners(
  supabase: SupabaseClient,
  userId: string,
): Promise<Partner[]> {
  const { data: invites } = await supabase
    .from("decoded_invites")
    .select("inviter_id, recipient_id")
    .or(`inviter_id.eq.${userId},recipient_id.eq.${userId}`);

  const partnerIds = new Set<string>();
  for (const inv of invites ?? []) {
    if (inv.inviter_id && inv.inviter_id !== userId) partnerIds.add(inv.inviter_id);
    if (inv.recipient_id && inv.recipient_id !== userId) partnerIds.add(inv.recipient_id);
  }
  if (partnerIds.size === 0) return [];

  const { data: users } = await supabase
    .from("users")
    .select("id, email, name")
    .in("id", [...partnerIds]);

  return (users ?? []).filter((u: Partner) => !!u.email);
}

/**
 * Notify one partner that the other has left. Best-effort — a send failure must
 * never fail the deletion. Relatti-branded (dyads only exist in Relatti).
 */
async function notifyPartnerOfDeletion(
  partner: Partner,
  deleterName: string,
): Promise<void> {
  const who = deleterName || "Your partner";
  const partnerFirst = (partner.name ?? "").trim().split(/\s+/)[0] || "there";
  const subject = `${who} has left Relatti`;
  const html = `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a2e; line-height: 1.6;">
      <p>Hi ${partnerFirst},</p>
      <p>${who} has deleted their Relatti account and all of their data. Because your
      compatibility insights depended on both of you, the shared compatibility
      report is no longer relevant and has been removed.</p>
      <p><strong>Your own account is safe.</strong> Your conversations with your
      coach, your assessment, and everything you've written are preserved — you
      can keep chatting whenever you like.</p>
      <p><a href="https://relatti.com/dashboard" style="color: #e75c79; font-weight: 600;">Open Relatti</a></p>
      <p style="color: #6b7280; font-size: 13px; margin-top: 28px;">If you'd like, you can invite someone new to reconnect the couples features anytime.</p>
    </div>`;
  const text =
    `Hi ${partnerFirst},\n\n${who} has deleted their Relatti account and all of their data. ` +
    `Because your compatibility insights depended on both of you, the shared compatibility report ` +
    `has been removed.\n\nYour own account is safe — your conversations, assessment, and everything ` +
    `you've written are preserved, and you can keep chatting anytime: https://relatti.com/dashboard\n`;

  await sendEmail({
    to: partner.email,
    subject,
    html,
    text,
    from: "Relatti <coach@mail.masterytv.com>",
  });
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST is allowed", 405, corsHeaders);
  }

  let userId: string | undefined;

  try {
    // ── 1. Authenticate — a user can only delete their own data ──
    const supabaseAuth = createSupabaseClientWithAuth(req);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", "Invalid or missing JWT", 401, corsHeaders);
    }
    userId = user.id;

    // ── 2. Require explicit confirmation ──
    const body = await req.json();
    if (body.confirm !== true) {
      return errorResponse(
        "CONFIRMATION_REQUIRED",
        'You must send { "confirm": true } to delete all data. This action is irreversible.',
        400,
        corsHeaders,
      );
    }

    // ── 3. Service role for deletion (bypasses RLS) ──
    const supabase = createSupabaseClient();

    console.log(`[${FUNCTION_NAME}] Starting cascade delete for user ${userId}`);

    // ── 4. Capture the deleter's name + connected partners BEFORE severing links ──
    const { data: me } = await supabase
      .from("users")
      .select("name")
      .eq("id", userId)
      .single();
    const deleterName = (me?.name ?? "").trim();
    const partners = await collectPartners(supabase, userId);

    const results: Record<string, number> = {};

    // ── 5. Detach the shared spine (preserve the partner; unblock report/user deletes) ──
    // Null the leaving user's references on any shared engagement so it survives
    // for the partner and the users delete isn't FK-blocked.
    await supabase.from("engagement").update({ created_by: null }).eq("created_by", userId);

    const { data: myInvites } = await supabase
      .from("decoded_invites")
      .select("id")
      .or(`inviter_id.eq.${userId},recipient_id.eq.${userId}`);
    const inviteIds = (myInvites ?? []).map((r: { id: string }) => r.id);
    if (inviteIds.length > 0) {
      await supabase.from("engagement").update({ source_invite_id: null }).in("source_invite_id", inviteIds);
    }

    const { count: participantCount } = await supabase
      .from("participant")
      .delete({ count: "exact" })
      .eq("user_id", userId);
    results["participant"] = participantCount ?? 0;

    // ── 6. Remove the connection + ALL compatibility data (both sides) ──
    const { count: invitesCount } = await supabase
      .from("decoded_invites")
      .delete({ count: "exact" })
      .or(`inviter_id.eq.${userId},recipient_id.eq.${userId}`);
    results["decoded_invites"] = invitesCount ?? 0;

    // ── 7. Delete the user's own content (leaf → root) ──
    for (const table of USER_DATA_TABLES) {
      const { count, error: deleteError } = await supabase
        .from(table)
        .delete({ count: "exact" })
        .eq("user_id", userId);

      if (deleteError) {
        console.error(`[${FUNCTION_NAME}] Error deleting from ${table}:`, deleteError.message);
        // Continue — best-effort deletion.
      }
      results[table] = count ?? 0;
    }

    // ── 8. Anonymize system tables (keep for analytics, strip PII) + unblock users delete ──
    await supabase.from("cost_tracking").update({ user_id: null }).eq("user_id", userId);
    await supabase.from("error_log").update({ user_id: null }).eq("user_id", userId);
    await supabase.from("contacts").update({ converted_user_id: null }).eq("converted_user_id", userId);

    // ── 9. Delete public.users ──
    const { error: userDeleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);
    if (userDeleteError) {
      console.error(`[${FUNCTION_NAME}] Error deleting user record:`, userDeleteError.message);
    }
    results["users"] = userDeleteError ? 0 : 1;

    // ── 10. Delete auth.users via Admin API ──
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.error(`[${FUNCTION_NAME}] Error deleting auth record:`, authDeleteError.message);
    }
    results["auth.users"] = authDeleteError ? 0 : 1;

    // ── 11. Notify partners (best-effort — after the data is gone) ──
    let partnersNotified = 0;
    for (const partner of partners) {
      try {
        await notifyPartnerOfDeletion(partner, deleterName);
        partnersNotified++;
      } catch (e) {
        console.error(`[${FUNCTION_NAME}] Partner notify failed for ${partner.id}:`, (e as Error).message);
      }
    }
    results["partners_notified"] = partnersNotified;

    const totalDeleted = Object.values(results).reduce((sum, n) => sum + n, 0);
    console.log(`[${FUNCTION_NAME}] Cascade delete complete. ${totalDeleted} records affected.`, results);

    return jsonResponse(
      {
        success: true,
        message: "All your data has been permanently deleted.",
        records_deleted: results,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    const err = error as Error;
    console.error(`[${FUNCTION_NAME}] Fatal error:`, err.message);
    await logError(FUNCTION_NAME, err, userId);
    return errorResponse("INTERNAL_ERROR", "Failed to delete data. Please contact support.", 500, corsHeaders);
  }
});
