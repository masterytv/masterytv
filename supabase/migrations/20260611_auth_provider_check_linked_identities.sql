-- TD-009 refinement: only report an OAuth provider when the user has NO
-- email/password identity. A user with linked Google + email identities has a
-- real password, so the forgot-password flow must still send the reset email.
-- Also pins search_path (SECURITY DEFINER hardening).

CREATE OR REPLACE FUNCTION public.get_auth_provider_for_email(lookup_email text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

REVOKE EXECUTE ON FUNCTION public.get_auth_provider_for_email FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_provider_for_email TO service_role;
