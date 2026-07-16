"use client";

/**
 * PartnerInviteModal — the Relatti-native "bring your partner in" moment.
 *
 * Replaces the Decoded ShareModal (viral "share-to-unlock / social platforms /
 * Decoded by MasteryTV" gate) for relationship users. Here the partner is the
 * point, not a growth lever: warm framing, the real payoff (the coach knows you
 * both, you unlock what your partner needs to hear, you see your shared
 * blueprint), and the consent rule stated plainly.
 *
 * Backend is unchanged and already correct:
 *   • email path → POST /api/decoded/invite (brand-aware; sends the Relatti
 *     "understand your relationship together" email + forms the engagement).
 *   • copy path  → the caller's stable broadcast /invite/[id] URL.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Send, Loader2, Check, Copy, MessageCircle, Users } from "lucide-react";

interface PartnerInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Stable broadcast invite URL for the copy-link path. */
  inviteUrl: string;
  /** If the partner is already named (a forming dyad), personalize the ask. */
  partnerName?: string | null;
  /** Fired once an email invite is successfully sent. */
  onSent?: () => void;
}

const PAYOFFS: { icon: typeof Heart; text: string }[] = [
  { icon: MessageCircle, text: "Your coach understands you both — no taking sides, no re-explaining." },
  // NEVER imply these phrases are the partner's own words or anything they told
  // us — they're inferred from their assessment results, and this is the exact
  // surface where we ask someone to trust us with their partner. (Founder, 2026-07-16.)
  { icon: Heart, text: "You unlock “what your partner needs to hear” — based on their relationship style." },
  { icon: Users, text: "You see your shared blueprint: where you fit, where you'll rub, what to try." },
];

export default function PartnerInviteModal({
  isOpen,
  onClose,
  inviteUrl,
  partnerName,
  onSent,
}: PartnerInviteModalProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const who = partnerName?.trim() || "your partner";

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/decoded/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Couldn't send that invite. Please try again.");
        setSending(false);
        return;
      }
      setSentTo(trimmed);
      setSending(false);
      onSent?.();
    } catch {
      setError("Something went wrong. Please try again.");
      setSending(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "color-mix(in oklch, var(--color-surface-base) 70%, transparent)", backdropFilter: "blur(6px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-surface-50 p-6 shadow-2xl"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Invite your partner"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-100 hover:text-text-primary"
            >
              <X size={18} />
            </button>

            {sentTo ? (
              /* Success — reassure and set the expectation. */
              <div className="py-4 text-center">
                <span
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: "color-mix(in oklch, var(--color-accent-teal) 16%, transparent)" }}
                >
                  <Check className="h-7 w-7" style={{ color: "var(--color-accent-teal)" }} />
                </span>
                <h2 className="font-display text-xl font-semibold text-text-primary">
                  Invitation on its way
                </h2>
                <p className="mx-auto mt-2 max-w-xs text-sm text-text-secondary">
                  We emailed <span className="text-text-primary">{sentTo}</span> a warm invitation to
                  take their own relationship profile and join you. The moment they finish, your coach
                  can hold both of you — and your shared blueprint appears.
                </p>
                <button
                  onClick={onClose}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-text-inverse transition-transform hover:-translate-y-0.5"
                  style={{ background: "var(--color-primary-container)" }}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <span
                  className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: "color-mix(in oklch, var(--color-primary-container) 14%, transparent)" }}
                >
                  <Heart className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
                </span>
                <h2 className="font-display text-xl font-semibold text-text-primary">
                  Invite {who}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Relatti is built for two. When {who} takes their own quick profile, this stops being
                  about you and becomes about the two of you.
                </p>

                <ul className="mt-4 space-y-2.5">
                  {PAYOFFS.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-2.5 text-sm text-text-secondary">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--color-primary)" }} />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>

                <form onSubmit={handleSend} className="mt-5">
                  <label htmlFor="partner-email" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Their email
                  </label>
                  <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                    <input
                      id="partner-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="partner@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={sending}
                      className="min-w-0 flex-1 rounded-xl bg-surface-100 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2"
                      style={{ ["--tw-ring-color" as string]: "color-mix(in oklch, var(--color-primary-container) 40%, transparent)" }}
                    />
                    <button
                      type="submit"
                      disabled={sending || !email.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-text-inverse transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ background: "var(--color-primary-container)" }}
                    >
                      {sending ? <><Loader2 size={15} className="animate-spin" /> Sending</> : <><Send size={15} /> Send</>}
                    </button>
                  </div>
                  {error && <p className="mt-2 text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}
                </form>

                <div className="mt-4 flex items-center gap-3">
                  <span className="h-px flex-1 bg-surface-200" />
                  <span className="text-xs text-text-muted">or</span>
                  <span className="h-px flex-1 bg-surface-200" />
                </div>

                <button
                  onClick={handleCopy}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-surface-100 px-5 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-200"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Link copied — send it to them" : "Copy an invite link instead"}
                </button>

                <p className="mt-4 text-xs leading-relaxed text-text-muted">
                  Private by design: only your relationship style and attachment type are ever shared
                  between you — never your coaching conversations.
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
