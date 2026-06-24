"use client";

/**
 * DyadPanel (PB2) — the "coached as a couple" surface on the dashboard.
 *
 * Shown when the signed-in user has an active relationship dyad (resolved from
 * the engagement spine in dashboard/page.tsx). Solo users never see it. Reads
 * only shared data (partner name/status + whether a Blueprint exists) — never
 * the partner's private coaching context.
 *
 * BRAND.md compliant: semantic tokens + Lucide. Brand accents use
 * --color-primary*, so the panel is rose under data-brand="relatti" and indigo
 * under MasteryTV — it composes with whatever brand the host resolves.
 */

import Link from "next/link";
import { Heart, MessageCircle, FileText, Clock, Check, Flame } from "lucide-react";
import type { DashboardDyad, DyadStreak } from "@/lib/relatti/dashboard-dyad";

const STATUS_COPY: Record<string, string> = {
  forming: "Getting set up",
  active: "Active",
  paused: "Paused",
  ended: "Ended",
};

function relativeDay(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso + "T00:00:00Z").getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "a week ago" : `${weeks} weeks ago`;
}

export default function DyadPanel({
  dyad,
  streak = null,
}: {
  dyad: DashboardDyad;
  streak?: DyadStreak | null;
}) {
  const partner = dyad.partnerName;
  const partnerJoined = dyad.partnerClaimed;

  return (
    <section
      className="mb-8 overflow-hidden rounded-2xl bg-surface-50"
      style={{
        boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--color-primary-container) 18%, transparent)",
      }}
    >
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "color-mix(in oklch, var(--color-primary-container) 14%, transparent)" }}
          >
            <Heart className="h-6 w-6" style={{ color: "var(--color-primary)" }} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: "var(--color-primary)" }}
              >
                Your relationship
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2 py-0.5 text-[0.68rem] text-text-muted">
                {dyad.status === "active" ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {STATUS_COPY[dyad.status] ?? dyad.status}
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
              You &amp; {partner}
            </h2>
            <p className="mt-0.5 text-sm text-text-secondary">
              {partnerJoined
                ? streak?.partnerLastActive
                  ? `${partner} was here ${relativeDay(streak.partnerLastActive)}.`
                  : `${partner} has joined. Your coach understands you both.`
                : `Waiting for ${partner} to take their quiz and join.`}
            </p>
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
          {dyad.hasBlueprint && (
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
    </section>
  );
}
