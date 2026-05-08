-- PHASE 21 RLS: Nyaraka Rasmi & Approval Workflow

alter table if exists public.documents enable row level security;
alter table if exists public.document_templates enable row level security;
alter table if exists public.approval_requests enable row level security;
alter table if exists public.approval_steps enable row level security;
alter table if exists public.document_versions enable row level security;
alter table if exists public.document_archive enable row level security;
alter table if exists public.document_audit_logs enable row level security;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'app_role'), '');
$$;

create or replace function public.is_docs_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('Chief Admin','Super Admin','admin','askofu_mkuu','askofu_dayosisi','mchungaji');
$$;

drop policy if exists docs_select on public.documents;
create policy docs_select on public.documents
for select to authenticated
using (public.is_docs_admin());

drop policy if exists docs_write on public.documents;
create policy docs_write on public.documents
for all to authenticated
using (public.is_docs_admin())
with check (public.is_docs_admin());

drop policy if exists templates_select on public.document_templates;
create policy templates_select on public.document_templates
for select to authenticated
using (public.is_docs_admin());

drop policy if exists templates_write on public.document_templates;
create policy templates_write on public.document_templates
for all to authenticated
using (public.current_app_role() in ('Chief Admin','Super Admin','admin'))
with check (public.current_app_role() in ('Chief Admin','Super Admin','admin'));

drop policy if exists approvals_select on public.approval_requests;
create policy approvals_select on public.approval_requests
for select to authenticated
using (public.is_docs_admin());

drop policy if exists approvals_write on public.approval_requests;
create policy approvals_write on public.approval_requests
for all to authenticated
using (public.is_docs_admin())
with check (public.is_docs_admin());

drop policy if exists approval_steps_select on public.approval_steps;
create policy approval_steps_select on public.approval_steps
for select to authenticated
using (public.is_docs_admin());

drop policy if exists approval_steps_insert on public.approval_steps;
create policy approval_steps_insert on public.approval_steps
for insert to authenticated
with check (public.is_docs_admin());

drop policy if exists versions_select on public.document_versions;
create policy versions_select on public.document_versions
for select to authenticated
using (public.is_docs_admin());

drop policy if exists versions_write on public.document_versions;
create policy versions_write on public.document_versions
for all to authenticated
using (public.is_docs_admin())
with check (public.is_docs_admin());

drop policy if exists archive_select on public.document_archive;
create policy archive_select on public.document_archive
for select to authenticated
using (public.is_docs_admin());

drop policy if exists archive_insert on public.document_archive;
create policy archive_insert on public.document_archive
for insert to authenticated
with check (public.is_docs_admin());

drop policy if exists doc_audit_select on public.document_audit_logs;
create policy doc_audit_select on public.document_audit_logs
for select to authenticated
using (public.current_app_role() in ('Chief Admin','Super Admin','admin'));

drop policy if exists doc_audit_insert on public.document_audit_logs;
create policy doc_audit_insert on public.document_audit_logs
for insert to authenticated
with check (public.is_docs_admin());
