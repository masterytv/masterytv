import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { claimPendingInvites } from "@/lib/decoded/claim-invites";
import CompatibilityHub from "./CompatibilityHub";

export const metadata: Metadata = {
  title: "Compatibility — Mastery",
  description: "Compare personalities, manage sharing, and explore relationship dynamics.",
  robots: { index: false, follow: false },
};

/**
 * /dashboard/compatibility — The relationship hub.
 * 
 * - Request access (invite new people or request sharing from existing users)
 * - See invite statuses (pending, completed, connected, denied)
 * - View compatibility reports
 * - Manage received sharing requests
 */
export default async function CompatibilityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/decoded");
  }

  // Auto-claim any pending invites for this user's email
  if (user.email) {
    await claimPendingInvites(supabase, user.id, user.email);
  }

  // Load invites sent BY this user (exclude broadcast invite used for share links)
  const { data: sentInvites } = await supabase
    .from("decoded_invites")
    .select("id, recipient_email, recipient_id, status, share_with_human, share_with_coach, compatibility_report, created_at, completed_at, consented_at, upgrade_requested_level, upgrade_requested_by")
    .eq("inviter_id", user.id)
    .neq("recipient_email", "broadcast")
    .order("created_at", { ascending: false });

  // Load invites sent TO this user (requests to share)
  const { data: receivedInvites } = await supabase
    .from("decoded_invites")
    .select("id, inviter_id, inviter_name, inviter_email, status, share_with_human, share_with_coach, compatibility_report, created_at, consented_at, upgrade_requested_level, upgrade_requested_by")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false });

  const userName = user.user_metadata?.display_name
    || user.user_metadata?.full_name
    || user.email?.split("@")[0]
    || "there";

  return (
    <CompatibilityHub
      userName={userName}
      userId={user.id}
      sentInvites={sentInvites ?? []}
      receivedInvites={receivedInvites ?? []}
    />
  );
}
