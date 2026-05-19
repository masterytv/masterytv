import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Decoded auth callback — exchanges code for session, redirects to assessment.
 * Separate from coachapp callback so each product has independent auth flows.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/decoded/assess";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/decoded?error=auth_callback_failed`);
}
