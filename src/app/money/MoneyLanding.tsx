import Link from "next/link";
import { Compass } from "lucide-react";
import { FloatingThemeToggle } from "@/components/floating-theme-toggle";

/**
 * Money Maps landing (the money vertical's marketing surface). The `/edge`
 * reframe (MONEY_EXPERIENCE.md §1/§7): the hero is the user's edge, money is the
 * arena, their psychology is the lever. FTC line held everywhere — process and
 * felt change (clarity, control, pricing power, "end the never-enough"), NEVER a
 * wealth-outcome promise (MONEY_DISCOVERY.md §6.2).
 *
 * BRAND.md: semantic tokens only (themes emerald via data-brand="money"), Lucide
 * only (Compass), dual-theme, no hardcoded hex, no sparkle. Static server
 * component — the CTA is a plain link into the quiz-first funnel (§6).
 */
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

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-16 text-center lg:pt-24">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Money Maps™</p>
        <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          Work on what&apos;s <span style={{ color: "var(--color-primary)" }}>underneath</span> your money.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary">
          A coach for the psychology under your earning, spending, and pricing — the beliefs, fears, and patterns that
          decide what you do with money before you know you&apos;ve decided. Your bank account is a symptom. We work on
          the cause.
        </p>
        <div className="mt-9 flex flex-col items-center gap-3">
          <Link
            href="/assess"
            className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-text-inverse shadow-lg transition-opacity hover:opacity-90"
            style={ctaStyle}
          >
            Take the 3-minute Money Map
          </Link>
          <p className="text-sm text-text-muted">Give it 3 minutes and it&apos;ll tell you something true about you.</p>
        </div>
      </section>

      {/* The split — why this isn't a budgeting app or a manifestation guru */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            [
              "Psychology, not your bank account",
              "We work on what's upstream of every number. No budgets, no net-worth tracking, no bank linking — ever.",
            ],
            [
              "Science, not woo",
              "Built on the psychology of money beliefs, retuned for people who build things. The antidote to the manifestation feed.",
            ],
            [
              "An edge, not a healing",
              "For entrepreneurs and top performers who want an edge — not a diagnosis, and not another course.",
            ],
          ].map(([h, b]) => (
            <div key={h} className="rounded-2xl bg-surface-50 p-6">
              <h3 className="font-display text-base font-semibold">{h}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — the Reveal Ladder, condensed */}
      <section className="mx-auto max-w-3xl px-6 pb-20">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
        <div className="mt-10 space-y-8">
          {[
            [
              "01",
              "Take the Money Map",
              "16 questions, about three minutes. You get your archetype — a read on how you actually handle money.",
            ],
            [
              "02",
              "Get the reveal",
              "Your coach names something true you hadn't said out loud, holds it as a hypothesis, then asks the one question that matters.",
            ],
            [
              "03",
              "Bring a real decision",
              "In the Decision Room, your coach applies your whole profile to a live money call — and pushes back when it counts. It won't just tell you what you want to hear.",
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

      {/* Closing CTA — FTC-safe promise (process + felt change, never wealth) */}
      <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
        <div className="rounded-3xl bg-surface-50 px-8 py-14">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Clarity, control, and the end of &ldquo;never enough.&rdquo;
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-text-secondary">
            Not a get-rich scheme — process and felt change. Real pricing power, cleaner decisions, and a coach that
            remembers what matters.
          </p>
          <Link
            href="/assess"
            className="mt-8 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-text-inverse transition-opacity hover:opacity-90"
            style={ctaStyle}
          >
            Take the 3-minute Money Map
          </Link>
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
