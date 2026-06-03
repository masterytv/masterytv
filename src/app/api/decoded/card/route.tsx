/**
 * Decoded Card Generator API — Dynamic archetype card compositing.
 *
 * Uses next/og (Satori + Resvg) to render personalized cards:
 * - Base illustration from /public/decoded/cards/{archetype}/{style}.png
 * - Dynamic text overlay: sublabel, description, superpowers, user name
 *
 * GET /api/decoded/card?
 *   archetype=rebel           # Required: archetype slug
 *   style=animal              # Required: animal | object | male | female
 *   name=Thomas+Wood          # Optional: user's display name
 *   sublabel=The+Unconventional+Maverick  # Required: AI sub-label
 *   tagline=Defying+norms+with+fearless+individuality  # Required: tagline
 *   strengths=Bold+Intuition,Creative+Disruption,Fearless+Action  # Required: top 3
 *   format=square             # Optional: square (1080×1080) | og (1200×630)
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Valid archetype slugs
const VALID_ARCHETYPES = new Set([
  'architect', 'explorer', 'advocate', 'sentinel', 'catalyst', 'sage',
  'healer', 'commander', 'artist', 'diplomat', 'maverick', 'guardian',
  'luminary', 'strategist', 'rebel', 'anchor',
]);

const VALID_STYLES = new Set(['animal', 'object', 'male', 'female']);

/**
 * Responsive name sizing — longer names get smaller text.
 */
function getNameStyle(name: string): { fontSize: number; letterSpacing: string } {
  const len = name.length;
  if (len <= 12) return { fontSize: 36, letterSpacing: '0.15em' };
  if (len <= 20) return { fontSize: 30, letterSpacing: '0.1em' };
  if (len <= 30) return { fontSize: 24, letterSpacing: '0.06em' };
  return { fontSize: 20, letterSpacing: '0.04em' };
}

/**
 * Sanitize text to prevent injection and excessive length.
 */
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

  // Validation
  if (!VALID_ARCHETYPES.has(archetype)) {
    return new Response('Invalid archetype', { status: 400 });
  }
  if (!VALID_STYLES.has(style)) {
    return new Response('Invalid style', { status: 400 });
  }

  const displayName = archetype.charAt(0).toUpperCase() + archetype.slice(1);
  const nameStyle = name ? getNameStyle(name) : null;

  // Image dimensions
  const width = format === 'og' ? 1200 : 1080;
  const height = format === 'og' ? 630 : 1080;

  // Build the illustration URL (absolute for Satori)
  const origin = req.nextUrl.origin;
  const illustrationUrl = `${origin}/decoded/cards/${archetype}/${style}.png`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b1326',
          fontFamily: 'Inter, system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Navy background with subtle gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, #0d1730 0%, #0b1326 30%, #080e1e 100%)',
            display: 'flex',
          }}
        />

        {/* Outer border */}
        <div
          style={{
            position: 'absolute',
            inset: format === 'og' ? 12 : 20,
            border: '1px solid rgba(245, 240, 232, 0.2)',
            borderRadius: 8,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: format === 'og' ? 16 : 26,
            border: '1px solid rgba(245, 240, 232, 0.1)',
            borderRadius: 6,
            display: 'flex',
          }}
        />

        {/* Content container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: format === 'og' ? '20px 40px' : '40px',
            zIndex: 1,
            width: '100%',
            height: '100%',
          }}
        >
          {/* DECODED header */}
          <div
            style={{
              fontSize: format === 'og' ? 16 : 22,
              fontWeight: 600,
              letterSpacing: '0.35em',
              color: '#F5F0E8',
              textTransform: 'uppercase' as const,
              marginBottom: format === 'og' ? 12 : 20,
              display: 'flex',
            }}
          >
            DECODED
          </div>

          {/* Illustration */}
          <div
            style={{
              width: format === 'og' ? 280 : 520,
              height: format === 'og' ? 280 : 520,
              borderRadius: 4,
              overflow: 'hidden',
              display: 'flex',
              marginBottom: format === 'og' ? 12 : 24,
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={illustrationUrl}
              alt=""
              width={format === 'og' ? 280 : 520}
              height={format === 'og' ? 280 : 520}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>

          {/* Archetype name */}
          <div
            style={{
              fontSize: format === 'og' ? 28 : 44,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: '#F5F0E8',
              textTransform: 'uppercase' as const,
              marginBottom: format === 'og' ? 4 : 8,
              display: 'flex',
            }}
          >
            THE {displayName.toUpperCase()}
          </div>

          {/* Diamond divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: format === 'og' ? 6 : 10,
              marginBottom: format === 'og' ? 4 : 8,
              color: 'rgba(245, 240, 232, 0.4)',
              fontSize: format === 'og' ? 10 : 14,
            }}
          >
            <span style={{ display: 'flex' }}>────</span>
            <span style={{ display: 'flex' }}>◆</span>
            <span style={{ display: 'flex' }}>────</span>
          </div>

          {/* Sub-label (personalized) */}
          {sublabel && (
            <div
              style={{
                fontSize: format === 'og' ? 16 : 24,
                fontWeight: 500,
                fontStyle: 'italic',
                color: '#F5F0E8',
                marginBottom: format === 'og' ? 4 : 8,
                display: 'flex',
              }}
            >
              {sublabel}
            </div>
          )}

          {/* Tagline / description (personalized) */}
          {tagline && (
            <div
              style={{
                fontSize: format === 'og' ? 11 : 16,
                fontStyle: 'italic',
                color: 'rgba(245, 240, 232, 0.65)',
                marginBottom: format === 'og' ? 8 : 14,
                display: 'flex',
                textAlign: 'center',
                maxWidth: format === 'og' ? 400 : 600,
              }}
            >
              &ldquo;{tagline}&rdquo;
            </div>
          )}

          {/* Superpowers (personalized) */}
          {strengths.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: format === 'og' ? 12 : 18,
                marginBottom: format === 'og' ? 10 : 18,
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
                    gap: format === 'og' ? 4 : 6,
                    fontSize: format === 'og' ? 11 : 16,
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

          {/* User name (personalized) */}
          {name && nameStyle && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: format === 'og' ? 6 : 10,
              }}
            >
              <span style={{ color: '#fabd00', fontSize: nameStyle.fontSize * 0.5, display: 'flex' }}>✾</span>
              <span
                style={{
                  fontSize: format === 'og' ? Math.round(nameStyle.fontSize * 0.7) : nameStyle.fontSize,
                  fontWeight: 700,
                  letterSpacing: nameStyle.letterSpacing,
                  color: '#fabd00',
                  textTransform: 'uppercase' as const,
                  display: 'flex',
                }}
              >
                {name.toUpperCase()}
              </span>
              <span style={{ color: '#fabd00', fontSize: nameStyle.fontSize * 0.5, display: 'flex' }}>✾</span>
            </div>
          )}

          {/* Watermark */}
          <div
            style={{
              fontSize: format === 'og' ? 10 : 14,
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
    {
      width,
      height,
    },
  );
}
