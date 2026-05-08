-- =============================================================================
-- KMT Site Branding v1 — jedwali moja (branding_settings) + Storage bucket
-- Endesha kwenye Supabase SQL Editor baada ya phase16-security-rls.sql
-- (inahitaji public.current_app_role() ikiwa unatumia sera za JWT)
-- =============================================================================

create table if not exists public.branding_settings (
  id uuid primary key default gen_random_uuid(),
  logo text default '',
  favicon text default '',
  primary_color text default '#1a4ec3',
  secondary_color text default '#12254e',
  accent_color text default '#d8b14a',
  hero_bg text default '',
  jesus_image text default '',
  cross_image text default '',
  bible_image text default '',
  church_image text default '',
  theme_mode text default 'dark',
  footer_text text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_branding_settings_updated on public.branding_settings (updated_at desc);

alter table public.branding_settings add column if not exists cross_image text default '';

-- Safu moja ya utambulisho wa tovuti (hiari: futa extras ukihifadhi mstari mmoja)
comment on table public.branding_settings is 'Public branding URLs na rangi — row moja inatosha';

insert into public.branding_settings (
  logo, favicon, primary_color, secondary_color, accent_color,
  hero_bg, jesus_image, cross_image, bible_image, church_image, theme_mode, footer_text
)
select '', '', '#1a4ec3', '#12254e', '#d8b14a', '', '', '', '', '', 'dark', 'KMT Church Tanzania Portal'
where not exists (select 1 from public.branding_settings limit 1);

create or replace function public.kmt_touch_branding_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_branding_settings_touch on public.branding_settings;
create trigger trg_branding_settings_touch
before update on public.branding_settings
for each row execute function public.kmt_touch_branding_updated_at();

alter table public.branding_settings enable row level security;

drop policy if exists "branding_public_read" on public.branding_settings;
create policy "branding_public_read"
on public.branding_settings
for select
to anon, authenticated
using (true);

drop policy if exists "branding_chief_super_insert" on public.branding_settings;
create policy "branding_chief_super_insert"
on public.branding_settings
for insert
to authenticated
with check (public.current_app_role() in ('chief_admin', 'super_admin'));

drop policy if exists "branding_chief_super_update" on public.branding_settings;
create policy "branding_chief_super_update"
on public.branding_settings
for update
to authenticated
using (public.current_app_role() in ('chief_admin', 'super_admin'))
with check (public.current_app_role() in ('chief_admin', 'super_admin'));

drop policy if exists "branding_chief_super_delete" on public.branding_settings;
create policy "branding_chief_super_delete"
on public.branding_settings
for delete
to authenticated
using (public.current_app_role() in ('chief_admin', 'super_admin'));

-- ---------- Storage: bucket ya umma kusoma URL ----------
insert into storage.buckets (id, name, public)
values ('site-branding', 'site-branding', true)
on conflict (id) do update set public = excluded.public;

-- Vitendo vya storage.objects (kiini cha RLS)
drop policy if exists "site_branding_public_read" on storage.objects;
create policy "site_branding_public_read"
on storage.objects for select
to public
using (bucket_id = 'site-branding');

drop policy if exists "site_branding_chief_super_upload" on storage.objects;
create policy "site_branding_chief_super_upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'site-branding'
  and public.current_app_role() in ('chief_admin', 'super_admin')
);

drop policy if exists "site_branding_chief_super_update" on storage.objects;
create policy "site_branding_chief_super_update"
on storage.objects for update
to authenticated
using (bucket_id = 'site-branding' and public.current_app_role() in ('chief_admin', 'super_admin'))
with check (bucket_id = 'site-branding' and public.current_app_role() in ('chief_admin', 'super_admin'));

drop policy if exists "site_branding_chief_super_delete" on storage.objects;
create policy "site_branding_chief_super_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'site-branding' and public.current_app_role() in ('chief_admin', 'super_admin'));

-- Data API: hakikisha role zinaweza kufikia jedwali (kama mipangilio yako inaruhusu)
grant select on public.branding_settings to anon, authenticated;
grant insert, update, delete on public.branding_settings to authenticated;
