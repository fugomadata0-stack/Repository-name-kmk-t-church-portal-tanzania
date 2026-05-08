-- Jedwali la Phase 15 (sehemu ya mipangilio) — lazima kuwepo KABLA ya 20260502150000_settings_site_extras_anon_demo.sql

create table if not exists public.system_settings (
  id bigserial primary key,
  system_name text,
  short_name text,
  motto text,
  official_description text,
  timezone text,
  default_date_format text,
  default_currency text,
  status text,
  created_at timestamptz default now()
);

create table if not exists public.branding_settings (
  id bigserial primary key,
  logo text,
  favicon text,
  primary_color text,
  secondary_color text,
  accent_color text,
  hero_bg text,
  jesus_image text,
  bible_image text,
  church_image text,
  theme_mode text,
  footer_text text,
  created_at timestamptz default now()
);

create table if not exists public.church_identity (
  id bigserial primary key,
  official_church_name text,
  country text,
  headquarters text,
  main_phone text,
  main_email text,
  postal_address text,
  website_url text,
  vision text,
  mission text,
  core_values text,
  created_at timestamptz default now()
);

alter table public.system_settings enable row level security;
alter table public.branding_settings enable row level security;
alter table public.church_identity enable row level security;

drop policy if exists "system_settings_all_auth" on public.system_settings;
create policy "system_settings_all_auth" on public.system_settings for all to authenticated using (true) with check (true);

drop policy if exists "branding_settings_all_auth" on public.branding_settings;
create policy "branding_settings_all_auth" on public.branding_settings for all to authenticated using (true) with check (true);

drop policy if exists "church_identity_all_auth" on public.church_identity;
create policy "church_identity_all_auth" on public.church_identity for all to authenticated using (true) with check (true);

grant all on public.system_settings to authenticated;
grant all on public.branding_settings to authenticated;
grant all on public.church_identity to authenticated;
