-- STEP 16 (upgrade): KMK(T) Master Settings Hub
-- Focus tables: portal_master_settings, portal_theme_settings, portal_template_settings

create table if not exists public.portal_master_settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key text not null default 'default' unique,
  official_name text not null default 'KANISA LA MENNONITE LA KIINJILI TANZANIA',
  short_name text not null default 'KMK(T)',
  motto text not null default '',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  website text not null default '',
  country text not null default 'Tanzania',
  timezone text not null default 'Africa/Dar_es_Salaam',
  registration_info text not null default '',
  official_seal_text text not null default '',
  language_primary text not null default 'sw',
  language_secondary text not null default 'en',
  language_ratio_sw int not null default 70,
  language_ratio_en int not null default 30,
  show_kpi_cards boolean not null default true,
  default_date_range_days int not null default 30,
  default_hierarchy_filter text not null default 'ALL',
  dashboard_refresh_interval_sec int not null default 60,
  system_footer text not null default 'KMK(T) Tanzania',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portal_master_settings_ratio_chk check (language_ratio_sw >= 0 and language_ratio_en >= 0 and language_ratio_sw + language_ratio_en = 100),
  constraint portal_master_settings_date_range_chk check (default_date_range_days between 1 and 3650),
  constraint portal_master_settings_refresh_chk check (dashboard_refresh_interval_sec between 15 and 86400)
);

create table if not exists public.portal_theme_settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key text not null default 'default' unique,
  logo_url text not null default '',
  favicon_url text not null default '',
  letterhead_url text not null default '',
  signature_image_url text not null default '',
  seal_image_url text not null default '',
  primary_color text not null default '#0B1F3A',
  secondary_color text not null default '#123C69',
  accent_color text not null default '#D4AF37',
  background_color text not null default '#FFFFFF',
  text_color text not null default '#0F172A',
  pdf_header_text text not null default '',
  excel_header_text text not null default '',
  print_header_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portal_theme_settings_primary_hex_chk check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint portal_theme_settings_secondary_hex_chk check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint portal_theme_settings_accent_hex_chk check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint portal_theme_settings_background_hex_chk check (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint portal_theme_settings_text_hex_chk check (text_color ~ '^#[0-9A-Fa-f]{6}$')
);

create table if not exists public.portal_template_settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key text not null default 'default' unique,
  email_welcome text not null default 'Karibu {name}, akaunti yako ya KMK(T) iko tayari.',
  email_password_reset text not null default 'Bonyeza kiungo hiki kubadili nenosiri lako: {reset_link}',
  email_signup_approval text not null default 'Ombi lako la usajili limekubaliwa. Karibu KMK(T).',
  email_finance_receipt text not null default 'Tumepokea malipo yako. Kumbukumbu: {receipt_no}',
  email_document_approval text not null default 'Nyaraka yako imekaguliwa na kukubaliwa.',
  sms_alert text not null default 'Tahadhari: {message}',
  notification_message text not null default 'Una taarifa mpya kwenye portal ya KMK(T).',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.portal_touch_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_portal_master_settings_touch on public.portal_master_settings;
create trigger trg_portal_master_settings_touch
before update on public.portal_master_settings
for each row
execute function public.portal_touch_settings_updated_at();

drop trigger if exists trg_portal_theme_settings_touch on public.portal_theme_settings;
create trigger trg_portal_theme_settings_touch
before update on public.portal_theme_settings
for each row
execute function public.portal_touch_settings_updated_at();

drop trigger if exists trg_portal_template_settings_touch on public.portal_template_settings;
create trigger trg_portal_template_settings_touch
before update on public.portal_template_settings
for each row
execute function public.portal_touch_settings_updated_at();

alter table public.portal_master_settings enable row level security;
alter table public.portal_theme_settings enable row level security;
alter table public.portal_template_settings enable row level security;

drop policy if exists portal_master_settings_select_auth on public.portal_master_settings;
create policy portal_master_settings_select_auth
on public.portal_master_settings
for select
to authenticated
using (public.portal_has_module_capability('mipangilio', 'view'));

drop policy if exists portal_theme_settings_select_auth on public.portal_theme_settings;
create policy portal_theme_settings_select_auth
on public.portal_theme_settings
for select
to authenticated
using (public.portal_has_module_capability('mipangilio', 'view'));

drop policy if exists portal_template_settings_select_auth on public.portal_template_settings;
create policy portal_template_settings_select_auth
on public.portal_template_settings
for select
to authenticated
using (public.portal_has_module_capability('mipangilio', 'view'));

drop policy if exists portal_master_settings_insert_super_admin on public.portal_master_settings;
create policy portal_master_settings_insert_super_admin
on public.portal_master_settings
for insert
to authenticated
with check (public.current_app_role() = 'super_admin');

drop policy if exists portal_master_settings_update_super_admin on public.portal_master_settings;
create policy portal_master_settings_update_super_admin
on public.portal_master_settings
for update
to authenticated
using (public.current_app_role() = 'super_admin')
with check (public.current_app_role() = 'super_admin');

drop policy if exists portal_theme_settings_insert_super_admin on public.portal_theme_settings;
create policy portal_theme_settings_insert_super_admin
on public.portal_theme_settings
for insert
to authenticated
with check (public.current_app_role() = 'super_admin');

drop policy if exists portal_theme_settings_update_super_admin on public.portal_theme_settings;
create policy portal_theme_settings_update_super_admin
on public.portal_theme_settings
for update
to authenticated
using (public.current_app_role() = 'super_admin')
with check (public.current_app_role() = 'super_admin');

drop policy if exists portal_template_settings_insert_super_admin on public.portal_template_settings;
create policy portal_template_settings_insert_super_admin
on public.portal_template_settings
for insert
to authenticated
with check (public.current_app_role() = 'super_admin');

drop policy if exists portal_template_settings_update_super_admin on public.portal_template_settings;
create policy portal_template_settings_update_super_admin
on public.portal_template_settings
for update
to authenticated
using (public.current_app_role() = 'super_admin')
with check (public.current_app_role() = 'super_admin');

-- Seed singleton rows (safe idempotent)
insert into public.portal_master_settings (singleton_key)
values ('default')
on conflict (singleton_key) do nothing;

insert into public.portal_theme_settings (singleton_key)
values ('default')
on conflict (singleton_key) do nothing;

insert into public.portal_template_settings (singleton_key)
values ('default')
on conflict (singleton_key) do nothing;

