-- ============================================================================
-- PHASE 38: Portal operational readiness (Safu ya safu + RLS nyongeza)
-- Endesha kwenye Supabase SQL Editor BAADA ya meza kuundwa (phase4–phase37).
--
-- Lengo:
--  1) Kuunganisha safu tawi / branch kwenye members (portal hutumia zote mbili).
--  2) Kuongeza sera za RLS zinazotegemea auth_user_profiles (si JWT pekee),
--     ili viongozi walio kwenye jedwali la wasifu waweze kusoma/kuandika data.
--
-- Usalama: sera hizi ni PERMISSIVE na zinaunganishwa na zilizopo (OR).
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- A: safu branch + tawi + trigger kuziweka sawa (INSERT/UPDATE)
-- ---------------------------------------------------------------------------
alter table if exists public.members add column if not exists branch text;
alter table if exists public.members add column if not exists tawi text;

update public.members m
set
  branch = coalesce(nullif(trim(m.branch), ''), nullif(trim(m.tawi), '')),
  tawi = coalesce(nullif(trim(m.tawi), ''), nullif(trim(m.branch), ''));

create or replace function public.portal_sync_members_tawi_branch()
returns trigger
language plpgsql
as $$
begin
  if new.tawi is not null and (new.branch is null or btrim(new.branch) = '') then
    new.branch := new.tawi;
  end if;
  if new.branch is not null and (new.tawi is null or btrim(new.tawi) = '') then
    new.tawi := new.branch;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_members_sync_tawi_branch on public.members;
create trigger trg_members_sync_tawi_branch
before insert or update on public.members
for each row execute function public.portal_sync_members_tawi_branch();

-- ---------------------------------------------------------------------------
-- B: kazi ya kuangalia kama mtumiaji ana nafasi ya uongozi (profiles)
-- ---------------------------------------------------------------------------
create or replace function public.portal_profile_is_elevated(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.auth_user_profiles p
    where p.id = uid
      and coalesce(p.is_active, true) = true
      and (
        p.primary_role in (
          'super_admin', 'chief_admin', 'admin', 'national_admin',
          'dayosisi_admin', 'jimbo_admin', 'tawi_admin',
          'askofu_mkuu', 'askofu_dayosisi', 'mchungaji'
        )
        or coalesce(p.role_list, array[]::text[]) && array[
          'super_admin', 'chief_admin', 'admin', 'national_admin',
          'dayosisi_admin', 'jimbo_admin', 'tawi_admin'
        ]::text[]
      )
  );
$$;

revoke all on function public.portal_profile_is_elevated(uuid) from public;
grant execute on function public.portal_profile_is_elevated(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- C: sera za nyongeza (fail silently ikiwa meza haipo)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.leaders') is not null
     and to_regclass('public.auth_user_profiles') is not null then
    alter table public.leaders enable row level security;
    drop policy if exists "leaders_portal_profile_bridge" on public.leaders;
    create policy "leaders_portal_profile_bridge" on public.leaders
    for all to authenticated
    using (public.portal_profile_is_elevated(auth.uid()))
    with check (public.portal_profile_is_elevated(auth.uid()));
  end if;

  if to_regclass('public.leader_assignments') is not null
     and to_regclass('public.auth_user_profiles') is not null then
    alter table public.leader_assignments enable row level security;
    drop policy if exists "leader_assignments_portal_profile_bridge" on public.leader_assignments;
    create policy "leader_assignments_portal_profile_bridge" on public.leader_assignments
    for all to authenticated
    using (public.portal_profile_is_elevated(auth.uid()))
    with check (public.portal_profile_is_elevated(auth.uid()));
  end if;

  if to_regclass('public.leadership_history') is not null
     and to_regclass('public.auth_user_profiles') is not null then
    alter table public.leadership_history enable row level security;
    drop policy if exists "leadership_history_portal_profile_bridge" on public.leadership_history;
    create policy "leadership_history_portal_profile_bridge" on public.leadership_history
    for all to authenticated
    using (public.portal_profile_is_elevated(auth.uid()))
    with check (public.portal_profile_is_elevated(auth.uid()));
  end if;

  if to_regclass('public.leader_documents') is not null
     and to_regclass('public.auth_user_profiles') is not null then
    alter table public.leader_documents enable row level security;
    drop policy if exists "leader_documents_portal_profile_bridge" on public.leader_documents;
    create policy "leader_documents_portal_profile_bridge" on public.leader_documents
    for all to authenticated
    using (public.portal_profile_is_elevated(auth.uid()))
    with check (public.portal_profile_is_elevated(auth.uid()));
  end if;
end $$;

commit;

-- Hitimisho: hakikisha kila mtumiaji aliyeingia ana safu kwenye auth_user_profiles
-- (id = auth.users.id) pamoja na primary_role sahihi kabla ya kutumia portal kwa Supabase.
