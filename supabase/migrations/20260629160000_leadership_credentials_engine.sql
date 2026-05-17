-- Leadership Credentials Engine: catalogs, profile extensions, issue registry, realtime.
-- Additive only — does not rename or drop existing tables.

-- ——— A) Reference: roles by hierarchy level ———
create table if not exists public.leadership_role_catalog (
  id uuid primary key default gen_random_uuid(),
  level_key text not null,
  role_key text not null,
  title_sw text not null default '',
  title_en text not null default '',
  jimbo_leader_variant text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (level_key, role_key)
);

create index if not exists leadership_role_catalog_level_idx on public.leadership_role_catalog (level_key, sort_order);

-- ——— B) Reference: education / training options ———
create table if not exists public.leadership_education_catalog (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'academic',
  option_key text not null,
  label_sw text not null default '',
  label_en text not null default '',
  sort_order int not null default 0,
  active boolean not null default true,
  unique (category, option_key)
);

create index if not exists leadership_education_catalog_cat_idx on public.leadership_education_catalog (category, sort_order);

-- ——— C) Extend leadership_profiles (1:1 church_viongozi) ———
alter table if exists public.leadership_profiles
  add column if not exists gender text,
  add column if not exists church_id_number text,
  add column if not exists leadership_id_number text,
  add column if not exists whatsapp text,
  add column if not exists official_seal_storage_path text,
  add column if not exists marital_status text,
  add column if not exists service_status text not null default 'active',
  add column if not exists years_in_ministry int,
  add column if not exists years_in_current_position int,
  add column if not exists position_started_at date,
  add column if not exists position_ended_at date,
  add column if not exists baptized boolean,
  add column if not exists baptism_date date,
  add column if not exists baptism_place text,
  add column if not exists baptized_by text,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by_name text,
  add column if not exists approved_by_title text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leadership_profiles_service_status_check'
  ) then
    alter table public.leadership_profiles
      add constraint leadership_profiles_service_status_check
      check (service_status in ('active', 'retired', 'acting', 'interim', 'former'));
  end if;
exception when others then
  null;
end $$;

-- ——— D) Credential issue registry (verification serial + audit) ———
create table if not exists public.leadership_credential_issues (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('church_viongozi', 'national_leadership')),
  source_id text not null,
  document_kind text not null check (
    document_kind in (
      'appointment_certificate',
      'executive_cv',
      'leadership_profile_pdf',
      'appointment_letter',
      'service_certificate',
      'identity_card'
    )
  ),
  verification_serial text not null,
  verify_url text,
  hierarchy_label text not null default '',
  position_title text not null default '',
  issued_at timestamptz not null default now(),
  issued_by uuid references auth.users (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists leadership_credential_issues_source_idx
  on public.leadership_credential_issues (source_type, source_id, issued_at desc);

create unique index if not exists leadership_credential_issues_serial_uidx
  on public.leadership_credential_issues (verification_serial);

-- ——— Seed role catalog (idempotent) ———
insert into public.leadership_role_catalog (level_key, role_key, title_sw, title_en, jimbo_leader_variant, sort_order)
values
  ('tawi', 'mwongozi_wa_tawi', 'Mwongozi wa Tawi', 'Branch Leader', null, 10),
  ('tawi', 'katibu_wa_tawi', 'Katibu wa Tawi', 'Branch Secretary', null, 20),
  ('tawi', 'naibu_katibu_wa_tawi', 'Naibu Katibu wa Tawi', 'Deputy Branch Secretary', null, 30),
  ('tawi', 'mhazini_wa_tawi', 'Mhazini wa Tawi', 'Branch Treasurer', null, 40),
  ('jimbo', 'mkuu_wa_jimbo', 'Mkuu wa Jimbo', 'Regional Head', 'Mchungaji / Shemasi', 10),
  ('jimbo', 'katibu_wa_jimbo', 'Katibu wa Jimbo', 'Regional Secretary', null, 20),
  ('jimbo', 'naibu_katibu_wa_jimbo', 'Naibu Katibu wa Jimbo', 'Deputy Regional Secretary', null, 30),
  ('jimbo', 'mhazini_wa_jimbo', 'Mhazini wa Jimbo', 'Regional Treasurer', null, 40),
  ('dayosisi', 'askofu_wa_dayosisi', 'Askofu wa Dayosisi', 'Diocesan Bishop', null, 10),
  ('dayosisi', 'makamu_mwenyekiti', 'Makamu Mwenyekiti wa Dayosisi', 'Diocesan Vice Chair', null, 20),
  ('dayosisi', 'katibu_wa_dayosisi', 'Katibu wa Dayosisi', 'Diocesan Secretary', null, 30),
  ('dayosisi', 'naibu_katibu_wa_dayosisi', 'Naibu Katibu wa Dayosisi', 'Deputy Diocesan Secretary', null, 40),
  ('dayosisi', 'mhazini_wa_dayosisi', 'Mhazini wa Dayosisi', 'Diocesan Treasurer', null, 50),
  ('national', 'askofu_mkuu', 'Askofu Mkuu wa Kanisa', 'Presiding Bishop', null, 10),
  ('national', 'askofu_mkuu_msaidizi', 'Askofu Mkuu Msaidizi', 'Assistant Presiding Bishop', null, 20),
  ('national', 'katibu_mkuu', 'Katibu Mkuu KMK(T)', 'General Secretary', null, 30),
  ('national', 'naibu_katibu_mkuu', 'Naibu Katibu Mkuu KMK(T)', 'Deputy General Secretary', null, 40),
  ('national', 'mhasibu_mkuu', 'Mhasibu Mkuu KMK(T)', 'National Treasurer', null, 50)
on conflict (level_key, role_key) do update set
  title_sw = excluded.title_sw,
  title_en = excluded.title_en,
  jimbo_leader_variant = excluded.jimbo_leader_variant,
  sort_order = excluded.sort_order,
  active = true;

-- ——— Seed education catalog ———
insert into public.leadership_education_catalog (category, option_key, label_sw, label_en, sort_order)
values
  ('academic', 'standard_seven', 'Darasa la Saba', 'Standard Seven', 10),
  ('academic', 'form_four', 'Kidato cha Nne', 'Form Four', 20),
  ('academic', 'form_six', 'Kidato cha Sita', 'Form Six', 30),
  ('academic', 'certificate', 'Cheti', 'Certificate', 40),
  ('academic', 'diploma', 'Diploma', 'Diploma', 50),
  ('academic', 'advanced_diploma', 'Diploma ya Juu', 'Advanced Diploma', 60),
  ('academic', 'degree', 'Shahada', 'Degree', 70),
  ('academic', 'masters', 'Shahada ya Uzamili', 'Masters', 80),
  ('academic', 'phd', 'PhD', 'PhD', 90),
  ('academic', 'professor', 'Profesa', 'Professor', 100),
  ('academic', 'other', 'Nyingine', 'Other', 110),
  ('theology', 'theology', 'Elimu ya Kidini', 'Theology Education', 10),
  ('theology', 'bible_college', 'Chuo cha Biblia', 'Bible College', 20),
  ('theology', 'seminary', 'Seminari', 'Seminary', 30),
  ('theology', 'professional', 'Kozi za Kitaalamu', 'Professional Courses', 40)
on conflict (category, option_key) do update set
  label_sw = excluded.label_sw,
  label_en = excluded.label_en,
  sort_order = excluded.sort_order,
  active = true;

-- ——— RLS ———
alter table public.leadership_role_catalog enable row level security;
alter table public.leadership_education_catalog enable row level security;
alter table public.leadership_credential_issues enable row level security;

grant select on public.leadership_role_catalog to authenticated, anon;
grant select on public.leadership_education_catalog to authenticated, anon;
grant select, insert on public.leadership_credential_issues to authenticated;

drop policy if exists leadership_role_catalog_select on public.leadership_role_catalog;
create policy leadership_role_catalog_select on public.leadership_role_catalog
  for select to authenticated, anon using (active = true);

drop policy if exists leadership_education_catalog_select on public.leadership_education_catalog;
create policy leadership_education_catalog_select on public.leadership_education_catalog
  for select to authenticated, anon using (active = true);

drop policy if exists leadership_credential_issues_select on public.leadership_credential_issues;
create policy leadership_credential_issues_select on public.leadership_credential_issues
  for select to authenticated
  using (
    public.portal_has_module_capability('viongozi', 'view')
    or public.portal_has_module_capability('mipangilio', 'view')
  );

drop policy if exists leadership_credential_issues_insert on public.leadership_credential_issues;
create policy leadership_credential_issues_insert on public.leadership_credential_issues
  for insert to authenticated
  with check (
    public.portal_has_module_capability('viongozi', 'create')
    or public.portal_has_module_capability('viongozi', 'edit')
    or public.portal_has_module_capability('mipangilio', 'edit')
  );

-- ——— Realtime publication ———
do $rl$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leadership_credential_issues'
    ) then
      execute 'alter publication supabase_realtime add table public.leadership_credential_issues';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leadership_role_catalog'
    ) then
      execute 'alter publication supabase_realtime add table public.leadership_role_catalog';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leadership_education_catalog'
    ) then
      execute 'alter publication supabase_realtime add table public.leadership_education_catalog';
    end if;
  end if;
end $rl$;

alter table if exists public.leadership_credential_issues replica identity full;
alter table if exists public.leadership_role_catalog replica identity full;
alter table if exists public.leadership_education_catalog replica identity full;

comment on table public.leadership_credential_issues is
  'Registry of issued leadership PDFs/CVs with verification serial — church_viongozi and national_leadership sources.';
