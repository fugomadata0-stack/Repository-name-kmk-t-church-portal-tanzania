create or replace function public.current_app_role()
returns text language sql stable as $$ select coalesce((auth.jwt() ->> 'app_role')::text, 'member') $$;

alter table public.notifications enable row level security;
alter table public.sms_campaigns enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.message_templates enable row level security;
alter table public.scheduled_messages enable row level security;
alter table public.delivery_reports enable row level security;
alter table public.notification_logs enable row level security;

drop policy if exists "notifications_select_strict" on public.notifications;
create policy "notifications_select_strict" on public.notifications
for select to authenticated
using (public.current_app_role() in ('super_admin','admin','media_admin','askofu_dayosisi','member'));

drop policy if exists "notifications_rw_strict" on public.notifications;
create policy "notifications_rw_strict" on public.notifications
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','media_admin','askofu_dayosisi'))
with check (public.current_app_role() in ('super_admin','admin','media_admin','askofu_dayosisi'));

drop policy if exists "sms_rw_strict" on public.sms_campaigns;
create policy "sms_rw_strict" on public.sms_campaigns
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','media_admin','askofu_dayosisi'))
with check (public.current_app_role() in ('super_admin','admin','media_admin','askofu_dayosisi'));

drop policy if exists "email_rw_strict" on public.email_campaigns;
create policy "email_rw_strict" on public.email_campaigns
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','media_admin','askofu_dayosisi'))
with check (public.current_app_role() in ('super_admin','admin','media_admin','askofu_dayosisi'));

drop policy if exists "templates_rw_strict" on public.message_templates;
create policy "templates_rw_strict" on public.message_templates
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','media_admin'))
with check (public.current_app_role() in ('super_admin','admin','media_admin'));

drop policy if exists "scheduled_rw_strict" on public.scheduled_messages;
create policy "scheduled_rw_strict" on public.scheduled_messages
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','media_admin','askofu_dayosisi'))
with check (public.current_app_role() in ('super_admin','admin','media_admin','askofu_dayosisi'));

drop policy if exists "delivery_reports_select_strict" on public.delivery_reports;
create policy "delivery_reports_select_strict" on public.delivery_reports
for select to authenticated
using (public.current_app_role() in ('super_admin','admin','media_admin','askofu_dayosisi'));

drop policy if exists "notification_logs_insert_strict" on public.notification_logs;
create policy "notification_logs_insert_strict" on public.notification_logs
for insert to authenticated
with check (public.current_app_role() in ('super_admin','admin','media_admin','askofu_dayosisi'));
