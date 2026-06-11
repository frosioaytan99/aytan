-- Users: on utilisera Supabase Auth (pas nécessaire de créer table users manuellement),
-- mais on peut avoir un profil lié si besoin.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  age int,
  created_at timestamptz default now()
);

-- Messages: simple modèle threadless (1 message = 1 conversation unit)
create table messages (
  id uuid primary key default gen_random_uuid(),
  sender uuid references auth.users(id) on delete cascade,
  recipient uuid references auth.users(id) on delete cascade,
  subject text,
  body text,
  attachment_path text, -- chemin dans Supabase Storage
  is_read boolean default false,
  is_flagged boolean default false, -- pour modération
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on messages (recipient);
create index on messages (sender);
create index on messages (created_at);

-- Optional: simple audit log pour moderation actions
create table moderation_logs (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references messages(id) on delete cascade,
  moderator text,
  action text,
  reason text,
  created_at timestamptz default now()
);
