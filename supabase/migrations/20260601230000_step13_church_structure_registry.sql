-- STEP 13: Church Structure Registry (KMK(T) hierarchy)

create table if not exists public.church_structure_entities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  level text not null check (level in ('kmkt', 'dayosisi', 'jimbo', 'tawi', 'idara', 'huduma', 'taasisi', 'jumuiya')),
  parent_id uuid null references public.church_structure_entities(id) on delete set null,
  parent_name text null,
  region text null,
  district text null,
  ward text null,
  address text null,
  contact_person text null,
  phone text null,
  email text null,
  status text not null default 'active' check (status in ('active', 'inactive', 'pending', 'archived')),
  description text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_church_structure_entities_level on public.church_structure_entities(level);
create index if not exists idx_church_structure_entities_parent_id on public.church_structure_entities(parent_id);
create index if not exists idx_church_structure_entities_status on public.church_structure_entities(status);

create unique index if not exists uq_church_structure_entities_code_lower
  on public.church_structure_entities (lower(code));

create unique index if not exists uq_church_structure_entities_name_parent_level
  on public.church_structure_entities (lower(name), coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), level);

create or replace function public.portal_touch_updated_at_church_structure_entities()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_church_structure_entities_touch_updated_at on public.church_structure_entities;
create trigger trg_church_structure_entities_touch_updated_at
before update on public.church_structure_entities
for each row
execute function public.portal_touch_updated_at_church_structure_entities();

alter table public.church_structure_entities enable row level security;

drop policy if exists church_structure_entities_select_admins on public.church_structure_entities;
create policy church_structure_entities_select_admins
on public.church_structure_entities
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
    'tawi_admin'
  )
);

drop policy if exists church_structure_entities_insert_super_admin on public.church_structure_entities;
create policy church_structure_entities_insert_super_admin
on public.church_structure_entities
for insert
to authenticated
with check (public.current_app_role() = 'super_admin');

drop policy if exists church_structure_entities_update_super_admin on public.church_structure_entities;
create policy church_structure_entities_update_super_admin
on public.church_structure_entities
for update
to authenticated
using (public.current_app_role() = 'super_admin')
with check (public.current_app_role() = 'super_admin');

drop policy if exists church_structure_entities_delete_super_admin on public.church_structure_entities;
create policy church_structure_entities_delete_super_admin
on public.church_structure_entities
for delete
to authenticated
using (public.current_app_role() = 'super_admin');
