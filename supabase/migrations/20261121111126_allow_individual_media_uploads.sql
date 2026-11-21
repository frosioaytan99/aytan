drop policy if exists community_private_uploads_only_through_moderation_api on storage.objects;
create policy community_private_uploads_only_through_moderation_api
on storage.objects as restrictive
for insert to authenticated
with check (
  bucket_id <> 'community-private'
  or (
    bucket_id = 'community-private'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] = 'individual'
    and not is_user_suspended((select auth.uid()))
  )
);