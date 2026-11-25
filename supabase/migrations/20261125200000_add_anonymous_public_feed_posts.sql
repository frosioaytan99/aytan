-- Allow anonymous image transfers to the all-ages public feed.
-- Keep the real author_id for moderation and accountability.
alter table public.posts
  add column if not exists is_anonymous boolean not null default false;
