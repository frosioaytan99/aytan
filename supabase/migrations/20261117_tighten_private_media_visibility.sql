-- Restrict private media reads to objects referenced by content the viewer can currently access.
-- This also prevents expired story files and orphaned uploads from being listed or signed.
DROP POLICY IF EXISTS "Private community media readable by visible members" ON storage.objects;

CREATE POLICY "Private community media readable by visible members"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'community-private'
  AND NOT public.is_user_suspended((SELECT auth.uid()))
  AND CASE
    WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN
      public.can_view_member(((storage.foldername(name))[1])::uuid)
      AND (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = ((storage.foldername(name))[1])::uuid
            AND (
              p.avatar_url = 'private-media:' || name
              OR ('private-media:' || name) = ANY(p.gallery_urls)
            )
        )
        OR EXISTS (
          SELECT 1
          FROM public.posts p
          WHERE p.image_url = 'private-media:' || name
        )
        OR EXISTS (
          SELECT 1
          FROM public.stories s
          WHERE s.media_url = 'private-media:' || name
            AND s.expires_at > now()
        )
      )
    ELSE false
  END
);
