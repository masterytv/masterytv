'use client';

/**
 * CompatibilityHub — Central page for relationship management.
 *
 * Two-step sharing flow:
 *   1. Either party clicks "Request Compatibility" and picks a level
 *   2. The other party sees "Accept Request" and picks their level
 *   3. The effective level is the mutual minimum (least permissive wins)
 *
 * Sections:
 *   1. Invite Someone — Invite new people to take the assessment
 *   2. People Who Invited You — Received invites + request/accept flow
 *   3. Your Requests — Sent invites with status tracking + request/accept flow
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Heart, Users, Send, Loader2, Check, X, Clock, Shield,
  ArrowRight, Mail, ChevronDown, FileText,
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
  upgrade_requested_level: string | null;
  upgrade_requested_by: string | null;
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
  upgrade_requested_level: string | null;
  upgrade_requested_by: string | null;
}

interface Props {
  userName: string;
  userId: string;
  sentInvites: SentInvite[];
  receivedInvites: ReceivedInvite[];
}

type ShareLevel = 'type_compatibility' | 'full';

const SHARE_OPTIONS: Array<{ value: ShareLevel; label: string; desc: string }> = [
  {
    value: 'type_compatibility',
    label: 'Compatibility Report',
    desc: 'Your personality archetype + how your personalities interact',
  },
  {
    value: 'full',
    label: 'Full Report + Compatibility',
    desc: 'Your complete Decoded report + compatibility analysis',
  },
];

export default function CompatibilityHub({ userName, userId, sentInvites, receivedInvites }: Props) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<Record<string, ShareLevel>>({});
  const router = useRouter();

  // Categorize received invites
  const pendingConsent = receivedInvites.filter((i) => i.status === 'completed');
  const connected = receivedInvites.filter((i) => i.status === 'consented' || i.status === 'connected');
  const allReceived = [...pendingConsent, ...connected];

  // ── Actions ──

  /** Step 1: Request compatibility sharing */
  async function handleRequest(inviteId: string) {
    const level = selectedLevel[inviteId] || 'type_compatibility';
    setSaving(inviteId);
    try {
      await fetch('/api/decoded/compatibility-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, level }),
      });
      router.refresh();
    } catch {
      // silent
    } finally {
      setSaving(null);
      setExpandedCard(null);
    }
  }

  /** Step 2: Accept a compatibility request (mutual minimum computed server-side) */
  async function handleAccept(inviteId: string) {
    const level = selectedLevel[inviteId] || 'type_compatibility';
    setSaving(inviteId);
    try {
      await fetch('/api/decoded/invite-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, shareLevel: level }),
      });
      router.refresh();
    } catch {
      // silent
    } finally {
      setSaving(null);
      setExpandedCard(null);
    }
  }

  /** Revoke sharing */
  async function handleRevoke(inviteId: string) {
    setSaving(inviteId);
    try {
      await fetch('/api/decoded/invite-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, shareLevel: 'none' }),
      });
      router.refresh();
    } catch {
      // silent
    } finally {
      setSaving(null);
    }
  }

  // ── Shared UI components ──

  /** Inline share-level picker (2 options) */
  function ShareLevelPicker({ inviteId, actionLabel, onSubmit }: {
    inviteId: string;
    actionLabel: string;
    onSubmit: (id: string) => void;
  }) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="mt-4 space-y-3 overflow-hidden"
      >
        <label className="text-label-sm text-text-secondary font-medium block">
          What would you like to share?
        </label>
        <div className="space-y-1.5">
          {SHARE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-all text-sm ${
                (selectedLevel[inviteId] || 'type_compatibility') === opt.value
                  ? 'border-[#a3a6ff] bg-[rgba(96,99,238,0.05)]'
                  : 'border-surface-200 hover:border-surface-300'
              }`}
            >
              <input
                type="radio"
                name={`level-${inviteId}`}
                checked={(selectedLevel[inviteId] || 'type_compatibility') === opt.value}
                onChange={() => setSelectedLevel((p) => ({ ...p, [inviteId]: opt.value }))}
                className="accent-[#a3a6ff] mt-0.5"
              />
              <div>
                <span className="text-text-primary font-medium">{opt.label}</span>
                <p className="text-body-sm text-text-muted mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
        <p className="text-body-sm text-text-muted">
          The final sharing level is the mutual minimum — if either party picks Compatibility Report, both get that level.
        </p>
        <div className="flex items-center justify-end pt-1">
          <button
            onClick={() => onSubmit(inviteId)}
            disabled={saving === inviteId}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving === inviteId ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              <><Send className="h-4 w-4" /> {actionLabel}</>
            )}
          </button>
        </div>
      </motion.div>
    );
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

        {/* ═══ Invite Someone ═══ */}
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

        {/* ═══ People Who Invited You ═══ */}
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
                People Who Invited You
              </h2>
              <span className="text-label-sm text-text-muted ml-auto">
                {allReceived.length} {allReceived.length === 1 ? 'person' : 'people'}
              </span>
            </div>

            <div className="space-y-3">
              {allReceived.map((inv) => {
                const isConnected = inv.status === 'consented' || inv.status === 'connected';
                const isExpanded = expandedCard === `recv-${inv.id}`;
                const inviterName = inv.inviter_name || inv.inviter_email?.split('@')[0] || 'Someone';

                // Determine which state this invite is in
                const theyRequested = inv.upgrade_requested_level && inv.upgrade_requested_by && inv.upgrade_requested_by !== userId;
                const iRequested = inv.upgrade_requested_level && inv.upgrade_requested_by === userId;
                const noRequest = !inv.upgrade_requested_level;

                const requestedLevelLabel = inv.upgrade_requested_level === 'full'
                  ? 'Full Report + Compatibility'
                  : 'Compatibility Report';

                return (
                  <div key={inv.id}>
                    <motion.div
                      layout
                      className={`rounded-xl border p-4 transition-colors ${
                        isConnected
                          ? 'border-surface-200 bg-surface-50'
                          : theyRequested
                            ? 'border-[rgba(96,99,238,0.2)] bg-[rgba(96,99,238,0.02)]'
                            : 'border-surface-200 bg-surface-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            isConnected
                              ? 'bg-[rgba(96,99,238,0.1)] text-[#a3a6ff]'
                              : theyRequested
                                ? 'bg-[rgba(96,99,238,0.1)] text-[#a3a6ff]'
                                : 'bg-emerald-400/10 text-emerald-400'
                          }`}>
                            {(inv.inviter_name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-body-md text-text-primary font-medium">
                              {inviterName}
                            </p>
                            <p className="text-body-sm text-text-muted">
                              {inv.inviter_email || ''}
                            </p>
                          </div>
                        </div>

                        {isConnected ? (
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/decoded/compatibility/${inv.id}`}
                              className="flex items-center gap-1.5 rounded-lg bg-[rgba(96,99,238,0.1)] px-3 py-1.5 text-sm font-medium text-[#a3a6ff] hover:bg-[rgba(96,99,238,0.15)] transition-colors"
                            >
                              View Report <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              onClick={() => handleRevoke(inv.id)}
                              disabled={saving === inv.id}
                              className="rounded-lg px-2 py-1.5 text-xs font-medium text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            >
                              Unshare
                            </button>
                          </div>
                        ) : theyRequested ? (
                          /* They sent a request — show Accept */
                          <button
                            onClick={() => setExpandedCard(isExpanded ? null : `recv-${inv.id}`)}
                            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                          >
                            <Heart className="h-3.5 w-3.5" />
                            Accept Request
                            <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        ) : iRequested ? (
                          /* I already sent a request — waiting */
                          <span className="flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-400">
                            <Clock className="h-3 w-3" />
                            Request Sent
                          </span>
                        ) : noRequest ? (
                          /* No request yet — show Request Compatibility */
                          <button
                            onClick={() => setExpandedCard(isExpanded ? null : `recv-${inv.id}`)}
                            className="flex items-center gap-1.5 rounded-lg bg-[rgba(96,99,238,0.1)] px-3 py-1.5 text-sm font-medium text-[#a3a6ff] hover:bg-[rgba(96,99,238,0.15)] transition-colors"
                          >
                            <Heart className="h-3.5 w-3.5" />
                            Request Compatibility
                            <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        ) : null}
                      </div>

                      {/* They sent a request — show what they requested */}
                      {theyRequested && !isExpanded && (
                        <p className="mt-2 ml-11 text-body-sm text-text-secondary">
                          <strong>{inviterName}</strong> requested <strong>{requestedLevelLabel}</strong> sharing
                        </p>
                      )}

                      {/* Expanded picker */}
                      <AnimatePresence>
                        {isExpanded && (
                          <ShareLevelPicker
                            inviteId={inv.id}
                            actionLabel={theyRequested ? 'Accept & Share' : 'Send Request'}
                            onSubmit={theyRequested ? handleAccept : handleRequest}
                          />
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>
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
              {sentInvites.map((inv) => {
                const isConnected = inv.status === 'consented' || inv.status === 'connected';
                const isExpanded = expandedCard === `sent-${inv.id}`;

                // Determine state
                const theyRequested = inv.upgrade_requested_level && inv.upgrade_requested_by && inv.upgrade_requested_by !== userId;
                const iRequested = inv.upgrade_requested_level && inv.upgrade_requested_by === userId;
                const noRequest = !inv.upgrade_requested_level;
                const assessmentComplete = inv.status === 'completed';

                const requestedLevelLabel = inv.upgrade_requested_level === 'full'
                  ? 'Full Report + Compatibility'
                  : 'Compatibility Report';

                return (
                  <div key={inv.id}>
                    {isConnected ? (
                      /* Connected — link to report */
                      <Link
                        href={`/decoded/compatibility/${inv.id}`}
                        className="flex items-center justify-between rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 hover:border-[rgba(96,99,238,0.3)] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold bg-[rgba(96,99,238,0.1)] text-[#a3a6ff]">
                            {inv.recipient_email[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-body-md text-text-primary font-medium truncate">
                              {inv.recipient_email}
                            </p>
                            <p className="text-body-sm text-text-muted">
                              Connected {inv.consented_at ? new Date(inv.consented_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 rounded-lg bg-[rgba(96,99,238,0.1)] px-3 py-1.5 text-sm font-medium text-[#a3a6ff]">
                            View Report <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                          <StatusBadge status="connected" />
                        </div>
                      </Link>
                    ) : assessmentComplete ? (
                      /* Assessment complete — show request/accept states */
                      <div className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold bg-emerald-400/10 text-emerald-400">
                              {inv.recipient_email[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-body-md text-text-primary font-medium truncate">
                                {inv.recipient_email}
                              </p>
                              <p className="text-body-sm text-emerald-400">
                                Assessment complete
                              </p>
                            </div>
                          </div>

                          {theyRequested ? (
                            /* They requested — show Accept */
                            <button
                              onClick={() => setExpandedCard(isExpanded ? null : `sent-${inv.id}`)}
                              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                            >
                              <Heart className="h-3.5 w-3.5" />
                              Accept Request
                              <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          ) : iRequested ? (
                            /* I already requested — waiting */
                            <span className="flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-400">
                              <Clock className="h-3 w-3" />
                              Request Sent
                            </span>
                          ) : noRequest ? (
                            /* No request — show CTA */
                            <button
                              onClick={() => setExpandedCard(isExpanded ? null : `sent-${inv.id}`)}
                              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#a3a6ff] to-[#6063ee] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                            >
                              <Heart className="h-3.5 w-3.5" />
                              Request Compatibility
                            </button>
                          ) : null}
                        </div>

                        {/* They sent a request — show what they requested */}
                        {theyRequested && !isExpanded && (
                          <p className="mt-2 ml-11 text-body-sm text-text-secondary">
                            <strong>{inv.recipient_email.split('@')[0]}</strong> requested <strong>{requestedLevelLabel}</strong> sharing
                          </p>
                        )}

                        {/* I sent a request — show what I requested */}
                        {iRequested && (
                          <p className="mt-2 ml-11 text-body-sm text-text-muted">
                            You requested <strong>{requestedLevelLabel}</strong> · Waiting for response
                          </p>
                        )}

                        {/* Expanded picker */}
                        <AnimatePresence>
                          {isExpanded && (
                            <ShareLevelPicker
                              inviteId={inv.id}
                              actionLabel={theyRequested ? 'Accept & Share' : 'Send Request'}
                              onSubmit={theyRequested ? handleAccept : handleRequest}
                            />
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      /* Pending — assessment not taken yet */
                      <div className="flex items-center justify-between rounded-xl border border-surface-200 bg-surface-50 px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold bg-amber-400/10 text-amber-400">
                            {inv.recipient_email[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-body-md text-text-primary font-medium truncate">
                              {inv.recipient_email}
                            </p>
                            <p className="text-body-sm text-text-muted">
                              Invited {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · Assessment pending
                            </p>
                          </div>
                        </div>
                        <StatusBadge status="pending" />
                      </div>
                    )}
                  </div>
                );
              })}
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

const statusConfig: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  pending: {
    label: 'Invite Sent',
    icon: <Clock className="h-3 w-3" />,
    cls: 'text-amber-400 bg-amber-400/10',
  },
  completed: {
    label: 'Ready',
    icon: <Check className="h-3 w-3" />,
    cls: 'text-emerald-400 bg-emerald-400/10',
  },
  consented: {
    label: 'Connected',
    icon: <Heart className="h-3 w-3" />,
    cls: 'text-[#a3a6ff] bg-[rgba(96,99,238,0.1)]',
  },
  connected: {
    label: 'Connected',
    icon: <Heart className="h-3 w-3" />,
    cls: 'text-[#a3a6ff] bg-[rgba(96,99,238,0.1)]',
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
