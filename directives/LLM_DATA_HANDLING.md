# Relatti — LLM Data Handling (E15.2) — founder action checklist

> **Status:** OPEN — founder action required (console config + DPA signing). Researched 2026-07-01.
> **Why this exists:** the relatti21 user *literally asked* whether his disclosures go to the model provider and are used to train (conv `85950a7f`, n77). Before the Privacy Policy can stand behind "not used to train third-party models," we need this confirmed + contractual. Grounds `PRIVACY_TERMS_LIABILITY_PLAN.md` §6.1 and the E15.2 gate comment in `src/app/(legal)/_content/RelattiPrivacy.tsx` §4.
> **NOT LEGAL ADVICE** — the attorney (E15.6) reviews the DPAs.

## The good news (verified 2026-07-01)

Both providers **already default to no-training on API/commercial traffic** — so the core of what the user asked is true today, before we sign anything.

| | **Anthropic (Claude)** — the Relatti coach + safety sweep | **OpenAI** — async fact-extraction, summaries, embeddings |
|---|---|---|
| **Trains on our data by default?** | **No** (Commercial Terms / API). Only if we explicitly opt in. | **No** (API platform inputs+outputs excluded from training by default). |
| **Default retention** | Inputs/outputs auto-deleted **within 30 days**; User-Safety classifier results retained to enforce usage policy. | Up to **30 days** for abuse monitoring, then deleted — *unless under legal hold* (see caveat). |
| **DPA** | **Auto-incorporated** into the Commercial Terms of Service (accepting Commercial ToS = accepting the DPA + SCCs); viewable/signable in the Privacy Center. | Executable DPA available for GDPR/CCPA. |
| **Zero Data Retention (ZDR)** | Available to some Enterprise/Claude-Platform customers, **by approval**; safety-classifier results still retained. | Available for **eligible endpoints/use-cases, by approval**; also removes content from abuse-monitoring logs. |

## ⚠️ The caveat that matters for Relatti (subpoena/retention risk)

OpenAI has been under a **court preservation order** (the *New York Times* copyright litigation) that compelled it to **retain API logs it would otherwise have deleted** — potentially overriding the 30-day deletion and even ZDR — while the order stands. This directly intersects Relatti's §3.4 subpoena/custody-discovery risk: "deleted within 30 days" is not something we can promise about OpenAI-processed content while a litigation hold is in force. **Attorney must review current status; prefer routing the most sensitive processing through Anthropic where feasible, and minimize what we send OpenAI.** (Relatti already sends OpenAI only fact-extraction/summarization/embeddings, not the raw safety-critical coaching turn — keep it that way.)

## Founder action items (in order)

- [ ] **Anthropic:** confirm the Relatti API key's org is on **Commercial Terms** (not Consumer). View + sign the **DPA** in the Anthropic Privacy Center. Decide whether to request **ZDR** (Enterprise, approval) or accept the default 30-day + no-train (likely sufficient for launch).
- [ ] **OpenAI:** execute the **DPA** for the Relatti org. Request **ZDR** for the endpoints Relatti uses (embeddings + chat/completions for post-processing), or confirm the default no-train + 30-day. **Confirm the current status of the litigation-hold** and whether it affects our data.
- [ ] **Subprocessor list:** record Anthropic, OpenAI, Supabase, Resend, Vercel (+ Twilio when SMS lands) with their DPA status in the Privacy Policy's subprocessor section.
- [ ] **Once both DPAs are signed:** firm up the qualifier in `RelattiPrivacy.tsx` §4 (remove the "finalizing" language) and delete the E15.2 gate comment there.

## Sources
- [Anthropic — commercial DPA (Privacy Center)](https://privacy.anthropic.com/en/articles/7996862-i-am-a-commercial-customer-how-do-i-view-your-data-processing-addendum-dpa)
- [Anthropic — data retention](https://privacy.anthropic.com/en/articles/7996866-how-long-do-you-store-personal-data)
- [Anthropic — zero-retention scope](https://privacy.anthropic.com/en/articles/8956058-i-have-a-zero-retention-agreement-with-anthropic-what-products-does-it-apply-to)
- [OpenAI — enterprise privacy](https://openai.com/enterprise-privacy/)
- [OpenAI — your data (API data controls)](https://developers.openai.com/api/docs/guides/your-data)
- [OpenAI — response to NYT data demands (litigation hold)](https://openai.com/index/response-to-nyt-data-demands/)
