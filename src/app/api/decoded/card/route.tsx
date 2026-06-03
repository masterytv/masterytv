/**
 * Decoded Card Generator API — Programmatic text compositing (Option B).
 *
 * APPROACH: Uses illustration-only base images (frame + art + archetype name,
 * with blank space at bottom) and overlays personalized text via Satori.
 *
 * Base images stored in: /public/decoded/cards/{archetype}/base/{style}.png
 * These contain: frame, "DECODED" header, illustration, archetype name, divider
 * They do NOT contain: sublabel, quote, strengths, user name, watermark
 *
 * Satori renders the personalized text in the blank area at the bottom.
 *
 * GET /api/decoded/card?
 *   archetype=rebel
 *   style=animal
 *   name=Thomas+Wood
 *   sublabel=The+Unconventional+Maverick
 *   tagline=Defying+norms+with+fearless+individuality
 *   strengths=Bold+Intuition,Creative+Disruption,Fearless+Action
 *   format=square|og
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

  // Don't show email addresses as names
  const displayName = name.includes('@') ? '' : name;
  const nameStyle = displayName ? getNameStyle(displayName) : null;

  const width = format === 'og' ? 1200 : 1080;
  const height = format === 'og' ? 630 : 1080;
  const isOg = format === 'og';

  // Base image: illustration-only (frame + art + archetype name, blank bottom)
  const origin = req.nextUrl.origin;
  const baseImageUrl = `${origin}/decoded/cards/${archetype}/base/${style}.png`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}
      >
        {/* Base card image — fills entire card, has blank space at bottom */}
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
            height: isOg ? '45%' : '28%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isOg ? '0 8% 2%' : '0 10% 3%',
            gap: isOg ? 4 : 6,
          }}
        >
          {/* Personalized sublabel */}
          {sublabel && (
            <div
              style={{
                fontSize: isOg ? 18 : 26,
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

          {/* Personalized tagline/quote */}
          {tagline && (
            <div
              style={{
                fontSize: isOg ? 12 : 17,
                fontStyle: 'italic',
                color: 'rgba(245, 240, 232, 0.6)',
                textAlign: 'center',
                display: 'flex',
                lineHeight: 1.3,
                maxWidth: '90%',
              }}
            >
              &ldquo;{tagline}&rdquo;
            </div>
          )}

          {/* Personalized strengths */}
          {strengths.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isOg ? 14 : 20,
                flexWrap: 'wrap',
                justifyContent: 'center',
                marginTop: isOg ? 2 : 4,
              }}
            >
              {strengths.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isOg ? 4 : 6,
                    fontSize: isOg ? 11 : 15,
                    fontWeight: 600,
                    color: '#F5F0E8',
                  }}
                >
                  <span style={{ color: '#fabd00', display: 'flex', fontSize: isOg ? 8 : 11 }}>◆</span>
                  {s}
                </div>
              ))}
            </div>
          )}

          {/* Personalized user name */}
          {displayName && nameStyle && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: isOg ? 4 : 6,
              }}
            >
              <span style={{ color: '#fabd00', fontSize: isOg ? 12 : 16, display: 'flex' }}>✾</span>
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
              <span style={{ color: '#fabd00', fontSize: isOg ? 12 : 16, display: 'flex' }}>✾</span>
            </div>
          )}

          {/* Watermark */}
          <div
            style={{
              fontSize: isOg ? 10 : 13,
              color: 'rgba(245, 240, 232, 0.3)',
              letterSpacing: '0.04em',
              display: 'flex',
              marginTop: isOg ? 2 : 4,
            }}
          >
            masterytv.com/decoded
          </div>
        </div>
      </div>
    ),
    { width, height },
  );
}
