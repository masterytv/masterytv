import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { claimPendingInvites } from "@/lib/decoded/claim-invites";
import { ensureCoupleFullSharing } from "@/lib/relatti/auto-full-sharing";
import CompatibilityHub from "./CompatibilityHub";

export const metadata: Metadata = {
  title: "Compatibility — Mastery",
  description: "See your compatibility, invite your partner, and explore your relationship dynamics.",
  robots: { index: false, follow: false },
};

/**
 * /dashboard/compatibility — the relationship hub.
 * States: no partner → Invite Someone · invited → status + remind/uninvite/change
 * · connected → View Compatibility Report. Couples auto-share fully (no levels).
 */
export default async function CompatibilityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/decoded");
  }

  // Claim any pending email-matched invite, then auto-full any connected dyad.
  if (user.email) {
    await claimPendingInvites(supabase, user.id, user.email);
  }
  await ensureCoupleFullSharing(user.id);

  // Invites I SENT (exclude the broadcast share-link row).
  const { data: sentInvites } = await supabase
    .from("decoded_invites")
    .select("id, recipient_email, recipient_id, recipient_report_id, status, created_at, completed_at, consented_at, reminder_count")
    .eq("inviter_id", user.id)
    .neq("recipient_email", "broadcast")
    .order("created_at", { ascending: false });

  // Invites sent TO me (I'm the invited partner).
  const { data: receivedInvites } = await supabase
    .from("decoded_invites")
    .select("id, inviter_id, inviter_name, inviter_email, status, created_at, consented_at")
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
