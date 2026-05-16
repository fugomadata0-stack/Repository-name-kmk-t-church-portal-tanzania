-- Injini ya Matawi / Branch Engine — workspace ya fomu (JSON) kwenye Supabase, si localStorage.

create table if not exists public.portal_branch_engine_workspace (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  scope text not null check (scope in ('kitaifa', 'dayosisi', 'jimbo', 'tawi')),
  entity_id text not null default '',
  active_module_id text not null default 'registration',
  form_payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (auth_user_id, scope, entity_id)
);

create index if not exists portal_branch_engine_workspace_user_idx
  on public.portal_branch_engine_workspace (auth_user_id, updated_at desc);

create or replace function public.portal_touch_branch_engine_workspace()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_portal_branch_engine_workspace_touch on public.portal_branch_engine_workspace;
create trigger trg_portal_branch_engine_workspace_touch
before update on public.portal_branch_engine_workspace
for each row
execute function public.portal_touch_branch_engine_workspace();

alter table public.portal_branch_engine_workspace enable row level security;

drop policy if exists portal_branch_engine_workspace_select_own on public.portal_branch_engine_workspace;
create policy portal_branch_engine_workspace_select_own
on public.portal_branch_engine_workspace
for select
to authenticated
using (auth_user_id = auth.uid());

drop policy if exists portal_branch_engine_workspace_insert_own on public.portal_branch_engine_workspace;
create policy portal_branch_engine_workspace_insert_own
on public.portal_branch_engine_workspace
for insert
to authenticated
with check (auth_user_id = auth.uid());

drop policy if exists portal_branch_engine_workspace_update_own on public.portal_branch_engine_workspace;
create policy portal_branch_engine_workspace_update_own
on public.portal_branch_engine_workspace
for update
to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

drop policy if exists portal_branch_engine_workspace_delete_own on public.portal_branch_engine_workspace;
create policy portal_branch_engine_workspace_delete_own
on public.portal_branch_engine_workspace
for delete
to authenticated
using (auth_user_id = auth.uid());

grant select, insert, update, delete on public.portal_branch_engine_workspace to authenticated;

-- Realtime — sync workspace across tabs/devices
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'portal_branch_engine_workspace'
    ) then
      execute 'alter publication supabase_realtime add table public.portal_branch_engine_workspace';
    end if;
  end if;
end $$;
