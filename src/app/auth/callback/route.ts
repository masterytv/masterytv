import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (data.session?.user?.recovery_sent_at) {
        return NextResponse.redirect(`${origin}/auth/reset-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed — redirect to landing page with error
  return NextResponse.redirect(`${origin}/decoded?error=auth_callback_failed`);
}
