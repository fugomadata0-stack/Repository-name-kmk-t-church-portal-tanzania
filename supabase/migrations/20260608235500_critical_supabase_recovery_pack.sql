-- Critical Supabase recovery pack (safe additive).
-- Goal: align lagging DB schema with current frontend/service expectations.

-- ---------------------------------------------------------------------------
-- Missing / lagging core tables
-- ---------------------------------------------------------------------------

create table if not exists public.system_alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'system',
  module text not null default 'dashboard',
  title text not null default '',
  message text not null default '',
  priority text not null default 'warning',
  target_role text null,
  target_user_id uuid null,
  action_url text null,
  status text not null default 'open',
  metadata jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.church_structure_entities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  level text not null,
  parent_id uuid null,
  parent_name text null,
  region text null,
  district text null,
  ward text null,
  address text null,
  contact_person text null,
  phone text null,
  email text null,
  status text not null default 'active',
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_master_settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key text not null default 'default' unique,
  official_name text null,
  short_name text null,
  motto text null,
  address text null,
  phone text null,
  email text null,
  website text null,
  country text null,
  timezone text null,
  registration_info text null,
  official_seal_text text null,
  language_primary text null,
  language_secondary text null,
  language_ratio_sw integer null,
  language_ratio_en integer null,
  show_kpi_cards boolean not null default true,
  default_date_range_days integer not null default 30,
  default_hierarchy_filter text null,
  dashboard_refresh_interval_sec integer not null default 60,
  system_footer text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_theme_settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key text not null default 'default' unique,
  logo_url text null,
  favicon_url text null,
  letterhead_url text null,
  signature_image_url text null,
  seal_image_url text null,
  primary_color text null,
  secondary_color text null,
  accent_color text null,
  background_color text null,
  text_color text null,
  pdf_header_text text null,
  excel_header_text text null,
  print_header_text text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_template_settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key text not null default 'default' unique,
  email_welcome text null,
  email_password_reset text null,
  email_signup_approval text null,
  email_finance_receipt text null,
  email_document_approval text null,
  sms_alert text null,
  notification_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Missing columns used by current code
-- ---------------------------------------------------------------------------

alter table if exists public.church_viongozi
  add column if not exists full_name text null,
  add column if not exists photo_url text null,
  add column if not exists gender text null,
  add column if not exists email text null,
  add column if not exists position_id uuid null,
  add column if not exists leadership_level text null,
  add column if not exists assigned_entity text null,
  add column if not exists idara_name text null,
  add column if not exists huduma_name text null,
  add column if not exists taasisi_name text null,
  add column if not exists jumuiya_name text null,
  add column if not exists start_date date null,
  add column if not exists end_date date null,
  add column if not exists term_status text not null default 'active',
  add column if not exists appointment_document_url text null,
  add column if not exists appointment_document_name text null,
  add column if not exists appointment_document_path text null,
  add column if not exists appointment_document_size bigint null,
  add column if not exists appointment_document_type text null,
  add column if not exists appointment_uploaded_at timestamptz null,
  add column if not exists notes text null;

alter table if exists public.audit_logs
  add column if not exists entity_type text null,
  add column if not exists entity_name text null,
  add column if not exists performed_by_user_id uuid null,
  add column if not exists performed_by_name text null,
  add column if not exists role_key text null,
  add column if not exists old_values jsonb null,
  add column if not exists new_values jsonb null,
  add column if not exists ip_address text null,
  add column if not exists user_agent text null,
  add column if not exists status text not null default 'success',
  add column if not exists message text null;

alter table if exists public.attendance_sessions
  add column if not exists attendance_date date null,
  add column if not exists service_name text null,
  add column if not exists attendance_type text null,
  add column if not exists total_attendance integer not null default 0,
  add column if not exists visitors integer not null default 0,
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- Indexes for common filters
-- ---------------------------------------------------------------------------

create index if not exists system_alerts_status_created_idx on public.system_alerts (status, created_at desc);
create index if not exists church_structure_entities_level_status_name_idx on public.church_structure_entities (level, status, name);
create index if not exists church_structure_entities_parent_status_idx on public.church_structure_entities (parent_id, status);
create index if not exists church_viongozi_term_status_idx on public.church_viongozi (term_status);
create index if not exists audit_logs_entity_type_idx on public.audit_logs (entity_type);

-- ---------------------------------------------------------------------------
-- Baseline RLS and access (temporary-safe)
-- NOTE: fine-grained role policies can be tightened after recovery push.
-- ---------------------------------------------------------------------------

alter table if exists public.system_alerts enable row level security;
alter table if exists public.church_structure_entities enable row level security;
alter table if exists public.portal_master_settings enable row level security;
alter table if exists public.portal_theme_settings enable row level security;
alter table if exists public.portal_template_settings enable row level security;

grant select, insert, update, delete on public.system_alerts to authenticated;
grant select, insert, update, delete on public.church_structure_entities to authenticated;
grant select, insert, update, delete on public.portal_master_settings to authenticated;
grant select, insert, update, delete on public.portal_theme_settings to authenticated;
grant select, insert, update, delete on public.portal_template_settings to authenticated;

drop policy if exists system_alerts_auth_all_recovery on public.system_alerts;
create policy system_alerts_auth_all_recovery on public.system_alerts
for all to authenticated using (true) with check (true);

drop policy if exists church_structure_entities_auth_all_recovery on public.church_structure_entities;
create policy church_structure_entities_auth_all_recovery on public.church_structure_entities
for all to authenticated using (true) with check (true);

drop policy if exists portal_master_settings_auth_all_recovery on public.portal_master_settings;
create policy portal_master_settings_auth_all_recovery on public.portal_master_settings
for all to authenticated using (true) with check (true);

drop policy if exists portal_theme_settings_auth_all_recovery on public.portal_theme_settings;
create policy portal_theme_settings_auth_all_recovery on public.portal_theme_settings
for all to authenticated using (true) with check (true);

drop policy if exists portal_template_settings_auth_all_recovery on public.portal_template_settings;
create policy portal_template_settings_auth_all_recovery on public.portal_template_settings
for all to authenticated using (true) with check (true);
