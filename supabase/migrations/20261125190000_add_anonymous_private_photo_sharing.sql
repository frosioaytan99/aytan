-- Allow adult-profile members to share their own private-message photos anonymously.
-- The real author_id remains stored for moderator review and accountability.
alter table public.individual_posts
  add column if not exists is_anonymous boolean not null default false;
drop policy if exists "members publish individual posts" on public.individual_posts;
create policy "members publish individual posts"
on public.individual_posts for insert to authenticated
with check (
  author_id = auth.uid()
  and not public.is_user_suspended(auth.uid())
  and (auth.jwt() ->> 'is_anonymous') is distinct from 'true'
  and (
    is_anonymous = false
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.age >= 18)
  )
);
