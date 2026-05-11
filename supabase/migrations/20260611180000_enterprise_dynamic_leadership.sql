-- Enterprise dynamic leadership: nafasi zisizo na kikomo, makamati, ugani wa ngazi, viwanja vya kina vya viongozi.
-- Idempotent, RLS + grants kwa authenticated.

-- ——— A) Viongozi — makundi ya uongozi ———
create table if not exists public.leadership_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  level_key text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create index if not exists leadership_categories_active_idx on public.leadership_categories (active, sort_order);
create index if not exists leadership_categories_level_idx on public.leadership_categories (level_key);

-- ——— B) Kamati / makundi ———
create table if not exists public.committee_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  level_key text,
  dayosisi_id uuid references public.dayosisi (id) on delete set null,
  jimbo_id uuid references public.church_jimbo (id) on delete set null,
  tawi_id uuid references public.church_tawi (id) on delete set null,
  structure_entity_id uuid references public.church_structure_entities (id) on delete set null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists committee_groups_geo_idx on public.committee_groups (dayosisi_id, jimbo_id, tawi_id);
create index if not exists committee_groups_structure_idx on public.committee_groups (structure_entity_id);

-- ——— C) Nafasi: ondoa unique kwenye title peke yake (kuruhusu majina sawa kwa ngazi tofauti / maisha ya baadaye) ———
alter table if exists public.leadership_positions
  drop constraint if exists leadership_positions_title_key;

alter table if exists public.leadership_positions
  add column if not exists category_id uuid references public.leadership_categories (id) on delete set null,
  add column if not exists description text,
  add column if not exists code text,
  add column if not exists sort_order int not null default 0;

create index if not exists leadership_positions_category_idx on public.leadership_positions (category_id);
create index if not exists leadership_positions_title_idx on public.leadership_positions (lower(trim(title)));

-- ——— D) Uwakilishi rasmi wa nafasi + kamati (rekodi za ziada) ———
create table if not exists public.leadership_assignments (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null references public.church_viongozi (id) on delete cascade,
  position_id uuid references public.leadership_positions (id) on delete set null,
  committee_group_id uuid references public.committee_groups (id) on delete set null,
  structure_entity_id uuid references public.church_structure_entities (id) on delete set null,
  assignment_label text,
  start_date date,
  end_date date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leadership_assignments_leader_idx on public.leadership_assignments (leader_id);
create index if not exists leadership_assignments_position_idx on public.leadership_assignments (position_id);
create index if not exists leadership_assignments_committee_idx on public.leadership_assignments (committee_group_id);

create table if not exists public.committee_members (
  id uuid primary key default gen_random_uuid(),
  committee_group_id uuid not null references public.committee_groups (id) on delete cascade,
  leader_id uuid not null references public.church_viongozi (id) on delete cascade,
  role_in_committee text,
  created_at timestamptz not null default now(),
  unique (committee_group_id, leader_id)
);

create index if not exists committee_members_leader_idx on public.committee_members (leader_id);

-- ——— E) church_viongozi — maelezo kamili ———
alter table if exists public.church_viongozi
  add column if not exists date_of_birth date,
  add column if not exists national_id text,
  add column if not exists passport_number text,
  add column if not exists church_member_id text,
  add column if not exists whatsapp text,
  add column if not exists mkoa text,
  add column if not exists wilaya text,
  add column if not exists kata text,
  add column if not exists leadership_category_id uuid references public.leadership_categories (id) on delete set null,
  add column if not exists committee_group_id uuid references public.committee_groups (id) on delete set null,
  add column if not exists reporting_leader_id uuid references public.church_viongozi (id) on delete set null,
  add column if not exists structure_entity_id uuid references public.church_structure_entities (id) on delete set null,
  add column if not exists appointment_date date,
  add column if not exists former_leader boolean not null default false,
  add column if not exists reason_for_leaving text,
  add column if not exists education_summary text,
  add column if not exists theology_training text,
  add column if not exists professional_skills text,
  add column if not exists certificates_summary text,
  add column if not exists ministry_gifts text,
  add column if not exists ministry_experience text,
  add column if not exists internal_notes text,
  add column if not exists audit_notes text,
  add column if not exists pdf_issued_by_name text,
  add column if not exists pdf_issued_by_title text;

create index if not exists church_viongozi_reporting_leader_idx on public.church_viongozi (reporting_leader_id);
create index if not exists church_viongozi_committee_idx on public.church_viongozi (committee_group_id);
create index if not exists church_viongozi_structure_entity_idx on public.church_viongozi (structure_entity_id);
create index if not exists church_viongozi_leadership_category_idx on public.church_viongozi (leadership_category_id);

-- ——— RLS ———
alter table public.leadership_categories enable row level security;
alter table public.committee_groups enable row level security;
alter table public.leadership_assignments enable row level security;
alter table public.committee_members enable row level security;

grant select, insert, update, delete on public.leadership_categories to authenticated;
grant select, insert, update, delete on public.committee_groups to authenticated;
grant select, insert, update, delete on public.leadership_assignments to authenticated;
grant select, insert, update, delete on public.committee_members to authenticated;

drop policy if exists leadership_categories_select on public.leadership_categories;
create policy leadership_categories_select on public.leadership_categories
  for select to authenticated
  using (public.portal_has_module_capability ('viongozi', 'view'));

drop policy if exists leadership_categories_insert on public.leadership_categories;
create policy leadership_categories_insert on public.leadership_categories
  for insert to authenticated
  with check (public.portal_has_module_capability ('viongozi', 'create'));

drop policy if exists leadership_categories_update on public.leadership_categories;
create policy leadership_categories_update on public.leadership_categories
  for update to authenticated
  using (public.portal_has_module_capability ('viongozi', 'edit'))
  with check (public.portal_has_module_capability ('viongozi', 'edit'));

drop policy if exists leadership_categories_delete on public.leadership_categories;
create policy leadership_categories_delete on public.leadership_categories
  for delete to authenticated
  using (public.portal_has_module_capability ('viongozi', 'delete'));

drop policy if exists committee_groups_select on public.committee_groups;
create policy committee_groups_select on public.committee_groups
  for select to authenticated
  using (public.portal_has_module_capability ('viongozi', 'view'));

drop policy if exists committee_groups_insert on public.committee_groups;
create policy committee_groups_insert on public.committee_groups
  for insert to authenticated
  with check (
    public.portal_has_module_capability ('viongozi', 'create')
    and public.portal_scope_geo_write_allowed (dayosisi_id, jimbo_id, tawi_id)
  );

drop policy if exists committee_groups_update on public.committee_groups;
create policy committee_groups_update on public.committee_groups
  for update to authenticated
  using (
    public.portal_has_module_capability ('viongozi', 'edit')
    and public.portal_scope_geo_write_allowed (dayosisi_id, jimbo_id, tawi_id)
  )
  with check (
    public.portal_has_module_capability ('viongozi', 'edit')
    and public.portal_scope_geo_write_allowed (dayosisi_id, jimbo_id, tawi_id)
  );

drop policy if exists committee_groups_delete on public.committee_groups;
create policy committee_groups_delete on public.committee_groups
  for delete to authenticated
  using (
    public.portal_has_module_capability ('viongozi', 'delete')
    and public.portal_scope_geo_write_allowed (dayosisi_id, jimbo_id, tawi_id)
  );

drop policy if exists leadership_assignments_select on public.leadership_assignments;
create policy leadership_assignments_select on public.leadership_assignments
  for select to authenticated
  using (public.portal_has_module_capability ('viongozi', 'view'));

drop policy if exists leadership_assignments_insert on public.leadership_assignments;
create policy leadership_assignments_insert on public.leadership_assignments
  for insert to authenticated
  with check (
    public.portal_has_module_capability ('viongozi', 'create')
    and exists (
      select 1
      from public.church_viongozi v
      where v.id = leader_id
        and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

drop policy if exists leadership_assignments_update on public.leadership_assignments;
create policy leadership_assignments_update on public.leadership_assignments
  for update to authenticated
  using (
    public.portal_has_module_capability ('viongozi', 'edit')
    and exists (
      select 1
      from public.church_viongozi v
      where v.id = leader_id
        and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  )
  with check (
    public.portal_has_module_capability ('viongozi', 'edit')
    and exists (
      select 1
      from public.church_viongozi v
      where v.id = leader_id
        and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

drop policy if exists leadership_assignments_delete on public.leadership_assignments;
create policy leadership_assignments_delete on public.leadership_assignments
  for delete to authenticated
  using (
    public.portal_has_module_capability ('viongozi', 'delete')
    and exists (
      select 1
      from public.church_viongozi v
      where v.id = leader_id
        and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

drop policy if exists committee_members_select on public.committee_members;
create policy committee_members_select on public.committee_members
  for select to authenticated
  using (public.portal_has_module_capability ('viongozi', 'view'));

drop policy if exists committee_members_insert on public.committee_members;
create policy committee_members_insert on public.committee_members
  for insert to authenticated
  with check (
    public.portal_has_module_capability ('viongozi', 'create')
    and exists (
      select 1
      from public.church_viongozi v
      where v.id = leader_id
        and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
    and exists (
      select 1
      from public.committee_groups c
      where c.id = committee_group_id
        and public.portal_scope_geo_write_allowed (c.dayosisi_id, c.jimbo_id, c.tawi_id)
    )
  );

drop policy if exists committee_members_update on public.committee_members;
create policy committee_members_update on public.committee_members
  for update to authenticated
  using (
    public.portal_has_module_capability ('viongozi', 'edit')
    and exists (
      select 1
      from public.church_viongozi v
      where v.id = leader_id
        and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  )
  with check (
    public.portal_has_module_capability ('viongozi', 'edit')
    and exists (
      select 1
      from public.church_viongozi v
      where v.id = leader_id
        and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

drop policy if exists committee_members_delete on public.committee_members;
create policy committee_members_delete on public.committee_members
  for delete to authenticated
  using (
    public.portal_has_module_capability ('viongozi', 'delete')
    and exists (
      select 1
      from public.church_viongozi v
      where v.id = leader_id
        and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

-- ——— Realtime (Supabase cloud) ———
do $pub$
begin
  begin
    execute 'alter publication supabase_realtime add table public.leadership_positions';
  exception
    when undefined_object then null;
    when duplicate_object then null;
  end;
  begin
    execute 'alter publication supabase_realtime add table public.leadership_categories';
  exception
    when undefined_object then null;
    when duplicate_object then null;
  end;
  begin
    execute 'alter publication supabase_realtime add table public.committee_groups';
  exception
    when undefined_object then null;
    when duplicate_object then null;
  end;
  begin
    execute 'alter publication supabase_realtime add table public.church_viongozi';
  exception
    when undefined_object then null;
    when duplicate_object then null;
  end;
end
$pub$;
