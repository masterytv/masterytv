import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Dismiss the "your partner left" notice for one engagement.
 *
 * The survivor is the only remaining participant on a tombstoned engagement
 * (delete-user-data set metadata.partner_departed). We verify they're a
 * participant with their own authed client (RLS), then set
 * metadata.partner_departed_dismissed under the service role (participants can't
 * update the engagement row directly). Idempotent + no PII involved.
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
    const engagementId = (body.engagementId ?? "").toString();
    if (!engagementId) {
      return NextResponse.json({ error: "engagementId required" }, { status: 400 });
    }

    // Caller must be a participant of this engagement (RLS-scoped read).
    const { data: part } = await supabase
      .from("participant")
      .select("id")
      .eq("engagement_id", engagementId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!part) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }
    const admin = createServiceClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: eng } = await admin
      .from("engagement")
      .select("metadata")
      .eq("id", engagementId)
      .single();
    const meta = (eng?.metadata ?? {}) as Record<string, unknown>;
    if (meta.partner_departed !== true) {
      return NextResponse.json({ success: true }); // nothing to dismiss
    }

    const { error } = await admin
      .from("engagement")
      .update({ metadata: { ...meta, partner_departed_dismissed: true } })
      .eq("id", engagementId);
    if (error) {
      console.error("[dismiss-departed] update failed:", error.message);
      return NextResponse.json({ error: "Could not dismiss" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[dismiss-departed] error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
