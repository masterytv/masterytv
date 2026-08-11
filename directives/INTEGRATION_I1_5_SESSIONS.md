# I1.5 — the sessions

> **What this is:** the runbook for the kill gate. Recruiting ask, session protocol, capture sheet, and the shape of the recommendation that closes Sprint 0.
> **Parent:** [INTEGRATION_SPRINT.md](INTEGRATION_SPRINT.md) §3 / I1.5. **Experience:** [INTEGRATION_EXPERIENCE.md](INTEGRATION_EXPERIENCE.md) §5.4.
> **Internal only.** This document uses clinical words plainly because it is an operating note for the founder. None of its sentences may be lifted into product copy, prompts or marketing — that text is governed by the deny-list gate (`npm run check:deny-list`).
> Created August 11, 2026.

---

## 1. The question, and what an answer looks like

One question decides whether this vertical gets built:

> **Did that make you feel less alone, or did it make you feel studied?**

**Go** looks like: they go quiet, or they read one of the excerpts twice, or they say some version of *"that's the bit I never tell anyone."* They want to see more of them. They ask who the person was.

**No-go** looks like: politeness. *"Yeah, that's interesting."* A pivot to how the system works instead of what it said. Any version of *"so you've got a database of us."* Someone visibly composing a reaction for your benefit is a no-go and it is the easiest one to miss.

The gate is not a score. It is a founder's written call, and it is allowed to be a no-go — §3/I1 exists so that a wrong thesis costs one sprint instead of five.

---

## 2. What is being tested here, and what is not

**Being tested:** whether another person's words, arriving at the right moment, land as company.

**Not being tested here:** whether a language model can pick that moment. That is the harder half of the founder's August 11 decision, and it cannot be tested yet — the model that would do the picking has no pack of its own (I4), no memory-write filter (I3.1), no desire-to-return crisis pattern (I3.2) and no consent screen (I5.5). Running it against real experiencers now would put the population the safety kernel is weakest on in front of the coach built to solve problems. It is scheduled instead as an acceptance test on I4.4, in §5 below.

So in these sessions **you are the coach.** You listen; you decide the moment; you show three accounts. The mechanic under test is identical — the timing is executed by a human who can be trusted with it, and what you learn about the moment becomes I4.4's tool description.

**The policy you are executing** (founder, August 11 — now encoded in `FIND_SIMILAR_ACCOUNTS_TOOL`):

- Not on the turn their account arrives. Listen, and keep listening.
- Not every time they add another piece of it.
- Only when they say, in whatever words, that they are alone in it, that nobody else can have been through it, that they wonder whether anyone has, or that they cannot say it out loud to anyone.
- Three accounts, not nine. Short excerpts, each with its link.
- If you are not sure they feel that way, ask, and wait.

---

## 3. Recruiting

**Target: eight.** The story says five to ten and the Done box says ten. Below five, one strong reaction decides the gate on its own. Recruit from IANDS contacts and the founder network; do not post publicly, because a self-serve tester needs the consent screen, the 18+ gate and the state blocklist first (I5.5, I11.2–3).

Mix them deliberately. Four people who are years past it and settled will tell you the mechanic is pleasant. The reaction that decides this is from someone still inside it.

- 2–3 within about eighteen months of the experience
- 2–3 several years out, integrated
- 1–2 who have never told anybody outside their household
- 1 sceptic — someone who thinks it was their brain and says so

### The ask

> I'm building something for people who've had an experience like yours and find there's nowhere to put it. Before I build any more of it I want to show one piece to about eight people and find out whether it's right or whether it's the wrong idea altogether.
>
> It takes about forty minutes, on a call. You'd tell me what happened to you — as much or as little as you want. At some point I'd show you what other people have said about the same thing: real accounts, in their own words, out of a collection of several thousand. Then I'd ask you one question about how that felt.
>
> I'm not going to tell you what your experience was, and nothing here decides anything about you. I'm not selling anything and there's nothing to sign up for. You can stop at any point.

Say the true thing about what you keep. If you are keeping their account, say so before they start, not after. See §4.

---

## 4. The session

**Forty minutes. Video call, or in person. Not a group.**

### Before

- `/admin/integration` open in a tab you have already signed into. Confirm it works today — run the built-in sample first, not their account.
- Decide, and be ready to say, what happens to their account afterwards. There is no consented store yet, so anything you keep is a personal note. The product decision — that a person's account is stored and the coach remembers it — is real and is Sprint 1's job (§5), not this session's.
- Have 988 and the Crisis Text Line number where you can see them. See §6.
- Notepad, not a recording, unless they explicitly agree to one.

### The listening half

Open with one line and then stop talking:

> Tell me what happened. Take as long as you want. I'm not going to tell you what it was.

Then listen. Do not ask what it meant, do not offer a frame, do not name anything. When they stop, wait longer than is comfortable; most of them have never had the whole thing out and the last part is usually the part they have never said.

Ask only phenomenological questions, present tense, and never a question that supplies content. *"What was the light like?"* plants a light. *"What was that like?"* does not.

**Do not reach for the screen here.** The urge to show them the matches while they are still telling you is the exact failure the policy exists to prevent, and you will feel it.

### The moment

Wait for the signal. It usually arrives as one of:

- *"You must think I'm insane."*
- *"I've never told anyone this."*
- *"I don't know if anyone else has had this."*
- *"There's no one I can say this to."*

If it does not arrive on its own, ask once, plainly: **"Is there anyone you can say this to?"** Then wait. If they are settled and connected and the signal never comes, that is a finding — write it down, and either end without showing them anything or ask permission first: *"Would it be any use to see what other people have said about this?"*

### The reveal

Paste their account. Show **three**. Read the matched claim in their own words first — *"you said you knew without being told"* — then the excerpt.

Do not narrate, do not explain the retrieval, do not apologise for a weak match. Then stop talking again.

### The one question

Ask the open one first and let it breathe:

> **What was that like?**

Write down what they say **verbatim**, before you ask anything else. Only then ask the binary:

> **Did that make you feel less alone, or did it make you feel studied?**

The order matters. Asking the binary first hands them both words and you will get one of them back with nothing attached.

Then two follow-ups, and no more:

- **"Was there one of those you'd want to see the rest of?"** (want-more is the strongest signal there is)
- **"What did we get wrong?"**

### Closing

Thank them, tell them what you will do with what they said, and tell them what happens next — including that it might be nothing.

---

## 5. Capture sheet

One block per session, filled in within the hour. Verbatim or it is worthless: a paraphrase of a reaction is your interpretation of the thing you are trying to measure.

```
SESSION #        DATE            LENGTH
Recruited via
Time since the experience
Told anyone before? (nobody / household only / some / openly)

THE SIGNAL
  Did it arrive on its own, or did you have to ask?
  Their exact words:
  How many minutes in:

THE REVEAL
  Accounts shown (video ids):
  Claims those answered:
  Anything visibly wrong with the match:

VERBATIM — "What was that like?"
  (their words, unedited, before the binary question)

THE BINARY — less alone / studied / neither / both
  Their words:

WANT MORE?   yes / no        Their words:
WHAT DID WE GET WRONG?

YOUR READ
  Politeness, or real?
  What surprised you:
  Would this person come back next week?
```

---

## 6. The floor for a live session

You are talking to real people about the worst or strangest hour of their lives, without any of the machinery Sprint 1 builds. Three things to hold.

1. **Desire to return is common here and it does not look like crisis.** Someone can say *"I didn't want to come back"* — the sample account in the probe says exactly that — calmly, years later, while functioning perfectly, and mean it as description rather than intent. It is also the pattern the existing kernel scores as low risk (§3/I3.2), and in a live session there is no kernel at all. **Distinguish it as a person, out loud, once:** *"When you say you didn't want to come back — is that then, or is that now?"* If the answer is now, stop the protocol, stay with them, and use the numbers. There is no version of this session worth completing over that.
2. **Terror alone is not an emergency**, and treating it as one ejects the people who need this most (§3/I3.3). A frightening encounter told by someone who is sleeping, working and connected is a session that continues.
3. **You are not qualified to say which one it is, and neither is the product.** If they ask, say so. That sentence is the triage page's whole thesis (§3/I9.3) and it is the most trustworthy thing you can say.

---

## 7. The recommendation

Sprint 0 closes when you write it. One page, in `INTEGRATION_SPRINT.md` §3 under I1.5:

1. **The call** — go, no-go, or go-with-a-change. State it in the first line.
2. **The count** — sessions run, and how many landed as company against studied.
3. **The three most useful verbatims**, including the worst one.
4. **What the moment looked like** — did the signal arrive on its own, how far in, and what words carried it. This is the input to I4.4's tool description and it is the most valuable thing these sessions produce.
5. **What broke** — bad matches, wrong excerpts, anything that read as a machine.
6. **What changes before I2**, if anything.

### The test this one does not cover

Record it as an acceptance criterion on **I4.4**, to run once I3 and the pack exist:

> A full conversation where the model holds the account through several turns without reaching for `find_similar_accounts`, calls it on the turn the person says they are alone in it, and shows three with links. Failing that, the tool comes out — the founder's August 11 rule is that this is either well integrated or left out.
