-- Public catalog access with administrator-only content mutations.
--
-- The service role used by the R2 sync worker bypasses RLS, so it can continue
-- syncing sermons and image metadata. Never expose that key in the app.

BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sermons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER avoids recursive admin_users policy checks. The function
-- takes no user id, so callers can only test their own authenticated identity.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Remove prior policies on these catalog tables so an old permissive write
-- policy cannot silently weaken the rules below.
DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (
        ARRAY[
          'admin_users',
          'playlists',
          'playlist_items',
          'sermons',
          'images'
        ]
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      policy_row.policyname,
      policy_row.tablename
    );
  END LOOP;
END;
$$;

CREATE POLICY "Users can read own admin membership"
ON public.admin_users
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Public can read playlists"
ON public.playlists
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can insert playlists"
ON public.playlists
FOR INSERT
TO authenticated
WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admins can update playlists"
ON public.playlists
FOR UPDATE
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admins can delete playlists"
ON public.playlists
FOR DELETE
TO authenticated
USING ((SELECT public.is_admin()));

CREATE POLICY "Public can read playlist items"
ON public.playlist_items
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can insert playlist items"
ON public.playlist_items
FOR INSERT
TO authenticated
WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admins can update playlist items"
ON public.playlist_items
FOR UPDATE
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admins can delete playlist items"
ON public.playlist_items
FOR DELETE
TO authenticated
USING ((SELECT public.is_admin()));

CREATE POLICY "Public can read sermons"
ON public.sermons
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can insert sermons"
ON public.sermons
FOR INSERT
TO authenticated
WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admins can update sermons"
ON public.sermons
FOR UPDATE
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admins can delete sermons"
ON public.sermons
FOR DELETE
TO authenticated
USING ((SELECT public.is_admin()));

CREATE POLICY "Public can read images"
ON public.images
FOR SELECT
TO anon, authenticated
USING (true);

-- Table grants and RLS both apply. Explicit grants make the intended API
-- surface clear and prevent clients from mutating image/admin metadata.
REVOKE ALL ON public.admin_users FROM anon, authenticated;
GRANT SELECT ON public.admin_users TO authenticated;

REVOKE ALL ON public.playlists FROM anon, authenticated;
GRANT SELECT ON public.playlists TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.playlists TO authenticated;

REVOKE ALL ON public.playlist_items FROM anon, authenticated;
GRANT SELECT ON public.playlist_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.playlist_items TO authenticated;

REVOKE ALL ON public.sermons FROM anon, authenticated;
GRANT SELECT ON public.sermons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sermons TO authenticated;

REVOKE ALL ON public.images FROM anon, authenticated;
GRANT SELECT ON public.images TO anon, authenticated;

COMMENT ON TABLE public.admin_users IS
  'Trusted list of auth users allowed to manage published catalog content.';
COMMENT ON FUNCTION public.is_admin() IS
  'Returns whether the current authenticated user is in public.admin_users.';

COMMIT;

-- Provision administrators separately in the Supabase SQL editor or another
-- trusted service-role flow, for example:
-- INSERT INTO public.admin_users (user_id) VALUES ('auth-user-uuid');
