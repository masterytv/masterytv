import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveBrandId } from "@/lib/platform/brand";

/**
 * E15.5 — record legal acceptance for OAuth (Google) sign-ups. The email path
 * records the accepted version directly in signUp metadata; OAuth can't, so the
 * client sets a short-lived `legal_ack` cookie at sign-up and we fold it into
 * the user's metadata here (only when the recorded version differs, to preserve
 * the original acceptance). Never blocks the auth redirect.
 */
async function recordLegalAck(
  supabase: SupabaseClient,
  res: NextResponse,
): Promise<void> {
  try {
    const ack = (await cookies()).get("legal_ack")?.value;
    if (!ack) return;
    res.cookies.delete("legal_ack");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && user.user_metadata?.legal_version !== ack) {
      await supabase.auth.updateUser({
        data: { legal_accepted_at: new Date().toISOString(), legal_version: ack },
      });
    }
  } catch {
    // Consent recording is best-effort — never fail the sign-in over it.
  }
}

/**
 * PC5.2 — stamp users.signup_brand for signups that can't carry it in signUp
 * metadata (OAuth, magic link). The callback always lands on the brand's own
 * origin, so the request host IS the brand signal. Guarded to freshly-created
 * rows so an existing user logging in via another brand's domain is never
 * relabeled — signup_brand records where the account was BORN, not last seen.
 * Password signups are already stamped by handle_new_user (metadata path) and
 * skip on the `signup_brand IS NULL` guard. Best-effort, never blocks auth.
 */
async function stampSignupBrand(
  supabase: SupabaseClient,
  requestUrl: string,
): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const brandId = resolveBrandId({ host: new URL(requestUrl).host });
    const admin = createServiceClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await admin
      .from("users")
      .update({ signup_brand: brandId })
      .eq("id", user.id)
      .is("signup_brand", null)
      .gte(
        "created_at",
        new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      );
  } catch {
    // Attribution is best-effort — never fail the sign-in over it.
  }
}

/**
 * I5.1 — finish an anonymous account's promotion to a real one.
 *
 * The pre-account box mints an anonymous user so somebody can be answered
 * before they are asked for anything (EXPERIENCE §5.2), and the signup trigger
 * gives that row a reserved `@anonymous.invalid` address and an EMPTY name so
 * nothing in the app has to cope with a null and the coach is never told the
 * person is called Guest. When they later choose to keep the conversation,
 * Supabase links a real email to the SAME `auth.users` row — but nothing
 * updates `public.users`, so without this the account would keep an
 * unroutable address forever and never enter the CRM.
 *
 * Runs here rather than in the claim route because the link only completes
 * when they click the confirmation link, and this is where that lands.
 *
 * Best-effort and idempotent: the `.invalid` suffix is the guard, so a second
 * pass over an already-promoted account matches nothing.
 */
async function promoteClaimedAnonymousUser(supabase: SupabaseClient): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // A still-anonymous user has nothing to promote; a user without a real
    // address cannot be promoted to one.
    if (!user?.email || user.email.endsWith("@anonymous.invalid")) return;

    const admin = createServiceClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: row } = await admin
      .from("users")
      .select("email")
      .eq("id", user.id)
      .single();
    if (!row?.email?.endsWith("@anonymous.invalid")) return;

    const name =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      user.email.split("@")[0];

    // The CRM row is created HERE, at the moment they chose to be reachable,
    // rather than at signup. That ordering is the point: somebody who typed one
    // thing into a box and gave no email is not a lead.
    const { data: contact } = await admin
      .from("contacts")
      .upsert(
        { email: user.email, name, source: "coachapp", status: "free_member" },
        { onConflict: "email" },
      )
      .select("id")
      .single();

    await admin
      .from("users")
      .update({ email: user.email, name, contact_id: contact?.id ?? null })
      .eq("id", user.id);

    if (contact?.id) {
      await admin.from("contacts").update({ converted_user_id: user.id }).eq("id", contact.id);
    }
  } catch {
    // Never fail a sign-in over CRM bookkeeping.
  }
}

/**
 * Unified auth callback — handles Google OAuth, email confirmation,
 * password recovery, and magic link redirects for all products.
 * 
 * Routes user to the correct destination based on `next` param:
 * - Default: /dashboard (unified home)
 * - Recovery: /auth/reset-password (password reset flow)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "recovery" | "signup" | "email" | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  // Path 1: token_hash flow (email templates using {{ .TokenHash }})
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/auth/reset-password`);
      }
      await stampSignupBrand(supabase, request.url);
      await promoteClaimedAnonymousUser(supabase);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Path 2: code exchange flow (OAuth, magic links, PKCE)
  // OAuth logins should NEVER redirect to reset-password — recovery
  // is handled exclusively via tokenHash (Path 1) above.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const res = NextResponse.redirect(`${origin}${next}`);
      await recordLegalAck(supabase, res);
      await stampSignupBrand(supabase, request.url);
      await promoteClaimedAnonymousUser(supabase);
      return res;
    }
  }

  // Auth failed — redirect to landing page with error
  return NextResponse.redirect(`${origin}/decoded?error=auth_callback_failed`);
}
