import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Public code-status check for the /beta offer page, so a visitor learns a
 * dead or fully-claimed link BEFORE investing in signup — not after the
 * assessment. Read-only, reveals only the status of a code the caller already
 * possesses (codes are distributed publicly by design; no enumeration value
 * beyond live/not — no label, caps, or counts are exposed).
 */
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code")?.trim() ?? "";
  if (!code) return NextResponse.json({ status: "invalid" });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ status: "error" }, { status: 500 });
  const admin = createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin
    .from("beta_invite_codes")
    .select("active, expires_at, uses, max_uses")
    .ilike("code", code)
    .maybeSingle();
  if (error) {
    console.error("[beta-code-status] lookup failed:", error.message);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
  if (!data || !data.active) return NextResponse.json({ status: "invalid" });
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ status: "expired" });
  }
  if (data.uses >= data.max_uses) return NextResponse.json({ status: "full" });
  return NextResponse.json({ status: "live" });
}
