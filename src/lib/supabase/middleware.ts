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

  // Define route groups — all under /coachapp
  const isAuthRoute = request.nextUrl.pathname.startsWith("/coachapp/login") ||
    request.nextUrl.pathname.startsWith("/coachapp/signup");
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/coachapp/dashboard");
  const isAdminRoute = request.nextUrl.pathname.startsWith("/coachapp/admin");
  const isOnboardingRoute = request.nextUrl.pathname.startsWith("/coachapp/onboarding");
  const isCallbackRoute = request.nextUrl.pathname.startsWith("/coachapp/auth/callback");

  // Allow callback route always
  if (isCallbackRoute) {
    return supabaseResponse;
  }

  // Redirect unauthenticated users from protected routes to /coachapp/login
  if (!user && (isDashboardRoute || isAdminRoute || isOnboardingRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/coachapp/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users from auth routes to /coachapp/dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/coachapp/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
