import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Admin management of beta invite codes (create + activate/deactivate).
 * Gated to admin/superadmin, then writes under the service role (the
 * beta_invite_codes table has no client RLS policies — service role only).
 */
const ADMIN_ROLES = ["admin", "superadmin"];
// No ambiguous chars (0/O, 1/I/L) so codes are easy to read + type/share.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function genCode(len = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: caller } = await supabase.from("users").select("role").eq("id", authUser.id).single();
  if (!caller || !ADMIN_ROLES.includes(caller.role)) {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  const admin = createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const body = await req.json().catch(() => ({}));
  const action = (body.action ?? "create").toString();

  // Activate / deactivate an existing code.
  if (action === "toggle") {
    const id = (body.id ?? "").toString();
    if (!id) return NextResponse.json({ error: "Missing code id" }, { status: 400 });
    const { error } = await admin.from("beta_invite_codes").update({ active: !!body.active }).eq("id", id);
    if (error) return NextResponse.json({ error: "Could not update code" }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Create a code. Auto-generates one unless a custom code is supplied.
  const label = ((body.label ?? "").toString().trim().slice(0, 120)) || null;
  let maxUses = parseInt(body.maxUses, 10);
  if (!Number.isFinite(maxUses) || maxUses < 1) maxUses = 1;
  maxUses = Math.min(maxUses, 100000);
  const expiresInDays = parseInt(body.expiresInDays, 10);
  const expires_at =
    Number.isFinite(expiresInDays) && expiresInDays > 0
      ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
      : null;
  const custom = (body.code ?? "").toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = custom || genCode();
    const { data, error } = await admin
      .from("beta_invite_codes")
      .insert({ code, label, max_uses: maxUses, expires_at, created_by: authUser.id })
      .select("id, code, label, max_uses, uses, active, expires_at, created_at")
      .single();
    if (!error) return NextResponse.json({ success: true, code: data });
    // 23505 = unique violation. A custom clash is the user's problem; a generated
    // clash just means "roll again".
    if (error.code === "23505") {
      if (custom) return NextResponse.json({ error: "That code already exists." }, { status: 409 });
      continue;
    }
    console.error("[beta-codes] insert failed:", error.message);
    return NextResponse.json({ error: "Could not create code" }, { status: 500 });
  }
  return NextResponse.json({ error: "Could not generate a unique code — try again." }, { status: 500 });
}
