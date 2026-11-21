create table if not exists public.individual_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '',
  image_urls text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  constraint individual_posts_body_length check (char_length(body) <= 1200),
  constraint individual_posts_content_present check (char_length(btrim(body)) > 0 or cardinality(image_urls) > 0),
  constraint individual_posts_image_count check (cardinality(image_urls) <= 10)
);
create index if not exists individual_posts_created_at_idx on public.individual_posts (created_at desc);
create table if not exists public.individual_post_likes (
  post_id uuid not null references public.individual_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
);
create table if not exists public.individual_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.individual_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists individual_post_comments_post_idx on public.individual_post_comments(post_id,created_at);
alter table public.individual_posts enable row level security;
alter table public.individual_post_likes enable row level security;
alter table public.individual_post_comments enable row level security;
grant select,insert,update,delete on public.individual_posts to authenticated;
grant select,insert,delete on public.individual_post_likes to authenticated;
grant select,insert,delete on public.individual_post_comments to authenticated;
create policy "individual posts visible to signed-in members" on public.individual_posts
for select to authenticated using (not is_user_suspended((select auth.uid())) and can_view_member(author_id));
create policy "members publish individual posts" on public.individual_posts
for insert to authenticated with check (author_id = (select auth.uid()) and not is_user_suspended((select auth.uid())) and ((select auth.jwt() ->> 'is_anonymous') is distinct from 'true'));
create policy "authors update individual posts" on public.individual_posts
for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()) and not is_user_suspended((select auth.uid())));
create policy "authors delete individual posts" on public.individual_posts
for delete to authenticated using (author_id = (select auth.uid()));
create policy "individual likes visible to members" on public.individual_post_likes
for select to authenticated using (exists(select 1 from public.individual_posts p where p.id=post_id and can_view_member(p.author_id)));
create policy "members like individual posts" on public.individual_post_likes
for insert to authenticated with check (user_id=(select auth.uid()) and not is_user_suspended((select auth.uid())) and exists(select 1 from public.individual_posts p where p.id=post_id and can_view_member(p.author_id)));
create policy "members remove own individual likes" on public.individual_post_likes
for delete to authenticated using (user_id=(select auth.uid()));
create policy "individual comments visible to members" on public.individual_post_comments
for select to authenticated using (exists(select 1 from public.individual_posts p where p.id=post_id and can_view_member(p.author_id)));
create policy "members comment on individual posts" on public.individual_post_comments
for insert to authenticated with check (author_id=(select auth.uid()) and not is_user_suspended((select auth.uid())) and ((select auth.jwt() ->> 'is_anonymous') is distinct from 'true') and exists(select 1 from public.individual_posts p where p.id=post_id and can_view_member(p.author_id)));
create policy "authors delete own individual comments" on public.individual_post_comments
for delete to authenticated using (author_id=(select auth.uid()));
drop policy if exists "Private community media readable by visible members" on storage.objects;
create policy "Private community media readable by visible members" on storage.objects
for select to authenticated using (
 bucket_id='community-private' and not is_user_suspended((select auth.uid()))
 and case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 then can_view_member(((storage.foldername(name))[1])::uuid) and (
   exists(select 1 from profiles p where p.id=((storage.foldername(objects.name))[1])::uuid and (p.avatar_url='private-media:'||objects.name or ('private-media:'||objects.name)=any(p.gallery_urls)))
   or exists(select 1 from posts p where p.image_url='private-media:'||objects.name or ('private-media:'||objects.name)=any(p.image_urls))
   or exists(select 1 from stories s where s.media_url='private-media:'||objects.name and s.expires_at>now())
   or exists(select 1 from individual_posts ip where ('private-media:'||objects.name)=any(ip.image_urls))
 ) else false end
);