-- PHASE 6: Strict role-aware RLS for leadership module
-- Requires JWT custom claim: app_role (e.g. super_admin, admin, askofu_mkuu, askofu_dayosisi, mchungaji, member)
-- Optional claim: dayosisi for area restriction

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'app_role')::text, 'member')
$$;

create or replace function public.current_dayosisi()
returns text
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'dayosisi')::text, '')
$$;

alter table public.leaders enable row level security;
alter table public.leader_assignments enable row level security;
alter table public.leadership_history enable row level security;
alter table public.leader_documents enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists "leaders_select_strict" on public.leaders;
create policy "leaders_select_strict" on public.leaders
for select to authenticated
using (
  public.current_app_role() in ('super_admin','admin','askofu_mkuu')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
  or (public.current_app_role() = 'mchungaji' and tawi is not null)
  or (public.current_app_role() = 'member' and status = 'active')
);

drop policy if exists "leaders_insert_strict" on public.leaders;
create policy "leaders_insert_strict" on public.leaders
for insert to authenticated
with check (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
);

drop policy if exists "leaders_update_strict" on public.leaders;
create policy "leaders_update_strict" on public.leaders
for update to authenticated
using (
  public.current_app_role() in ('super_admin','admin','askofu_mkuu')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
)
with check (
  public.current_app_role() in ('super_admin','admin','askofu_mkuu')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
);

drop policy if exists "leaders_delete_strict" on public.leaders;
create policy "leaders_delete_strict" on public.leaders
for delete to authenticated
using (public.current_app_role() in ('super_admin','admin'));

drop policy if exists "history_rw_strict" on public.leadership_history;
create policy "history_rw_strict" on public.leadership_history
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_mkuu','askofu_dayosisi'))
with check (public.current_app_role() in ('super_admin','admin','askofu_mkuu','askofu_dayosisi'));

drop policy if exists "documents_rw_strict" on public.leader_documents;
create policy "documents_rw_strict" on public.leader_documents
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_mkuu','askofu_dayosisi'))
with check (public.current_app_role() in ('super_admin','admin','askofu_mkuu','askofu_dayosisi'));

drop policy if exists "assignments_rw_strict" on public.leader_assignments;
create policy "assignments_rw_strict" on public.leader_assignments
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_mkuu','askofu_dayosisi'))
with check (public.current_app_role() in ('super_admin','admin','askofu_mkuu','askofu_dayosisi'));

drop policy if exists "activity_logs_insert_strict" on public.activity_logs;
create policy "activity_logs_insert_strict" on public.activity_logs
for insert to authenticated
with check (public.current_app_role() in ('super_admin','admin','askofu_mkuu','askofu_dayosisi','mchungaji'));

drop policy if exists "activity_logs_select_strict" on public.activity_logs;
create policy "activity_logs_select_strict" on public.activity_logs
for select to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_mkuu'));
