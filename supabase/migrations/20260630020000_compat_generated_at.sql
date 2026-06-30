-- Compatibility-report staleness tracking.
--
-- When a partner RETAKES their assessment, they get a brand-new assessment_report
-- (new generated_at), and the dyad's cached couples/compatibility report becomes
-- out of date. We detect this by comparing each partner's report generated_at
-- against when the compatibility report was last written. This column records
-- that write time; the decoded-compatibility-report edge function stamps it on
-- every save (initial generation + force_regenerate).
--
-- See: src/app/compatibility/[inviteId]/page.tsx (staleness check),
--      CompatibilityReportViewer.tsx (banner + Regenerate),
--      src/lib/relatti/sync-my-report.ts (keeps *_report_id pointing at the
--      latest report so the comparison + regeneration use fresh data).

alter table public.decoded_invites
  add column if not exists compatibility_generated_at timestamptz;

comment on column public.decoded_invites.compatibility_generated_at is
  'When the cached compatibility_report_* was last generated. Used to detect staleness after a partner retakes (compare vs assessment_reports.generated_at). Stamped by the decoded-compatibility-report edge function.';

-- Baseline existing compat reports as "current as of now": their partner reports
-- were all generated before this point, so they will only flag as stale on a
-- FUTURE retake (not retroactively on deploy).
update public.decoded_invites
  set compatibility_generated_at = now()
  where compatibility_report is not null
    and compatibility_generated_at is null;
