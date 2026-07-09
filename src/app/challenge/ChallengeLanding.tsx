"use client";

/**
 * ChallengeLanding — the 14-Day Challenge page (/challenge), the positive,
 * forwardable front door to the beta funnel (directives/HOME_CHALLENGE_COPY.md).
 *
 * Frame: a challenge you do together, not a beta you're admitted to. All start
 * CTAs route to /beta (the existing offer page owns code redemption + the
 * before check-in); a ?code= on this page rides through to /beta unchanged.
 * The "steal these words" block is the page's reason to exist — it arms the
 * partner conversation with a copyable invite.
 *
 * BRAND.md compliant: Manrope display + Inter body, Lucide icons only,
 * semantic tokens (no hardcoded hex), renders in light + dark, no 1px
 * structural borders — tonal cards + whitespace. CSS transitions only.
 */

import Link from "next/link";
import { useState } from "react";
import { RelattiMark } from "@/components/relatti/RelattiMark";
import { ArrowRight, Check, Copy, ShieldCheck } from "lucide-react";
import { FloatingThemeToggle } from "@/components/floating-theme-toggle";

const DAYS = [
  {
    label: "Day 1",
    title: "Take the quiz, get the map.",
    body: "You each take the quiz — about 10 minutes, built on published attachment and personality science. Answer three quick questions about where the relationship is today: that’s your “before” snapshot. When you’ve both finished, your shared Relationship Blueprint unlocks — the first honest map of how you two fit.",
  },
  {
    label: "Days 2–13",
    title: "Use the coach on real life.",
    body: "Bring it the small stuff and the real stuff: the conversation you keep postponing, the thing that flared on Tuesday, the message you’re about to send. It knows both of your profiles, it doesn’t take sides, and what each of you tells it stays private from the other.",
  },
  {
    label: "Day 14",
    title: "See what moved.",
    body: "Three questions, two minutes — the same snapshot you took on Day 1. You see what shifted. So do we: it’s how we measure whether Relatti actually helps, not just whether it demos well.",
  },
];

const FAQ = [
  {
    q: "Is this couples therapy?",
    a: "No. Relatti is an AI relationship coach built on published relationship science. It’s for understanding each other and handling everyday friction better — not a replacement for a therapist, and it will tell you so itself when something’s beyond it.",
  },
  {
    q: "What happens after the 14 days?",
    a: "Nothing sneaky. Your access doesn’t shut off and there’s no card on file. We email you the Day-14 check-in and read every word of your feedback.",
  },
  {
    q: "Does my partner have to join?",
    a: "The challenge is built for two — the Blueprint and the coach get genuinely good once both of you have taken the quiz. You can start solo and invite them from your result.",
  },
  {
    q: "What do you do with our answers?",
    a: "Check-ins: anonymous, aggregate only, never quoted without explicit permission. Coaching conversations: never read, never used for anything. The full policy is at relatti.com/privacy.",
  },
];

export default function ChallengeLanding({ initialCode }: { initialCode: string }) {
  const code = initialCode.trim();
  const betaHref = code ? `/beta?code=${encodeURIComponent(code)}` : "/beta";
  const shareLink = `https://relatti.com/challenge${code ? `?code=${encodeURIComponent(code)}` : ""}`;
  const inviteMessage = `Hey — I found this thing called the Relatti 14-Day Challenge and I want to do it with you. We each take a 10-minute quiz, it maps how the two of us actually work (apparently it’s uncomfortably accurate), and then there’s a coach that knows both of us for two weeks. It’s free because it’s in beta and they want feedback. Be a guinea pig with me? ${shareLink}`;

  const [copied, setCopied] = useState(false);
  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard can be unavailable (permissions, non-secure context); the
      // message is selectable text, so manual copy still works.
    }
  }

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
          <span className="relatti-theme-inline hidden sm:block">
            <FloatingThemeToggle />
          </span>
          <Link
            href="/login?mode=signin"
            className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            Log in
          </Link>
          <Link
            href={betaHref}
            className="rounded-lg px-5 py-2 text-sm font-medium text-text-inverse transition-opacity hover:opacity-90"
            style={{ background: "var(--color-primary-container)" }}
          >
            Start Day 1
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-16 text-center sm:pt-24">
        <span
          className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
          style={{
            background: "color-mix(in oklch, var(--color-primary-container) 12%, transparent)",
            color: "var(--color-primary)",
          }}
        >
          The Relatti 14-Day Challenge &middot; free while in beta
        </span>

        <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
          Fourteen days. The two of you.
          <br />
          <span style={{ color: "var(--color-primary)" }}>See what changes.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-text-secondary">
          You each take a 10-minute, research-backed quiz. You get a map of how
          the two of you actually work — where you naturally fit, where you tend
          to grind. Then a coach that knows you both, for two weeks. At the end,
          you tell us what changed. That&rsquo;s the whole challenge.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={betaHref}
            className="group inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-text-inverse shadow-card transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--color-primary-container)" }}
          >
            Start Day 1
            <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#days"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            See the 14 days
          </a>
        </div>

        <p className="mt-5 text-sm text-text-muted">
          Free during beta &middot; both partners get full access &middot; no card, ever
        </p>
      </section>

      {/* ── The 14 days ── */}
      <section id="days" className="mx-auto max-w-3xl px-6 py-12">
        <div className="space-y-5">
          {DAYS.map((d) => (
            <div key={d.label} className="rounded-2xl bg-surface-50 p-7 sm:p-8">
              <p
                className="text-xs font-semibold uppercase tracking-[0.06em]"
                style={{ color: "var(--color-primary)" }}
              >
                {d.label}
              </p>
              <h2 className="mt-2 font-display text-xl font-semibold sm:text-2xl">{d.title}</h2>
              <p className="mt-3 leading-relaxed text-text-secondary">{d.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── The deal ── */}
      <section className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-3xl bg-surface-50 px-8 py-10 text-center">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">
            What it costs: nothing. What we ask: four minutes.
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-text-secondary">
            Relatti is in beta, and challenge couples get free unlimited access —
            the full coach, both partners. In exchange, we ask for two 2-minute
            check-ins (Day 1 and Day 14) and your honest feedback along the way.
            Check-in answers are only ever used anonymously and in aggregate;
            nothing is quoted publicly unless you explicitly say so. Your
            coaching conversations are never read and never used for anything.
            Period.
          </p>
        </div>
      </section>

      {/* ── Steal these words: the forwardable invite ── */}
      <section className="mx-auto max-w-3xl px-6 py-12">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Doing this with someone? Steal these words.
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-text-secondary">
          The challenge takes two. If you&rsquo;re the one who found it,
          here&rsquo;s the text to send — edit at will.
        </p>
        <div className="mt-8 rounded-2xl bg-surface-50 p-7 sm:p-8">
          <p className="leading-relaxed text-text-secondary">{inviteMessage}</p>
          <button
            type="button"
            onClick={copyInvite}
            className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-text-inverse transition-opacity hover:opacity-90"
            style={{ background: "var(--color-primary-container)" }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied — go send it" : "Copy message"}
          </button>
        </div>
      </section>

      {/* ── Who it's for ── */}
      <section className="mx-auto max-w-3xl px-6 py-12 text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          You don&rsquo;t have to be in trouble to take the challenge.
        </h2>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed text-text-secondary">
          Couples take it before a wedding, after a move, at year one or year
          twenty — or just because two weeks of actually understanding each
          other sounded good. If things are genuinely hard right now, Relatti
          can help you talk — but it&rsquo;s an AI coach, not a therapist, and
          not a substitute for professional help. In crisis, reach a real
          person: in the US, call or text <strong>988</strong>.
        </p>
      </section>

      {/* ── Privacy strip ── */}
      <section className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-3xl bg-surface-50 px-8 py-10 text-center">
          <ShieldCheck className="mx-auto h-7 w-7" style={{ color: "var(--color-primary)" }} />
          <h2 className="mt-4 font-display text-2xl font-semibold">
            You share a blueprint, not a transcript.
          </h2>
          <p className="mx-auto mt-3 max-w-xl leading-relaxed text-text-secondary">
            You&rsquo;ll each see the other&rsquo;s relationship profile —
            that&rsquo;s the point. What you each say to the coach stays
            private, always. The straight answers about the AI:{" "}
            <Link
              href="/why-ai"
              className="underline underline-offset-2 transition-opacity hover:opacity-80"
              style={{ color: "var(--color-primary)" }}
            >
              relatti.com/why-ai
            </Link>
          </p>
        </div>
      </section>

      {/* ── Mini-FAQ ── */}
      <section className="mx-auto max-w-3xl px-6 py-12">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
          The fine print, in plain English
        </h2>
        <div className="mt-10 space-y-8">
          {FAQ.map((f) => (
            <div key={f.q}>
              <h3 className="font-display text-lg font-semibold">{f.q}</h3>
              <p className="mt-2 leading-relaxed text-text-secondary">{f.a}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link
            href={betaHref}
            className="group inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-text-inverse shadow-card transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--color-primary-container)" }}
          >
            Start Day 1
            <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
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
            <Link href="/why-ai" className="transition-colors hover:text-text-secondary">Why AI?</Link>
            <Link href="/privacy" className="transition-colors hover:text-text-secondary">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-text-secondary">Terms</Link>
          </div>
          <span className="relatti-theme-inline sm:hidden">
            <FloatingThemeToggle />
          </span>
        </div>
      </footer>
    </main>
  );
}
