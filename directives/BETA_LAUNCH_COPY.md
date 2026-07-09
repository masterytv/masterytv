# Relatti Beta — Launch Copy & Runbook

> Drafts for the 20-tester free beta (friends/family → Reddit). Admission is by
> **invite code** (see the invite-code gate: `/admin/beta` → *Invite codes*).
> Voice: warm, concise, human — the relationship is the hero, not the "AI".
> Placeholders: `{{NAME}}`, `{{CODE}}`. Founder to review/personalise before sending.

---

## How to run the beta (runbook)

1. **Make codes** in `/admin/beta` → *Invite codes*.
   - Friends/family: one code each (max uses `1`), or a single shared code (e.g. max uses `25`).
   - Reddit: one code with a cap you're comfortable paying for (e.g. max uses `50`, expires in `14` days). The cap is your cost ceiling — nobody past it can unlock.
2. **Send the welcome email** below with that person's code (or post the Reddit copy with a public code).
3. **Watch `/admin/beta`.** Invite → claim is the metric. The funnel bar shows where people drop off; each tester row shows whether their partner has joined, their check-in status (n/2), and their feedback inline.
4. **The before/after loop runs itself.** Unlocking requires a 2-minute *before* check-in (their CSI-4 satisfaction baseline comes from the quiz automatically). At day 14 a cron emails them the *after* check-in (max 3 nudges, 3 days apart — soft, access never revoked) and a banner shows on their dashboard. The **Check-ins panel** in `/admin/beta` shows the marketing numbers as they accrue: **% scored happier (paired CSI-4)**, avg CSI change, % felt better, avg recommend — plus every quote-approved testimonial, ready to lift into marketing.
5. When a code fills up (status **FULL**) or you want to stop, **deactivate** it (power toggle) or let it expire.

> Reminder before Reddit: confirm `support@` / `privacy@` forwards exist —
> the legal pages reference them. (`RESEND_API_KEY_RELATTI` in Vercel: ✅ confirmed 2026-07-09.)

---

## 1) Tester welcome email

**Subject line** (pick one):
- `You're in — here's your Relatti code`
- `Your Relatti beta invite (+ the one thing that makes it work)`
- `Welcome to the Relatti beta, {{NAME}}`

**Preheader:** `Your code's inside. The magic starts when your partner joins too.`

**Body:**

Hi {{NAME}},

Thanks for helping test Relatti while it's still rough around the edges.

Relatti is a coach for your *relationship* — not another self-improvement app you use alone. You take a short quiz about how you connect, bond, and handle conflict, and you get a coach that actually understands you. It gets genuinely useful once it understands **both** of you.

**Getting started (about 10 minutes):**

1. Go to **relatti.com** and create your account.
2. Take the quiz — it's the attachment + personality science the coaching runs on.
3. When you're asked to unlock unlimited coaching, enter your code:

   **`{{CODE}}`**

   That's your free pass for the whole beta — no card, no charge.

**The one thing that makes Relatti click:** invite your partner. The coach can only see the whole picture — where you two naturally fit and where you'll rub — once you've both taken the quiz. You'll each see the other's relationship profile; what you say to your coach always stays private between the two of you. (More on exactly how that works: relatti.com/why-ai)

**The whole deal:** free unlimited access in exchange for two 2-minute check-ins — three quick questions when you unlock, and a short follow-up at the 2-week mark (I'll email you). Your answers are only ever used anonymously, in aggregate; nothing is quoted publicly unless you explicitly say so on the form. Your coaching conversations are never read or used for anything — period.

**And beyond that:** tell me the truth. What felt off, what was confusing, what you loved. There's a feedback button in the corner of every screen — use it liberally. You're shaping this.

A couple of honest notes: Relatti is an AI coach, not a therapist, and not a substitute for professional help. If you're ever in crisis, please reach a real person right away — in the US, call or text **988**. And this is a beta, so you *will* hit the occasional rough edge — that's exactly what I want to hear about.

Thank you, genuinely.

— Tom
Founder, Relatti
*Reply straight to this email — it comes to me.*

---

## 2) Reddit post

> Reddit etiquette: most relationship subs (r/relationships, r/relationship_advice)
> **ban self-promotion** — do not post there. Better fits: r/SideProject,
> r/InternetIsBeautiful, r/androidapps-style "I built this" communities, or a
> relationships/couples community that explicitly allows creator posts. Read each
> sub's rules first, post from a real account with history, and reply to comments.
> Lead with honesty, not a pitch.

**Title options:**
- `I built an AI relationship coach that only works if both partners use it — free beta, looking for honest feedback`
- `Coaching apps die because you use them alone. I tried to fix that with the one stake you can't ghost: your partner. [free beta]`

**Body:**

I've been building **Relatti**, an AI coach for a relationship rather than for one person.

The itch I couldn't shake: solo self-improvement apps almost all get abandoned around week three, because there's no one on the other side. A relationship has someone on the other side by definition. So Relatti starts with a short, research-backed quiz (attachment style, personality, relationship satisfaction), and the coaching gets real once **both** partners have taken it — it can see where you two actually fit and where you'll grind, instead of guessing from one side.

It's honest about what it is: an AI coach, not a therapist, and not a replacement for real help if things are serious. Couples see each other's relationship profiles — that's the point — but what each of you says to the coach stays private from your partner by design. If you want the evidence it's built on and the straight answers about the AI, those are at relatti.com/science and relatti.com/why-ai.

It's a rough beta and it's **free** while I test it. The deal: two 2-minute check-ins (one at the start, one at two weeks) so I can measure whether it actually helps — answers only ever used anonymously and in aggregate. Beyond that I'm mostly after blunt feedback, ideally from couples who'll both try it.

If you want in, the first {{N}} people can use code **`{{CODE}}`** at relatti.com to unlock it. If that's run out by the time you read this, comment or DM and I'll sort you out.

Happy to answer anything — including the skeptical stuff. What would make you actually trust something like this?

---

### Notes for Tom
- Swap `{{N}}` to match the Reddit code's cap so the post and the code agree.
- Keep a code in reserve for people who DM after the public one fills.
- If a sub bans links, drop the URLs from the body and put "link in profile/comments."
- The welcome email's "reply to me" line needs a monitored inbox — `tom@relatti.com` is confirmed receiving.
