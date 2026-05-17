-- KMK(T) Portal — query performance indexes (additive, idempotent, production-safe)
-- Maps common filter/sort paths used by dashboard, scope RLS, and module services.
-- Does NOT drop or alter existing objects.

-- ——— MUUNDO (dayosisi → jimbo → tawi) ———
create index if not exists idx_church_jimbo_dayosisi_status
  on public.church_jimbo (dayosisi_id, status);

create index if not exists idx_church_tawi_jimbo_status
  on public.church_tawi (jimbo_id, status);

create index if not exists idx_church_tawi_status_verification
  on public.church_tawi (status, verification_status);

-- ——— WAUMINI (geo scope + membership filters) ———
create index if not exists idx_church_members_tawi_membership
  on public.church_members (tawi_id, membership_status);

create index if not exists idx_church_members_jimbo_membership
  on public.church_members (jimbo_id, membership_status);

create index if not exists idx_church_members_dayosisi_membership
  on public.church_members (dayosisi_id, membership_status);

create index if not exists idx_church_members_ministry_segment_status
  on public.church_members (ministry_segment, membership_status)
  where ministry_segment is not null;

-- ——— MAPATO / FEDHA (church_income_lines — si "offerings") ———
create index if not exists idx_church_income_lines_tawi_collection_date
  on public.church_income_lines (tawi_id, collection_date desc);

create index if not exists idx_church_income_lines_jimbo_collection_date
  on public.church_income_lines (jimbo_id, collection_date desc);

create index if not exists idx_church_income_lines_dayosisi_collection_date
  on public.church_income_lines (dayosisi_id, collection_date desc);

create index if not exists idx_church_income_lines_created_at_desc
  on public.church_income_lines (created_at desc);

create index if not exists idx_church_finance_entries_tawi_entry_date
  on public.church_finance_entries (tawi_id, entry_date desc)
  where tawi_id is not null;

-- ——— Remittance ledger ———
create index if not exists idx_church_income_remittances_status_created
  on public.church_income_remittances (approval_status, created_at desc);

-- ——— MAHUDHURIO ———
create index if not exists idx_attendance_sessions_tawi_date
  on public.attendance_sessions (tawi_id, attendance_date desc)
  where tawi_id is not null;

-- ——— VIONGOZI (church_viongozi — si "leaders") ———
create index if not exists idx_church_viongozi_scope_status
  on public.church_viongozi (leadership_level, status);

create index if not exists idx_church_viongozi_tawi_status
  on public.church_viongozi (tawi_id, status)
  where tawi_id is not null;

-- ——— NOTIFICATIONS ———
create index if not exists idx_notifications_target_user_created
  on public.notifications (target_user_id, created_at desc)
  where target_user_id is not null;

create index if not exists idx_notifications_target_role_created
  on public.notifications (target_role, created_at desc)
  where target_role is not null and length(trim(target_role)) > 0;

-- ——— AUDIT ———
create index if not exists idx_audit_logs_performed_by_created
  on public.audit_logs (performed_by_user_id, created_at desc)
  where performed_by_user_id is not null;

-- ——— MEDIA / PUBLIC FEEDS ———
create index if not exists idx_events_event_date_desc
  on public.events (event_date desc);

create index if not exists idx_news_posts_created_at_desc
  on public.news_posts (created_at desc);

create index if not exists idx_documents_created_at_desc
  on public.documents (created_at desc);

-- ——— Upload center (optional table from Step 11) ———
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'portal_upload_registry'
  ) then
    execute 'create index if not exists idx_portal_upload_registry_category_created on public.portal_upload_registry (category, created_at desc)';
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'church_contribution_form_uploads'
  ) then
    execute 'create index if not exists idx_church_contribution_form_uploads_verification_created on public.church_contribution_form_uploads (verification_status, created_at desc)';
  end if;
end $$;

analyze public.church_members;
analyze public.church_jimbo;
analyze public.church_tawi;
analyze public.church_income_lines;
analyze public.church_income_remittances;
analyze public.attendance_sessions;
analyze public.notifications;
analyze public.audit_logs;

notify pgrst, 'reload schema';
