create or replace function public.current_app_role()
returns text language sql stable as $$ select coalesce((auth.jwt() ->> 'app_role')::text, 'member') $$;

alter table public.system_settings enable row level security;
alter table public.branding_settings enable row level security;
alter table public.church_identity enable row level security;
alter table public.localization_settings enable row level security;
alter table public.notification_settings enable row level security;
alter table public.finance_settings enable row level security;
alter table public.attendance_settings enable row level security;
alter table public.media_settings enable row level security;
alter table public.report_settings enable row level security;
alter table public.backup_settings enable row level security;
alter table public.security_preferences enable row level security;

drop policy if exists "settings_select_strict" on public.system_settings;
create policy "settings_select_strict" on public.system_settings
for select to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','member'));

drop policy if exists "settings_rw_strict" on public.system_settings;
create policy "settings_rw_strict" on public.system_settings
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_dayosisi'))
with check (public.current_app_role() in ('super_admin','admin','askofu_dayosisi'));

drop policy if exists "branding_rw_strict" on public.branding_settings;
create policy "branding_rw_strict" on public.branding_settings
for all to authenticated
using (public.current_app_role() in ('super_admin','admin'))
with check (public.current_app_role() in ('super_admin','admin'));

drop policy if exists "identity_rw_strict" on public.church_identity;
create policy "identity_rw_strict" on public.church_identity
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_dayosisi'))
with check (public.current_app_role() in ('super_admin','admin','askofu_dayosisi'));

drop policy if exists "defaults_rw_strict_notification" on public.notification_settings;
create policy "defaults_rw_strict_notification" on public.notification_settings
for all to authenticated
using (public.current_app_role() in ('super_admin','admin'))
with check (public.current_app_role() in ('super_admin','admin'));

drop policy if exists "defaults_rw_strict_finance" on public.finance_settings;
create policy "defaults_rw_strict_finance" on public.finance_settings
for all to authenticated
using (public.current_app_role() in ('super_admin','admin'))
with check (public.current_app_role() in ('super_admin','admin'));

drop policy if exists "defaults_rw_strict_backup" on public.backup_settings;
create policy "defaults_rw_strict_backup" on public.backup_settings
for all to authenticated
using (public.current_app_role() in ('super_admin','admin'))
with check (public.current_app_role() in ('super_admin','admin'));

drop policy if exists "defaults_rw_strict_security" on public.security_preferences;
create policy "defaults_rw_strict_security" on public.security_preferences
for all to authenticated
using (public.current_app_role() in ('super_admin','admin'))
with check (public.current_app_role() in ('super_admin','admin'));
