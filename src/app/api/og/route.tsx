/**
 * /api/og — generated 1200×630 link-preview cards, one per brand + title.
 *
 * BRAND.md §15 option B: preview cards are RENDERED from brand config instead
 * of designed per page/tenant. brand-metadata.ts points og:image here for
 * every indexable page; a white-label tenant gets correct cards the moment
 * its OG_BRANDS entry below exists + its mark file lands in ./assets/ —
 * zero design work per customer.
 *
 * ⚠️ Keep mark SVGs free of XML comments. satori parses a `<!-- … -->` inside
 * the data URI as a failure and drops the image SILENTLY: the card still
 * renders, still returns 200, and simply has no logo on it. Cost 20 minutes on
 * the HEARD mark, 2026-08-13. The public/ copy of the same file may carry
 * comments; sharp handles them.
 *
 * Marks are BUNDLED with the route (fetch(new URL(...), import.meta.url) —
 * the documented ImageResponse asset pattern) because the edge runtime has
 * no filesystem and public/ is CDN-served, not function-bundled. Keep the
 * files in ./assets/ as copies of the canonical public/ icons.
 *
 * Design (BRAND.md): logo + product-name lockup (matching the site header),
 * page title large, domain as the anchor line. Marks whose palette matches
 * the card gradient (Relatti's rose heart) sit in a light circular badge for
 * contrast — set `markBadge` per brand. Satori supports flexbox +
 * linear-gradient only; hex here is unavoidable (PNG output, no CSS vars).
 *
 * Note: the endpoint is public and parameterized (standard for og endpoints),
 * so arbitrary text can be rendered onto a branded card by anyone who crafts
 * a URL. Accepted trade-off today; HMAC-sign the params if it's ever abused.
 */
import { ImageResponse } from "next/og";
import { isBrandId, type BrandId } from "@/lib/platform/brand";

export const runtime = "edge";

interface OgPalette {
  /** Product name in the lockup (matches the site header). */
  name: string;
  gradientFrom: string;
  gradientTo: string;
  /** Anchor-line color — a light tint of the brand primary. */
  accent: string;
  domain: string;
  /** Light badge behind the mark when it would vanish on the gradient. */
  markBadge?: string;
}

const OG_BRANDS: Record<BrandId, OgPalette> = {
  masterytv: {
    name: "MasteryTV",
    gradientFrom: "#0b1326",
    gradientTo: "#003ec7",
    accent: "#b4c5ff",
    domain: "masterytv.com",
  },
  relatti: {
    name: "Relatti",
    gradientFrom: "#4c0519",
    gradientTo: "#be123c",
    accent: "#fecdd3",
    domain: "relatti.com",
    markBadge: "#fdf2f4",
  },
  // Money palette v0 (emerald family) — flagged for the design/palette leaf to
  // finalize and to align with globals.css money tokens. OG hex is an allowlisted
  // exception to check:colors (edge ImageResponse, no CSS vars). The white
  // compass mark shows on the dark gradient, so no markBadge.
  money: {
    name: "MoneyTraits",
    gradientFrom: "#04231c",
    gradientTo: "#047857",
    accent: "#6ee7b7",
    domain: "moneytraits.com",
  },
  // HEARD — the globals.css slate ramp (hue 240) converted to hex, which the
  // edge ImageResponse needs because satori resolves no CSS vars. The mark is
  // a slate tile, and the card's top-left corner is the dark end of the
  // gradient, so it separates without a markBadge.
  //
  // ⚠️ Card TEXT is the exposure here, not the palette. This is the image that
  // renders in an iMessage thread and a Slack unfurl, so whatever a door page
  // passes as its title is what appears on somebody's lock screen when they
  // send the link to one person they trust. Keep door titles free of the
  // population's name (INTEGRATION_EXPERIENCE §1.1, the proactive-email row) —
  // "HEARD" plus the domain is the whole safe lockup.
  heard: {
    name: "HEARD",
    gradientFrom: "#061520",
    gradientTo: "#1b5274",
    accent: "#9ecef1",
    domain: "youheard.org",
  },
};

// Brand marks, loaded once per isolate. PNGs go to satori as ArrayBuffers;
// SVGs must become data URIs (satori sniffs buffer types for raster only).
const MARKS: Record<BrandId, Promise<string | ArrayBuffer>> = {
  masterytv: fetch(new URL("./assets/masterytv-mark.png", import.meta.url)).then((r) =>
    r.arrayBuffer(),
  ),
  relatti: fetch(new URL("./assets/relatti-mark.svg", import.meta.url))
    .then((r) => r.text())
    .then((svg) => `data:image/svg+xml;base64,${btoa(svg)}`),
  money: fetch(new URL("./assets/money-mark.svg", import.meta.url))
    .then((r) => r.text())
    .then((svg) => `data:image/svg+xml;base64,${btoa(svg)}`),
  heard: fetch(new URL("./assets/heard-mark.svg", import.meta.url))
    .then((r) => r.text())
    .then((svg) => `data:image/svg+xml;base64,${btoa(svg)}`),
};

const MAX_TITLE = 120;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const brandParam = searchParams.get("brand");
  const brandId: BrandId = isBrandId(brandParam) ? brandParam : "masterytv";
  const brand = OG_BRANDS[brandId];
  const mark = await MARKS[brandId];

  const rawTitle = searchParams.get("title") ?? brand.name;
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
          padding: "64px 84px 72px",
          background: `linear-gradient(135deg, ${brand.gradientFrom} 0%, ${brand.gradientTo} 100%)`,
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "26px" }}>
          {brand.markBadge ? (
            <div
              style={{
                width: "96px",
                height: "96px",
                borderRadius: "9999px",
                background: brand.markBadge,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img width={64} height={64} src={mark as string} alt="" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              width={96}
              height={96}
              // satori accepts ArrayBuffer sources; the DOM img type doesn't.
              src={mark as unknown as string}
              alt=""
            />
          )}
          <div style={{ fontSize: 44, fontWeight: 700 }}>{brand.name}</div>
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
        <div style={{ display: "flex", fontSize: 26, color: brand.accent }}>
          {brand.domain}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
