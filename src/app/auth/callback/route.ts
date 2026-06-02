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
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if this is a password recovery flow
      // Supabase includes type=recovery in the session metadata
      if (data.session?.user?.recovery_sent_at) {
        return NextResponse.redirect(`${origin}/auth/reset-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed — redirect to landing page with error
  return NextResponse.redirect(`${origin}/decoded?error=auth_callback_failed`);
}
