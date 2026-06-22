-- =====================================================================
-- Relatti Polymorphic Spine — Epic E1 (Stage 1: relationship dyad)
-- =====================================================================
-- Source of truth : directives/RELATIONSHIP_ARCHITECTURE.md §5 (Gate-2 approved)
-- Sprint          : directives/RELATIONSHIP_SPRINT.md → E1.1–E1.6
-- Status          : APPLIED TO CLOUD 2026-06-16 (masterytv-website / lwmadssysqcwbsoiaokc).
--                   Founder chose direct-to-cloud (no dev branch / no local Docker);
--                   changes are additive + idempotent + reversible (clean FK pre-flight).
--                   To replay on a fresh local DB: supabase start && supabase db reset.
--
-- Properties:
--   • Additive / zero-downtime — only CREATE TABLE + nullable ALTER ADD COLUMN.
--   • Every new table carries workspace_id (ADR-R03) defaulted to the single
--     seeded MasteryTV workspace. RLS does NOT yet enforce workspace_id
--     (Stage-1 is single-tenant); the column + index are the cheap insurance.
--   • Privacy by assembly (ADR-R02): engagement-shared tables are readable by
--     participants; per-user coaching data is untouched. Cross-partner context
--     is composed server-side under participant.share_level, not via RLS.
--   • Career/white-label columns exist but stay unused in Stage 1 (ADR-R01).
-- =====================================================================

-- Fixed sentinel ids so column DEFAULTs and seeds are deterministic/reproducible.
--   DEFAULT workspace : 00000000-0000-0000-0000-000000000001
--   relationship pgm  : 00000000-0000-0000-0000-000000000002

-- ─────────────────────────────────────────────────────────────────────
-- E1.1 — Tenancy + program
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE workspace (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO workspace (id, slug, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'masterytv', 'MasteryTV')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE program (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
                 REFERENCES workspace(id),
  kind         text NOT NULL CHECK (kind IN ('relationship','career','white_label_vertical')),
  slug         text NOT NULL,
  name         text NOT NULL,
  config       jsonb NOT NULL DEFAULT '{}'::jsonb,   -- battery ids, coach persona layer, funnel
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

-- Seed the relationship program. config.battery lists the live instrument ids
-- relevant to the dyad (relationship-native + cross-cutting); see assessment_scores.
INSERT INTO program (id, workspace_id, kind, slug, name, config)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'relationship', 'relationship', 'Relatti — Relationship Coaching',
  jsonb_build_object(
    'battery', jsonb_build_array('ecr_r_short','csi4','ders16','ipip50','scs_sf','swls','flourishing','wellness_check'),
    'coach_persona_layer', 'relationship_dyad',
    'default_entry_domain', 'relatti.com'
  )
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- E1.2 — Engagement (the coached container) + participant
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE engagement (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
                     REFERENCES workspace(id),
  program_id       uuid NOT NULL REFERENCES program(id),
  kind             text NOT NULL,        -- 'relationship_dyad' | 'career_solo' | 'whitelabel_coachee'
  status           text NOT NULL DEFAULT 'forming'
                     CHECK (status IN ('forming','active','paused','ended')),
  title            text,
  created_by       uuid REFERENCES users(id),
  source_invite_id uuid REFERENCES decoded_invites(id),   -- provenance from the seed (ADR-R04)
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_engagement_workspace ON engagement(workspace_id);
CREATE INDEX idx_engagement_program   ON engagement(program_id);
CREATE INDEX idx_engagement_source_invite ON engagement(source_invite_id);

CREATE TABLE participant (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
                  REFERENCES workspace(id),
  engagement_id uuid NOT NULL REFERENCES engagement(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES users(id),    -- nullable until the partner claims
  invited_email text,                          -- pre-claim address (mirrors decoded_invites)
  role          text NOT NULL CHECK (role IN ('self','partner','coachee','cohort_member')),
  report_id     uuid REFERENCES assessment_reports(id),
  share_level   text NOT NULL DEFAULT 'none'
                  CHECK (share_level IN ('none','type_compatibility','full')),
  status        text NOT NULL DEFAULT 'invited'
                  CHECK (status IN ('invited','active','consented','revoked')),
  consented_at  timestamptz,
  revoked_at    timestamptz,
  joined_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR invited_email IS NOT NULL)
);
-- Singular roles (self/partner/coachee) are unique per engagement; cohort_member
-- is intentionally unconstrained so career/cohort engagements can hold many.
CREATE UNIQUE INDEX uq_participant_singular_role
  ON participant(engagement_id, role)
  WHERE role IN ('self','partner','coachee');
CREATE INDEX idx_participant_user       ON participant(user_id);
CREATE INDEX idx_participant_engagement ON participant(engagement_id);
CREATE INDEX idx_participant_invited_email ON participant(lower(invited_email));

-- ─────────────────────────────────────────────────────────────────────
-- E1.3 — Accountability link + engagement artifact + entry segment
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE accountability_link (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
                        REFERENCES workspace(id),
  engagement_id       uuid NOT NULL REFERENCES engagement(id) ON DELETE CASCADE,
  stake_type          text NOT NULL CHECK (stake_type IN ('partner','cohort','human_coach','deadline')),
  from_participant_id uuid REFERENCES participant(id) ON DELETE SET NULL,
  to_participant_id   uuid REFERENCES participant(id) ON DELETE SET NULL,
  external_ref        text,                 -- cohort_id / coach_id / deadline label
  due_at              timestamptz,          -- for 'deadline' (career stage)
  status              text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','met','broken','ended')),
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_accountability_engagement ON accountability_link(engagement_id);

-- Holds the Relationship Blueprint (promoted from decoded_invites.compatibility_report*).
CREATE TABLE engagement_artifact (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
                  REFERENCES workspace(id),
  engagement_id uuid NOT NULL REFERENCES engagement(id) ON DELETE CASCADE,
  kind          text NOT NULL,             -- 'relationship_blueprint' | 'state_of_the_union' | ...
  content       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_engagement_artifact_engagement ON engagement_artifact(engagement_id);

-- Funnels → program. Rows are GTM (out of architecture scope); table is schema.
CREATE TABLE entry_segment (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
                  REFERENCES workspace(id),
  program_id    uuid NOT NULL REFERENCES program(id),
  slug          text NOT NULL,             -- 'couples','married','engaged'
  domain        text,                      -- 'relatti.com'
  coach_framing text,                       -- persona/copy layer key
  content_ref   jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active     boolean NOT NULL DEFAULT true,
  UNIQUE (workspace_id, domain, slug)
);

-- ─────────────────────────────────────────────────────────────────────
-- E1.4 — Thread engagement_id onto existing tables (additive, nullable)
--   Attribution only (D4): adding the column does NOT change who can read
--   these rows — their existing per-user RLS is untouched.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE decoded_invites    ADD COLUMN IF NOT EXISTS engagement_id uuid REFERENCES engagement(id);
ALTER TABLE messages           ADD COLUMN IF NOT EXISTS engagement_id uuid REFERENCES engagement(id);
ALTER TABLE commitments        ADD COLUMN IF NOT EXISTS engagement_id uuid REFERENCES engagement(id);
ALTER TABLE scheduled_messages ADD COLUMN IF NOT EXISTS engagement_id uuid REFERENCES engagement(id);
CREATE INDEX IF NOT EXISTS idx_decoded_invites_engagement    ON decoded_invites(engagement_id);
CREATE INDEX IF NOT EXISTS idx_messages_engagement           ON messages(engagement_id);
CREATE INDEX IF NOT EXISTS idx_commitments_engagement        ON commitments(engagement_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_engagement ON scheduled_messages(engagement_id);

-- ─────────────────────────────────────────────────────────────────────
-- E1.5 — Membership helper + RLS
-- ─────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER so it reads participant rows without RLS — this also breaks
-- the policy recursion between engagement and participant. Mirrors the existing
-- get_auth_user_role() pattern.
CREATE OR REPLACE FUNCTION public.is_engagement_participant(p_engagement_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM participant
    WHERE engagement_id = p_engagement_id
      AND user_id = auth.uid()
      AND status IN ('active','consented')
  );
$$;

ALTER TABLE workspace            ENABLE ROW LEVEL SECURITY;
ALTER TABLE program              ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement           ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant          ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_link  ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_artifact  ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_segment        ENABLE ROW LEVEL SECURITY;

-- Config/reference tables: readable by any authenticated user; writes via service role only.
CREATE POLICY "workspace readable by authenticated"  ON workspace
  FOR SELECT TO public USING (auth.role() = 'authenticated');
CREATE POLICY "program readable by authenticated"    ON program
  FOR SELECT TO public USING (auth.role() = 'authenticated');
CREATE POLICY "entry_segment readable by authenticated" ON entry_segment
  FOR SELECT TO public USING (auth.role() = 'authenticated');

-- Engagement-shared tables: visible to participants (+ admins). Writes happen
-- server-side under the service role (invite dual-write, E3) — no user write
-- policies in Stage 1, keeping the surface tight.
CREATE POLICY "engagement readable by participants" ON engagement
  FOR SELECT TO public USING (
    public.is_engagement_participant(id)
    OR get_auth_user_role() = ANY (ARRAY['admin','superadmin'])
  );

CREATE POLICY "participant readable by engagement members" ON participant
  FOR SELECT TO public USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND lower(invited_email) = lower((auth.jwt() ->> 'email')))  -- pre-claim self-read
    OR public.is_engagement_participant(engagement_id)
    OR get_auth_user_role() = ANY (ARRAY['admin','superadmin'])
  );

CREATE POLICY "accountability readable by participants" ON accountability_link
  FOR SELECT TO public USING (
    public.is_engagement_participant(engagement_id)
    OR get_auth_user_role() = ANY (ARRAY['admin','superadmin'])
  );

CREATE POLICY "artifact readable by participants" ON engagement_artifact
  FOR SELECT TO public USING (
    public.is_engagement_participant(engagement_id)
    OR get_auth_user_role() = ANY (ARRAY['admin','superadmin'])
  );

-- ─────────────────────────────────────────────────────────────────────
-- E1.6 — workspace_id rule
--   New tables above all carry workspace_id (DEFAULT MasteryTV). The batched
--   backfill of workspace_id onto LEGACY user-data tables is intentionally NOT
--   run here (planned for a later, separate step). Single-tenant Stage 1 does
--   not add workspace predicates to RLS yet.
-- =====================================================================
-- END E1 SPINE
-- =====================================================================
