"use client";

/**
 * RelationshipCard — the at-a-glance "where are we both at" surface on the
 * Relatti dashboard. One card per relationship (a user may have more than one).
 * Symmetric: inviter and invitee see the same shape, just with their own name
 * first. Shows each partner's assessment status + what they're sharing, the
 * connection state, the shared streak, and the coach / Blueprint actions.
 *
 * BRAND.md: Lucide-only, semantic tokens (--color-primary*, surface/text
 * scales), light + dark safe, no structural 1px borders.
 */

import Link from "next/link";
import {
  Heart,
  MessageCircle,
  FileText,
  Clock,
  Check,
  Flame,
  CircleDashed,
  CircleCheck,
  Circle,
  Eye,
  EyeOff,
} from "lucide-react";
import type { Relationship, PersonStatus, AssessmentStatus } from "@/lib/relatti/relationships";

const ASSESSMENT_COPY: Record<AssessmentStatus, string> = {
  completed: "Profile completed",
  in_progress: "Profile in progress",
  not_started: "Not started",
};

function AssessmentIcon({ status }: { status: AssessmentStatus }) {
  const common = "h-4 w-4 shrink-0";
  if (status === "completed")
    return <CircleCheck className={common} style={{ color: "var(--color-primary)" }} />;
  if (status === "in_progress")
    return <CircleDashed className={common} style={{ color: "var(--color-primary)" }} />;
  return <Circle className={common} style={{ color: "var(--color-text-muted)" }} />;
}

function ShareBadge({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.68rem] font-medium"
      style={
        on
          ? {
              background: "color-mix(in oklch, var(--color-primary) 12%, transparent)",
              color: "var(--color-primary)",
            }
          : { background: "var(--color-surface-100)", color: "var(--color-text-muted)" }
      }
    >
      {on ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
      {label}
    </span>
  );
}

function PersonRow({ person, joined }: { person: PersonStatus; joined: boolean }) {
  return (
    <div className="rounded-xl bg-surface-100 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-sm font-semibold text-text-primary">{person.name}</span>
        {!joined && !person.isYou && (
          <span className="text-[0.68rem] text-text-muted">Hasn&rsquo;t joined yet</span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
        <AssessmentIcon status={person.assessment} />
        {ASSESSMENT_COPY[person.assessment]}
      </div>
      {(joined || person.isYou) && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <ShareBadge on={person.sharedWithPartner} label="With partner" />
          {/* Coach visibility is a private, unilateral choice — only ever shown on
              your own row, never on your partner's. */}
          {person.isYou && <ShareBadge on={person.sharedWithCoach} label="With coach" />}
        </div>
      )}
    </div>
  );
}

function relativeDay(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso + "T00:00:00Z").getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "a week ago" : `${weeks} weeks ago`;
}

export default function RelationshipCard({ relationship }: { relationship: Relationship }) {
  const { partner, me, partnerJoined, streak, hasBlueprint, status } = relationship;

  const subhead = partnerJoined
    ? streak?.partnerLastActive
      ? `You're connected. ${partner.name} was here ${relativeDay(streak.partnerLastActive)}.`
      : `You're connected with ${partner.name}. Your coach understands you both.`
    : `Waiting for ${partner.name} to take their profile and join.`;

  return (
    <section
      className="mb-6 overflow-hidden rounded-2xl bg-surface-50 p-6"
      style={{
        boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--color-primary-container) 18%, transparent)",
      }}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "color-mix(in oklch, var(--color-primary-container) 14%, transparent)" }}
          >
            <Heart className="h-6 w-6" style={{ color: "var(--color-primary)" }} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-primary)" }}>
                Your relationship
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2 py-0.5 text-[0.68rem] text-text-muted">
                {status === "active" ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                {status === "active" ? "Connected" : "Getting set up"}
              </span>
              {streak && streak.streakWeeks >= 1 && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.68rem] font-medium"
                  style={{
                    background: "color-mix(in oklch, var(--color-primary) 12%, transparent)",
                    color: "var(--color-primary)",
                  }}
                  title="Weeks in a row you've both shown up"
                >
                  <Flame className="h-3 w-3" />
                  {streak.streakWeeks}-week streak
                </span>
              )}
            </div>
            <h2 className="font-display text-xl font-semibold text-text-primary">
              You &amp; {partner.name}
            </h2>
            <p className="mt-0.5 text-sm text-text-secondary">{subhead}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link
            href="/dashboard/chat"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-text-inverse transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--color-primary-container)" }}
          >
            <MessageCircle className="h-4 w-4" />
            Talk to your coach
          </Link>
          {hasBlueprint && (
            <Link
              href="/dashboard/blueprint"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              <FileText className="h-4 w-4" />
              View your Blueprint
            </Link>
          )}
        </div>
      </div>

      {/* Both partners' status — the simple "where are we both at" grid. */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <PersonRow person={me} joined />
        <PersonRow person={partner} joined={partnerJoined} />
      </div>
    </section>
  );
}
