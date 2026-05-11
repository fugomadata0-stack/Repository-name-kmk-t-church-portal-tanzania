-- Enterprise church identity profile expansion.
-- Read access remains available for portal/public display; writes are restricted to chief_admin/super_admin.

create table if not exists public.church_identity (
  id bigserial primary key,
  singleton_key text not null default 'default',
  official_church_name text not null default '',
  country text not null default 'Tanzania',
  headquarters text not null default '',
  main_phone text not null default '',
  main_email text not null default '',
  postal_address text not null default '',
  website_url text not null default 'https://v0-church-portal-tanzania.vercel.app',
  vision text not null default '',
  mission text not null default '',
  core_values text not null default '',
  logo_url text not null default '',
  favicon_url text not null default '',
  cover_image_url text not null default '',
  primary_color text not null default '#0B1F3A',
  secondary_color text not null default '#123C69',
  accent_color text not null default '#D4AF37',
  leader_askofu_mkuu text not null default '',
  leader_katibu_mkuu text not null default '',
  leader_mwenyekiti text not null default '',
  leader_mweka_hazina text not null default '',
  leader_askofu_mkuu_photo_url text not null default '',
  leader_katibu_mkuu_photo_url text not null default '',
  leader_mwenyekiti_photo_url text not null default '',
  leader_mweka_hazina_photo_url text not null default '',
  leader_askofu_mkuu_signature_url text not null default '',
  leader_katibu_mkuu_signature_url text not null default '',
  leader_mwenyekiti_signature_url text not null default '',
  leader_mweka_hazina_signature_url text not null default '',
  facebook_url text not null default '',
  youtube_url text not null default '',
  instagram_url text not null default '',
  whatsapp_url text not null default '',
  region text not null default '',
  district text not null default '',
  gps_coordinates text not null default '',
  google_maps_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.church_identity
  add column if not exists singleton_key text not null default 'default',
  add column if not exists official_church_name text not null default '',
  add column if not exists country text not null default 'Tanzania',
  add column if not exists headquarters text not null default '',
  add column if not exists main_phone text not null default '',
  add column if not exists main_email text not null default '',
  add column if not exists postal_address text not null default '',
  add column if not exists website_url text not null default 'https://v0-church-portal-tanzania.vercel.app',
  add column if not exists vision text not null default '',
  add column if not exists mission text not null default '',
  add column if not exists core_values text not null default '',
  add column if not exists logo_url text,
  add column if not exists favicon_url text,
  add column if not exists cover_image_url text,
  add column if not exists primary_color text default '#0B1F3A',
  add column if not exists secondary_color text default '#123C69',
  add column if not exists accent_color text default '#D4AF37',
  add column if not exists leader_askofu_mkuu text,
  add column if not exists leader_katibu_mkuu text,
  add column if not exists leader_mwenyekiti text,
  add column if not exists leader_mweka_hazina text,
  add column if not exists leader_askofu_mkuu_photo_url text,
  add column if not exists leader_katibu_mkuu_photo_url text,
  add column if not exists leader_mwenyekiti_photo_url text,
  add column if not exists leader_mweka_hazina_photo_url text,
  add column if not exists leader_askofu_mkuu_signature_url text,
  add column if not exists leader_katibu_mkuu_signature_url text,
  add column if not exists leader_mwenyekiti_signature_url text,
  add column if not exists leader_mweka_hazina_signature_url text,
  add column if not exists facebook_url text,
  add column if not exists youtube_url text,
  add column if not exists instagram_url text,
  add column if not exists whatsapp_url text,
  add column if not exists region text,
  add column if not exists district text,
  add column if not exists gps_coordinates text,
  add column if not exists google_maps_url text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz default now();

update public.church_identity
set
  singleton_key = coalesce(nullif(singleton_key, ''), 'default'),
  official_church_name = coalesce(official_church_name, ''),
  country = coalesce(nullif(country, ''), 'Tanzania'),
  headquarters = coalesce(headquarters, ''),
  main_phone = coalesce(main_phone, ''),
  main_email = case
    when regexp_replace(regexp_replace(coalesce(main_email, ''), '^mailt:', 'mailto:', 'i'), '^mailto:', '', 'i')
      ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    then regexp_replace(regexp_replace(coalesce(main_email, ''), '^mailt:', 'mailto:', 'i'), '^mailto:', '', 'i')
    else ''
  end,
  postal_address = coalesce(postal_address, ''),
  website_url = case
    when coalesce(website_url, '') ~* '^https?://' then website_url
    else 'https://v0-church-portal-tanzania.vercel.app'
  end,
  vision = coalesce(vision, ''),
  mission = coalesce(mission, ''),
  core_values = coalesce(core_values, ''),
  logo_url = coalesce(logo_url, ''),
  favicon_url = coalesce(favicon_url, ''),
  cover_image_url = coalesce(cover_image_url, ''),
  primary_color = case when coalesce(primary_color, '') ~ '^#[0-9A-Fa-f]{6}$' then primary_color else '#0B1F3A' end,
  secondary_color = case when coalesce(secondary_color, '') ~ '^#[0-9A-Fa-f]{6}$' then secondary_color else '#123C69' end,
  accent_color = case when coalesce(accent_color, '') ~ '^#[0-9A-Fa-f]{6}$' then accent_color else '#D4AF37' end,
  leader_askofu_mkuu = coalesce(leader_askofu_mkuu, ''),
  leader_katibu_mkuu = coalesce(leader_katibu_mkuu, ''),
  leader_mwenyekiti = coalesce(leader_mwenyekiti, ''),
  leader_mweka_hazina = coalesce(leader_mweka_hazina, ''),
  leader_askofu_mkuu_photo_url = coalesce(leader_askofu_mkuu_photo_url, ''),
  leader_katibu_mkuu_photo_url = coalesce(leader_katibu_mkuu_photo_url, ''),
  leader_mwenyekiti_photo_url = coalesce(leader_mwenyekiti_photo_url, ''),
  leader_mweka_hazina_photo_url = coalesce(leader_mweka_hazina_photo_url, ''),
  leader_askofu_mkuu_signature_url = coalesce(leader_askofu_mkuu_signature_url, ''),
  leader_katibu_mkuu_signature_url = coalesce(leader_katibu_mkuu_signature_url, ''),
  leader_mwenyekiti_signature_url = coalesce(leader_mwenyekiti_signature_url, ''),
  leader_mweka_hazina_signature_url = coalesce(leader_mweka_hazina_signature_url, ''),
  facebook_url = coalesce(facebook_url, ''),
  youtube_url = coalesce(youtube_url, ''),
  instagram_url = coalesce(instagram_url, ''),
  whatsapp_url = coalesce(whatsapp_url, ''),
  region = coalesce(region, ''),
  district = coalesce(district, ''),
  gps_coordinates = coalesce(gps_coordinates, ''),
  google_maps_url = coalesce(google_maps_url, ''),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.church_identity
  alter column singleton_key set default 'default',
  alter column singleton_key set not null,
  alter column official_church_name set default '',
  alter column official_church_name set not null,
  alter column country set default 'Tanzania',
  alter column country set not null,
  alter column headquarters set default '',
  alter column headquarters set not null,
  alter column main_phone set default '',
  alter column main_phone set not null,
  alter column main_email set default '',
  alter column main_email set not null,
  alter column postal_address set default '',
  alter column postal_address set not null,
  alter column website_url set default 'https://v0-church-portal-tanzania.vercel.app',
  alter column website_url set not null,
  alter column vision set default '',
  alter column vision set not null,
  alter column mission set default '',
  alter column mission set not null,
  alter column core_values set default '',
  alter column core_values set not null,
  alter column logo_url set default '',
  alter column logo_url set not null,
  alter column favicon_url set default '',
  alter column favicon_url set not null,
  alter column cover_image_url set default '',
  alter column cover_image_url set not null,
  alter column primary_color set default '#0B1F3A',
  alter column primary_color set not null,
  alter column secondary_color set default '#123C69',
  alter column secondary_color set not null,
  alter column accent_color set default '#D4AF37',
  alter column accent_color set not null,
  alter column leader_askofu_mkuu set default '',
  alter column leader_askofu_mkuu set not null,
  alter column leader_katibu_mkuu set default '',
  alter column leader_katibu_mkuu set not null,
  alter column leader_mwenyekiti set default '',
  alter column leader_mwenyekiti set not null,
  alter column leader_mweka_hazina set default '',
  alter column leader_mweka_hazina set not null,
  alter column leader_askofu_mkuu_photo_url set default '',
  alter column leader_askofu_mkuu_photo_url set not null,
  alter column leader_katibu_mkuu_photo_url set default '',
  alter column leader_katibu_mkuu_photo_url set not null,
  alter column leader_mwenyekiti_photo_url set default '',
  alter column leader_mwenyekiti_photo_url set not null,
  alter column leader_mweka_hazina_photo_url set default '',
  alter column leader_mweka_hazina_photo_url set not null,
  alter column leader_askofu_mkuu_signature_url set default '',
  alter column leader_askofu_mkuu_signature_url set not null,
  alter column leader_katibu_mkuu_signature_url set default '',
  alter column leader_katibu_mkuu_signature_url set not null,
  alter column leader_mwenyekiti_signature_url set default '',
  alter column leader_mwenyekiti_signature_url set not null,
  alter column leader_mweka_hazina_signature_url set default '',
  alter column leader_mweka_hazina_signature_url set not null,
  alter column facebook_url set default '',
  alter column facebook_url set not null,
  alter column youtube_url set default '',
  alter column youtube_url set not null,
  alter column instagram_url set default '',
  alter column instagram_url set not null,
  alter column whatsapp_url set default '',
  alter column whatsapp_url set not null,
  alter column region set default '',
  alter column region set not null,
  alter column district set default '',
  alter column district set not null,
  alter column gps_coordinates set default '',
  alter column gps_coordinates set not null,
  alter column google_maps_url set default '',
  alter column google_maps_url set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

with ranked as (
  select id, row_number() over (order by id) as rn
  from public.church_identity
  where singleton_key = 'default'
)
update public.church_identity ci
set singleton_key = 'legacy-' || ci.id::text
from ranked r
where ci.id = r.id
  and r.rn > 1;

create unique index if not exists church_identity_singleton_key_uidx
on public.church_identity (singleton_key);

create index if not exists church_identity_updated_at_idx
on public.church_identity (updated_at desc);

insert into public.church_identity (
  singleton_key,
  official_church_name,
  country,
  website_url,
  primary_color,
  secondary_color,
  accent_color
)
values (
  'default',
  'KANISA LA MENNONITE LA KIINJILI TANZANIA',
  'Tanzania',
  'https://v0-church-portal-tanzania.vercel.app',
  '#0B1F3A',
  '#123C69',
  '#D4AF37'
)
on conflict (singleton_key) do update
set
  website_url = coalesce(nullif(church_identity.website_url, ''), excluded.website_url),
  primary_color = coalesce(nullif(church_identity.primary_color, ''), excluded.primary_color),
  secondary_color = coalesce(nullif(church_identity.secondary_color, ''), excluded.secondary_color),
  accent_color = coalesce(nullif(church_identity.accent_color, ''), excluded.accent_color);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'church_identity_singleton_key_not_blank_chk'
  ) then
    alter table public.church_identity
      add constraint church_identity_singleton_key_not_blank_chk
      check (length(trim(singleton_key)) > 0)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'church_identity_email_format_chk'
  ) then
    alter table public.church_identity
      add constraint church_identity_email_format_chk
      check (
        main_email = ''
        or regexp_replace(main_email, '^mailto:', '', 'i') ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'church_identity_website_url_chk'
  ) then
    alter table public.church_identity
      add constraint church_identity_website_url_chk
      check (website_url ~* '^https?://')
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'church_identity_brand_colors_chk'
  ) then
    alter table public.church_identity
      add constraint church_identity_brand_colors_chk
      check (
        primary_color ~ '^#[0-9A-Fa-f]{6}$'
        and secondary_color ~ '^#[0-9A-Fa-f]{6}$'
        and accent_color ~ '^#[0-9A-Fa-f]{6}$'
      )
      not valid;
  end if;
end $$;

alter table public.church_identity validate constraint church_identity_singleton_key_not_blank_chk;
alter table public.church_identity validate constraint church_identity_email_format_chk;
alter table public.church_identity validate constraint church_identity_website_url_chk;
alter table public.church_identity validate constraint church_identity_brand_colors_chk;

create or replace function public.church_identity_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.main_email := regexp_replace(regexp_replace(coalesce(new.main_email, ''), '^mailt:', 'mailto:', 'i'), '^mailto:', '', 'i');
  if new.main_email <> '' and new.main_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    new.main_email := '';
  end if;
  if coalesce(new.website_url, '') !~* '^https?://' then
    new.website_url := 'https://v0-church-portal-tanzania.vercel.app';
  end if;
  if coalesce(new.primary_color, '') !~ '^#[0-9A-Fa-f]{6}$' then
    new.primary_color := '#0B1F3A';
  end if;
  if coalesce(new.secondary_color, '') !~ '^#[0-9A-Fa-f]{6}$' then
    new.secondary_color := '#123C69';
  end if;
  if coalesce(new.accent_color, '') !~ '^#[0-9A-Fa-f]{6}$' then
    new.accent_color := '#D4AF37';
  end if;
  return new;
end;
$$;

drop trigger if exists church_identity_touch_updated_at on public.church_identity;
create trigger church_identity_touch_updated_at
before insert or update on public.church_identity
for each row execute procedure public.church_identity_touch_updated_at();

alter table public.church_identity enable row level security;

revoke all on public.church_identity from anon;
grant select on public.church_identity to anon;
grant select, insert, update, delete on public.church_identity to authenticated;

do $$
begin
  if to_regclass('public.church_identity_id_seq') is not null then
    grant usage, select on sequence public.church_identity_id_seq to authenticated;
  end if;
end $$;

drop policy if exists "church_identity_all_auth" on public.church_identity;
drop policy if exists "church_identity_anon_demo" on public.church_identity;
drop policy if exists "identity_rw_strict" on public.church_identity;
drop policy if exists church_identity_select_public_enterprise on public.church_identity;
drop policy if exists church_identity_select_auth_enterprise on public.church_identity;
drop policy if exists church_identity_insert_admin_enterprise on public.church_identity;
drop policy if exists church_identity_update_admin_enterprise on public.church_identity;
drop policy if exists church_identity_delete_admin_enterprise on public.church_identity;

create policy church_identity_select_public_enterprise
on public.church_identity
for select
to anon
using (true);

create policy church_identity_select_auth_enterprise
on public.church_identity
for select
to authenticated
using (true);

create policy church_identity_insert_admin_enterprise
on public.church_identity
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

create policy church_identity_update_admin_enterprise
on public.church_identity
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

create policy church_identity_delete_admin_enterprise
on public.church_identity
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
