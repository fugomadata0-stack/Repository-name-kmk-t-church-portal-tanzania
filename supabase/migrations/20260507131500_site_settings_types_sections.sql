-- Developer / KMK(T) System Builder taxonomy tables
-- Ongeza Aina + Ongeza Sehemu

create table if not exists public.site_settings_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings_sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists site_settings_types_name_lower_uq
  on public.site_settings_types ((lower(name)));

create unique index if not exists site_settings_sections_name_lower_uq
  on public.site_settings_sections ((lower(name)));

alter table public.site_settings_types enable row level security;
alter table public.site_settings_sections enable row level security;

drop policy if exists "site_settings_types_admin_select" on public.site_settings_types;
create policy "site_settings_types_admin_select"
  on public.site_settings_types
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.portal_directory_profiles p
      where p.auth_user_id = auth.uid()
        and p.role_key in ('super_admin', 'chief_admin', 'national_admin', 'office_admin')
        and p.status = 'active'
    )
  );

drop policy if exists "site_settings_types_admin_write" on public.site_settings_types;
create policy "site_settings_types_admin_write"
  on public.site_settings_types
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.portal_directory_profiles p
      where p.auth_user_id = auth.uid()
        and p.role_key in ('super_admin', 'chief_admin', 'national_admin', 'office_admin')
        and p.status = 'active'
    )
  )
  with check (
    exists (
      select 1
      from public.portal_directory_profiles p
      where p.auth_user_id = auth.uid()
        and p.role_key in ('super_admin', 'chief_admin', 'national_admin', 'office_admin')
        and p.status = 'active'
    )
  );

drop policy if exists "site_settings_sections_admin_select" on public.site_settings_sections;
create policy "site_settings_sections_admin_select"
  on public.site_settings_sections
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.portal_directory_profiles p
      where p.auth_user_id = auth.uid()
        and p.role_key in ('super_admin', 'chief_admin', 'national_admin', 'office_admin')
        and p.status = 'active'
    )
  );

drop policy if exists "site_settings_sections_admin_write" on public.site_settings_sections;
create policy "site_settings_sections_admin_write"
  on public.site_settings_sections
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.portal_directory_profiles p
      where p.auth_user_id = auth.uid()
        and p.role_key in ('super_admin', 'chief_admin', 'national_admin', 'office_admin')
        and p.status = 'active'
    )
  )
  with check (
    exists (
      select 1
      from public.portal_directory_profiles p
      where p.auth_user_id = auth.uid()
        and p.role_key in ('super_admin', 'chief_admin', 'national_admin', 'office_admin')
        and p.status = 'active'
    )
  );

grant select, insert, update, delete on public.site_settings_types to authenticated;
grant select, insert, update, delete on public.site_settings_sections to authenticated;
