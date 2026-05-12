-- Maelezo ya mradi: KILA mtumiaji wa portal anaweza KUSOMA; KUHARIIRI ni kwa wana mipangilio (edit + manage_settings).

create table if not exists public.portal_project_notes (
  id uuid primary key default gen_random_uuid(),
  singleton_key text not null default 'default' unique,
  body text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users (id) on delete set null
);

comment on table public.portal_project_notes is
  'Maelezo ya jumla ya mradi wa portal: kusoma kwa watumiaji wote wenye moduli ya kuona; kuandika kwa wana ruhusa ya mipangilio (edit + manage_settings).';

create or replace function public.portal_project_notes_touch_audit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_portal_project_notes_touch on public.portal_project_notes;
create trigger trg_portal_project_notes_touch
before update on public.portal_project_notes
for each row execute function public.portal_project_notes_touch_audit();

alter table public.portal_project_notes enable row level security;

grant select, update on public.portal_project_notes to authenticated;

-- Soma: mtu yeyote aliyeingia portal na ana angalau moduli moja ya kuona.
drop policy if exists portal_project_notes_select_any_viewer on public.portal_project_notes;
create policy portal_project_notes_select_any_viewer on public.portal_project_notes
for select to authenticated
using (
  exists (
    select 1
    from public.portal_directory_profiles p
    join public.portal_module_matrix m on m.role_key = p.role_key
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and m.can_view = true
  )
);

-- Hariri: mipangilio — lazima edit + manage_settings (sawa na Master Settings).
drop policy if exists portal_project_notes_update_settings_editors on public.portal_project_notes;
create policy portal_project_notes_update_settings_editors on public.portal_project_notes
for update to authenticated
using (
  exists (
    select 1
    from public.portal_directory_profiles p
    join public.portal_module_matrix m on m.role_key = p.role_key
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and m.module_key = 'mipangilio'
      and m.can_edit = true
      and m.can_manage_settings = true
  )
)
with check (
  exists (
    select 1
    from public.portal_directory_profiles p
    join public.portal_module_matrix m on m.role_key = p.role_key
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and m.module_key = 'mipangilio'
      and m.can_edit = true
      and m.can_manage_settings = true
  )
);

insert into public.portal_project_notes (singleton_key, body)
values ('default', '')
on conflict (singleton_key) do nothing;

alter table public.portal_project_notes replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'portal_project_notes'
    ) then
      execute 'alter publication supabase_realtime add table public.portal_project_notes';
    end if;
  end if;
end $$;
