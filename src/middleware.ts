import { updateSession } from "@/lib/supabase/middleware";
import { isAiCrawler } from "@/lib/platform/ai-crawlers";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // AI crawlers are turned away before any session work (see ai-crawlers.ts).
  // robots.txt is excluded from the matcher below, so they can still read it.
  if (isAiCrawler(request.headers.get("user-agent"))) {
    return new NextResponse(null, { status: 403 });
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (build output, image optimization)
     * - favicon.ico, robots.txt, sitemap.xml, manifest.json (same for everyone)
     * - api/og (link-preview cards: public, no session, CDN-cached)
     * - public assets by extension (images, fonts, media, pdf)
     *
     * Every path matched here is a billed invocation on Vercel (it counted
     * toward the Hobby Active CPU limit we hit in Oct 2026), so anything that
     * never needs the session refresh or a brand redirect stays out.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|api/og|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|mp4|webm|mp3|pdf)$).*)",
  ],
};
