drop policy if exists "individual posts visible to signed-in members" on public.individual_posts;
create policy "individual posts visible to signed-in members" on public.individual_posts
for select to authenticated using (not is_user_suspended((select auth.uid())) and can_view_member(author_id));