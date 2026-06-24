import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveBrand, isBrandId } from "@/lib/platform/brand";

/**
 * Unified auth middleware for Mastery.
 * 
 * Route structure:
 *   /decoded          — Landing page (public, auth form)
 *   /auth/callback    — Unified OAuth + email confirmation callback
 *   /assess           — Distraction-free assessment (auth required)
 *   /dashboard/*      — Unified dashboard (auth required)
 *   /decoded/report/* — Report pages (auth required)
 * 
 * Legacy routes (/coachapp/*) redirect to new unified routes.
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

  // PA2 + preview override: resolve the brand for this request.
  // Precedence: ?brand= override (preview on any host) > brand cookie > host.
  // The override persists via a cookie so previewing relatti on localhost/
  // staging survives navigation. Production uses the host (no param/cookie).
  const paramBrand = request.nextUrl.searchParams.get("brand");
  const cookieBrand = request.cookies.get("brand")?.value;
  let brandId = resolveBrand(request.headers.get("host")).id;
  if (isBrandId(cookieBrand)) brandId = cookieBrand;
  if (isBrandId(paramBrand)) {
    brandId = paramBrand;
    supabaseResponse.cookies.set("brand", paramBrand, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
  }
  supabaseResponse.headers.set("x-brand", brandId);

  const pathname = request.nextUrl.pathname;

  // relatti.com root → the Relatti landing (host-based, so the cookie/override
  // can't hijack the MasteryTV apex). Rewrite (not redirect): the URL stays
  // relatti.com/ while serving the static /relatti landing.
  if (pathname === "/" && resolveBrand(request.headers.get("host")).id === "relatti") {
    const url = request.nextUrl.clone();
    url.pathname = "/relatti";
    return NextResponse.rewrite(url);
  }

  // ── Allow callback routes always ──
  if (
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/decoded/auth/callback") ||
    pathname.startsWith("/coachapp/auth/callback")
  ) {
    return supabaseResponse;
  }

  // ── Legacy /coachapp/* redirects ──
  if (pathname.startsWith("/coachapp/dashboard")) {
    const url = request.nextUrl.clone();
    // Map /coachapp/dashboard/chat → /dashboard/chat, etc.
    url.pathname = pathname.replace("/coachapp/dashboard", "/dashboard");
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/coachapp/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/decoded";
    return NextResponse.redirect(url);
  }
  // /coachapp/onboarding relocated to /onboarding (PA1). Keeps search (?redo=1).
  if (pathname.startsWith("/coachapp/onboarding")) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }
  // /coachapp/admin/* consolidated into /admin (PA1: crisis + frameworks migrated).
  if (pathname.startsWith("/coachapp/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace("/coachapp/admin", "/admin");
    return NextResponse.redirect(url);
  }
  if (pathname === "/coachapp" || pathname === "/coachapp/") {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/dashboard" : "/decoded";
    return NextResponse.redirect(url);
  }

  // ── Catch auth codes landing on wrong routes ──
  const code = request.nextUrl.searchParams.get("code");
  if (code && !pathname.startsWith("/auth/callback")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    url.search = `?code=${code}`;
    return NextResponse.redirect(url);
  }

  // ── Protected routes: require auth ──
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/assess") ||
    pathname.startsWith("/decoded/assess") ||
    pathname.startsWith("/decoded/report");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    // Preserve where they were headed (e.g. /assess) so auth returns them there
    // instead of dumping everyone on /dashboard. Generic for every brand/route.
    const intended = pathname + (request.nextUrl.search || "");
    url.pathname = "/decoded";
    url.search = `?next=${encodeURIComponent(intended)}`;
    return NextResponse.redirect(url);
  }

  // ── Authenticated user on auth pages → redirect to dashboard ──
  if (user && pathname === "/decoded/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
