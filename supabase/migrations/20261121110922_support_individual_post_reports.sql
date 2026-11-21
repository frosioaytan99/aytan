alter table public.reports drop constraint if exists reports_content_type_check;
alter table public.reports add constraint reports_content_type_check
check (content_type = any (array['post','individual_post','profile','message','question','answer']));