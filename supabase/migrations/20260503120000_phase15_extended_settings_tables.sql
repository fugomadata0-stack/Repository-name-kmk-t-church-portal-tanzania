-- Jedwali za mipangilio ya ziada (Phase 15) — pamoja na sera za demo kwa anon
-- Endesha baada ya 20260502050000_phase15_core_settings_tables.sql

create table if not exists public.localization_settings (
  id bigserial primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.notification_settings (
  id bigserial primary key,
  default_sms_sender text,
  default_email_sender text,
  default_priority text,
  reminder_timings text,
  retry_count integer,
  failure_alerts_toggle text,
  created_at timestamptz default now()
);

create table if not exists public.finance_settings (
  id bigserial primary key,
  default_currency text,
  default_payment_methods text,
  auto_approval_threshold text,
  receipt_prefix text,
  finance_year_start date,
  finance_year_end date,
  created_at timestamptz default now()
);

create table if not exists public.attendance_settings (
  id bigserial primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.media_settings (
  id bigserial primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.report_settings (
  id bigserial primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.backup_settings (
  id bigserial primary key,
  auto_backup_toggle text,
  backup_frequency text,
  retention_period text,
  storage_location text,
  restore_confirmation_toggle text,
  created_at timestamptz default now()
);

create table if not exists public.security_preferences (
  id bigserial primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.localization_settings enable row level security;
alter table public.notification_settings enable row level security;
alter table public.finance_settings enable row level security;
alter table public.attendance_settings enable row level security;
alter table public.media_settings enable row level security;
alter table public.report_settings enable row level security;
alter table public.backup_settings enable row level security;
alter table public.security_preferences enable row level security;

drop policy if exists "localization_settings_all_auth" on public.localization_settings;
create policy "localization_settings_all_auth" on public.localization_settings for all to authenticated using (true) with check (true);
drop policy if exists "notification_settings_all_auth" on public.notification_settings;
create policy "notification_settings_all_auth" on public.notification_settings for all to authenticated using (true) with check (true);
drop policy if exists "finance_settings_all_auth" on public.finance_settings;
create policy "finance_settings_all_auth" on public.finance_settings for all to authenticated using (true) with check (true);
drop policy if exists "attendance_settings_all_auth" on public.attendance_settings;
create policy "attendance_settings_all_auth" on public.attendance_settings for all to authenticated using (true) with check (true);
drop policy if exists "media_settings_all_auth" on public.media_settings;
create policy "media_settings_all_auth" on public.media_settings for all to authenticated using (true) with check (true);
drop policy if exists "report_settings_all_auth" on public.report_settings;
create policy "report_settings_all_auth" on public.report_settings for all to authenticated using (true) with check (true);
drop policy if exists "backup_settings_all_auth" on public.backup_settings;
create policy "backup_settings_all_auth" on public.backup_settings for all to authenticated using (true) with check (true);
drop policy if exists "security_preferences_all_auth" on public.security_preferences;
create policy "security_preferences_all_auth" on public.security_preferences for all to authenticated using (true) with check (true);

grant all on public.localization_settings, public.notification_settings, public.finance_settings,
  public.attendance_settings, public.media_settings, public.report_settings, public.backup_settings,
  public.security_preferences to authenticated;

-- Demo anon (ondoa uzalishani)
drop policy if exists "localization_settings_anon_demo" on public.localization_settings;
create policy "localization_settings_anon_demo" on public.localization_settings for all to anon using (true) with check (true);
drop policy if exists "notification_settings_anon_demo" on public.notification_settings;
create policy "notification_settings_anon_demo" on public.notification_settings for all to anon using (true) with check (true);
drop policy if exists "finance_settings_anon_demo" on public.finance_settings;
create policy "finance_settings_anon_demo" on public.finance_settings for all to anon using (true) with check (true);
drop policy if exists "attendance_settings_anon_demo" on public.attendance_settings;
create policy "attendance_settings_anon_demo" on public.attendance_settings for all to anon using (true) with check (true);
drop policy if exists "media_settings_anon_demo" on public.media_settings;
create policy "media_settings_anon_demo" on public.media_settings for all to anon using (true) with check (true);
drop policy if exists "report_settings_anon_demo" on public.report_settings;
create policy "report_settings_anon_demo" on public.report_settings for all to anon using (true) with check (true);
drop policy if exists "backup_settings_anon_demo" on public.backup_settings;
create policy "backup_settings_anon_demo" on public.backup_settings for all to anon using (true) with check (true);
drop policy if exists "security_preferences_anon_demo" on public.security_preferences;
create policy "security_preferences_anon_demo" on public.security_preferences for all to anon using (true) with check (true);

grant all on public.localization_settings, public.notification_settings, public.finance_settings,
  public.attendance_settings, public.media_settings, public.report_settings, public.backup_settings,
  public.security_preferences to anon;
