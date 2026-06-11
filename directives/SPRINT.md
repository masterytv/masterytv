# Sprint Plan — Mastery Coach App + Decoded

> **Author:** Thomas Wood + Antigravity Orchestrator
> **Date:** March 30, 2026 | Updated: June 11, 2026
> **Version:** 2.0 (Reality check — marked all live features complete; billing moved to end)
> **Status:** ✅ Gate 3 Approved | App live at masterytv.com | Staging workflow operational
> **Source:** [ARCHITECTURE.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/ARCHITECTURE.md) | [DECODED.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED.md)
> **Methodology:** BMAD + Antigravity Method

---

> [!IMPORTANT]
> **MANDATORY for all UI stories:** Before writing any CSS, component, or inline style, read `directives/BRAND.md` §2 (Color System), §3 (Typography), and §14 (Visual Anti-Patterns). All font sizes must use defined type scale tokens. All colors must use CSS custom properties from `globals.css @theme`. No hardcoded hex values. No emoji icons — Lucide only (§14.1.1).

---

## 0. Sprint 0 — Decoded (Top-of-Funnel) ✅ CORE COMPLETE

> **Tagline:** *"You, decoded."*
> **License Status:** ✅ All instrument licenses resolved (May 19, 2026)

---

### Sprint 0.1 — Assessment Engine ✅ COMPLETE

- [x] **S0.1.0a** — Create `DECODED_SCHEMA.md`
- [x] **S0.1.0b** — Create `DECODED_SCORING.md` with scoring keys for all 13 instruments
- [x] **S0.1.0c** — Create `DECODED_ARCHETYPES.md` with archetype definitions
- [x] **S0.1.1** — Supabase schema: `assessments`, `assessment_progress`, `assessment_responses`, `assessment_scores`, `assessment_reports`, `assessment_profiles` + RLS
- [x] **S0.1.2** — Auth-first assessment flow (Google OAuth + email magic link)
- [x] **S0.1.3** — Multi-step assessment form at `/decoded` — one question at a time, per-question persistence
- [x] **S0.1.4** — Complete Core battery (~113 items): IPIP-50, RIASEC, ECR-R Short, SWLS, SCS-SF, DERS-16, WEIMS, Flourishing Scale, Decoded Wellness Check
- [x] **S0.1.4a** — Optional add-on screen: GAD-7, ASRS, CSI-4, ACE-3
- [x] **S0.1.5** — Scoring functions for all 13 instruments
- [x] **S0.1.5a** — Response validity check (straight-lining detection)
- [x] **S0.1.6** — Raw responses in `assessment_responses` + computed scores in `assessment_scores`
- [x] **S0.1.7** — Resume flow: auto-authenticate + restore exact position

---

### Sprint 0.2 — Report Generator ✅ COMPLETE

- [x] **S0.2.1** — Report prompt architecture (scoring data → section-by-section generation)
- [x] **S0.2.1a** — Async report generation pipeline with Realtime updates (sections appear one at a time)
- [x] **S0.2.2** — 7 free sections: RS01–RS07
- [x] **S0.2.3** — 5 locked sections: RS08–RS12 (blur-gated)
- [x] **S0.2.4** — Web report viewer: premium editorial aesthetic, data visualizations
- [x] **S0.2.5** — `@media print` stylesheet + browser PDF export
- [x] **S0.2.6** — Report cached in `assessment_reports` — generate once, serve many
- [x] **S0.2.7** — Safety layer: clinical framing, crisis gateway for suicidal ideation items
- [x] **S0.2.8** — Section-specific prompt templates (all 12 sections)
- [x] **S0.2.9** — Archetype system: 16 base types from Big Five clusters + AI sub-label
- [x] **S0.2.10** — Report polish V2: editorial tone, premium layout, richer visualizations ✅ June 2, 2026

---

### Sprint 0.4 — Coach Handoff Integration ✅ COMPLETE

- [x] **S0.4.1** — `assessment_profile` schema + generation ✅
- [x] **S0.4.2** — Assessment profile injected as Layer 4.5 in `prompt-assembler.ts` ✅
- [x] **S0.4.3** — Context-aware coach opening message ✅
- [x] **S0.4.4** — Decoded onboarding bypass (assessment replaces LinkedIn/website research) ✅
- [x] **S0.4.4a** — Archetype voice seeded into `coach_profiles.voice_id` ✅
- [x] **S0.4.5** — Coach handoff validated with real assessment profiles ✅
- [x] **S0.4.6** — "Meet your coach" CTA in report Section 10 ✅
- [x] **S0.4.7** — Deep-link URL scheme `/dashboard/chat?context={key}&section={id}` ✅
- [x] **S0.4.8** — "Chat with Your Coach About This" CTAs in Growth Edges, trait sections, coach questions ✅
- [x] **S0.4.9** — Context-aware first message from deep link ✅
- [x] **S0.4.10** — Decoded onboarding bypass via deep links ✅
- [x] **S0.4.11** — Deep-link engagement tracking (`report_events` table) ✅

---

### Sprint 0.5 — Launch Preparation & Viral Features 🔄 IN PROGRESS

- [x] **S0.5.1** — `/decoded` landing page: hero, value prop, sample report, auth section ✅ June 3, 2026
- [x] **S0.5.2** — Shareable personality cards (Story 9:16, Feed 1:1, Landscape formats) ✅ June 3, 2026
- [x] **S0.5.3a** — `decoded_invites` schema with full lifecycle + consent model ✅
- [x] **S0.5.3b** — Invite creation UI: ShareModal with email (Resend) + social/link sharing ✅
- [x] **S0.5.3c** — Invite landing page `/decoded/invite/[code]` with archetype card + CTA ✅
- [x] **S0.5.3d** — Invite link flow: recipient assessment → `recipient_id` linked ✅
- [x] **S0.5.3e** — Compatibility view `/decoded/compatibility/[inviteId]` — 3 contexts, 5 dimensions ✅
- [x] **S0.5.3f** — AI Compatibility Report (GPT-4o, cached, currently free) ✅
- [x] **S0.5.3g** — Compatibility Hub `/dashboard/compatibility` with invite management ✅
- [x] **S0.5.3g2** — Two-step sharing flow (invite to test → request to share results) ✅
- [x] **S0.5.3g3** — Denial & re-request UX; Unshare buttons ✅
- [x] **S0.5.3g4** — Coach access respects `share_with_human` consent level ✅
- [x] **S0.5.3g5** — "You're viewing X's Decoded Report" identity banner ✅
- [x] **S0.5.3h** — Invite completion notification email ✅
- [ ] **S0.5.3i** — Share-to-unlock gate on "Your Relationships" section
- [ ] **S0.5.3j** — Fallback paid unlock for Relationships section
- [ ] **S0.5.3k** — Viral tracking: invite → assessment → unlock funnel metrics
- [ ] **S0.5.4** — "Share Your Type" callout (F07): banner after Archetype section + footer
- [ ] **S0.5.5** — Referral mechanic (F08): unique referral URL → milestone rewards
- [x] **S0.5.6** — SEO: OG + Twitter cards for report pages with dynamic archetype images ✅ (landing page OG still needed)
- [ ] **S0.5.7** — Disclaimers & legal: non-clinical disclaimer on assessment start, GDPR delete flow
- [ ] **S0.5.8** — Product Hunt launch assets
- [ ] **S0.5.9** — Admin: Decoded metrics (assessments started/completed, viral loop stats) — see Sprint 7
- [ ] **S0.5.10** — Bottom-of-report: pre-generated coach opener + "Check in in a week" opt-in
- [ ] **S0.5.11** — Auth QA: New email signup end-to-end
- [ ] **S0.5.12** — Auth QA: Existing email (account exists) → sign in
- [ ] **S0.5.13** — Auth QA: Email sign-in happy path
- [ ] **S0.5.14** — Auth QA: Wrong password → clear error + forgot password
- [ ] **S0.5.15** — Auth QA: Forgot password full flow (Resend SMTP → reset → new login)
- [ ] **S0.5.16** — Auth QA: Google OAuth new user (consent screen shows "MasteryTV")
- [ ] **S0.5.17** — Auth QA: Google OAuth returning user (straight to dashboard)
- [x] **S0.5.18** — Auth QA: Google-only user password reset → "Use Google sign-in" message — see TD-009
- [ ] **S0.5.19** — Auth QA: Expired reset link → "Reset link expired" + sign-in link
- [ ] **S0.5.20** — Auth QA: Rate limiting on forgot password (friendly message)
- [ ] **S0.5.21** — Auth QA: Mobile browser (iOS Safari + Android Chrome)
- [ ] **S0.5.22** — Auth QA: Email deliverability (Gmail, Outlook, iCloud, Yahoo — not spam)
- [ ] **S0.5.23** — Thumbs up/down feedback on narrative voice → `voice_feedback` table
- [x] **S0.5.24** — Chat voice selector (6 coaching voices, popover) ✅ June 2, 2026
- [x] **S0.5.25** — Voice API route + `coach_profiles.voice_id` column ✅
- [x] **S0.5.26** — Active voice indicator + trigger button ✅
- [x] **S0.5.27** — Sidebar nav restructure (Assessment Report, Coach, Commitments, Progress, etc.) ✅
- [x] **S0.5.28** — Coaching Letter onboarding gate (coach-framed prompt) ✅
- [x] **S0.5.29** — Hide debug panel from chat header ✅

---

### Sprint 0.6 — Email Infrastructure & Onboarding Sequence ⏳ PENDING

- [ ] **S0.6.0** — Abandonment recovery email (pg_cron → "Pick up where you left off")
- [ ] **S0.6.1** — Add email tables: `email_preferences`, `email_sequence_enrollments`, `email_sends`
- [ ] **S0.6.2** — Port `email_campaigns` table from Project Profound
- [ ] **S0.6.3** — Configure Resend: `decoded@masterytv.com` domain + API key in Edge Function secrets
- [ ] **S0.6.4** — Sequence runner Edge Function (pg_cron hourly)
- [ ] **S0.6.5** — Resend webhook: track opens, clicks, bounces, unsubscribes
- [ ] **S0.6.6** — Write 8-email onboarding sequence (report open → insight → coach intro → share → re-engagement → upgrade nudge → milestone → retake)
- [ ] **S0.6.7** — React Email templates (Decoded brand, mobile-first, coach voice)
- [ ] **S0.6.8** — Auto-enroll trigger on `assessment_reports` insert
- [ ] **S0.6.9** — Unsubscribe flow (one-click → `email_preferences.subscribed = false`)
- [ ] **S0.6.10** — Admin: Broadcasts tab (compose/send + history)
- [ ] **S0.6.11** — Admin: Sequences tab (enrollment counts, pause/resume)
- [ ] **S0.6.12** — Admin: User email tab (send history + manual unsub)

---

### Sprint 0.7 — Dating Profile Generator (Post-MVP) ⏸️ DEFERRED

- [ ] **S0.7.1** — Dating Profile Generator UI (platform/tone/length selectors)
- [ ] **S0.7.2** — Prompt template using assessment scores (attachment-aware bio language)
- [ ] **S0.7.3** — Generate 3 variants; user can regenerate
- [ ] **S0.7.4** — Copy-to-clipboard; mobile-optimized
- [ ] **S0.7.5** — Gate behind Growth tier ($69/yr)

---

## 1. Sprint 1 — Foundation & Auth ✅ COMPLETE

All items complete. App running on Next.js 15 App Router + Supabase + Vercel. Auth works via email magic link + Google OAuth. Dashboard shell live.

---

## 2. Sprint 2 — Coaching Engine & Web Chat ✅ COMPLETE

All items complete. Coaching Edge Function live at `supabase/functions/coach/`. GPT-4o-mini primary, Claude Sonnet fallback. SSE streaming. Post-processor extracts commitments + facts. Short-term memory retrieval working.

**Notable changes from original plan:**
- Primary LLM changed from Claude 3.5 Sonnet → GPT-4o-mini (20x cost reduction, June 2026)
- Fallback: Claude Sonnet (was: GPT-4o)

---

## 3. Sprint 3 — Onboarding & Safety ✅ COMPLETE

- [x] **S3.1** — Onboarding state machine (React state + `onboarding_state` table) ✅
- [x] **S3.2** — Onboarding wizard UI (5-step with LinkedIn/website research) ✅
- [x] **S3.3** — Background Research Edge Function (Firecrawl + LinkdAPI + GPT-4o-mini) ✅
- [x] **S3.4** — Research Confirmation Edge Function ✅
- [x] **S3.5** — Coaching Letter Edge Function ✅
- [x] **S3.5b** — Psychological Trait Mapping from starting point choice ✅
- [ ] **S3.5c** — Onboarding Intake Questionnaire ⏸️ DEFERRED (pre-beta)
- [x] **S3.6** — Telegram Connection Flow ⏳ NOT YET BUILT — see Sprint 4
- [x] **S3.7** — Crisis Detection System (keyword scanner + LLM context check) ✅
- [x] **S3.8** — Topic Boundaries & Disclaimers ✅
- [x] **S3.9** — Authoritative Guardrails (6 prohibited domains + `search_facts` stub) ✅
- [x] **S3.10** — Guardrails Red Team Testing (15 automated test cases) ✅
- [x] **S3.11** — Human Voice Layer (anti-AI-tic rules in coaching letter prompt) ✅

---

## 4. Sprint 4 — Channels & Entity Extractor ⏳ PENDING

> **Goal:** Email and Telegram coaching channels. Entity extractor builds structured knowledge graph.

- [ ] **S4.1** — Resend email templates (coaching response, morning briefing, check-in)
- [ ] **S4.2** — Outbound Email (coach → user via Resend, threaded by conversation_id)
- [ ] **S4.3** — Inbound Email (`email-inbound` Edge Function, parse → coach → respond)
- [ ] **S4.4** — Telegram Webhook Edge Function (setWebhook, parse update, route to coaching engine)
- [ ] **S4.5** — Channel Router (web/email/Telegram → normalized `CoachMessage` interface)
- [ ] **S4.6** — Entity Extraction Pipeline (persons, goals, fears, values, patterns, triggers, wins)
- [ ] **S4.7** — Entity Upsert Logic (fuzzy name matching, merge attributes, embeddings)
- [ ] **S4.8** — Entity-Aware Prompt Assembly (Layer 4 in assembler, ~400 token cap)

---

## 5. Sprint 5 — Proactive Outreach & Grounding ⏳ PENDING

> **Goal:** Coach proactively reaches out. MESO/MACRO session planning. Perplexity factual grounding.
> **Note:** Billing removed from this sprint — moved to Sprint 8 (final).

- [ ] **S5.1** — pg_cron Scheduler (morning briefings every 30 min, scheduled_messages queue)
- [ ] **S5.2** — Morning Briefing Generation (timezone-aware, commitment-aware, channel delivery)
- [ ] **S5.3** — Accountability Check-ins (commitment due date → personalized follow-up)
- [ ] **S5.4** — Anti-Nagging Protocol (3-strike logic per topic, pause/resume)
- [ ] **S5.5** — Engagement Decay Detection (response rate → auto-reduce frequency)
- [ ] **S5.5a** — MESO Session Planner (weekly `coaching_agenda` generation)
- [ ] **S5.5b** — MACRO Arc Strategist (monthly progress review, arc phase advancement)
- [ ] **S5.5c** — Perplexity Sonar Grounding Service (`search-facts` Edge Function, `fact_cache` table, 24h TTL)

---

## 6. Sprint 6 — Dashboard, Admin & Polish 🔄 IN PROGRESS

> **Goal:** Dashboard fully functional. Admin section live. MVP launch-ready.

### Dashboard Features

- [x] **S6.1** — Commitments page (`/dashboard/commitments`) with Active/Completed/Missed groups + `context_note` ✅
- [x] **S6.2** — Coaching Letter page (`/dashboard/coaching-letter`) ✅
- [x] **S6.3** — Progress page (`/dashboard/progress`) with milestone path ✅
- [x] **S6.4** — Coach Profile view in Settings (8-dimension bars) ✅
- [x] **S6.4b** — Settings save button repositioned + unsaved changes guard (modal + navigation intercept) ✅ June 11, 2026
- [x] **S6.4c** — Chat draft persistence (localStorage, restored on return) ✅ June 11, 2026
- [x] **S6.4d** — Decoded report "coach learns from you" callout banner ✅ June 11, 2026

### Admin Section

- [x] **S6.7** — Admin auth guard (server component, role-based, redirects non-admins) ✅ June 11, 2026
- [x] **S6.7b** — Role system: `user` / `admin` / `superadmin` with DB trigger syncing `is_admin` ✅ June 11, 2026
- [x] **S6.7c** — tom@masterytv.com set as `superadmin` ✅
- [x] **S6.7d** — Admin link in sidebar (dashed border, admin/superadmin only) ✅
- [x] **S6.7e** — Admin link in user dropdown (topbar, admin/superadmin only) ✅ June 11, 2026
- [x] **S6.7f** — Admin topbar in admin section (navigation out of admin) ✅ June 11, 2026
- [x] **S6.8** — Admin Cost Dashboard (14-day chart, per-user table, model breakdown, summary cards) ✅ June 11, 2026
- [x] **S6.8b** — Admin User Management (role badges, promote/demote, protected superadmin rows) ✅ June 11, 2026
- [ ] **S6.9** — Admin Crisis Flags view (`/admin/crisis`)
- [ ] **S6.10** — Admin Framework Management (`/admin/frameworks`, weights, enable/disable)

### MVP Polish

- [x] **S6.11** — Landing page at `/` ✅ (live, premium aesthetic)
- [ ] **S6.12** — Conversation Summarization (session summaries in `conversation_summaries`, injected as medium-term memory)
- [ ] **S6.13** — Error Handling & Resilience (structured error logging, LLM fallback, retry with backoff)
- [ ] **S6.14** — End-to-End Testing (full user journey, all auth paths, performance check)

### AI Tools (Epic 13)

- [ ] **S6.5** — AI Tool Knowledge Base Seed (`ai_tools` table, ~20 tools, weekly Perplexity refresh)
- [ ] **S6.6** — Conversational AI Tool Discovery (Layer 7 in prompt assembler, tool preferences in `memory_facts`)

---

## 7. Sprint 7 — Cost Management & DevOps ⏳ PENDING

> **Goal:** Keep LLM costs under control as user count grows. Observability and admin tooling for costs.

- [ ] **S-COST-01** — Prompt layer telemetry: log token count per layer in `cost_tracking.prompt_breakdown` JSONB
- [ ] **S-COST-02** — Admin: per-layer cost breakdown in Cost Dashboard (which layers are burning tokens)
- [ ] **S-COST-03** — Memory pruning: cap `memory_facts` per user at 50 most recent/important; archive older facts
- [ ] **S-COST-04** — Context window cap: hard limit total prompt at 8K tokens; truncate oldest messages first
- [ ] **S-COST-05** — Conversation summarization (feeds into S6.12): summarize sessions > 20 messages; inject summary instead of raw messages
- [ ] **S-COST-06** — Budget alerts: email tom@masterytv.com when daily spend > $1 or any user's monthly cost > $0.50
- [ ] **S-COST-07** — Admin: Decoded metrics tab (assessments started, completed, conversion by tier, report views, viral loop stats)
- [ ] **S-COST-08** — Supabase cost proxy: Route all LLM calls through a cost-checking middleware; block requests from users who exceed their tier's budget
- [ ] **S-COST-09** — Rate limiting: per-user request throttle (max 10 coach messages/minute)
- [ ] **S-COST-10** — Staging/production workflow documentation (already operational — document in ARCHITECTURE.md)

### DevOps (Completed June 11, 2026)

- [x] **S-DEV-01** — Staging branch (`staging`) → auto-deploys to `staging.masterytv.com` ✅
- [x] **S-DEV-02** — Production branch (`main`) → auto-deploys to `masterytv.com` via Vercel ✅
- [x] **S-DEV-03** — GitHub branch ruleset: direct pushes to `main` blocked (PR required) ✅
- [x] **S-DEV-04** — `staging.masterytv.com` added to Supabase allowed redirect URLs ✅
- [x] **S-DEV-05** — RLS recursion fix: `get_auth_user_role()` SECURITY DEFINER function breaks recursive policy loop ✅

---

## 8. Technical Debt

- [ ] **TD-006** — User Data Deletion & Export: "Delete My Data" + "Export My Data" in Settings (GDPR promise on landing page). Must be live before public launch.
- [ ] **TD-007** — Google OAuth Consent Screen: update app name to "MasteryTV", add logo, set home page + privacy/terms URLs in Google Cloud Console. Manual config, no code.
- [ ] **TD-008** — Resend domain issue: verify `RESEND_API_KEY` in Vercel matches the account where `mail.masterytv.com` is verified (likely a stale env var).
- [x] **TD-009** — Google-only user password reset: check `identities` array → show "This account uses Google sign-in" instead of sending a useless reset email. ✅ June 11, 2026 — `get_auth_provider_for_email` DB function + `/api/auth/check-provider` + DecodedLanding handler. Refined to allow reset for linked Google+email accounts (they have a real password).
- [ ] **TD-001** — Cross-channel context mismatch: coach says "you mentioned X" but user can't see that in current channel. Add channel-aware phrasing ("In a recent message, you mentioned...").
- [ ] **TD-002** — Web chat channel filtering: add channel badges (📧 💬) per message as volume grows across channels.
- [ ] **TD-005** — Cross-channel race condition: per-user processing mutex via Supabase advisory lock.

---

## 9. Sprint 8 — Billing & Monetization (FINAL) ⏸️ DEFERRED TO LAST

> **Goal:** Paid tiers live end-to-end. Stripe Checkout, webhooks, rate limiting, subscription UI.
> **Dependency:** All other sprints should be stable before monetization goes live.

### Decoded Tiers (Sprint 0.3 — moved here)

- [ ] **S0.3.1** — Stripe products: `insight_annual` ($29/yr), `growth_annual` ($69/yr), `mastery_annual` ($349/yr), `mastery_monthly` ($99/mo)
- [ ] **S0.3.2** — Upgrade modal / paywall: shown after free report (gate after RS07). Tier comparison table.
- [ ] **S0.3.3** — `insight_annual` tier: unlock RS08–RS12 + 50 coach messages/week + Compatibility Report
- [ ] **S0.3.4** — `growth_annual` tier: Insight + Growth Roadmap (RS12) + 300 messages/month + Compare AI
- [ ] **S0.3.5** — `mastery_annual` / `mastery_monthly`: everything + unlimited coach + Depth Layer
- [ ] **S0.3.6** — Stripe webhook: handle Decoded price objects, update `users.subscription_tier`
- [ ] **S0.3.7** — Coach message rate limiting: Free=5/day, Insight=50/week, Growth=300/month, Mastery=unlimited

### Coach App Billing (Epic 10)

- [ ] **S8.1** — Stripe products: Core ($99/mo, $990/yr), Premium ($199/mo — hidden for MVP)
- [ ] **S8.2** — `create-checkout` Edge Function → Stripe Checkout session
- [ ] **S8.3** — `stripe-webhook` Edge Function: handle `checkout.session.completed`, `invoice.paid`, `subscription.deleted`
- [ ] **S8.4** — Free tier limits: 5 messages/day, contextual upgrade prompt when limit hit
- [ ] **S8.5** — Subscription Management UI in Settings (current plan, renewal date, Stripe portal link)

---

## 10. Sprint Summary

| Sprint | Status | Key Deliverable |
|:---|:---|:---|
| **S0 (Decoded core)** | ✅ Complete | Assessment + report + coach handoff + invite/compatibility |
| **S0.5 (Launch prep)** | 🔄 In progress | Viral features, auth QA, landing page OG |
| **S0.6 (Email)** | ⏳ Pending | 8-email onboarding sequence + abandonment recovery |
| **S0.7 (Dating profiles)** | ⏸️ Post-MVP | Dating bio generator (Growth tier) |
| **S1–S3** | ✅ Complete | Foundation, auth, coaching engine, onboarding, safety |
| **S4 (Channels)** | ⏳ Pending | Email + Telegram channels, entity extractor |
| **S5 (Outreach)** | ⏳ Pending | Morning briefings, accountability, MESO/MACRO, Perplexity |
| **S6 (Dashboard/Admin)** | 🔄 In progress | Admin section live, dashboard features live, polish remaining |
| **S7 (Cost/DevOps)** | 🔄 In progress | Staging workflow done; prompt pruning pending |
| **S8 (Billing)** | ⏸️ Last | Stripe end-to-end (Decoded tiers + Coach App tiers) |

---

## 11. Environment Setup ✅ COMPLETE

- [x] Supabase project (`masterytv-website`, `lwmadssysqcwbsoiaokc`)
- [x] Vercel project (`mastery-tv`) linked to GitHub `masterytv/masterytv`
- [x] Production: `main` → `masterytv.com`
- [x] Staging: `staging` → `staging.masterytv.com`
- [x] GitHub branch protection: `main` requires PR
- [x] OpenAI API key (GPT-4o-mini primary)
- [x] Anthropic API key (Claude Sonnet fallback)
- [x] Resend account (`mail.masterytv.com` DNS configured)
- [x] Stripe account (test mode configured)
- [x] Firecrawl + LinkdAPI (onboarding research)
- [ ] Telegram Bot via BotFather (Sprint 4)
- [ ] Perplexity API key (Sprint 5)

---

## 12. Risk Register

| Risk | Impact | Mitigation |
|:---|:---|:---|
| Prompt bloat as users accumulate history | Cost overrun | Sprint 7: memory pruning + context window cap (S-COST-03/04) |
| LLM API latency > 3s | UX degradation | SSE streaming active; GPT-4o-mini faster than Sonnet |
| Firecrawl/LinkdAPI downtime | User can't complete onboarding | Graceful degradation: partial results still shown |
| Email deliverability (spam) | Users miss coaching | Resend + SPF/DKIM/DMARC configured; warm-up needed |
| Stripe webhook delivery failures | Subscription status stale | Webhook retry + periodic sync (Sprint 8) |
| Free tier abuse | Cost overrun | Rate limiting in Sprint 7 (S-COST-09) |
