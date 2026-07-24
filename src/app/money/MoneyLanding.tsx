import Link from "next/link";
import { Compass } from "lucide-react";
import { FloatingThemeToggle } from "@/components/floating-theme-toggle";
import { HeroChat, type HeroChatMessage } from "@/components/landing/HeroChat";

/**
 * MoneyTraits homepage (the money vertical's marketing surface).
 *
 * Copy: the founder-approved "MONEYTRAITS — Homepage Copy" deck (Cowork,
 * approved 2026-07-20), implemented VERBATIM — the measurement frame: traits
 * set early, running quietly under every decision; the assessment measures the
 * mix, the profile names it, the coach helps you work it. Leads with the
 * self-aware struggler ("it was never about the math"), hooks the edge-seeker
 * with trait-as-starting-position. FTC line held everywhere — process and felt
 * change, never a wealth-outcome promise (MONEY_DISCOVERY.md §6.2). No
 * "no sign-up" claim: /assess gates at login.
 *
 * Register note: the deck's "The leak" lines render as "The Challenge" —
 * founder call 2026-07-20 ("Use Challenge vs Leak"), aligning the landing with
 * the in-product card/report/coach vocabulary.
 *
 * BRAND.md: semantic tokens only (themes emerald via data-brand="money"), Lucide
 * only (Compass), dual-theme, no hardcoded hex, no sparkle. Static server
 * component — CTAs are plain links into the quiz-first funnel.
 */

// The three teaser profiles, verbatim from the approved deck (deck-edited
// variants of the MONEY_ARCHETYPES lines).
const SAMPLE_PROFILES = [
  {
    pair: "SHADOW × DRIVE",
    name: "The Reluctant Rainmaker",
    edge: "Ambitious with a conscience.",
    leak: "Self-sabotages at the threshold; undercharges what they're best at.",
  },
  {
    pair: "GUARD × DRIVE",
    name: "The Fortress Builder",
    edge: "Builds safe and compounds. Never blows up.",
    leak: "Too walled-in to make the big leap — a treadmill with a moat.",
  },
  {
    pair: "DRIVE × MIRROR",
    name: "The Mogul",
    edge: "Enormous motivation. Plays big.",
    leak: "Worth rides on the scoreboard, so it never reads “enough.”",
  },
];

// The recognition list — deck order, verbatim.
const RECOGNITION = [
  "You make good money. You couldn't say where it goes.",
  "You know your rate is low. You quote it anyway.",
  "The plan said hold. Your nerves hit sell.",
  "The opportunity was right there. You watched yourself not take it.",
];

// The four traits — deck order + deck lines, verbatim.
const TRAITS: Array<[string, string]> = [
  ["DRIVE", "How hard you push for more, and what the pushing is really for."],
  ["GUARD", "How you protect what you have, and what your protection costs you."],
  [
    "SHADOW",
    "The money story you inherited before you could argue with it. It still gets a vote.",
  ],
  [
    "MIRROR",
    "What your number says about you, to you. The trait that decides whether “enough” ever arrives.",
  ],
];

// The hero's sample exchange — a Decision Room moment in miniature: the coach
// names the trait that's doing the deciding and pushes back. Deliberately ends
// on process, never an outcome or a return (FTC line, MONEY_DISCOVERY.md §6.2).
// Illustrative only; the footnote says so.
const HERO_EXCHANGE: HeroChatMessage[] = [
  {
    who: "person",
    text: "Client wants the quote tonight. I was going to say eight thousand.",
  },
  {
    who: "coach",
    text: "Your last three quotes came down before anyone pushed back on them. That's GUARD deciding, not you.",
  },
  { who: "person", text: "Eight already feels like a lot to ask for." },
  {
    who: "coach",
    text: "Feels like. What's the number if the fear of hearing no weren't in the room?",
  },
  { who: "person", text: "…Twelve." },
  {
    who: "coach",
    text: "Then send twelve and let them be the one to say no. I'll ask you Friday what you actually sent.",
  },
];

export default function MoneyLanding() {
  const ctaStyle = {
    backgroundImage: "linear-gradient(135deg, var(--cta-from), var(--cta-to))",
  };

  return (
    <main className="relative min-h-screen bg-surface-0 text-text-primary">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 lg:px-10">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "color-mix(in oklch, var(--color-primary) 14%, transparent)" }}
          >
            <Compass className="h-5 w-5" style={{ color: "var(--color-primary)" }} strokeWidth={1.75} />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">MoneyTraits</span>
        </div>
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Toggle lives IN the flex flow (desktop only) so it can't overlap the
              nav — as a fixed overlay it sat on top of "Measure my traits" on
              desktop and "Sign in" on mobile. On mobile it moves to the footer,
              same as Relatti. */}
          <span className="theme-toggle-inline hidden sm:block">
            <FloatingThemeToggle />
          </span>
          <Link href="/login" className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary">
            Sign in
          </Link>
          <Link
            href="/assess"
            className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-text-inverse transition-opacity hover:opacity-90 sm:inline-flex"
            style={ctaStyle}
          >
            Measure my traits
          </Link>
        </div>
      </nav>

      {/* Hero — copy on one side, the coach mid-decision on the other. Stacks
          to a single centered column below lg. */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-14 lg:px-10 lg:pt-20">
        {/* items-start, not center: the panel grows as the exchange plays, and
            centering would drag the headline down with it. */}
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-14">
          <div className="text-center lg:text-left">
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              You don&apos;t run your money.
              <span className="block">
                Your <span style={{ color: "var(--color-primary)" }}>traits</span> do.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary lg:mx-0">
              They were set before you ever earned a dollar — and they still decide what you charge,
              what you risk, and what counts as enough, a half-second before you think you&apos;ve
              decided. Sixteen questions measure the four traits behind every dollar you&apos;ve
              made, kept, or lost. Because a trait you can see is a trait you can work.
            </p>
            <div className="mt-9 flex flex-col items-center gap-3 lg:items-start">
              <Link
                href="/assess"
                className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-text-inverse shadow-lg transition-opacity hover:opacity-90"
                style={ctaStyle}
              >
                Measure my traits
              </Link>
              <p className="text-sm text-text-muted">
                Free · sixteen questions · three minutes · no bank linking, ever
              </p>
            </div>
          </div>

          <HeroChat
            messages={HERO_EXCHANGE}
            label="Sample exchange"
            footnote="An illustration, not a real client. MoneyTraits coaches the psychology behind the decision — it isn't financial advice, and it never links to your bank."
          />
        </div>
      </section>

      {/* The recognition */}
      <section className="mx-auto max-w-2xl px-6 pb-20">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
          It was never about the math.
        </h2>
        <p className="mt-6 text-center leading-relaxed text-text-secondary">
          You&apos;ve read the books. The problem was never information.
        </p>
        <div className="mt-10 space-y-7">
          {RECOGNITION.map((line) => (
            <p key={line} className="font-display text-lg font-semibold leading-snug sm:text-xl">
              {line}
            </p>
          ))}
        </div>
        <p className="mt-10 leading-relaxed text-text-secondary">
          None of that is a knowledge gap, and none of it is a character flaw. It&apos;s a trait doing
          exactly what it was built to do — quietly, automatically, and without asking you first.
        </p>
      </section>

      {/* The four traits */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Four traits run every money decision you make.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {TRAITS.map(([name, line]) => (
            <div key={name} className="rounded-2xl bg-surface-50 p-6">
              <h3
                className="text-sm font-bold uppercase tracking-[0.14em]"
                style={{ color: "var(--color-primary)" }}
              >
                {name}
              </h3>
              <p className="mt-2 leading-relaxed text-text-secondary">{line}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center leading-relaxed text-text-secondary">
          You carry all four. The mix is yours alone — and the mix is measurable.
        </p>
      </section>

      {/* The profile */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Your mix comes back as one of twelve profiles.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center leading-relaxed text-text-secondary">
          Each profile gets two honest lines — the edge your traits give you, and the challenge
          they&apos;ve been charging you. Flattery isn&apos;t measurement, so you won&apos;t get any.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {SAMPLE_PROFILES.map((p) => (
            <div key={p.name} className="rounded-2xl bg-surface-50 p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">{p.pair}</p>
              <h3 className="mt-2 font-display text-lg font-semibold" style={{ color: "var(--color-primary)" }}>
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
              "Measure.",
              "Sixteen questions, three minutes. Built to be self-revealing — you'll catch a trait in the act before the score ever comes back.",
            ],
            [
              "02",
              "Meet your profile.",
              "Your coach walks you through the result and names something true you hadn't said out loud. It's a working hypothesis, not a verdict — wrong reads get updated, not defended.",
            ],
            [
              "03",
              "Work the traits.",
              "Bring a real decision: pricing, hiring, raising, quitting. In the Decision Room, your coach runs it through your full profile — and pushes back when a trait is doing the deciding instead of you. It will disagree with you. That's the point.",
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
            Measure my traits
          </Link>
        </div>
      </section>

      {/* The objection */}
      <section className="mx-auto max-w-2xl px-6 pb-20">
        <div className="rounded-3xl bg-surface-50 px-8 py-10">
          <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            &ldquo;So my traits are just&hellip; who I am?&rdquo;
          </h2>
          <p className="mt-4 leading-relaxed text-text-secondary">
            No. A trait is a starting position, not a sentence. The Fortress Builder doesn&apos;t have
            to become reckless to make the leap — he has to know Guard is voting, hear the vote, and
            decide anyway. The trait doesn&apos;t change first. The outcome does. That&apos;s the
            whole method: not a new you, just a you that stops deciding unsupervised.
          </p>
        </div>
      </section>

      {/* What this is / isn't */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            [
              "Psychology, not your bank account.",
              "No budgets. No net-worth tracking. No bank linking — ever. We work upstream of the numbers, on the person setting them.",
            ],
            [
              "Science, not woo.",
              "Built on published money-belief research — the antidote to the manifestation feed. Psychology and habits predict financial well-being more strongly than financial knowledge does. You never needed another course. You needed a mirror with better resolution.",
            ],
            [
              "A coach, not a curriculum.",
              "Whether you're playing offense or getting out of your own way, you get a scouting report and a corner coach. Not a diagnosis. Not a guru. Not twelve weeks of homework.",
            ],
          ].map(([h, b]) => (
            <div key={h} className="rounded-2xl bg-surface-50 p-6">
              <h3 className="font-display text-base font-semibold">{h}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The payoff */}
      <section className="mx-auto max-w-2xl px-6 pb-20 text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          What changes when you can see the mix
        </h2>
        <p className="mx-auto mt-5 max-w-xl leading-relaxed text-text-secondary">
          Cleaner calls, made for reasons you could say out loud. The challenge, watched instead of
          paid. The rate quoted without the wince. And &ldquo;enough&rdquo; finally getting a number —
          clarity, control, and the end of never-enough.
        </p>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
        <div className="rounded-3xl bg-surface-50 px-8 py-14">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Twenty years of money decisions, explained in three minutes.
          </h2>
          <Link
            href="/assess"
            className="mt-8 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-text-inverse transition-opacity hover:opacity-90"
            style={ctaStyle}
          >
            Measure my traits
          </Link>
          <p className="mt-4 text-sm text-text-muted">
            Free · sixteen questions · If it doesn&apos;t tell you something true about you, close
            the tab.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-50">
        <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <Compass className="h-4 w-4" style={{ color: "var(--color-primary)" }} strokeWidth={1.75} />
              <span className="font-display text-sm font-semibold">MoneyTraits</span>
              <span className="text-xs text-text-muted">· Part of the MasteryTV family</span>
            </div>
            <div className="flex gap-6 text-sm text-text-secondary">
              <Link href="/privacy" className="transition-colors hover:text-text-primary">Privacy</Link>
              <Link href="/terms" className="transition-colors hover:text-text-primary">Terms</Link>
              <Link href="/disclaimer" className="transition-colors hover:text-text-primary">Disclaimer</Link>
            </div>
            {/* Mobile home for the theme toggle — the nav has no room for a third
                control at phone widths; on sm+ it's inline in the nav. */}
            <span className="theme-toggle-inline sm:hidden">
              <FloatingThemeToggle />
            </span>
          </div>
          <p className="mt-6 text-center text-xs leading-relaxed text-text-muted sm:text-left">
            MoneyTraits is coaching and education on the psychology of money — not therapy, and not
            financial, investment, or tax advice. We never link to or touch your bank account.
          </p>
        </div>
      </footer>
    </main>
  );
}
