-- Adds admin-reviewed access to anonymous transfers into the Individuel (18+) area.
-- Also indexes missing foreign-key columns and conversation lookups for faster reads.
create table if not exists public.photo_transfer_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists photo_transfer_access_status_requested_idx on public.photo_transfer_access (status, requested_at desc);
alter table public.photo_transfer_access enable row level security;
drop policy if exists photo_transfer_access_read_own on public.photo_transfer_access;
create policy photo_transfer_access_read_own on public.photo_transfer_access for select to authenticated using ((select auth.uid()) = user_id);
grant select on public.photo_transfer_access to authenticated;
revoke insert, update, delete on public.photo_transfer_access from anon, authenticated;
drop policy if exists anonymous_individual_posts_require_transfer_approval on public.individual_posts;
create policy anonymous_individual_posts_require_transfer_approval on public.individual_posts as restrictive for insert to authenticated
with check (is_anonymous = false or exists (select 1 from public.photo_transfer_access a where a.user_id=(select auth.uid()) and a.status='approved'));
do $$
declare r record; idx_name text; col_list text;
begin
 for r in
  select c.conrelid as table_oid,c.conrelid::regclass::text as table_name,array_agg(a.attname order by k.ord) as fk_columns,c.conkey
  from pg_constraint c cross join lateral unnest(c.conkey) with ordinality k(attnum,ord)
  join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum
  where c.contype='f' and c.connamespace='public'::regnamespace
   and not exists(select 1 from pg_index i where i.indrelid=c.conrelid and i.indisvalid and i.indpred is null
    and (select array_agg(x.attnum::smallint order by x.ord) from unnest(i.indkey::smallint[]) with ordinality x(attnum,ord) where x.ord<=cardinality(c.conkey))=c.conkey)
  group by c.oid,c.conrelid,c.conkey
 loop
  idx_name:=left(replace(r.table_name,'.','_')||'_'||array_to_string(r.fk_columns,'_')||'_fk_idx',63);
  select string_agg(format('%I',col),', ') into col_list from unnest(r.fk_columns) as cols(col);
  execute format('create index if not exists %I on %s (%s)',idx_name,r.table_oid::regclass,col_list);
 end loop;
end $$;
create index if not exists messages_sender_recipient_created_idx on public.messages(sender,recipient,created_at desc);
create index if not exists messages_recipient_sender_created_idx on public.messages(recipient,sender,created_at desc);

-- Keep the entire Individuel space adult-only and require admin approval for anonymous transfers.

drop policy if exists anonymous_individual_posts_require_transfer_approval on public.individual_posts;
drop policy if exists individual_posts_adult_access_and_transfer_approval on public.individual_posts;
create policy individual_posts_adult_access_and_transfer_approval
  on public.individual_posts as restrictive
  for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id=(select auth.uid()) and p.age>=18
    )
    and (
      is_anonymous=false
      or exists (
        select 1 from public.photo_transfer_access a
        where a.user_id=(select auth.uid()) and a.status='approved'
      )
    )
  );
drop policy if exists individual_posts_adults_only_read on public.individual_posts;
create policy individual_posts_adults_only_read
  on public.individual_posts as restrictive
  for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.age>=18)
    or exists (select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role in ('admin','moderator'))
  );
