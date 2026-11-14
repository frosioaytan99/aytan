-- Politiques RLS initiales corrigées pour Supabase.
alter table public.profiles enable row level security;
alter table public.messages enable row level security;
alter table public.moderation_logs enable row level security;

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists profiles_self_delete on public.profiles;
create policy profiles_self_delete on public.profiles for delete to authenticated using (auth.uid() = id);

drop policy if exists messages_participants_select on public.messages;
create policy messages_participants_select on public.messages for select to authenticated using (auth.uid() = sender or auth.uid() = recipient);
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated with check (auth.uid() = sender);
drop policy if exists messages_update on public.messages;
drop policy if exists messages_recipient_mark_read on public.messages;
create policy messages_recipient_mark_read on public.messages for update to authenticated using (auth.uid() = recipient) with check (auth.uid() = recipient);
drop policy if exists messages_sender_delete on public.messages;
create policy messages_sender_delete on public.messages for delete to authenticated using (auth.uid() = sender);

-- Un destinataire peut uniquement modifier le statut de lecture, pas le contenu du message.
revoke update on public.messages from authenticated;
grant update (is_read) on public.messages to authenticated;

drop policy if exists moderation_service_insert on public.moderation_logs;
create policy moderation_service_insert on public.moderation_logs for insert to service_role with check (true);
