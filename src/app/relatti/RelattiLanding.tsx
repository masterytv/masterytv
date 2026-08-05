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
import { HeroChat, type HeroChatMessage } from "@/components/landing/HeroChat";

// The hero's sample exchange. Written to show the three things the pillars
// claim — it holds both profiles, it translates instead of taking sides, and
// each partner's side of the conversation stays private. Illustrative only:
// no real couple, no real transcript (the footnote says so).
const HERO_EXCHANGE: HeroChatMessage[] = [
  {
    who: "person",
    text: "We had the Sunday planning fight again. I'm done being the only one who tracks everything.",
  },
  {
    who: "coach",
    text: "You two run on different clocks. You plan ahead to feel settled, Sam decides late to stay free. Neither of you is being careless.",
  },
  { who: "person", text: "So what do I even say this time?" },
  {
    who: "coach",
    text: "Try: “I'm not asking you to care about the calendar. I'm asking not to hold it alone.” That's the need underneath the fight.",
  },
  { who: "person", text: "That's actually it." },
  {
    who: "coach",
    text: "Fifteen minutes Sunday, one shared list, phones down. I'll check in after. None of this gets shown to Sam.",
  },
];

const PILLARS = [
  {
    icon: Users,
    title: "It knows both of you",
    body: "Each partner takes a short, validated assessment. The coach holds both profiles at once: how you each attach, what closeness looks like to you, what you each need to feel loved.",
  },
  {
    icon: MessageCircle,
    title: "It turns friction into understanding",
    body: "Every couple has friction. That’s two real people, not a flaw. When it flares, the coach translates instead of taking sides: “here’s what that might sound like from their side.” It coaches the relationship itself, whoever happens to be typing.",
  },
  {
    icon: Heart,
    title: "It’s there in the moments that matter",
    body: "Before the big conversation. In the middle of the hard one. After the one that went sideways. Get a grounded next step, or have it read a hot message before you hit send.",
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
    // Was "Take the free quiz" / "your archetype": RELATTI_EXPERIENCE.md §5.1
    // requires the on-ramp be named as a way to be understood by your partner,
    // NEVER as a personality test, and §0 makes the archetype an instrument
    // rather than the destination.
    title: "Start with your side",
    body: "About ten minutes on how you love and what you need when things get hard.",
  },
  {
    icon: Send,
    step: "2",
    title: "Share it with your partner",
    // Was "Your result is the conversation starter. They take theirs, and now
    // you're linked…" — the vaguest copy on the page, on the step that fails
    // (assessment→partner-invite 0/3). It never said what the partner actually
    // receives or how long their side takes, so the sender was asked to send
    // something they couldn't picture. Both specifics below are the SHIPPED
    // ones: the subject line comes from invite-email.ts (relatti.subject) and
    // the 10 minutes is what that same email tells them. If either changes
    // there, change it here.
    body: "They get an email saying you invited them to understand your relationship together. Ten minutes on their side, then you’re linked, privately and by consent.",
  },
  {
    icon: Compass,
    step: "3",
    title: "Meet your coach",
    body: "Get your shared Relationship Blueprint and a coach that understands you both: where you naturally fit, and where you’ll grow.",
  },
];

// The #1 objection for any couples product, and the one this page answered
// nowhere while 100% of the funnel's drop-off sits at the partner step
// (assessment→partner-invite 0/3, RELATTI_EXPERIENCE.md §5.1).
//
// Both answers are load-bearing product decisions, not reassurance. Solo users
// get the FULL coach by design (§5.6: "never gate coaching or shame the gap"),
// so "start anyway" is literally true. And what the partner opens is a
// description of the SENDER, which is the entire reason the hero is
// outcome-framed rather than pain-framed: the hero is the invite.
//
// Two questions, not three. The page already spends its rule-of-three budget on
// the pillars and the steps (BRAND.md §14.6), and a third answer would dilute
// the one that matters.
const OBJECTIONS = [
  {
    q: "“My partner won’t do this.”",
    a: "Start anyway. Your side works on its own: your profile, and a coach that can help with whatever conversation you’re dreading this week. Plenty of people arrive here as the only one willing to work on it, and we built for them. If your partner joins later, everything you’ve already done still counts.",
  },
  {
    q: "“Won’t sending it feel like an accusation?”",
    a: "What they open is your result: how you love, and what you need when things get hard. Most people send it because they want to be known, and that’s how it reads on the other end.",
  },
];

export interface LandingContent {
  eyebrow: string;
  headlineTop: string;
  headlineAccent: string;
  subhead: string;
}

// Hero: option B of the 2026-08-05 copy audit (founder pick). The headline IS
// the invite — whatever this says becomes the implicit subject line when one
// partner forwards the link, and the funnel's only real failure point is the
// dyad step (signup→assessment 3/5, assessment→partner-invite 0/3, per
// RELATTI_EXPERIENCE.md). A pain-framed hero ("stop having the same fight")
// makes that forward read as an accusation; this one makes it read as a gift.
// The problem-first hero is preserved for distress-intent traffic on
// /samefight (SAMEFIGHT_CONTENT below) — positive here, pain there, routed by
// intent.
//
// Credential line: plain English, no researcher names. "Gottman" and "EFT"
// were tried first and cut (founder, 2026-08-05) — a named authority only buys
// credibility when the reader recognizes the name, and EFT is jargon to a
// layperson. The names live one click away on /science, which is the right
// division of labor: hero states the promise, /science carries the citations.
//
// "Most studied" is deliberate, NOT "most successful": the latter is an
// efficacy superlative (an outcome claim we would have to substantiate), while
// the former is a defensible statement about volume of evidence. It is also the
// stronger word — it says the same thing without asking to be believed.
// Describes where the RESEARCH comes from, never what Relatti delivers; the
// Terms disclaim therapy explicitly (RelattiTerms.tsx). No em dashes (§14.6).
const DEFAULT_CONTENT: LandingContent = {
  eyebrow: "A coach for the two of you",
  headlineTop: "Find out what you’re like to love.",
  headlineAccent: "Then hear what they’d say.",
  subhead:
    "Ten minutes tells you how you attach and what you need to hear when things get hard. Send it to your partner. The coach starts knowing you both. Grounded in the research behind the most studied couples therapies.",
};

// The pre-2026-07 problem-first hero, kept for /samefight.
//
// The headline stays frozen: it is the distress-intent entry and converts that
// avatar best. The SUBHEAD was unfrozen by the founder 2026-08-05: it opened on
// a pair of bare negations ("Not couples therapy…") and carried an em dash,
// making it one of the last two lines blocking check:copy-tells from --strict.
// The therapy distancing survives as a plain negation, which §14.6 permits and
// the gate spares by design.
export const SAMEFIGHT_CONTENT: LandingContent = {
  eyebrow: "A coach that knows both of you",
  headlineTop: "Stop having the same fight.",
  headlineAccent: "Start having the last one.",
  subhead:
    "Coaching, not therapy: a relationship coach grounded in each partner’s real psychology. It mediates issues, runs gentle check-ins, and helps the moment a fight starts.",
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
          <span className="theme-toggle-inline hidden sm:block">
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

      {/* ── Hero — copy on one side, the coach in conversation on the other.
             Stacks to a single centered column below lg. ── */}
      <section className="mx-auto max-w-6xl px-6 pt-14 pb-20 sm:pt-20">
        {/* items-start, not center: the panel grows as the exchange plays, and
            centering would drag the headline down with it. */}
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-14">
          <div className="text-center lg:text-left">
            <span
              className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
              style={{
                background: "color-mix(in oklch, var(--color-primary-container) 12%, transparent)",
                color: "var(--color-primary)",
              }}
            >
              {c.eyebrow}
            </span>

            <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              {c.headlineTop}
              <br />
              <span style={{ color: "var(--color-primary)" }}>{c.headlineAccent}</span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg text-text-secondary lg:mx-0">
              {c.subhead}
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <Link
                href={authed ? "/dashboard" : "/beta"} /* BETA GATE (temporary) */
                className="group inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-text-inverse shadow-card transition-transform hover:-translate-y-0.5"
                style={{ background: "var(--color-primary-container)" }}
              >
                {authed ? "Pick up where you left off" : "Find out what you’re like to love"}
                <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                See how it works
              </a>
            </div>

            {/* BETA GATE (temporary): was "Free to start · about 10 minutes ·
                no card required" while all three start CTAs route to /beta,
                where BetaOffer gates submit on a valid invite code. Promising
                "free to start" and then showing a code wall is a bait read, so
                the requirement is named BEFORE the click. At public launch this
                goes back to "Free to start · … · no card required" along with
                the /beta → /assess switch below. */}
            <p className="mt-5 text-sm text-text-muted">
              Free during the beta &middot; about 10 minutes &middot; invite code required
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
          </div>

          <HeroChat
            messages={HERO_EXCHANGE}
            label="Sample exchange"
            footnote="An illustration, not a real couple. In Relatti, each partner's conversations stay private."
          />
        </div>
      </section>

      {/* ── The belief block: the mission, stated plainly ── */}
      {!legacy && (
        <section className="mx-auto max-w-2xl px-6 py-16 text-center sm:py-20">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            We believe more relationships can work.
          </h2>
          {/* Was five anaphoric "When…" clauses of near-identical length,
              closing on "One couple at a time" (humanizer pass 2026-08-05):
              uniform parallel structure is one of the clearest machine-written
              signatures, and the closer was a stock phrase. Now three sentences
              of deliberately different lengths. The "hundred years of
              relationship science" clause is gone rather than reworded: the
              hero already carries the research credential, and after the
              Gottman/EFT rewrite the two lines contradicted each other. */}
          <div className="mt-8 space-y-4 text-lg leading-relaxed text-text-secondary">
            <p>
              Two people working at it <em>together</em>, with a blueprint
              instead of guesswork.
            </p>
            <p>
              Hard conversations that happen without a week of dread beforehand.
            </p>
            <p>
              Anger that turns into understanding often enough that you stop
              bracing for it.
            </p>
          </div>
          <p
            className="mt-8 font-display text-xl font-semibold"
            style={{ color: "var(--color-primary)" }}
          >
            That&rsquo;s what we&rsquo;re building.
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
          Your result is the invite. Sharing it is how your partner joins.
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

      {/* ── Objections, answered right before the last CTA. Plain prose, no
             icon tiles: every other section on this page is a card grid, and
             §14.6 asks that one template get broken on purpose. Skipped on
             /samefight, which is frozen. ── */}
      {!legacy && (
        <section className="mx-auto max-w-3xl px-6 pb-16">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            The two questions we get most
          </h2>
          <div className="mt-8 space-y-8">
            {OBJECTIONS.map((o) => (
              <div key={o.q}>
                <h3 className="font-display text-lg font-semibold">{o.q}</h3>
                <p className="mt-2 leading-relaxed text-text-secondary">{o.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Differentiator strip ── */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="rounded-3xl bg-surface-50 px-8 py-12 text-center">
          <ShieldCheck className="mx-auto h-7 w-7" style={{ color: "var(--color-primary)" }} />
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-2xl font-semibold leading-snug sm:text-3xl">
            Your coach knows you&rsquo;re a couple, but never shares what you say
            with each other.
          </h2>
          {/* "You share a blueprint, not a transcript" is the one tailing
              negation kept on the page (humanizer pass 2026-08-05): it is the
              differentiator stated at its sharpest, and the hero-chat footnote
              that used to duplicate it was shortened so this owns it. */}
          <p className="mx-auto mt-4 max-w-xl text-text-secondary">
            It understands both of you and what happens between you. Each
            partner&rsquo;s conversations stay private, always. You share a
            blueprint, not a transcript. That&rsquo;s what makes it safe to be
            honest, and honesty is what makes it work.
          </p>
          <Link
            href={authed ? "/dashboard" : "/beta"} /* BETA GATE (temporary) */
            className="mt-8 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-text-inverse transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--color-primary-container)" }}
          >
            {/* Matches the hero CTA verbatim: two different labels for the same
                action was a decision tax for no gain (copy audit 2026-08-05). */}
            {authed ? "Open your dashboard" : "Find out what you’re like to love"}
            <ArrowRight className="h-4.5 w-4.5" />
          </Link>
          {/* Quiet trust links — for the skeptical reader, deliberately understated */}
          <p className="mt-6 text-sm text-text-muted">
            Built on published relationship research.{" "}
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
          <span className="theme-toggle-inline sm:hidden">
            <FloatingThemeToggle />
          </span>
        </div>
      </footer>
    </main>
  );
}
