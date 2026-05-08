-- PHASE 37: MEMBERS SUITE RLS POLICIES
-- NOTE: Requires role/scope claims in auth.jwt() app metadata:
-- role, dayosisi, jimbo, tawi

alter table if exists public.members enable row level security;
alter table if exists public.families enable row level security;
alter table if exists public.family_members enable row level security;
alter table if exists public.baptism_records enable row level security;
alter table if exists public.catechism_records enable row level security;
alter table if exists public.member_talents enable row level security;
alter table if exists public.member_documents enable row level security;
alter table if exists public.member_transfers enable row level security;
alter table if exists public.member_approvals enable row level security;
alter table if exists public.member_notes enable row level security;
alter table if exists public.member_audit_logs enable row level security;

-- MEMBERS POLICIES
drop policy if exists "members_select_scoped" on public.members;
create policy "members_select_scoped"
on public.members
for select
to authenticated
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') in ('super_admin','chief_admin','admin','national_admin')
  or (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'dayosisi_admin'
    and upper(coalesce(dayosisi, '')) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'dayosisi', ''))
  )
  or (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'jimbo_admin'
    and upper(coalesce(jimbo, '')) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'jimbo', ''))
  )
  or (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'tawi_admin'
    and upper(coalesce(branch, '')) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'tawi', ''))
  )
);

drop policy if exists "members_write_scoped" on public.members;
create policy "members_write_scoped"
on public.members
for all
to authenticated
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') in ('super_admin','chief_admin','admin','national_admin')
  or (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'dayosisi_admin'
    and upper(coalesce(dayosisi, '')) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'dayosisi', ''))
  )
  or (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'jimbo_admin'
    and upper(coalesce(jimbo, '')) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'jimbo', ''))
  )
  or (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'tawi_admin'
    and upper(coalesce(branch, '')) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'tawi', ''))
  )
)
with check (
  (auth.jwt() -> 'app_metadata' ->> 'role') in ('super_admin','chief_admin','admin','national_admin')
  or (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'dayosisi_admin'
    and upper(coalesce(dayosisi, '')) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'dayosisi', ''))
  )
  or (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'jimbo_admin'
    and upper(coalesce(jimbo, '')) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'jimbo', ''))
  )
  or (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'tawi_admin'
    and upper(coalesce(branch, '')) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'tawi', ''))
  )
);

-- AUDIT LOGS: read/write only for admin tiers
drop policy if exists "member_audit_admin_only" on public.member_audit_logs;
create policy "member_audit_admin_only"
on public.member_audit_logs
for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('super_admin','chief_admin','admin','national_admin'))
with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('super_admin','chief_admin','admin','national_admin'));

-- Realtime publication (idempotent)
do $$
begin
  begin
    alter publication supabase_realtime add table public.members;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.member_approvals;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.member_transfers;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.member_audit_logs;
  exception when duplicate_object then null;
  end;
end $$;
