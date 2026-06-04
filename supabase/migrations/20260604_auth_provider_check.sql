-- get_auth_provider_for_email: Returns OAuth provider for an email, or NULL
-- Used by /api/auth/check-provider to detect Google OAuth users on forgot password.
-- SECURITY DEFINER allows querying auth.identities from service_role only.

CREATE OR REPLACE FUNCTION public.get_auth_provider_for_email(lookup_email text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT provider
  FROM auth.identities
  WHERE email = lower(trim(lookup_email))
  AND provider != 'email'
  LIMIT 1;
$$;

-- Only callable by service role (via API routes, not from client)
REVOKE EXECUTE ON FUNCTION public.get_auth_provider_for_email FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_provider_for_email TO service_role;
