-- Fix pg_cron → edge function auth (2026-07-14).
--
-- Every HTTP-calling cron job had been failing on every run since 2026-04-02
-- with `unrecognized configuration parameter "supabase.service_role_key"` —
-- the jobs read the service-role key via current_setting(), but that DB
-- setting was never configured, so the proactive layer (briefings, check-ins,
-- scheduled sends, health checks) never fired once. The health-check job that
-- would have alerted on this was itself one of the broken jobs.
--
-- The key now lives in Vault as 'service_role_key' (created 2026-07-14 via
-- the management API — deliberately NOT in this migration; never commit
-- secrets). This migration rewrites every functions/v1 job command to read
-- it from vault.decrypted_secrets. Idempotent: re-running alter_job with an
-- identical command is a no-op.
--
-- NOTE for future jobs: use this exact headers pattern. current_setting(
-- 'supabase.service_role_key') does not exist on Supabase and never has.

DO $$
DECLARE
  j RECORD;
  fn text;
  new_cmd text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'service_role_key') THEN
    RAISE EXCEPTION 'Vault secret service_role_key missing — create it before running this migration';
  END IF;

  FOR j IN SELECT jobid, jobname, command FROM cron.job WHERE command LIKE '%functions/v1/%' LOOP
    fn := substring(j.command FROM 'functions/v1/([a-z0-9-]+)');
    IF fn IS NULL THEN
      RAISE EXCEPTION 'could not extract function slug for job %', j.jobname;
    END IF;
    new_cmd := format($cmd$
  SELECT net.http_post(
    url := 'https://lwmadssysqcwbsoiaokc.supabase.co/functions/v1/%s',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $cmd$, fn);
    PERFORM cron.alter_job(j.jobid, command := new_cmd);
  END LOOP;
END $$;
