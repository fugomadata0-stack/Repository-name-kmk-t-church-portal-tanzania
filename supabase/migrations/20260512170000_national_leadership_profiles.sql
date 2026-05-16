-- Enterprise national leadership configuration (4 fixed roles).
-- Migrates legacy church_identity leader_* columns; removes Mwenyekiti / old flat fields.

create table if not exists public.national_leadership_profiles (
  role_key text primary key
    check (
      role_key in (
        'askofu_mkuu',
        'katibu_mkuu',
        'naibu_katibu_mkuu',
        'mhasibu_mkuu'
      )
    ),
  display_title_sw text not null default '',
  display_title_en text not null default '',
  full_name text not null default '',
  gender text not null default '',
  biography text not null default '',
  leadership_quote text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  website_url text not null default '',
  country text not null default 'Tanzania',
  region text not null default '',
  district text not null default '',
  ward text not null default '',
  physical_address text not null default '',
  profile_photo_url text not null default '',
  signature_url text not null default '',
  cv_pdf_url text not null default '',
  attachments_json jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'inactive')),
  start_date date,
  end_date date,
  term_years integer,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists national_leadership_profiles_sort_idx
  on public.national_leadership_profiles (sort_order asc, role_key asc);

create index if not exists national_leadership_profiles_updated_idx
  on public.national_leadership_profiles (updated_at desc);

insert into public.national_leadership_profiles (
  role_key, display_title_sw, display_title_en, sort_order
) values
  ('askofu_mkuu', 'ASKOFU MKUU', 'Presiding Bishop', 1),
  ('katibu_mkuu', 'KATIBU MKUU', 'General Secretary', 2),
  ('naibu_katibu_mkuu', 'NAIBU KATIBU MKUU', 'Deputy General Secretary', 3),
  ('mhasibu_mkuu', 'MHASIBU MKUU', 'Chief Accountant / Treasurer', 4)
on conflict (role_key) do nothing;

-- Migrate from legacy church_identity flat columns (best-effort).
update public.national_leadership_profiles n
set
  full_name = coalesce(nullif(ci.leader_askofu_mkuu, ''), n.full_name),
  profile_photo_url = coalesce(nullif(ci.leader_askofu_mkuu_photo_url, ''), n.profile_photo_url),
  signature_url = coalesce(nullif(ci.leader_askofu_mkuu_signature_url, ''), n.signature_url),
  updated_at = now()
from public.church_identity ci
where ci.singleton_key = 'default'
  and n.role_key = 'askofu_mkuu';

update public.national_leadership_profiles n
set
  full_name = coalesce(nullif(ci.leader_katibu_mkuu, ''), n.full_name),
  profile_photo_url = coalesce(nullif(ci.leader_katibu_mkuu_photo_url, ''), n.profile_photo_url),
  signature_url = coalesce(nullif(ci.leader_katibu_mkuu_signature_url, ''), n.signature_url),
  updated_at = now()
from public.church_identity ci
where ci.singleton_key = 'default'
  and n.role_key = 'katibu_mkuu';

update public.national_leadership_profiles n
set
  full_name = coalesce(nullif(ci.leader_mweka_hazina, ''), n.full_name),
  profile_photo_url = coalesce(nullif(ci.leader_mweka_hazina_photo_url, ''), n.profile_photo_url),
  signature_url = coalesce(nullif(ci.leader_mweka_hazina_signature_url, ''), n.signature_url),
  updated_at = now()
from public.church_identity ci
where ci.singleton_key = 'default'
  and n.role_key = 'mhasibu_mkuu';

-- Naibu Katibu Mkuu: no legacy column — remains seeded empty.

-- Drop legacy leadership columns from church_identity (Mwenyekiti / flat officers removed).
alter table public.church_identity drop column if exists leader_askofu_mkuu;
alter table public.church_identity drop column if exists leader_katibu_mkuu;
alter table public.church_identity drop column if exists leader_mwenyekiti;
alter table public.church_identity drop column if exists leader_mweka_hazina;
alter table public.church_identity drop column if exists leader_askofu_mkuu_photo_url;
alter table public.church_identity drop column if exists leader_katibu_mkuu_photo_url;
alter table public.church_identity drop column if exists leader_mwenyekiti_photo_url;
alter table public.church_identity drop column if exists leader_mweka_hazina_photo_url;
alter table public.church_identity drop column if exists leader_askofu_mkuu_signature_url;
alter table public.church_identity drop column if exists leader_katibu_mkuu_signature_url;
alter table public.church_identity drop column if exists leader_mwenyekiti_signature_url;
alter table public.church_identity drop column if exists leader_mweka_hazina_signature_url;

create or replace function public.national_leadership_profiles_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists national_leadership_profiles_touch_updated_at on public.national_leadership_profiles;
create trigger national_leadership_profiles_touch_updated_at
before insert or update on public.national_leadership_profiles
for each row execute procedure public.national_leadership_profiles_touch_updated_at();

alter table public.national_leadership_profiles enable row level security;

alter table public.national_leadership_profiles replica identity full;

grant select on public.national_leadership_profiles to anon;
grant select, insert, update, delete on public.national_leadership_profiles to authenticated;

drop policy if exists national_leadership_select_public on public.national_leadership_profiles;
drop policy if exists national_leadership_select_auth on public.national_leadership_profiles;
drop policy if exists national_leadership_insert_admin on public.national_leadership_profiles;
drop policy if exists national_leadership_update_admin on public.national_leadership_profiles;
drop policy if exists national_leadership_delete_admin on public.national_leadership_profiles;

create policy national_leadership_select_public
on public.national_leadership_profiles
for select
to anon
using (true);

create policy national_leadership_select_auth
on public.national_leadership_profiles
for select
to authenticated
using (true);

create policy national_leadership_insert_admin
on public.national_leadership_profiles
for insert
to authenticated
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('chief_admin', 'super_admin')
  or exists (
    select 1
    from public.portal_directory_profiles p
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and p.role_key in ('chief_admin', 'super_admin')
  )
);

create policy national_leadership_update_admin
on public.national_leadership_profiles
for update
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('chief_admin', 'super_admin')
  or exists (
    select 1
    from public.portal_directory_profiles p
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and p.role_key in ('chief_admin', 'super_admin')
  )
)
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('chief_admin', 'super_admin')
  or exists (
    select 1
    from public.portal_directory_profiles p
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and p.role_key in ('chief_admin', 'super_admin')
  )
);

create policy national_leadership_delete_admin
on public.national_leadership_profiles
for delete
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('chief_admin', 'super_admin')
  or exists (
    select 1
    from public.portal_directory_profiles p
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and p.role_key in ('chief_admin', 'super_admin')
  )
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'national_leadership_profiles'
    ) then
      execute 'alter publication supabase_realtime add table public.national_leadership_profiles';
    end if;
  end if;
end $$;
