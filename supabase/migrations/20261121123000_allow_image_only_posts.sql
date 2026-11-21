ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_body_check;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_body_check
  CHECK (
    char_length(body) <= 1200
    AND (
      char_length(body) >= 1
      OR cardinality(COALESCE(image_urls, '{}'::text[])) > 0
    )
  );
