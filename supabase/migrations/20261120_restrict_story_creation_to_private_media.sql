-- Let the database assign the story ID and the exact 24-hour lifetime.
-- Clients may only insert the owner, private-media reference and short caption.
REVOKE INSERT ON TABLE public.stories FROM authenticated;
GRANT INSERT (user_id, media_url, caption) ON TABLE public.stories TO authenticated;

DROP POLICY IF EXISTS "Members can create own stories" ON public.stories;
CREATE POLICY "Members can create own private stories"
ON public.stories
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND media_url LIKE ('private-media:' || (SELECT auth.uid())::text || '/%')
  AND position('..' in media_url) = 0
  AND char_length(media_url) <= 512
  AND char_length(coalesce(caption, '')) <= 180
);
