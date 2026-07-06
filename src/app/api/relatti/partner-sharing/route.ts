import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncEngagementForInvite } from "@/lib/decoded/sync-engagement";
import { reduceConsent } from "@/lib/relatti/consent-machine";

/**
 * The negotiated PARTNER-visibility axis (decoded_invites.share_with_human).
 *
 * The transition rules (request/accept/decline/lower + the Private guard) live in
 * the pure, unit-tested `reduceConsent` reducer. This route owns only I/O: auth,
 * loading the invite, verifying the caller is a party to it, applying the reducer's
 * patch with the caller's authed client (RLS lets a party update their own invite),
 * and re-syncing the spine via syncEngagementForInvite when the reducer asks.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const inviteId = (body.inviteId ?? "").toString();
    const action = (body.action ?? "").toString();
    const level = body.level ? body.level.toString() : null;
    if (!inviteId) {
      return NextResponse.json({ error: "Missing inviteId" }, { status: 400 });
    }

    const { data: invite } = await supabase
      .from("decoded_invites")
      .select("id, inviter_id, recipient_id, share_with_human, upgrade_requested_level, upgrade_requested_by")
      .eq("id", inviteId)
      .maybeSingle();
    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }
    if (invite.inviter_id !== user.id && invite.recipient_id !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const result = reduceConsent({
      action,
      level,
      current: invite.share_with_human as string | null,
      requestedLevel: invite.upgrade_requested_level as string | null,
      requestedBy: invite.upgrade_requested_by as string | null,
      userId: user.id,
      now: new Date().toISOString(),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    }

    const { error } = await supabase
      .from("decoded_invites")
      .update(result.patch)
      .eq("id", inviteId);
    if (error) {
      return NextResponse.json({ error: result.failureMessage }, { status: 500 });
    }

    if (result.syncAfter) {
      await syncEngagementForInvite(inviteId);
    }
    return NextResponse.json(result.response);
  } catch (err) {
    console.error("[partner-sharing] error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
