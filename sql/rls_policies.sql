-- Activer RLS sur tables sensibles
alter table profiles enable row level security;
alter table messages enable row level security;
alter table moderation_logs enable row level security;

-- Profiles: user peut lire/écrire son propre profil
create policy "profiles_self_select" on profiles
  for select using (auth.uid() = id);

create policy "profiles_self_manage" on profiles
  for insert, update, delete using (auth.uid() = id);

-- Messages: sender ou recipient peuvent SELECT the row
create policy "messages_participants_select" on messages
  for select using (auth.uid() = sender or auth.uid() = recipient);

-- Messages: only authenticated user can insert; ensure sender = auth.uid()
create policy "messages_insert" on messages
  for insert with check (auth.uid() = sender);

-- Messages: allow sender or recipient to update (e.g., mark read)
create policy "messages_update" on messages
  for update using (auth.uid() = sender or auth.uid() = recipient)
  with check (auth.uid() = sender or auth.uid() = recipient);

-- Moderation logs: only service role (edge functions using service key) can insert/query.
create policy "moderation_service_insert" on moderation_logs
  for insert using (auth.role() = 'service_role');

-- IMPORTANT: Keep service_role secrets out of frontend. Use Edge Functions or server API for privileged ops.
