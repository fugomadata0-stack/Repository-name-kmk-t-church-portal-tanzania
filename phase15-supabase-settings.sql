create table if not exists system_settings (
  id bigserial primary key,
  system_name text, short_name text, motto text, official_description text, timezone text, default_date_format text, default_currency text, status text,
  created_at timestamptz default now()
);
create table if not exists branding_settings (
  id bigserial primary key,
  logo text, favicon text, primary_color text, secondary_color text, accent_color text, hero_bg text, jesus_image text, bible_image text, church_image text, theme_mode text, footer_text text,
  created_at timestamptz default now()
);
create table if not exists church_identity (
  id bigserial primary key,
  official_church_name text, country text, headquarters text, main_phone text, main_email text, postal_address text, website_url text, vision text, mission text, core_values text,
  created_at timestamptz default now()
);
create table if not exists localization_settings (id bigserial primary key, payload jsonb, created_at timestamptz default now());
create table if not exists notification_settings (id bigserial primary key, default_sms_sender text, default_email_sender text, default_priority text, reminder_timings text, retry_count integer, failure_alerts_toggle text, created_at timestamptz default now());
create table if not exists finance_settings (id bigserial primary key, default_currency text, default_payment_methods text, auto_approval_threshold text, receipt_prefix text, finance_year_start date, finance_year_end date, created_at timestamptz default now());
create table if not exists attendance_settings (id bigserial primary key, payload jsonb, created_at timestamptz default now());
create table if not exists media_settings (id bigserial primary key, payload jsonb, created_at timestamptz default now());
create table if not exists report_settings (id bigserial primary key, payload jsonb, created_at timestamptz default now());
create table if not exists backup_settings (id bigserial primary key, auto_backup_toggle text, backup_frequency text, retention_period text, storage_location text, restore_confirmation_toggle text, created_at timestamptz default now());
create table if not exists security_preferences (id bigserial primary key, payload jsonb, created_at timestamptz default now());

alter table system_settings enable row level security;
alter table branding_settings enable row level security;
alter table church_identity enable row level security;
alter table localization_settings enable row level security;
alter table notification_settings enable row level security;
alter table finance_settings enable row level security;
alter table attendance_settings enable row level security;
alter table media_settings enable row level security;
alter table report_settings enable row level security;
alter table backup_settings enable row level security;
alter table security_preferences enable row level security;

drop policy if exists "system_settings_all_auth" on system_settings;
create policy "system_settings_all_auth" on system_settings for all to authenticated using (true) with check (true);
drop policy if exists "branding_settings_all_auth" on branding_settings;
create policy "branding_settings_all_auth" on branding_settings for all to authenticated using (true) with check (true);
drop policy if exists "church_identity_all_auth" on church_identity;
create policy "church_identity_all_auth" on church_identity for all to authenticated using (true) with check (true);
drop policy if exists "localization_settings_all_auth" on localization_settings;
create policy "localization_settings_all_auth" on localization_settings for all to authenticated using (true) with check (true);
drop policy if exists "notification_settings_all_auth" on notification_settings;
create policy "notification_settings_all_auth" on notification_settings for all to authenticated using (true) with check (true);
drop policy if exists "finance_settings_all_auth" on finance_settings;
create policy "finance_settings_all_auth" on finance_settings for all to authenticated using (true) with check (true);
drop policy if exists "attendance_settings_all_auth" on attendance_settings;
create policy "attendance_settings_all_auth" on attendance_settings for all to authenticated using (true) with check (true);
drop policy if exists "media_settings_all_auth" on media_settings;
create policy "media_settings_all_auth" on media_settings for all to authenticated using (true) with check (true);
drop policy if exists "report_settings_all_auth" on report_settings;
create policy "report_settings_all_auth" on report_settings for all to authenticated using (true) with check (true);
drop policy if exists "backup_settings_all_auth" on backup_settings;
create policy "backup_settings_all_auth" on backup_settings for all to authenticated using (true) with check (true);
drop policy if exists "security_preferences_all_auth" on security_preferences;
create policy "security_preferences_all_auth" on security_preferences for all to authenticated using (true) with check (true);
