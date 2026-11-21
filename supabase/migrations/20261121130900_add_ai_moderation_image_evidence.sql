alter table public.ai_moderation_logs
  add column if not exists image_path text;
