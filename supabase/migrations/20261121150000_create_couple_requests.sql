create table if not exists public.couple_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint couple_requests_distinct_users check (sender_id <> recipient_id)
);
create unique index if not exists couple_requests_pending_pair
  on public.couple_requests (least(sender_id, recipient_id), greatest(sender_id, recipient_id))
  where status = 'pending';
create index if not exists couple_requests_recipient_status
  on public.couple_requests (recipient_id, status, created_at desc);
alter table public.couple_requests enable row level security;
revoke all on public.couple_requests from anon, authenticated;
