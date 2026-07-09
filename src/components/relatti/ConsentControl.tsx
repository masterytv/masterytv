/**
 * ConsentControl — the "your privacy, plainly" panel on the Relatti dashboard.
 *
 * Relatti is a couples product and the coach does its best work with full context,
 * so there are no sharing *controls* here anymore (founder decision 2026-07-06):
 *   • the coach always sees your complete profile + your conversations with it, and
 *   • connected couples always share their full report + compatibility
 *     (see auto-full-sharing.ts).
 * What people actually need is to understand the data flow and trust the boundary,
 * so this is purely informational — three plain-language statements:
 *
 *   • What your coach SEES   — everything about you (report, assessment, your chats).
 *   • What your coach SHARES — nothing from your chats reaches your partner.
 *   • What your partner SEES — your profile, report, and shared ritual answers only.
 *
 * BRAND.md: Lucide-only single-color icons (no sparkles), semantic tokens, light
 * + dark safe, no dividers (spacing, not lines).
 */

import Link from "next/link";
import { Eye, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

export default function ConsentControl({ partnerName }: { partnerName: string }) {
  return (
    <div className="mt-8">
      <section className="rounded-2xl bg-surface-50 p-6">
        <h2 className="font-display text-lg font-semibold text-text-primary">Your privacy, plainly</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Where your information goes in Relatti — and where it stops.
        </p>

        <div className="mt-5 space-y-5">
          <InfoRow icon={Eye} title="What your coach sees">
            Everything you&rsquo;ve shared — your report, your full assessment, and your conversations
            with your coach. The more it understands, the better it can guide you.
          </InfoRow>
          <InfoRow icon={ShieldCheck} title="What your coach shares">
            Nothing you say to your coach is ever shared with {partnerName}. What you talk through stays
            between you and your coach.
          </InfoRow>
          <InfoRow icon={Users} title={`What ${partnerName} can see`}>
            Your relationship profile, your report, and your answers to the questions you share together —
            never your private coach conversations.
          </InfoRow>
        </div>

        <Link
          href="/privacy"
          className="mt-6 inline-block text-sm font-medium underline underline-offset-2"
          style={{ color: "var(--color-primary)" }}
        >
          How your data is stored &amp; protected
        </Link>
      </section>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: "color-mix(in oklch, var(--color-primary) 12%, transparent)" }}
      >
        <Icon className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <p className="mt-1 text-sm text-text-secondary">{children}</p>
      </div>
    </div>
  );
}
