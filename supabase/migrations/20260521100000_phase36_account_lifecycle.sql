-- Phase 36: historia ya maisha ya akaunti (activate / suspend / reset password) — somo kwa Chief/Super

create table if not exists public.phase36_account_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.portal_directory_profiles (id) on delete cascade,
  action text not null check (action in ('activate', 'suspend', 'reset_password')),
  previous_status text,
  new_status text,
  actor_user_id uuid references auth.users (id) on delete set null,
  target_email text not null,
  target_role text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists phase36_lifecycle_profile_idx on public.phase36_account_lifecycle_events (profile_id);
create index if not exists phase36_lifecycle_created_idx on public.phase36_account_lifecycle_events (created_at desc);

comment on table public.phase36_account_lifecycle_events is 'Phase 36: matukio ya activate/suspend/reset — insert kwa Edge (service role) pekee kwa usahihi wa juu.';

alter table public.phase36_account_lifecycle_events enable row level security;

drop policy if exists "phase36_lifecycle_select_admins" on public.phase36_account_lifecycle_events;
create policy "phase36_lifecycle_select_admins"
  on public.phase36_account_lifecycle_events for select to authenticated
  using (
    exists (
      select 1 from public.portal_directory_profiles p
      where p.auth_user_id = auth.uid()
        and p.role_key in ('chief_admin', 'super_admin')
    )
  );

grant select on public.phase36_account_lifecycle_events to authenticated;
