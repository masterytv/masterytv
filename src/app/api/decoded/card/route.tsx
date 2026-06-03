/**
 * Decoded Card Generator API — Option B: Satori text compositing.
 *
 * Uses illustration-only base images (frame + art + archetype name, blank bottom)
 * and renders personalized text via Satori with custom serif font.
 *
 * Base images: /public/decoded/cards/{archetype}/base/{style}.png
 * Font: Playfair Display (loaded from Google Fonts for premium serif look)
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const VALID_ARCHETYPES = new Set([
  'architect', 'explorer', 'advocate', 'sentinel', 'catalyst', 'sage',
  'healer', 'commander', 'artist', 'diplomat', 'maverick', 'guardian',
  'luminary', 'strategist', 'rebel', 'anchor',
]);

const VALID_STYLES = new Set(['animal', 'object', 'male', 'female']);

function getNameStyle(name: string) {
  const len = name.length;
  if (len <= 12) return { fontSize: 32, letterSpacing: '0.14em' };
  if (len <= 20) return { fontSize: 26, letterSpacing: '0.1em' };
  if (len <= 30) return { fontSize: 22, letterSpacing: '0.06em' };
  return { fontSize: 18, letterSpacing: '0.04em' };
}

function sanitize(text: string, maxLen = 100): string {
  return text.replace(/[<>"]/g, '').substring(0, maxLen).trim();
}

// Cache the font data in the module scope so we only fetch once
let fontCache: ArrayBuffer | null = null;
let fontBoldCache: ArrayBuffer | null = null;
let fontBoldItalicCache: ArrayBuffer | null = null;

async function loadFonts(): Promise<{ regular: ArrayBuffer; bold: ArrayBuffer; boldItalic: ArrayBuffer } | null> {
  if (fontCache && fontBoldCache && fontBoldItalicCache) return { regular: fontCache, bold: fontBoldCache, boldItalic: fontBoldItalicCache };

  try {
    // Playfair Display from jsDelivr / fontsource CDN
    // IMPORTANT: Satori only supports .woff and .ttf — NOT .woff2
    const [regular, bold, boldItalic] = await Promise.all([
      fetch('https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-400-normal.woff')
        .then(r => {
          if (!r.ok) throw new Error(`Font fetch failed: ${r.status}`);
          return r.arrayBuffer();
        }),
      fetch('https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-700-normal.woff')
        .then(r => {
          if (!r.ok) throw new Error(`Font fetch failed: ${r.status}`);
          return r.arrayBuffer();
        }),
      fetch('https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-700-italic.woff')
        .then(r => {
          if (!r.ok) throw new Error(`Font fetch failed: ${r.status}`);
          return r.arrayBuffer();
        }),
    ]);

    fontCache = regular;
    fontBoldCache = bold;
    fontBoldItalicCache = boldItalic;
    return { regular, bold, boldItalic };
  } catch (err) {
    // Graceful degradation — render with default font if CDN is down
    console.error('Failed to load Playfair Display font:', err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const archetype = searchParams.get('archetype')?.toLowerCase() ?? '';
  const style = searchParams.get('style')?.toLowerCase() ?? 'animal';
  const name = sanitize(searchParams.get('name') ?? '', 40);
  const sublabel = sanitize(searchParams.get('sublabel') ?? '', 60);
  const tagline = sanitize(searchParams.get('tagline') ?? '', 120);
  const strengthsRaw = searchParams.get('strengths') ?? '';
  const strengths = strengthsRaw.split(',').map(s => sanitize(s, 40)).filter(Boolean).slice(0, 3);
  const format = searchParams.get('format') ?? 'square';

  if (!VALID_ARCHETYPES.has(archetype)) {
    return new Response('Invalid archetype', { status: 400 });
  }
  if (!VALID_STYLES.has(style)) {
    return new Response('Invalid style', { status: 400 });
  }

  // Don't show email addresses
  const displayName = name.includes('@') ? '' : name;
  const nameStyle = displayName ? getNameStyle(displayName) : null;

  const width = format === 'og' ? 1200 : 1080;
  const height = format === 'og' ? 630 : 1080;
  const isOg = format === 'og';

  const origin = req.nextUrl.origin;
  const baseImageUrl = `${origin}/decoded/cards/${archetype}/base/${style}.png`;

  // Load premium serif font (gracefully degrades to system serif)
  const fonts = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Base card image — frame + illustration + archetype name, blank bottom */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={baseImageUrl}
          alt=""
          width={width}
          height={height}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            inset: 0,
          }}
        />

        {/* Personalized text — positioned in the blank area at the bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: isOg ? '45%' : '33%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isOg ? '2% 8% 2%' : '3% 10% 5%',
            gap: isOg ? 6 : 10,
            fontFamily: '"Playfair Display", Georgia, serif',
          }}
        >
          {/* Personalized sublabel — bold italic */}
          {sublabel && (
            <div
              style={{
                fontSize: isOg ? 22 : 34,
                fontWeight: 700,
                fontStyle: 'italic',
                color: '#F5F0E8',
                textAlign: 'center',
                display: 'flex',
                lineHeight: 1.2,
              }}
            >
              {sublabel}
            </div>
          )}


          {/* Personalized strengths — diamond-separated */}
          {strengths.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isOg ? 15 : 22,
                fontWeight: 400,
                color: '#F5F0E8',
                gap: isOg ? 16 : 22,
                marginTop: 2,
              }}
            >
              {strengths.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: isOg ? 5 : 7 }}>
                  <div style={{
                    width: isOg ? 6 : 9,
                    height: isOg ? 6 : 9,
                    backgroundColor: '#fabd00',
                    transform: 'rotate(45deg)',
                    flexShrink: 0,
                    display: 'flex',
                  }} />
                  <span style={{ display: 'flex', lineHeight: 1, marginTop: isOg ? 2 : 3 }}>{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* Personalized user name — gold, bold */}
          {displayName && nameStyle && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: isOg ? 4 : 8,
              }}
            >
              <span
                style={{
                  fontSize: isOg ? Math.round(nameStyle.fontSize * 0.75) : nameStyle.fontSize,
                  fontWeight: 700,
                  letterSpacing: nameStyle.letterSpacing,
                  color: '#fabd00',
                  textTransform: 'uppercase' as const,
                  display: 'flex',
                }}
              >
                {displayName.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Watermark — placed at very bottom, inside the frame border area */}
        <div
          style={{
            position: 'absolute',
            bottom: isOg ? 6 : 14,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: isOg ? 10 : 13,
              color: 'rgba(245, 240, 232, 0.4)',
              letterSpacing: '0.06em',
              fontFamily: '"Playfair Display", Georgia, serif',
              display: 'flex',
            }}
          >
            masterytv.com/decoded
          </span>
        </div>
      </div>
    ),
    {
      width,
      height,
      ...(fonts ? {
        fonts: [
          {
            name: 'Playfair Display',
            data: fonts.regular,
            weight: 400 as const,
            style: 'normal' as const,
          },
          {
            name: 'Playfair Display',
            data: fonts.bold,
            weight: 700 as const,
            style: 'normal' as const,
          },
          {
            name: 'Playfair Display',
            data: fonts.boldItalic,
            weight: 700 as const,
            style: 'italic' as const,
          },
        ],
      } : {}),
    },
  );
}
