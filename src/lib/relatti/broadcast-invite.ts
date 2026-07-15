import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Get (or lazily create) the caller's stable "broadcast" partner-invite URL —
 * the persistent `/invite/[id]` link used for copy-to-clipboard sharing when no
 * specific recipient email is known yet. One row per user
 * (`recipient_email = 'broadcast'`, upserted on `inviter_id,recipient_email`),
 * so the link is durable across visits.
 *
 * Shared by the dashboard and the relationship profile so both hand the partner
 * the SAME real Relatti invite (not a `/decoded` link). The email-based invite
 * path (`/api/decoded/invite`) creates its own recipient-scoped row; this is
 * only the copy-link fallback.
 *
 * Falls back to `${appUrl}/login` if the upsert fails, so a caller can always
 * render a working link.
 */
export async function getOrCreateBroadcastInviteUrl(
  supabase: SupabaseClient,
  user: User,
  appUrl: string,
  reportId: string | null,
): Promise<string> {
  const senderName =
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Someone";

  const { data: broadcastInvite } = await supabase
    .from("decoded_invites")
    .upsert(
      {
        inviter_id: user.id,
        recipient_email: "broadcast",
        inviter_name: senderName,
        inviter_email: user.email ?? "",
        inviter_report_id: reportId,
        status: "pending",
      },
      { onConflict: "inviter_id,recipient_email" },
    )
    .select("id")
    .single();

  return broadcastInvite ? `${appUrl}/invite/${broadcastInvite.id}` : `${appUrl}/login`;
}
