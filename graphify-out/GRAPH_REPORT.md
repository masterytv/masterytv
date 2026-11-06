# Graph Report - masterytv  (2026-11-06)

## Corpus Check
- Large corpus: 993 files · ~922,937 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 3197 nodes · 7064 edges · 182 communities (148 shown, 34 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 194 edges (avg confidence: 0.86)
- Token cost: 1,317,493 input · 0 output

## Community Hubs (Navigation)
- Accountability Check-in Delivery
- Onboarding Flow
- Coach Tools & Prompt Layers
- Report Archetype Visuals
- Output Auditor & Signals
- Corpus Claim Engine
- Landing Pages & Icons
- Brand Metadata Layouts
- Settings, Chat & Frameworks
- Coach Endpoint & Safety Sweep
- Legacy Checkout & PDF
- Report Voice Config
- Compatibility Report Function
- Vertical Landing Pages
- Admin Users & Coaching Letter
- Consent & Post-Processor
- Platform Brand & Modules
- Decoded Invite Flow
- Report Prompt Types
- Integration Safety Design
- Cron Jobs & Data Deletion
- Assessment Engine Scoring
- Relationship Data Spine
- Admin APIs & Beta Codes
- Instruments & Beta Check-in
- Legal Pages
- Login & Dashboard Shell
- Money Maps Scoring
- Platform Architecture ADRs
- Beta Cockpit Funnel
- Beta Survey & Feedback
- Admin Nav & Webhooks
- Crisis Detection
- Assessment Profile Builder
- Scoring Engine Norms
- Decoded Report Generator
- Money Vertical Specs
- HEARD Dictation
- Stripe Billing Plans
- Decoded Features & Competitor
- Relatti Experience Research
- Tenancy Audit & Playbook
- Coach Architecture Audit
- Money Report UI
- Chat Window
- Compatibility Report Viewer
- Guardrails & Heron Interventions
- Beta Offer & Check-in Fields
- Compatibility Hub & Sharing
- Money Report Function
- Narrative Voices Research
- Invite Consent APIs
- Score Transformer
- Narrative Voices ADRs
- Decoded PRD Features
- ORIENT Briefing & Scoring Keys
- Dashboard Home
- Score Dashboard Charts
- Report Section Templates
- Report Safety & Voice Pipeline
- Coach App PRD Frameworks
- Decoded DB Schema
- Decoded Nav & Voice Selector
- Decoded Billing Tiers
- Assess Page
- Arc Strategist & Planner Crons
- Anthropic Client
- Dyad Context & Money Profile
- Brand Guide Rules
- Coaching Brain Layers
- Money Discovery
- Relationship Prd
- Templates V2
- Science Page
- Classifier
- Decoded Narrative Voices Prd
- Decoded
- Relationship Sprint
- Privacy Terms Liability Plan
- Compatibilityhub
- Ritualcard
- Types
- Discovery
- Safety Escalation Protocol
- Theme Provider
- Partner Need To Hear
- Telegram
- Decoded Narrative Voices Architecture
- Assessment Program Scoping
- Decoded Card Design Spec
- Decoded 2
- Moneydashboard
- Debug Tabs
- Strategy
- Decoded Narrative Voices Architecture 2
- Invite Program Design
- Integration Consent
- Dashboard Dyad
- Decodednoir2Landing
- Ai Crawlers
- Relationships
- Architecture
- Proactive Content Plan
- Landing
- Legacyform
- Modifier Resolver
- Beta Launch Copy
- Sprint
- Money Experience Notes
- Send Email Index
- Claim Invites
- Decodedmarketinglanding
- Decodednoirlanding
- Archetypecard
- Partner Need To Hear.Test
- Architecture 2
- Settings Page
- Consent Machine
- Database
- Architecture 3
- Marketing
- Money Traits Rename
- Integration Page
- Admin Data Index
- Decoded Report Structure
- Card Route
- Blueprintview
- Architecture 4
- Decoded Narrative Voices Sprint
- Preview Page
- Ritual
- Coaching Brain
- Crisis Page
- Voice Config
- [Code] Page
- Moneymapsradar
- Decoded Narrative Voices Architecture 3
- Home Challenge Copy
- Money Traits Instrument
- Privacy Page
- Home Challenge Copy 2
- Integration Discovery
- Flags
- Verify Page
- Thank You Page
- Money Narrative
- Integration Experience
- Integration Sprint
- Prompt Debt
- Discovery 2
- Doc Maintenance
- Integration Discovery 2
- Integration Experience 2
- Config
- Decoded Schema
- Decoded Scoring
- Integration Discovery 3
- Integration Discovery 4
- Integration Discovery 5
- Integration Experience 3
- Config 2
- Decoded Schema 2
- Decoded Scoring 2
- Decoded Scoring 3
- Decoded Scoring 4
- Decoded Scoring 5
- Decoded Scoring 6
- Home Challenge Copy 3
- Integration Discovery 6
- Integration Discovery 7
- Integration Discovery 8
- Integration I1 5 Sessions
- Integration Instrument Permissions 2
- Integration Instrument Permissions 3
- Integration Instrument Permissions 4
- Integration Sprint 2

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 87 edges
2. `createClient()` - 82 edges
3. `createSupabaseClient()` - 59 edges
4. `brandPageMetadata()` - 53 edges
5. `getBrand()` - 50 edges
6. `Relatti Relationship Architecture (Polymorphic Coaching Spine)` - 38 edges
7. `resolveBrandClient()` - 31 edges
8. `byBrand()` - 31 edges
9. `Relatti Sprint Plan` - 30 edges
10. `Relatti Experience Spec (Relationship-First)` - 29 edges

## Surprising Connections (you probably didn't know these)
- `prompt-assembler.ts latest-assessment read` --implements--> `Prompt Assembler (11-section prompt assembly)`  [INFERRED]
  directives/ASSESSMENT_PROGRAM_SCOPING.md → directives/ARCHITECTURE.md
- `Coach, not therapist disclaimer (988)` --semantically_similar_to--> `Authoritative Intervention Guardrails (ADR-015)`  [INFERRED] [semantically similar]
  directives/BETA_LAUNCH_COPY.md → directives/ARCHITECTURE.md
- `HEARD naming contract (display vs locked slug 'integration')` --semantically_similar_to--> `assessments.program column`  [INFERRED] [semantically similar]
  directives/BRAND.md → directives/ASSESSMENT_PROGRAM_SCOPING.md
- `brand-metadata.ts metadata helper (mandatory)` --semantically_similar_to--> `Invariant: at most one active assessment per program`  [INFERRED] [semantically similar]
  directives/BRAND.md → directives/ASSESSMENT_PROGRAM_SCOPING.md
- `Dyad spine (syncMyReportToSpine)` --conceptually_related_to--> `Partner invite / both-partners coaching`  [INFERRED]
  directives/ASSESSMENT_PROGRAM_SCOPING.md → directives/BETA_LAUNCH_COPY.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Three-level coaching brain (MICRO/MESO/MACRO)** — directives_architecture_coaching_engine, directives_architecture_meso_session_planner, directives_architecture_macro_arc_strategist, directives_architecture_three_level_brain [EXTRACTED 1.00]
- **Gate-enforced brand rules (npm run gate)** — directives_brand_brand_color_gates, directives_brand_money_maps_ban, directives_brand_negation_pivot_ban, directives_brand_check_brand_metadata_gate [EXTRACTED 1.00]
- **Per-program data isolation spine** — directives_assessment_program_scoping_assessments_program_column, directives_assessment_program_scoping_conversations_program, directives_assessment_program_scoping_adr_p02, directives_assessment_program_scoping_one_active_assessment_invariant [EXTRACTED 1.00]
- **Heron's Six Interventions** — directives_coaching_brain_prescriptive_intervention, directives_coaching_brain_informative_intervention, directives_coaching_brain_confronting_intervention, directives_coaching_brain_cathartic_intervention, directives_coaching_brain_catalytic_intervention, directives_coaching_brain_supportive_intervention [EXTRACTED 1.00]
- **Two-Tier Safety Kernel** — directives_coach_safety_and_testing_spec_tier1_deterministic_hard_stop, directives_coach_safety_and_testing_spec_tier2_async_safety_sweep, directives_coach_safety_and_testing_spec_crisis_flags_schema, directives_coach_safety_and_testing_spec_escalation_audit_only, directives_coach_safety_and_testing_spec_flag_dedup [EXTRACTED 1.00]
- **Decoded Report-to-Coach Funnel** — directives_decoded_report_structure_free_tier_seven_sections, directives_decoded_report_structure_upgrade_gate, directives_decoded_pricing_ladder, directives_decoded_coach_handoff, directives_decoded_report_structure_closing_coach_question [INFERRED 0.85]
- **Integration safety stack (memory filter, crisis patterns, conversation signals, auditor, tripwire, trajectory)** — directives_integration_sprint_memory_filter_ts, directives_integration_sprint_crisis_patterns, directives_integration_sprint_conversation_signals, directives_integration_sprint_output_auditor, directives_integration_sprint_draft_audit, directives_integration_sprint_irreversible_decisions, directives_integration_sprint_trajectory_job [EXTRACTED 1.00]
- **HEARD journey: tell → be met → be placed → then measure** — directives_integration_experience_tell_it_box, directives_integration_experience_witness_turn, directives_integration_experience_the_company, directives_integration_experience_footing_check, directives_integration_experience_the_map [EXTRACTED 1.00]
- **Decoded assessment data pipeline (progress → responses → scores → reports/profiles)** — directives_decoded_schema_assessment_progress, directives_decoded_schema_assessment_responses, directives_decoded_schema_assessment_scores, directives_decoded_schema_assessment_reports, directives_decoded_schema_assessment_profiles [EXTRACTED 1.00]
- **Money vertical spec package (discovery, experience, instrument, GTM, build handoff)** — directives_money_discovery, directives_money_experience, directives_money_traits_instrument, directives_money_viral_gtm, directives_money_build_handoff, directives_money_experience_notes [EXTRACTED 1.00]
- **Five-layer vertical config implemented by PA sprint epics** — directives_platform_architecture_five_layer_model, directives_platform_architecture_host_brand_resolver, directives_platform_architecture_theme_token_layer, directives_platform_architecture_module_registry, directives_platform_architecture_surface_registry, directives_platform_sprint_pa2, directives_platform_sprint_pa3, directives_platform_sprint_pa4 [EXTRACTED 1.00]
- **MoneyTraits items > scoring > archetype > card > reveal** — directives_money_traits_instrument_item_bank_16, directives_money_traits_instrument_scoring_algorithm, directives_money_traits_instrument_twelve_archetypes, directives_money_traits_instrument_archetype_card, directives_money_traits_instrument_reveal_first_message [EXTRACTED 1.00]
- **Relatti polymorphic spine tables** — directives_relationship_architecture_workspace_table, directives_relationship_architecture_program_table, directives_relationship_architecture_engagement_table, directives_relationship_architecture_participant_table, directives_relationship_architecture_accountability_link_table, directives_relationship_architecture_engagement_artifact_table, directives_relationship_architecture_entry_segment_table [EXTRACTED 1.00]
- **Relatti two-tier safety detection & escalation flow** — directives_safety_escalation_protocol_tier1_keyword_hardstop, directives_safety_escalation_protocol_tier2_llm_sweep, directives_safety_escalation_protocol_crisis_flags, directives_safety_escalation_protocol_send_safety_escalation_email, directives_safety_escalation_protocol_log_only_posture [EXTRACTED 1.00]
- **Tenancy hardening T0–T7** — directives_tenancy_audit_t0_tenancy_gate, directives_tenancy_audit_t1_programid_union, directives_tenancy_audit_t2_exhaustive_records, directives_tenancy_audit_t3_check_ternaries, directives_tenancy_audit_t4_brand_for_program, directives_tenancy_audit_t5_kill_surfaceid, directives_tenancy_audit_t6_program_config, directives_tenancy_audit_t7_pc2_2 [EXTRACTED 1.00]
- **Voice-adapted section prompt pipeline** — directives_archive_decoded_narrative_voices_architecture_classifyvoice, directives_archive_decoded_narrative_voices_architecture_resolvemodifiers, directives_archive_decoded_narrative_voices_architecture_assemblevoiceprompt, directives_archive_decoded_narrative_voices_architecture_buildvoicepromptblock, directives_archive_decoded_narrative_voices_architecture_buildsectionprompt, directives_archive_decoded_narrative_voices_architecture_gpt_4o [EXTRACTED 1.00]
- **Four clinical tone modifiers** — directives_archive_decoded_narrative_voices_prd_compassion_boost, directives_archive_decoded_narrative_voices_prd_anxiety_softener, directives_archive_decoded_narrative_voices_prd_emotion_regulation_buffer, directives_archive_decoded_narrative_voices_prd_attachment_sensitivity [EXTRACTED 1.00]
- **Six narrative voices** — directives_archive_decoded_narrative_voices_prd_the_intellectual, directives_archive_decoded_narrative_voices_prd_the_adventurer, directives_archive_decoded_narrative_voices_prd_the_connector, directives_archive_decoded_narrative_voices_prd_the_steward, directives_archive_decoded_narrative_voices_prd_the_challenger, directives_archive_decoded_narrative_voices_prd_the_sensitive [EXTRACTED 1.00]
- **Decoded top-of-funnel flow: assessment -> report -> share/invite -> coach handoff** — directives_archive_decoded_prd_assessment_engine_f01, directives_archive_decoded_prd_report_generator_f02, directives_archive_decoded_prd_compare_invite_f03, directives_archive_decoded_prd_share_card_f06, directives_archive_decoded_prd_coach_handoff_f05 [EXTRACTED 1.00]
- **Mastery Coach differentiators vs ChatGPT: memory, proactivity, style adaptation, framework registry** — directives_archive_discovery_persistent_memory, directives_archive_discovery_proactive_outreach, directives_archive_discovery_communication_style_profile, directives_archive_discovery_coaching_framework_registry, directives_archive_discovery_chatgpt_invisible_competitor [EXTRACTED 1.00]
- **Inputs layered into dynamic prompt assembly** — directives_archive_prd_dynamic_prompt_assembly, directives_archive_prd_semantic_memory_retrieval, directives_archive_prd_framework_selection, directives_archive_prd_authoritative_guardrails, directives_archive_decoded_prd_assessment_profile [INFERRED 0.85]

## Communities (182 total, 34 thin omitted)

### Community 0 - "Accountability Check-in Delivery"
Cohesion: 0.05
Nodes (48): RFC-822, CommitmentSource, CommitmentWithUser, generateCheckinMessage(), GeneratedCheckin, resolveCommitmentSource(), HealthAlert, generateBriefing() (+40 more)

### Community 1 - "Onboarding Flow"
Cohesion: 0.06
Nodes (57): AboutYouStep(), handleBlur(), handleNext(), validate(), ChannelConnectStep(), CheckIcon(), ClipboardIcon(), CoachingLetterStep() (+49 more)

### Community 2 - "Coach Tools & Prompt Layers"
Cohesion: 0.08
Nodes (32): AnthropicTool, FIND_SIMILAR_ACCOUNTS_TOOL, LOOKUP_RELATIONSHIP_TOOL, executivePack, PACKS, buildWitnessTurnLayer(), integrationPack, IntegrationStage (+24 more)

### Community 3 - "Report Archetype Visuals"
Cohesion: 0.07
Nodes (48): AttachmentQuadrant(), AttachmentQuadrantProps, QUADRANT_INFO, BigFiveContext(), TRAIT_EXPLANATIONS, BigFiveRadar(), buildCoachDeepLink(), PartnerPhrasesPointer() (+40 more)

### Community 4 - "Output Auditor & Signals"
Cohesion: 0.06
Nodes (51): AnthropicMessage, AnthropicResponse, AI_CENTRAL, detectConversationSignals(), ELECTION, hits(), SignalCandidate, splitHalves() (+43 more)

### Community 5 - "Corpus Claim Engine"
Cohesion: 0.06
Nodes (52): AccountClaim, AnalysisRow, assertClaimsAreUserText(), assertDistinctFromEngine(), assertNoAuthoredText(), AttributedText, buildResult(), buildTransformation() (+44 more)

### Community 6 - "Landing Pages & Icons"
Cohesion: 0.06
Nodes (29): ResetPasswordPage(), ChallengeLanding(), DAYS, FAQ, ChallengePage(), metadata, PageProps, DecodedLanding() (+21 more)

### Community 7 - "Brand Metadata Layouts"
Cohesion: 0.08
Nodes (24): generateMetadata(), generateMetadata(), generateMetadata(), generateMetadata(), generateMetadata(), generateMetadata(), generateMetadata(), generateMetadata() (+16 more)

### Community 8 - "Settings, Chat & Frameworks"
Cohesion: 0.09
Nodes (36): AdminFrameworksPage(), Framework, GenerateReport(), triggerGeneration(), Props, ChatPage(), ChatPageInner(), DebugPanel (+28 more)

### Community 9 - "Coach Endpoint & Safety Sweep"
Cohesion: 0.08
Nodes (41): checkMessageLimit(), sseEvent(), start(), calculateCost(), checkBatchMessageLimit(), COACHING_DISCLAIMER, CoachResult, embedMessageAsync() (+33 more)

### Community 10 - "Legacy Checkout & PDF"
Cohesion: 0.12
Nodes (33): POST(), GET(), POST(), POST(), sendDeliveryEmail(), extractSnippet(), generateLetter(), generatePreview() (+25 more)

### Community 11 - "Report Voice Config"
Cohesion: 0.12
Nodes (35): ADR-0006, ReportSectionContent, SectionId, ARCHETYPE_VOICE_MAP, COACH_MODIFIER_DELTAS, COACH_PROFILE_SEED, DIMENSION_KEYS, FALLBACK_VOICE (+27 more)

### Community 12 - "Compatibility Report Function"
Cohesion: 0.08
Nodes (33): ARCHETYPE_VOICE_MAP, band(), buildDyadDynamic(), callOpenAI(), compareAxis(), deriveRelationshipStyle(), generateJson(), LlmJsonResult (+25 more)

### Community 13 - "Vertical Landing Pages"
Cohesion: 0.09
Nodes (29): CouplesPage(), metadata, EngagedPage(), metadata, Land2Page(), metadata, HERO_EXCHANGE, MoneyLanding() (+21 more)

### Community 14 - "Admin Users & Coaching Letter"
Cohesion: 0.08
Nodes (23): AdminUser, BRAND_LABELS, BrandFilter, BrandSort, ROLE_CONFIG, UserBrandEntry, UsersPage(), CATEGORY_LABELS (+15 more)

### Community 15 - "Consent & Post-Processor"
Cohesion: 0.08
Nodes (27): ConsentQuery, ConsentReader, hasLiveConsent(), DebugSummary, PipelineTimeline, PostProcessTrace, ProfileSignals, ProfileUpdateResult (+19 more)

### Community 16 - "Platform Brand & Modules"
Cohesion: 0.10
Nodes (27): CostDashboardPage(), DayRow, ModelRow, UserRow, GET(), MARKS, OG_BRANDS, OgPalette (+19 more)

### Community 17 - "Decoded Invite Flow"
Cohesion: 0.13
Nodes (25): POST(), POST(), POST(), InviteLandingProps, GET(), PUBLIC_PATHS, buildClaimPatch(), ClaimPatch (+17 more)

### Community 18 - "Report Prompt Types"
Cohesion: 0.08
Nodes (33): ProtectorCardComponentProps, TraitCardProps, BarChartViz, DataVisualization, NamedPattern, ProtectorCard, QuadrantPlotViz, RadarChartViz (+25 more)

### Community 19 - "Integration Safety Design"
Cohesion: 0.06
Nodes (28): Thirteen banned move classes, Claim-type router (A/B/C/D), The eleven risk controls, Free general-purpose chatbots as the real incumbent, Jung woodcut mechanic — corpus is the product, Memory-write filter (attributed report, never ground truth), Project Profound corpus (6,747 NDE + 7,505 UAP records), integration-pack.ts coach spec (+20 more)

### Community 20 - "Cron Jobs & Data Deletion"
Cohesion: 0.19
Nodes (15): ConversationToSummarize, SummaryResult, Partner, SupabaseClient, USER_DATA_TABLES, synthesizeResearch(), ALLOWED_ORIGINS, corsHeaders (+7 more)

### Community 21 - "Assessment Engine Scoring"
Cohesion: 0.09
Nodes (27): persistRawResponses(), scoreAssessment(), ScoringResult, ASSESS_ONBOARDING, AssessOnboarding, CHILDREN_OPTIONS, ExploreDimension, GENDER_OPTIONS (+19 more)

### Community 22 - "Relationship Data Spine"
Cohesion: 0.11
Nodes (27): accountability_link table, Backfill from decoded_invites, Cutover order (DDL→backfill→dual-write→read path), D1 Keep decoded_invites as transport, D2 Cross-partner context server-side under consent, D3 workspace_id on every new table, D4 Nullable engagement_id for attribution, D5 Subscription attached to engagement (+19 more)

### Community 23 - "Admin APIs & Beta Codes"
Cohesion: 0.11
Nodes (21): ADMIN_ROLES, genCode(), POST(), createServiceClient(), POST(), createServiceClient(), GET(), UserBrandEntry (+13 more)

### Community 24 - "Instruments & Beta Check-in"
Cohesion: 0.07
Nodes (29): ATTRIBUTION_OPTIONS, BetaCheckinPage(), IMPROVED_OPTIONS, ACE3, ADAPTIVE_TRIGGERS, AdaptiveTrigger, ADDON_INSTRUMENTS, ASRS (+21 more)

### Community 25 - "Legal Pages"
Cohesion: 0.22
Nodes (19): HeardUnpublished(), MasteryDisclaimer(), MasteryTerms(), MoneyDisclaimer(), MoneyTerms(), RelattiDisclaimer(), RelattiPrivacy(), RelattiTerms() (+11 more)

### Community 26 - "Login & Dashboard Shell"
Cohesion: 0.11
Nodes (15): LegalLayout(), COPY, LoginPanel(), CATEGORIES, FeedbackWidgetProps, getNavItems(), Sidebar(), SidebarProps (+7 more)

### Community 27 - "Money Maps Scoring"
Cohesion: 0.11
Nodes (26): MONEY_LEAP_FACET_INDICES, MONEY_MAP_ITEM_INDICES, MONEY_MAPS, GenerateReportResult, REPORT_KIND, ReportKind, writeMoneyMapReport(), ARCHETYPE_BY_NAME (+18 more)

### Community 28 - "Platform Architecture ADRs"
Cohesion: 0.09
Nodes (24): npm run gate chain, Coaching Platform Architecture (Multi-Vertical Frontend + Identity), Five-layer vertical model (workspace, program, surface, modules, theme), Host-to-brand resolver (resolveBrand / x-brand), Module registry (config-gated capabilities), Surface registry (pluggable primary screens), Token-based theming (white-label mechanism), Vertical capability matrix (+16 more)

### Community 29 - "Beta Cockpit Funnel"
Cohesion: 0.12
Nodes (23): BetaCockpit(), BetaCodesPanel(), CheckinsPanel(), MetricCard(), MetricCardProps, relativeTime(), shortDate(), StageDots() (+15 more)

### Community 30 - "Beta Survey & Feedback"
Cohesion: 0.13
Nodes (24): CATEGORIES, Category, POST(), ATTRIBUTIONS, GET(), IMPROVED, POST(), POST() (+16 more)

### Community 31 - "Admin Nav & Webhooks"
Cohesion: 0.08
Nodes (9): AdminNav(), AdminNavProps, AdminLayout(), metadata, dynamic, runtime, BackfillV2Content(), BackfillV2Page() (+1 more)

### Community 32 - "Crisis Detection"
Cohesion: 0.11
Nodes (24): buildAbuseResponse(), buildCrisisResponse(), buildMedicationResponse(), confirmAbuseWithLLM(), confirmCrisisWithLLM(), confirmIntegrationRiskWithLLM(), CrisisFlagContext, hasRecentFlag() (+16 more)

### Community 33 - "Assessment Profile Builder"
Cohesion: 0.13
Nodes (24): AssessmentProfile, buildArchetype(), buildAssessmentProfile(), buildAttachment(), buildBigFive(), buildDERS(), buildMotivation(), buildScreeningFlags() (+16 more)

### Community 34 - "Scoring Engine Norms"
Cohesion: 0.20
Nodes (25): checkResponseValidity(), IPIP50_NORMS, meanItems(), rawToPercentile(), reverse(), scoreACE3(), scoreAllInstruments(), scoreASRS() (+17 more)

### Community 35 - "Decoded Report Generator"
Cohesion: 0.10
Nodes (26): ARCHETYPE_CENTROIDS, ARCHETYPE_VOICE_MAP, ArchetypeCentroid, ArchetypeClassification, buildFullVoiceBlock(), buildKeyInsights(), calculateReportCost(), deriveCoachingPrioritiesForHandoff() (+18 more)

### Community 36 - "Money Vertical Specs"
Cohesion: 0.11
Nodes (21): Money Vertical Build Handoff, money-pack.ts Coach Pack, Pinned founder decisions (Decision Room spine, domain, money Stage 2), §5.10 verification sweep, FTC line: no wealth-outcome promises, SEC line: securities-refusal guardrail (ABCS test), Money Coach Experience Discovery (Phase 0.5), Quiz-first + clickable answer chips + free text (+13 more)

### Community 37 - "HEARD Dictation"
Cohesion: 0.13
Nodes (17): Dictate(), recognitionCtor(), SpeechRecognitionAlternativeLike, SpeechRecognitionCtor, SpeechRecognitionEventLike, SpeechRecognitionLike, SpeechRecognitionResultLike, Window (+9 more)

### Community 38 - "Stripe Billing Plans"
Cohesion: 0.12
Nodes (20): PRICES, planForSubscriptionEvent(), PriceCatalog, resolveTier(), SubscriptionAction, Tier, createCheckoutSession(), createPortalSession() (+12 more)

### Community 39 - "Decoded Features & Competitor"
Cohesion: 0.09
Nodes (25): Data visualization layer, Deep Personality (competitor), Deep Personality Competitive Report (Tom Wood), Inner System (IFS protectors/exiles), Deep Personality instrument list, Locked sections (SWLS, BRS, DERS-16, relationship satisfaction), Deep Personality upgrade gate (Individual/Compatibility/Lifetime), Decoded Compatibility Report (+17 more)

### Community 40 - "Relatti Experience Research"
Cohesion: 0.11
Nodes (23): Shared ritual / streak, E8 Shared ritual / streak, State AI-therapy laws (IL WOPR, NV AB406, UT SB226), Amanda GPT-4o relationship chatbot RCT (PMC12798473), Attachment styles: Anchored, Devoted, Independent, Guarded Heart, buildRelationshipCoachPersona, buildRelationshipGuardrails, Compatibility surface (name kept) (+15 more)

### Community 41 - "Tenancy Audit & Playbook"
Cohesion: 0.11
Nodes (22): assessment_profiles upsert missing unique index bug, Tenancy Audit (brand-3 audit), 5-layer model reality check, 38 silent-wrong program/brand ternaries, T0 tenancy gate (check:tenancy), T1 ProgramId union, T2 program maps → exhaustive Records, T3 check:ternaries gate (+14 more)

### Community 42 - "Coach Architecture Audit"
Cohesion: 0.10
Nodes (18): Coach Architecture Audit — Modularity for Multiple Domains, crisis-detection.ts keyword detector, 11-Layer Brain prompt-assembler.ts, scripts/coach-lab/exec-battery.mjs, Migration Path Phases 0–5, PC3 Executive Stance Parity (shipped 2026-07-13), Domain-Agnostic Shared Kernel, Spine-Based Domain Resolution (engagement.kind) (+10 more)

### Community 43 - "Money Report UI"
Cohesion: 0.15
Nodes (19): fillPct(), Headline(), MAP_META, MAP_ORDER, MoneyReport(), Pending(), Prose(), SectionLabel() (+11 more)

### Community 44 - "Chat Window"
Cohesion: 0.16
Nodes (20): ChatWindow(), ChatWindowProps, CoachAvatar(), EMPTY_STATE, EmptyState(), FREE_TIER_DAILY_LIMIT, hoursUntilReset(), LimitNotice() (+12 more)

### Community 45 - "Compatibility Report Viewer"
Cohesion: 0.12
Nodes (17): buildCoachDeepLink(), CompatDimension, CompatibilityReportViewer(), handleRegenerate(), CompatReport, ContextInsights, CouplesReport(), CouplesReportData (+9 more)

### Community 46 - "Guardrails & Heron Interventions"
Cohesion: 0.09
Nodes (22): Relationship Guardrail Overlay, Scenario Battery (stance/safety/boundary/control), Catalytic Intervention, Cathartic Intervention, Confronting Intervention, Heron's Six Category Intervention Framework (1975), Informative Intervention, Prescriptive Intervention (+14 more)

### Community 47 - "Beta Offer & Check-in Fields"
Cohesion: 0.17
Nodes (16): BetaOffer(), CodeStatus, BetaPage(), metadata, PageProps, BetaUnlockPage(), SurveyState, active (+8 more)

### Community 48 - "Compatibility Hub & Sharing"
Cohesion: 0.10
Nodes (13): CompatibilityHubDecoded(), Props, ReceivedInvite, SentInvite, SHARE_OPTIONS, ShareLevel, StatusBadge(), statusConfig (+5 more)

### Community 49 - "Money Report Function"
Cohesion: 0.13
Nodes (21): buildGroundTruth(), buildSystemPrompt(), buildUserPrompt(), callOpenAINarrative(), cleanStr(), CORE_ORDER, CoreMap, describeGap() (+13 more)

### Community 50 - "Narrative Voices Research"
Cohesion: 0.10
Nodes (20): Decoded Narrative Voices Discovery, Therapeutic Feedback Adaptation for Anxious Attachment, ARC Personality Prototypes (Asendorpf, Robins, Caspi), Big Five Communication Preference Correlations, Self-Compassion as Moderator of Neuroticism-Feedback Reception, Anxiety Softener, Attachment Sensitivity, Compassion Boost (+12 more)

### Community 51 - "Invite Consent APIs"
Cohesion: 0.17
Nodes (13): POST(), POST(), ShareLevel, VALID_LEVELS, POST(), LEVEL_RANK, minLevel(), POST() (+5 more)

### Community 52 - "Score Transformer"
Cohesion: 0.27
Nodes (21): buildBaseData(), computeDecodedScore(), getInterpretation(), getPercentiles(), getScore(), getSubscales(), getTotal(), SECTION_TRANSFORMERS (+13 more)

### Community 53 - "Narrative Voices ADRs"
Cohesion: 0.17
Nodes (17): Decoded Narrative Voices Architecture, ARCHETYPE_VOICE_MAP, assessment_report_versions table, decoded-rewrite-voice Edge Function, ReportVersionRow, ToneModifier, ToneModifierTrigger, trigger-path-validation.test.ts (+9 more)

### Community 54 - "Decoded PRD Features"
Cohesion: 0.17
Nodes (19): AI Compatibility Report, Decoded Archetype System (16 base types + AI sub-label), Assessment Engine (F01), assessment_profile JSON, Coach Handoff (F05), Compare / Profile Invite (F03) Viral Engine, Core Layer Battery (IPIP-50, RIASEC, ECR-R, SWLS, SCS-SF, DERS-16, WEIMS, Flourishing, Wellness Check), Decoded Product (You, decoded.) (+11 more)

### Community 55 - "ORIENT Briefing & Scoring Keys"
Cohesion: 0.11
Nodes (18): Decoded Scoring Keys, Highest-risk hand-check seams (gates can't see), Step zero: add money slug to both ProgramId unions, ORIENT Start Here Briefing, Edge functions can't import src/ (lockstep duplication), Brand seam hoisted into boolean evades check:ternaries, layout.tsx inline head script template-literal gotcha, messages.metadata clobbered by post-processor (+10 more)

### Community 56 - "Dashboard Home"
Cohesion: 0.13
Nodes (14): DashboardHome(), getGreeting(), InviteStatusBadge(), Props, ReceivedInvite, SentInvite, InviteConsentBanner(), InviteConsentBannerProps (+6 more)

### Community 57 - "Score Dashboard Charts"
Cohesion: 0.11
Nodes (17): BigFiveRadarProps, DEFAULT_LABELS, RelationshipStyleCard(), RelationshipStyleCardProps, SOCIAL_PLATFORMS, cardVariants, EASE_OUT, RIASEC_INFO (+9 more)

### Community 58 - "Report Section Templates"
Cohesion: 0.11
Nodes (15): buildSectionPrompt(), REPORT_PROMPTS, RS01, RS02, RS03, RS04, RS05, RS06 (+7 more)

### Community 59 - "Report Safety & Voice Pipeline"
Cohesion: 0.17
Nodes (18): buildSectionPromptWithVoice(), getAllSectionIds(), buildVoiceSafetyInput(), CRISIS_RESOURCES, evaluateSafetyFlags(), REPORT_DISCLAIMER, SafetyFlags, VoiceSafetyInput (+10 more)

### Community 60 - "Coach App PRD Frameworks"
Cohesion: 0.17
Nodes (19): Coaching Framework Registry (4 tiers), Tier 4 Deep Psychology (Trust-Gated), AI Tool Recommendations & Discovery, Prescriptive & Informative Guardrails (COACHING_GUARDRAILS.md), Background Research Onboarding (website/LinkedIn scraping), BYOK (Bring Your Own Key), Personalized Coaching Letter, Crisis Detection & Response (+11 more)

### Community 61 - "Decoded DB Schema"
Cohesion: 0.11
Nodes (17): assessment_profiles table (coaching summary, coach_opener), assessment_progress table (per-question JSONB persistence), assessment_reports table (RS-ID keyed sections, archetype), assessment_responses table, assessment_scores table, assessments table, pg_cron jobs (abandonment check, orphan cleanup), ACE-3 add-on (safety gateway) (+9 more)

### Community 62 - "Decoded Nav & Voice Selector"
Cohesion: 0.11
Nodes (12): DecodedNav(), DecodedNavProps, RewriteStatus, VOICE_OPTIONS, VoiceId, VoiceOption, VoiceSelector(), VoiceSelectorProps (+4 more)

### Community 63 - "Decoded Billing Tiers"
Cohesion: 0.16
Nodes (12): POST(), UpgradeModal(), UpgradeModalProps, RateLimitResult, DECODED_TIERS, DecodedTierInfo, getStripePriceId(), HEARD_MESSAGE_LIMITS (+4 more)

### Community 64 - "Assess Page"
Cohesion: 0.17
Nodes (14): AssessPage(), generateMetadata(), AssessmentEngine(), completeAssessment(), getScaleRange(), handleAnswer(), handleBack(), handleKeyDown() (+6 more)

### Community 65 - "Arc Strategist & Planner Crons"
Cohesion: 0.18
Nodes (15): assessArcAndGenerateReview(), ChallengeRecord, determineArcPhase(), getNextMonday(), planWeeklySession(), brandForProgram(), getCorsHeaders(), integrationEngineEnabled() (+7 more)

### Community 66 - "Anthropic Client"
Cohesion: 0.16
Nodes (17): buildSystemParam(), callClaude(), callClaudeDirectly(), callClaudeStreaming(), callClaudeStreamingDirectly(), CostContext, extractText(), maybeLogCost() (+9 more)

### Community 67 - "Dyad Context & Money Profile"
Cohesion: 0.15
Nodes (18): band(), buildDyadCoachLayer(), buildMediatorPersona(), deriveRelationshipStyle(), DyadContext, loadRelationshipStyle(), RelationshipStyle, renderCompatibilityDigest() (+10 more)

### Community 68 - "Brand Guide Rules"
Cohesion: 0.14
Nodes (12): Banned copy constructions (em dashes, AI vocabulary, triads), Brand color gates (check:colors, check:brand-tokens), brand-metadata.ts metadata helper (mandatory), check-brand-metadata.mjs gate, Color System (surface hierarchy, primary blues, accents), Mastery Coach — Brand Guide & Design System, Glass & Gradient Rule, copywriter + humanizer skills (+4 more)

### Community 69 - "Coaching Brain Layers"
Cohesion: 0.14
Nodes (17): CATEGORY_FRAMEWORK_MAP, Domain-Blind post-processor.ts, framework_config table (executive-only library), Coaching Brain — Decision Architecture Map, Co-Active Coaching Model (CTI), Coaching Arc Phases (Orientation, Working, Depth, Integration), Framework Lifecycle (Trigger→Selection→Active→Evolve/Resolve), GROW Model (+9 more)

### Community 70 - "Money Discovery"
Cohesion: 0.15
Nodes (14): Money Coach Phase 0 Discovery & Viability Report, CFPB Financial Well-Being Scale, Appendix A chat-first zero-friction research, Cleo (AI money coach, ~$300M ARR), Couples-money reuses live dyad machinery, Money-psychology coach wedge (Part II), /unblock and /edge sub-segments, Money Edge Viral Product Architecture & GTM (+6 more)

### Community 71 - "Relationship Prd"
Cohesion: 0.12
Nodes (17): Consent layer, Relatti PRD (Relationship Coaching Stage 1), Dual-seat billing ($199/couple/yr), Dyad-aware coach, Target segments & entry funnels (/couples, /engaged...), Fight De-Escalator, Gate 1 (PRD approval), Grand-slam offer: Feel closer in 30 days or it's free (+9 more)

### Community 72 - "Templates V2"
Cohesion: 0.14
Nodes (16): maxDuration, POST(), buildV2SectionPromptWithVoice(), getV2SectionIds(), S1, S2, S3, S4 (+8 more)

### Community 73 - "Science Page"
Cohesion: 0.18
Nodes (16): HeardDoorPage(), metadata, RelattiScience(), RelattiWhyAI(), generateMetadata(), generateMetadata(), generateMetadata(), PageProps (+8 more)

### Community 74 - "Classifier"
Cohesion: 0.20
Nodes (13): ARCHETYPE_CENTROIDS, classifyArchetype(), classifyFromZScores(), computeZScores(), euclideanDistance(), getArchetypeCentroid(), IPIP50_NORMS, ARCHETYPE_NAMES (+5 more)

### Community 75 - "Decoded Narrative Voices Prd"
Cohesion: 0.16
Nodes (16): ModifierId / MODIFIER_IDS, SectionVoiceOverride, TEST_PROFILES (24 synthetic profiles), voice_feedback table, Decoded Narrative Voices PRD, NV04 Section-Level Voice Overrides, NV06 Voice Rewrite Feature, NV07 Test Profile System (+8 more)

### Community 76 - "Decoded"
Cohesion: 0.14
Nodes (15): Decoded — Phase 0 Discovery, Compare / Profile Invite (F03) viral loop, Deep Personality (competitor), Design Mandate: No AI-Aesthetic (BRAND.md §14), 8-Email Onboarding Sequence (Resend + pg_cron), Decoded Pricing Ladder (Free/$29 Insight/$69 Growth/Mastery $349), Decoded QA Checklist, AI Narrative Sections Tests (+7 more)

### Community 77 - "Relationship Sprint"
Cohesion: 0.18
Nodes (18): is_engagement_participant(), Prompt-assembler Layer 4.6 Shared Relationship Profiles, Baseline migration 20260616000000_baseline_pre_relatti, scripts/coach-lab/run.mjs prompt lab, Sprint 1 critical path E1→E2→E3→E4, Relatti Sprint Plan, dyad-context.ts (resolveDyadContext, buildDyadCoachLayer, buildMediatorPersona), E1 Spine DDL + RLS (+10 more)

### Community 78 - "Privacy Terms Liability Plan"
Cohesion: 0.15
Nodes (16): Relatti LLM Data Handling (E15.2), Anthropic default no-training + 30-day retention, DPA signing + subprocessor list, OpenAI NYT litigation preservation order, OpenAI API default no-training + 30-day retention, RelattiPrivacy.tsx §4 E15.2 gate, Zero Data Retention (ZDR), Relatti Privacy, Terms & Liability Plan (+8 more)

### Community 79 - "Compatibilityhub"
Cohesion: 0.16
Nodes (11): CompatibilityHub(), isConnected(), PartnerRow, PartnerState, Props, ReceivedInvite, SentInvite, StatusLine() (+3 more)

### Community 80 - "Ritualcard"
Cohesion: 0.23
Nodes (15): AnswerForm(), CadenceToggle(), coachLink(), DEPTH_LABEL, RestingPanel(), RevealPanel(), RitualCard(), changeCadence() (+7 more)

### Community 81 - "Types"
Cohesion: 0.21
Nodes (16): ACE3Score, ASRSScore, CSI4Score, DERS16Score, ECRRShortScore, FlourishingScore, GAD7Score, InstrumentScore (+8 more)

### Community 82 - "Discovery"
Cohesion: 0.18
Nodes (11): ChatGPT/Claude/Gemini as Invisible Competitor, MasteryTV Coach App Discovery (Phase 0, Superseded), 18-Month Roadmap to $100k MRR, Persistent Semantic Memory (pgvector), Proactive Coaching Outreach, Scaling CEO Persona, Solo Founder Persona, Commitment Extraction & Accountability Engine (+3 more)

### Community 83 - "Safety Escalation Protocol"
Cohesion: 0.19
Nodes (15): Safety extension: abuse/coercive-control screening, admin_audit_log table, delete-user-data edge function (v8), E15 Trust, Privacy & Legal Launch-Readiness, LEGAL_VERSION acceptance-gated signup, Child-safety / third-party review pathway, crisis_flags table + admin crisis queue, Relatti Safety & Escalation Protocol (+7 more)

### Community 84 - "Theme Provider"
Cohesion: 0.19
Nodes (11): metadata, applyTheme(), getSystemTheme(), ResolvedTheme, resolveTheme(), Theme, ThemeContext, ThemeContextValue (+3 more)

### Community 85 - "Partner Need To Hear"
Cohesion: 0.26
Nodes (13): generateMetadata(), PageProps, ReportPage(), verifySharedAccess(), AdminClient, getDisplayName(), fireMoneyNarrative(), extractNeedToHear() (+5 more)

### Community 86 - "Telegram"
Cohesion: 0.23
Nodes (13): botUrl(), formatCoachResponseForTelegram(), parseStartCommand(), sendChatAction(), sendMessage(), SendMessageParams, setWebhook(), stripHtmlTags() (+5 more)

### Community 87 - "Decoded Narrative Voices Architecture"
Cohesion: 0.18
Nodes (13): assembleVoicePrompt() voice prompt assembler, buildSectionPrompt() (modified), buildVoicePromptBlock(), DECODED_TONE_GUIDE split (ROLE_PREAMBLE / DEFAULT_VOICE_SECTION / RULES_AND_FORMAT), GPT-4o Report Generation, mergeDimensions(), Score Transformer, NV05 Prompt Assembly Pipeline (+5 more)

### Community 88 - "Assessment Program Scoping"
Cohesion: 0.17
Nodes (10): ADR-P02 per-domain data isolation, assessments.program column, conversations.program (migration 20260715120000), PC2.1 — Program-scoping the assessment spine, Dyad spine (syncMyReportToSpine), isRelationshipReport heuristic, PLATFORM_SPRINT.md Track P, prompt-assembler.ts latest-assessment read (+2 more)

### Community 89 - "Decoded Card Design Spec"
Cohesion: 0.18
Nodes (14): Decoded Archetype Classification System, Archetype Centroid Definitions, Archetype Classification Algorithm (z-score + Euclidean centroid distance), 16 Base Archetypes, GPT-4o Sub-Label Prompt Template, Decoded Archetype Share Card Design Spec, Card File Naming /public/decoded/cards/{archetype}/{style}.png, 4 Illustration Styles (Animal, Object, Male, Female) (+6 more)

### Community 90 - "Decoded 2"
Cohesion: 0.17
Nodes (15): Assessment Layers (Core, Adaptive, Depth), CAT-Q instrument, CSI-4 instrument, DERS-16 instrument, ECR-R instrument, GAD-7 instrument, Instrument License Research (Gate 0 blocker), IPIP-50 instrument (+7 more)

### Community 91 - "Moneydashboard"
Cohesion: 0.26
Nodes (12): EXAMPLE_DECISIONS, MoneyDashboard(), handleCreate(), handleReopen(), handleSaveRecord(), shortDate(), createDecision(), listMyDecisions() (+4 more)

### Community 92 - "Debug Tabs"
Cohesion: 0.33
Nodes (13): DebugPanel(), DebugPanelProps, TabId, TABS, Badge(), BrainStateTab(), CoachProfileTab(), KV() (+5 more)

### Community 93 - "Strategy"
Cohesion: 0.20
Nodes (13): Decoded conflict resolution (DECODED_PRD wins), Decoded Document Map, Decoded document registry, Archived Directives README, Pre-detour B2C direction (superseded 2026-06-16), 110-item assessment is a conversion tax, Career Transition Coaching (deferred), Coaching platform pivot (Relationship→Money→Career→White-Label) (+5 more)

### Community 94 - "Decoded Narrative Voices Architecture 2"
Cohesion: 0.24
Nodes (14): evaluateTrigger(), generate.ts voice_profile integration, resolveModifiers() modifier resolver, Safety Layer (safety.ts), SafetyFlags.forceModifiers, Scoring Engine (InstrumentScore[]), StoredVoiceProfile, assessment_reports.voice_profile JSONB (+6 more)

### Community 95 - "Invite Program Design"
Cohesion: 0.20
Nodes (11): PC2.1h Invite Belongs to a Program, decoded_invites.program column, Dual-brand broadcast invite corruption bug, getOrCreateBroadcastInviteUrl, Invite program backfill (report > signup_brand > general), Invite read sites scoped by invite program (§6.4), Unique index (inviter_id, recipient_email, program), relatti_sync_invite invariant-4 guard (+3 more)

### Community 96 - "Integration Consent"
Cohesion: 0.24
Nodes (9): GET(), POST(), ConsentGateProps, buildConsentRow(), ConsentDisclosure, INTEGRATION_AGE_ATTESTATION, INTEGRATION_CONSENT_VERSION, INTEGRATION_DISCLOSURES (+1 more)

### Community 97 - "Dashboard Dyad"
Cohesion: 0.26
Nodes (9): Props, ConsentControl(), InfoRow(), DepartedRelationshipNotice(), DashboardDyad, DyadConsent, DyadStreak, Relationship (+1 more)

### Community 98 - "Decodednoir2Landing"
Cohesion: 0.16
Nodes (5): COLD_CASES, DecodedNoir2Landing(), STAGES, DecodedNoir2Page(), metadata

### Community 99 - "Ai Crawlers"
Cohesion: 0.21
Nodes (10): DISALLOW, GET(), isProductionHost(), AI_CRAWLERS, isAiCrawler(), ROBOTS_ONLY, UA_TOKENS, BRAND_ORIGINS (+2 more)

### Community 100 - "Relationships"
Cohesion: 0.22
Nodes (12): ASSESSMENT_COPY, AssessmentIcon(), PersonRow(), RelationshipCard(), relativeDay(), getDyadStreak(), AssessmentStatus, emailName() (+4 more)

### Community 101 - "Architecture"
Cohesion: 0.18
Nodes (9): AI Tool Discovery & Recommendation Engine, Background Research Pipeline (Firecrawl + LinkdAPI), Channel-Agnostic Message Router, CoachMessage unified message format, cost_tracking table, CRM Contacts-First Model (Appendix A), Architecture Document — Mastery Coach App, Onboarding Pipeline (XState, ADR-007) (+1 more)

### Community 102 - "Proactive Content Plan"
Cohesion: 0.19
Nodes (10): PC4.6 Pack-authored proactive briefings, Proactive Content Plan, cron-arc-strategist, cron-session-planner, 2026-07-20 mis-branded weekly-session incident, PackBriefing, PackSession interface, Per-vertical session content contracts (+2 more)

### Community 103 - "Landing"
Cohesion: 0.18
Nodes (9): FEATURES, HOW_IT_WORKS, LandingPage(), PRIVACY_FEATURES, STORIES, TESTIMONIALS, HomePage(), jsonLd (+1 more)

### Community 104 - "Legacyform"
Cohesion: 0.19
Nodes (9): LegacyPage(), metadata, FormData, FormState, LegacyForm(), canProceed(), handleNext(), QUESTIONS (+1 more)

### Community 105 - "Modifier Resolver"
Cohesion: 0.27
Nodes (10): TONE_MODIFIERS, evaluateCompound(), evaluateInterpretationMatch(), evaluateScoreThreshold(), evaluateTrigger(), extractScoreValue(), forceModifier(), resolveModifiers() (+2 more)

### Community 106 - "Beta Launch Copy"
Cohesion: 0.21
Nodes (12): Hybrid Crisis Detection (keyword + LLM, ADR-010), INVITE_PROGRAM_DESIGN.md, PC2.1h Invite surfaces (deferred), RELATIONSHIP_BATTERY (IPIP50, ECR_R_SHORT, CSI4), Before/after check-in loop (paired CSI-4), Coach, not therapist disclaimer (988), Relatti Beta — Launch Copy & Runbook, Beta invite-code gate (/admin/beta) (+4 more)

### Community 107 - "Sprint"
Cohesion: 0.21
Nodes (10): Dating Profile Generator (F09), Sprint Risk Register, Sprint Plan — Mastery Coach App + Decoded (Superseded), Sprint 0.6 — Email Infrastructure & Onboarding Sequence, Sprint 0.7 — Dating Profile Generator (Deferred), Sprint 2 — Coaching Engine & Web Chat, Sprint 6 — Dashboard, Admin & Polish, Sprint 7 — Cost Management & DevOps (+2 more)

### Community 108 - "Money Experience Notes"
Cohesion: 0.18
Nodes (9): Klontz Money Script Inventory (KMSI-R), Money Coach Experience-Design Notes, Fable 5 response as golden coach fixture, Founder KMSI-R x 3-LLM UX dry-run transcript, Just-in-time instruments, Six differentiators from a chatbot with a test, Reveal Ladder (Hook > Map > one question > story > fork > Money OS), 'Did that feel true?' beta signal (+1 more)

### Community 109 - "Send Email Index"
Cohesion: 0.18
Nodes (6): ActionCopy, brandForHost(), brandForRequest(), BRANDS, EmailBrand, HookPayload

### Community 110 - "Claim Invites"
Cohesion: 0.35
Nodes (9): DashboardPage(), RelattiDashboard(), claimInviteById(), claimPendingInvites(), serviceClient(), getOrCreateBroadcastInviteUrl(), getDyadConsent(), serviceClient() (+1 more)

### Community 111 - "Decodedmarketinglanding"
Cohesion: 0.20
Nodes (9): DecodedMarketingLanding(), HOW_IT_WORKS, PRICING_TIERS, PROBLEMS, REPORT_SECTIONS, TRUST_STATS, VALUE_PROPS, DecodedLandingPage() (+1 more)

### Community 112 - "Decodednoirlanding"
Cohesion: 0.20
Nodes (9): DecodedNoirLanding(), HOW_IT_WORKS, PRICING_TIERS, PROBLEMS, REPORT_SECTIONS, TRUST_STATS, VALUE_PROPS, LandingNoirPage() (+1 more)

### Community 113 - "Archetypecard"
Cohesion: 0.21
Nodes (11): ALL_STYLES, ArchetypeCard(), ArchetypeCardProps, CardStyle, DOWNLOAD_FORMATS, DownloadFormat, isEmail(), normalizeSlug() (+3 more)

### Community 114 - "Partner Need To Hear.Test"
Cohesion: 0.18
Nodes (9): happyPath(), makeBuilder(), builder, MY_PHRASES, Recorded, recorded, s5(), tableData (+1 more)

### Community 115 - "Architecture 2"
Cohesion: 0.20
Nodes (8): coaching_agenda table, Coaching Arc Phases (Orientation/Working/Depth/Integration), fact_cache table, Factual Grounding Service / search_facts tool (Perplexity Sonar), MACRO Arc Strategist (monthly), MESO Session Planner (weekly), Prompt Assembler (11-section prompt assembly), scheduled_messages table

### Community 116 - "Settings Page"
Cohesion: 0.18
Nodes (10): CHANNELS, CoachProfile, DELIVERY_DIMENSIONS, DIMENSION_CONFIG, INTERVENTION_DIMENSIONS, SettingsPage(), TIER_ORDER, TIMEZONES (+2 more)

### Community 117 - "Consent Machine"
Cohesion: 0.24
Nodes (8): CONSENT_LEVELS, CONSENT_RANK, ConsentAction, ConsentInput, ConsentLevel, ConsentResult, isLevel(), reduceConsent()

### Community 118 - "Database"
Cohesion: 0.18
Nodes (10): CoachProfileRow, CommitmentRow, ContactListRow, ContactRow, FrameworkConfigRow, Json, MemoryFactRow, MessageRow (+2 more)

### Community 119 - "Architecture 3"
Cohesion: 0.22
Nodes (8): POST /functions/v1/coach, coach_profiles table (8-dimension style), coaching_challenges table, Coaching Engine (MICRO, per-message), Delivery Style Layer (6 dimensions), framework_config table, Framework Layer (per-challenge), Intervention Layer (Heron's 6 Categories)

### Community 120 - "Marketing"
Cohesion: 0.29
Nodes (10): 8-Dimension Communication Style Profile, The Communication Style Differentiator (8 dimensions), Content Marketing Angles, Email Subject Lines, Feature Comparison Table (Generic AI vs Human vs Mastery Coach), Landing Page Hero Options A-D, Mastery Coach Marketing Copy Bank (Superseded), The Memory Differentiator (+2 more)

### Community 121 - "Money Traits Rename"
Cohesion: 0.24
Nodes (9): Report-first correct-course (money-generate-report narrative), MoneyMaps to MoneyTraits Rename, Edge CORS new origins (_shared/cors.ts), money-generate-report edge function, MoneyTraits brand on moneytraits.com, Rename acceptance gate (rg zero 'Money Maps'), Rename execution plan P1-P8, 'The Money Tell' landing at /tell (+1 more)

### Community 122 - "Integration Page"
Cohesion: 0.22
Nodes (9): Claim, ClaimMatch, DomainDirection, IntegrationBenchPage(), findCompany(), Reveal, RevealAccount, Stat() (+1 more)

### Community 124 - "Decoded Report Structure"
Cohesion: 0.28
Nodes (6): RS03 Report Section Integration, Decoded Report Structure Design, Free Tier: 7 Sections (RS01–RS07), Report Tone Guide, [RS03] Your Decoded Archetype, [RS07] Your Inner System

### Community 125 - "Card Route"
Cohesion: 0.31
Nodes (7): GET(), getNameStyle(), loadFonts(), runtime, sanitize(), VALID_ARCHETYPES, VALID_STYLES

### Community 126 - "Blueprintview"
Cohesion: 0.28
Nodes (7): BlueprintView(), Dimension, DYNAMICS, Lens, Report, BlueprintPage(), metadata

### Community 127 - "Architecture 4"
Cohesion: 0.29
Nodes (8): Anti-Nagging Protocol (3-strike per topic), Entity Extractor (GPT-4o, async), 4-Tier Memory System, memory_facts table, nagging_tracker table, Post-Processor (GPT-4o-mini), Proactive Outreach System, user_entities table (structured knowledge graph)

### Community 128 - "Decoded Narrative Voices Sprint"
Cohesion: 0.32
Nodes (8): CoachDimension, CoachModifierDelta, CoachProfileSeed, Coach Integration Contracts (NVR34-NVR36), Epic 1: Voice Classification System, S03 Voice Classifier, S04 Voice Classifier Tests, S05 Public API Exports

### Community 129 - "Preview Page"
Cohesion: 0.36
Nodes (4): PreviewContent(), PreviewPage(), PricingCards(), PricingCardsProps

### Community 130 - "Ritual"
Cohesion: 0.36
Nodes (7): getTodaysRitual(), isUnlocked(), RevealResult, RitualPrompt, RitualState, unlockLabel(), utcDate()

### Community 131 - "Coaching Brain"
Cohesion: 0.33
Nodes (6): profile-updater.ts / coach_profiles adaptive profile, Coach-Profile Canonical 0–10 Scale Fix, 6 Delivery Modulations (Directness, Framing, Warmth, Pacing, Evidence Style, Accountability), Layer 3: Delivery Style (Per-User), 8 Coach Profile Dimensions, Intervention Biases (Autonomy, Challenge Level)

### Community 132 - "Crisis Page"
Cohesion: 0.33
Nodes (6): AdminCrisisPage(), BRAND_TAB_LABELS, brandOfFlag(), BrandTab, CrisisFlag, FilterTab

### Community 133 - "Voice Config"
Cohesion: 0.38
Nodes (5): POST(), COACH_VOICE_OPTIONS, CoachVoiceOption, VOICE_IDS, VOICE_TO_COACH_DIMENSIONS

### Community 134 - "[Code] Page"
Cohesion: 0.43
Nodes (5): InviteLanding(), generateMetadata(), InvitePage(), normalizeSlug(), PageProps

### Community 135 - "Moneymapsradar"
Cohesion: 0.48
Nodes (6): AXES, diamondPath(), LABEL_POS, MoneyMapsRadar(), point(), radius()

### Community 136 - "Decoded Narrative Voices Architecture 3"
Cohesion: 0.40
Nodes (5): Archetype Classifier, classifyVoice() voice classifier, FALLBACK_VOICE (connector), NV01 Voice Classification Engine, The Connector

### Community 137 - "Home Challenge Copy"
Cohesion: 0.33
Nodes (5): Belief block (manifesto), entry_segment funnels-as-data, RelattiLanding.tsx / ChallengeLanding.tsx, Lens layer (Near-death, Contact, Substance, Practice, Frightening encounter, Framework collapse, Bereavement), Population doors (/after, /nobody-believes-me, /they-came-back, ...)

### Community 138 - "Money Traits Instrument"
Cohesion: 0.33
Nodes (6): DRIVE trait, Five dimensions: GUARD, DRIVE, MIRROR, SHADOW + THE LEAP, GUARD trait, MIRROR trait, SHADOW trait, THE LEAP / the Fear (signature dimension)

### Community 139 - "Privacy Page"
Cohesion: 0.53
Nodes (4): MasteryPrivacy(), MoneyPrivacy(), PageProps, PrivacyPage()

### Community 140 - "Home Challenge Copy 2"
Cohesion: 0.40
Nodes (5): /challenge — Relatti 14-Day Challenge, /beta funnel (BetaOffer, ?code=, before/after check-in), Forwardable invite copy-message block, Family explainer (private, never social), The Telling Ladder (retention mechanic)

### Community 141 - "Integration Discovery"
Cohesion: 0.40
Nodes (5): Integration Coaching — Discovery (Phase 0), Integration instruments (ISLES-SF, CBI, RSS-14, NDE-C, PHQ-4, ERRI, CFI), Integration Coaching — Experience Discovery (Phase 0.5, HEARD), Instrument Permissions — the requests, Sprint Plan — Integration Coaching (Phase 3)

### Community 143 - "Verify Page"
Cohesion: 0.60
Nodes (3): VerifyContent(), VerifyLoading(), VerifyPage()

### Community 145 - "Money Narrative"
Cohesion: 0.70
Nodes (4): isMoneyNarrative(), MoneyNarrative, nonEmptyString(), stringArray()

### Community 146 - "Integration Experience"
Cohesion: 0.50
Nodes (4): The Aperture (progress + spiral detector widget), Onboarding ritual (theme list, warning signs, anchoring message), _shared/conversation-signals.ts (election, certainty ratchet, AI-centrality), _shared/trajectory.ts + cron-trajectory + trajectory_scores (I3.6)

### Community 147 - "Integration Sprint"
Cohesion: 0.50
Nodes (4): The first box — 'Tell it' pre-account free text, Supabase anonymous session on submit + 14-day retention sweep, coaching_consents table + consent gate (I5.5), INTEGRATION_ENGINE feature flag + INTEGRATION_ENGINE_USERS

### Community 148 - "Prompt Debt"
Cohesion: 0.50
Nodes (4): CoachPack interface, Prompt & Process Improvement Debt, assemblePrompt() (prompt-assembler.ts), PD-001 Session Gap Awareness (time delta detection)

### Community 150 - "Doc Maintenance"
Cohesion: 0.67
Nodes (3): Documentation Maintenance Directive, Documentation standards, File-to-doc mapping rules

### Community 151 - "Integration Discovery 2"
Cohesion: 0.67
Nodes (3): Longing-to-return suicidality case, Live session safety floor ('is that then, or is that now?'), Integration crisis patterns (desire_to_return, command_content, medication_stopping)

## Ambiguous Edges - Review These
- `Tester welcome email` → `Banned copy constructions (em dashes, AI vocabulary, triads)`  [AMBIGUOUS]
  directives/BETA_LAUNCH_COPY.md · relation: conceptually_related_to
- `Coach Pack (per-domain strategy)` → `Decoded → Coach Handoff`  [AMBIGUOUS]
  directives/DECODED.md · relation: conceptually_related_to

## Knowledge Gaps
- **230 isolated node(s):** `ADR-0002`, `ADR-0006`, `ADR-0002`, `RFC-2822`, `ADR-0002` (+225 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1071 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hasLiveConsent()` connect `Consent & Post-Processor` to `Integration Consent`, `Coach Endpoint & Safety Sweep`?**
  _High betweenness centrality (0.165) - this node is a cross-community bridge._
- **What connects `ADR-0002`, `ADR-0006`, `ADR-0002` to the rest of the system?**
  _230 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Accountability Check-in Delivery` be split into smaller, more focused modules?**
  _Cohesion score 0.04576576576576576 - nodes in this community are weakly interconnected._
- **Why does `Tier 1 Deterministic Hard-Stop` connect `Coach Architecture Audit` to `Crisis Detection`?**
  _High betweenness centrality (0.151) - this node is a cross-community bridge._
- **Should `Onboarding Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Tester welcome email` and `Banned copy constructions (em dashes, AI vocabulary, triads)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Coach Pack (per-domain strategy)` and `Decoded → Coach Handoff`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._