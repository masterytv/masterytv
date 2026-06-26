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
import { Heart, MessageCircle, FileText, ClipboardList, UserPlus, Copy, Check, Waves } from "lucide-react";
import type { DashboardDyad, DyadConsent, DyadStreak } from "@/lib/relatti/dashboard-dyad";
import DyadPanel from "@/components/relatti/DyadPanel";
import ConsentControl from "@/components/relatti/ConsentControl";

interface Props {
  userName: string;
  state: "none" | "in-progress" | "completed";
  reportId: string | null;
  dyad?: DashboardDyad | null;
  inviteUrl: string;
  consent?: DyadConsent | null;
  streak?: DyadStreak | null;
}

export default function RelattiDashboard({ userName, state, reportId, dyad = null, inviteUrl, consent = null, streak = null }: Props) {
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

        {/* Dyad panel when linked, else an invite-your-partner prompt */}
        {dyad ? (
          <DyadPanel dyad={dyad} streak={streak} />
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
                Your archetype
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                Revisit who you are as a partner — your full personality report.
              </p>
            </Link>
          ) : (
            <Link
              href="/assess"
              className="group rounded-2xl bg-surface-50 p-6 transition-colors hover:bg-surface-100"
            >
              <ClipboardList className="h-6 w-6" style={{ color: "var(--color-primary)" }} />
              <h3 className="mt-3 font-display text-lg font-semibold text-text-primary">
                {state === "in-progress" ? "Continue your quiz" : "Take your quiz"}
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                Discover what kind of partner you are — the first step to being understood.
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
              {dyad
                ? `Work through what's happening between you and ${dyad.partnerName}.`
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
          <ConsentControl inviteId={consent.inviteId} currentLevel={consent.shareLevel} />
        )}

        <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-text-muted">
          <Heart className="h-3.5 w-3.5" style={{ color: "var(--color-primary)" }} />
          Relatti — a coach that knows both of you
        </p>
      </div>
    </div>
  );
}
