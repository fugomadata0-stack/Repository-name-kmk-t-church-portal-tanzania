-- KMKT Enterprise Base Performance Pack (safe / additive)
-- Non-destructive: only creates function/schema/indexes if missing.

begin;

set local lock_timeout = '5s';
set local idle_in_transaction_session_timeout = '60s';

-- 1) Common infra for updated_at management
create schema if not exists app_private;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
  tables text[] := array[
    'church_members',
    'church_families',
    'church_income_lines',
    'church_finance_entries',
    'church_income_sources',
    'church_viongozi',
    'documents',
    'events',
    'news_posts',
    'portal_directory_profiles',
    'portal_visibility_rules',
    'portal_module_matrix'
  ];
begin
  foreach t in array tables loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = t
        and column_name = 'updated_at'
    ) then
      execute format('drop trigger if exists trg_%I_set_updated_at on public.%I', t, t);
      execute format(
        'create trigger trg_%I_set_updated_at before update on public.%I for each row execute function app_private.set_updated_at()',
        t, t
      );
    end if;
  end loop;
end $$;

-- 2) KPI / Dashboard performance indexes
-- Top overview strip
create index if not exists idx_church_members_membership_status
  on public.church_members (membership_status);

create index if not exists idx_church_members_is_baptized
  on public.church_members (is_baptized);

create index if not exists idx_church_members_active_partial
  on public.church_members (id)
  where membership_status = 'active';

create index if not exists idx_church_members_baptized_partial
  on public.church_members (id)
  where is_baptized = true;

create index if not exists idx_church_families_created_at
  on public.church_families (created_at desc);

-- Muundo
create index if not exists idx_dayosisi_status on public.dayosisi (status);
create index if not exists idx_church_jimbo_status on public.church_jimbo (status);
create index if not exists idx_church_tawi_status on public.church_tawi (status);

-- Viongozi
create index if not exists idx_church_viongozi_status on public.church_viongozi (status);
create index if not exists idx_church_viongozi_term_status_end_date on public.church_viongozi (term_status, end_date);

-- Domain entities
create index if not exists idx_portal_domain_entities_module_submodule_status
  on public.portal_domain_entities (module_key, submodule_key, status);

-- Finance / Income
create index if not exists idx_church_income_sources_status on public.church_income_sources (status);
create index if not exists idx_church_income_lines_collection_date_status
  on public.church_income_lines (collection_date, status);
create index if not exists idx_church_income_lines_main_category
  on public.church_income_lines (main_category);
create index if not exists idx_church_finance_entries_entry_date_status_aina
  on public.church_finance_entries (entry_date, status, aina);

-- Attendance
create index if not exists idx_attendance_sessions_attendance_date
  on public.attendance_sessions (attendance_date);

-- Audit / Security
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_status_created_at on public.audit_logs (status, created_at desc);
create index if not exists idx_portal_directory_profiles_status on public.portal_directory_profiles (status);
create index if not exists idx_portal_visibility_rules_priority on public.portal_visibility_rules (priority);
create index if not exists idx_portal_module_matrix_role_module on public.portal_module_matrix (role_key, module_key);

-- 3) Planner stats refresh
analyze public.church_members;
analyze public.church_families;
analyze public.dayosisi;
analyze public.church_jimbo;
analyze public.church_tawi;
analyze public.church_viongozi;
analyze public.church_income_lines;
analyze public.church_finance_entries;
analyze public.audit_logs;

commit;
