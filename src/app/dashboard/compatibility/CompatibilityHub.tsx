'use client';

/**
 * CompatibilityHub — Central page for relationship management.
 *
 * Sections:
 * 1. Request Access — Invite someone new or request sharing from existing user
 * 2. People Who Shared With You — Received invites + consent management
 * 3. Your Requests — Sent invites with status tracking
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Heart, Users, Send, Loader2, Check, X, Clock, Shield,
  ArrowRight, Copy, ExternalLink, ChevronDown, Mail,
} from 'lucide-react';
import ShareModal from '@/components/decoded/ShareModal';

interface SentInvite {
  id: string;
  recipient_email: string;
  recipient_id: string | null;
  status: string;
  share_with_human: string | null;
  share_with_coach: string | null;
  compatibility_report: unknown | null;
  created_at: string;
  completed_at: string | null;
  consented_at: string | null;
}

interface ReceivedInvite {
  id: string;
  inviter_id: string;
  inviter_name: string | null;
  inviter_email: string | null;
  status: string;
  share_with_human: string | null;
  share_with_coach: string | null;
  compatibility_report: unknown | null;
  created_at: string;
  consented_at: string | null;
}

interface Props {
  userName: string;
  userId: string;
  sentInvites: SentInvite[];
  receivedInvites: ReceivedInvite[];
}

type ShareLevel = 'none' | 'compatibility' | 'type_compatibility' | 'full';

const SHARE_OPTIONS: Array<{ value: ShareLevel; label: string; desc: string; rec?: 'human' | 'coach' }> = [
  { value: 'compatibility', label: 'Compatibility Report', desc: 'How your personalities interact' },
  { value: 'type_compatibility', label: 'Type + Compatibility', desc: 'Your archetype + relationship dynamic', rec: 'human' },
  { value: 'full', label: 'Full Report', desc: 'All 13 dimensions of your personality', rec: 'coach' },
];

export default function CompatibilityHub({ userName, userId, sentInvites, receivedInvites }: Props) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [expandedConsent, setExpandedConsent] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [shareHuman, setShareHuman] = useState<Record<string, ShareLevel>>({});
  const [shareCoach, setShareCoach] = useState<Record<string, ShareLevel>>({});
  const router = useRouter();

  // Categorize received invites
  const pendingConsent = receivedInvites.filter((i) => i.status === 'completed');
  const connected = receivedInvites.filter((i) => i.status === 'consented' || i.status === 'connected');
  const allReceived = [...pendingConsent, ...connected];

  // Categorize sent invites
  const pendingSent = sentInvites.filter((i) => i.status === 'pending');
  const completedSent = sentInvites.filter((i) => i.status === 'completed');
  const connectedSent = sentInvites.filter((i) => i.status === 'consented' || i.status === 'connected');

  async function handleConsent(inviteId: string) {
    setSaving(inviteId);
    const h = shareHuman[inviteId] || 'type_compatibility';
    const c = shareCoach[inviteId] || 'full';

    try {
      await fetch('/api/decoded/invite-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, shareWithHuman: h, shareWithCoach: c }),
      });
      router.refresh();
    } catch {
      // silent
    } finally {
      setSaving(null);
    }
  }

  async function handleRevoke(inviteId: string) {
    setSaving(inviteId);
    try {
      await fetch('/api/decoded/invite-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, shareWithHuman: 'none', shareWithCoach: 'none' }),
      });
      router.refresh();
    } catch {
      // silent
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-display-sm text-text-primary font-bold">
            Compatibility
          </h1>
          <p className="mt-1 text-body-md text-text-secondary">
            Compare personality profiles and discover relationship dynamics.
          </p>
        </motion.div>

        {/* ═══ Request Access ═══ */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <div className="rounded-2xl border border-[rgba(96,99,238,0.15)] bg-surface-50 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(96,99,238,0.1)]">
                <Send className="h-5 w-5 text-[#a3a6ff]" />
              </div>
              <div>
                <h2 className="text-title-md text-text-primary font-semibold">
                  Invite Someone
                </h2>
                <p className="text-body-sm text-text-secondary">
                  Send an invite via email or share a link
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowShareModal(true)}
              className="mt-2 flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              <Mail className="h-4 w-4" />
              Send Invite
            </button>
          </div>
        </motion.section>

        {/* ═══ People Who Shared With You ═══ */}
        {allReceived.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-[#a3a6ff]" />
              <h2 className="text-title-md text-text-primary font-semibold">
                Sharing Requests
              </h2>
              <span className="text-label-sm text-text-muted ml-auto">
                {allReceived.length} {allReceived.length === 1 ? 'person' : 'people'}
              </span>
            </div>

            <div className="space-y-3">
              {allReceived.map((inv) => {
                const isPending = inv.status === 'completed';
                const isExpanded = expandedConsent === inv.id;

                return (
                  <motion.div
                    key={inv.id}
                    layout
                    className={`rounded-xl border p-4 transition-colors ${
                      isPending
                        ? 'border-amber-400/20 bg-amber-400/5'
                        : 'border-surface-200 bg-surface-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isPending ? 'bg-amber-400/15 text-amber-400' : 'bg-[rgba(96,99,238,0.1)] text-[#a3a6ff]'
                        }`}>
                          {(inv.inviter_name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-body-md text-text-primary font-medium">
                            {inv.inviter_name || 'Someone'}
                          </p>
                          <p className="text-body-sm text-text-muted">
                            {inv.inviter_email || ''}
                          </p>
                        </div>
                      </div>

                      {isPending ? (
                        <button
                          onClick={() => setExpandedConsent(isExpanded ? null : inv.id)}
                          className="flex items-center gap-1.5 rounded-lg bg-amber-400/10 px-3 py-1.5 text-sm font-medium text-amber-400 hover:bg-amber-400/20 transition-colors"
                        >
                          <Shield className="h-3.5 w-3.5" />
                          Review
                          <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          {!!inv.compatibility_report && (
                            <Link
                              href={`/decoded/compatibility/${inv.id}`}
                              className="flex items-center gap-1.5 rounded-lg bg-[rgba(96,99,238,0.1)] px-3 py-1.5 text-sm font-medium text-[#a3a6ff] hover:bg-[rgba(96,99,238,0.15)] transition-colors"
                            >
                              View Report <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          )}
                          <button
                            onClick={() => handleRevoke(inv.id)}
                            disabled={saving === inv.id}
                            className="rounded-lg px-2 py-1.5 text-xs font-medium text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          >
                            Unshare
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Expanded consent form */}
                    <AnimatePresence>
                      {isPending && isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 space-y-4 overflow-hidden"
                        >
                          {/* Share with human */}
                          <div>
                            <label className="text-label-sm text-text-secondary font-medium mb-2 block">
                              Share with {inv.inviter_name || 'them'}
                            </label>
                            <div className="space-y-1.5">
                              {SHARE_OPTIONS.map((opt) => (
                                <label
                                  key={`h-${opt.value}`}
                                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-all text-sm ${
                                    (shareHuman[inv.id] || 'type_compatibility') === opt.value
                                      ? 'border-[#a3a6ff] bg-[rgba(96,99,238,0.05)]'
                                      : 'border-surface-200 hover:border-surface-300'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`human-${inv.id}`}
                                    checked={(shareHuman[inv.id] || 'type_compatibility') === opt.value}
                                    onChange={() => setShareHuman((p) => ({ ...p, [inv.id]: opt.value }))}
                                    className="accent-[#a3a6ff]"
                                  />
                                  <span className="text-text-primary font-medium">{opt.label}</span>
                                  {opt.rec === 'human' && <span className="text-xs text-[#a3a6ff]">Recommended</span>}
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Share with coach */}
                          <div>
                            <label className="text-label-sm text-text-secondary font-medium mb-2 block">
                              Share with {inv.inviter_name || 'their'}&apos;s AI Coach
                            </label>
                            <div className="space-y-1.5">
                              {SHARE_OPTIONS.map((opt) => (
                                <label
                                  key={`c-${opt.value}`}
                                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-all text-sm ${
                                    (shareCoach[inv.id] || 'full') === opt.value
                                      ? 'border-[#a3a6ff] bg-[rgba(96,99,238,0.05)]'
                                      : 'border-surface-200 hover:border-surface-300'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`coach-${inv.id}`}
                                    checked={(shareCoach[inv.id] || 'full') === opt.value}
                                    onChange={() => setShareCoach((p) => ({ ...p, [inv.id]: opt.value }))}
                                    className="accent-[#a3a6ff]"
                                  />
                                  <span className="text-text-primary font-medium">{opt.label}</span>
                                  {opt.rec === 'coach' && <span className="text-xs text-[#a3a6ff]">Recommended</span>}
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <p className="text-body-sm text-text-muted">You can unshare anytime.</p>
                            <button
                              onClick={() => handleConsent(inv.id)}
                              disabled={saving === inv.id}
                              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                              {saving === inv.id ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                              ) : (
                                <><Check className="h-4 w-4" /> Allow</>
                              )}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* ═══ Your Requests (Sent) ═══ */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-[#69f6b8]" />
            <h2 className="text-title-md text-text-primary font-semibold">
              Your Requests
            </h2>
            <span className="text-label-sm text-text-muted ml-auto">
              {sentInvites.length} sent
            </span>
          </div>

          {sentInvites.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-200 p-8 text-center">
              <Heart className="h-8 w-8 text-text-muted/30 mx-auto mb-3" />
              <p className="text-body-md text-text-secondary">
                No invites sent yet.
              </p>
              <p className="text-body-sm text-text-muted mt-1">
                Send an invite above to compare personality profiles.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sentInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-xl border border-surface-200 bg-surface-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      statusConfig[inv.status]?.avatarCls || 'bg-surface-200 text-text-muted'
                    }`}>
                      {inv.recipient_email[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-body-md text-text-primary font-medium truncate">
                        {inv.recipient_email}
                      </p>
                      <p className="text-body-sm text-text-muted">
                        Invited {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {(inv.status === 'consented' || inv.status === 'connected') && !!inv.compatibility_report && (
                      <Link
                        href={`/decoded/compatibility/${inv.id}`}
                        className="flex items-center gap-1.5 rounded-lg bg-[rgba(96,99,238,0.1)] px-3 py-1.5 text-sm font-medium text-[#a3a6ff] hover:bg-[rgba(96,99,238,0.15)] transition-colors"
                      >
                        View Report <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      </div>

      {/* Share modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onUnlock={() => {
          setShowShareModal(false);
          router.refresh();
        }}
        shareUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/decoded`}
      />
    </div>
  );
}

// ── Status config ──

const statusConfig: Record<string, { label: string; icon: React.ReactNode; cls: string; avatarCls: string }> = {
  pending: {
    label: 'Pending',
    icon: <Clock className="h-3 w-3" />,
    cls: 'text-amber-400 bg-amber-400/10',
    avatarCls: 'bg-amber-400/10 text-amber-400',
  },
  completed: {
    label: 'Taken',
    icon: <Check className="h-3 w-3" />,
    cls: 'text-emerald-400 bg-emerald-400/10',
    avatarCls: 'bg-emerald-400/10 text-emerald-400',
  },
  consented: {
    label: 'Connected',
    icon: <Heart className="h-3 w-3" />,
    cls: 'text-[#a3a6ff] bg-[rgba(96,99,238,0.1)]',
    avatarCls: 'bg-[rgba(96,99,238,0.1)] text-[#a3a6ff]',
  },
  connected: {
    label: 'Connected',
    icon: <Heart className="h-3 w-3" />,
    cls: 'text-[#a3a6ff] bg-[rgba(96,99,238,0.1)]',
    avatarCls: 'bg-[rgba(96,99,238,0.1)] text-[#a3a6ff]',
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.cls}`}>
      {config.icon}
      {config.label}
    </span>
  );
}
