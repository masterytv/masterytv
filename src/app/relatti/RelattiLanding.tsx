"use client";

/**
 * RelattiLanding (PB4.1) — relationship vertical landing.
 *
 * BRAND.md compliant: Manrope display (font-display) + Inter body (font-sans),
 * Lucide icons, semantic surface/text tokens, no hardcoded brand hex. Brand
 * accents use the themeable --color-primary* custom properties, which resolve
 * to the warm-rose Relatti palette under data-brand="relatti" (set by the root
 * layout inline script for Relatti routes). Renders correctly in light + dark.
 *
 * Deliberately uses only CSS transitions (no scroll-triggered animation) to
 * avoid the iOS Chrome invisible-section issues seen on the MasteryTV landing.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RelattiMark } from "@/components/relatti/RelattiMark";
import {
  Heart,
  Users,
  MessageCircle,
  ArrowRight,
  ShieldCheck,
  ClipboardList,
  Send,
  Compass,
} from "lucide-react";
import { FloatingThemeToggle } from "@/components/floating-theme-toggle";

const PILLARS = [
  {
    icon: Users,
    title: "It knows both of you",
    body: "Each partner takes a short, validated assessment. The coach holds both profiles at once — how you each attach, what closeness looks like to you, what you each need to feel loved.",
  },
  {
    icon: MessageCircle,
    title: "It turns friction into understanding",
    body: "Every couple has friction — that’s two real people, not a flaw. When it flares, the coach translates instead of taking sides: “here’s what that might sound like from their side.” It coaches the relationship, not just whoever’s typing.",
  },
  {
    icon: Heart,
    title: "It’s there in the moments that matter",
    body: "Before the big conversation. In the middle of the hard one. After the one that went sideways. Get a grounded next step — or have it read a hot message before you hit send.",
  },
];

// Pre-2026-07 pillar copy, preserved verbatim for /samefight (the problem-first
// entry we keep for reference and distress-intent traffic). Do not edit.
const LEGACY_PILLARS = [
  {
    icon: Users,
    title: "It knows both of you",
    body: "Each partner takes a short, validated assessment. The coach holds both profiles at once — attachment style, how you handle conflict, what you each need to feel close.",
  },
  {
    icon: MessageCircle,
    title: "It mediates, it doesn't take sides",
    body: "When you bring a fight, the coach translates instead of adjudicating — “here’s what that might sound like from their side” — and coaches the relationship, not just whoever’s typing.",
  },
  {
    icon: Heart,
    title: "It helps in the moment",
    body: "Open it mid-argument. Get a regulated next step, or have it translate a hot message before you send something you’ll regret.",
  },
];

const STEPS = [
  {
    icon: ClipboardList,
    step: "1",
    title: "Take the free quiz",
    body: "Find out what kind of partner you are — your archetype, in about 10 minutes.",
  },
  {
    icon: Send,
    step: "2",
    title: "Share it with your partner",
    body: "Your result is the conversation starter. They take theirs, and now you’re linked — privately, and by consent.",
  },
  {
    icon: Compass,
    step: "3",
    title: "Meet your coach",
    body: "Get your shared Relationship Blueprint and a coach that understands you both — where you naturally fit, and where you’ll grow.",
  },
];

export interface LandingContent {
  eyebrow: string;
  headlineTop: string;
  headlineAccent: string;
  subhead: string;
}

const DEFAULT_CONTENT: LandingContent = {
  eyebrow: "A coach for the two of you",
  headlineTop: "The best relationships aren’t lucky.",
  headlineAccent: "They’re understood.",
  subhead:
    "Relatti is a relationship coach for both of you — built on a century of relationship science and each partner’s real psychology. Understand how you each love, bond, and handle hard moments. Then put that understanding to work.",
};

// The pre-2026-07 problem-first hero, preserved verbatim for /samefight.
export const SAMEFIGHT_CONTENT: LandingContent = {
  eyebrow: "A coach that knows both of you",
  headlineTop: "Stop having the same fight.",
  headlineAccent: "Start having the last one.",
  subhead:
    "Not couples therapy. Not a journaling app. A relationship coach grounded in each partner’s real psychology — that mediates issues, runs gentle check-ins, and helps the moment a fight starts.",
};

export default function RelattiLanding({
  content,
  legacy = false,
}: {
  content?: LandingContent;
  /** /samefight: old pillar copy, no belief block — a frozen reference page. */
  legacy?: boolean;
}) {
  const c = content ?? DEFAULT_CONTENT;
  const pillars = legacy ? LEGACY_PILLARS : PILLARS;

  // Auth-aware chrome: signed-in visitors get "Open dashboard" instead of
  // signup CTAs (least-friction path back in; also an honest signed-in
  // indicator). null = unknown (first paint) → render the logged-out pair so
  // the marketing default is instant; a signed-in visitor sees it swap.
  // Client-side check keeps this page statically rendered.
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => setAuthed(!!data.session))
      .catch(() => setAuthed(false));
  }, []);

  return (
    <main className="relatti-landing min-h-screen bg-surface-0 text-text-primary font-sans">
      {/* ── Nav ── */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/relatti" className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "color-mix(in oklch, var(--color-primary-container) 16%, transparent)" }}
          >
            <RelattiMark className="h-4 w-4" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">Relatti</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Theme toggle lives IN the flex flow (desktop only) so it can never
              overlap the nav links; a fixed overlay collided at some width no
              matter where it was pinned. On mobile it moves to the footer. */}
          <span className="relatti-theme-inline hidden sm:block">
            <FloatingThemeToggle />
          </span>
          {authed ? (
            <>
              <span className="hidden text-sm text-text-muted sm:inline">You&rsquo;re signed in</span>
              <Link
                href="/dashboard"
                className="rounded-lg px-5 py-2 text-sm font-medium text-text-inverse transition-opacity hover:opacity-90"
                style={{ background: "var(--color-primary-container)" }}
              >
                Open dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login?mode=signin"
                className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                Log in
              </Link>
              {/* BETA GATE (temporary): all start CTAs route to /beta so new
                  signups need an invite code. At public launch: → "/assess". */}
              <Link
                href="/beta"
                className="rounded-lg px-5 py-2 text-sm font-medium text-text-inverse transition-opacity hover:opacity-90"
                style={{ background: "var(--color-primary-container)" }}
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-20 text-center sm:pt-24">
        <span
          className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
          style={{
            background: "color-mix(in oklch, var(--color-primary-container) 12%, transparent)",
            color: "var(--color-primary)",
          }}
        >
          {c.eyebrow}
        </span>

        <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
          {c.headlineTop}
          <br />
          <span style={{ color: "var(--color-primary)" }}>{c.headlineAccent}</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-text-secondary">
          {c.subhead}
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={authed ? "/dashboard" : "/beta"} /* BETA GATE (temporary) */
            className="group inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-text-inverse shadow-card transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--color-primary-container)" }}
          >
            {authed ? "Pick up where you left off" : "Take the free quiz"}
            <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#how"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            See how it works
          </a>
        </div>

        <p className="mt-5 text-sm text-text-muted">
          Free to start &middot; about 10 minutes &middot; no card required
        </p>

        <p className="mt-3 text-sm">
          <Link
            href="/challenge"
            className="inline-flex items-center gap-1 font-medium underline underline-offset-2 transition-opacity hover:opacity-80"
            style={{ color: "var(--color-primary)" }}
          >
            Doing it together? Take the 14-Day Challenge
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </p>
      </section>

      {/* ── The belief block: the mission, stated plainly ── */}
      {!legacy && (
        <section className="mx-auto max-w-2xl px-6 py-16 text-center sm:py-20">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            We believe more relationships can work.
          </h2>
          <div className="mt-8 space-y-4 text-lg leading-relaxed text-text-secondary">
            <p>
              When two people work at it <em>together</em> — not alone.
            </p>
            <p>When there&rsquo;s a blueprint instead of guesswork.</p>
            <p>
              When a hundred years of relationship science lives in your
              pocket, not in a library.
            </p>
            <p>When the hard conversations happen without the dread.</p>
            <p>
              When anger gives way to understanding — and understanding to
              something stronger than what you started with.
            </p>
          </div>
          <p
            className="mt-8 font-display text-xl font-semibold"
            style={{ color: "var(--color-primary)" }}
          >
            That&rsquo;s the future we&rsquo;re building. One couple at a time.
          </p>
        </section>
      )}

      {/* ── The wedge: three pillars ── */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-5 sm:grid-cols-3">
          {pillars.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl bg-surface-50 p-6 transition-colors hover:bg-surface-100"
            >
              <span
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: "color-mix(in oklch, var(--color-primary-container) 14%, transparent)" }}
              >
                <p.icon className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
              </span>
              <h3 className="font-display text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center font-display text-3xl font-bold tracking-tight sm:text-4xl">
          How Relatti works
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-text-secondary">
          The quiz is the invite. Sharing your result is how your partner joins.
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.step} className="text-center">
              <span
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: "color-mix(in oklch, var(--color-primary-container) 14%, transparent)" }}
              >
                <s.icon className="h-6 w-6" style={{ color: "var(--color-primary)" }} />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Differentiator strip ── */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="rounded-3xl bg-surface-50 px-8 py-12 text-center">
          <ShieldCheck className="mx-auto h-7 w-7" style={{ color: "var(--color-primary)" }} />
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-2xl font-semibold leading-snug sm:text-3xl">
            Your coach knows you&rsquo;re a couple — but never shares what you say
            with each other.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-text-secondary">
            It understands both of you and what happens between you. But each
            partner&rsquo;s conversations stay private — always. You share a
            blueprint, not a transcript. That&rsquo;s what makes it safe to be
            honest, and honesty is what makes it work.
          </p>
          <Link
            href={authed ? "/dashboard" : "/beta"} /* BETA GATE (temporary) */
            className="mt-8 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-text-inverse transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--color-primary-container)" }}
          >
            {authed ? "Open your dashboard" : "Find your archetype"}
            <ArrowRight className="h-4.5 w-4.5" />
          </Link>
          {/* Quiet trust links — for the skeptical reader, deliberately understated */}
          <p className="mt-6 text-sm text-text-muted">
            Built on published relationship research —{" "}
            <Link
              href="/science"
              className="underline underline-offset-2 transition-opacity hover:opacity-80"
              style={{ color: "var(--color-primary)" }}
            >
              read the science
            </Link>
            . Skeptical?{" "}
            <Link
              href="/why-ai"
              className="underline underline-offset-2 transition-opacity hover:opacity-80"
              style={{ color: "var(--color-primary)" }}
            >
              We answer the hard questions honestly
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--ghost-border)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-text-muted sm:flex-row">
          <span className="flex items-center gap-2">
            <RelattiMark className="h-4 w-4" />
            Relatti
          </span>
          <div className="flex items-center gap-6">
            <Link href="/science" className="transition-colors hover:text-text-secondary">The science</Link>
            <Link href="/why-ai" className="transition-colors hover:text-text-secondary">How the coach works</Link>
            <Link href="/privacy" className="transition-colors hover:text-text-secondary">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-text-secondary">Terms</Link>
          </div>
          {/* On mobile the theme toggle lives here (the header has no room for a
              third control at phone widths); on sm+ it's inline in the header. */}
          <span className="relatti-theme-inline sm:hidden">
            <FloatingThemeToggle />
          </span>
        </div>
      </footer>
    </main>
  );
}
