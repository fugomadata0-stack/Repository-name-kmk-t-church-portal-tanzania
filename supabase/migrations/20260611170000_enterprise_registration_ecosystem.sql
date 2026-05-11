-- Enterprise Registration Ecosystem for KMK(T) structure levels.
-- Idempotent: extends existing tables without removing or overwriting current records.

alter table public.church_structure_entities
  add column if not exists official_name text,
  add column if not exists short_code text,
  add column if not exists logo_url text,
  add column if not exists photo_url text,
  add column if not exists signature_url text,
  add column if not exists website text,
  add column if not exists gps_coordinates text,
  add column if not exists village_street text,
  add column if not exists established_date date,
  add column if not exists leader_name text,
  add column if not exists assistant_leaders text,
  add column if not exists secretary_name text,
  add column if not exists treasurer_name text,
  add column if not exists notes text,
  add column if not exists attachment_urls jsonb not null default '[]'::jsonb,
  add column if not exists custom_fields jsonb not null default '{}'::jsonb,
  add column if not exists category_tags text[] not null default '{}'::text[],
  add column if not exists hierarchy_summary text,
  add column if not exists profile_completeness numeric(5,2) not null default 0,
  add column if not exists children_count integer not null default 0,
  add column if not exists members_count integer not null default 0,
  add column if not exists families_count integer not null default 0,
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid;

alter table public.portal_domain_entities
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid,
  add column if not exists profile_completeness numeric(5,2) not null default 0,
  add column if not exists hierarchy_summary text,
  add column if not exists attachment_urls jsonb not null default '[]'::jsonb,
  add column if not exists category_tags text[] not null default '{}'::text[];

alter table public.church_viongozi
  add column if not exists signature_url text,
  add column if not exists address text,
  add column if not exists gps_coordinates text,
  add column if not exists secretary_notes text,
  add column if not exists attachment_urls jsonb not null default '[]'::jsonb,
  add column if not exists custom_fields jsonb not null default '{}'::jsonb,
  add column if not exists category_tags text[] not null default '{}'::text[],
  add column if not exists profile_completeness numeric(5,2) not null default 0,
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid;

alter table public.church_families
  add column if not exists official_code text,
  add column if not exists photo_url text,
  add column if not exists signature_url text,
  add column if not exists address text,
  add column if not exists gps_coordinates text,
  add column if not exists region_name text,
  add column if not exists district_name text,
  add column if not exists ward_street text,
  add column if not exists established_date date,
  add column if not exists attachment_urls jsonb not null default '[]'::jsonb,
  add column if not exists custom_fields jsonb not null default '{}'::jsonb,
  add column if not exists category_tags text[] not null default '{}'::text[],
  add column if not exists hierarchy_summary text,
  add column if not exists profile_completeness numeric(5,2) not null default 0,
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid;

alter table public.church_members
  add column if not exists signature_url text,
  add column if not exists website text,
  add column if not exists address text,
  add column if not exists gps_coordinates text,
  add column if not exists village_street text,
  add column if not exists attachment_urls jsonb not null default '[]'::jsonb,
  add column if not exists custom_fields jsonb not null default '{}'::jsonb,
  add column if not exists category_tags text[] not null default '{}'::text[],
  add column if not exists hierarchy_summary text,
  add column if not exists profile_completeness numeric(5,2) not null default 0,
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid;

create index if not exists church_structure_entities_parent_level_idx
  on public.church_structure_entities(parent_id, level);
create index if not exists church_structure_entities_profile_idx
  on public.church_structure_entities(profile_completeness);
create index if not exists portal_domain_entities_profile_idx
  on public.portal_domain_entities(module_key, submodule_key, profile_completeness);
create index if not exists portal_domain_entities_extra_gin_idx
  on public.portal_domain_entities using gin (extra);
create index if not exists church_members_custom_fields_gin_idx
  on public.church_members using gin (custom_fields);
create index if not exists church_families_custom_fields_gin_idx
  on public.church_families using gin (custom_fields);

create or replace function public.portal_profile_completeness(payload jsonb, required_keys text[])
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare
  key text;
  total integer := greatest(array_length(required_keys, 1), 1);
  filled integer := 0;
  value text;
begin
  foreach key in array required_keys loop
    value := trim(coalesce(payload ->> key, ''));
    if value <> '' then
      filled := filled + 1;
    end if;
  end loop;
  return round((filled::numeric / total::numeric) * 100, 2);
end;
$$;

create or replace function public.portal_touch_enterprise_registration()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = coalesce(new.created_by, auth.uid());
  end if;
  new.updated_by = auth.uid();
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.portal_touch_structure_enterprise_registration()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = coalesce(new.created_by, auth.uid());
  end if;
  new.updated_by = auth.uid();
  new.updated_at = now();
  new.official_name = nullif(trim(coalesce(new.official_name, new.name)), '');
  new.short_code = nullif(trim(coalesce(new.short_code, new.code)), '');
  new.hierarchy_summary = nullif(trim(coalesce(new.hierarchy_summary, concat_ws(
    ' -> ',
    'KMK(T)',
    nullif(new.parent_name, ''),
    concat(upper(new.level), ': ', new.name),
    nullif(new.region, ''),
    nullif(new.district, '')
  ))), '');
  new.profile_completeness = public.portal_profile_completeness(
    jsonb_build_object(
      'name', new.name,
      'code', new.code,
      'official_name', new.official_name,
      'short_code', new.short_code,
      'description', new.description,
      'established_date', new.established_date,
      'status', new.status,
      'phone', new.phone,
      'email', new.email,
      'website', new.website,
      'address', new.address,
      'gps_coordinates', new.gps_coordinates,
      'region', new.region,
      'district', new.district,
      'ward', new.ward,
      'village_street', new.village_street,
      'parent_name', new.parent_name,
      'leader_name', new.leader_name,
      'assistant_leaders', new.assistant_leaders,
      'secretary_name', new.secretary_name,
      'treasurer_name', new.treasurer_name
    ),
    array[
      'name',
      'code',
      'official_name',
      'short_code',
      'description',
      'established_date',
      'status',
      'phone',
      'email',
      'address',
      'region',
      'district',
      'parent_name',
      'leader_name',
      'secretary_name',
      'treasurer_name'
    ]
  );
  return new;
end;
$$;

create or replace function public.portal_touch_domain_enterprise_registration()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = coalesce(new.created_by, auth.uid());
  end if;
  new.updated_by = auth.uid();
  new.updated_at = now();
  new.profile_completeness = public.portal_profile_completeness(
    coalesce(new.extra, '{}'::jsonb) || jsonb_build_object(
      'title', new.title,
      'reference_code', new.reference_code,
      'category', new.category,
      'details', new.details,
      'event_date', new.event_date,
      'status', new.status
    ),
    array[
      'title',
      'reference_code',
      'category',
      'details',
      'event_date',
      'status',
      'parent_level',
      'mkoa',
      'wilaya',
      'contact_person',
      'phone',
      'email'
    ]
  );
  new.hierarchy_summary = nullif(trim(coalesce(new.extra ->> 'hierarchy_summary', '')), '');
  return new;
end;
$$;

drop trigger if exists trg_portal_domain_entities_enterprise_registration on public.portal_domain_entities;
create trigger trg_portal_domain_entities_enterprise_registration
before insert or update on public.portal_domain_entities
for each row
execute function public.portal_touch_domain_enterprise_registration();

drop trigger if exists trg_church_structure_entities_enterprise_registration on public.church_structure_entities;
create trigger trg_church_structure_entities_enterprise_registration
before insert or update on public.church_structure_entities
for each row
execute function public.portal_touch_structure_enterprise_registration();

drop trigger if exists trg_church_viongozi_enterprise_registration on public.church_viongozi;
create trigger trg_church_viongozi_enterprise_registration
before insert or update on public.church_viongozi
for each row
execute function public.portal_touch_enterprise_registration();

drop trigger if exists trg_church_families_enterprise_registration on public.church_families;
create trigger trg_church_families_enterprise_registration
before insert or update on public.church_families
for each row
execute function public.portal_touch_enterprise_registration();

drop trigger if exists trg_church_members_enterprise_registration on public.church_members;
create trigger trg_church_members_enterprise_registration
before insert or update on public.church_members
for each row
execute function public.portal_touch_enterprise_registration();

drop policy if exists church_structure_entities_insert_enterprise_admins on public.church_structure_entities;
create policy church_structure_entities_insert_enterprise_admins
on public.church_structure_entities
for insert
to authenticated
with check (
  public.current_app_role() in ('super_admin', 'chief_admin', 'national_admin', 'dayosisi_admin', 'jimbo_admin', 'tawi_admin')
);

drop policy if exists church_structure_entities_update_enterprise_admins on public.church_structure_entities;
create policy church_structure_entities_update_enterprise_admins
on public.church_structure_entities
for update
to authenticated
using (
  public.current_app_role() in ('super_admin', 'chief_admin', 'national_admin', 'dayosisi_admin', 'jimbo_admin', 'tawi_admin')
)
with check (
  public.current_app_role() in ('super_admin', 'chief_admin', 'national_admin', 'dayosisi_admin', 'jimbo_admin', 'tawi_admin')
);

drop policy if exists church_structure_entities_delete_enterprise_admins on public.church_structure_entities;
create policy church_structure_entities_delete_enterprise_admins
on public.church_structure_entities
for delete
to authenticated
using (public.current_app_role() in ('super_admin', 'chief_admin'));

grant select, insert, update, delete on public.portal_domain_entities to authenticated;
grant select, insert, update, delete on public.church_structure_entities to authenticated;
grant select, insert, update, delete on public.church_viongozi to authenticated;
grant select, insert, update, delete on public.church_families to authenticated;
grant select, insert, update, delete on public.church_members to authenticated;
