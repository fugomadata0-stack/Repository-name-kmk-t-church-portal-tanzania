create or replace function public.current_app_role()
returns text language sql stable as $$ select coalesce((auth.jwt() ->> 'app_role')::text, 'member') $$;
create or replace function public.current_dayosisi()
returns text language sql stable as $$ select coalesce((auth.jwt() ->> 'dayosisi')::text, '') $$;
create or replace function public.current_tawi()
returns text language sql stable as $$ select coalesce((auth.jwt() ->> 'tawi')::text, '') $$;

alter table public.attendance_records enable row level security;
alter table public.attendance_items enable row level security;
alter table public.attendance_summaries enable row level security;
alter table public.attendance_reports enable row level security;

drop policy if exists "attendance_records_select_strict" on public.attendance_records;
create policy "attendance_records_select_strict" on public.attendance_records
for select to authenticated
using (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
  or (public.current_app_role() = 'mchungaji' and tawi = public.current_tawi())
  or (public.current_app_role() in ('kiongozi_idara','member') and status <> 'closed')
);

drop policy if exists "attendance_records_rw_strict" on public.attendance_records;
create policy "attendance_records_rw_strict" on public.attendance_records
for all to authenticated
using (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
  or (public.current_app_role() = 'mchungaji' and tawi = public.current_tawi())
  or (public.current_app_role() = 'kiongozi_idara' and record_type = 'ministry')
)
with check (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
  or (public.current_app_role() = 'mchungaji' and tawi = public.current_tawi())
  or (public.current_app_role() = 'kiongozi_idara' and record_type = 'ministry')
);

drop policy if exists "attendance_items_rw_strict" on public.attendance_items;
create policy "attendance_items_rw_strict" on public.attendance_items
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','kiongozi_idara'))
with check (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','kiongozi_idara'));

drop policy if exists "attendance_summaries_select_strict" on public.attendance_summaries;
create policy "attendance_summaries_select_strict" on public.attendance_summaries
for select to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','kiongozi_idara'));

drop policy if exists "attendance_reports_rw_strict" on public.attendance_reports;
create policy "attendance_reports_rw_strict" on public.attendance_reports
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji'))
with check (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji'));
