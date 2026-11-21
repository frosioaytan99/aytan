-- Remove the 18+ access gate from Weshbien Individuel.
-- Keep authentication, suspension checks, membership visibility, and content rules.
drop policy if exists "individual posts visible to adult members" on public.individual_posts;
create policy "individual posts visible to signed-in members"
on public.individual_posts for select to authenticated
using (not public.is_user_suspended(auth.uid()) and not public.is_user_suspended(author_id) and public.can_view_member(author_id));

drop policy if exists "adults publish individual posts" on public.individual_posts;
create policy "members publish individual posts"
on public.individual_posts for insert to authenticated
with check (author_id = auth.uid() and not public.is_user_suspended(auth.uid()) and (auth.jwt() ->> 'is_anonymous') is distinct from 'true');

drop policy if exists "adults update own individual posts" on public.individual_posts;
create policy "authors update individual posts"
on public.individual_posts for update to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid() and not public.is_user_suspended(auth.uid()));

drop policy if exists "adults delete own individual posts" on public.individual_posts;
create policy "authors delete individual posts"
on public.individual_posts for delete to authenticated
using (author_id = auth.uid());

drop policy if exists "individual likes visible to adults" on public.individual_post_likes;
create policy "individual likes visible to members"
on public.individual_post_likes for select to authenticated
using (exists (select 1 from public.individual_posts p where p.id = post_id));

drop policy if exists "adults like individual posts" on public.individual_post_likes;
create policy "members like individual posts"
on public.individual_post_likes for insert to authenticated
with check (user_id = auth.uid() and not public.is_user_suspended(auth.uid()) and exists (select 1 from public.individual_posts p where p.id = post_id));

drop policy if exists "adults remove own individual likes" on public.individual_post_likes;
create policy "members remove own individual likes"
on public.individual_post_likes for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "individual comments visible to adults" on public.individual_post_comments;
create policy "individual comments visible to members"
on public.individual_post_comments for select to authenticated
using (exists (select 1 from public.individual_posts p where p.id = post_id));

drop policy if exists "adults comment on individual posts" on public.individual_post_comments;
create policy "members comment on individual posts"
on public.individual_post_comments for insert to authenticated
with check (author_id = auth.uid() and not public.is_user_suspended(auth.uid()) and (auth.jwt() ->> 'is_anonymous') is distinct from 'true' and exists (select 1 from public.individual_posts p where p.id = post_id));

drop policy if exists "adults delete own individual comments" on public.individual_post_comments;
create policy "authors delete own individual comments"
on public.individual_post_comments for delete to authenticated
using (author_id = auth.uid());

drop function if exists public.is_adult_member(uuid);
