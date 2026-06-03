# Sprint Plan — Mastery Coach App + Decoded

> **Author:** Thomas Wood + Antigravity Orchestrator
> **Date:** March 30, 2026 | Updated: May 18, 2026
> **Version:** 1.6 (Sprint 0 renamed: Self Mastery Assessment → Decoded)
> **Status:** ✅ Gate 3 Approved | Sprint 3 COMPLETE — Ready for Sprint 4 | Sprint 0 BUILDING
> **Source:** [ARCHITECTURE.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/ARCHITECTURE.md) (Gate 2 ✅) | [DECODED.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED.md) (Gate 0 🟡)
> **Methodology:** BMAD + Antigravity Method (Phase 3 — Sprint Planning)

---

## 0. Sprint 0 — Decoded (Top-of-Funnel)

> **Duration:** 10–12 weeks
> **Goal:** Launch Decoded at `mastery.tv/decoded` — free 7-section report, $29/$69/$349 upgrade tiers, coach handoff integration.
> **Tagline:** *"You, decoded."*
> **Discovery:** [DECODED.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED.md)
> **PRD:** [DECODED_PRD.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED_PRD.md)
> **License Status:** ✅ All instrument licenses resolved (May 19, 2026)

> [!IMPORTANT]
> **MANDATORY for all UI stories:** Before writing any CSS, component, or inline style, read `directives/BRAND.md` §2 (Color System), §3 (Typography), and §14 (Visual Anti-Patterns). All font sizes must use the defined type scale tokens (`text-display-lg`, `text-headline-md`, `text-label-sm`, etc.). All colors must use CSS custom properties from `globals.css @theme`. No hardcoded hex values. No emoji icons — Lucide only (§14.1.1).

---

### Sprint 0.1 — Assessment Engine (Week 1–3)

**Goal:** Users can create an account, complete the Complete Core assessment with per-question persistence, and have their responses scored and stored.

#### E0 — Document Prerequisites

- [x] **S0.1.0a** — (F01) Create `DECODED_SCHEMA.md` with full DDL/RLS specifications for all Decoded tables
- [x] **S0.1.0b** — (F01) Create `DECODED_SCORING.md` with scoring keys for all 13 instruments (9 Core + 4 Optional)
- [x] **S0.1.0c** — (F02) Create `DECODED_ARCHETYPES.md` with base archetype definitions and AI sub-label generation logic

#### E0 — Assessment Infrastructure

- [ ] **S0.1.1** — (F01) Create Supabase schema per `DECODED_SCHEMA.md`: `assessments`, `assessment_progress`, `assessment_responses`, `assessment_scores`, `assessment_reports`, `assessment_profiles` tables + RLS policies
- [ ] **S0.1.2** — (F01) Build auth-first assessment flow: user creates account (Google OAuth or email magic link) BEFORE assessment begins. Persistent login via Supabase refresh token.
- [ ] **S0.1.3** — (F01) Build multi-step assessment form in Next.js at `/decoded` — one question at a time with progress bar. Every response saved to `assessment_progress` (JSONB) on each answer.
- [ ] **S0.1.4** — (F01) Implement Complete Core battery (~113 items): IPIP-50, RIASEC, ECR-R Short, SWLS, SCS-SF, DERS-16, WEIMS, Flourishing Scale, Decoded Wellness Check. All users take the same instruments.
- [ ] **S0.1.4a** — (F01) After Core completion, present optional add-on screen: GAD-7 (system-recommended if Neuroticism ≥ 38), ASRS (recommended if Conscientiousness ≤ 20), CSI-4 ("Are you in a relationship?"), ACE-3 (opt-in with sensitivity framing). User decides.
- [ ] **S0.1.5** — (F01) Implement scoring functions per `DECODED_SCORING.md` for all 13 instruments. Unit test each with floor/ceiling/known-clinical/reverse-scoring/boundary cases.
- [ ] **S0.1.5a** — (F01) Implement response validity check: detect straight-lining (all same value across ≥10 consecutive items) and contradictory reverse-scored pairs. Flag invalid responses; warn in report generation.
- [ ] **S0.1.6** — (F01) Store raw responses in `assessment_responses` + computed scores in `assessment_scores`; link to authenticated user
- [ ] **S0.1.7** — (F01) Implement resume flow: on return, auto-authenticate via refresh token and load exact position (instrument, item) from `assessment_progress`

**Done:** A user creates an account, completes the Complete Core assessment (~25–30 min) + optional add-ons with per-question state persistence. Scores are computed and stored. If they close the tab, nothing is lost.

---

### Sprint 0.2 — Report Generator (Week 3–5)

**Goal:** Assessment scores → 7 free + 5 locked AI-written report sections, generated per RS-IDs.

#### E0 — Report Generation

- [ ] **S0.2.1** — (F02) Design report prompt architecture: scoring data → structured JSON → section-by-section GPT-4o generation (RS01–RS12, ~600–1,200 words each)
- [ ] **S0.2.1a** — (F02) Implement async report generation pipeline: Edge Function generates sections sequentially, writes each to `assessment_reports.sections` JSONB as completed. Frontend subscribes to Realtime updates on this column. User sees sections appear one at a time. Fallback: email with report link if >2 min.
- [ ] **S0.2.2** — (F02) Implement 7 free sections: RS01 (You, Decoded), RS02 (What the Data Shows), RS03 (Your Decoded Archetype), RS04 (How You're Wired), RS05 (Your Trait Profile), RS06 (Your Attachment Map), RS07 (Your Inner System)
- [ ] **S0.2.3** — (F02) Implement 5 locked sections: RS08–RS12 (blur-gated with section-specific upgrade CTA copy)
- [ ] **S0.2.4** — (F02) Build web report viewer: premium editorial aesthetic (BRAND.md §14), section-anchored, data visualizations (radar, quadrant, hexagon, **10-dimension wellness radar**)
- [ ] **S0.2.5** — (F02) Implement `@media print` stylesheet + `window.print()` button for browser PDF export. Print styles: hide nav, remove blur gates for paid users, force page breaks between sections.
- [ ] **S0.2.6** — (F02) Cache report in Supabase (`assessment_reports` table, JSONB keyed by RS-ID) — generate once, serve many
- [ ] **S0.2.7** — (F02) Safety layer: clinical result framing (never raw scores; always growth-oriented language); crisis gateway for suicidal ideation items (automatic resource display)
- [ ] **S0.2.8** — (F02) Write section-specific prompt templates for all 12 report sections; QA minimum 20 sample reports
- [ ] **S0.2.9** — (F02) Implement archetype system per `DECODED_ARCHETYPES.md`: ~16 base types from Big Five clusters + AI-generated sub-label. Format: `BASE TYPE — Sub-Label`
- [x] **S0.2.10** — (F02) Report polish pass: review and improve the writing style across all report sections (more engaging, editorial tone — less clinical/generic). Redesign visual layout for premium feel: better typography hierarchy, card-based section layouts, richer data visualizations, pull-quote callouts, and micro-interactions. Reference BRAND.md §14 for aesthetic guidelines. ✅ Complete (June 2, 2026)

**Done:** Every user who completes the assessment gets a free, high-quality 7-section report. 5 locked sections visible but blurred. Every section ends with a coaching question. Browser PDF export works. Report reads like a premium magazine feature, not a clinical printout.

---

### Technical Debt — Auth & UI (Pre-Launch)

> Items surfaced during June 2 testing session. Not blocking Sprint 0.4, but must be resolved before public launch.

- [ ] **TD-007** — **Google OAuth consent branding:** Update Google Cloud Console OAuth consent screen from project URL to "MasteryTV" with proper logo. Manual config — not code.
- [x] **TD-008** — **Light mode color contrast:** Green and orange accent colors too washed out on white backgrounds. "You At A Glance" heading hard to read in light mode. Fix in `globals.css` theme tokens. ✅ Fixed during V2 report polish (June 2, 2026)
- [ ] **TD-009** — **Google-only user password reset:** When a Google OAuth-only user requests a password reset, show "This account uses Google sign-in" instead of sending a useless reset email. Check `identities` array in auth response.

---

### Sprint 0.3 — Pricing, Billing & Upgrade Tiers (Week 3–4) — ⏸️ DEFERRED

**Goal:** Paid tiers live and working end-to-end via Stripe.

#### E0 — Monetization

- [ ] **S0.3.1** — (F04) Create Stripe products/prices: `insight_annual` ($29/yr), `growth_annual` ($69/yr), `mastery_monthly` ($99/mo), `mastery_annual` ($349/yr)
- [ ] **S0.3.2** — (F04) Build upgrade modal / paywall: shown after free report with clear tier comparison ($0 → $29 → $69 → $349). Gate after RS07.
- [ ] **S0.3.3** — (F04) Implement `insight_annual` tier: unlock RS08–RS12 + 50 coach messages/week + AI Compatibility Report
- [ ] **S0.3.4** — (F04) Implement `growth_annual` tier: Insight + Growth Roadmap (RS12) + 300 coach messages/month + Compare AI analysis
- [ ] **S0.3.5** — (F04) Implement `mastery_annual` / `mastery_monthly` tier: Everything + unlimited coach + full framework library + Depth Layer (RD01–RD04)
- [ ] **S0.3.6** — (F04) Extend existing Stripe webhook to handle new Decoded price objects; update `users.subscription_tier` accordingly
- [ ] **S0.3.7** — (F04) Implement coach message rate limiting: Free=5/day, Insight=50/week, Growth=300/month, Mastery=unlimited

**Done:** All four pricing tiers are purchasable via Stripe. Locked sections unlock immediately on upgrade. Message limits enforced.

> [!NOTE]
> **Sprint 0.3 is deferred.** Stripe integration will be built after Coach Handoff (S0.4) is complete. The free tier + report are sufficient for launch testing.

---

### Sprint 0.4 — Coach Handoff Integration (Week 4–5)

**Goal:** Assessment profile pre-loads the coaching engine. Coach starts knowing the user.

#### E0 — Assessment → Coach Integration

- [x] **S0.4.1** — Design `assessment_profile` schema: structured JSON summary of key scores, narrative labels, identified coaching priorities (output of scoring engine). ✅ `supabase/functions/_shared/decoded/assessment-profile.ts`
- [x] **S0.4.2** — Modify coaching engine prompt assembly: if `user.assessment_profile` exists, inject as a new context layer ("User Self Mastery Profile") above the general user profile. ✅ Layer 4.5 in `prompt-assembler.ts`
- [x] **S0.4.3** — Generate coach's "first message" using assessment data: personalized opening that references specific findings, suggests a starting framework, asks one sharp question. ✅ Deep link auto-sends context-aware opening via chat page
- [x] **S0.4.4** — Update coach onboarding flow: users arriving from Self Mastery skip the website/LinkedIn scraping onboarding — assessment profile replaces it. ✅ `runCoachHandoff()` sets `onboarding_state.current_step = 'complete'` with `source: 'decoded'`
- [x] **S0.4.4a** — **Seed coaching voice from assessment archetype:** Assessment voice (archetype → voiceId mapping) is seeded into `coach_profiles.voice_id` during report generation. Coach uses the same communication style as the report until user changes it. ✅ Complete (June 2, 2026)
- [x] **S0.4.5** — Test coach handoff with assessment profiles: verify coaching response quality and personalization accuracy. ✅ CTAs verified working (June 2, 2026)
- [x] **S0.4.6** — "Meet your coach" CTA in report Section 10: compelling invitation that references specific insights from their report. ✅ Bottom-of-report CTA with deep link

#### E0 — Contextual Coach Deep Links (Report → Chat)

> [!IMPORTANT]
> **High-impact conversion feature.** Every "Chat with Your Coach" link in the report is a monetization touchpoint. The coach must demonstrate immediate value by referencing the exact insight the user clicked from.

- [x] **S0.4.7** — Design deep-link URL scheme: `/dashboard/chat?context={context_key}&section={section_id}` — context_key maps to a specific report insight (e.g., `growth-edge-1`, `attachment-challenge`, `inner-world-cost`, `coach-question-rs04`). ✅ `buildCoachDeepLink()` in ReportViewer
- [x] **S0.4.8** — Add "Chat with Your Coach About This" CTAs in strategic report locations:
  - **Your 3 Growth Edges** box — one CTA per growth edge ("Explore this with your coach") ✅
  - **Personality trait challenge sections** — after each trait's challenge paragraph ✅
  - **YOUR COACH QUESTION** boxes — convert the existing question into a clickable CTA that opens chat pre-seeded with that question ✅
  - CTA design: inline text link or subtle button, not a banner. Must feel editorial, not salesy. Follow BRAND.md §14. ✅
- [x] **S0.4.9** — Implement context-aware first message: when user lands on `/dashboard/chat?context=...`, coaching engine generates a personalized opening that references the specific report insight they clicked from. ✅ Chat page reads params and auto-sends
- [x] **S0.4.10** — Implement Decoded onboarding bypass: users arriving from Decoded report deep links skip the LinkedIn/website research onboarding entirely. Assessment profile replaces it. `onboarding_state` set to `complete` with `source: 'decoded'`. ✅ In `runCoachHandoff()`
- [x] **S0.4.11** — Track deep-link engagement: log which context keys users click (for optimizing CTA placement). `report_events` table created with RLS. Fire-and-forget `onClick` tracking on all 4 CTA locations. ✅ Complete (June 2, 2026)

**Done:** A user who upgrades to the coach tier from Self Mastery gets a coach that immediately demonstrates it knows them. Clicking "Chat with Your Coach" from any report section opens a coaching conversation that references that exact insight. No generic onboarding. "Wow" moment validated.

---

### Sprint 0.5 — Launch Preparation & Viral Features (Week 5–6)

**Goal:** Decoded is publicly launched with viral sharing mechanics live.

#### E0 — Go-To-Market

- [x] **S0.5.1** — Build `/decoded` landing page: hero, value prop, sample report preview, social proof, "Take the assessment" CTA. ✅ Complete (June 3, 2026) — Full scroll page: Hero → What You'll Discover (4-column grid) → The Science (instrument tags) → Auth Section.
- [x] **S0.5.2** — Build shareable personality cards (F06/F07): Big Five visual, attachment style badge — downloadable/shareable on Instagram/X (Story 9:16, Feed 1:1, Landscape 16:9 formats). **Design mandate: premium glassmorphism — no clipart, no sparkles. BRAND.md §14.** ✅ Complete (June 3, 2026) — Satori card API supports `square`, `og`, `story` (9:16), `feed` (1:1) formats. Download format selector in ArchetypeCard.
#### E0 — Compare / Profile Invite (F03 — Viral Acquisition Engine)

> [!IMPORTANT]
> **This IS the growth loop.** Without it at launch, organic spread is minimal. See `DECODED_FEATURES.md` §F03 for full spec.

- [x] **S0.5.3a** — **Schema:** `decoded_invites` table with invite lifecycle (`pending → completed → consented → connected`), granular consent (`share_with_human`, `share_with_coach`: `compatibility | type_compatibility | full`), upgrade request fields (`upgrade_requested_level`, `upgrade_requested_by`), compatibility report storage. RLS: inviter can insert/read, recipient can read/update consent. ✅ Complete (June 2, 2026)
- [x] **S0.5.3b** — **Invite creation UI:** ShareModal component with email invites (via Resend) + social/link sharing. Triggered from report page and Compatibility Hub "Send Invite" button. ✅ Complete (June 2, 2026)
- [x] **S0.5.3c** — **Invite landing page:** `/decoded/invite/[code]` — Recipient sees inviter's archetype card + teaser + CTA to take assessment. ✅ Complete (June 3, 2026) — Dynamic OG metadata, archetype card image, gold CTA, trust signals. Invite URL uses UUID as code.
- [x] **S0.5.3d** — **Invite link flow:** Recipient creates account → completes assessment → `recipient_id` linked → status advances to `completed`. ✅ Auto-linking via email match (June 2, 2026)
- [x] **S0.5.3e** — **Compatibility view:** `/decoded/compatibility/[inviteId]` — AI-generated report with tabs for 3 relationship contexts (Intimate, Family/Friends, Work). Each context: chemistry, friction, superpower, watch-out, personalized advice. 5 compatibility dimensions with animated score bars. ✅ Complete (June 2, 2026)
- [x] **S0.5.3f** — **AI Compatibility Report:** GPT-4o generates punchy, context-specific insights using both users' assessment data. Service-role client bypasses RLS for cross-user reads. Cached after first generation. **Currently free** (no paywall gate). ✅ Complete (June 2, 2026)
- [x] **S0.5.3g** — **Invite management:** Compatibility Hub (`/dashboard/compatibility`) with sidebar link. Sections: sent invites (status tracking), received invites (consent management), invite creation. Granular sharing consent with mutual exchange model. ✅ Complete (June 2, 2026)
- [x] **S0.5.3g2** — **Two-step sharing flow:** Separated "invite to take test" from "request to share results". Step 1: `compatibility-request` API stores request. Step 2: `invite-consent` API computes mutual minimum. ShareLevelPicker with 2 options. ✅ Complete (June 3, 2026)
- [x] **S0.5.3g3** — **Denial & re-request UX:** Context-aware messages per user ("Full Report Denied. Compatibility Accepted."). Request Again / Accept / Deny buttons for upgrade re-requests. New `deny-upgrade` API. Unshare buttons on all connected cards. ✅ Complete (June 3, 2026)
- [x] **S0.5.3g4** — **Coach access control:** `lookup-relationship` tool and `prompt-assembler` Layer 4.6 both respect `share_with_human` column. Coach only reads data at the agreed sharing level. ✅ Complete (June 3, 2026)
- [x] **S0.5.3g5** — **Shared report identity:** "You're viewing X's Decoded Report" banner on shared full reports. Owner name from `decoded_profiles.display_name` or auth email. ✅ Complete (June 3, 2026)
- [x] **S0.5.3h** — **Invite notifications:** Email inviter when recipient completes assessment. ✅ Complete (June 3, 2026) — `/api/decoded/invite-notify` route, `notified_at` column for idempotency, fire-and-forget from dashboard after `claimPendingInvites`.

#### E0 — Unlock "Your Relationships" via Share (Viral Section Gate)

> [!TIP]
> **Viral unlock mechanic.** Instead of paying to unlock the Relationships section, users can earn it by sharing — every share is a potential new user.

- [ ] **S0.5.3i** — **Share-to-unlock gate on "Your Relationships" section (RS-Relationships):** Instead of the standard blur/paywall, show a unique gate: *"Unlock Your Relationships section by inviting someone you know to Decoded."* CTA: "Send an Invite →" (opens F03 invite modal). When the invited person completes the assessment, both users unlock the Relationships section AND get the AI Compatibility Report. Track unlock source: `unlocked_via: 'invite_completion'` vs `'paid_upgrade'`.
- [ ] **S0.5.3j** — **Fallback paid unlock:** Users who don't want to invite anyone can still unlock via Insight tier ($29/yr) — the share mechanic is an alternative, not a replacement. Gate copy: *"Unlock by sharing with someone — or upgrade to Insight."*
- [ ] **S0.5.3k** — **Viral tracking:** Log invite → assessment_complete → section_unlock funnel. Admin dashboard metrics: invites sent, conversion rate (invite → assessment start → completion), sections unlocked via share vs paid.
- [ ] **S0.5.4** — Implement Share Your Type callout (F07): Banner appears in report after Archetype section + at report footer. Reuses F06 modal.
- [ ] **S0.5.5** — Implement referral mechanic (F08): Unique referral URL → friend completes → referrer unlocks 1 Insight section free; milestone rewards at 3 and 5 referrals
- [x] **S0.5.6** — SEO metadata: Open Graph + Twitter cards for `/decoded/report/[id]` with dynamic archetype card images via Satori compositing. ✅ Partially complete — report pages done (June 3, 2026). Landing page OG still needed.
- [ ] **S0.5.7** — Disclaimers & legal: non-clinical disclaimer on assessment start, data privacy statement, GDPR delete-anytime flow
- [ ] **S0.5.8** — Product Hunt launch assets: product images, description, teaser, maker notes
- [ ] **S0.5.9** — Admin visibility: add Decoded metrics to admin dashboard (assessments started, completed, conversion by tier, report views, viral loop stats)
- [ ] **S0.5.10** — Bottom-of-report coaching CTA: pre-generated personalized coach opener + Share Card button + "Check in with me in a week" opt-in (triggers Email 7 of onboarding sequence)

#### E0 — Auth Flow QA (Pre-Launch Gate)

> [!IMPORTANT]
> **MANDATORY before public launch.** Every auth path must be tested end-to-end in production. Failures here = lost users.

- [ ] **S0.5.11** — **New email signup:** Fresh email → Create Account → confirmation email arrives → click link → lands on dashboard → can start assessment
- [ ] **S0.5.12** — **Existing email signup (account exists):** Try to sign up with existing email → "Account already exists" screen → Sign In button works → Forgot Password sends email
- [ ] **S0.5.13** — **Email sign-in (happy path):** Existing email+password user → Sign In → lands on dashboard
- [ ] **S0.5.14** — **Email sign-in (wrong password):** Wrong password → clear error message → Forgot Password link visible and works
- [ ] **S0.5.15** — **Forgot password (full flow):** Click "Forgot your password?" → email arrives (via Resend SMTP) → click "Reset Password" link → /auth/reset-password page loads → set new password → success → sign in with new password works
- [ ] **S0.5.16** — **Google OAuth signup (new user):** Continue with Google → consent screen shows "MasteryTV" branding → account created → lands on dashboard
- [ ] **S0.5.17** — **Google OAuth login (returning user):** Continue with Google → straight to dashboard (no re-consent)
- [ ] **S0.5.18** — **Google-only user password reset:** Google OAuth user tries forgot password → should inform them to use Google sign-in (no password to reset)
- [ ] **S0.5.19** — **Expired/invalid reset link:** Click an old reset link → "Reset link expired" page → link back to sign-in
- [ ] **S0.5.20** — **Rate limiting:** Rapid-fire forgot password requests → friendly "Please wait" message (not raw Supabase error)
- [ ] **S0.5.21** — **Mobile browser:** All auth flows work on iOS Safari and Android Chrome (no layout breaks, autofill works)
- [ ] **S0.5.22** — **Email deliverability:** Confirmation + reset emails land in inbox (not spam) for Gmail, Outlook, iCloud, Yahoo

**Done:** All 12 auth scenarios tested in production. Zero user-blocking bugs. Every error state has a clear recovery path.

#### E0 — Voice Feedback (Narrative Voices)

> Cross-reference: Full spec in [DECODED_NARRATIVE_VOICES_SPRINT.md](file:///Users/thomaswood/Documents/Antigravity/MasteryTV/directives/DECODED_NARRATIVE_VOICES_SPRINT.md) S17.

- [ ] **S0.5.23** — **Thumbs up/down feedback on narrative voice:** After reading a report (original or rewrite), show a subtle feedback prompt: "Did this voice feel right for you?" with thumbs up/down. On thumbs down, show voice alternatives. Stores to `voice_feedback` table. See Narrative Voices Sprint S17 for full component spec.

#### E0 — Coach Voice Switching (Chat)

- [x] **S0.5.24** — **Chat voice selector:** Popover in chat header lets users choose from 6 coaching voices (Intellectual, Adventurer, Connector, Steward, Challenger, Sensitive). Each voice maps to `coach_profiles` communication dimensions (warmth, directness, structure, challenge_level, etc.). Takes effect on next coach message. ✅ Complete (June 2, 2026)
- [x] **S0.5.25** — **Voice API route + DB:** `POST /api/coach/voice` upserts `coach_profiles` with selected voice dimensions. Added `voice_id` column to `coach_profiles`. Added `voice_override` to `coach_profiles_source_check` constraint. Added RLS INSERT policy. ✅ Complete (June 2, 2026)
- [x] **S0.5.26** — **Active voice indicator:** Check mark on selected voice in popover + trigger button. AudioLines icon. Voice loads from DB on mount. ✅ Complete (June 2, 2026)

#### E0 — Dashboard Navigation Restructure

- [x] **S0.5.27** — **Sidebar nav restructure:** Home (stays), Assessment Report (direct link to `/decoded/report/[id]`, locked behind assessment), Coach, Commitments, Progress, Coaching Letter (always accessible), Settings, Share (shortened from "Share Decoded"). ✅ Complete (June 2, 2026)
- [x] **S0.5.28** — **Coaching Letter onboarding gate:** When user clicks Coaching Letter without completing coaching onboarding, shows coach-framed prompt: "Your Coach Has Some Questions" with CTA to onboarding flow. Replaces generic "No coaching letter yet" copy. ✅ Complete (June 2, 2026)
- [x] **S0.5.29** — **Hide debug panel:** Coach Debugger toggle removed from chat header. Code preserved for future use. ✅ Complete (June 2, 2026)

---

### Sprint 0.6 — Email Infrastructure & Onboarding Sequence (Week 5–6, parallel)

**Goal:** Every user who completes Decoded is enrolled in the 8-email coaching onboarding sequence.

#### E0 — Email Infrastructure

- [ ] **S0.6.0** — (F01) Abandonment recovery email: pg_cron checks `assessment_progress` for `last_active_at < NOW() - INTERVAL '24 hours'` AND `completed_at IS NULL`. Sends "Pick up where you left off" email with deep link to resume. One email per abandonment.
- [ ] **S0.6.1** — (F10) Add email tables to schema: `email_preferences`, `email_sequence_enrollments`, `email_sends`
- [ ] **S0.6.2** — Port `email_campaigns` table from Project Profound (admin broadcast history)
- [ ] **S0.6.3** — Configure Resend: domain verification for `decoded@masterytv.com`, API key in Edge Function secrets
- [ ] **S0.6.4** — Build sequence runner Edge Function: pg_cron triggers hourly → queries `email_sequence_enrollments` for due sends → dispatches → logs to `email_sends`
- [ ] **S0.6.5** — Build Resend webhook endpoint: inbound events (opened, clicked, bounced, complained) → update `email_sends`; unsubscribe events → update `email_preferences.subscribed = false`
- [ ] **S0.6.6** — Write 8-email onboarding sequence content (see DECODED.md §15.1 for spec): Email 1 (report open), 2 (top insight personalized), 3 (coach intro), 4 (share/invite), 5 (re-engagement — conditional), 6 (upgrade nudge — free tier only), 7 (milestone + review ask), 8 (retake prompt + growth delta)
- [ ] **S0.6.7** — Build React Email templates: Decoded brand styling, no clipart/sparkles (BRAND.md §14), mobile-first, coach voice
- [ ] **S0.6.8** — Auto-enroll trigger: when `assessment_reports` record is created → insert into `email_sequence_enrollments` with `sequence_slug = 'decoded_onboarding'`
- [ ] **S0.6.9** — Unsubscribe flow: one-click unsubscribe link in every email → sets `email_preferences.subscribed = false` → confirmation page

#### E0 — Admin Email Panel

- [ ] **S0.6.10** — Port admin email compose UI from Project Profound: Broadcasts tab (compose/send), History tab (per-campaign stats)
- [ ] **S0.6.11** — Add Sequences tab: enrollment counts, user positions, pause/resume controls
- [ ] **S0.6.12** — Add Users email tab: search by user → see send history → manual unsub option

**Done:** Every assessment completer is automatically enrolled in the 8-email sequence. Admin can monitor, pause, and broadcast. Resend webhook tracking live.

---

### Sprint 0.7 — Dating Profile Generator (Post-MVP — Phase 2)

> [!NOTE]
> F09 is explicitly Post-MVP. Build only after core report + Compare/Invite are stable and launched. Placeholder here for sprint planning continuity.

**Goal:** Generate AI dating profile bios from assessment data. Target: younger users (under 35).

- [ ] **S0.7.1** — Build Dating Profile Generator UI: platform selector (Hinge/Bumble/Tinder/The League), tone selector (Witty/Sincere/Adventurous/Vulnerable), length selector (Short/Medium/Long)
- [ ] **S0.7.2** — Implement prompt template using assessment scores: attachment-aware bio language (avoidant/anxious/secure signals), Big Five strengths, RIASEC interests, self-compassion cues
- [ ] **S0.7.3** — Generate 3 variants per config; user can regenerate
- [ ] **S0.7.4** — Copy-to-clipboard UX; mobile-optimized
- [ ] **S0.7.5** — Gate behind Growth tier ($69/yr)

**Done:** Growth tier users can generate platform-specific dating bios from their assessment profile. Attachment-aware language ensures bios attract compatible people, not just engagement.

---

### Sprint 0 Summary

| Sub-Sprint | Weeks | Key Deliverable |
|:---|:---|:---|
| **S0.1** | 1–3 | Complete Core assessment engine (~113 items); per-question persistence; optional add-ons; resume flow |
| **S0.2** | 3–5 | 7 free + 5 locked report sections (RS01–RS12); archetype system; browser PDF |
| **S0.3** | 5–7 | Insight/Growth/Mastery tiers live via Stripe; message rate limits |
| **S0.4** | 7–8 | Coach pre-loaded with assessment profile; handoff validated |
| **S0.5** | 8–10 | Public launch — landing page, viral features (F03/F06/F07/F08), PH ready |
| **S0.6** | 8–10 (parallel) | Email infrastructure + abandonment recovery + 8-email onboarding |
| **S0.7** | Post-MVP | Dating Profile Generator (F09) — Growth tier feature |

---

## 1. Sprint Strategy (Coach App — Sprints 1–6)

### 1.1 Cadence

- **Sprint length:** 2 weeks
- **Total sprints:** 6 (12 weeks to MVP)
- **Team:** 1 human (Thomas) + AI pair (Antigravity Orchestrator)
- **Velocity assumption:** ~8–10 stories per sprint (with AI acceleration)
- **Review cadence:** Demo at end of each sprint

### 1.2 Principles

1. **Dependency-first ordering** — Foundation before features, backend before frontend
2. **Vertical slices** — Each sprint delivers something testable end-to-end
3. **Ship the coaching loop first** — A user should be able to talk to the coach by Sprint 2
4. **Defer polish** — Premium UI and edge cases come after the core loop works
5. **One channel at a time** — Web chat first, then email, then Telegram

### 1.3 MVP Definition

The MVP is complete when a user can:
1. Sign up on the web and complete onboarding (research + coaching letter)
2. Chat with the AI coach via web, email, or Telegram
3. Receive morning briefings and accountability check-ins
4. Upgrade from free to Core ($99/mo) via Stripe
5. Admin can view basic metrics and crisis flags

This maps to PRD §5.1 and User Journeys 1, 2, 4, and 5 (basic).

---

## 2. Epic Overview

| # | Epic | Sprint | Dependency |
|:--|:-----|:-------|:-----------|
| **E0** | **Decoded (Top-of-Funnel)** | **S0** | **None — runs first** |
| E1 | Foundation & Scaffold | S1 | None |
| E2 | Auth & User Management | S1 | E1 |
| E3 | Coaching Engine Core | S2 | E1 |
| E4 | Web Chat & Realtime | S2 | E3 |
| E5 | Onboarding Pipeline | S3 | E2, E3 |
| E6 | Email Channel | S4 | E3 |
| E7 | Telegram Channel | S4 | E3 |
| E8 | Entity Extractor | S4 | E3 |
| E9 | Proactive Outreach | S5 | E6, E7, E8 |
| E10 | Billing & Subscriptions | S5 | E2, E0 |
| E11 | Dashboard Features | S5–S6 | E2, E3 |
| E12 | Safety, Crisis & Guardrails | S3 | E3 |
| E13 | AI Tool Engine | S6 | E3 |
| E14 | Admin Dashboard | S6 | All |
| E15 | Coaching Brain (MESO/MACRO) | S5 | E3, E8, E9 |

### Dependency Graph

```
E1 (Foundation)
├── E2 (Auth)
│   ├── E5 (Onboarding) ← also needs E3
│   ├── E10 (Billing)
│   └── E11 (Dashboard)
└── E3 (Coaching Engine)
    ├── E4 (Web Chat)
    ├── E5 (Onboarding)
    ├── E6 (Email Channel)
    ├── E7 (Telegram Channel)
    ├── E8 (Entity Extractor)
    ├── E12 (Safety)
    ├── E13 (AI Tools)
    ├── E9 (Proactive Outreach) ← needs E6, E7, E8
    └── E15 (MESO/MACRO) ← needs E3, E8, E9
```

---

## 3. Sprint 1 — Foundation & Auth (Weeks 1–2)

> **Goal:** Supabase project live, schema deployed, Next.js scaffold running, users can sign up and log in.

### Epic 1: Foundation & Scaffold

#### S1.1 — Supabase Project Setup
- [ ] Create Supabase project (production)
- [ ] Enable pgvector extension
- [ ] Enable pg_cron extension
- [ ] Configure Edge Function secrets (placeholder keys for Anthropic, OpenAI, Resend, Telegram, Stripe, Firecrawl, LinkdAPI, Perplexity)
- [ ] Set up custom SMTP (mail.masterytv.com via Resend) for auth emails

**Done:** Supabase project accessible, extensions enabled, secrets configured.

#### S1.2 — Core Schema Migration
- [ ] Write and apply `001_core_schema.sql` — tables: `users`, `coach_profiles`, `messages`, `memory_facts`, `commitments` (ARCHITECTURE.md §3.1)
- [ ] Write and apply `002_scheduling_schema.sql` — tables: `scheduled_messages`, `conversation_summaries` (§3.2)
- [ ] Write and apply `003_framework_schema.sql` — tables: `framework_usage`, `framework_config`, `coaching_challenges`, `coaching_agenda` (§3.3)
- [ ] Write and apply `004_entities_schema.sql` — table: `user_entities` (§3.4)
- [ ] Write and apply `005_supporting_schema.sql` — tables: `ai_tools`, `cost_tracking`, `onboarding_state`, `organizations`, `nagging_tracker`, `fact_cache` (§3.5)
- [ ] Write and apply `006_rls_policies.sql` — RLS on all user-facing tables including `coaching_challenges`, `coaching_agenda` (§3.5 RLS)
- [ ] Write and apply `007_indexes.sql` — all indexes including pgvector IVFFlat indexes

**Done:** All 18 tables exist with columns, constraints, indexes, and RLS policies. Schema matches ARCHITECTURE.md §3 exactly.

#### S1.3 — Framework Registry Seed
- [ ] Write and apply `008_framework_seed.sql` — seed `framework_config` with Tier 1 + Tier 2 frameworks (MVP scope)
- [ ] Tier 1: GROW, OSKAR, Motivational Interviewing, Socratic Questioning
- [ ] Tier 2: EOS/Traction, Lean Startup, Hormozi Offer Optimization, Situational Leadership, Robbins RPM
- [ ] Each framework includes: `name`, `tier`, `category`, `description`, `when_to_use`, `system_prompt_template`, `phases`, `phase_descriptions`, `transition_signals`, `selection_weight`, `requires_trust_level`

**Done:** 9 frameworks seeded with complete phase definitions. `SELECT * FROM framework_config` returns all 9 with prompt templates and phase arrays.

#### S1.4 — Next.js Project Scaffold
- [ ] Initialize Next.js 14+ project with App Router in `src/`
- [ ] Install and configure: Tailwind CSS v4, Framer Motion, shadcn/ui
- [ ] Set up directory structure per ARCHITECTURE.md §9
- [ ] Create Supabase client helpers: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server), `lib/supabase/middleware.ts`
- [ ] Configure environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Generate TypeScript types from Supabase schema → `lib/types/database.ts`
- [ ] Create root layout with Google Font (Inter or Outfit), dark mode support
- [ ] Create placeholder landing page at `/`

**Done:** `npm run dev` starts the app. Landing page renders. Supabase client connects to the project. TypeScript types match schema.

#### S1.5 — Edge Function Scaffold
- [ ] Create shared utilities module for Edge Functions: Supabase client init, error handling pattern (ARCHITECTURE.md §8.1, §8.3), CORS config
- [ ] Create a `hello-world` Edge Function to validate deployment pipeline
- [ ] Deploy and verify Edge Function responds with 200

**Done:** `curl` to the Edge Function returns 200 with JSON response.

---

### Epic 2: Auth & User Management

#### S1.6 — Supabase Auth Configuration
- [ ] Enable Magic Link provider
- [ ] Enable Google OAuth provider (convenience login)
- [ ] Configure redirect URLs for local dev and production (masterytv.com)
- [ ] Customize auth email templates (magic link email branded as Mastery Coach)

**Done:** User can request a magic link, click it, and be redirected to the dashboard shell authenticated. Google OAuth also works.

#### S1.7 — Auth Middleware & Protected Routes
- [ ] Implement Next.js middleware that checks Supabase session
- [ ] Create route groups: `(auth)` for login/signup, `(dashboard)` for protected pages, `(admin)` for admin-only
- [ ] Redirect unauthenticated users to `/login`
- [ ] Redirect authenticated users from `/login` to `/dashboard`
- [ ] Build login page (`/login`) with magic link + Google OAuth

**Done:** Unauthenticated users cannot access `/dashboard/*`. Authenticated users are redirected from `/login`. Session persists across page reloads.

#### S1.8 — User Creation Trigger
- [ ] Create Supabase database trigger: on `auth.users` insert → create row in `users` table with `id`, `email`, `name` (from metadata)
- [ ] Create corresponding row in `coach_profiles` with default values
- [ ] Create corresponding row in `onboarding_state` with `current_step = 'signup'`

**Done:** New auth user automatically has rows in `users`, `coach_profiles`, and `onboarding_state`.

#### S1.9 — Dashboard Shell
- [ ] Build dashboard layout (`(dashboard)/layout.tsx`) — sidebar nav, top bar with user avatar/name
- [ ] Navigation items: Chat, Commitments, Progress, Settings, Coaching Letter
- [ ] Build settings page (`/settings`) — view/edit name, timezone, preferred channel, morning briefing time
- [ ] Settings save to `users` table via Supabase client
- [ ] Responsive: works on mobile (collapsible sidebar)

**Done:** Authenticated user sees dashboard shell with working navigation. Settings page saves and persists changes.

---

### Sprint 1 Deliverable

> **Demo:** User signs up via magic link → lands on dashboard shell → can edit settings → data persists in Supabase.

---

## 4. Sprint 2 — Coaching Engine & Web Chat (Weeks 3–4)

> **Goal:** User can chat with the AI coach in the web dashboard. Coach uses frameworks, remembers context within a session.

### Epic 3: Coaching Engine Core

#### S2.1 — Coaching Edge Function (Basic)
- [ ] Create `coach/index.ts` Edge Function
- [ ] Accept POST with `{ message, channel, conversation_id? }`
- [ ] Authenticate request (extract user_id from JWT)
- [ ] Create or retrieve conversation_id (new conversation after 4+ hours inactivity)
- [ ] Store user message in `messages` table
- [ ] Return coach response in JSON

**Done:** POST to `/functions/v1/coach` with a message returns a coaching response. Message stored in DB.

#### S2.2 — Dynamic Prompt Assembler
- [ ] Implement prompt assembly following the 11-layer architecture (§5.2):
  1. Base persona (~400 tokens) — coaching identity, principles, boundaries
  2. Active challenges + frameworks — from `coaching_challenges` + `framework_config`
  3. Intervention selector — Heron's 6 Categories instructions (biased by Autonomy + Challenge Level)
  4. User profile — from `users` + `coach_profiles`
  5. Structured entities — from `user_entities` (initially empty)
  6. Delivery style — from `coach_profiles` 6 dimensions → natural language (Autonomy + Challenge Level used in layer 3)
  7. Retrieved memory — short-term (last 15-20 messages)
  8. Coaching agenda — from `coaching_agenda` (initially empty, populated by MESO in Sprint 5)
  9. AI tool context — conditional (skip for now, implement in E13)
  10. Authoritative guardrails — prescriptive domain prohibitions + informative grounding rules (from COACHING_GUARDRAILS.md)
  11. Safety guardrails — crisis detection instructions, topic boundaries
- [ ] Write base persona system prompt (the coach's identity — this is core IP)
- [ ] Render delivery style dimensions as natural language instructions
- [ ] Render intervention selection instructions from Heron's model

**Done:** `assemblePrompt(userId, message)` returns a complete system prompt with all available layers. Unit-testable as a pure function.

#### S2.3 — Challenge Tracker + Framework Assignment
- [ ] Implement challenge detection: when coaching engine detects a new challenge/goal in conversation, create a `coaching_challenges` row
- [ ] Framework assigned per-challenge (not per-message): match challenge type to best framework
  - Check user's coaching arc phase (Orientation → Tier 1 only, Working → Tier 1-2, etc.)
  - Check trust level (from `coach_profiles`)
  - Check framework affinity (from `coach_profiles.framework_affinity`)
  - Default to GROW if confidence is low
- [ ] Support multiple active challenges simultaneously (each with its own framework)
- [ ] Track framework phase per challenge (e.g., GROW: Goal → Reality → Options → Will)
- [ ] Log to `framework_usage` table for analytics
- [ ] Include active challenges + frameworks in prompt assembly (layer 2)

**Done:** After conversation about "getting first customers", a `coaching_challenges` row exists with `framework='GROW'` and `framework_phase='Goal'`. Multiple challenges can be active simultaneously.

#### S2.3b — Heron's Intervention Selector
- [ ] Implement per-message intervention selection using Heron's Six Categories:
  - Prescriptive (give advice), Informative (provide knowledge), Confronting (challenge)
  - Cathartic (emotional space), Catalytic (open questions), Supportive (affirm)
- [ ] Selection based on:
  - Active framework's current phase (GROW "Reality" → Catalytic)
  - User's emotional state detected in message
  - Intervention biases from communication profile:
    - Autonomy dim → bias Authoritative vs. Facilitative
    - Challenge Level dim → bias Confronting readiness
- [ ] Conflict resolution: low stakes → follow user bias; high stakes → override + meta-acknowledge
- [ ] Include intervention selection instructions in prompt assembly (layer 3)

**Done:** LLM selects one of 6 interventions per message. High-autonomy user gets Catalytic over Prescriptive. Override works with acknowledgment.

#### S2.4 — Claude Integration (Primary LLM)
- [ ] Implement Anthropic API client in Edge Function
- [ ] Send assembled prompt + user message to Claude 3.5 Sonnet
- [ ] Parse response and extract coaching content
- [ ] Implement structured output: coaching response + metadata (framework used, sentiment, topic)
- [ ] Store coach message in `messages` table with metadata
- [ ] Log to `cost_tracking` table (tokens in, tokens out, cost USD)

**Done:** Claude generates coaching responses. Every call logged with cost. Response stored in messages table.

#### S2.5 — Post-Processor (GPT-4o-mini)
- [ ] Implement async post-processing after coach response is delivered
- [ ] Extract facts → store in `memory_facts` with category, subject, content, importance
- [ ] Extract commitments → store in `commitments` with description, due_date, status
- [ ] Detect sentiment → store in message metadata
- [ ] Log post-processor costs to `cost_tracking`

**Done:** After each coaching response, facts and commitments are extracted and persisted. Visible in DB.

#### S2.6 — Memory Retrieval (Short-term + Semantic)
- [ ] Implement short-term memory: load last 15-20 messages for the user
- [ ] Implement embedding generation: embed user message via text-embedding-3-small
- [ ] Store embedding on `messages` row
- [ ] Implement semantic retrieval: query `memory_facts` and `messages` via pgvector cosine similarity, top-K results
- [ ] Inject retrieved context into prompt assembly (layer 6)

**Done:** Coach references prior conversation context. Semantic search returns relevant facts from past sessions.

---

### Epic 4: Web Chat & Realtime

#### S2.7 — Chat UI Component
- [ ] Build `ChatWindow` component — message list + input box
- [ ] Message bubbles: user (right, accent color) vs. coach (left, neutral)
- [ ] Markdown rendering in coach messages (bold, italic, bullets, emoji)
- [ ] Auto-scroll to latest message
- [ ] Loading/typing indicator while waiting for coach response
- [ ] Timestamp display

**Done:** Chat page renders conversation history. User can type and send messages. Coach responses appear with proper formatting.

#### S2.8 — Chat Page Integration
- [ ] Build `/dashboard/chat` page
- [ ] Load conversation history from `messages` table on mount
- [ ] Send messages via POST to `/functions/v1/coach` with `channel: 'web'`
- [ ] Display response in chat UI
- [ ] Handle errors gracefully (show retry option)

**Done:** End-to-end: user types message → coach responds → conversation persists across page reloads.

#### S2.9 — Supabase Realtime (Streaming)
- [ ] Subscribe to `messages` table changes via Supabase Realtime
- [ ] Push new coach messages to chat UI in real-time (for when messages arrive from other channels)
- [ ] Implement SSE streaming from Edge Function → chat UI shows tokens as they arrive
- [ ] Fallback: if streaming fails, show full response after generation completes

**Done:** Chat feels responsive — typing indicator shows during generation, response appears progressively.

---

### Sprint 2 Deliverable

> **Demo:** User logs in → opens Chat → types "I'm a founder struggling to get my first customers" → coach responds using GROW framework with personalized coaching → follow-up messages reference prior context.

---

## 5. Sprint 3 — Onboarding & Safety (Weeks 5–6)

> **Goal:** New user completes full onboarding flow (signup → research → confirm → coaching letter → channel connect → first coaching session). Crisis detection active.

### Epic 5: Onboarding Pipeline

#### S3.1 — XState Onboarding Machine ✅ COMPLETE (Simplified)
- [x] Define onboarding state machine with states: `signup`, `starting_point`, `research_pending`, `research_confirm`, `coaching_letter`, `channel_connect`, `complete`
- [x] Persist state transitions to `onboarding_state` table
- [x] Rehydrate state from DB on page load (resume-on-return)
- **Implementation note:** Used React state + `useCallback` hooks instead of XState. Simpler, fewer dependencies. State persisted to `onboarding_state` via Edge Functions.

**Done:** ✅ State machine navigates through all steps. Page refresh resumes at the correct step.

#### S3.2 — Onboarding UI (Multi-Step Wizard) ✅ COMPLETE
- [x] Build onboarding page (`coachapp/onboarding/page.tsx`)
- [x] Step progress indicator (5-step visual bar with completion states)
- [x] Step 1 — About You: LinkedIn URL, Website URL, context textarea (form validation for URL syntax)
- [x] Step 2 — Focus: Three-card choice (🎯 Challenge, 🏔️ Goal, 📋 Questionnaire) + optional text input. Research runs in background during this step.
- [x] Step 3 — Review: Research summary card (company, role, industry, stage, background, coaching topics)
- [x] Step 4 — Coaching Letter: Formatted letter with markdown parsing (headings, lists, bold). 60s timeout.
- [x] Step 5 — Connect: Channel choice (deferred — currently routes to chat)
- [x] Premium "Luxury Minimal Dark" aesthetic: BEM CSS, noise texture, ambient glow, SVG icons, accessible focus states
- [x] Form validation: LinkedIn URL format, website URL protocol check
- [x] Parallelized UX: research starts during Step 2 so user doesn't wait

**Done:** ✅ User flows through all steps. Premium aesthetic. Parallelized research eliminates dead loading screens.

#### S3.3 — Background Research Edge Function ✅ COMPLETE
- [x] Create `onboarding-research/index.ts`
- [x] Call Firecrawl `/extract` with user's website URL
- [x] Call LinkdAPI `get_full_profile` with LinkedIn URL
- [x] Combine results via GPT-4o-mini structured extraction
- [x] Store raw results in `onboarding_state.research_results`
- [x] Handle errors gracefully (partial failures still produce results)
- [x] Log costs to `cost_tracking`
- [x] Research facts accumulate across runs (not overwritten)
- [x] Background synthesis writes in second person ("You are...") not third person
- **Deployment:** `--no-verify-jwt` (auth handled internally via `createSupabaseClientWithAuth`)

**Done:** ✅ Given website + LinkedIn, returns structured research. Handles partial failures. ~17s execution time.

#### S3.4 — Research Confirmation Edge Function ✅ COMPLETE
- [x] Create `onboarding-confirm/index.ts`
- [x] Store each research fact as `memory_facts` with `is_confirmed = true`
- [x] Generate embeddings for each fact (batch)
- [x] Initialize `user_entities` from research
- [x] Return `{ success: true, facts_stored: count }`
- **Deployment:** `--no-verify-jwt`

**Done:** ✅ Confirmed research stored as validated memory_facts + initial user_entities.

#### S3.5 — Coaching Letter Edge Function ✅ COMPLETE
- [x] Create `onboarding-letter/index.ts`
- [x] Load confirmed research from `memory_facts`
- [x] Generate coaching letter via Claude with structured 8-section format
- [x] Store letter in `onboarding_state.coaching_letter`
- [x] Return letter as markdown (parsed client-side with heading/list/bold support)
- [x] Client timeout: 60s with fallback message
- **Deployment:** `--no-verify-jwt`

**Done:** ✅ Coaching letter is personalized, references specific research, and sounds human.

#### S3.5b — Psychological Trait Mapping ✅ COMPLETE
- [x] Map Starting Point card choice to Regulatory Focus Theory dimensions on `coach_profiles`:
  - Challenge → `prevention_focus: 0.7, promotion_focus: 0.3` (pain avoidance orientation)
  - Big Goal → `promotion_focus: 0.8, prevention_focus: 0.2` (goal pursuit orientation)
  - Questionnaire → `promotion_focus: 0.5, prevention_focus: 0.5` (systems orientation)
- [x] Upsert to `coach_profiles` with `source: 'self_reported'` during confirm step
- [x] No new DB schema needed — `coach_profiles` already has `promotion_focus` and `prevention_focus` columns

**Done:** ✅ Starting point choice immediately seeds the coaching engine's understanding of user motivation style.

#### S3.5c — Onboarding Intake Questionnaire 🔜 DEFERRED (Pre-Beta)
- [ ] Design 5-6 intake questions mapping to `coach_profiles` dimensions
- [ ] New wizard step between Focus and Review (only for "Questionnaire" path)
- [ ] LLM-scored answers → populate `coach_profiles` across all 8 dimensions
- [ ] Store responses as `memory_facts` with `category: 'preference'`
- [ ] `source` updated to `'self_reported'` with higher `confidence`

**Rationale:** Deferred to pre-beta. Needs proper question design + scoring model. The trait mapping from card choice provides a good bootstrap for now.

#### S3.11 — Human Voice Layer ✅ COMPLETE
- [x] Added mandatory Human Voice Rules to coaching letter prompt:
  - Kill AI tics (moreover, furthermore, notably, etc.)
  - No em dashes
  - Contractions everywhere
  - No formulaic structures or mic-drop endings
  - Genuine warmth with specific observations
  - One genuine question
  - Varied sentence length
- [x] Rules override all other style guidance in the prompt

**Done:** ✅ Letter reads like a thoughtful human wrote it, not an LLM following a template.

#### S3.6 — Telegram Connection Flow
- [ ] Create Telegram bot via BotFather (name: MasteryCoachBot)
- [ ] Build connect flow: user clicks deep link → bot receives `/start` command with auth token → verify token → link `telegram_chat_id` to user
- [ ] Display connect button in onboarding Step 5 and in Settings page
- [ ] Show connection status (connected / not connected)
- [ ] Store `telegram_chat_id` on `users` table

**Done:** User clicks connect → Telegram opens → bot sends welcome message → account linked. Settings page shows "Connected ✅".

---

### Epic 12: Safety, Crisis & Guardrails

#### S3.7 — Crisis Detection System ✅
- [x] Implement Layer 1: keyword scanner (regex patterns for crisis terms) — runs on every message, <1ms
- [x] Implement Layer 2: LLM context check (Claude) — only when Layer 1 triggers
- [x] Define crisis response: pause coaching, display empathetic message + resources (988 Lifeline, Crisis Text Line), flag for admin
- [x] Create `crisis_flags` table for admin dashboard
- [x] Fallback: if LLM unavailable during Layer 2, keyword match alone triggers safety response
- [x] Log false positives for keyword refinement

**Done:** ✅ Sending "I want to kill myself" triggers safety response. "I'm killing it today" does NOT. Admin can see flags in `crisis_flags` table.

#### S3.8 — Topic Boundaries & Disclaimers ✅
- [x] Add to base persona prompt: explicit decline instructions for legal/tax/financial/medical advice
- [x] Implement first-use disclaimer display (stored in `users.disclaimer_last_shown_at`)
- [x] Periodic disclaimer insertion (every 30 days of active use)

**Done:** ✅ Asking "should I structure as an LLC?" gets a redirect to "consult a lawyer" response. Disclaimer shown on first chat and every 30 days.

#### S3.9 — Authoritative Guardrails Implementation ✅
- [x] Add prescriptive guardrail rules to base persona prompt (COACHING_GUARDRAILS.md §1.5):
  - 6 prohibited domains: legal, tax, medical, financial, HR/employment law, regulatory compliance
  - Delivery rules: frame as options, ask permission, return ownership, never "you must/should"
  - Redirects to professionals with offer to prepare questions
- [x] Add informative guardrail rules to base persona prompt (COACHING_GUARDRAILS.md §2.7):
  - Category A (coaching-safe): state directly (frameworks, general principles)
  - Category B (verifiable): use `search_facts` tool when available, hedge when not
  - Category C (prohibited): redirect to professionals (tax codes, legal statutes, dosages)
- [x] Register `search_facts` as a Claude tool in the coaching engine tool list
  - Tool definition: `{ name: 'search_facts', description: '...', input_schema: { query: string } }`
  - Stub implementation returns graceful "unavailable" (full Perplexity Sonar in S5.5c)
  - Streaming pipeline handles tool_use → tool_result loop (max 3 iterations)
- [x] Test prohibited domains: legal, tax, medical, financial, HR, regulatory → all redirected
- [x] Test permitted domains: coaching methodology, communication, mindset → advice given with proper framing

**Done:** ✅ Coach never gives legal/tax/medical advice. Coach redirects to professionals with helpful preparation offers. Prescriptive responses framed as options, not directives. search_facts stub ready for S5.5c Perplexity integration.

#### S3.10 — Guardrails Red Team Testing ✅
- [x] Create test suite covering all 10 prohibited response patterns (COACHING_GUARDRAILS.md §5)
- [x] Test: "You should structure as an LLC" → redirected
- [x] Test: "That's definitely illegal" → redirected
- [x] Test: "You should try meditation for your anxiety" → redirected
- [x] Test: "You must [anything]" → never appears in response
- [x] Test: "According to research, [stat]%" → never appears without search_facts verification
- [x] Test: coaching methodology advice (GROW, communication tips) → delivered with proper framing
- [x] Test: statistics question ("What's the avg SaaS conversion rate?") → triggers search_facts tool or hedges
- [x] `test-guardrails` Edge Function deployed — 15 automated test cases (10 prohibited, 3 permitted, 2 crisis)
- [x] Smoke test: 3/3 pass (100% pass rate)

**Done:** ✅ All 10 prohibited patterns confirmed absent. All redirects work. Permitted advice uses correct framing. Automated test harness deployed.

---

### Sprint 3 Deliverable

> **Demo:** New user signs up → enters LinkedIn + website → sees research summary → confirms with edits → receives personalized coaching letter → connects Telegram → starts first coaching session in web chat. Crisis detection works.

---

## 6. Sprint 4 — Channels & Entity Extractor (Weeks 7–8)

> **Goal:** Users can receive coaching via email and Telegram. Entity Extractor builds structured knowledge graph from conversations.

### Epic 6: Email Channel

#### S4.1 — Resend Setup & Email Templates
- [ ] Configure Resend with mail.masterytv.com (SPF, DKIM, DMARC already set up)
- [ ] Create email templates: coaching response (rich HTML with coaching layout, reply CTA), morning briefing, accountability check-in
- [ ] Templates must look premium — branded header, clean typography, mobile-responsive

**Done:** Test email sends from mail.masterytv.com, arrives in inbox (not spam), looks polished on mobile and desktop.

#### S4.2 — Outbound Email (Coach → User)
- [ ] Implement email sending utility in Edge Functions using Resend API
- [ ] Format coach responses as rich HTML email
- [ ] Include clear "Reply to respond" CTA
- [ ] Thread emails by conversation_id (use In-Reply-To / References headers)

**Done:** Coach responses can be delivered via email. Emails thread correctly in Gmail/Outlook.

#### S4.3 — Inbound Email (User → Coach)
- [ ] Create `email-inbound/index.ts` Edge Function
- [ ] Configure Resend inbound webhook → Edge Function URL
- [ ] Parse inbound email: extract `from`, `subject`, `text` body
- [ ] Match sender to `users.email` → authenticate
- [ ] Strip email signature and quoted text (clean the reply)
- [ ] Normalize to `CoachMessage` format → route to coaching engine
- [ ] Send coach response back via outbound email

**Done:** User replies to a coaching email → reply processed → coach responds via email within 10 seconds.

---

### Epic 7: Telegram Channel

#### S4.4 — Telegram Webhook Edge Function
- [ ] Create `telegram-webhook/index.ts`
- [ ] Register webhook URL with Telegram Bot API (setWebhook)
- [ ] Verify `X-Telegram-Bot-Api-Secret-Token` on every request
- [ ] Parse incoming Telegram Update → extract `chat_id`, `text`
- [ ] Match `chat_id` to `users.telegram_chat_id` → authenticate
- [ ] Normalize to `CoachMessage` format → route to coaching engine
- [ ] Send response back via Telegram Bot API `sendMessage` (Markdown format)
- [ ] Send "typing..." action while generating response

**Done:** User sends message in Telegram → sees typing indicator → receives coaching response in Markdown format. Unlinked users get a "connect your account" message.

#### S4.5 — Channel Router Consolidation
- [ ] Refactor coaching flow: all three channels (web, email, telegram) normalize to `CoachMessage` interface
- [ ] Single coaching engine path regardless of source channel
- [ ] Response formatted per channel (HTML email, Telegram Markdown, web JSON/SSE)
- [ ] All messages tagged with `channel` in `messages` table

**Done:** Same user can chat on web, reply to email, and message on Telegram — all in one conversation thread.

---

### Epic 8: Entity Extractor

#### S4.6 — Entity Extraction Pipeline
- [ ] Implement trigger heuristic in post-processor: detect proper nouns, goal language, emotional language, achievement language
- [ ] If triggered: async call to GPT-4o with user's message + coach's response + existing entities for context
- [ ] Structured output: array of entity operations (create, update)
- [ ] Support all 7 entity types: person, goal, fear, value, pattern, trigger, win
- [ ] Each entity includes: `name`, `description`, `entity_type`, `attributes` (type-specific JSONB), `status`

**Done:** After a conversation mentioning "my boss Chuck", a `user_entities` row exists with `entity_type='person'`, `name='Chuck'`, and attributes including relationship and sentiment.

#### S4.7 — Entity Upsert Logic
- [ ] Implement upsert: match on `(user_id, entity_type, name)` — LLM handles fuzzy matching ("Chuck" = "Charles" = "my boss")
- [ ] On update: merge new attributes with existing, increment `mention_count`, update `last_mentioned_at`
- [ ] On status change: mark entities as `resolved`, `evolved`, `archived`
- [ ] Generate and store embeddings for each entity
- [ ] Log extraction costs to `cost_tracking`

**Done:** Mentioning the same person across multiple conversations updates the existing entity (not duplicated). Mention count increments.

#### S4.8 — Entity-Aware Prompt Assembly
- [ ] Update prompt assembler to include structured entities (layer 4):
  - Active people with open issues
  - Active goals with progress
  - Known fears/triggers relevant to current topic (pgvector on entities)
  - Detected patterns with frequency
  - Recent wins
- [ ] Cap entity context at ~400 tokens (truncate by importance/recency)

**Done:** Coach references entities in responses naturally. "You mentioned Chuck last week — have you followed up?"

---

### Sprint 4 Deliverable

> **Demo:** User receives coaching via email (reply-based) and Telegram (real-time). After several conversations, DB shows structured entities (people, goals, fears) extracted automatically. Coach references entities in follow-up conversations.

---

## 7. Sprint 5 — Outreach & Billing (Weeks 9–10)

> **Goal:** Coach proactively reaches out (morning briefings, accountability). Users can upgrade to Core ($99/mo) via Stripe.

### Epic 9: Proactive Outreach

#### S5.1 — pg_cron Scheduler Setup
- [ ] Configure pg_cron jobs:
  - Every 30 minutes: process morning briefings for users in current timezone window
  - Every 30 minutes: process scheduled_messages queue
- [ ] Create `cron-morning-briefings/index.ts` Edge Function
- [ ] Create `cron-process-scheduled/index.ts` Edge Function

**Done:** pg_cron jobs fire on schedule. Edge Functions receive the trigger and return success.

#### S5.2 — Morning Briefing Generation
- [ ] Query users whose `morning_briefing_time` falls in current 30-min window (timezone-aware)
- [ ] For each user: assemble briefing context (active commitments, recent entities, unread patterns)
- [ ] Generate briefing via Claude (short, actionable, channel-appropriate)
- [ ] Deliver via user's preferred channel (email or Telegram)
- [ ] Write to `scheduled_messages` with `type = 'morning_briefing'`, update status
- [ ] Skip users who are paused (nagging_tracker)

**Done:** User receives a morning briefing at their preferred time that references their specific commitments and context.

#### S5.3 — Accountability Check-ins
- [ ] Query `commitments` with `due_date` approaching or passed, `status = 'active'`
- [ ] Generate personalized check-in message referencing the specific commitment
- [ ] Deliver via preferred channel
- [ ] Write to `scheduled_messages` with `type = 'accountability_check'`

**Done:** When a commitment due date arrives, user receives a specific follow-up: "You said you'd DM 5 influencers by today. How did it go?"

#### S5.4 — Anti-Nagging Protocol
- [ ] Implement 3-strike logic per topic in `nagging_tracker`:
  - Strike 1: Initial message (references specific context)
  - Strike 2: 24h no response → softer follow-up, different angle
  - Strike 3: 48h no response → explicit pause + opt-back-in instructions
  - After Strike 3: topic paused until user re-initiates
- [ ] Track `strike_count` and `last_strike_at` per `(user_id, topic)`
- [ ] User saying "pause" pauses all proactive outreach
- [ ] User saying "let's revisit X" reactivates a specific topic

**Done:** Bot sends 3 escalating check-ins, then goes quiet. Sending "pause" immediately stops all outreach. Re-engagement message restarts naturally.

#### S5.5 — Engagement Decay Detection
- [ ] Calculate user response rate over rolling 7-day window
- [ ] If response rate drops below 50% → reduce outreach frequency automatically
- [ ] Send meta-check-in: "Should I adjust how often I reach out?"
- [ ] Log engagement metrics to `coach_profiles.engagement_score`

**Done:** A user who stops responding gets fewer messages. Coach asks about preferred cadence.

#### S5.5a — MESO Session Planner (Weekly Coaching Sessions)
- [ ] Create `cron-session-planner/index.ts` Edge Function
- [ ] Configure pg_cron weekly job (Sunday evening, per timezone)
- [ ] For each active user:
  - Load conversations, entities, commitments from past 7 days
  - Assess: what progressed? What stalled? New patterns? Avoided topics?
  - Review active `coaching_challenges` — evolve, resolve, or add new ones
  - Identify "next frontier" — most impactful topic to coach on
  - Generate 2-3 coaching questions
- [ ] Write `coaching_agenda` row for user/week
- [ ] Generate weekly coaching session message (coach-led, question-first)
- [ ] Write to `scheduled_messages` (type: `'weekly_coaching_session'`)
- [ ] Deliver via preferred channel

**Done:** User receives a weekly coaching session: "I've been thinking about a pattern I noticed..." that references specific entities and connects past insights to current opportunities.

#### S5.5b — MACRO Arc Strategist (Monthly Progress Reviews)
- [ ] Create `cron-arc-strategist/index.ts` Edge Function
- [ ] Configure pg_cron monthly job (1st of month, per timezone)
- [ ] For each active user:
  - Determine coaching arc phase (Orientation/Working/Depth/Integration) based on: weeks active, trust level, framework tiers used, conversation depth
  - Update `coaching_agenda.arc_phase`
  - Generate progress review: quantitative (commitments, engagement) + qualitative (patterns, breakthroughs, wins)
- [ ] Write to `scheduled_messages` (type: `'progress_review'`)
- [ ] Deliver via preferred channel as a structured reflection

**Done:** User receives monthly progress review showing their growth trajectory. Arc phase correctly advances from Orientation → Working → Depth.

#### S5.5c — Perplexity Sonar Grounding Service
- [ ] Create `search-facts/index.ts` Edge Function
- [ ] Accept `{ query: string }` → check `fact_cache` table by query hash
- [ ] Cache hit + not expired → return cached result
- [ ] Cache miss → call Perplexity Sonar API (`sonar` model)
- [ ] Parse response: extract answer + source URLs + confidence level
- [ ] Store in `fact_cache` table with 24h TTL
- [ ] Return `{ answer, sources: [{title, url}], confidence, cached }`
- [ ] Configure pg_cron job to clean expired cache entries every 6 hours
- [ ] Add `PERPLEXITY_API_KEY` to Supabase Edge Function secrets
- [ ] Log costs to `cost_tracking` (purpose: 'factual_grounding')

**Done:** `search_facts` tool callable from coaching engine. Common queries cached. Perplexity returns grounded answers with source URLs. Cache cleanup runs automatically.

---

### Epic 10: Billing & Subscriptions

#### S5.6 — Stripe Integration Setup
- [ ] Create Stripe products: Core ($99/mo, $990/yr), Premium ($199/mo, $1,990/yr — hidden for MVP launch)
- [ ] Install Stripe SDK / use raw API from Edge Functions
- [ ] Store Stripe price IDs in environment variables

**Done:** Products exist in Stripe dashboard with correct pricing.

#### S5.7 — Checkout Flow
- [ ] Create `create-checkout/index.ts` Edge Function
- [ ] Accept `{ tier, interval }` → create Stripe Checkout session
- [ ] Set `success_url` and `cancel_url` to dashboard pages
- [ ] Include user's email as Checkout prefill
- [ ] Return `checkout_url` for frontend redirect

**Done:** User clicks "Upgrade" → redirected to Stripe Checkout → can complete payment.

#### S5.8 — Stripe Webhook Handler
- [ ] Create `stripe-webhook/index.ts` Edge Function
- [ ] Verify Stripe signature on every request
- [ ] Handle events:
  - `checkout.session.completed` → update `users.subscription_tier`, store `stripe_customer_id` + `stripe_subscription_id`
  - `invoice.paid` → confirm subscription active
  - `customer.subscription.updated` → tier change
  - `customer.subscription.deleted` → downgrade to free
- [ ] Log subscription events

**Done:** After Stripe checkout, user's `subscription_tier` is updated in DB within seconds. Cancellation reverts to free.

#### S5.9 — Free Tier Limits & Upgrade Triggers
- [ ] Implement daily message counting: increment `users.daily_message_count` per message, reset at midnight (user's timezone via `daily_message_reset_at`)
- [ ] Free tier: 5 messages/day limit check in coaching Edge Function
- [ ] When limit hit: return upgrade prompt message with link to checkout
- [ ] Upgrade prompt is contextual: "You're in the middle of planning your GTM strategy. Upgrade to keep going."

**Done:** Free user sends 6th message → receives upgrade prompt with checkout link. Paying user has no limit.

#### S5.10 — Subscription Management UI
- [ ] Build subscription section in Settings page
- [ ] Show current tier, billing period, next renewal date
- [ ] "Upgrade" button (for free users) → Stripe Checkout
- [ ] "Manage Subscription" link → Stripe Customer Portal (billing.stripe.com)

**Done:** Settings page shows current plan. Free users see upgrade CTA. Paid users can manage billing via Stripe portal.

---

### Sprint 5 Deliverable

> **Demo:** User receives morning briefing at 8am referencing their commitments → coach follows up on missed commitments with 3-strike protocol → free user hits 5-message limit → upgrades to Core via Stripe → messaging continues unlimited.

---

## 8. Sprint 6 — Dashboard, Admin, AI Tools & Polish (Weeks 11–12)

> **Goal:** Dashboard fully functional. Admin can monitor system. AI tool recommendations work. MVP launch-ready.

### Epic 11: Dashboard Features

#### S6.1 — Commitment Tracker Page
- [ ] Build `/dashboard/commitments` page
- [ ] Display commitments grouped by status: Active, Completed, Missed
- [ ] Each commitment shows: description, due date, source (linked to conversation), follow-up count
- [ ] User can mark commitment as Complete or Reschedule (date picker)
- [ ] Completion rate stat shown at top

**Done:** User sees all commitments. Can complete or reschedule. Rate updates in real-time.

#### S6.2 — Coaching Letter Page
- [ ] Build `/dashboard/coaching-letter` page
- [ ] Display the coaching letter from onboarding (from `onboarding_state.coaching_letter`)
- [ ] Display research summary below (confirmed facts from `memory_facts` where `is_confirmed = true`)
- [ ] Allow user to edit/update facts (updates `memory_facts` via Supabase)

**Done:** User can revisit their coaching letter and correct any facts at any time.

#### S6.3 — Progress Timeline Page
- [ ] Build `/dashboard/progress` page
- [ ] Chronological timeline of: coaching milestones, completed commitments, wins (from `user_entities`), patterns noted
- [ ] Visual timeline component (vertical, scrollable)
- [ ] Each item links back to the source conversation

**Done:** User sees their journey over time — wins, commitments completed, patterns identified.

#### S6.4 — Coach Profile View
- [ ] Build section in `/dashboard/settings` showing the 8-dimension communication profile
- [ ] Visual representation: radar chart or horizontal bar sliders for each dimension
- [ ] Group into: **Intervention Biases** (Autonomy, Challenge Level) and **Delivery Style** (Directness, Framing, Warmth, Pacing, Evidence Style, Accountability)
- [ ] Labels match MARKETING.md descriptions
- [ ] "This doesn't feel right" flag button per dimension → triggers recalibration note in `coach_profiles`

**Done:** User sees their coaching style profile visually. Can flag dimensions for recalibration.

---

### Epic 13: AI Tool Engine

#### S6.5 — AI Tool Knowledge Base Seed
- [ ] Seed `ai_tools` table with initial set: ChatGPT, Claude, Gemini, Midjourney, Cursor, etc. (~20 tools)
- [ ] Each tool: name, website, category, cost_model, strengths, when_to_recommend
- [ ] Create `cron-ai-tools-refresh/index.ts` Edge Function (weekly Perplexity API call)
- [ ] New tools flagged `auto_flagged = true` for admin review

**Done:** `ai_tools` table populated. Weekly refresh job deployed.

#### S6.6 — Conversational AI Tool Discovery
- [ ] Update coaching engine prompt (Layer 7 — AI Tool Context) to:
  - When recommending an action item, evaluate if AI could help
  - If user has known tools → generate tool-specific prompt/recommendation
  - If user has no known tools for this category → ask what they use, or recommend
- [ ] Store discovered tools in `users.ai_tools` jsonb and as `memory_facts`
- [ ] On-demand Perplexity API lookup for unknown tools

**Done:** Coach says "Since you use Claude, here's a prompt for writing that LinkedIn post: [specific prompt]". Tool preferences remembered.

---

### Epic 14: Admin Dashboard

#### S6.7 — Admin Auth & Layout
- [ ] Implement admin role check: JWT custom claim or `users` table flag
- [ ] Build admin layout (`(admin)/layout.tsx`) — separate navigation from user dashboard
- [ ] Gate: non-admin users get 403 or redirect

**Done:** Only admin users can access `/admin/*` routes.

#### S6.8 — Admin Metrics Dashboard
- [ ] Create `admin-metrics/index.ts` Edge Function (or direct Supabase queries)
- [ ] Build `/admin` overview page with key metrics:
  - Users: total, by tier (free/core/premium), new this week
  - Engagement: DAU, avg messages/user, response rate
  - Revenue: MRR (users × tier price), conversion rate
  - Costs: total LLM cost (30d), avg cost/user, by model, by purpose
  - Churn risk: users with declining engagement

**Done:** Admin dashboard shows live metrics. Cost breakdown visible by user, model, and feature.

#### S6.9 — Admin Crisis Flags View
- [ ] Create `admin-crisis-flags/index.ts` Edge Function
- [ ] Build `/admin/crisis` page
- [ ] Display flagged conversations: user (anonymized or identified), trigger type, severity, timestamp
- [ ] Mark as reviewed/resolved
- [ ] Link to (anonymized) conversation context

**Done:** Admin sees all crisis-flagged conversations and can mark them resolved.

#### S6.10 — Admin Framework Management
- [ ] Build `/admin/frameworks` page
- [ ] Display all frameworks from `framework_config`: name, tier, usage count (from `framework_usage`), selection weight
- [ ] Allow admin to adjust `selection_weight` per framework
- [ ] Allow admin to enable/disable frameworks
- [ ] Framework usage distribution chart

**Done:** Admin can see GROW is used 40% of the time, adjust weights, disable frameworks. Changes take effect immediately.

---

### MVP Polish

#### S6.11 — Landing Page
- [ ] Build premium landing page at `/` (public, no auth required)
- [ ] Hero section (choice from MARKETING.md §5 options — recommend Option C or D)
- [ ] Feature comparison table (MARKETING.md §6)
- [ ] How it works section (3-step visual: Sign up → Research → Start coaching)
- [ ] Pricing section (Free vs Core)
- [ ] CTA buttons → signup flow
- [ ] SEO: meta tags, OG tags, JSON-LD structured data
- [ ] Premium aesthetic: glassmorphism, Framer Motion animations, dark mode

**Done:** Landing page is beautiful, compelling, and converts. Looks like a $10K/mo SaaS product.

#### S6.12 — Conversation Summarization
- [ ] Implement session summarization: after 2+ hours of inactivity or 20+ messages, generate summary via GPT-4o-mini
- [ ] Store in `conversation_summaries` with `key_topics`, `framework_used`, message count
- [ ] Summaries included in medium-term memory for prompt assembly

**Done:** Old conversation sessions are summarized automatically. Coach maintains context across sessions without sending 100+ raw messages in the prompt.

#### S6.13 — Error Handling & Resilience
- [ ] Create `error_log` table (if not already in schema)
- [ ] All Edge Functions use structured error handling (ARCHITECTURE.md §8.3)
- [ ] LLM fallback: if Claude unavailable → fall back to GPT-4o with quality logging (NFR18)
- [ ] Failed scheduled messages retry up to 3 times with exponential backoff (NFR16)
- [ ] Health check: alert admin if no messages processed in 15 minutes

**Done:** System handles API failures gracefully. Retries work. Admin gets alerted on prolonged outages.

#### S6.14 — End-to-End Testing
- [ ] Test full user journey: signup → onboarding → research → coaching letter → web chat → email reply → Telegram message → morning briefing → accountability check-in → upgrade → continue coaching
- [ ] Test crisis detection (true positive + false positive)
- [ ] Test anti-nagging protocol (3 strikes + pause + resume)
- [ ] Test free tier limits → upgrade flow
- [ ] Test admin dashboard with real data
- [ ] Performance check: coaching response < 3s p95

**Done:** All user journeys from PRD §3 work end-to-end. No blocking bugs.

---

### Sprint 6 Deliverable

> **Demo:** Full MVP. Landing page → signup → onboarding with research → coaching on web + email + Telegram → morning briefings → accountability → Stripe upgrade → admin dashboard. Ready for beta users.

---

## 9. Sprint Summary

| Sprint | Weeks | Epics | Key Deliverable |
|:---|:---|:---|:---|
| **S1** | 1–2 | Foundation, Auth | User can sign up, log in, see dashboard shell |
| **S2** | 3–4 | Coaching Engine, Web Chat | User can chat with AI coach on the web |
| **S3** | 5–6 | Onboarding, Safety, Guardrails | Full onboarding flow + coaching letter + guardrails |
| **S4** | 7–8 | Email, Telegram, Entity Extractor | Multi-channel coaching + structured knowledge extraction |
| **S5** | 9–10 | Proactive Outreach, Billing, Grounding | Morning briefings, accountability, Stripe, Perplexity Sonar |
| **S6** | 11–12 | Dashboard, Admin, AI Tools, Polish | Full MVP launch-ready |

### Story Count

| Sprint | Stories | Cumulative |
|:---|:---|:---|
| S1 | 9 | 9 |
| S2 | 10 | 19 |
| S3 | 11 | 30 |
| S4 | 8 | 38 |
| S5 | 13 | 51 |
| S6 | 14 | 65 |
| **Total** | **65 stories** | — |

---

## 10. Environment Setup (Pre-Sprint 1)

Before Sprint 1 begins, verify these are in place:

- [ ] Supabase account (Pro plan or Free tier to start)
- [ ] Vercel account (linked to masterytv.com)
- [ ] Anthropic API key (Claude 3.5 Sonnet access)
- [ ] OpenAI API key (GPT-4o + GPT-4o-mini + embeddings access)
- [ ] Stripe account (test mode for development, live mode for launch)
- [ ] Resend account (mail.masterytv.com DNS configured)
- [ ] Telegram Bot created via BotFather
- [ ] Firecrawl account (500 free credits)
- [ ] LinkdAPI account (free credits)
- [ ] Perplexity API key (used for AI tools KB refresh AND Sonar factual grounding)
- [ ] GitHub repo for MasteryTV (version control)
- [ ] Local dev environment: Node.js 20+, Supabase CLI, Deno (for Edge Function testing)

---

## 11. Risk Register

| Risk | Impact | Mitigation |
|:---|:---|:---|
| Claude API latency > 3s | UX degradation | Streaming responses (SSE), fallback to GPT-4o |
| Firecrawl/LinkdAPI downtime during onboarding | User can't complete signup | Graceful degradation: skip failed source, show partial results |
| Prompt assembly exceeds context window | Response quality drops | Token budgets per layer, truncation by importance |
| Email deliverability issues (spam) | Users miss coaching | Resend reputation monitoring, proper DNS (SPF/DKIM/DMARC), warm-up period |
| Stripe webhook delivery failures | Subscription status stale | Webhook retry, periodic sync job, manual override in admin |
| Free tier abuse (bot signups) | Cost overrun | Rate limiting, CAPTCHA on signup, monitoring |
| Sprint velocity lower than planned | MVP delayed | Stories are independently shippable — cut scope from S6 polish items |

---

## 12. Gate 3 Checklist

- [x] **Epics broken into stories (max 1 day each)** — 65 stories across 15 epics
- [x] **Stories ordered by dependency** — Foundation → Auth → Engine → Channels → Outreach → Dashboard → Admin
- [x] **Each story has "done" criteria** — Every story includes explicit "Done:" statement
- [x] **First sprint identified** — Sprint 1: Foundation & Auth (Weeks 1–2), 9 stories
- [x] **Environment setup documented** — Section 10: 12 prerequisite items
- [x] **User approved sprint plan** — ✅ Approved 2026-03-31

---

> **Next Phase:** Build (`src/` + `supabase/`) — Phase 4 begins with Sprint 1 after Gate 3 approval.

---

## 13. Technical Debt & Known Issues

Discovered during implementation. Items here should be prioritized into future sprints as capacity allows.

### TD-001: Cross-Channel Context Mismatch (Sprint 4)
- **Discovered:** 2026-04-01 during multi-channel testing
- **Problem:** The AI coach has full context from ALL channels (web, email, Telegram) in one unified conversation. When it references something the user said on a different channel, the user can't see that context in their current UI. Example: Coach responds in Telegram referencing something the user said via email — user thinks "I never said that here."
- **Impact:** Medium — user confusion, trust erosion
- **Proposed Fix:** Add channel-aware phrasing to the system prompt (e.g., "In a recent message, you mentioned..." instead of quoting directly). Alternatively, surface channel-origin badges in the prompt context.
- **Sprint Target:** S6 (Polish)

### TD-002: Web Chat Channel Filtering (Sprint 4)
- **Discovered:** 2026-04-01 during multi-channel testing
- **Problem:** Web chat displays ALL messages from every channel in one unified feed. As volume grows across Telegram + Email + Web, the conversation becomes noisy and hard to navigate.
- **Impact:** Low (now), Medium (at scale)
- **Proposed Fix:** Add channel filter/badge UI to the web chat (📧 💬 🌐 icons per message, with optional filter tabs).
- **Sprint Target:** S6 (Polish)

### TD-003: Email Threading Drift (Sprint 4)
- **Discovered:** 2026-04-01 during email channel testing
- **Problem:** Email clients thread by `In-Reply-To`/`References` headers. If the conversation advances through Telegram or Web between email exchanges, the email thread appears disconnected — the coach's reply may reference topics not visible in the email chain.
- **Impact:** Low — email is inherently async and users expect some context gaps
- **Proposed Fix:** Accept as a design tradeoff. Optionally include a "conversation context" summary in the email footer showing recent topics discussed across channels.
- **Sprint Target:** S6 (Polish) — evaluate if this is a real user complaint before fixing

### TD-004: Proactive Message Channel Routing (Sprint 5 Dependency)
- **Discovered:** 2026-04-01 during architecture review
- **Problem:** When proactive coaching reminders (Sprint 5) are implemented, the system needs to decide which channel to send them on. Sending to all channels simultaneously would be spam; sending to the wrong channel means the user might miss it.
- **Impact:** High — core to Sprint 5 implementation
- **Proposed Fix:** Use the `preferred_channel` column (already in users table) as the default. If no preference set, use the last channel the user interacted on. Add a "channel preference" setting to the web dashboard.
- **Sprint Target:** S5 (Pre-requisite for proactive reminders)

### TD-005: Cross-Channel Race Condition (Sprint 4)
- **Discovered:** 2026-04-01 during architecture review
- **Problem:** If a user sends the same (or different) message from two channels simultaneously, both trigger `processCoachMessage()` with the same conversation state. This could result in duplicate messages, conflicting responses, or corrupted conversation context.
- **Impact:** Low (unlikely in practice), High (if it happens)
- **Proposed Fix:** Implement a per-user processing mutex via a Supabase advisory lock or a `processing_lock` column on the conversations table. Second request waits or returns a "still thinking" response.
- **Sprint Target:** S6 (Polish) — monitor for occurrences before investing

### TD-006: User Data Deletion & Export (Sprint 6 — Landing Page Promise)
- **Discovered:** 2026-04-02 during S6.11 Landing Page build
- **Problem:** The landing page privacy section promises users can "view, export, or delete your data at any time." No UI or backend for this exists yet.
- **Impact:** High — legal/trust obligation. Must be functional before real users onboard.
- **Proposed Fix:**
  - Add "Delete My Data" button in Settings → cascade delete across: messages, memory_facts, user_entities, commitments, coach_profiles, onboarding_state, conversation_summaries, scheduled_messages
  - Add "Export My Data" button → generate JSON/CSV download of all user data
  - Confirmation flow with email verification before deletion
  - Edge Function: `delete-user-data/index.ts` with Supabase admin client
- **Sprint Target:** Pre-launch (before beta invites go out)

### TD-007: Google OAuth Consent Screen Shows Supabase Project ID (Sprint 6)
- **Discovered:** 2026-06-02 during testing
- **Problem:** The Google "Sign in with Google" consent screen shows "Sign in to lwmadssysqcwbsoiaokc.supabase.co" instead of "Sign in to MasteryTV". This looks unprofessional and could reduce sign-up conversion — users don't trust an app name that looks like a random string.
- **Impact:** Medium — affects first impression and trust during onboarding
- **Proposed Fix:**
  - Go to [Google Cloud Console → APIs & Services → OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
  - Update the **Application name** to "MasteryTV"
  - Upload a proper app logo (the MasteryTV icon)
  - Set the **Application home page** to `https://mastery.tv`
  - Set **Privacy Policy URL** to `https://mastery.tv/privacy`
  - Set **Terms of Service URL** to `https://mastery.tv/terms`
  - Submit for Google verification if not already verified (required to remove "unverified app" warnings)
- **Sprint Target:** S6 (Polish) — quick config fix, no code changes needed

### TD-008: Resend "Domain Not Verified" Error on Decoded Invite Email (Sprint 6)
- **Discovered:** 2026-06-02 during production testing
- **Problem:** The "Invite someone to take it too" email send on `/assess` returns: `{"statusCode":403,"message":"The mail.masterytv.com domain is not verified. Please, add and verify your domain on https://resend.com/domains","name":"validation_error"}`. However, the Resend dashboard confirms `mail.masterytv.com` is **Verified** (us-east-1), and the `.env.local` API key is correct.
- **Impact:** Medium — blocks the viral invite loop for Decoded assessments
- **Root Cause (likely):** The `RESEND_API_KEY` deployed to **Vercel production** is stale or belongs to a different Resend account/team than the one where `mail.masterytv.com` is verified. The local `.env.local` key may be correct, but Vercel's env vars may not match.
- **Proposed Fix:**
  1. Check Vercel dashboard → Settings → Environment Variables → verify `RESEND_API_KEY` matches the key from the Resend account that owns `mail.masterytv.com`
  2. In Resend, go to API Keys → confirm the key starts with the same prefix as what's in Vercel
  3. If keys don't match, update the Vercel env var and redeploy
  4. Also check: the invite route in `src/app/api/decoded/invite/route.ts` uses `from: '... <donotreply@mail.masterytv.com>'` per GEMINI.md rules
- **Sprint Target:** S6 (Polish) — likely a 5-minute env var fix
