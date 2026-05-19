import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Creates a Supabase client for use in Next.js middleware.
 * Refreshes the auth session on every request and forwards updated cookies.
 * 
 * Coach app lives under /coachapp — all protected routes are nested there.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — this is the critical call
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define route groups — /coachapp
  const isAuthRoute = request.nextUrl.pathname.startsWith("/coachapp/login") ||
    request.nextUrl.pathname.startsWith("/coachapp/signup");
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/coachapp/dashboard");
  const isAdminRoute = request.nextUrl.pathname.startsWith("/coachapp/admin");
  const isOnboardingRoute = request.nextUrl.pathname.startsWith("/coachapp/onboarding");
  const isCallbackRoute = request.nextUrl.pathname.startsWith("/coachapp/auth/callback");
  const isVerifyRoute = request.nextUrl.pathname.startsWith("/coachapp/auth/verify");

  // Define route groups — /decoded
  const isDecodedAssessment = request.nextUrl.pathname.startsWith("/decoded/assess");
  const isDecodedLogin = request.nextUrl.pathname === "/decoded/login";
  const isDecodedCallback = request.nextUrl.pathname.startsWith("/decoded/auth/callback");
  const isDecodedLanding = request.nextUrl.pathname === "/decoded";

  // Allow callback and verify routes always
  if (isCallbackRoute || isVerifyRoute || isDecodedCallback) {
    return supabaseResponse;
  }

  // Catch auth codes landing on wrong routes (e.g. /?code=...)
  const code = request.nextUrl.searchParams.get("code");
  if (code && !isCallbackRoute && !isDecodedCallback) {
    const url = request.nextUrl.clone();
    // Route decoded codes to decoded callback, others to coachapp
    if (request.nextUrl.pathname.startsWith("/decoded")) {
      url.pathname = "/decoded/auth/callback";
    } else {
      url.pathname = "/coachapp/auth/callback";
    }
    url.search = `?code=${code}`;
    return NextResponse.redirect(url);
  }

  // ── Decoded route protection ──
  // Unauthenticated users trying to access /decoded/assess → redirect to /decoded (landing with auth)
  if (!user && isDecodedAssessment) {
    const url = request.nextUrl.clone();
    url.pathname = "/decoded";
    return NextResponse.redirect(url);
  }

  // Authenticated users on /decoded/login → redirect to /decoded/assess
  if (user && isDecodedLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/decoded/assess";
    return NextResponse.redirect(url);
  }

  // ── Coachapp route protection ──
  if (!user && (isDashboardRoute || isAdminRoute || isOnboardingRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/coachapp/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/coachapp/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
