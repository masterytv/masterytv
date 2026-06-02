'use client';

/**
 * ShareModal — Share-to-unlock gate for the Relationships section (S5).
 * 
 * Two unlock paths:
 * 1. Send email invite via Resend (/api/decoded/invite)
 * 2. Share to social media (click = unlock)
 * 
 * Sprint: S0.5.3i-k
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Mail, Send, Loader2, Check, ArrowRight,
  ExternalLink,
} from 'lucide-react';
import './share-modal.css';

type ShareMethod = 'email' | 'x' | 'facebook' | 'linkedin' | 'whatsapp' | 'reddit' | 'threads';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: () => void;
  /** The URL to share (report page or /decoded landing) */
  shareUrl: string;
  /** User's archetype name for personalized share text */
  archetype?: string;
}

const SHARE_TEXT = "Just decoded my personality with Decoded by MasteryTV. Wild accuracy. Try it free →";

const SOCIAL_PLATFORMS: Array<{
  id: ShareMethod;
  label: string;
  color: string;
  buildUrl: (url: string, text: string) => string;
}> = [
  {
    id: 'x',
    label: 'X / Twitter',
    color: '#000000',
    buildUrl: (url, text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    buildUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    color: '#0A66C2',
    buildUrl: (url, text) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    color: '#25D366',
    buildUrl: (url, text) => `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
  },
  {
    id: 'reddit',
    label: 'Reddit',
    color: '#FF4500',
    buildUrl: (url, text) => `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
  },
  {
    id: 'threads',
    label: 'Threads',
    color: '#000000',
    buildUrl: (url, text) => `https://threads.net/intent/post?text=${encodeURIComponent(text + ' ' + url)}`,
  },
];

export default function ShareModal({ isOpen, onClose, onUnlock, shareUrl, archetype }: ShareModalProps) {
  const [tab, setTab] = useState<'social' | 'email'>('social');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const unlocked = useRef(false);

  const shareText = archetype
    ? `I'm a "${archetype}" — just decoded my personality with Decoded by MasteryTV. Try it free →`
    : SHARE_TEXT;

  async function handleSocialShare(platform: typeof SOCIAL_PLATFORMS[number]) {
    // Open share window
    const url = platform.buildUrl(shareUrl, shareText);
    window.open(url, '_blank', 'width=600,height=400');

    // Record unlock (fire and forget)
    if (!unlocked.current) {
      unlocked.current = true;
      fetch('/api/decoded/share-unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: platform.id }),
      }).catch(() => {/* silent */});
      onUnlock();
    }
  }

  async function handleEmailInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/decoded/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to send invite.');
        setSending(false);
        return;
      }

      setSent(true);
      setSending(false);

      if (!unlocked.current) {
        unlocked.current = true;
        onUnlock();
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setSending(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="share-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="share-modal"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button className="share-modal__close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>

            {/* Header */}
            <div className="share-modal__header">
              <h2 className="share-modal__title">Unlock Your Relationships</h2>
              <p className="share-modal__subtitle">
                Share Decoded with someone and unlock &ldquo;Your Relationships&rdquo; &mdash; 
                see how your attachment style shapes your love life, conflict patterns, and deepest needs.
              </p>
            </div>

            {/* Tab switcher */}
            <div className="share-tabs">
              <button
                className={`share-tab ${tab === 'social' ? 'share-tab--active' : ''}`}
                onClick={() => setTab('social')}
              >
                <ExternalLink size={15} />
                Share Online
              </button>
              <button
                className={`share-tab ${tab === 'email' ? 'share-tab--active' : ''}`}
                onClick={() => setTab('email')}
              >
                <Mail size={15} />
                Send Email
              </button>
            </div>

            {/* Content */}
            <div className="share-modal__body">
              {tab === 'social' ? (
                <div className="share-social">
                  <div className="share-social__grid">
                    {SOCIAL_PLATFORMS.map((platform) => (
                      <button
                        key={platform.id}
                        className="share-social__btn"
                        onClick={() => handleSocialShare(platform)}
                        style={{ '--platform-color': platform.color } as React.CSSProperties}
                      >
                        <SocialIcon id={platform.id} />
                        {platform.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="share-email">
                  {sent ? (
                    <div className="share-email__success">
                      <div className="share-email__check">
                        <Check size={24} />
                      </div>
                      <p className="share-email__success-text">
                        Invite sent! Your Relationships section is now unlocked.
                      </p>
                      <button className="share-email__done-btn" onClick={onClose}>
                        Read It Now <ArrowRight size={16} />
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleEmailInvite} className="share-email__form">
                      <label className="share-email__label">
                        Their email address
                      </label>
                      <input
                        type="email"
                        className="share-email__input"
                        placeholder="friend@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={sending}
                      />
                      {error && <p className="share-email__error">{error}</p>}
                      <button
                        type="submit"
                        className="share-email__submit"
                        disabled={sending || !email.trim()}
                      >
                        {sending ? (
                          <><Loader2 size={16} className="animate-spin" /> Sending...</>
                        ) : (
                          <><Send size={16} /> Send Invite</>
                        )}
                      </button>
                      <p className="share-email__note">
                        We&apos;ll send them a branded invitation to take the assessment. Your email stays private.
                      </p>
                    </form>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Simple SVG icons for social platforms — avoids external icon dependencies */
function SocialIcon({ id }: { id: string }) {
  switch (id) {
    case 'x':
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
    case 'facebook':
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
    case 'linkedin':
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>;
    case 'whatsapp':
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
    case 'reddit':
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>;
    case 'threads':
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.781 3.632 2.695 6.54 2.717 1.986-.013 3.758-.507 5.078-1.545 1.46-1.143 2.122-2.673 2.072-4.313-.066-2.171-1.373-3.605-3.175-4.23-.068 3.484-1.162 5.698-3.262 6.608-.826.357-1.758.502-2.6.482-1.202-.028-2.25-.424-2.952-1.117-.825-.817-1.242-1.993-1.166-3.302.164-2.834 2.177-4.542 5.226-4.666.86-.035 1.658.061 2.38.263.017-.54.006-1.063-.035-1.562-.116-1.409-.455-2.035-1.199-2.376-.487-.224-1.29-.26-2.25-.1-.932.156-1.57.583-2.007 1.031l-1.395-1.458C7.37 3.887 8.464 3.344 9.8 3.12c1.094-.183 2.332-.155 3.223.234 1.345.586 2.06 1.7 2.238 3.5.053.537.067 1.125.04 1.749.945.378 1.757.915 2.378 1.667.803.972 1.237 2.21 1.29 3.681.073 2.155-.876 4.185-2.753 5.656-1.647 1.29-3.793 1.943-6.21 1.96h-.01c.006 0-.008 0-.01 0z"/></svg>;
    default:
      return <ExternalLink size={16} />;
  }
}
