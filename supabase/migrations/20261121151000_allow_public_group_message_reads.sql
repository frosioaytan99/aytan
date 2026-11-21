drop policy if exists "Members can read community messages" on public.community_messages;
create policy "Public groups and members can read messages"
on public.community_messages for select to authenticated
using (
  is_community_member(community_id)
  or exists (select 1 from public.communities c where c.id = community_id and c.is_private = false)
);
