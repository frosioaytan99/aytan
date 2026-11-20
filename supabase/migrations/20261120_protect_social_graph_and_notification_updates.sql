-- Protect private social graphs and prevent clients from rewriting notification content.
-- Members can only mark their own notifications as read.
REVOKE UPDATE ON TABLE public.notifications FROM authenticated;
GRANT UPDATE (is_read) ON TABLE public.notifications TO authenticated;

-- A member may only see follow relationships when both profiles are visible to them.
DROP POLICY IF EXISTS "Members can read profile follows" ON public.profile_follows;
CREATE POLICY "Members can read visible profile follows"
ON public.profile_follows
FOR SELECT
TO authenticated
USING (
  public.can_view_member(follower_id)
  AND public.can_view_member(followed_id)
  AND NOT public.is_user_suspended((SELECT auth.uid()))
);

-- Following is only allowed when the target profile is visible and the caller is active.
DROP POLICY IF EXISTS "Users can follow as themselves" ON public.profile_follows;
CREATE POLICY "Users can follow visible members as themselves"
ON public.profile_follows
FOR INSERT
TO authenticated
WITH CHECK (
  follower_id = (SELECT auth.uid())
  AND follower_id <> followed_id
  AND public.can_view_member(followed_id)
  AND NOT public.is_user_suspended((SELECT auth.uid()))
);

-- Profile likes must not reveal private or blocked members through direct table queries.
DROP POLICY IF EXISTS "profile likes visible to members" ON public.profile_likes;
CREATE POLICY "profile likes visible to visible members"
ON public.profile_likes
FOR SELECT
TO authenticated
USING (
  public.can_view_member(from_user_id)
  AND public.can_view_member(to_user_id)
  AND NOT public.is_user_suspended((SELECT auth.uid()))
);

DROP POLICY IF EXISTS "members can like other profiles" ON public.profile_likes;
CREATE POLICY "members can like visible profiles"
ON public.profile_likes
FOR INSERT
TO authenticated
WITH CHECK (
  from_user_id = (SELECT auth.uid())
  AND from_user_id <> to_user_id
  AND public.can_view_member(to_user_id)
  AND NOT public.is_user_suspended((SELECT auth.uid()))
);
