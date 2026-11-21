create or replace function public.is_adult_member(member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = member_id and p.age >= 18
  );
$$;

drop policy if exists "individual posts visible to signed-in members" on public.individual_posts;
create policy "individual posts visible to adult members"
on public.individual_posts for select to authenticated
using (public.is_adult_member(auth.uid()) and public.is_adult_member(author_id) and not public.is_user_suspended(auth.uid()) and public.can_view_member(author_id));

drop policy if exists "members publish individual posts" on public.individual_posts;
create policy "adults publish individual posts"
on public.individual_posts for insert to authenticated
with check (author_id = auth.uid() and public.is_adult_member(auth.uid()) and not public.is_user_suspended(auth.uid()) and (auth.jwt() ->> 'is_anonymous') is distinct from 'true');

drop policy if exists "authors update individual posts" on public.individual_posts;
create policy "adults update own individual posts"
on public.individual_posts for update to authenticated
using (author_id = auth.uid() and public.is_adult_member(auth.uid()))
with check (author_id = auth.uid() and public.is_adult_member(auth.uid()) and not public.is_user_suspended(auth.uid()));

drop policy if exists "authors delete individual posts" on public.individual_posts;
create policy "adults delete own individual posts"
on public.individual_posts for delete to authenticated
using (author_id = auth.uid() and public.is_adult_member(auth.uid()));

drop policy if exists "individual likes visible to members" on public.individual_post_likes;
create policy "individual likes visible to adults"
on public.individual_post_likes for select to authenticated
using (public.is_adult_member(auth.uid()) and exists (select 1 from public.individual_posts p where p.id = post_id));

drop policy if exists "members like individual posts" on public.individual_post_likes;
create policy "adults like individual posts"
on public.individual_post_likes for insert to authenticated
with check (user_id = auth.uid() and public.is_adult_member(auth.uid()) and not public.is_user_suspended(auth.uid()) and exists (select 1 from public.individual_posts p where p.id = post_id));

drop policy if exists "members remove own individual likes" on public.individual_post_likes;
create policy "adults remove own individual likes"
on public.individual_post_likes for delete to authenticated
using (user_id = auth.uid() and public.is_adult_member(auth.uid()));

drop policy if exists "individual comments visible to members" on public.individual_post_comments;
create policy "individual comments visible to adults"
on public.individual_post_comments for select to authenticated
using (public.is_adult_member(auth.uid()) and exists (select 1 from public.individual_posts p where p.id = post_id));

drop policy if exists "members comment on individual posts" on public.individual_post_comments;
create policy "adults comment on individual posts"
on public.individual_post_comments for insert to authenticated
with check (author_id = auth.uid() and public.is_adult_member(auth.uid()) and not public.is_user_suspended(auth.uid()) and (auth.jwt() ->> 'is_anonymous') is distinct from 'true' and exists (select 1 from public.individual_posts p where p.id = post_id));

drop policy if exists "authors delete own individual comments" on public.individual_post_comments;
create policy "adults delete own individual comments"
on public.individual_post_comments for delete to authenticated
using (author_id = auth.uid() and public.is_adult_member(auth.uid()));
