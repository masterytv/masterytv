-- =====================================================================
-- BASELINE SCHEMA SNAPSHOT — pre-Relatti (public schema)
-- =====================================================================
-- Project : masterytv-website  (Supabase ref: lwmadssysqcwbsoiaokc)
-- Captured: 2026-06-16, reconstructed from the live Postgres catalog
--           via the Supabase MCP (read-only). This is NOT a pg_dump.
-- Purpose : Establish a single, git-tracked source of truth for the
--           CURRENT production schema before the Relatti polymorphic
--           spine is added (RELATIONSHIP_ARCHITECTURE.md / _SPRINT.md).
--           Remote migration history has 44 entries; only 7 were ever
--           committed as files — this baseline closes that gap.
--
-- Use     : Re-creates the `public` schema on a FRESH database (local
--           `supabase start` / a dev branch) and gives reviewers a
--           reproducible reference. It is ordered so it runs top-to-bottom
--           on an empty DB: extensions → tables → constraints → indexes →
--           functions → triggers → RLS/policies.
--
-- DO NOT re-run this against production — the objects already exist there.
--
-- KNOWN GAPS (not captured by a public-schema catalog read — handle out of band):
--   • The AFTER INSERT trigger on `auth.users` that calls
--     public.handle_new_user() (lives in the `auth` schema; originally
--     migration 010_user_creation_trigger). The function body is included
--     below; the trigger binding must be recreated separately — see the
--     commented block at the end.
--   • pg_cron jobs (Sprint-5 scheduler / accountability cron; `cron` schema).
--   • Storage buckets/policies, auth config, role grants.
--   • Seed data rows (framework_config, ai_tools, contact_lists, etc.).
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;          -- pgvector 0.8.0 (memory/message/entity embeddings)
CREATE EXTENSION IF NOT EXISTS moddatetime;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
-- supabase_vault is provisioned by the platform.

-- ─────────────────────────────────────────────────────────────────────
-- 2. TABLES  (public schema; FKs added in §3, indexes in §4)
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE ai_tools (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    website text,
    category text[],
    cost_model text,
    cost_detail text,
    description text,
    strengths text[],
    when_to_recommend text,
    api_available boolean DEFAULT false,
    last_verified_at timestamp with time zone,
    auto_flagged boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE assessment_profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    assessment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    archetype text,
    top_strengths text[] DEFAULT '{}'::text[],
    growth_edges text[] DEFAULT '{}'::text[],
    attachment_style text,
    big_five_summary jsonb DEFAULT '{}'::jsonb,
    coaching_priorities text[] DEFAULT '{}'::text[],
    key_insights text[] DEFAULT '{}'::text[],
    coach_opener text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE assessment_progress (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    assessment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    current_layer text NOT NULL DEFAULT 'core'::text,
    current_instrument text NOT NULL,
    current_item_index integer NOT NULL DEFAULT 0,
    responses jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE assessment_report_versions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    report_id uuid NOT NULL,
    user_id uuid NOT NULL,
    voice_id text NOT NULL,
    sections jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'generating'::text,
    sections_completed integer NOT NULL DEFAULT 0,
    total_sections integer NOT NULL DEFAULT 12,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone
);

CREATE TABLE assessment_reports (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    assessment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    sections jsonb NOT NULL DEFAULT '{}'::jsonb,
    archetype_base text,
    archetype_sublabel text,
    archetype_tagline text,
    decoded_score integer,
    generation_model text NOT NULL DEFAULT 'gpt-4o'::text,
    generation_cost_usd numeric,
    generated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    voice_profile jsonb,
    report_version smallint NOT NULL DEFAULT 1
);

CREATE TABLE assessment_responses (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    assessment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    instrument_id text NOT NULL,
    item_index integer NOT NULL,
    item_key text NOT NULL,
    response_value integer NOT NULL,
    response_time_ms integer,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE assessment_scores (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    assessment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    instrument_id text NOT NULL,
    total_score numeric,
    subscale_scores jsonb DEFAULT '{}'::jsonb,
    percentile_scores jsonb DEFAULT '{}'::jsonb,
    interpretation jsonb DEFAULT '{}'::jsonb,
    raw_score_details jsonb DEFAULT '{}'::jsonb,
    scoring_version text NOT NULL DEFAULT '1.0'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE assessments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    completed_at timestamp with time zone,
    current_layer text NOT NULL DEFAULT 'core'::text,
    current_instrument text,
    current_item_index integer DEFAULT 0,
    total_items_presented integer DEFAULT 0,
    total_time_seconds integer,
    adaptive_triggers jsonb DEFAULT '{}'::jsonb,
    last_active_at timestamp with time zone NOT NULL DEFAULT now(),
    abandonment_email_sent boolean DEFAULT false,
    instrument_version text NOT NULL DEFAULT '1.0'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    coaching_flags jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE coach_message_usage (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    period_type text NOT NULL,
    period_start date NOT NULL,
    message_count integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE coach_profile_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    directness double precision NOT NULL,
    framing double precision NOT NULL,
    warmth double precision NOT NULL,
    autonomy double precision NOT NULL,
    pacing double precision NOT NULL,
    evidence_style double precision NOT NULL,
    accountability double precision NOT NULL,
    challenge_level double precision NOT NULL,
    trust_level integer NOT NULL,
    confidence double precision NOT NULL,
    source text NOT NULL,
    message_count integer,
    signals_applied jsonb DEFAULT '{}'::jsonb,
    dimensions_changed text[],
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE coach_profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    directness double precision DEFAULT 0.5,
    framing double precision DEFAULT 0.6,
    warmth double precision DEFAULT 0.6,
    autonomy double precision DEFAULT 0.5,
    pacing double precision DEFAULT 0.5,
    evidence_style double precision DEFAULT 0.5,
    accountability double precision DEFAULT 0.5,
    challenge_level double precision DEFAULT 0.4,
    source text DEFAULT 'default'::text,
    confidence double precision DEFAULT 0.3,
    avg_response_time_seconds integer,
    avg_message_length integer,
    action_completion_rate double precision DEFAULT 0.0,
    engagement_score double precision DEFAULT 0.5,
    trust_level integer DEFAULT 1,
    framework_affinity jsonb DEFAULT '{}'::jsonb,
    promotion_focus double precision DEFAULT 0.5,
    prevention_focus double precision DEFAULT 0.5,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    voice_id text
);

CREATE TABLE coaching_agenda (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    week_start date NOT NULL,
    arc_phase text DEFAULT 'orientation'::text,
    priority_topic text,
    suggested_framework text,
    coaching_questions text[],
    unresolved_entities uuid[],
    patterns_detected text[],
    wins_to_celebrate uuid[],
    stalled_goals uuid[],
    week_summary text,
    confidence double precision DEFAULT 0.5,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE coaching_challenges (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    related_entity_id uuid,
    framework text NOT NULL,
    framework_phase text,
    status text DEFAULT 'active'::text,
    started_at timestamp with time zone DEFAULT now(),
    last_coached_at timestamp with time zone,
    session_count integer DEFAULT 0,
    resolved_at timestamp with time zone,
    evolution_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE commitments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    type text DEFAULT 'action_item'::text,
    description text NOT NULL,
    due_date timestamp with time zone,
    status text DEFAULT 'active'::text,
    follow_up_count integer DEFAULT 0,
    source_message_id uuid,
    ai_tool_suggestion text,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    context_note text
);

CREATE TABLE contact_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    contact_id uuid NOT NULL,
    event_type text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE contact_lists (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE contact_subscriptions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    contact_id uuid NOT NULL,
    list_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'subscribed'::text,
    subscribed_at timestamp with time zone DEFAULT now(),
    unsubscribed_at timestamp with time zone
);

CREATE TABLE contacts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email text NOT NULL,
    name text,
    source text NOT NULL DEFAULT 'website'::text,
    source_detail text,
    status text NOT NULL DEFAULT 'lead'::text,
    lead_score integer DEFAULT 0,
    converted_user_id uuid,
    referrer_contact_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE conversation_summaries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    summary text NOT NULL,
    key_topics text[],
    framework_used text,
    message_count integer,
    first_message_at timestamp with time zone,
    last_message_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE cost_tracking (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    purpose text NOT NULL,
    model text NOT NULL,
    tokens_in integer NOT NULL,
    tokens_out integer NOT NULL,
    cost_usd numeric(10,6) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE crisis_flags (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    severity text NOT NULL,
    matched_keywords text[] NOT NULL DEFAULT '{}'::text[],
    llm_confirmed boolean DEFAULT true,
    message_excerpt text,
    reviewed boolean DEFAULT false,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE decoded_invites (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    inviter_id uuid NOT NULL,
    recipient_email text NOT NULL,
    recipient_id uuid,
    status text NOT NULL DEFAULT 'pending'::text,
    inviter_report_id uuid,
    recipient_report_id uuid,
    compatibility_report jsonb,
    share_with_human text NOT NULL DEFAULT 'none'::text,
    share_with_coach text NOT NULL DEFAULT 'none'::text,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    consented_at timestamp with time zone,
    revoked_at timestamp with time zone,
    inviter_name text,
    inviter_email text,
    upgrade_requested_level text,
    upgrade_requested_by uuid,
    compatibility_report_inviter jsonb,
    compatibility_report_recipient jsonb,
    notified_at timestamp with time zone
);

CREATE TABLE email_signups (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    source text DEFAULT 'landing_page'::text,
    invited boolean DEFAULT false
);

CREATE TABLE error_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    function_name text NOT NULL,
    error_message text,
    stack_trace text,
    user_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE fact_cache (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    query_hash text NOT NULL,
    query text NOT NULL,
    answer text NOT NULL,
    sources jsonb DEFAULT '[]'::jsonb,
    confidence text DEFAULT 'medium'::text,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + '24:00:00'::interval)
);

CREATE TABLE framework_config (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    tier integer NOT NULL,
    category text NOT NULL,
    description text,
    when_to_use text,
    system_prompt_template text,
    phases text[],
    phase_descriptions jsonb,
    transition_signals text,
    selection_weight double precision DEFAULT 1.0,
    requires_trust_level integer DEFAULT 1,
    requires_consent boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE framework_usage (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    framework text NOT NULL,
    message_id uuid,
    engagement_signal double precision,
    action_taken boolean,
    learning_flag boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE memory_facts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    category text NOT NULL,
    subject text NOT NULL,
    content text NOT NULL,
    importance double precision DEFAULT 0.5,
    source_message_id uuid,
    embedding vector(1536),
    expires_at timestamp with time zone,
    is_confirmed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    channel text NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    embedding vector(1536),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE nagging_tracker (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    topic text NOT NULL,
    strike_count integer DEFAULT 0,
    is_paused boolean DEFAULT false,
    last_strike_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE onboarding_state (
    user_id uuid NOT NULL,
    current_step text NOT NULL DEFAULT 'signup'::text,
    data jsonb DEFAULT '{}'::jsonb,
    research_results jsonb,
    coaching_letter text,
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE organizations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    coaching_config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE report_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    context_key text NOT NULL,
    section_id text,
    clicked_at timestamp with time zone DEFAULT now()
);

CREATE TABLE scheduled_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    type text NOT NULL,
    scheduled_for timestamp with time zone NOT NULL,
    context jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'pending'::text,
    retry_count integer DEFAULT 0,
    sent_at timestamp with time zone,
    error text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE share_unlocks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    method text NOT NULL,
    recipient_email text,
    section_unlocked text NOT NULL DEFAULT 'S5'::text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE telegram_connect_tokens (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + '00:15:00'::interval),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE user_entities (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    entity_type text NOT NULL,
    name text NOT NULL,
    description text,
    attributes jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'active'::text,
    embedding vector(1536),
    source_message_id uuid,
    first_mentioned_at timestamp with time zone DEFAULT now(),
    last_mentioned_at timestamp with time zone DEFAULT now(),
    mention_count integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE users (
    id uuid NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    linkedin_url text,
    website_url text,
    telegram_chat_id text,
    timezone text DEFAULT 'America/New_York'::text,
    preferred_channel text DEFAULT 'email'::text,
    morning_briefing_time time without time zone DEFAULT '08:00:00'::time without time zone,
    subscription_tier text DEFAULT 'free'::text,
    stripe_customer_id text,
    stripe_subscription_id text,
    ai_tools jsonb DEFAULT '[]'::jsonb,
    daily_message_count integer DEFAULT 0,
    daily_message_reset_at date,
    org_id uuid,
    contact_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    disclaimer_last_shown_at timestamp with time zone,
    is_admin boolean DEFAULT false,
    decoded_tier text NOT NULL DEFAULT 'free'::text,
    age integer,
    gender text,
    occupation text,
    relationship_status text,
    has_children text,
    more_info text,
    role text NOT NULL DEFAULT 'user'::text
);

CREATE TABLE viral_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    invite_id uuid,
    user_id uuid,
    event_type text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE voice_feedback (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    assessment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    original_voice_id text NOT NULL,
    rewrite_voice_id text,
    preferred_voice_id text,
    free_text text,
    created_at timestamp with time zone DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 3. CONSTRAINTS  (PK / UNIQUE / CHECK / FK)
--    Note: FKs reference auth.users for some tables and public.users for
--    others — reproduced exactly as in production.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE ai_tools ADD CONSTRAINT ai_tools_pkey PRIMARY KEY (id);

ALTER TABLE assessment_profiles ADD CONSTRAINT assessment_profiles_pkey PRIMARY KEY (id);
ALTER TABLE assessment_profiles ADD CONSTRAINT assessment_profiles_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
ALTER TABLE assessment_profiles ADD CONSTRAINT assessment_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE assessment_progress ADD CONSTRAINT assessment_progress_pkey PRIMARY KEY (id);
ALTER TABLE assessment_progress ADD CONSTRAINT assessment_progress_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
ALTER TABLE assessment_progress ADD CONSTRAINT assessment_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE assessment_report_versions ADD CONSTRAINT assessment_report_versions_pkey PRIMARY KEY (id);
ALTER TABLE assessment_report_versions ADD CONSTRAINT assessment_report_versions_status_check CHECK ((status = ANY (ARRAY['generating'::text, 'complete'::text, 'failed'::text])));
ALTER TABLE assessment_report_versions ADD CONSTRAINT assessment_report_versions_report_id_fkey FOREIGN KEY (report_id) REFERENCES assessment_reports(id) ON DELETE CASCADE;
ALTER TABLE assessment_report_versions ADD CONSTRAINT assessment_report_versions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE assessment_reports ADD CONSTRAINT assessment_reports_pkey PRIMARY KEY (id);
ALTER TABLE assessment_reports ADD CONSTRAINT assessment_reports_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
ALTER TABLE assessment_reports ADD CONSTRAINT assessment_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE assessment_responses ADD CONSTRAINT assessment_responses_pkey PRIMARY KEY (id);
ALTER TABLE assessment_responses ADD CONSTRAINT assessment_responses_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
ALTER TABLE assessment_responses ADD CONSTRAINT assessment_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE assessment_scores ADD CONSTRAINT assessment_scores_pkey PRIMARY KEY (id);
ALTER TABLE assessment_scores ADD CONSTRAINT assessment_scores_assessment_instrument_unique UNIQUE (assessment_id, instrument_id);
ALTER TABLE assessment_scores ADD CONSTRAINT assessment_scores_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
ALTER TABLE assessment_scores ADD CONSTRAINT assessment_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE assessments ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);
ALTER TABLE assessments ADD CONSTRAINT assessments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE coach_message_usage ADD CONSTRAINT coach_message_usage_pkey PRIMARY KEY (id);
ALTER TABLE coach_message_usage ADD CONSTRAINT coach_message_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE coach_profile_history ADD CONSTRAINT coach_profile_history_pkey PRIMARY KEY (id);
ALTER TABLE coach_profile_history ADD CONSTRAINT coach_profile_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE coach_profiles ADD CONSTRAINT coach_profiles_pkey PRIMARY KEY (id);
ALTER TABLE coach_profiles ADD CONSTRAINT coach_profiles_user_id_key UNIQUE (user_id);
ALTER TABLE coach_profiles ADD CONSTRAINT coach_profiles_source_check CHECK ((source = ANY (ARRAY['default'::text, 'self_reported'::text, 'behavioral'::text, 'blended'::text, 'decoded'::text, 'voice_override'::text])));
ALTER TABLE coach_profiles ADD CONSTRAINT coach_profiles_trust_level_check CHECK (((trust_level >= 1) AND (trust_level <= 5)));
ALTER TABLE coach_profiles ADD CONSTRAINT coach_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE coaching_agenda ADD CONSTRAINT coaching_agenda_pkey PRIMARY KEY (id);
ALTER TABLE coaching_agenda ADD CONSTRAINT coaching_agenda_arc_phase_check CHECK ((arc_phase = ANY (ARRAY['orientation'::text, 'working'::text, 'depth'::text, 'integration'::text])));
ALTER TABLE coaching_agenda ADD CONSTRAINT coaching_agenda_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE coaching_challenges ADD CONSTRAINT coaching_challenges_pkey PRIMARY KEY (id);
ALTER TABLE coaching_challenges ADD CONSTRAINT coaching_challenges_status_check CHECK ((status = ANY (ARRAY['active'::text, 'resolved'::text, 'evolved'::text, 'paused'::text])));
ALTER TABLE coaching_challenges ADD CONSTRAINT coaching_challenges_related_entity_id_fkey FOREIGN KEY (related_entity_id) REFERENCES user_entities(id);
ALTER TABLE coaching_challenges ADD CONSTRAINT coaching_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE commitments ADD CONSTRAINT commitments_pkey PRIMARY KEY (id);
ALTER TABLE commitments ADD CONSTRAINT commitments_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'missed'::text, 'rescheduled'::text, 'cancelled'::text])));
ALTER TABLE commitments ADD CONSTRAINT commitments_type_check CHECK ((type = ANY (ARRAY['goal'::text, 'action_item'::text, 'rock'::text, 'habit'::text])));
ALTER TABLE commitments ADD CONSTRAINT commitments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE commitments ADD CONSTRAINT commitments_source_message_id_fkey FOREIGN KEY (source_message_id) REFERENCES messages(id);

ALTER TABLE contact_events ADD CONSTRAINT contact_events_pkey PRIMARY KEY (id);
ALTER TABLE contact_events ADD CONSTRAINT contact_events_event_type_check CHECK ((event_type = ANY (ARRAY['page_visit'::text, 'newsletter_signup'::text, 'email_opened'::text, 'email_clicked'::text, 'trial_started'::text, 'onboarding_completed'::text, 'first_coaching_session'::text, 'upgraded'::text, 'downgraded'::text, 'referred'::text, 'referral_converted'::text, 'custom'::text])));
ALTER TABLE contact_events ADD CONSTRAINT contact_events_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE contact_lists ADD CONSTRAINT contact_lists_pkey PRIMARY KEY (id);
ALTER TABLE contact_lists ADD CONSTRAINT contact_lists_slug_key UNIQUE (slug);

ALTER TABLE contact_subscriptions ADD CONSTRAINT contact_subscriptions_pkey PRIMARY KEY (id);
ALTER TABLE contact_subscriptions ADD CONSTRAINT contact_subscriptions_contact_id_list_id_key UNIQUE (contact_id, list_id);
ALTER TABLE contact_subscriptions ADD CONSTRAINT contact_subscriptions_status_check CHECK ((status = ANY (ARRAY['subscribed'::text, 'unsubscribed'::text])));
ALTER TABLE contact_subscriptions ADD CONSTRAINT contact_subscriptions_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
ALTER TABLE contact_subscriptions ADD CONSTRAINT contact_subscriptions_list_id_fkey FOREIGN KEY (list_id) REFERENCES contact_lists(id) ON DELETE CASCADE;

ALTER TABLE contacts ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);
ALTER TABLE contacts ADD CONSTRAINT contacts_email_key UNIQUE (email);
ALTER TABLE contacts ADD CONSTRAINT contacts_source_check CHECK ((source = ANY (ARRAY['website'::text, 'coachapp'::text, 'referral'::text, 'import'::text, 'manual'::text, 'social'::text, 'event'::text])));
ALTER TABLE contacts ADD CONSTRAINT contacts_status_check CHECK ((status = ANY (ARRAY['lead'::text, 'prospect'::text, 'free_member'::text, 'paid_member'::text, 'premium_member'::text, 'churned'::text])));
ALTER TABLE contacts ADD CONSTRAINT contacts_referrer_contact_id_fkey FOREIGN KEY (referrer_contact_id) REFERENCES contacts(id);
ALTER TABLE contacts ADD CONSTRAINT fk_contacts_converted_user FOREIGN KEY (converted_user_id) REFERENCES users(id);

ALTER TABLE conversation_summaries ADD CONSTRAINT conversation_summaries_pkey PRIMARY KEY (id);
ALTER TABLE conversation_summaries ADD CONSTRAINT conversation_summaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE cost_tracking ADD CONSTRAINT cost_tracking_pkey PRIMARY KEY (id);
ALTER TABLE cost_tracking ADD CONSTRAINT cost_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE crisis_flags ADD CONSTRAINT crisis_flags_pkey PRIMARY KEY (id);
ALTER TABLE crisis_flags ADD CONSTRAINT crisis_flags_severity_check CHECK ((severity = ANY (ARRAY['high'::text, 'moderate'::text])));
ALTER TABLE crisis_flags ADD CONSTRAINT crisis_flags_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE decoded_invites ADD CONSTRAINT decoded_invites_pkey PRIMARY KEY (id);
ALTER TABLE decoded_invites ADD CONSTRAINT decoded_invites_inviter_id_recipient_email_key UNIQUE (inviter_id, recipient_email);
ALTER TABLE decoded_invites ADD CONSTRAINT decoded_invites_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE decoded_invites ADD CONSTRAINT decoded_invites_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE decoded_invites ADD CONSTRAINT decoded_invites_inviter_report_id_fkey FOREIGN KEY (inviter_report_id) REFERENCES assessment_reports(id);
ALTER TABLE decoded_invites ADD CONSTRAINT decoded_invites_recipient_report_id_fkey FOREIGN KEY (recipient_report_id) REFERENCES assessment_reports(id);
ALTER TABLE decoded_invites ADD CONSTRAINT decoded_invites_upgrade_requested_by_fkey FOREIGN KEY (upgrade_requested_by) REFERENCES auth.users(id);

ALTER TABLE email_signups ADD CONSTRAINT email_signups_pkey PRIMARY KEY (id);
ALTER TABLE email_signups ADD CONSTRAINT email_signups_email_key UNIQUE (email);

ALTER TABLE error_log ADD CONSTRAINT error_log_pkey PRIMARY KEY (id);
ALTER TABLE error_log ADD CONSTRAINT error_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE fact_cache ADD CONSTRAINT fact_cache_pkey PRIMARY KEY (id);
ALTER TABLE fact_cache ADD CONSTRAINT fact_cache_query_hash_key UNIQUE (query_hash);
ALTER TABLE fact_cache ADD CONSTRAINT fact_cache_confidence_check CHECK ((confidence = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])));

ALTER TABLE framework_config ADD CONSTRAINT framework_config_pkey PRIMARY KEY (id);
ALTER TABLE framework_config ADD CONSTRAINT framework_config_name_key UNIQUE (name);
ALTER TABLE framework_config ADD CONSTRAINT framework_config_tier_check CHECK (((tier >= 1) AND (tier <= 4)));

ALTER TABLE framework_usage ADD CONSTRAINT framework_usage_pkey PRIMARY KEY (id);
ALTER TABLE framework_usage ADD CONSTRAINT framework_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE framework_usage ADD CONSTRAINT framework_usage_message_id_fkey FOREIGN KEY (message_id) REFERENCES messages(id);

ALTER TABLE memory_facts ADD CONSTRAINT memory_facts_pkey PRIMARY KEY (id);
ALTER TABLE memory_facts ADD CONSTRAINT memory_facts_category_check CHECK ((category = ANY (ARRAY['business'::text, 'personal'::text, 'goal'::text, 'person'::text, 'challenge'::text, 'win'::text, 'pattern'::text, 'preference'::text, 'org_sop'::text])));
ALTER TABLE memory_facts ADD CONSTRAINT memory_facts_importance_check CHECK (((importance >= (0.0)::double precision) AND (importance <= (1.0)::double precision)));
ALTER TABLE memory_facts ADD CONSTRAINT memory_facts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE memory_facts ADD CONSTRAINT memory_facts_source_message_id_fkey FOREIGN KEY (source_message_id) REFERENCES messages(id);

ALTER TABLE messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id);
ALTER TABLE messages ADD CONSTRAINT messages_channel_check CHECK ((channel = ANY (ARRAY['email'::text, 'telegram'::text, 'web'::text])));
ALTER TABLE messages ADD CONSTRAINT messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'coach'::text, 'system'::text])));
ALTER TABLE messages ADD CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE nagging_tracker ADD CONSTRAINT nagging_tracker_pkey PRIMARY KEY (id);
ALTER TABLE nagging_tracker ADD CONSTRAINT nagging_tracker_user_id_topic_key UNIQUE (user_id, topic);
ALTER TABLE nagging_tracker ADD CONSTRAINT nagging_tracker_strike_count_check CHECK (((strike_count >= 0) AND (strike_count <= 3)));
ALTER TABLE nagging_tracker ADD CONSTRAINT nagging_tracker_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE onboarding_state ADD CONSTRAINT onboarding_state_pkey PRIMARY KEY (user_id);
ALTER TABLE onboarding_state ADD CONSTRAINT onboarding_state_current_step_check CHECK ((current_step = ANY (ARRAY['signup'::text, 'starting_point'::text, 'research_pending'::text, 'research_confirm'::text, 'coaching_letter'::text, 'channel_connect'::text, 'complete'::text])));
ALTER TABLE onboarding_state ADD CONSTRAINT onboarding_state_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE organizations ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);

ALTER TABLE report_events ADD CONSTRAINT report_events_pkey PRIMARY KEY (id);
ALTER TABLE report_events ADD CONSTRAINT report_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE scheduled_messages ADD CONSTRAINT scheduled_messages_pkey PRIMARY KEY (id);
ALTER TABLE scheduled_messages ADD CONSTRAINT scheduled_messages_type_check CHECK ((type = ANY (ARRAY['morning_briefing'::text, 'accountability_check'::text, 'meeting_prep'::text, 'weekly_review'::text, 'engagement_check'::text, 'milestone'::text, 'weekly_coaching_session'::text, 'progress_review'::text])));
ALTER TABLE scheduled_messages ADD CONSTRAINT scheduled_messages_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'generating'::text, 'sent'::text, 'failed'::text, 'cancelled'::text])));
ALTER TABLE scheduled_messages ADD CONSTRAINT scheduled_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE share_unlocks ADD CONSTRAINT share_unlocks_pkey PRIMARY KEY (id);
ALTER TABLE share_unlocks ADD CONSTRAINT share_unlocks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE telegram_connect_tokens ADD CONSTRAINT telegram_connect_tokens_pkey PRIMARY KEY (id);
ALTER TABLE telegram_connect_tokens ADD CONSTRAINT telegram_connect_tokens_token_key UNIQUE (token);
ALTER TABLE telegram_connect_tokens ADD CONSTRAINT telegram_connect_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_entities ADD CONSTRAINT user_entities_pkey PRIMARY KEY (id);
ALTER TABLE user_entities ADD CONSTRAINT user_entities_entity_type_check CHECK ((entity_type = ANY (ARRAY['person'::text, 'goal'::text, 'fear'::text, 'value'::text, 'pattern'::text, 'trigger'::text, 'win'::text])));
ALTER TABLE user_entities ADD CONSTRAINT user_entities_status_check CHECK ((status = ANY (ARRAY['active'::text, 'resolved'::text, 'evolved'::text, 'archived'::text])));
ALTER TABLE user_entities ADD CONSTRAINT user_entities_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_entities ADD CONSTRAINT user_entities_source_message_id_fkey FOREIGN KEY (source_message_id) REFERENCES messages(id);

ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE users ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE users ADD CONSTRAINT users_decoded_tier_check CHECK ((decoded_tier = ANY (ARRAY['free'::text, 'insight'::text, 'growth'::text, 'mastery'::text])));
ALTER TABLE users ADD CONSTRAINT users_preferred_channel_check CHECK ((preferred_channel = ANY (ARRAY['email'::text, 'telegram'::text, 'web'::text])));
ALTER TABLE users ADD CONSTRAINT users_subscription_tier_check CHECK ((subscription_tier = ANY (ARRAY['free'::text, 'core'::text, 'premium'::text, 'insight'::text, 'growth'::text, 'mastery'::text])));
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text, 'superadmin'::text])));
ALTER TABLE users ADD CONSTRAINT users_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);
ALTER TABLE users ADD CONSTRAINT users_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES contacts(id);

ALTER TABLE viral_events ADD CONSTRAINT viral_events_pkey PRIMARY KEY (id);
ALTER TABLE viral_events ADD CONSTRAINT viral_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE voice_feedback ADD CONSTRAINT voice_feedback_pkey PRIMARY KEY (id);
ALTER TABLE voice_feedback ADD CONSTRAINT voice_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE voice_feedback ADD CONSTRAINT voice_feedback_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────────────
-- 4. INDEXES  (non-PK / non-unique-constraint-backed)
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX idx_profiles_user ON public.assessment_profiles USING btree (user_id);
CREATE UNIQUE INDEX idx_profiles_assessment ON public.assessment_profiles USING btree (assessment_id);
CREATE UNIQUE INDEX idx_progress_unique ON public.assessment_progress USING btree (assessment_id);
CREATE INDEX idx_progress_assessment ON public.assessment_progress USING btree (assessment_id);
CREATE INDEX idx_progress_user ON public.assessment_progress USING btree (user_id);
CREATE INDEX idx_report_versions_user ON public.assessment_report_versions USING btree (user_id, created_at DESC);
CREATE INDEX idx_report_versions_report ON public.assessment_report_versions USING btree (report_id, created_at DESC);
CREATE UNIQUE INDEX idx_report_versions_unique ON public.assessment_report_versions USING btree (report_id, voice_id);
CREATE INDEX idx_reports_assessment ON public.assessment_reports USING btree (assessment_id);
CREATE INDEX idx_reports_user ON public.assessment_reports USING btree (user_id);
CREATE UNIQUE INDEX idx_responses_unique ON public.assessment_responses USING btree (assessment_id, instrument_id, item_index);
CREATE INDEX idx_responses_assessment ON public.assessment_responses USING btree (assessment_id);
CREATE INDEX idx_responses_instrument ON public.assessment_responses USING btree (assessment_id, instrument_id);
CREATE UNIQUE INDEX idx_scores_unique ON public.assessment_scores USING btree (assessment_id, instrument_id);
CREATE INDEX idx_scores_user_instrument ON public.assessment_scores USING btree (user_id, instrument_id);
CREATE INDEX idx_scores_assessment ON public.assessment_scores USING btree (assessment_id);
CREATE INDEX idx_assessments_user_id ON public.assessments USING btree (user_id);
CREATE INDEX idx_assessments_abandonment ON public.assessments USING btree (last_active_at, completed_at) WHERE ((completed_at IS NULL) AND (abandonment_email_sent = false));
CREATE UNIQUE INDEX idx_usage_unique ON public.coach_message_usage USING btree (user_id, period_type, period_start);
CREATE INDEX idx_profile_history_user ON public.coach_profile_history USING btree (user_id, created_at DESC);
CREATE INDEX idx_agenda_user ON public.coaching_agenda USING btree (user_id, week_start DESC);
CREATE INDEX idx_challenges_user ON public.coaching_challenges USING btree (user_id, status);
CREATE INDEX idx_commitments_due ON public.commitments USING btree (due_date) WHERE (status = 'active'::text);
CREATE INDEX idx_commitments_user ON public.commitments USING btree (user_id, status);
CREATE INDEX idx_events_contact ON public.contact_events USING btree (contact_id, created_at DESC);
CREATE INDEX idx_events_type ON public.contact_events USING btree (event_type, created_at DESC);
CREATE INDEX idx_subscriptions_list ON public.contact_subscriptions USING btree (list_id, status);
CREATE INDEX idx_subscriptions_contact ON public.contact_subscriptions USING btree (contact_id);
CREATE INDEX idx_contacts_email ON public.contacts USING btree (email);
CREATE INDEX idx_contacts_source ON public.contacts USING btree (source);
CREATE INDEX idx_contacts_status ON public.contacts USING btree (status);
CREATE INDEX idx_summaries_user ON public.conversation_summaries USING btree (user_id, created_at DESC);
CREATE INDEX idx_cost_user ON public.cost_tracking USING btree (user_id, created_at);
CREATE INDEX idx_cost_purpose ON public.cost_tracking USING btree (purpose, created_at);
CREATE INDEX idx_crisis_flags_unreviewed ON public.crisis_flags USING btree (created_at DESC) WHERE (reviewed = false);
CREATE INDEX idx_crisis_flags_user ON public.crisis_flags USING btree (user_id, created_at DESC);
CREATE INDEX idx_decoded_invites_email ON public.decoded_invites USING btree (recipient_email);
CREATE INDEX idx_decoded_invites_inviter ON public.decoded_invites USING btree (inviter_id);
CREATE INDEX idx_decoded_invites_recipient ON public.decoded_invites USING btree (recipient_id);
CREATE INDEX idx_email_signups_created ON public.email_signups USING btree (created_at DESC);
CREATE INDEX idx_error_log_function ON public.error_log USING btree (function_name, created_at DESC);
CREATE INDEX idx_fact_cache_expires ON public.fact_cache USING btree (expires_at);
CREATE INDEX idx_fact_cache_hash ON public.fact_cache USING btree (query_hash);
CREATE INDEX idx_framework_user ON public.framework_usage USING btree (user_id, framework);
CREATE INDEX idx_memory_user ON public.memory_facts USING btree (user_id, category);
CREATE INDEX idx_memory_embedding ON public.memory_facts USING ivfflat (embedding vector_cosine_ops) WITH (lists='50');
CREATE INDEX idx_messages_conversation ON public.messages USING btree (conversation_id, created_at);
CREATE INDEX idx_messages_embedding ON public.messages USING ivfflat (embedding vector_cosine_ops) WITH (lists='50');
CREATE INDEX idx_messages_user ON public.messages USING btree (user_id, created_at DESC);
CREATE INDEX idx_report_events_user_id ON public.report_events USING btree (user_id);
CREATE INDEX idx_scheduled_user ON public.scheduled_messages USING btree (user_id, type);
CREATE INDEX idx_scheduled_pending ON public.scheduled_messages USING btree (scheduled_for) WHERE (status = 'pending'::text);
CREATE INDEX idx_share_unlocks_user ON public.share_unlocks USING btree (user_id);
CREATE INDEX idx_telegram_connect_tokens_token ON public.telegram_connect_tokens USING btree (token);
CREATE INDEX idx_entities_embedding ON public.user_entities USING ivfflat (embedding vector_cosine_ops) WITH (lists='50');
CREATE INDEX idx_entities_last_mentioned ON public.user_entities USING btree (user_id, last_mentioned_at DESC);
CREATE INDEX idx_entities_status ON public.user_entities USING btree (user_id, status) WHERE (status = 'active'::text);
CREATE INDEX idx_entities_user_type ON public.user_entities USING btree (user_id, entity_type);
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_stripe ON public.users USING btree (stripe_customer_id);
CREATE INDEX idx_users_org ON public.users USING btree (org_id);
CREATE INDEX idx_users_decoded_tier ON public.users USING btree (decoded_tier);
CREATE INDEX idx_users_contact ON public.users USING btree (contact_id);
CREATE INDEX idx_viral_events_invite ON public.viral_events USING btree (invite_id);
CREATE INDEX idx_viral_events_type ON public.viral_events USING btree (event_type);
CREATE INDEX idx_viral_events_created ON public.viral_events USING btree (created_at);
CREATE INDEX idx_voice_feedback_user ON public.voice_feedback USING btree (user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────
-- 5. FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_auth_provider_for_email(lookup_email text)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT i.provider
  FROM auth.identities i
  WHERE i.email = lower(trim(lookup_email))
    AND i.provider != 'email'
    AND NOT EXISTS (
      SELECT 1
      FROM auth.identities e
      WHERE e.user_id = i.user_id
        AND e.provider = 'email'
    )
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_auth_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.users WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _contact_id uuid;
  _user_name text;
  _user_email text;
BEGIN
  -- Extract user info from auth metadata
  _user_email := NEW.email;
  _user_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(_user_email, '@', 1)
  );

  -- 1. Upsert contact: if they were a newsletter lead, promote them
  INSERT INTO public.contacts (email, name, source, status)
  VALUES (_user_email, _user_name, 'coachapp', 'free_member')
  ON CONFLICT (email) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, contacts.name),
    status = 'free_member',
    updated_at = now()
  RETURNING id INTO _contact_id;

  -- 2. Create users row
  INSERT INTO public.users (id, email, name, contact_id)
  VALUES (NEW.id, _user_email, _user_name, _contact_id);

  -- 3. Update contacts with converted_user_id backlink
  UPDATE public.contacts
  SET converted_user_id = NEW.id
  WHERE id = _contact_id;

  -- 4. Create coach_profiles row with defaults
  INSERT INTO public.coach_profiles (user_id)
  VALUES (NEW.id);

  -- 5. Create onboarding_state row
  INSERT INTO public.onboarding_state (user_id, current_step)
  VALUES (NEW.id, 'signup');

  -- 6. Log the trial_started event
  INSERT INTO public.contact_events (contact_id, event_type, metadata)
  VALUES (_contact_id, 'trial_started', jsonb_build_object(
    'user_id', NEW.id,
    'source', COALESCE(NEW.raw_user_meta_data ->> 'provider', 'magic_link')
  ));

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.match_memory_facts(query_embedding text, match_user_id uuid, match_count integer DEFAULT 10, match_threshold double precision DEFAULT 0.3)
 RETURNS TABLE(id uuid, category text, subject text, content text, importance double precision, similarity double precision)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    mf.id,
    mf.category,
    mf.subject,
    mf.content,
    mf.importance::float,
    (1 - (mf.embedding <=> query_embedding::vector))::float AS similarity
  FROM memory_facts mf
  WHERE mf.user_id = match_user_id
    AND mf.embedding IS NOT NULL
    AND (1 - (mf.embedding <=> query_embedding::vector)) > match_threshold
  ORDER BY mf.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.match_messages(query_embedding text, match_user_id uuid, match_count integer DEFAULT 5, match_threshold double precision DEFAULT 0.3)
 RETURNS TABLE(id uuid, role text, content text, created_at timestamp with time zone, similarity double precision)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.role,
    m.content,
    m.created_at,
    (1 - (m.embedding <=> query_embedding::vector))::float AS similarity
  FROM messages m
  WHERE m.user_id = match_user_id
    AND m.embedding IS NOT NULL
    AND (1 - (m.embedding <=> query_embedding::vector)) > match_threshold
  ORDER BY m.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_is_admin_from_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  NEW.is_admin := NEW.role IN ('admin', 'superadmin');
  RETURN NEW;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────
-- 6. TRIGGERS (public schema)
-- ─────────────────────────────────────────────────────────────────────
CREATE TRIGGER trg_sync_is_admin BEFORE INSERT OR UPDATE OF role ON public.users
  FOR EACH ROW EXECUTE FUNCTION sync_is_admin_from_role();

-- ─────────────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE ai_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_report_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_message_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_profile_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE decoded_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE framework_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE framework_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE nagging_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_connect_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_feedback ENABLE ROW LEVEL SECURITY;

-- Policies (note: tables with RLS enabled but no policy here are service-role-only:
--   contact_events, contact_subscriptions, contacts, organizations, error_log,
--   fact_cache, cost_tracking writes, etc. — access via the service role only.)
CREATE POLICY "AI tools readable by authenticated users" ON ai_tools AS PERMISSIVE FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "System can insert profiles" ON assessment_profiles AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view own profiles" ON assessment_profiles AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can manage own progress" ON assessment_progress AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can read own report versions" ON assessment_report_versions AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "System can insert reports" ON assessment_reports AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own reports" ON assessment_reports AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own reports" ON assessment_reports AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own responses" ON assessment_responses AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view own responses" ON assessment_responses AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "System can insert scores" ON assessment_scores AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view own scores" ON assessment_scores AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own assessments" ON assessments AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own assessments" ON assessments AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own assessments" ON assessments AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own usage" ON coach_message_usage AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can read own profile history" ON coach_profile_history AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own coach profile" ON coach_profiles AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can read own coach profile" ON coach_profiles AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can update own coach profile" ON coach_profiles AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can read own agenda" ON coaching_agenda AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can read own challenges" ON coaching_challenges AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can read own commitments" ON commitments AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can update own commitments" ON commitments AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Contact lists readable by authenticated users" ON contact_lists AS PERMISSIVE FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Users can read own summaries" ON conversation_summaries AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can read own costs" ON cost_tracking AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Inviter can insert" ON decoded_invites AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = inviter_id));
CREATE POLICY "Inviter can read own" ON decoded_invites AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = inviter_id));
CREATE POLICY "Inviter can update upgrade request" ON decoded_invites AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = inviter_id)) WITH CHECK ((auth.uid() = inviter_id));
CREATE POLICY "Recipient can claim by email" ON decoded_invites AS PERMISSIVE FOR UPDATE TO public USING (((recipient_id IS NULL) AND (lower(recipient_email) = lower((auth.jwt() ->> 'email'::text))))) WITH CHECK ((recipient_id = auth.uid()));
CREATE POLICY "Recipient can read own" ON decoded_invites AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = recipient_id));
CREATE POLICY "Recipient can update consent" ON decoded_invites AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = recipient_id)) WITH CHECK ((auth.uid() = recipient_id));
CREATE POLICY "Admins can read signups" ON email_signups AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.is_admin = true)))));
CREATE POLICY "Anyone can sign up for beta" ON email_signups AS PERMISSIVE FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Framework config readable by authenticated users" ON framework_config AS PERMISSIVE FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Users can read own framework usage" ON framework_usage AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can read own facts" ON memory_facts AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can update own facts" ON memory_facts AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own messages" ON messages AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can read own messages" ON messages AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can read own nagging state" ON nagging_tracker AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can read own onboarding" ON onboarding_state AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can update own onboarding" ON onboarding_state AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own events" ON report_events AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can read own events" ON report_events AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can read own scheduled messages" ON scheduled_messages AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own" ON share_unlocks AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert own unlocks" ON share_unlocks AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can read own" ON share_unlocks AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can read own unlocks" ON share_unlocks AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Service role full access on telegram_connect_tokens" ON telegram_connect_tokens AS PERMISSIVE FOR ALL TO public USING ((auth.role() = 'service_role'::text));
CREATE POLICY "Users can create their own connect tokens" ON telegram_connect_tokens AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view their own connect tokens" ON telegram_connect_tokens AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can read own entities" ON user_entities AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admins can read all users" ON users AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = id) OR (get_auth_user_role() = ANY (ARRAY['admin'::text, 'superadmin'::text]))));
CREATE POLICY "Users can read own profile" ON users AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = id));
CREATE POLICY "Users can update own profile" ON users AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = id));
CREATE POLICY "Authenticated users can insert events" ON viral_events AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = user_id) OR (user_id IS NULL)));
CREATE POLICY "Users can insert own voice feedback" ON voice_feedback AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can read own voice feedback" ON voice_feedback AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));

-- ─────────────────────────────────────────────────────────────────────
-- 8. AUTH-SCHEMA TRIGGER (confirmed from prod — June 16, 2026)
-- ─────────────────────────────────────────────────────────────────────
-- The new-user fan-out (public.handle_new_user) is bound to auth.users by this
-- AFTER INSERT trigger, which lives in the `auth` schema (so it was not part of
-- the public-schema snapshot above). Verified present + enabled in production.
-- On a fresh DB it MUST be recreated, or new signups will not create the
-- corresponding public.users / coach_profiles / onboarding_state rows.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
--
-- =====================================================================
-- END BASELINE SNAPSHOT
-- =====================================================================
