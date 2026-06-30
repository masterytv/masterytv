'use client';

/**
 * RelationshipStyleCard — shareable collectible emblem for the four Relatti
 * relationship styles (The Anchor / The Devoted / The Independent / The Guarded
 * Heart). Unlike the personality ArchetypeCard, these are NOT personalized: one
 * fixed engraved card per style, served from /public/relatti/styles/{slug}.png.
 *
 * Reuses the .archetype-hero-card CSS for visual parity. Save downloads the PNG;
 * Share uses the native share sheet (with the image file) when available,
 * otherwise falls back to a social link dropdown.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Download, X, Check, ExternalLink, Loader2 } from 'lucide-react';

const SOCIAL_PLATFORMS = [
  { id: 'x', label: 'X / Twitter',
    buildUrl: (url: string, text: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` },
  { id: 'facebook', label: 'Facebook',
    buildUrl: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { id: 'whatsapp', label: 'WhatsApp',
    buildUrl: (url: string, text: string) => `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}` },
];

interface RelationshipStyleCardProps {
  /** asset slug: anchor | devoted | independent | guarded-heart */
  slug: string;
  /** display name, e.g. "The Guarded Heart" */
  name: string;
}

export default function RelationshipStyleCard({ slug, name }: RelationshipStyleCardProps) {
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const imgSrc = `/relatti/styles/${slug}.png`;
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/relatti` : 'https://relatti.com';
  const shareText = `My relationship style is "${name}" — found it with Relatti.`;

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const res = await fetch(imgSrc);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatti-${slug}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(imgSrc, '_blank');
    } finally {
      setDownloading(false);
    }
  }, [imgSrc, slug]);

  const handleShare = useCallback(async () => {
    // Prefer the native share sheet with the actual image file.
    try {
      if (typeof navigator !== 'undefined' && 'canShare' in navigator) {
        const res = await fetch(imgSrc);
        const blob = await res.blob();
        const file = new File([blob], `relatti-${slug}.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: name, text: shareText });
          return;
        }
      }
    } catch {
      /* fall through to the link dropdown */
    }
    setShowShare((s) => !s);
  }, [imgSrc, slug, name, shareText]);

  const handleSocial = useCallback((platform: typeof SOCIAL_PLATFORMS[number]) => {
    window.open(platform.buildUrl(shareUrl, shareText), '_blank', 'width=600,height=400');
    setShowShare(false);
  }, [shareUrl, shareText]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* silent */
    }
  }, [shareUrl]);

  return (
    <div className="archetype-hero-card">
      <motion.div
        className="ahc-card"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={`${name} — shareable relationship style card`}
          className="ahc-card__base-image"
          width={480}
          height={480}
        />
      </motion.div>

      <div className="archetype-hero-card__controls">
        <div className="archetype-hero-card__actions">
          <button
            className="archetype-hero-card__action-btn"
            onClick={handleDownload}
            disabled={downloading}
            title="Save your relationship style card"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span>{downloading ? 'Saving…' : 'Save'}</span>
          </button>
          <button
            className="archetype-hero-card__action-btn archetype-hero-card__action-btn--primary"
            onClick={handleShare}
            title="Share your card"
          >
            <Share2 size={16} />
            <span>Share</span>
          </button>
        </div>
      </div>

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
              <span className="archetype-hero-card__share-title">Share Your Style</span>
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
                  onClick={() => handleSocial(platform)}
                >
                  {platform.label}
                </button>
              ))}
              <button className="archetype-hero-card__share-btn" onClick={handleCopyLink}>
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
