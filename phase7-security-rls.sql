-- PHASE 7: Strict role-aware RLS for ministries module
-- Requires JWT custom claims:
-- app_role (super_admin, admin, askofu_dayosisi, mchungaji, kiongozi_idara, member)
-- dayosisi (optional scope)
-- tawi (optional scope)
-- ministry_name (optional for kiongozi_idara)

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

create or replace function public.current_tawi()
returns text
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'tawi')::text, '')
$$;

create or replace function public.current_ministry_name()
returns text
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'ministry_name')::text, '')
$$;

alter table public.ministries enable row level security;
alter table public.ministry_members enable row level security;
alter table public.ministry_leaders enable row level security;
alter table public.ministry_activities enable row level security;
alter table public.ministry_contributions enable row level security;

drop policy if exists "ministries_select_strict" on public.ministries;
create policy "ministries_select_strict" on public.ministries
for select to authenticated
using (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
  or (public.current_app_role() = 'mchungaji' and tawi = public.current_tawi())
  or (public.current_app_role() = 'kiongozi_idara' and jina = public.current_ministry_name())
  or (public.current_app_role() = 'member' and status = 'active')
);

drop policy if exists "ministries_insert_strict" on public.ministries;
create policy "ministries_insert_strict" on public.ministries
for insert to authenticated
with check (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
  or (public.current_app_role() = 'mchungaji' and tawi = public.current_tawi())
);

drop policy if exists "ministries_update_strict" on public.ministries;
create policy "ministries_update_strict" on public.ministries
for update to authenticated
using (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
  or (public.current_app_role() = 'mchungaji' and tawi = public.current_tawi())
  or (public.current_app_role() = 'kiongozi_idara' and jina = public.current_ministry_name())
)
with check (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
  or (public.current_app_role() = 'mchungaji' and tawi = public.current_tawi())
  or (public.current_app_role() = 'kiongozi_idara' and jina = public.current_ministry_name())
);

drop policy if exists "ministries_delete_strict" on public.ministries;
create policy "ministries_delete_strict" on public.ministries
for delete to authenticated
using (public.current_app_role() in ('super_admin','admin'));

drop policy if exists "ministry_members_rw_strict" on public.ministry_members;
create policy "ministry_members_rw_strict" on public.ministry_members
for all to authenticated
using (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and exists (
    select 1 from public.ministries m where m.jina = ministry_members.idara and m.dayosisi = public.current_dayosisi()
  ))
  or (public.current_app_role() = 'mchungaji' and tawi = public.current_tawi())
  or (public.current_app_role() = 'kiongozi_idara' and idara = public.current_ministry_name())
)
with check (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and exists (
    select 1 from public.ministries m where m.jina = ministry_members.idara and m.dayosisi = public.current_dayosisi()
  ))
  or (public.current_app_role() = 'mchungaji' and tawi = public.current_tawi())
  or (public.current_app_role() = 'kiongozi_idara' and idara = public.current_ministry_name())
);

drop policy if exists "ministry_leaders_rw_strict" on public.ministry_leaders;
create policy "ministry_leaders_rw_strict" on public.ministry_leaders
for all to authenticated
using (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
  or (public.current_app_role() = 'mchungaji' and tawi = public.current_tawi())
  or (public.current_app_role() = 'kiongozi_idara' and idara = public.current_ministry_name())
)
with check (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
  or (public.current_app_role() = 'mchungaji' and tawi = public.current_tawi())
  or (public.current_app_role() = 'kiongozi_idara' and idara = public.current_ministry_name())
);

drop policy if exists "ministry_activities_rw_strict" on public.ministry_activities;
create policy "ministry_activities_rw_strict" on public.ministry_activities
for all to authenticated
using (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and exists (
    select 1 from public.ministries m where m.jina = ministry_activities.idara and m.dayosisi = public.current_dayosisi()
  ))
  or (public.current_app_role() = 'mchungaji' and exists (
    select 1 from public.ministries m where m.jina = ministry_activities.idara and m.tawi = public.current_tawi()
  ))
  or (public.current_app_role() = 'kiongozi_idara' and idara = public.current_ministry_name())
)
with check (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and exists (
    select 1 from public.ministries m where m.jina = ministry_activities.idara and m.dayosisi = public.current_dayosisi()
  ))
  or (public.current_app_role() = 'mchungaji' and exists (
    select 1 from public.ministries m where m.jina = ministry_activities.idara and m.tawi = public.current_tawi()
  ))
  or (public.current_app_role() = 'kiongozi_idara' and idara = public.current_ministry_name())
);

drop policy if exists "ministry_contributions_rw_strict" on public.ministry_contributions;
create policy "ministry_contributions_rw_strict" on public.ministry_contributions
for all to authenticated
using (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and exists (
    select 1 from public.ministries m where m.jina = ministry_contributions.idara and m.dayosisi = public.current_dayosisi()
  ))
  or (public.current_app_role() = 'mchungaji' and exists (
    select 1 from public.ministries m where m.jina = ministry_contributions.idara and m.tawi = public.current_tawi()
  ))
  or (public.current_app_role() = 'kiongozi_idara' and idara = public.current_ministry_name())
)
with check (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and exists (
    select 1 from public.ministries m where m.jina = ministry_contributions.idara and m.dayosisi = public.current_dayosisi()
  ))
  or (public.current_app_role() = 'mchungaji' and exists (
    select 1 from public.ministries m where m.jina = ministry_contributions.idara and m.tawi = public.current_tawi()
  ))
  or (public.current_app_role() = 'kiongozi_idara' and idara = public.current_ministry_name())
);

alter table public.activity_logs enable row level security;
drop policy if exists "activity_logs_insert_ministries_strict" on public.activity_logs;
create policy "activity_logs_insert_ministries_strict" on public.activity_logs
for insert to authenticated
with check (
  module = 'ministries'
  and public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','kiongozi_idara')
);
