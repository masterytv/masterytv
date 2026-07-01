"use client";

/**
 * DepartedRelationshipNotice — shown on the Relatti dashboard when a partner
 * deleted their account. delete-user-data leaves a PII-free tombstone on the
 * shared engagement (only the fact a partner left + a timestamp — nothing about
 * who they were), so instead of the relationship silently vanishing we tell the
 * surviving partner calmly, reassure them their own data is safe, and offer to
 * reconnect. Dismissible (writes metadata.partner_departed_dismissed).
 *
 * BRAND.md: Lucide-only single-color icons, semantic tokens, light + dark safe,
 * no structural 1px borders (ghost inset only).
 */

import { useState } from "react";
import { UserMinus, X, Copy, Check } from "lucide-react";

export default function DepartedRelationshipNotice({
  engagementId,
  inviteUrl,
}: {
  engagementId: string;
  inviteUrl: string;
}) {
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState(false);

  if (hidden) return null;

  async function dismiss() {
    setHidden(true); // optimistic — reappears next load only if the write failed
    try {
      await fetch("/api/relatti/dismiss-departed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engagementId }),
      });
    } catch {
      // best-effort; nothing user-facing to do on failure
    }
  }

  function copyInvite() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section
      className="relative mb-6 rounded-2xl bg-surface-50 p-6"
      style={{
        boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--color-text-muted) 12%, transparent)",
      }}
    >
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-4 top-4 rounded-lg p-1 text-text-muted transition-colors hover:text-text-primary"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "var(--color-surface-100)" }}
        >
          <UserMinus className="h-5 w-5" style={{ color: "var(--color-text-muted)" }} />
        </span>
        <div className="min-w-0 pr-6">
          <h2 className="font-display text-lg font-semibold text-text-primary">
            Your partner left Relatti
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            They deleted their account and all of their data, so your shared
            compatibility insights have been removed. Your own profile,
            conversations, and everything you&rsquo;ve written are safe.
          </p>
          <button
            onClick={copyInvite}
            className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-text-inverse transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--color-primary-container)" }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Link copied" : "Invite someone new"}
          </button>
        </div>
      </div>
    </section>
  );
}
