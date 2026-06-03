/**
 * Decoded Card Generator API — Downloadable personalized card.
 *
 * APPROACH: Uses the pre-generated card image as the base (which includes
 * the frame, illustration, and archetype name), then overlays personalized
 * text (sublabel, quote, strengths, name) on the bottom portion.
 *
 * This matches what the CSS overlay does in the browser, but produces
 * a pixel-perfect PNG for downloading and social sharing.
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
  if (len <= 12) return { fontSize: 36, letterSpacing: '0.15em' };
  if (len <= 20) return { fontSize: 30, letterSpacing: '0.1em' };
  if (len <= 30) return { fontSize: 24, letterSpacing: '0.06em' };
  return { fontSize: 20, letterSpacing: '0.04em' };
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

  // Don't show email addresses
  const displayName = name.includes('@') ? '' : name;
  const nameStyle = displayName ? getNameStyle(displayName) : null;

  const width = format === 'og' ? 1200 : 1080;
  const height = format === 'og' ? 630 : 1080;
  const isOg = format === 'og';

  // Base card image URL — the pre-generated card with frame, illustration, archetype name
  const origin = req.nextUrl.origin;
  const cardImageUrl = `${origin}/decoded/cards/${archetype}/${style}.png`;

  const displayArchetype = archetype.charAt(0).toUpperCase() + archetype.slice(1);

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
        {/* Full pre-generated card image as base layer */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cardImageUrl}
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

        {/* Gradient overlay covering the bottom text area */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: isOg ? '55%' : '42%',
            background: 'linear-gradient(to bottom, transparent 0%, rgba(11,19,38,0.7) 10%, rgba(11,19,38,0.95) 20%, #0b1326 30%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: isOg ? '0 8% 3%' : '0 8% 4%',
          }}
        >
          {/* Archetype name */}
          <div
            style={{
              fontSize: isOg ? 28 : 44,
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: '#F5F0E8',
              textTransform: 'uppercase' as const,
              marginBottom: isOg ? 2 : 4,
              display: 'flex',
            }}
          >
            THE {displayArchetype.toUpperCase()}
          </div>

          {/* Divider */}
          <div
            style={{
              fontSize: isOg ? 8 : 12,
              color: 'rgba(245, 240, 232, 0.4)',
              letterSpacing: '0.2em',
              marginBottom: isOg ? 4 : 6,
              display: 'flex',
            }}
          >
            ◆◇◆
          </div>

          {/* Sublabel */}
          {sublabel && (
            <div
              style={{
                fontSize: isOg ? 16 : 24,
                fontWeight: 500,
                fontStyle: 'italic',
                color: '#F5F0E8',
                marginBottom: isOg ? 3 : 6,
                display: 'flex',
                textAlign: 'center',
              }}
            >
              {sublabel}
            </div>
          )}

          {/* Quote */}
          {tagline && (
            <div
              style={{
                fontSize: isOg ? 11 : 16,
                fontStyle: 'italic',
                color: 'rgba(245, 240, 232, 0.6)',
                marginBottom: isOg ? 6 : 10,
                display: 'flex',
                textAlign: 'center',
                maxWidth: '85%',
              }}
            >
              &ldquo;{tagline}&rdquo;
            </div>
          )}

          {/* Strengths */}
          {strengths.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isOg ? 10 : 16,
                marginBottom: isOg ? 8 : 12,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {strengths.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isOg ? 3 : 5,
                    fontSize: isOg ? 10 : 15,
                    fontWeight: 500,
                    color: '#F5F0E8',
                  }}
                >
                  <span style={{ color: '#fabd00', display: 'flex' }}>◆</span>
                  {s}
                </div>
              ))}
            </div>
          )}

          {/* User name */}
          {displayName && nameStyle && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: isOg ? 4 : 8,
              }}
            >
              <span style={{ color: '#fabd00', fontSize: (isOg ? nameStyle.fontSize * 0.5 : nameStyle.fontSize * 0.6), display: 'flex' }}>✾</span>
              <span
                style={{
                  fontSize: isOg ? Math.round(nameStyle.fontSize * 0.7) : nameStyle.fontSize,
                  fontWeight: 700,
                  letterSpacing: nameStyle.letterSpacing,
                  color: '#fabd00',
                  textTransform: 'uppercase' as const,
                  display: 'flex',
                }}
              >
                {displayName.toUpperCase()}
              </span>
              <span style={{ color: '#fabd00', fontSize: (isOg ? nameStyle.fontSize * 0.5 : nameStyle.fontSize * 0.6), display: 'flex' }}>✾</span>
            </div>
          )}

          {/* Watermark */}
          <div
            style={{
              fontSize: isOg ? 10 : 14,
              color: 'rgba(245, 240, 232, 0.35)',
              letterSpacing: '0.05em',
              display: 'flex',
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
