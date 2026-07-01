import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

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
      return res;
    }
  }

  // Auth failed — redirect to landing page with error
  return NextResponse.redirect(`${origin}/decoded?error=auth_callback_failed`);
}
