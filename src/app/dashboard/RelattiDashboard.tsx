"use client";

/**
 * RelattiDashboard (PB2) — the distinct Relatti logged-in surface.
 *
 * Rendered by /dashboard when the active brand is Relatti (by domain in prod,
 * or the ?brand=relatti preview override on localhost/staging). This is a
 * SEPARATE surface from the MasteryTV DashboardHome — relationship-framed,
 * dyad-first, and without the MasteryTV-only modules (commitments / progress /
 * coaching letters). Same engine + data underneath; different experience.
 *
 * BRAND.md: Manrope/Inter, Lucide, semantic tokens; brand accents use
 * --color-primary* (rose under data-brand="relatti"). Light + dark safe.
 */

import { useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, FileText, ClipboardList, UserPlus, Copy, Check, Waves, CalendarCheck, ShieldAlert } from "lucide-react";
import type { DashboardDyad, DyadConsent, DyadStreak } from "@/lib/relatti/dashboard-dyad";
import type { Relationship } from "@/lib/relatti/relationships";
import type { RitualView } from "@/lib/relatti/ritual";
import ConsentControl from "@/components/relatti/ConsentControl";
import RelationshipCard from "@/components/relatti/RelationshipCard";
import DepartedRelationshipNotice from "@/components/relatti/DepartedRelationshipNotice";
import RitualCard from "@/components/relatti/RitualCard";

interface Props {
  userName: string;
  state: "none" | "in-progress" | "completed";
  reportId: string | null;
  dyad?: DashboardDyad | null;
  relationships?: Relationship[];
  inviteUrl: string;
  consent?: DyadConsent | null;
  streak?: DyadStreak | null;
  ritual?: RitualView | null;
  /** Beta: the day-14 after-check-in is owed (soft, persistent nudge). */
  checkinDue?: boolean;
  /** Beta: this load auto-redeemed the /beta pre-registration — celebrate once. */
  betaJustUnlocked?: boolean;
  /** Beta: has access (partner auto-enroll) but owes the before check-in. */
  betaNeedsCheckin?: boolean;
  /** Beta: the pre-registered code failed at redemption (dead/full link). */
  betaRedeemError?: string | null;
}

export default function RelattiDashboard({ userName, state, reportId, relationships = [], inviteUrl, consent = null, ritual = null, checkinDue = false, betaJustUnlocked = false, betaNeedsCheckin = false, betaRedeemError = null }: Props) {
  const [copied, setCopied] = useState(false);
  const assessed = state === "completed";

  function copyInvite() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8 lg:py-12">
        {/* Greeting */}
        <div className="mb-8">
          <p className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
            Your relationship coach
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary">
            Hi {userName}
          </h1>
        </div>

        {/* Beta: the /beta pre-registration just auto-applied — one-time note. */}
        {betaJustUnlocked && (
          <div className="mb-6 flex items-center gap-4 rounded-2xl bg-surface-50 p-5">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "color-mix(in oklch, var(--color-accent-teal) 16%, transparent)" }}
            >
              <Check className="h-5 w-5" style={{ color: "var(--color-accent-teal)" }} />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-sm font-semibold text-text-primary">
                Free unlimited coaching unlocked — you&rsquo;re a beta tester
              </span>
              <span className="mt-0.5 block text-sm text-text-secondary">
                Your invite applied automatically. We&rsquo;ll email your 2-week check-in when
                it&rsquo;s time — that completes the deal.
              </span>
            </span>
          </div>
        )}

        {/* Beta: partner auto-enrolled (or legacy tester) — owes the before check-in. */}
        {betaNeedsCheckin && (
          <Link
            href="/dashboard/beta"
            className="mb-6 flex items-center gap-4 rounded-2xl bg-surface-50 p-5 transition-colors hover:bg-surface-100"
            style={{
              boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--color-primary) 25%, transparent)",
            }}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "color-mix(in oklch, var(--color-primary) 12%, transparent)" }}
            >
              <CalendarCheck className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-sm font-semibold text-text-primary">
                You have free unlimited coaching — one quick step
              </span>
              <span className="mt-0.5 block text-sm text-text-secondary">
                A 2-minute check-in completes your beta setup (and one more at 2 weeks — that&rsquo;s
                the whole deal).
              </span>
            </span>
          </Link>
        )}

        {/* Beta: the pre-registered code turned out dead/full — say so honestly. */}
        {betaRedeemError && (
          <Link
            href="/dashboard/beta"
            className="mb-6 flex items-center gap-4 rounded-2xl bg-surface-50 p-5 transition-colors hover:bg-surface-100"
            style={{
              boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--color-danger) 30%, transparent)",
            }}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "color-mix(in oklch, var(--color-danger) 12%, transparent)" }}
            >
              <ShieldAlert className="h-5 w-5" style={{ color: "var(--color-danger)" }} />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-sm font-semibold text-text-primary">
                Your beta invite couldn&rsquo;t be applied
              </span>
              <span className="mt-0.5 block text-sm text-text-secondary">
                {betaRedeemError} Tap here to enter a different code.
              </span>
            </span>
          </Link>
        )}

        {/* Beta: the day-14 check-in owed under the free-access deal. Soft but
            persistent — shows until the after-survey is done (never blocks). */}
        {checkinDue && (
          <Link
            href="/dashboard/beta/checkin"
            className="mb-6 flex items-center gap-4 rounded-2xl bg-surface-50 p-5 transition-colors hover:bg-surface-100"
            style={{
              boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--color-primary) 25%, transparent)",
            }}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "color-mix(in oklch, var(--color-primary) 12%, transparent)" }}
            >
              <CalendarCheck className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-sm font-semibold text-text-primary">
                Your 2-week check-in is ready
              </span>
              <span className="mt-0.5 block text-sm text-text-secondary">
                Three minutes — the second half of your free-beta deal.
              </span>
            </span>
          </Link>
        )}

        {/* Daily connection ritual — the primary recurring action (§5.9).
            Shown once the user has their relationship profile; before that the
            assessment card below is the call to action. */}
        {assessed && ritual && <RitualCard view={ritual} />}

        {/* One card per relationship (symmetric for inviter & invitee); the
            invite-your-partner prompt only shows when there are none yet. */}
        {relationships.length > 0 ? (
          relationships.map((r) =>
            r.partnerDeparted ? (
              <DepartedRelationshipNotice key={r.engagementId} engagementId={r.engagementId} inviteUrl={inviteUrl} />
            ) : (
              <RelationshipCard key={r.engagementId} relationship={r} />
            )
          )
        ) : (
          <section className="mb-8 rounded-2xl bg-surface-50 p-6">
            <span
              className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: "color-mix(in oklch, var(--color-primary-container) 14%, transparent)" }}
            >
              <UserPlus className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
            </span>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              Invite your partner
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Relatti works best with both of you. Share your link so your partner can
              take their quiz and join — your coach will then understand you both.
            </p>
            <button
              onClick={copyInvite}
              className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-text-inverse transition-transform hover:-translate-y-0.5"
              style={{ background: "var(--color-primary-container)" }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Link copied" : "Copy your invite link"}
            </button>
          </section>
        )}

        {/* Action cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Assessment / archetype */}
          {assessed ? (
            <Link
              href={reportId ? `/report/${reportId}` : "/dashboard"}
              className="group rounded-2xl bg-surface-50 p-6 transition-colors hover:bg-surface-100"
            >
              <FileText className="h-6 w-6" style={{ color: "var(--color-primary)" }} />
              <h3 className="mt-3 font-display text-lg font-semibold text-text-primary">
                Your relationship profile
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                Revisit your relationship style, conflict patterns, and what you need to feel close.
              </p>
            </Link>
          ) : (
            <Link
              href="/assess"
              className="group rounded-2xl bg-surface-50 p-6 transition-colors hover:bg-surface-100"
            >
              <ClipboardList className="h-6 w-6" style={{ color: "var(--color-primary)" }} />
              <h3 className="mt-3 font-display text-lg font-semibold text-text-primary">
                {state === "in-progress" ? "Continue your relationship profile" : "Start your relationship profile"}
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                Discover how you love and connect — the first step to being understood by your partner.
              </p>
            </Link>
          )}

          {/* Coach */}
          <Link
            href="/dashboard/chat"
            className="group rounded-2xl bg-surface-50 p-6 transition-colors hover:bg-surface-100"
          >
            <MessageCircle className="h-6 w-6" style={{ color: "var(--color-primary)" }} />
            <h3 className="mt-3 font-display text-lg font-semibold text-text-primary">
              Talk to your coach
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              {relationships[0]?.partnerJoined
                ? `Work through what's happening between you and ${relationships[0].partner.name}.`
                : "Start a conversation — your coach is here for the relationship."}
            </p>
          </Link>

          {/* E9: fight de-escalator — in-the-moment, regulation-first */}
          <Link
            href="/dashboard/chat?mode=deescalate&c=new"
            className="group rounded-2xl bg-surface-50 p-6 transition-colors hover:bg-surface-100 sm:col-span-2"
          >
            <Waves className="h-6 w-6" style={{ color: "var(--color-primary)" }} />
            <h3 className="mt-3 font-display text-lg font-semibold text-text-primary">
              In a fight right now?
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              Open the de-escalator — get a calm next step, or paste what you want to say
              and I&rsquo;ll help you say it without making it worse.
            </p>
          </Link>
        </div>

        {/* PB2.3: consent control — only when the dyad has an invite to govern */}
        {consent && (
          <ConsentControl partnerName={consent.partnerName} />
        )}

        <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-text-muted">
          <Heart className="h-3.5 w-3.5" style={{ color: "var(--color-primary)" }} />
          Relatti — a coach that knows both of you
        </p>
      </div>
    </div>
  );
}
