/**
 * /api/og — generated 1200×630 link-preview cards, one per brand + title.
 *
 * BRAND.md §15 option B: preview cards are RENDERED from brand config instead
 * of designed per page/tenant. brand-metadata.ts points og:image here for
 * every indexable page; a white-label tenant gets correct cards the moment
 * its palette entry below exists — zero design work per customer.
 *
 * Design (BRAND.md): typography carries the hierarchy — brand wordmark as a
 * small-caps label, the page title large, the domain as the anchor line. No
 * icons, no decoration (§14). Satori supports flexbox + linear-gradient only.
 *
 * Note: the endpoint is public and parameterized (standard for og endpoints),
 * so arbitrary text can be rendered onto a branded card by anyone who crafts
 * a URL. Accepted trade-off today; HMAC-sign the params if it's ever abused.
 */
import { ImageResponse } from "next/og";
import { isBrandId, type BrandId } from "@/lib/platform/brand";

export const runtime = "edge";

interface OgPalette {
  wordmark: string;
  gradientFrom: string;
  gradientTo: string;
  /** Wordmark + anchor-line color — a light tint of the brand primary. */
  accent: string;
  domain: string;
}

const OG_BRANDS: Record<BrandId, OgPalette> = {
  masterytv: {
    wordmark: "MASTERY COACH",
    gradientFrom: "#0b1326",
    gradientTo: "#003ec7",
    accent: "#b4c5ff",
    domain: "masterytv.com",
  },
  relatti: {
    wordmark: "RELATTI",
    gradientFrom: "#4c0519",
    gradientTo: "#be123c",
    accent: "#fecdd3",
    domain: "relatti.com",
  },
};

const MAX_TITLE = 120;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const brandParam = searchParams.get("brand");
  const brand = OG_BRANDS[isBrandId(brandParam) ? brandParam : "masterytv"];

  const rawTitle = searchParams.get("title") ?? brand.wordmark;
  const title =
    rawTitle.length > MAX_TITLE ? `${rawTitle.slice(0, MAX_TITLE - 1)}…` : rawTitle;

  // Long titles step down so three lines still fit the canvas.
  const fontSize = title.length > 80 ? 52 : title.length > 48 ? 62 : 72;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 84px",
          background: `linear-gradient(135deg, ${brand.gradientFrom} 0%, ${brand.gradientTo} 100%)`,
          color: "#ffffff",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "0.18em",
            color: brand.accent,
          }}
        >
          {brand.wordmark}
        </div>
        <div
          style={{
            fontSize,
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
            maxWidth: "980px",
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 26,
            color: brand.accent,
          }}
        >
          <div style={{ display: "flex" }}>{brand.domain}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
