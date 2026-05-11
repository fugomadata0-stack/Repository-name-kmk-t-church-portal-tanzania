-- ULTRA: viongozi wa muundo kwa kila rekodi + Google Maps + realtime (idempotent).

-- 1) Safu ya kiungo cha Ramani (Google Maps) kwenye kitengo
alter table public.church_structure_entities
  add column if not exists google_maps_url text;

comment on column public.church_structure_entities.google_maps_url is 'Kiungo cha Google Maps au ramani rasmi ya eneo.';

-- 2) Jedwali la viongozi visivyoidhinishwa — idadi isiyo na kikomo kwa entity
create table if not exists public.church_structure_leaders (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.church_structure_entities (id) on delete cascade,
  position_title text not null,
  leadership_category text null,
  full_name text not null,
  phone text null,
  email text null,
  photo_url text null,
  signature_url text null,
  appointment_document_url text null,
  term_start date null,
  term_end date null,
  status text not null default 'active' check (status in ('active', 'ended', 'suspended', 'archived')),
  notes text null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null,
  updated_by uuid null
);

create index if not exists idx_church_structure_leaders_entity
  on public.church_structure_leaders (entity_id, sort_order, status);

create or replace function public.portal_touch_updated_at_church_structure_leaders()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_church_structure_leaders_touch on public.church_structure_leaders;
create trigger trg_church_structure_leaders_touch
before update on public.church_structure_leaders
for each row
execute function public.portal_touch_updated_at_church_structure_leaders();

alter table public.church_structure_leaders enable row level security;

drop policy if exists church_structure_leaders_select_auth on public.church_structure_leaders;
create policy church_structure_leaders_select_auth
on public.church_structure_leaders
for select
to authenticated
using (
  public.current_app_role() in (
    'super_admin',
    'chief_admin',
    'national_admin',
    'office_admin',
    'dayosisi_admin',
    'jimbo_admin',
    'tawi_admin',
    'viewer',
    'editor',
    'finance_admin',
    'secretary',
    'approver',
    'reviewer'
  )
);

drop policy if exists church_structure_leaders_insert_auth on public.church_structure_leaders;
create policy church_structure_leaders_insert_auth
on public.church_structure_leaders
for insert
to authenticated
with check (
  public.current_app_role() in (
    'super_admin',
    'chief_admin',
    'national_admin',
    'dayosisi_admin',
    'jimbo_admin',
    'tawi_admin'
  )
);

drop policy if exists church_structure_leaders_update_auth on public.church_structure_leaders;
create policy church_structure_leaders_update_auth
on public.church_structure_leaders
for update
to authenticated
using (
  public.current_app_role() in (
    'super_admin',
    'chief_admin',
    'national_admin',
    'dayosisi_admin',
    'jimbo_admin',
    'tawi_admin'
  )
)
with check (
  public.current_app_role() in (
    'super_admin',
    'chief_admin',
    'national_admin',
    'dayosisi_admin',
    'jimbo_admin',
    'tawi_admin'
  )
);

drop policy if exists church_structure_leaders_delete_auth on public.church_structure_leaders;
create policy church_structure_leaders_delete_auth
on public.church_structure_leaders
for delete
to authenticated
using (public.current_app_role() in ('super_admin', 'chief_admin'));

grant select, insert, update, delete on public.church_structure_leaders to authenticated;

-- 3) Realtime (kama publication ipo — ongeza tu ikiwa bado sio mwanachama)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'church_structure_entities'
    ) then
      execute 'alter publication supabase_realtime add table public.church_structure_entities';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'church_structure_leaders'
    ) then
      execute 'alter publication supabase_realtime add table public.church_structure_leaders';
    end if;
  end if;
end $$;
