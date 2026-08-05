import Link from "next/link";
import { Compass } from "lucide-react";
import { FloatingThemeToggle } from "@/components/floating-theme-toggle";

/**
 * The Money Tell — the money vertical's male-focused, edge-leaning landing page
 * (served at /tell; the generic-and-credible MoneyTraits homepage lives at
 * /money → the root of moneytraits.com).
 *
 * Copy: the founder-approved "THE MONEY TELL — Homepage Copy" deck (Cowork,
 * delivered 2026-07-20), implemented VERBATIM — the poker frame: every player
 * has a tell, yours shows up in what you charge / when you sell / what you
 * watch yourself not take; the assessment spots it, the coach teaches you to
 * play the hand cold. Leads with the edge-seeker; catches the self-aware
 * struggler in the tells list ("I have a tell" is easier to admit than "I have
 * an emotional problem").
 *
 * Register note: the deck's "leak" lines render as "challenge" — founder call
 * 2026-07-20 ("Use Challenge vs Leak"), matching the in-product card/report/
 * coach vocabulary. FTC line held: process + felt change, never a wealth
 * outcome (MONEY_DISCOVERY.md §6.2). No "no sign-up" claim: /assess gates at
 * login.
 *
 * BRAND.md: semantic tokens only (emerald via data-brand="money" — layout.tsx's
 * head script treats /tell as a money path), Lucide only (Compass, the money
 * mark), dual-theme, no hardcoded hex, no sparkle. Static server component —
 * CTAs are plain links into the quiz-first funnel.
 */

// The three teaser profiles, verbatim from the Tell deck (poker-voiced variants
// of the MONEY_ARCHETYPES lines; the homepage carries the measurement-voiced
// set). `leak` is the historical field name — rendered as "The challenge".
const SAMPLE_PROFILES = [
  {
    name: "The Reluctant Rainmaker",
    edge: "Ambitious with a conscience.",
    leak: "Folds at the threshold — undercharges for the thing they're best at.",
  },
  {
    name: "The Fortress Builder",
    edge: "Never blows up. Builds safe and compounds.",
    leak: "Won't push chips in even when the odds are finally right.",
  },
  {
    name: "The Mogul",
    edge: "Plays big. Enormous motivation.",
    leak: "Worth rides on the size of the stack — so “enough” never comes.",
  },
];

// The tells — deck order, verbatim.
const TELLS = [
  "You know your rate is low. You quote it anyway.",
  "The plan said hold. Your nerves hit sell.",
  "You'll grind for a client all week, then flinch at sending the invoice.",
  "You call it “doing more research.” It's been eight months.",
  "You keep making money. And finding ways to give it back.",
];

export default function TellLanding() {
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
          <span className="font-display text-lg font-semibold tracking-tight">The Money Tell</span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/login" className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary">
            Sign in
          </Link>
          <Link
            href="/assess"
            className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-text-inverse transition-opacity hover:opacity-90 sm:inline-flex"
            style={ctaStyle}
          >
            Spot my tell
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-16 text-center lg:pt-24">
        <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          Everyone at the table has a <span style={{ color: "var(--color-primary)" }}>tell</span>.
          <span className="block">Nobody can see their own.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary">
          Yours isn&apos;t a twitch or a blink. It&apos;s the pause before you quote your rate. The
          itch to sell the day the plan says hold. The deal you studied for a month and watched
          yourself not take. Sixteen questions spot the tell that&apos;s been playing your hand for
          you — and put a coach in your corner so you can play it cold.
        </p>
        <div className="mt-9 flex flex-col items-center gap-3">
          <Link
            href="/assess"
            className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-text-inverse shadow-lg transition-opacity hover:opacity-90"
            style={ctaStyle}
          >
            Spot my tell
          </Link>
          <p className="text-sm text-text-muted">
            Free · sixteen questions · three minutes · no bank linking, ever
          </p>
        </div>
      </section>

      {/* The tells */}
      <section className="mx-auto max-w-2xl px-6 pb-20">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
          You&apos;ve been giving it away for years. Here&apos;s what it looks like.
        </h2>
        <div className="mt-10 space-y-7">
          {TELLS.map((line) => (
            <p key={line} className="font-display text-lg font-semibold leading-snug sm:text-xl">
              {line}
            </p>
          ))}
        </div>
        <p className="mt-10 leading-relaxed text-text-secondary">
          If one of those hit, good. That&apos;s not weakness — that&apos;s a tell. And in any game
          worth money, there&apos;s a rule: a tell you can spot is a tell you can stop.
        </p>
      </section>

      {/* The frame */}
      <section className="mx-auto max-w-2xl px-6 pb-20">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Poker players pay coaches to find their tell. You&apos;ve been playing without one.
        </h2>
        <p className="mt-6 leading-relaxed text-text-secondary">
          At a poker table, the amateur isn&apos;t the one with bad cards. He&apos;s the one who
          doesn&apos;t know what his hands do when he bluffs. Everyone else at the table has read him
          for years — he&apos;s the only one who hasn&apos;t.
        </p>
        <p className="mt-4 leading-relaxed text-text-secondary">
          Money works the same way. Your tell was set before you ever earned a dollar, and it fires
          under pressure: pricing, risk, timing, &ldquo;enough.&rdquo; The market has been reading you
          your whole life. Time you got a look at your own cards.
        </p>
      </section>

      {/* The reveal */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Your tell comes back with a name.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center leading-relaxed text-text-secondary">
          Sixteen questions map you to one of twelve player profiles — and none of them flatter you,
          because flattery folds under pressure. Each one comes with two honest lines: the edge your
          game gives you, and the challenge it&apos;s been charging you.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {SAMPLE_PROFILES.map((p) => (
            <div key={p.name} className="rounded-2xl bg-surface-50 p-6">
              <h3 className="font-display text-lg font-semibold" style={{ color: "var(--color-primary)" }}>
                {p.name}
              </h3>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">The edge</p>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">{p.edge}</p>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">The challenge</p>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">{p.leak}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center leading-relaxed text-text-secondary">
          Nine more where those came from. Sixteen questions tell you which one has been signing your
          name.
        </p>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-3xl px-6 pb-20">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
        <div className="mt-10 space-y-8">
          {[
            [
              "01",
              "Get read.",
              "Sixteen questions, three minutes. They're built to catch you mid-tell — you'll feel a couple of them land before the results ever come back.",
            ],
            [
              "02",
              "See the reveal.",
              "Your coach names your tell out loud — as a read, not a verdict. It says something true you hadn't said yourself, then asks the one question that matters. Wrong reads get updated, not defended.",
            ],
            [
              "03",
              "Bring a real hand.",
              "Pricing. Hiring. Raising. Quitting. In the Decision Room, your coach runs the live decision through your full profile — and calls the tell when it shows up mid-hand. It will disagree with you. That's what a corner is for.",
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
        <div className="mt-10 text-center">
          <Link
            href="/assess"
            className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-text-inverse transition-opacity hover:opacity-90"
            style={ctaStyle}
          >
            Spot my tell
          </Link>
        </div>
      </section>

      {/* What this is / isn't */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            [
              "Psychology, not your bank account.",
              "No budgets. No net-worth tracking. No bank linking — ever. We work upstream of the numbers, on the player making the calls.",
            ],
            [
              "Science, not superstition.",
              "Built on published money-belief research — the antidote to the manifestation feed. How you think and act around money predicts your financial well-being better than how much you know about it. You never needed another course. You needed a read.",
            ],
            [
              "A corner coach, not a guru.",
              "Whether you're playing offense or getting out of your own way, you get a scouting report and a coach in your corner. Plain language about how you actually play, and one thing worth trying this week.",
            ],
          ].map(([h, b]) => (
            <div key={h} className="rounded-2xl bg-surface-50 p-6">
              <h3 className="font-display text-base font-semibold">{h}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The stakes */}
      <section className="mx-auto max-w-2xl px-6 pb-20 text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          What changes when you know your tell
        </h2>
        <p className="mx-auto mt-5 max-w-xl leading-relaxed text-text-secondary">
          The rate goes out without the pause. The plan survives contact with your nerves. The
          opportunity gets taken — or passed on for reasons you could defend to a smart friend. And
          &ldquo;enough&rdquo; finally gets a number, which is the only way you&apos;ll ever notice
          you hit it.
        </p>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed text-text-secondary">
          Nobody plays a perfect hand. The pros just know what they do under pressure — and
          you&apos;re about to.
        </p>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
        <div className="rounded-3xl bg-surface-50 px-8 py-14">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            You&apos;ve been at the table your whole life. See your own cards for once.
          </h2>
          <Link
            href="/assess"
            className="mt-8 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-text-inverse transition-opacity hover:opacity-90"
            style={ctaStyle}
          >
            Spot my tell
          </Link>
          <p className="mt-4 text-sm text-text-muted">
            Free · three minutes · If it doesn&apos;t tell you something true about you, close the
            tab.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-50">
        <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <Compass className="h-4 w-4" style={{ color: "var(--color-primary)" }} strokeWidth={1.75} />
              <span className="font-display text-sm font-semibold">The Money Tell</span>
              <span className="text-xs text-text-muted">· Part of the MasteryTV family</span>
            </div>
            <div className="flex gap-6 text-sm text-text-secondary">
              <Link href="/privacy" className="transition-colors hover:text-text-primary">Privacy</Link>
              <Link href="/terms" className="transition-colors hover:text-text-primary">Terms</Link>
              <Link href="/disclaimer" className="transition-colors hover:text-text-primary">Disclaimer</Link>
            </div>
          </div>
          <p className="mt-6 text-center text-xs leading-relaxed text-text-muted sm:text-left">
            The Money Tell is coaching and education on the psychology of money — not therapy, and
            not financial, investment, or tax advice. We never link to or touch your bank account.
          </p>
        </div>
      </footer>
    </main>
  );
}
