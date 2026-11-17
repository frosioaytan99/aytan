-- Store all newly uploaded member photos in a private bucket.
-- The legacy community-photos bucket remains unchanged to preserve existing public URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-private',
  'community-private',
  false,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 8388608,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Private community media readable by visible members"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'community-private'
  AND NOT public.is_user_suspended((SELECT auth.uid()))
  AND CASE
    WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN public.can_view_member(((storage.foldername(name))[1])::uuid)
    ELSE false
  END
);

CREATE POLICY "Members upload their own private community media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'community-private'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND NOT public.is_user_suspended((SELECT auth.uid()))
);

CREATE POLICY "Members update their own private community media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'community-private'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'community-private'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Members delete their own private community media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'community-private'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
