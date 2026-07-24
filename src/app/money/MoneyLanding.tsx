import Link from "next/link";
import { Compass } from "lucide-react";
import { FloatingThemeToggle } from "@/components/floating-theme-toggle";
import { HeroChat, type HeroChatMessage } from "@/components/landing/HeroChat";

/**
 * MoneyTraits homepage (the money vertical's marketing surface).
 *
 * Copy: the "/land2 rewrite", founder-approved as THE homepage 2026-07-24 —
 * supersedes the verbatim Cowork deck copy (approved 2026-07-20; in git
 * history at this file, pre-2026-07-24). The rewrite keeps the deck's
 * measurement frame but is written against known AI-copy tells: concrete
 * scenes over abstractions, hard sentence-length variance, a damaging-
 * admission section, plain conversational voice, hero mirrors the visitor's
 * inner monologue (Copyhackers structure) with the time cost upfront.
 *
 * Layout mirrors the pre-rewrite page section-for-section (founder ask,
 * 2026-07-24): two-column hero with the live coach panel, centered H2s,
 * traits in a 2-col card grid, profiles in a 3-col card grid (deliberately
 * unequal copy lengths inside), how-it-works steps, a 3-card honesty band,
 * final CTA block.
 *
 * Guardrails: FTC line — process and felt change, never a wealth-outcome
 * promise (MONEY_DISCOVERY.md §6.2). Money vocabulary per BRAND.md §1.1
 * (traits, "Challenge" register, never "leak"/"LEAP"). No fabricated
 * testimonials or stats (pre-launch: there are none to quote). No "no
 * sign-up" claim: /assess gates at login.
 *
 * BRAND.md: semantic tokens only (emerald via data-brand="money"), Lucide
 * only (Compass), dual-theme, no hardcoded hex. Static server component —
 * CTAs are plain links into the quiz-first funnel.
 *
 * Also served at /land2 (the route the rewrite shipped on, kept as an alias
 * so shared comparison links keep working).
 */

// A Decision Room scene in miniature — invoicing, with SHADOW named. The
// coach ends on process, never an outcome (FTC). Illustrative only; the
// footnote says so.
const HERO_EXCHANGE: HeroChatMessage[] = [
  { who: "person", text: "I've had the invoice drafted since Tuesday." },
  { who: "coach", text: "What's the number on it?" },
  { who: "person", text: "4,800. It was 6,000 on Monday." },
  {
    who: "coach",
    text: "So what happened between Monday and Tuesday?",
  },
  { who: "person", text: "I kept picturing them opening it." },
  {
    who: "coach",
    text: "That picture is SHADOW talking, and it's been wrong about this client twice already. Send it at six tonight. Tell me tomorrow what they actually said.",
  },
];

// Trait lines are deliberately unequal in shape and length — matched-template
// card copy is one of the AI tells the rewrite exists to avoid.
const TRAITS: Array<[string, string]> = [
  [
    "DRIVE",
    "The pushing one. How much you want, and what wanting it that badly does to your judgment.",
  ],
  [
    "GUARD",
    "Protects what you have. Useful, right up until it starts costing you the good risks.",
  ],
  [
    "SHADOW",
    "The oldest of the four. It's whatever money meant in the house you grew up in, still voting from the back of the room. Most people have never heard theirs out loud.",
  ],
  [
    "MIRROR",
    "What the number says about you, to you. People with a loud MIRROR hit their target and then move the target.",
  ],
];

// Three sample profiles in prose — one deep, two quick. Unequal on purpose.
const SAMPLE_PROFILES: Array<{ pair: string; name: string; body: string[] }> = [
  {
    pair: "GUARD × DRIVE",
    name: "The Fortress Builder",
    body: [
      "Saves like it's a moral duty. Has never blown up an account in their life and is quietly proud of that. Also hasn't made a single move in four years that could genuinely change their situation, because every option looks like a threat when GUARD is the one doing the looking.",
      "A Fortress Builder doesn't need a budgeting app. They need someone to say, kindly, that the moat has become the problem.",
    ],
  },
  {
    pair: "SHADOW × DRIVE",
    name: "The Reluctant Rainmaker",
    body: [
      "Ambitious, with a conscience that bills at a discount. Knows the rate is low. Quotes it anyway, then quietly resents it.",
    ],
  },
  {
    pair: "DRIVE × MIRROR",
    name: "The Mogul",
    body: [
      "Plays big and wins often. Still checks the scoreboard the way other people check the weather, because “enough” keeps moving.",
    ],
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
          {/* Toggle lives IN the flex flow (desktop only) so it can't overlap
              the nav; on mobile it moves to the footer, same as Relatti. */}
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
            Take the test
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
            <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
              You keep making the same money mistake.
              <span className="block" style={{ color: "var(--color-primary)" }}>
                You already know which one.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary lg:mx-0">
              Maybe it&apos;s the quote you soften before anyone has even seen it. Maybe
              it&apos;s the move you research for a month and then let pass. Whatever yours
              is, it has a pattern, and the pattern has a name. Sixteen questions find it.
            </p>
            <div className="mt-9 flex flex-col items-center gap-3 lg:items-start">
              <Link
                href="/assess"
                className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-text-inverse shadow-lg transition-opacity hover:opacity-90"
                style={ctaStyle}
              >
                Take the three-minute test
              </Link>
              <p className="text-sm text-text-muted">
                It&apos;s free, and we never ask to see your bank account.
              </p>
            </div>
          </div>

          <HeroChat
            messages={HERO_EXCHANGE}
            label="Sample exchange"
            footnote="An illustration, not a real client. MoneyTraits coaches the psychology behind the decision. It isn't financial advice, and it never links to your bank."
          />
        </div>
      </section>

      {/* The pattern — scenes in prose */}
      <section className="mx-auto max-w-2xl px-6 pb-20">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
          It shows up in small ways first.
        </h2>
        <div className="mt-8 space-y-5 leading-relaxed text-text-secondary">
          <p>
            There&apos;s a version of this that happens at invoicing time. You typed 6,000,
            looked at it for a while, and sent 4,800 with a line about keeping things simple.
            There&apos;s a version at the brokerage login you avoid after a bad week. A version
            in the raise you&apos;ve deserved for two years and rehearsed asking for exactly
            once.
          </p>
          <p>
            The books call this &ldquo;money mindset&rdquo; and hand you affirmations for it.
            Wrong tool. What you&apos;re looking at is a trait: a fixed way of handling money
            you learned before you were old enough to argue with it. Traits ignore
            information. You can&apos;t read your way out of one, which is why the fourth
            personal-finance book worked exactly as well as the first. Seeing your traits during
            decisions, however, is something that can be learned.
          </p>
        </div>
      </section>

      {/* The four traits — 2-col card grid */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
          There are four of them.
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
          Everyone runs all four. The mix is what the test measures.
        </p>
      </section>

      {/* The profiles — 3-col card grid, one card deeper than the others */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Your mix comes back as one of twelve profiles.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {SAMPLE_PROFILES.map((p) => (
            <div key={p.name} className="rounded-2xl bg-surface-50 p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">{p.pair}</p>
              <h3 className="mt-2 font-display text-lg font-semibold" style={{ color: "var(--color-primary)" }}>
                {p.name}
              </h3>
              <div className="mt-3 space-y-3">
                {p.body.map((para) => (
                  <p key={para.slice(0, 24)} className="text-sm leading-relaxed text-text-secondary">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center leading-relaxed text-text-secondary">
          That&apos;s the level the profiles work at. There are nine others. The test tells you
          which one is yours, and it won&apos;t flatter you to keep you comfortable.
        </p>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-3xl px-6 pb-20">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
        <div className="mt-10 space-y-8">
          {[
            [
              "01",
              "Answer sixteen questions.",
              "Multiple choice, about three minutes. A few are uncomfortable in a way you'll recognize.",
            ],
            [
              "02",
              "Read your profile.",
              "It's specific enough to argue with. Some people do argue, and the coach takes that seriously. A profile is a first read, and first reads get corrected.",
            ],
            [
              "03",
              "Bring it a real decision.",
              "Pricing a job, sitting on an offer, deciding whether to quit. The coach knows your profile, so it can tell when a trait is doing the talking instead of you. Expect pushback. A coach that agreed with you all the time would be useless.",
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
            Take the three-minute test
          </Link>
        </div>
      </section>

      {/* What this won't do — the honesty band, 3 cards */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
          What this won&apos;t do
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            [
              "It won't manage your money.",
              "There's no budget screen, no net-worth graph, and we never connect to your bank. Plenty of apps do that already. The problem we work on sits earlier, in the person making the calls.",
            ],
            [
              "It isn't financial advice.",
              "The questions come from published research on money beliefs, and the coaching stays inside what that research supports: the psychology of the decision. What you actually do with your money stays entirely yours.",
            ],
            [
              "It won't land perfectly for everyone.",
              "Some people read their profile and think we got them wrong. Honestly, those tend to be the most useful starting points. Disagreeing with a specific description of yourself teaches you more than nodding along with a vague one ever has.",
            ],
          ].map(([h, b]) => (
            <div key={h} className="rounded-2xl bg-surface-50 p-6">
              <h3 className="font-display text-base font-semibold">{h}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
        <div className="rounded-3xl bg-surface-50 px-8 py-14">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            You already know something&apos;s there.
            <span className="block">Find out what it&apos;s called.</span>
          </h2>
          <Link
            href="/assess"
            className="mt-8 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-text-inverse transition-opacity hover:opacity-90"
            style={ctaStyle}
          >
            Take the three-minute test
          </Link>
          <p className="mt-4 text-sm text-text-muted">
            Free. If your profile reads like a stranger, close the tab.
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
            MoneyTraits is coaching and education on the psychology of money. It is not therapy,
            and not financial, investment, or tax advice. We never link to or touch your bank
            account.
          </p>
        </div>
      </footer>
    </main>
  );
}
