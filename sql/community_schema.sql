-- Migration communautaire Aytan. À exécuter dans Supabase SQL Editor après schema.sql.
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists is_private boolean not null default false;

-- L'âge reste dans la base historique mais n'est jamais lisible/modifiable par les membres.
revoke select on public.profiles from anon, authenticated;
grant select (id, display_name, username, avatar_url, bio, is_private, created_at) on public.profiles to authenticated;
revoke insert on public.profiles from anon, authenticated;
grant insert (id, display_name, username, avatar_url, bio, is_private) on public.profiles to authenticated;
revoke update on public.profiles from anon, authenticated;
grant update (display_name, username, avatar_url, bio, is_private) on public.profiles to authenticated;
create unique index if not exists profiles_username_unique on public.profiles (lower(username)) where username is not null;

create table if not exists public.posts (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references auth.users(id) on delete cascade,
 body text not null check (char_length(body) between 1 and 1200),
 image_url text,
 created_at timestamptz not null default now()
);
create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_author_id_idx on public.posts(author_id);

create table if not exists public.reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references auth.users(id) on delete cascade,
 content_type text not null check(content_type in ('post','profile','message')),
 content_id uuid not null,
 reason text not null check(char_length(reason) between 3 and 1000),
 status text not null default 'pending' check(status in ('pending','reviewing','resolved','dismissed')),
 created_at timestamptz not null default now()
);
create index if not exists reports_status_created_idx on public.reports(status,created_at);

create table if not exists public.blocks (
 blocker_id uuid not null references auth.users(id) on delete cascade,
 blocked_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(blocker_id,blocked_id),
 check(blocker_id <> blocked_id)
);

create or replace function public.is_blocked_between(user_a uuid, user_b uuid)
returns boolean language sql stable security definer set search_path = public as $
 select exists(select 1 from public.blocks b where
  (b.blocker_id=user_a and b.blocked_id=user_b) or
  (b.blocker_id=user_b and b.blocked_id=user_a));
$;
revoke all on function public.is_blocked_between(uuid,uuid) from public;
grant execute on function public.is_blocked_between(uuid,uuid) to authenticated;

alter table public.posts enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;

-- Public-facing profile fields are visible to signed-in members only; private profiles remain owner-only.
drop policy if exists profiles_members_read on public.profiles;
create policy profiles_members_read on public.profiles for select to authenticated
 using (id = auth.uid() or (coalesce(is_private,false)=false and not public.is_blocked_between(auth.uid(), profiles.id)));
drop policy if exists profiles_owner_insert on public.profiles;
create policy profiles_owner_insert on public.profiles for insert to authenticated with check (id=auth.uid());
drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());

drop policy if exists posts_members_read on public.posts;
create policy posts_members_read on public.posts for select to authenticated using (
 not public.is_blocked_between(auth.uid(), posts.author_id)
 and exists (select 1 from public.profiles p where p.id=posts.author_id and (p.is_private=false or p.id=auth.uid()))
);
drop policy if exists posts_owner_insert on public.posts;
create policy posts_owner_insert on public.posts for insert to authenticated with check (author_id=auth.uid());
drop policy if exists posts_owner_update on public.posts;
create policy posts_owner_update on public.posts for update to authenticated using (author_id=auth.uid()) with check (author_id=auth.uid());
drop policy if exists posts_owner_delete on public.posts;
create policy posts_owner_delete on public.posts for delete to authenticated using (author_id=auth.uid());

drop policy if exists reports_owner_insert on public.reports;
create policy reports_owner_insert on public.reports for insert to authenticated with check (reporter_id=auth.uid());
drop policy if exists reports_owner_read on public.reports;
create policy reports_owner_read on public.reports for select to authenticated using (reporter_id=auth.uid());

drop policy if exists blocks_owner_read on public.blocks;
create policy blocks_owner_read on public.blocks for select to authenticated using (blocker_id=auth.uid());
drop policy if exists blocks_owner_insert on public.blocks;
create policy blocks_owner_insert on public.blocks for insert to authenticated with check (blocker_id=auth.uid());
drop policy if exists blocks_owner_delete on public.blocks;
create policy blocks_owner_delete on public.blocks for delete to authenticated using (blocker_id=auth.uid());

-- Do not grant public/anon access to community data.

-- Réactions et commentaires des publications.
create table if not exists public.post_likes (
 post_id uuid not null references public.posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(post_id,user_id)
);
create table if not exists public.post_comments (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.posts(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(char_length(body) between 1 and 500),
 created_at timestamptz not null default now()
);
create index if not exists post_comments_post_created_idx on public.post_comments(post_id,created_at);
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
drop policy if exists post_likes_members_read on public.post_likes;
create policy post_likes_members_read on public.post_likes for select to authenticated using (exists(select 1 from public.posts p where p.id=post_likes.post_id));
drop policy if exists post_likes_owner_insert on public.post_likes;
create policy post_likes_owner_insert on public.post_likes for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.posts p where p.id=post_likes.post_id));
drop policy if exists post_likes_owner_delete on public.post_likes;
create policy post_likes_owner_delete on public.post_likes for delete to authenticated using(user_id=auth.uid());
drop policy if exists post_comments_members_read on public.post_comments;
create policy post_comments_members_read on public.post_comments for select to authenticated using (exists(select 1 from public.posts p where p.id=post_comments.post_id));
drop policy if exists post_comments_owner_insert on public.post_comments;
create policy post_comments_owner_insert on public.post_comments for insert to authenticated with check(author_id=auth.uid() and exists(select 1 from public.posts p where p.id=post_comments.post_id));
drop policy if exists post_comments_owner_delete on public.post_comments;
create policy post_comments_owner_delete on public.post_comments for delete to authenticated using(author_id=auth.uid());
