import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

/**
 * PC5.2 — per-user brand attribution for the admin User Management table.
 *
 * The durable signal is `users.signup_brand` (stamped at creation since
 * 2026-07-14). Accounts that pre-date the stamp get a best-effort DERIVED
 * brand: a `participant` row, a `decoded_invites` side (inviter/recipient),
 * or `beta_access` (the beta program is Relatti-only) marks relationship
 * activity → relatti; everything else is the executive default → masterytv.
 * Derivation spans cross-user tables RLS hides from the browser, hence the
 * service-role read behind the superadmin gate.
 */

export interface UserBrandEntry {
  brand: string;
  derived: boolean;
}

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = await createServerClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: caller } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUser.id)
    .single();

  if (caller?.role !== "superadmin") {
    return NextResponse.json(
      { error: "Forbidden — superadmin only" },
      { status: 403 }
    );
  }

  const service = createServiceClient();

  const [usersRes, participantsRes, invitesRes] = await Promise.all([
    service.from("users").select("id, signup_brand, beta_access"),
    service.from("participant").select("user_id"),
    service.from("decoded_invites").select("inviter_id, recipient_id"),
  ]);

  if (usersRes.error) {
    return NextResponse.json({ error: usersRes.error.message }, { status: 500 });
  }

  const relationshipUsers = new Set<string>();
  for (const p of participantsRes.data ?? []) {
    if (p.user_id) relationshipUsers.add(p.user_id);
  }
  for (const i of invitesRes.data ?? []) {
    if (i.inviter_id) relationshipUsers.add(i.inviter_id);
    if (i.recipient_id) relationshipUsers.add(i.recipient_id);
  }

  const brands: Record<string, UserBrandEntry> = {};
  for (const u of usersRes.data ?? []) {
    if (u.signup_brand) {
      brands[u.id] = { brand: u.signup_brand, derived: false };
    } else {
      brands[u.id] = {
        brand:
          relationshipUsers.has(u.id) || u.beta_access
            ? "relatti"
            : "masterytv",
        derived: true,
      };
    }
  }

  return NextResponse.json({ brands });
}
