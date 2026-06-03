'use client';

/**
 * ArchetypeCard — Personalized collectible card shown in the report header.
 *
 * Renders a DYNAMIC card via /api/decoded/card — composites the base
 * illustration with the user's personalized data (sublabel, tagline,
 * superpowers, name). Users can switch between 4 styles and share/download.
 *
 * The pre-generated images in /decoded/cards/ are used only as style
 * picker thumbnails. The main card is always dynamically generated.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Download, X, Check, ExternalLink, Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types & data
// ---------------------------------------------------------------------------

type CardStyle = 'animal' | 'object' | 'male' | 'female';

const STYLE_META: Record<CardStyle, { label: string; description: string }> = {
  animal: { label: 'Animal', description: 'Spirit animal motif' },
  object: { label: 'Object', description: 'Symbolic still-life' },
  male:   { label: 'Male Figure', description: 'Male archetype figure' },
  female: { label: 'Female Figure', description: 'Female archetype figure' },
};

const ALL_STYLES: CardStyle[] = ['animal', 'object', 'male', 'female'];

// Social platforms for card sharing
const SOCIAL_PLATFORMS = [
  {
    id: 'x' as const,
    label: 'X / Twitter',
    buildUrl: (url: string, text: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: 'facebook' as const,
    label: 'Facebook',
    buildUrl: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: 'linkedin' as const,
    label: 'LinkedIn',
    buildUrl: (url: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'whatsapp' as const,
    label: 'WhatsApp',
    buildUrl: (url: string, text: string) =>
      `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
  },
  {
    id: 'threads' as const,
    label: 'Threads',
    buildUrl: (url: string, text: string) =>
      `https://threads.net/intent/post?text=${encodeURIComponent(text + ' ' + url)}`,
  },
];

// Archetype slug normalization — report stores "Architect", we need "architect"
function normalizeSlug(archetype: string): string {
  return archetype
    .toLowerCase()
    .replace(/^the\s+/, '')
    .trim();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ArchetypeCardProps {
  /** Archetype name from the report, e.g. "Architect" or "The Architect" */
  archetype: string;
  /** AI-generated sublabel, e.g. "The Unconventional Maverick" */
  sublabel?: string;
  /** Archetype tagline/description from the report */
  tagline?: string;
  /** User's display name */
  userName?: string;
  /** Top 3 personalized strengths from S1 section */
  strengths?: string[];
}

export default function ArchetypeCard({
  archetype,
  sublabel,
  tagline,
  userName,
  strengths = [],
}: ArchetypeCardProps) {
  const slug = normalizeSlug(archetype);
  const [activeStyle, setActiveStyle] = useState<CardStyle>('animal');
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);

  // Build the API URL for the dynamic card
  const cardApiUrl = useMemo(() => {
    const params = new URLSearchParams({
      archetype: slug,
      style: activeStyle,
      format: 'square',
    });
    if (userName) params.set('name', userName);
    if (sublabel) params.set('sublabel', sublabel);
    if (tagline) params.set('tagline', tagline);
    if (strengths.length > 0) params.set('strengths', strengths.slice(0, 3).join(','));
    return `/api/decoded/card?${params.toString()}`;
  }, [slug, activeStyle, userName, sublabel, tagline, strengths]);

  // Preload the card image whenever style changes
  useEffect(() => {
    setCardImageUrl(cardApiUrl);
  }, [cardApiUrl]);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/decoded`
    : 'https://masterytv.com/decoded';
  const shareText = userName
    ? `I'm "The ${archetype}" — just decoded my personality with Decoded by MasteryTV. Try it free →`
    : `I'm "The ${archetype}" — decoded by MasteryTV. Try it free →`;

  const handleShare = useCallback((platform: typeof SOCIAL_PLATFORMS[number]) => {
    const url = platform.buildUrl(shareUrl, shareText);
    window.open(url, '_blank', 'width=600,height=400');
    setShowShare(false);
  }, [shareUrl, shareText]);

  const handleDownload = useCallback(async () => {
    if (!cardImageUrl) return;
    setDownloading(true);
    try {
      const response = await fetch(cardImageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decoded-${slug}-${activeStyle}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(cardImageUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  }, [cardImageUrl, slug, activeStyle]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
    }
  }, [shareUrl]);

  return (
    <div className="archetype-hero-card">
      {/* Main card — dynamically generated via API */}
      <motion.div
        className="archetype-hero-card__image-wrap"
        key={activeStyle}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
      >
        {cardImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cardImageUrl}
            alt={`Your personalized ${archetype} card — ${STYLE_META[activeStyle].label} style`}
            className="archetype-hero-card__image"
            width={480}
            height={480}
          />
        ) : (
          <div className="archetype-hero-card__loading">
            <Loader2 className="animate-spin" size={24} />
          </div>
        )}
      </motion.div>

      {/* Style selector row */}
      <div className="archetype-hero-card__controls">
        <div className="archetype-hero-card__styles">
          {ALL_STYLES.map((style) => (
            <button
              key={style}
              className={`archetype-hero-card__style-btn ${
                activeStyle === style ? 'archetype-hero-card__style-btn--active' : ''
              }`}
              onClick={() => setActiveStyle(style)}
              title={STYLE_META[style].description}
            >
              {/* Thumbnails use pre-generated static images */}
              <Image
                src={`/decoded/cards/${slug}/${style}.png`}
                alt={STYLE_META[style].label}
                width={56}
                height={56}
                className="archetype-hero-card__style-thumb"
              />
              <span className="archetype-hero-card__style-label">
                {STYLE_META[style].label}
              </span>
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="archetype-hero-card__actions">
          <button
            className="archetype-hero-card__action-btn"
            onClick={handleDownload}
            disabled={downloading}
            title="Download your personalized card"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span>{downloading ? 'Saving…' : 'Save'}</span>
          </button>
          <button
            className="archetype-hero-card__action-btn archetype-hero-card__action-btn--primary"
            onClick={() => setShowShare(!showShare)}
            title="Share your card"
          >
            <Share2 size={16} />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Share dropdown */}
      <AnimatePresence>
        {showShare && (
          <motion.div
            className="archetype-hero-card__share-panel"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="archetype-hero-card__share-header">
              <span className="archetype-hero-card__share-title">Share Your Card</span>
              <button
                className="archetype-hero-card__share-close"
                onClick={() => setShowShare(false)}
                aria-label="Close share panel"
              >
                <X size={14} />
              </button>
            </div>
            <div className="archetype-hero-card__share-grid">
              {SOCIAL_PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  className="archetype-hero-card__share-btn"
                  onClick={() => handleShare(platform)}
                >
                  <SocialIcon id={platform.id} />
                  {platform.label}
                </button>
              ))}
              <button
                className="archetype-hero-card__share-btn"
                onClick={handleCopyLink}
              >
                {copied ? <Check size={14} /> : <ExternalLink size={14} />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Social icons
// ---------------------------------------------------------------------------

function SocialIcon({ id }: { id: string }) {
  switch (id) {
    case 'x':
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
    case 'facebook':
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
    case 'linkedin':
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>;
    case 'whatsapp':
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
    case 'threads':
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.781 3.632 2.695 6.54 2.717 1.986-.013 3.758-.507 5.078-1.545 1.46-1.143 2.122-2.673 2.072-4.313-.066-2.171-1.373-3.605-3.175-4.23-.068 3.484-1.162 5.698-3.262 6.608-.826.357-1.758.502-2.6.482-1.202-.028-2.25-.424-2.952-1.117-.825-.817-1.242-1.993-1.166-3.302.164-2.834 2.177-4.542 5.226-4.666.86-.035 1.658.061 2.38.263.017-.54.006-1.063-.035-1.562-.116-1.409-.455-2.035-1.199-2.376-.487-.224-1.29-.26-2.25-.1-.932.156-1.57.583-2.007 1.031l-1.395-1.458C7.37 3.887 8.464 3.344 9.8 3.12c1.094-.183 2.332-.155 3.223.234 1.345.586 2.06 1.7 2.238 3.5.053.537.067 1.125.04 1.749.945.378 1.757.915 2.378 1.667.803.972 1.237 2.21 1.29 3.681.073 2.155-.876 4.185-2.753 5.656-1.647 1.29-3.793 1.943-6.21 1.96h-.01c.006 0-.008 0-.01 0z"/></svg>;
    default:
      return <ExternalLink size={14} />;
  }
}
