import Link from "next/link";
import { Compass } from "lucide-react";
import { FloatingThemeToggle } from "@/components/floating-theme-toggle";

/**
 * Money Maps landing (the money vertical's marketing surface). The `/edge`
 * reframe (MONEY_EXPERIENCE.md §1/§7): the hero is the user's edge, money is the
 * arena, their psychology is the lever. Persuasion arc: reframe (problem →
 * pattern) → recognition (the tells) → identity tease (real archetype cards,
 * verbatim from MONEY_ARCHETYPES) → mechanism → objections → close. FTC line
 * held everywhere — process and felt change (clarity, control, pricing power,
 * "end the never-enough"), NEVER a wealth-outcome promise (MONEY_DISCOVERY.md
 * §6.2). No "no sign-up" claim: /assess gates at login.
 *
 * BRAND.md: semantic tokens only (themes emerald via data-brand="money"), Lucide
 * only (Compass), dual-theme, no hardcoded hex, no sparkle. Static server
 * component — the CTA is a plain link into the quiz-first funnel (§6).
 */

// Verbatim edge/challenge lines from MONEY_ARCHETYPES (scoring/money-maps.ts) —
// the landing must preview the real product artifact, not marketing paraphrase.
// (`leak` is the stored field name; the user-facing label is "The challenge".)
const SAMPLE_ARCHETYPES = [
  {
    pair: "SHADOW × DRIVE",
    name: "The Reluctant Rainmaker",
    edge: "Ambitious with a conscience.",
    leak: "Self-sabotages at the threshold; undercharges what they're best at.",
  },
  {
    pair: "GUARD × DRIVE",
    name: "The Fortress Builder",
    edge: "Builds safe and compounds; never blows up.",
    leak: "Too walled-in to make the big leap — a treadmill with a moat.",
  },
  {
    pair: "DRIVE × MIRROR",
    name: "The Mogul",
    edge: "Enormous motivation, plays big.",
    leak: "Worth rides on the scoreboard; never arrives.",
  },
];

const TELLS = [
  "You know your rate is low. You quote it anyway.",
  "The plan said hold. Your nerves hit sell.",
  "The opportunity was right there. You watched yourself not take it.",
  "You keep making money. And finding ways to lose it.",
  "It's not the failing you're afraid of. It's who you'd have to become if it worked.",
];

export default function MoneyLanding() {
  const ctaStyle = {
    backgroundImage: "linear-gradient(135deg, var(--cta-from), var(--cta-to))",
  };

  return (
    <main className="relative min-h-screen bg-surface-0 text-text-primary">
      <FloatingThemeToggle />

      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 lg:px-10">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "color-mix(in oklch, var(--color-primary) 14%, transparent)" }}
          >
            <Compass className="h-5 w-5" style={{ color: "var(--color-primary)" }} strokeWidth={1.75} />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Money Maps</span>
        </div>
        <Link href="/login" className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary">
          Sign in
        </Link>
      </nav>

      {/* Hero — the reframe: problem → pattern */}
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-16 text-center lg:pt-24">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Money Maps™</p>
        <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          You don&apos;t have a money problem.
          <span className="block">
            You have a money <span style={{ color: "var(--color-primary)" }}>pattern</span>.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary">
          It was set before you ever earned a dollar, and it still decides what you do with money before you know
          you&apos;ve decided — what you charge, what you risk, what counts as enough. Money Maps names your pattern,
          then puts a coach on the cause instead of the symptoms.
        </p>
        <div className="mt-9 flex flex-col items-center gap-3">
          <Link
            href="/assess"
            className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-text-inverse shadow-lg transition-opacity hover:opacity-90"
            style={ctaStyle}
          >
            Show me my pattern
          </Link>
          <p className="text-sm text-text-muted">
            Sixteen questions, three minutes, free. If it doesn&apos;t tell you something true about you, close the tab.
          </p>
        </div>
      </section>

      {/* The tells — recognition before explanation */}
      <section className="mx-auto max-w-2xl px-6 pb-20">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">The tells</p>
        <h2 className="mt-3 text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
          You&apos;ve met your pattern. You&apos;ve just never named it.
        </h2>
        <div className="mt-10 space-y-7">
          {TELLS.map((tell) => (
            <p key={tell} className="font-display text-lg font-semibold leading-snug sm:text-xl">
              {tell}
            </p>
          ))}
        </div>
        <p className="mt-10 leading-relaxed text-text-secondary">
          If one of those stung, good — that&apos;s not a character flaw. That&apos;s a pattern. And a pattern you can
          name is a pattern you can work.
        </p>
      </section>

      {/* The archetypes — the identity tease (real cards, real leak lines) */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">The archetypes</p>
        <h2 className="mt-3 text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Twelve patterns. One of them is you.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center leading-relaxed text-text-secondary">
          Your Map comes back as a named archetype with two honest lines: the edge it gives you, and the challenge
          it hands you. Flattery isn&apos;t useful, so you won&apos;t get any.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {SAMPLE_ARCHETYPES.map((a) => (
            <div key={a.name} className="rounded-2xl bg-surface-50 p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">{a.pair}</p>
              <h3 className="mt-2 font-display text-lg font-semibold" style={{ color: "var(--color-primary)" }}>
                {a.name}
              </h3>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">The edge</p>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">{a.edge}</p>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">The challenge</p>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">{a.leak}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center leading-relaxed text-text-secondary">
          Nine more where those came from. Sixteen questions tell you which one has been signing your name.
        </p>
      </section>

      {/* How it works — the Reveal Ladder, condensed */}
      <section className="mx-auto max-w-3xl px-6 pb-20">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
        <div className="mt-10 space-y-8">
          {[
            [
              "01",
              "Take the Map",
              "Sixteen questions, three minutes. They're built to be self-revealing — you'll catch yourself mid-pattern before the score ever comes back.",
            ],
            [
              "02",
              "Get the reveal",
              "Your coach names something true you hadn't said out loud, holds it as a hypothesis — not a verdict — and asks the one question that matters. Wrong reads get updated, not defended.",
            ],
            [
              "03",
              "Bring a real decision",
              "Pricing, hiring, raising, quitting. In the Decision Room, your coach runs a live call through your whole profile — and pushes back when the pattern is doing the deciding. It will disagree with you. That's the point.",
            ],
          ].map(([n, h, b]) => (
            <div key={n} className="flex gap-5">
              <span className="font-display text-2xl font-bold tabular-nums text-text-muted">{n}</span>
              <div>
                <h3 className="font-display text-lg font-semibold">{h}</h3>
                <p className="mt-1.5 leading-relaxed text-text-secondary">{b}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The split — why this isn't a budgeting app or a manifestation guru */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            [
              "Psychology, not your bank account",
              "No budgets, no net-worth tracking, no bank linking — ever. We work upstream of the numbers, on the person setting them.",
            ],
            [
              "Science, not woo",
              "Built on published money-belief research — the antidote to the manifestation feed. Psychology and habits track financial well-being more strongly than financial knowledge does; you never needed another course.",
            ],
            [
              "An edge, not a healing",
              "Whether you're playing offense or getting out of your own way, you get a scouting report and a corner coach — not a diagnosis, not a guru, not a 12-week curriculum.",
            ],
          ].map(([h, b]) => (
            <div key={h} className="rounded-2xl bg-surface-50 p-6">
              <h3 className="font-display text-base font-semibold">{h}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA — FTC-safe promise (process + felt change, never wealth) */}
      <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
        <div className="rounded-3xl bg-surface-50 px-8 py-14">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Clarity, control, and the end of &ldquo;never enough.&rdquo;
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-text-secondary">
            No get-rich anything. What changes is the part you actually run — the pattern named, the challenge
            watched, cleaner calls, and &ldquo;enough&rdquo; finally getting a number. That&apos;s the edge.
          </p>
          <Link
            href="/assess"
            className="mt-8 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-text-inverse transition-opacity hover:opacity-90"
            style={ctaStyle}
          >
            Show me my pattern
          </Link>
          <p className="mt-4 text-sm text-text-muted">Free · three minutes · no bank linking, ever</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-50">
        <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <Compass className="h-4 w-4" style={{ color: "var(--color-primary)" }} strokeWidth={1.75} />
              <span className="font-display text-sm font-semibold">Money Maps</span>
              <span className="text-xs text-text-muted">· Part of the MasteryTV family</span>
            </div>
            <div className="flex gap-6 text-sm text-text-secondary">
              <Link href="/privacy" className="transition-colors hover:text-text-primary">Privacy</Link>
              <Link href="/terms" className="transition-colors hover:text-text-primary">Terms</Link>
              <Link href="/disclaimer" className="transition-colors hover:text-text-primary">Disclaimer</Link>
            </div>
          </div>
          <p className="mt-6 text-center text-xs leading-relaxed text-text-muted sm:text-left">
            Money Maps is coaching and education on the psychology of money — not therapy, and not financial, investment,
            or tax advice. We never link to or touch your bank account.
          </p>
        </div>
      </footer>
    </main>
  );
}
