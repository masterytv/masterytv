import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveBrandId, isBrandId, isPreviewHost, type BrandId } from "@/lib/platform/brand";
import { modulesForBrand, moduleForPath } from "@/lib/platform/modules";

/**
 * Unified auth middleware for Mastery.
 * 
 * Route structure:
 *   /decoded          — Landing page (public, auth form)
 *   /auth/callback    — Unified OAuth + email confirmation callback
 *   /assess           — Distraction-free assessment (auth required)
 *   /dashboard/*      — Unified dashboard (auth required)
 *   /report/* — Report pages (auth required)
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

  // Every redirect below MUST carry the cookies accumulated on
  // supabaseResponse (the just-refreshed auth session + the persisted brand
  // cookie). A bare NextResponse.redirect() silently drops them — the browser
  // keeps its EXPIRED token, so auth state flip-flops between requests
  // ("logged in, maybe"). Same bug class as the / → /relatti rewrite fix.
  const redirectWithCookies = (url: URL) => {
    const res = NextResponse.redirect(url);
    for (const c of supabaseResponse.cookies.getAll()) res.cookies.set(c);
    return res;
  };

  // PA2 + preview override: resolve the brand for this request.
  // Precedence: ?brand= override > host > brand cookie (LOCALHOST ONLY) > default.
  // The cookie preview was retired on deployed hosts 2026-07-14: a stale 30-day
  // cookie re-skinned staging.masterytv.com as Relatti and flipped the coach
  // `program` hint. ?brand= still works everywhere for a single request chain,
  // but only localhost persists it.
  const paramBrand = request.nextUrl.searchParams.get("brand");
  const cookieBrand = request.cookies.get("brand")?.value;
  const host = request.headers.get("host");
  const brandId = resolveBrandId({
    host,
    param: paramBrand,
    cookie: cookieBrand,
  });
  if (isPreviewHost(host)) {
    // Local dev: persist a ?brand= override so it survives navigation.
    if (isBrandId(paramBrand)) {
      supabaseResponse.cookies.set("brand", paramBrand, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
      });
    }
  } else if (cookieBrand) {
    // Deployed host: the cookie is dead weight at best, a mis-brander at worst
    // (resolveBrandId ignores it, but the inline head script and any stale
    // client copy might not) — clear it so old browsers heal themselves.
    supabaseResponse.cookies.set("brand", "", { path: "/", maxAge: 0 });
  }
  supabaseResponse.headers.set("x-brand", brandId);

  const pathname = request.nextUrl.pathname;

  // ── Beta invite codes ride ANY marketing link (?code=BETA826 on /, /relatti,
  // /couples, /challenge, …). Persist the code to a cookie so /beta prefills it
  // even when the visitor wanders the site first and reaches /beta via a CTA
  // with no query string. OAuth codes are UUIDs; invite codes never are — the
  // shape test keeps the auth-callback catcher below working for real auth
  // links. Cookie set on supabaseResponse so every return path (rewrite,
  // redirectWithCookies, plain) carries it.
  const codeParam = request.nextUrl.searchParams.get("code")?.trim() ?? "";
  const isOAuthShapedCode =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codeParam);
  if (
    codeParam &&
    !isOAuthShapedCode &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/auth/")
  ) {
    supabaseResponse.cookies.set("beta_code", codeParam, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
  }

  // Root → the brand's landing whenever the effective brand has one (Relatti,
  // Money) — resolved by host in prod, or by ?brand= / cookie preview on
  // localhost + staging. Uses the same resolved brandId as theming so the
  // landing, surface, and theme stay consistent. Rewrite (not redirect): the URL
  // stays "/". Data-driven (not a per-brand `if`) so a new vertical's root
  // landing is one map entry, not another silent fall-through to the MasteryTV
  // root (the plain-`=== "relatti"` trap the money red-team flagged).
  const ROOT_LANDING: Partial<Record<BrandId, string>> = {
    relatti: "/relatti",
    money: "/money",
    // I5.1 landed the page, so the entry lands with it (this was deliberately
    // absent until the route existed, so the root could never rewrite to a 404).
    heard: "/heard",
  };
  const landingPath = ROOT_LANDING[brandId];
  if (pathname === "/" && landingPath) {
    const url = request.nextUrl.clone();
    url.pathname = landingPath;
    // Carry over cookies set on supabaseResponse — returning a bare rewrite used
    // to DROP the refreshed auth session cookies and the persisted ?brand=
    // cookie on exactly this (brand home) path.
    const rewritten = NextResponse.rewrite(url);
    for (const c of supabaseResponse.cookies.getAll()) rewritten.cookies.set(c);
    rewritten.headers.set("x-brand", brandId);
    return rewritten;
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
    return redirectWithCookies(url);
  }
  if (pathname.startsWith("/coachapp/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return redirectWithCookies(url);
  }
  // /coachapp/onboarding relocated to /onboarding (PA1). Keeps search (?redo=1).
  if (pathname.startsWith("/coachapp/onboarding")) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return redirectWithCookies(url);
  }
  // /coachapp/admin/* consolidated into /admin (PA1: crisis + frameworks migrated).
  if (pathname.startsWith("/coachapp/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace("/coachapp/admin", "/admin");
    return redirectWithCookies(url);
  }
  if (pathname === "/coachapp" || pathname === "/coachapp/") {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/dashboard" : "/login";
    return redirectWithCookies(url);
  }

  // Legacy: the invite landing moved off /decoded → /invite/[code].
  if (pathname.startsWith("/decoded/invite/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace("/decoded/invite/", "/invite/");
    return redirectWithCookies(url);
  }

  // Legacy → brand-neutral routes: the report, compatibility, types,
  // upgrade-success, and assessment surfaces moved off the Decoded namespace so
  // URLs are generic for every domain (relatti.com, careercoach.com, …), not
  // tied to one product. Preserves search params (?shared=true, ?session_id=).
  const NEUTRALIZED_ROUTES: Array<[string, string]> = [
    ["/decoded/report", "/report"],
    ["/decoded/compatibility", "/compatibility"],
    ["/decoded/upgrade-success", "/upgrade-success"],
    ["/decoded/types", "/types"],
    ["/decoded/assess", "/assess"],
  ];
  for (const [from, to] of NEUTRALIZED_ROUTES) {
    if (pathname === from || pathname.startsWith(`${from}/`)) {
      const url = request.nextUrl.clone();
      url.pathname = to + pathname.slice(from.length);
      return redirectWithCookies(url);
    }
  }

  // ── Catch auth codes landing on wrong routes ──
  // This is for BROWSER-NAVIGATED auth links only. It fires ONLY for
  // UUID-shaped codes (Supabase PKCE authorization codes) — beta invite codes
  // (short alphanumerics like BETA826) are persisted to the beta_code cookie
  // above and must reach their page untouched. Exempt regardless of shape:
  //   /beta, /challenge — their ?code= is always a beta invite code.
  //   /api/*            — API calls are never OAuth landings; redirecting a
  //                       fetch() with a ?code= param silently breaks it.
  if (
    codeParam &&
    isOAuthShapedCode &&
    !pathname.startsWith("/auth/callback") &&
    !pathname.startsWith("/api/") &&
    pathname !== "/beta" &&
    pathname !== "/challenge"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    url.search = `?code=${codeParam}`;
    return redirectWithCookies(url);
  }

  // ── Protected routes: require auth ──
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/assess") ||
    pathname.startsWith("/report") ||
    pathname.startsWith("/compatibility") ||
    pathname.startsWith("/upgrade-success");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    // Preserve where they were headed (e.g. /assess) so auth returns them there
    // instead of dumping everyone on /dashboard. Generic for every brand/route.
    const intended = pathname + (request.nextUrl.search || "");
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(intended)}`;
    return redirectWithCookies(url);
  }

  // ── Authenticated user on auth pages → redirect to dashboard ──
  if (user && pathname === "/decoded/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return redirectWithCookies(url);
  }

  // ── Module gate (brand isolation): pages whose module isn't enabled for the
  // resolved brand redirect to the dashboard. Nav already hides them; this
  // closes direct URL access — a dual-brand user must never open a MasteryTV
  // surface (commitments/progress/coaching-letter) on relatti.com, nor a
  // Relatti surface (blueprint/beta) on masterytv.com. After the auth check so
  // logged-out visitors still land on /login with their intended destination.
  const requiredModule = moduleForPath(pathname);
  if (requiredModule && !modulesForBrand(brandId).has(requiredModule)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return redirectWithCookies(url);
  }

  return supabaseResponse;
}
