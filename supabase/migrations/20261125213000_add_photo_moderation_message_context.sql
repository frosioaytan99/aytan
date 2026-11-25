alter table public.ai_moderation_logs
  add column if not exists context jsonb not null default '{}'::jsonb;
