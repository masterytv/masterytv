-- PC2.2 phase B: one coach profile per (user, program) becomes real.
--
-- ⚠️ APPLY ONLY AFTER the scoped app code (Vercel merge) AND edge functions
-- are live: old code .single()s coach_profiles by user_id (a second row breaks
-- it) and upserts onConflict "user_id" (needs the old constraint to exist).
ALTER TABLE coach_profiles DROP CONSTRAINT coach_profiles_user_id_key;
