# Relatti — Aspirational Home Page + 14-Day Challenge Copy

> Drafts for founder review (2026-07-09). Two pages:
> 1. **Home page** (`/relatti`, i.e. relatti.com) — repositioned from problem-first
>    ("Stop having the same fight") to **mission-first**: a future where more
>    relationships work. This is the brand entry point.
> 2. **`/challenge`** — the 14-Day Challenge: the *positive* beta front door,
>    built so one partner can forward it to the other without it landing as
>    "I think we need help."
>
> The fight headline is not deleted — it moves to the distress-intent entry
> (`/couples` already carries it). Funnels are data (`entry_segment`); the home
> page becomes the aspirational default.
>
> Voice: warm, concise, human. The relationship is the hero — not the AI, not
> the problem. Copy maps 1:1 to `RelattiLanding.tsx` sections where possible.

---

## PAGE 1 — Home page (relatti.com)

### Hero

**Eyebrow:** `A coach for the two of you`

**Headline** (top / accent line — pick one):

| # | Top line | Accent line | Note |
|---|---|---|---|
| **A (recommended)** | The best relationships aren't lucky. | They're understood. | Reframes success from luck → understanding. Aspirational, zero deficit. |
| B | Love brought you together. | Understanding keeps you there. | Warmer, more romantic register. |
| C | Great relationships don't happen. | They're made. | Punchy; "made" sets up the blueprint theme. |

**Subhead:**

> Relatti is a relationship coach for **both of you** — built on a century of
> relationship science and each partner's real psychology. Understand how you
> each love, bond, and handle hard moments. Then put that understanding to work.

**Primary CTA:** `Take the free quiz` (keep — it works)
**Secondary CTA:** `See how it works` (keep)
**Beta variant of secondary CTA:** `Take the 14-Day Challenge →` (route to `/challenge`)

**Under-CTA line:** `Free to start · about 10 minutes · no card required` (keep)

### NEW SECTION — The belief block (manifesto)

Placed between the hero and the pillars. This is the mission-driven brand moment —
short lines, stacked, one thought each. (Design note: centered, generous
whitespace, the last line in `--color-primary`.)

> **We believe more relationships can work.**
>
> When two people work at it *together* — not alone.
> When there's a blueprint instead of guesswork.
> When a hundred years of relationship science lives in your pocket,
> not in a library.
> When the hard conversations happen without the dread.
> When anger gives way to understanding — and understanding to something
> stronger than what you started with.
>
> **That's the future we're building. One couple at a time.**

*Alternative closing line:* `Relatti exists to make that ordinary.`

### Pillars (three cards — light rewrite, growth register)

1. **It knows both of you** *(keep title)*
   Each partner takes a short, validated assessment. The coach holds both
   profiles at once — how you each attach, what closeness looks like to you,
   what you each need to feel loved. *(swapped "handle conflict" for "feel loved" — the conflict card carries that weight)*

2. **It turns friction into understanding** *(was: "It mediates, it doesn't take sides")*
   Every couple has friction — that's two real people, not a flaw. When it
   flares, the coach translates instead of taking sides: "here's what that
   might sound like from their side." It coaches the relationship, not just
   whoever's typing.

3. **It's there in the moments that matter** *(was: "It helps in the moment")*
   Before the big conversation. In the middle of the hard one. After the one
   that went sideways. Get a grounded next step — or have it read a hot
   message before you hit send.

### How it works (three steps — keep structure, tune step 2)

Section intro line (keep concept): `The quiz is the invite. Sharing your result is how your partner joins.`

1. **Take the free quiz** — Find out what kind of partner you are — your
   archetype, in about 10 minutes.
2. **Share it with your partner** *(was "Invite your partner")* — Your result
   is the conversation starter. They take theirs, and now you're linked —
   privately, and by consent.
3. **Meet your coach** — Get your shared Relationship Blueprint and a coach
   that understands you both — where you naturally fit, and where you'll grow.

### Differentiator strip (privacy — keep, one line softened)

Headline (keep): `Your coach knows you're a couple — but never shares what you say with each other.`

Body (rewrite — current copy says "No competitor does dyadic coaching" which is
inside-baseball):

> It understands both of you and what happens between you. But each partner's
> conversations stay private — always. You share a blueprint, not a transcript.
> That's what makes it safe to be honest, and honesty is what makes it work.

CTA: `Find your archetype` (keep). Trust links to /science and /why-ai (keep verbatim — they're good).

### Metadata

- **Title:** `Relatti — The relationship coach for both of you`
- **Description:** `Built on a century of relationship science. Understand how you each love, bond, and handle hard moments — and turn understanding into a relationship that thrives.`

---

## PAGE 2 — /challenge (The Relatti 14-Day Challenge)

> **Function:** the positive, forwardable beta front door. Same funnel as
> `/beta` (code rides the link, before check-in up front, auto-unlock after the
> quiz) — different frame: a *challenge you do together*, not a beta you're
> admitted to. Share as `relatti.com/challenge?code=XXXX`.

### Hero

**Eyebrow:** `The Relatti 14-Day Challenge · free while in beta`

**Headline** (pick one):

| # | Copy | Note |
|---|---|---|
| **A (recommended)** | **Fourteen days. The two of you. See what changes.** | The whole offer in nine words. |
| B | **Two quizzes. One coach. Fourteen days.** | Rhythmic, spec-sheet clarity. |
| C | **Take the 14-Day Challenge together.** | Plainest; weakest without a payoff clause. |

**Subhead:**

> You each take a 10-minute, research-backed quiz. You get a map of how the two
> of you actually work — where you naturally fit, where you tend to grind. Then
> a coach that knows you both, for two weeks. At the end, you tell us what
> changed. That's the whole challenge.

**Primary CTA:** `Start Day 1` *(code-aware: with a valid `?code=`, goes straight into the before check-in; without one, shows the code field / waitlist)*
**Under-CTA:** `Free during beta · both partners get full access · no card, ever`

### The 14 days (timeline section — replaces "how it works")

**Day 1 — Take the quiz, get the map.**
You each take the quiz (about 10 minutes, built on published attachment and
personality science). Answer three quick questions about where the relationship
is today — that's your "before" snapshot. When you've both finished, your
shared Relationship Blueprint unlocks: the first honest map of how you two fit.

**Days 2–13 — Use the coach on real life.**
Bring it the small stuff and the real stuff: the conversation you keep
postponing, the thing that flared on Tuesday, the message you're about to send.
It knows both of your profiles, it doesn't take sides, and what each of you
tells it stays private from the other.

**Day 14 — See what moved.**
Three questions, two minutes — the same snapshot you took on Day 1. You see
what shifted. So do we: it's how we measure whether Relatti actually helps,
not just whether it demos well.

### The deal (honesty box — beta terms, plainly)

> **What it costs: nothing. What we ask: four minutes.**
>
> Relatti is in beta, and challenge couples get free unlimited access — the
> full coach, both partners. In exchange, we ask for two 2-minute check-ins
> (Day 1 and Day 14) and your honest feedback along the way. Check-in answers
> are only ever used anonymously and in aggregate; nothing is quoted publicly
> unless you explicitly say so. Your coaching conversations are never read and
> never used for anything. Period.

### NEW — "Doing this with someone?" (the forwardable invite)

Section header: **Doing this with someone? Steal these words.**

Intro line: `The challenge takes two. If you're the one who found it, here's the text to send — edit at will.`

Copy-to-clipboard block:

> Hey — I found this thing called the Relatti 14-Day Challenge and I want to do
> it with you. We each take a 10-minute quiz, it maps how the two of us
> actually work (apparently it's uncomfortably accurate), and then there's a
> coach that knows both of us for two weeks. It's free because it's in beta and
> they want feedback. Be a guinea pig with me? {{LINK}}

*(Design note: a `Copy message` button; `{{LINK}}` resolves to the sender's
`?code=` link so the partner lands with the code attached. This section is the
whole reason the page exists — it arms the partner conversation.)*

### Who it's for (normalizing strip)

> **You don't have to be in trouble to take the challenge.**
> Couples take it before a wedding, after a move, at year one or year twenty —
> or just because two weeks of actually understanding each other sounded good.
> If things are genuinely hard right now, Relatti can help you talk — but it's
> a coach, not a therapist, and not a substitute for professional help.
> In crisis, reach a real person: in the US, call or text **988**.

### Privacy strip (condensed from home page)

> **You share a blueprint, not a transcript.** You'll each see the other's
> relationship profile — that's the point. What you each say to the coach stays
> private, always. The straight answers about how your coach works: relatti.com/why-ai

### Mini-FAQ (four items)

**Is this couples therapy?**
No. Relatti is a relationship coach crafted and trained on more than a century
of published relationship science. It's for understanding each other and
handling everyday friction better — not a replacement for a therapist, and it
will tell you so itself when something's beyond it.

**What happens after the 14 days?**
Nothing sneaky. Your access doesn't shut off and there's no card on file. We
email you the Day-14 check-in and read every word of your feedback.

**Does my partner have to join?**
The challenge is built for two — the Blueprint and the coach get genuinely good
once both of you have taken the quiz. You can start solo and invite them from
your result.

**What do you do with our answers?**
Check-ins: anonymous, aggregate only, never quoted without explicit permission.
Coaching conversations: never read, never used for anything. Full policy:
relatti.com/privacy

### Metadata

- **Title:** `The Relatti 14-Day Challenge — Fourteen days. The two of you.`
- **Description:** `Take the free 14-day relationship challenge together: one quiz each, a map of how you two work, and a coach that knows you both. See what two weeks changes.`
- **OG title:** `The Relatti 14-Day Challenge` · **OG description:** `Fourteen days. The two of you. See what changes.` *(this is what shows when the link is forwarded — it must look like an invitation, not an ad)*

---

## Implementation notes (build phase, after copy approval)

1. **Home page:** all sections map to existing `RelattiLanding.tsx` slots except
   the **belief block** (new section between hero and pillars) and the pillar
   title/body rewrites. `LandingContent` prop needs no schema change for the
   hero; the belief block is a static section (or a new optional prop if
   entry-segment pages shouldn't show it).
2. **`/challenge`:** new route wrapping the **same funnel as `/beta`**
   (`BetaOffer` logic: code rides `?code=`, before check-in up front, cookie
   survives signup, auto-unlock post-assessment). Options: (a) re-skin
   `BetaOffer` with a `variant="challenge"` content prop, or (b) new page whose
   CTA deep-links to `/beta?code=…` — (a) is better; (b) leaks the "beta admin"
   frame back into view mid-funnel.
3. **Fight headline relocation:** `/relatti` default content changes to the
   aspirational hero; `/couples` (distress intent) keeps "Stop having the same
   fight. Start having the last one." Check `/couples` currently inherits vs
   overrides the default — after this change the default no longer carries it.
4. **Copy-message button** on /challenge builds the sender's code link. If the
   visitor arrived with `?code=`, reuse it; if they're already a signed-in
   tester, use their invite link.
5. **Day-14 email + admin cockpit copy** should adopt challenge language
   ("Day 14 — see what moved") so the frame stays coherent end-to-end.
   `BETA_LAUNCH_COPY.md` welcome email gets a challenge-framed variant next.
6. **BRAND.md** must be read fully before any of the above touches `.tsx`.

## Decisions (Tom, 2026-07-09) — BUILT

- **Headlines: A for both pages.** Home: "The best relationships aren't lucky.
  / They're understood." Challenge: "Fourteen days. The two of you. / See what
  changes."
- **Belief block closing line:** "That's the future we're building. One couple
  at a time."
- **Nothing removed.** `/beta` stays as-is and remains the funnel target — all
  start CTAs on the home page and `/challenge` route to `/beta` (code rides
  the link). The old problem-first home hero moved verbatim to **`/samefight`**
  (old pillar copy preserved via the `legacy` prop; belief block hidden there).
- Implemented 2026-07-09: `RelattiLanding.tsx` (new default hero, belief block,
  pillar/step/differentiator rewrites, challenge cross-link),
  `relatti/page.tsx` metadata, new `samefight/page.tsx`, new
  `challenge/page.tsx` + `ChallengeLanding.tsx`, and the layout inline-script
  brand-path regex now includes `challenge|samefight`.
