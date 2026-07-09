'use client';

/**
 * InviteConsentBanner — Shown on the recipient's dashboard when someone
 * has invited them to compare personality profiles.
 * 
 * Granular permissions: user controls what they share with the human
 * vs what they share with the human's AI coach.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Shield, Check, ChevronDown, Loader2, X,
} from 'lucide-react';

type ShareLevel = 'none' | 'compatibility' | 'type_compatibility' | 'full';

interface InviteData {
  id: string;
  inviterName: string;
  inviterEmail: string;
  status: string;
  shareWithHuman: ShareLevel;
  shareWithCoach: ShareLevel;
}

interface InviteConsentBannerProps {
  invite: InviteData;
  onConsented: () => void;
  onDismissed: () => void;
}

const SHARE_OPTIONS: Array<{ value: ShareLevel; label: string; description: string }> = [
  {
    value: 'compatibility',
    label: 'Compatibility Report Only',
    description: 'A synthesized overview of how your personalities interact.',
  },
  {
    value: 'type_compatibility',
    label: 'Personality Type + Compatibility',
    description: 'Your archetype and how it meshes with theirs.',
  },
  {
    value: 'full',
    label: 'Full Report',
    description: 'Your complete personality profile — all 13 dimensions.',
  },
];

export default function InviteConsentBanner({ invite, onConsented, onDismissed }: InviteConsentBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [shareHuman, setShareHuman] = useState<ShareLevel>('type_compatibility');
  const [shareCoach, setShareCoach] = useState<ShareLevel>('full');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleConsent() {
    setSaving(true);
    try {
      const res = await fetch('/api/decoded/invite-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteId: invite.id,
          shareWithHuman: shareHuman,
          shareWithCoach: shareCoach,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => onConsented(), 1500);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-success/10 border border-success/20 p-6 text-center"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/20">
          <Check className="h-6 w-6 text-success" />
        </div>
        <p className="text-body-md text-text-primary font-medium">
          Connected with {invite.inviterName}!
        </p>
        <p className="mt-1 text-body-sm text-text-secondary">
          Your Compatibility Report is being generated.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-surface-50 border border-[rgba(96,99,238,0.15)] p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(96,99,238,0.1)]">
            <Users className="h-5 w-5 text-[#a3a6ff]" />
          </div>
          <div>
            <h3 className="text-title-md text-text-primary font-semibold">
              {invite.inviterName} wants to compare profiles
            </h3>
            <p className="text-body-sm text-text-secondary">
              Allow them to see how your personality types interact?
            </p>
          </div>
        </div>
        <button
          onClick={onDismissed}
          className="rounded-md p-1 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Quick action or expand */}
      {!expanded ? (
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-2 rounded-lg bg-[rgba(96,99,238,0.1)] px-4 py-2.5 text-sm font-medium text-[#a3a6ff] hover:bg-[rgba(96,99,238,0.15)] transition-colors"
          >
            <Shield className="h-4 w-4" />
            Choose what to share
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <span className="text-body-sm text-text-muted">
            You control exactly what they see.
          </span>
        </div>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-5 space-y-5"
          >
            {/* Share with Human */}
            <div>
              <label className="text-label-sm text-text-secondary font-medium mb-2 block">
                What do you want to share with {invite.inviterName}?
              </label>
              <div className="space-y-2">
                {SHARE_OPTIONS.map((opt) => (
                  <label
                    key={`human-${opt.value}`}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                      shareHuman === opt.value
                        ? 'border-[#a3a6ff] bg-[rgba(96,99,238,0.05)]'
                        : 'border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="shareHuman"
                      value={opt.value}
                      checked={shareHuman === opt.value}
                      onChange={() => setShareHuman(opt.value)}
                      className="mt-0.5 accent-[#a3a6ff]"
                    />
                    <div>
                      <span className="text-body-sm text-text-primary font-medium">
                        {opt.label}
                        {opt.value === 'type_compatibility' && (
                          <span className="ml-2 text-xs text-[#a3a6ff] font-normal">Recommended</span>
                        )}
                      </span>
                      <p className="text-body-sm text-text-muted mt-0.5">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Share with Coach */}
            <div>
              <label className="text-label-sm text-text-secondary font-medium mb-2 block">
                What do you want to share with {invite.inviterName}&apos;s coach?
              </label>
              <div className="space-y-2">
                {SHARE_OPTIONS.map((opt) => (
                  <label
                    key={`coach-${opt.value}`}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                      shareCoach === opt.value
                        ? 'border-[#a3a6ff] bg-[rgba(96,99,238,0.05)]'
                        : 'border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="shareCoach"
                      value={opt.value}
                      checked={shareCoach === opt.value}
                      onChange={() => setShareCoach(opt.value)}
                      className="mt-0.5 accent-[#a3a6ff]"
                    />
                    <div>
                      <span className="text-body-sm text-text-primary font-medium">
                        {opt.label}
                        {opt.value === 'full' && (
                          <span className="ml-2 text-xs text-[#a3a6ff] font-normal">Recommended</span>
                        )}
                      </span>
                      <p className="text-body-sm text-text-muted mt-0.5">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-body-sm text-text-muted">
                You can unshare anytime from Settings.
              </p>
              <button
                onClick={handleConsent}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Check className="h-4 w-4" /> Allow Comparison</>
                )}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
}
