import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { normalizeInviteEmail, isValidInviteEmail } from "@/lib/decoded/invite-claim";
import { syncEngagementForInvite } from "@/lib/decoded/sync-engagement";
import { resolveBrand, isBrandId, type BrandId } from "@/lib/platform/brand";
import { originFromHeaders } from "@/lib/platform/origin";
import { sendBrandInviteEmail } from "@/lib/decoded/invite-email";

/**
 * Manage a PENDING invite (before the partner has joined):
 *   • remind      — re-send the invite email, capped at MAX_REMINDERS.
 *   • uninvite    — cancel it (removes the invite + the forming engagement).
 *   • changeEmail — point the invite at a different address + re-send.
 *
 * Only the inviter can manage their own invite, and only while it's unclaimed
 * (recipient_id null). Verified with the caller's session, mutated under the
 * service role.
 */
const MAX_REMINDERS = 3;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const inviteId = (body.inviteId ?? "").toString();
    const action = (body.action ?? "").toString();
    if (!inviteId) return NextResponse.json({ error: "Missing inviteId" }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    const admin = createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: inv } = await admin
      .from("decoded_invites")
      .select("id, inviter_id, recipient_id, recipient_email, reminder_count")
      .eq("id", inviteId)
      .maybeSingle();
    if (!inv) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    if (inv.inviter_id !== user.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    if (inv.recipient_id) {
      return NextResponse.json({ error: "Your partner has already joined." }, { status: 400 });
    }

    const senderName = user.user_metadata?.display_name
      || user.user_metadata?.full_name
      || user.email?.split("@")[0]
      || "Someone";
    const cookieBrand = req.cookies.get("brand")?.value;
    const brandId: BrandId = isBrandId(cookieBrand) ? cookieBrand : resolveBrand(req.headers.get("host")).id;
    const appUrl = originFromHeaders(req.headers);
    const inviteUrl = `${appUrl}/invite/${inv.id}`;

    if (action === "remind") {
      const count = inv.reminder_count ?? 0;
      if (count >= MAX_REMINDERS) {
        return NextResponse.json({ error: `You've reached the ${MAX_REMINDERS}-reminder limit.` }, { status: 400 });
      }
      const sent = await sendBrandInviteEmail(brandId, senderName, inv.recipient_email, inviteUrl);
      if (!sent.ok) return NextResponse.json({ error: sent.error ?? "Could not send the reminder." }, { status: 500 });
      await admin
        .from("decoded_invites")
        .update({ reminder_count: count + 1, last_reminded_at: new Date().toISOString() })
        .eq("id", inviteId);
      return NextResponse.json({ success: true, reminderCount: count + 1, remaining: MAX_REMINDERS - (count + 1) });
    }

    if (action === "uninvite") {
      // Remove the forming engagement (inviter-only, no partner yet) + its
      // participants first so no orphan is left, then the invite.
      const { data: eng } = await admin.from("engagement").select("id").eq("source_invite_id", inviteId).maybeSingle();
      if (eng) {
        await admin.from("participant").delete().eq("engagement_id", eng.id);
        await admin.from("engagement").delete().eq("id", eng.id);
      }
      await admin.from("decoded_invites").delete().eq("id", inviteId);
      return NextResponse.json({ success: true });
    }

    if (action === "changeEmail") {
      const newEmail = normalizeInviteEmail(body.email);
      if (!isValidInviteEmail(newEmail)) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      }
      const { error } = await admin
        .from("decoded_invites")
        .update({ recipient_email: newEmail, status: "pending", reminder_count: 0, last_reminded_at: null })
        .eq("id", inviteId);
      if (error) {
        // Unique (inviter_id, recipient_email) — this address is already invited.
        return NextResponse.json({ error: "You've already invited that email." }, { status: 400 });
      }
      await syncEngagementForInvite(inviteId);
      const sent = await sendBrandInviteEmail(brandId, senderName, newEmail, inviteUrl);
      return NextResponse.json({ success: true, emailSent: sent.ok });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[manage-invite] error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
