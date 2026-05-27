import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Unified auth callback — handles Google OAuth, email confirmation,
 * and magic link redirects for all products (Decoded + Coach).
 * 
 * Routes user to the correct destination based on `next` param:
 * - Default: /dashboard (unified home)
 * - Assessment: /assess (if coming from decoded flow)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed — redirect to landing page with error
  return NextResponse.redirect(`${origin}/decoded?error=auth_callback_failed`);
}
