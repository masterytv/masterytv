import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Set MY coach-visibility for a dyad — the per-person, unilateral axis
 * (participant.coach_share_level). It only changes how much of the caller's OWN
 * profile their OWN coach uses, so it applies immediately and never involves the
 * partner. Verified with the caller's authed client (they must be a participant),
 * then written under the service role (participants don't own an UPDATE policy).
 */
const LEVELS = ["none", "type_compatibility", "full"];

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
    const level = (body.level ?? "").toString();
    if (!engagementId || !LEVELS.includes(level)) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

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

    const { error } = await admin
      .from("participant")
      .update({ coach_share_level: level })
      .eq("engagement_id", engagementId)
      .eq("user_id", user.id);
    if (error) {
      console.error("[coach-visibility] update failed:", error.message);
      return NextResponse.json({ error: "Could not update" }, { status: 500 });
    }

    return NextResponse.json({ success: true, level });
  } catch (err) {
    console.error("[coach-visibility] error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
