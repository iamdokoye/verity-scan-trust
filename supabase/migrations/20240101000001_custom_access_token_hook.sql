-- =============================================================================
-- Custom Access Token Hook
-- =============================================================================
-- This PostgreSQL function is called by Supabase Auth every time it mints a JWT.
-- It injects two custom claims:
--   user_role      → the user's role from the profiles table ('admin' | 'student')
--   institution_id → the institution UUID the user belongs to
--
-- Without this hook, req.user.role and req.user.institutionId will be undefined
-- in every Express middleware, blocking all authenticated requests.
--
-- HOW TO DEPLOY:
--   1. Run this entire file in the Supabase SQL Editor.
--   2. Go to Supabase Dashboard → Authentication → Hooks.
--   3. Under "Custom Access Token", select this function:
--      Schema: public   Function: custom_access_token_hook
--   4. Click Save.
--   5. Verify by logging in and decoding the JWT at jwt.io —
--      you should see user_role and institution_id in the payload.
-- =============================================================================

-- The function receives a jsonb event with shape:
-- {
--   "user_id": "uuid-of-the-supabase-user",
--   "claims": {
--     "sub": "...", "email": "...", "role": "authenticated", ...
--   }
-- }
-- It must return the same jsonb event with claims modified.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims        jsonb;
  user_profile  record;
BEGIN
  -- Look up the profile record matching the Supabase user's UUID.
  -- The profiles.id column is the same UUID that Supabase Auth uses.
  SELECT p.role, p.institution_id
  INTO   user_profile
  FROM   public.profiles p
  WHERE  p.id = (event->>'user_id');

  -- Start with the existing claims
  claims := event->'claims';

  IF user_profile IS NOT NULL THEN
    -- Inject role and institution into the JWT as top-level custom claims.
    -- The Express requireAuth middleware reads these as:
    --   payload['user_role']      → req.user.role
    --   payload['institution_id'] → req.user.institutionId
    claims := jsonb_set(claims, '{user_role}',      to_jsonb(user_profile.role::text));
    claims := jsonb_set(claims, '{institution_id}', to_jsonb(user_profile.institution_id::text));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant the Supabase auth service permission to invoke this function.
-- These three lines are required — Supabase won't call the hook without them.
GRANT USAGE  ON SCHEMA public               TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke execution from all other roles for security.
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook
  FROM authenticated, anon, public;
