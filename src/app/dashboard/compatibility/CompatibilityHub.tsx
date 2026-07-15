'use client';

/**
 * CompatibilityHub — the couples relationship hub (Relatti).
 *
 * A couples product = one relationship with ONE sharing level (full), but
 * connecting requires the right consent for how the pair met (2026-07-15):
 *   • no partner        → Invite Someone
 *   • invited, waiting  → status + Remind (max 3) / Change email / Uninvite
 *   • partner joined    → "finishing their quiz" (invite-link flow: taking the
 *                         quiz through the invite IS the consent → auto-full)
 *   • existing member   → connect REQUEST: they Accept/Decline here; nothing
 *                         is shared until they accept
 *   • connected         → View Compatibility Report / Remove (revocable)
 * A "Talk to your coach" link is always present at the bottom.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Send, Loader2, Clock, ArrowRight, Mail, Heart, UserCheck,
  MessageSquare, Bell, Pencil, X, Check,
} from 'lucide-react';
import PartnerInviteModal from '@/components/relatti/PartnerInviteModal';

interface SentInvite {
  id: string;
  recipient_email: string;
  recipient_id: string | null;
  recipient_report_id: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  consented_at: string | null;
  reminder_count: number | null;
  upgrade_requested_by: string | null;
  revoked_at: string | null;
}

interface ReceivedInvite {
  id: string;
  inviter_id: string;
  inviter_name: string | null;
  inviter_email: string | null;
  status: string;
  created_at: string;
  consented_at: string | null;
  recipient_report_id: string | null;
  upgrade_requested_by: string | null;
  revoked_at: string | null;
}

interface Props {
  userName: string;
  userId: string;
  sentInvites: SentInvite[];
  receivedInvites: ReceivedInvite[];
}

const MAX_REMINDERS = 3;

type PartnerState =
  | 'invited'      // sent, no account yet
  | 'joined'       // sent, account exists, quiz unfinished (invite-link flow)
  | 'connected'    // both consented — sharing
  | 'pending_me'   // received via invite link — finish quiz
  | 'request_in'   // they asked to connect — Accept / Decline
  | 'request_out'  // I asked to connect — waiting on them
  | 'removed';     // disconnected (revoked) — can re-invite

interface PartnerRow {
  inviteId: string;
  label: string;
  email?: string;
  state: PartnerState;
  reminderCount: number;
}

function isConnected(status: string): boolean {
  return status === 'consented' || status === 'connected';
}

export default function CompatibilityHub({ userId, sentInvites, receivedInvites }: Props) {
  const router = useRouter();
  const [showShareModal, setShowShareModal] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ── Derive the (usually single) relationship from both sides ──
  // Consent states (2026-07-15): an invite to an EXISTING member carries
  // upgrade_requested_by (a connect request) — it never auto-connects; the
  // recipient Accepts/Declines. revoked_at marks removed/declined connections.
  const sentPartners: PartnerRow[] = sentInvites.map((inv) => ({
    inviteId: inv.id,
    label: inv.recipient_email,
    state: isConnected(inv.status) ? 'connected'
      : inv.revoked_at ? 'removed'
      : inv.upgrade_requested_by === userId && inv.recipient_id ? 'request_out'
      : inv.recipient_id ? 'joined'
      : 'invited',
    reminderCount: inv.reminder_count ?? 0,
  }));
  const receivedPartners: PartnerRow[] = receivedInvites
    // A declined/removed received request disappears for the recipient.
    .filter((inv) => !(inv.revoked_at && !isConnected(inv.status)))
    .map((inv) => ({
      inviteId: inv.id,
      label: inv.inviter_name || inv.inviter_email?.split('@')[0] || 'Your partner',
      email: inv.inviter_email ?? undefined,
      state: isConnected(inv.status) ? 'connected'
        : inv.upgrade_requested_by && inv.upgrade_requested_by !== userId
          ? (inv.recipient_report_id ? 'request_in' : 'pending_me')
          : 'pending_me',
      reminderCount: 0,
    }));
  const partners = [...sentPartners, ...receivedPartners];
  const showInvite = partners.length === 0;

  // ── Consent actions: accept a request / decline / remove a connection ──
  async function consent(inviteId: string, level: 'full' | 'none') {
    setBusy(inviteId);
    setError(null);
    try {
      const res = await fetch('/api/decoded/invite-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, shareLevel: level }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setConfirmingRemove(null);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  // Re-invite after a removal — same email, fresh request.
  async function reinvite(email: string) {
    setBusy(email);
    setError(null);
    try {
      const res = await fetch('/api/decoded/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  // ── Manage actions (invited state only) ──
  async function manage(inviteId: string, action: 'remind' | 'uninvite' | 'changeEmail', email?: string) {
    setBusy(inviteId);
    setError(null);
    try {
      const res = await fetch('/api/relatti/manage-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setEditing(null);
      setNewEmail('');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  const ctaGradient = { background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-container))' };
  const softPrimary = { background: 'color-mix(in oklch, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)' };

  // Broadcast invite link for PartnerInviteModal's copy path (its email path always works).
  const broadcastInvite = sentInvites.find((i) => i.recipient_email === 'broadcast');
  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${broadcastInvite ? `/invite/${broadcastInvite.id}` : '/assess'}`
    : '';

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-display-sm text-text-primary font-bold">Compatibility</h1>
          <p className="mt-1 text-body-md text-text-secondary">
            {showInvite
              ? 'Invite your partner so your coach can understand you both.'
              : 'Where you two fit, where it gets hard, and how to love each other well.'}
          </p>
        </div>

        {/* ── Invite Someone (until a partner is in the picture) ── */}
        {showInvite && (
          <section className="mb-6 rounded-2xl bg-surface-50 p-6" style={{ border: '1px solid color-mix(in oklch, var(--color-primary) 14%, transparent)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'color-mix(in oklch, var(--color-primary) 12%, transparent)' }}>
                <Send className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
              </div>
              <div>
                <h2 className="text-title-md text-text-primary font-semibold">Invite your partner</h2>
                <p className="text-body-sm text-text-secondary">Send an invite by email or share your link.</p>
              </div>
            </div>
            <button
              onClick={() => setShowShareModal(true)}
              className="mt-2 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={ctaGradient}
            >
              <Mail className="h-4 w-4" />
              Invite your partner
            </button>
          </section>
        )}

        {/* ── The relationship(s) ── */}
        {partners.length > 0 && (
          <section className="space-y-3">
            {partners.map((p) => (
              <div key={p.inviteId} className="rounded-xl bg-surface-50 p-4" style={{ border: '1px solid color-mix(in oklch, var(--color-primary) 12%, transparent)' }}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold" style={softPrimary}>
                      {(p.label[0] || '?').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-body-md text-text-primary font-medium truncate">{p.label}</p>
                      <StatusLine state={p.state} email={p.email} />
                    </div>
                  </div>

                  {p.state === 'connected' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/compatibility/${p.inviteId}`}
                        className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                        style={ctaGradient}
                      >
                        View Compatibility Report <ArrowRight className="h-4 w-4" />
                      </Link>
                      {confirmingRemove === p.inviteId ? (
                        <span className="flex items-center gap-2">
                          <button
                            onClick={() => consent(p.inviteId, 'none')}
                            disabled={busy === p.inviteId}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            style={{ background: 'var(--color-danger)' }}
                          >
                            {busy === p.inviteId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                            Yes, remove
                          </button>
                          <button
                            onClick={() => setConfirmingRemove(null)}
                            className="rounded-lg px-2 py-2 text-xs font-medium text-text-muted hover:text-text-primary"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmingRemove(p.inviteId)}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-text-muted hover:text-danger transition-colors"
                        >
                          <X className="h-3.5 w-3.5" /> Remove
                        </button>
                      )}
                    </div>
                  )}
                  {p.state === 'request_in' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => consent(p.inviteId, 'full')}
                        disabled={busy === p.inviteId}
                        className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={ctaGradient}
                      >
                        {busy === p.inviteId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Accept
                      </button>
                      <button
                        onClick={() => consent(p.inviteId, 'none')}
                        disabled={busy === p.inviteId}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:text-danger transition-colors disabled:opacity-50"
                      >
                        <X className="h-4 w-4" /> Decline
                      </button>
                    </div>
                  )}
                  {p.state === 'removed' && (
                    <button
                      onClick={() => reinvite(p.label)}
                      disabled={busy === p.label}
                      className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
                      style={softPrimary}
                    >
                      {busy === p.label ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Invite again
                    </button>
                  )}
                  {p.state === 'pending_me' && (
                    <Link
                      href="/assess"
                      className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      style={ctaGradient}
                    >
                      Finish your quiz <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>

                {/* Invited (not joined) → remind / change email / uninvite */}
                {p.state === 'invited' && (
                  <div className="mt-4 pl-12">
                    {editing === p.inviteId ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="new@email.com"
                          className="rounded-lg bg-surface-100 px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted"
                          style={{ border: '1px solid color-mix(in oklch, var(--color-primary) 15%, transparent)' }}
                        />
                        <button
                          onClick={() => manage(p.inviteId, 'changeEmail', newEmail)}
                          disabled={busy === p.inviteId || !newEmail.trim()}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={ctaGradient}
                        >
                          <Check className="h-3.5 w-3.5" /> Save &amp; resend
                        </button>
                        <button onClick={() => { setEditing(null); setError(null); }} className="rounded-lg px-2 py-2 text-xs font-medium text-text-muted hover:text-text-primary">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => manage(p.inviteId, 'remind')}
                          disabled={busy === p.inviteId || p.reminderCount >= MAX_REMINDERS}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
                          style={{ background: 'color-mix(in oklch, var(--color-primary) 10%, transparent)', color: 'var(--color-primary)' }}
                        >
                          {busy === p.inviteId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                          {p.reminderCount >= MAX_REMINDERS
                            ? 'Reminder limit reached'
                            : `Send reminder${p.reminderCount > 0 ? ` (${MAX_REMINDERS - p.reminderCount} left)` : ''}`}
                        </button>
                        <button
                          onClick={() => { setEditing(p.inviteId); setNewEmail(''); setError(null); }}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Change email
                        </button>
                        <button
                          onClick={() => manage(p.inviteId, 'uninvite')}
                          disabled={busy === p.inviteId}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted hover:text-danger transition-colors"
                        >
                          <X className="h-3.5 w-3.5" /> Uninvite
                        </button>
                      </div>
                    )}
                    {error && busy === null && <p className="mt-2 text-xs text-danger">{error}</p>}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {/* ── Always: talk to your coach ── */}
        <div className="mt-8 rounded-xl bg-surface-50 p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'color-mix(in oklch, var(--color-primary) 10%, transparent)' }}>
              <MessageSquare className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <p className="text-body-md text-text-primary font-medium">Talk to your coach</p>
              <p className="text-body-sm text-text-secondary">Questions about your relationship? Your coach is here.</p>
            </div>
          </div>
          <Link
            href="/dashboard/chat"
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            style={softPrimary}
          >
            Open coach <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <PartnerInviteModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onSent={() => { setShowShareModal(false); router.refresh(); }}
        inviteUrl={inviteUrl}
      />
    </div>
  );
}

function StatusLine({ state, email }: { state: PartnerState; email?: string }) {
  if (state === 'connected') {
    return (
      <span className="flex items-center gap-1.5 text-body-sm" style={{ color: 'var(--color-primary)' }}>
        <Heart className="h-3.5 w-3.5" /> Connected — you can see each other fully
      </span>
    );
  }
  if (state === 'request_in') {
    return (
      <span className="flex items-start gap-1.5 text-body-sm text-text-secondary">
        <Heart className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: 'var(--color-primary)' }} />
        <span>
          {email ? `(${email}) ` : ''}wants to connect and share assessments and a compatibility report
        </span>
      </span>
    );
  }
  if (state === 'request_out') {
    return (
      <span className="flex items-center gap-1.5 text-body-sm text-text-secondary">
        <Clock className="h-3.5 w-3.5" /> Request sent — waiting for them to accept
      </span>
    );
  }
  if (state === 'removed') {
    return (
      <span className="flex items-center gap-1.5 text-body-sm text-text-muted">
        <X className="h-3.5 w-3.5" /> Disconnected — you no longer share
      </span>
    );
  }
  if (state === 'joined') {
    return (
      <span className="flex items-center gap-1.5 text-body-sm text-text-secondary">
        <UserCheck className="h-3.5 w-3.5" /> Joined — finishing their quiz
      </span>
    );
  }
  if (state === 'pending_me') {
    return (
      <span className="flex items-center gap-1.5 text-body-sm text-text-secondary">
        <Clock className="h-3.5 w-3.5" /> Invited you — finish your quiz to connect
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-body-sm text-text-muted">
      <Clock className="h-3.5 w-3.5" /> Invited — waiting for them to join
    </span>
  );
}
