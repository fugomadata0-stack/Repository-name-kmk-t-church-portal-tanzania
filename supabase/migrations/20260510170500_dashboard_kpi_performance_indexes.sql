-- Dashboard KPI performance index pack
-- Safe, non-destructive: CREATE INDEX IF NOT EXISTS only.

-- MUUNDO
create index if not exists idx_dayosisi_status on public.dayosisi (status);
create index if not exists idx_church_jimbo_status on public.church_jimbo (status);
create index if not exists idx_church_tawi_status on public.church_tawi (status);

-- WAUMINI
create index if not exists idx_church_members_membership_status on public.church_members (membership_status);
create index if not exists idx_church_members_is_baptized on public.church_members (is_baptized);
create index if not exists idx_church_members_created_at on public.church_members (created_at desc);

-- VIONGOZI
create index if not exists idx_church_viongozi_status on public.church_viongozi (status);
create index if not exists idx_church_viongozi_term_status_end_date on public.church_viongozi (term_status, end_date);
create index if not exists idx_church_viongozi_leadership_level on public.church_viongozi (leadership_level);
create index if not exists idx_church_viongozi_ngazi on public.church_viongozi (ngazi);

-- DOMAIN / MUUNDO REGISTRY
create index if not exists idx_portal_domain_entities_module_submodule_status
  on public.portal_domain_entities (module_key, submodule_key, status);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'church_structure_entities'
  ) then
    execute 'create index if not exists idx_church_structure_entities_status on public.church_structure_entities (status)';
  end if;
end
$$;

-- DOCUMENTS
create index if not exists idx_documents_created_at on public.documents (created_at desc);

-- FEDHA / MAPATO
create index if not exists idx_church_income_sources_status on public.church_income_sources (status);
create index if not exists idx_church_income_sources_source_type on public.church_income_sources (source_type);
create index if not exists idx_church_income_sources_restricted_fund on public.church_income_sources (restricted_fund);

create index if not exists idx_church_income_lines_collection_date_status
  on public.church_income_lines (collection_date, status);
create index if not exists idx_church_income_lines_status on public.church_income_lines (status);
create index if not exists idx_church_income_lines_main_category on public.church_income_lines (main_category);
create index if not exists idx_church_income_lines_source_name on public.church_income_lines (source_name);

create index if not exists idx_church_finance_entries_entry_date_status_aina
  on public.church_finance_entries (entry_date, status, aina);
create index if not exists idx_church_finance_entries_status on public.church_finance_entries (status);

-- ATTENDANCE
create index if not exists idx_attendance_sessions_attendance_date
  on public.attendance_sessions (attendance_date);

-- AUDIT / SECURITY KPIs
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_status_created_at on public.audit_logs (status, created_at desc);

create index if not exists idx_portal_directory_profiles_status on public.portal_directory_profiles (status);
create index if not exists idx_portal_visibility_rules_priority on public.portal_visibility_rules (priority);
create index if not exists idx_portal_module_matrix_role_module on public.portal_module_matrix (role_key, module_key);
