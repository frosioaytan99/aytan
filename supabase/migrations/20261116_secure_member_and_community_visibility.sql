-- Protect private member profiles, stories, and community conversations.
-- Existing profile privacy choices are preserved; only the default for new rows changes.

CREATE OR REPLACE FUNCTION public.can_view_member(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT CASE
    WHEN p_user_id IS NULL OR auth.uid() IS NULL THEN false
    WHEN p_user_id = auth.uid() THEN true
    ELSE
      NOT EXISTS (
        SELECT 1
        FROM public.blocks b
        WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p_user_id)
           OR (b.blocker_id = p_user_id AND b.blocked_id = auth.uid())
      )
      AND (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = p_user_id
            AND COALESCE(p.is_private, true) = false
        )
        OR EXISTS (
          SELECT 1
          FROM public.friend_requests fr
          WHERE fr.status = 'accepted'
            AND (
              (fr.sender_id = auth.uid() AND fr.recipient_id = p_user_id)
              OR (fr.sender_id = p_user_id AND fr.recipient_id = auth.uid())
            )
        )
      )
  END;
$function$;

REVOKE ALL ON FUNCTION public.can_view_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_member(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_view_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_community_member(p_community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.community_members cm
      WHERE cm.community_id = p_community_id
        AND cm.user_id = auth.uid()
    );
$function$;

REVOKE ALL ON FUNCTION public.is_community_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_community_member(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_community_member(uuid) TO authenticated;

ALTER TABLE public.profiles
  ALTER COLUMN is_private SET DEFAULT true;

DROP POLICY IF EXISTS profiles_members_read ON public.profiles;
CREATE POLICY profiles_members_read
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.can_view_member(id));

DROP POLICY IF EXISTS "Members can view public communities" ON public.communities;
CREATE POLICY "Members can view public communities"
  ON public.communities
  FOR SELECT
  TO authenticated
  USING (
    is_private = false
    OR created_by = auth.uid()
    OR public.is_community_member(id)
  );

DROP POLICY IF EXISTS "Members can view memberships" ON public.community_members;
CREATE POLICY "Members can view memberships"
  ON public.community_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.communities c
      WHERE c.id = community_members.community_id
        AND (
          c.is_private = false
          OR c.created_by = auth.uid()
          OR public.is_community_member(c.id)
        )
    )
  );

DROP POLICY IF EXISTS "Members can read community messages" ON public.community_messages;
CREATE POLICY "Members can read community messages"
  ON public.community_messages
  FOR SELECT
  TO authenticated
  USING (public.is_community_member(community_id));

DROP POLICY IF EXISTS "Members can send community messages" ON public.community_messages;
CREATE POLICY "Members can send community messages"
  ON public.community_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_community_member(community_id)
  );

DROP POLICY IF EXISTS "Members can view active stories" ON public.stories;
CREATE POLICY "Members can view active stories"
  ON public.stories
  FOR SELECT
  TO authenticated
  USING (
    expires_at > now()
    AND public.can_view_member(user_id)
  );

DROP POLICY IF EXISTS account_not_suspended ON public.communities;
CREATE POLICY account_not_suspended
  ON public.communities
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (NOT public.is_user_suspended(auth.uid()))
  WITH CHECK (NOT public.is_user_suspended(auth.uid()));

DROP POLICY IF EXISTS account_not_suspended ON public.community_members;
CREATE POLICY account_not_suspended
  ON public.community_members
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (NOT public.is_user_suspended(auth.uid()))
  WITH CHECK (NOT public.is_user_suspended(auth.uid()));

DROP POLICY IF EXISTS account_not_suspended ON public.community_messages;
CREATE POLICY account_not_suspended
  ON public.community_messages
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (NOT public.is_user_suspended(auth.uid()))
  WITH CHECK (NOT public.is_user_suspended(auth.uid()));

DROP POLICY IF EXISTS account_not_suspended ON public.stories;
CREATE POLICY account_not_suspended
  ON public.stories
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (NOT public.is_user_suspended(auth.uid()))
  WITH CHECK (NOT public.is_user_suspended(auth.uid()));
