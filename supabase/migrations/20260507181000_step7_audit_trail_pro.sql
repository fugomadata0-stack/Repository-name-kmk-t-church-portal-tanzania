-- STEP 7: Audit trail pro-level fields, indexes, and RLS hardening

alter table public.audit_logs
  add column if not exists audit_uuid uuid not null default gen_random_uuid(),
  add column if not exists module text not null default 'general',
  add column if not exists entity_type text not null default 'general',
  add column if not exists entity_name text,
  add column if not exists performed_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists performed_by_name text,
  add column if not exists role_key text,
  add column if not exists old_values jsonb,
  add column if not exists new_values jsonb,
  add column if not exists ip_address text,
  add column if not exists user_agent text,
  add column if not exists status text not null default 'success' check (status in ('success', 'failed')),
  add column if not exists message text;

create unique index if not exists idx_audit_logs_audit_uuid on public.audit_logs(audit_uuid);
create index if not exists idx_audit_logs_module on public.audit_logs(module);
create index if not exists idx_audit_logs_action on public.audit_logs(action);
create index if not exists idx_audit_logs_user_id on public.audit_logs(performed_by_user_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_entity_type on public.audit_logs(entity_type);
create index if not exists idx_audit_logs_status on public.audit_logs(status);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_insert_authenticated" on public.audit_logs;
drop policy if exists "audit_logs_select_authenticated" on public.audit_logs;

create policy "audit_logs_insert_authenticated"
on public.audit_logs
for insert
to authenticated
with check (true);

create policy "audit_logs_select_authenticated"
on public.audit_logs
for select
to authenticated
using (true);
