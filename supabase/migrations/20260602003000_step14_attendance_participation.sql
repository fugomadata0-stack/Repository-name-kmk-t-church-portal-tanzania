-- STEP 14: Attendance & Service Participation

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  attendance_date date not null,
  service_name text not null,
  attendance_type text not null default 'Ibada ya Jumapili',
  dayosisi_id uuid null references public.dayosisi(id) on delete set null,
  jimbo_id uuid null references public.church_jimbo(id) on delete set null,
  tawi_id uuid null references public.church_tawi(id) on delete set null,
  idara_name text null,
  huduma_name text null,
  jumuiya_name text null,
  total_men int not null default 0,
  total_women int not null default 0,
  total_youth int not null default 0,
  total_children int not null default 0,
  visitors int not null default 0,
  total_attendance int not null default 0,
  recorded_by text null,
  notes text null,
  status text not null default 'active' check (status in ('active','inactive','pending','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  member_id uuid not null references public.church_members(id) on delete cascade,
  member_name text not null,
  attendance_status text not null check (attendance_status in ('present','absent')),
  qr_code text null,
  notes text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_attendance_sessions_date on public.attendance_sessions(attendance_date);
create index if not exists idx_attendance_sessions_tawi on public.attendance_sessions(tawi_id);
create index if not exists idx_attendance_records_session on public.attendance_records(session_id);
create index if not exists idx_attendance_records_member on public.attendance_records(member_id);

create or replace function public.portal_touch_attendance_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_attendance_sessions_touch on public.attendance_sessions;
create trigger trg_attendance_sessions_touch
before update on public.attendance_sessions
for each row
execute function public.portal_touch_attendance_updated_at();

alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

drop policy if exists attendance_sessions_select on public.attendance_sessions;
create policy attendance_sessions_select on public.attendance_sessions
for select to authenticated
using (public.portal_has_module_capability('attendance','view'));

drop policy if exists attendance_sessions_insert on public.attendance_sessions;
create policy attendance_sessions_insert on public.attendance_sessions
for insert to authenticated
with check (public.portal_has_module_capability('attendance','create'));

drop policy if exists attendance_sessions_update on public.attendance_sessions;
create policy attendance_sessions_update on public.attendance_sessions
for update to authenticated
using (public.portal_has_module_capability('attendance','edit'))
with check (public.portal_has_module_capability('attendance','edit'));

drop policy if exists attendance_sessions_delete on public.attendance_sessions;
create policy attendance_sessions_delete on public.attendance_sessions
for delete to authenticated
using (public.portal_has_module_capability('attendance','delete'));

drop policy if exists attendance_records_select on public.attendance_records;
create policy attendance_records_select on public.attendance_records
for select to authenticated
using (public.portal_has_module_capability('attendance','view'));

drop policy if exists attendance_records_insert on public.attendance_records;
create policy attendance_records_insert on public.attendance_records
for insert to authenticated
with check (public.portal_has_module_capability('attendance','edit'));

drop policy if exists attendance_records_update on public.attendance_records;
create policy attendance_records_update on public.attendance_records
for update to authenticated
using (public.portal_has_module_capability('attendance','edit'))
with check (public.portal_has_module_capability('attendance','edit'));

drop policy if exists attendance_records_delete on public.attendance_records;
create policy attendance_records_delete on public.attendance_records
for delete to authenticated
using (public.portal_has_module_capability('attendance','delete'));

insert into public.portal_module_matrix(role_key, module_key, can_view, can_create, can_edit, can_delete, can_export, can_audit)
select
  r.role_key,
  'attendance',
  true,
  case when r.role_key in ('super_admin','chief_admin','national_admin','office_admin','dayosisi_admin','jimbo_admin','tawi_admin') then true else false end,
  case when r.role_key in ('super_admin','chief_admin','national_admin','office_admin','dayosisi_admin','jimbo_admin','tawi_admin') then true else false end,
  case when r.role_key in ('super_admin','chief_admin','national_admin','office_admin') then true else false end,
  case when r.role_key in ('super_admin','chief_admin','national_admin','office_admin') then true else false end,
  false
from public.portal_roles r
on conflict (role_key, module_key) do update
set
  can_view = excluded.can_view,
  can_create = excluded.can_create,
  can_edit = excluded.can_edit,
  can_delete = excluded.can_delete,
  can_export = excluded.can_export,
  can_audit = excluded.can_audit,
  updated_at = now();
