import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { brandPageMetadata } from "@/lib/platform/brand-metadata";
import { claimPendingInvites } from "@/lib/decoded/claim-invites";
import { ensureCoupleFullSharing } from "@/lib/relatti/auto-full-sharing";
import { getBrand } from "@/lib/platform/brand.server";
import { byBrand } from "@/lib/platform/brand";
import CompatibilityHub from "./CompatibilityHub";
import CompatibilityHubDecoded from "./CompatibilityHubDecoded";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return brandPageMetadata(brand.id, {
    title: byBrand({ relatti: "Your Connection — Relatti", masterytv: "Compatibility — Mastery" }, brand.id),
    description: "See your compatibility, invite your partner, and explore your relationship dynamics.",
    noindex: true,
  });
}

/**
 * /dashboard/compatibility — brand-gated.
 *
 * • Relatti (couples): a single relationship flow with NO sharing levels —
 *   connected partners auto-see each other's full report + compatibility.
 * • MasteryTV / Decoded (unchanged): the multi-person compatibility hub with the
 *   type_compatibility/full sharing-level negotiation. Do NOT apply the couples
 *   behavior here.
 */
export default async function CompatibilityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/decoded");
  }

  if (user.email) {
    await claimPendingInvites(supabase, user.id, user.email);
  }

  const brand = await getBrand();
  const userName = user.user_metadata?.display_name
    || user.user_metadata?.full_name
    || user.email?.split("@")[0]
    || "there";

  // ── Relatti: couples flow (auto-full, no levels) ──
  if (brand.id === "relatti") {
    await ensureCoupleFullSharing(user.id);

    const { data: sentInvites } = await supabase
      .from("decoded_invites")
      .select("id, recipient_email, recipient_id, recipient_report_id, status, created_at, completed_at, consented_at, reminder_count, upgrade_requested_by, revoked_at")
      .eq("inviter_id", user.id)
      .neq("recipient_email", "broadcast")
      .order("created_at", { ascending: false });

    const { data: receivedInvites } = await supabase
      .from("decoded_invites")
      .select("id, inviter_id, inviter_name, inviter_email, status, created_at, consented_at, recipient_report_id, upgrade_requested_by, revoked_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false });

    return (
      <CompatibilityHub
        userName={userName}
        userId={user.id}
        sentInvites={sentInvites ?? []}
        receivedInvites={receivedInvites ?? []}
      />
    );
  }

  // ── MasteryTV / Decoded: multi-person compatibility + sharing levels (unchanged) ──
  const { data: sentInvites } = await supabase
    .from("decoded_invites")
    .select("id, recipient_email, recipient_id, status, share_with_human, share_with_coach, compatibility_report, created_at, completed_at, consented_at, upgrade_requested_level, upgrade_requested_by")
    .eq("inviter_id", user.id)
    .neq("recipient_email", "broadcast")
    .order("created_at", { ascending: false });

  const { data: receivedInvites } = await supabase
    .from("decoded_invites")
    .select("id, inviter_id, inviter_name, inviter_email, status, share_with_human, share_with_coach, compatibility_report, created_at, consented_at, upgrade_requested_level, upgrade_requested_by")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <CompatibilityHubDecoded
      userName={userName}
      userId={user.id}
      sentInvites={sentInvites ?? []}
      receivedInvites={receivedInvites ?? []}
    />
  );
}
