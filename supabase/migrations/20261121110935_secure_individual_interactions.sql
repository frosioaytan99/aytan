drop policy if exists "individual likes visible to members" on public.individual_post_likes;
create policy "individual likes visible to members" on public.individual_post_likes
for select to authenticated using (exists(select 1 from public.individual_posts p where p.id=post_id and can_view_member(p.author_id)));
drop policy if exists "members like individual posts" on public.individual_post_likes;
create policy "members like individual posts" on public.individual_post_likes
for insert to authenticated with check (user_id=(select auth.uid()) and not is_user_suspended((select auth.uid())) and exists(select 1 from public.individual_posts p where p.id=post_id and can_view_member(p.author_id)));
drop policy if exists "individual comments visible to members" on public.individual_post_comments;
create policy "individual comments visible to members" on public.individual_post_comments
for select to authenticated using (exists(select 1 from public.individual_posts p where p.id=post_id and can_view_member(p.author_id)));
drop policy if exists "members comment on individual posts" on public.individual_post_comments;
create policy "members comment on individual posts" on public.individual_post_comments
for insert to authenticated with check (author_id=(select auth.uid()) and not is_user_suspended((select auth.uid())) and ((select auth.jwt() ->> 'is_anonymous') is distinct from 'true') and exists(select 1 from public.individual_posts p where p.id=post_id and can_view_member(p.author_id)));