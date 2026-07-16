-- PC2.2 addendum: the profile-evolution history rows inherit the profile's
-- program (the chart must not mix verticals). Backfill mirrors coach_profiles'
-- signup_brand rule.
ALTER TABLE coach_profile_history ADD COLUMN program text;

UPDATE coach_profile_history h SET program = COALESCE(
  (SELECT CASE WHEN u.signup_brand = 'relatti' THEN 'relationship'
               ELSE 'general' END
     FROM users u WHERE u.id = h.user_id),
  'general'
) WHERE h.program IS NULL;

ALTER TABLE coach_profile_history ALTER COLUMN program SET NOT NULL;
ALTER TABLE coach_profile_history ALTER COLUMN program SET DEFAULT 'general';
