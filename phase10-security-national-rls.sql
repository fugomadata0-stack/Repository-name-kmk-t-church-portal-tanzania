-- PHASE 10 RLS: National Governance Strategy

create or replace function public.can_read_visibility(v text)
returns boolean
language sql
stable
as $$
  select case
    when public.current_app_role() in ('super_admin', 'national_admin') then true
    when public.current_app_role() in ('office_admin', 'diocese_admin', 'jimbo_admin', 'branch_admin', 'executive_viewer')
      then coalesce(v, 'Internal') in ('Public', 'Internal', 'Restricted')
    else coalesce(v, 'Public') = 'Public'
  end
$$;

create or replace function public.can_access_scope(record_diocese_id bigint, record_jimbo_id bigint, record_branch_id bigint)
returns boolean
language sql
stable
as $$
  select case
    when public.current_app_role() in ('super_admin', 'national_admin', 'office_admin') then true
    when public.current_app_role() = 'diocese_admin' then record_diocese_id = public.current_scope_diocese()
    when public.current_app_role() = 'jimbo_admin' then record_jimbo_id = public.current_scope_jimbo()
    when public.current_app_role() = 'branch_admin' then record_branch_id = public.current_scope_branch()
    when public.current_app_role() = 'executive_viewer' then true
    else false
  end
$$;

create or replace function public.can_write_data(record_diocese_id bigint, record_jimbo_id bigint, record_branch_id bigint)
returns boolean
language sql
stable
as $$
  select case
    when public.current_app_role() in ('super_admin', 'national_admin', 'office_admin') then true
    when public.current_app_role() = 'diocese_admin' then record_diocese_id = public.current_scope_diocese()
    when public.current_app_role() = 'jimbo_admin' then record_jimbo_id = public.current_scope_jimbo()
    when public.current_app_role() = 'branch_admin' then record_branch_id = public.current_scope_branch()
    else false
  end
$$;

-- Enable RLS (core domain)
alter table public.church_settings enable row level security;
alter table public.church_branding_assets enable row level security;
alter table public.dioceses enable row level security;
alter table public.majimbo enable row level security;
alter table public.local_units enable row level security;
alter table public.national_leaders enable row level security;
alter table public.diocese_leaders enable row level security;
alter table public.members enable row level security;
alter table public.families enable row level security;
alter table public.ministries enable row level security;
alter table public.fellowships enable row level security;
alter table public.departments enable row level security;
alter table public.choirs enable row level security;
alter table public.events enable row level security;
alter table public.publications enable row level security;
alter table public.documents enable row level security;
alter table public.institutions enable row level security;
alter table public.partner_organizations enable row level security;
alter table public.global_affiliations enable row level security;
alter table public.approval_workflows enable row level security;
alter table public.approval_steps enable row level security;
alter table public.audit_logs enable row level security;
alter table public.file_uploads enable row level security;
alter table public.notes enable row level security;
alter table public.comments enable row level security;
alter table public.custom_fields enable row level security;
alter table public.custom_field_values enable row level security;
alter table public.entity_tags enable row level security;
alter table public.report_templates enable row level security;
alter table public.notification_templates enable row level security;
alter table public.user_roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

-- Global read policy for public/internal visibility
drop policy if exists "public_select_church_settings" on public.church_settings;
create policy "public_select_church_settings" on public.church_settings
for select to authenticated, anon
using (public.can_read_visibility(visibility_level));

drop policy if exists "public_select_church_branding_assets" on public.church_branding_assets;
create policy "public_select_church_branding_assets" on public.church_branding_assets
for select to authenticated, anon
using (public.can_read_visibility(visibility_level));

drop policy if exists "select_scoped_dioceses" on public.dioceses;
create policy "select_scoped_dioceses" on public.dioceses
for select to authenticated, anon
using (public.can_read_visibility(visibility_level));

drop policy if exists "rw_dioceses_admin" on public.dioceses;
create policy "rw_dioceses_admin" on public.dioceses
for all to authenticated
using (public.current_app_role() in ('super_admin', 'national_admin', 'office_admin'))
with check (public.current_app_role() in ('super_admin', 'national_admin', 'office_admin'));

drop policy if exists "select_scoped_majimbo" on public.majimbo;
create policy "select_scoped_majimbo" on public.majimbo
for select to authenticated, anon
using (
  public.can_read_visibility(visibility_level)
  and public.can_access_scope(diocese_id, id, null)
);

drop policy if exists "rw_scoped_majimbo" on public.majimbo;
create policy "rw_scoped_majimbo" on public.majimbo
for all to authenticated
using (public.can_write_data(diocese_id, id, null))
with check (public.can_write_data(diocese_id, id, null));

drop policy if exists "select_scoped_local_units" on public.local_units;
create policy "select_scoped_local_units" on public.local_units
for select to authenticated, anon
using (
  public.can_read_visibility(visibility_level)
  and public.can_access_scope(null, jimbo_id, id)
);

drop policy if exists "rw_scoped_local_units" on public.local_units;
create policy "rw_scoped_local_units" on public.local_units
for all to authenticated
using (public.can_write_data(null, jimbo_id, id))
with check (public.can_write_data(null, jimbo_id, id));

-- Scoped people data
drop policy if exists "select_scoped_members" on public.members;
create policy "select_scoped_members" on public.members
for select to authenticated
using (
  public.can_read_visibility(visibility_level)
  and public.can_access_scope(diocese_id, jimbo_id, local_unit_id)
);

drop policy if exists "rw_scoped_members" on public.members;
create policy "rw_scoped_members" on public.members
for all to authenticated
using (public.can_write_data(diocese_id, jimbo_id, local_unit_id))
with check (public.can_write_data(diocese_id, jimbo_id, local_unit_id));

drop policy if exists "select_scoped_families" on public.families;
create policy "select_scoped_families" on public.families
for select to authenticated
using (
  public.can_read_visibility(visibility_level)
  and public.can_access_scope(diocese_id, jimbo_id, local_unit_id)
);

drop policy if exists "rw_scoped_families" on public.families;
create policy "rw_scoped_families" on public.families
for all to authenticated
using (public.can_write_data(diocese_id, jimbo_id, local_unit_id))
with check (public.can_write_data(diocese_id, jimbo_id, local_unit_id));

-- Module entities share same strategy
drop policy if exists "select_scoped_ministries" on public.ministries;
create policy "select_scoped_ministries" on public.ministries
for select to authenticated, anon
using (public.can_read_visibility(visibility_level) and public.can_access_scope(diocese_id, jimbo_id, local_unit_id));

drop policy if exists "rw_scoped_ministries" on public.ministries;
create policy "rw_scoped_ministries" on public.ministries
for all to authenticated
using (public.can_write_data(diocese_id, jimbo_id, local_unit_id))
with check (public.can_write_data(diocese_id, jimbo_id, local_unit_id));

drop policy if exists "select_scoped_events" on public.events;
create policy "select_scoped_events" on public.events
for select to authenticated, anon
using (public.can_read_visibility(visibility_level) and public.can_access_scope(diocese_id, jimbo_id, local_unit_id));

drop policy if exists "rw_scoped_events" on public.events;
create policy "rw_scoped_events" on public.events
for all to authenticated
using (public.can_write_data(diocese_id, jimbo_id, local_unit_id))
with check (public.can_write_data(diocese_id, jimbo_id, local_unit_id));

drop policy if exists "select_scoped_institutions" on public.institutions;
create policy "select_scoped_institutions" on public.institutions
for select to authenticated, anon
using (public.can_read_visibility(visibility_level) and public.can_access_scope(diocese_id, jimbo_id, local_unit_id));

drop policy if exists "rw_scoped_institutions" on public.institutions;
create policy "rw_scoped_institutions" on public.institutions
for all to authenticated
using (public.can_write_data(diocese_id, jimbo_id, local_unit_id))
with check (public.can_write_data(diocese_id, jimbo_id, local_unit_id));

drop policy if exists "select_documents_visibility" on public.documents;
create policy "select_documents_visibility" on public.documents
for select to authenticated
using (public.can_read_visibility(visibility_level) and public.can_access_scope(diocese_id, jimbo_id, local_unit_id));

drop policy if exists "rw_documents_scope" on public.documents;
create policy "rw_documents_scope" on public.documents
for all to authenticated
using (public.can_write_data(diocese_id, jimbo_id, local_unit_id))
with check (public.can_write_data(diocese_id, jimbo_id, local_unit_id));

drop policy if exists "select_publications_visibility" on public.publications;
create policy "select_publications_visibility" on public.publications
for select to authenticated, anon
using (public.can_read_visibility(visibility_level));

drop policy if exists "rw_publications_admin" on public.publications;
create policy "rw_publications_admin" on public.publications
for all to authenticated
using (public.current_app_role() in ('super_admin', 'national_admin', 'office_admin', 'diocese_admin'))
with check (public.current_app_role() in ('super_admin', 'national_admin', 'office_admin', 'diocese_admin'));

-- Confidential tables
drop policy if exists "audit_logs_select_strict" on public.audit_logs;
create policy "audit_logs_select_strict" on public.audit_logs
for select to authenticated
using (
  public.current_app_role() in ('super_admin', 'national_admin', 'office_admin', 'executive_viewer')
  or public.can_access_scope(diocese_id, jimbo_id, local_unit_id)
);

drop policy if exists "audit_logs_insert_strict" on public.audit_logs;
create policy "audit_logs_insert_strict" on public.audit_logs
for insert to authenticated
with check (true);

drop policy if exists "private_notes_scope" on public.notes;
create policy "private_notes_scope" on public.notes
for select to authenticated
using (public.current_app_role() <> 'public_viewer');

drop policy if exists "file_uploads_scope" on public.file_uploads;
create policy "file_uploads_scope" on public.file_uploads
for select to authenticated
using (public.can_read_visibility(visibility_level));

-- RBAC admin area
drop policy if exists "rbac_admin_only_roles" on public.user_roles;
create policy "rbac_admin_only_roles" on public.user_roles
for all to authenticated
using (public.current_app_role() in ('super_admin', 'national_admin'))
with check (public.current_app_role() in ('super_admin', 'national_admin'));

drop policy if exists "rbac_admin_only_permissions" on public.permissions;
create policy "rbac_admin_only_permissions" on public.permissions
for all to authenticated
using (public.current_app_role() in ('super_admin', 'national_admin'))
with check (public.current_app_role() in ('super_admin', 'national_admin'));

drop policy if exists "rbac_admin_only_role_permissions" on public.role_permissions;
create policy "rbac_admin_only_role_permissions" on public.role_permissions
for all to authenticated
using (public.current_app_role() in ('super_admin', 'national_admin'))
with check (public.current_app_role() in ('super_admin', 'national_admin'));

-- Storage policies
drop policy if exists "public_read_logos" on storage.objects;
create policy "public_read_logos" on storage.objects
for select to anon, authenticated
using (bucket_id in ('logos', 'publications', 'media'));

drop policy if exists "authenticated_upload_scoped" on storage.objects;
create policy "authenticated_upload_scoped" on storage.objects
for insert to authenticated
with check (
  public.current_app_role() in ('super_admin','national_admin','office_admin','diocese_admin','jimbo_admin','branch_admin')
);

drop policy if exists "authenticated_manage_private_files" on storage.objects;
create policy "authenticated_manage_private_files" on storage.objects
for all to authenticated
using (
  bucket_id not in ('logos', 'publications', 'media')
  and public.current_app_role() in ('super_admin','national_admin','office_admin','diocese_admin')
)
with check (
  bucket_id not in ('logos', 'publications', 'media')
  and public.current_app_role() in ('super_admin','national_admin','office_admin','diocese_admin')
);
