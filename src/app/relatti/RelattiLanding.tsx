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
    title: "Invite your partner",
    body: "Share your result. They take theirs. Now you’re linked — privately and by consent.",
  },
  {
    icon: Compass,
    step: "3",
    title: "Meet your coach",
    body: "Get your shared Relationship Blueprint and a coach that understands you both.",
  },
];

export default function RelattiLanding() {
  return (
    <main className="min-h-screen bg-surface-0 text-text-primary font-sans">
      <FloatingThemeToggle />

      {/* ── Nav ── */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/relatti" className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "color-mix(in oklch, var(--color-primary-container) 16%, transparent)" }}
          >
            <Heart className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">Relatti</span>
        </Link>
        <Link
          href="/decoded"
          className="rounded-lg px-5 py-2 text-sm font-medium text-text-inverse transition-opacity hover:opacity-90"
          style={{ background: "var(--color-primary-container)" }}
        >
          Get started
        </Link>
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
          A coach that knows both of you
        </span>

        <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
          Stop having the same fight.
          <br />
          <span style={{ color: "var(--color-primary)" }}>Start having the last one.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-text-secondary">
          Not couples therapy. Not a journaling app. A relationship coach grounded in
          each partner&rsquo;s real psychology — that mediates issues, runs gentle
          check-ins, and helps the moment a fight starts.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/decoded"
            className="group inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-text-inverse shadow-card transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--color-primary-container)" }}
          >
            Take the free quiz
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
      </section>

      {/* ── The wedge: three pillars ── */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-5 sm:grid-cols-3">
          {PILLARS.map((p) => (
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
            It understands both personalities and what happens between you. But each
            partner&rsquo;s conversations stay private. No competitor does dyadic
            coaching — and none would keep it this honest.
          </p>
          <Link
            href="/decoded"
            className="mt-8 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-text-inverse transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--color-primary-container)" }}
          >
            Find your archetype
            <ArrowRight className="h-4.5 w-4.5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--ghost-border)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-text-muted sm:flex-row">
          <span className="flex items-center gap-2">
            <Heart className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
            Relatti
          </span>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="transition-colors hover:text-text-secondary">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-text-secondary">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
