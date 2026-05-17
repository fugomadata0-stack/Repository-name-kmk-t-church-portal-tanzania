-- KMK(T) Step 10 — Enterprise RBAC & Security (additive, preserve existing users)

-- ——— Role alias: diocese_admin → dayosisi_admin (legacy keys) ———
create or replace function public.portal_normalize_role_key(p_role text)
returns text
language sql
immutable
as $$
  select case lower(trim(coalesce(p_role, '')))
    when 'diocese_admin' then 'dayosisi_admin'
    else lower(trim(coalesce(p_role, '')))
  end;
$$;

-- ——— Unified current role (directory first, JWT fallback) ———
create or replace function public.current_app_role()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select public.portal_normalize_role_key(p.role_key)
    into v_role
  from public.portal_directory_profiles p
  where p.auth_user_id = auth.uid()
    and p.status = 'active'
  limit 1;

  if v_role is not null and v_role <> '' then
    return v_role;
  end if;

  return public.portal_normalize_role_key(
    coalesce(auth.jwt() ->> 'app_role', auth.jwt() ->> 'role', '')
  );
end;
$$;

revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

comment on function public.current_app_role() is
  'Active portal_directory_profiles.role_key for auth.uid(), else JWT app_role; normalizes diocese_admin.';

-- ——— Extended capability check (view/create/edit/delete + audit/export/actions) ———
create or replace function public.portal_has_module_capability(p_module_key text, p_capability text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.portal_directory_profiles p
    join public.portal_module_matrix m
      on m.role_key = public.portal_normalize_role_key(p.role_key)
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and m.module_key = p_module_key
      and (
        (p_capability = 'view' and m.can_view)
        or (p_capability = 'create' and m.can_create)
        or (p_capability = 'edit' and m.can_edit)
        or (p_capability = 'delete' and m.can_delete)
        or (p_capability = 'export' and m.can_export)
        or (p_capability = 'audit' and m.can_audit)
        or (p_capability = 'approve' and coalesce(m.can_approve, false))
        or (p_capability = 'reject' and coalesce(m.can_reject, false))
        or (p_capability = 'print' and coalesce(m.can_print, false))
        or (p_capability = 'upload' and coalesce(m.can_upload, false))
        or (p_capability = 'download' and coalesce(m.can_download, false))
        or (p_capability = 'manage_settings' and coalesce(m.can_manage_settings, false))
      )
  );
$$;

revoke all on function public.portal_has_module_capability(text, text) from public;
grant execute on function public.portal_has_module_capability(text, text) to authenticated;

-- ——— Enterprise role: auditor ———
insert into public.portal_roles (role_key, label_sw, label_en, hierarchy_rank, description, is_system)
values
  ('auditor', 'Mkaguzi', 'Auditor', 58, 'Kusoma, kuhakiki, na kumbukumbu za usalama — hakuna uhariri.', true)
on conflict (role_key) do update set
  label_sw = excluded.label_sw,
  label_en = excluded.label_en,
  hierarchy_rank = excluded.hierarchy_rank,
  description = excluded.description;

-- ——— Auditor matrix (read + audit; no mutations) ———
insert into public.portal_module_matrix (
  role_key, module_key, can_view, can_create, can_edit, can_delete, can_export, can_audit,
  can_approve, can_reject, can_print, can_upload, can_download, can_manage_settings
)
select
  'auditor',
  m.module_key,
  true,
  false,
  false,
  false,
  true,
  m.module_key in ('fedha', 'mapato_income', 'usalama', 'ripoti', 'dashboard', 'nyaraka'),
  false,
  false,
  true,
  false,
  true,
  false
from (
  values
    ('dashboard'),
    ('analytics'),
    ('ripoti'),
    ('usalama'),
    ('fedha'),
    ('mapato_income'),
    ('waumini'),
    ('viongozi'),
    ('muundo'),
    ('nyaraka'),
    ('communications'),
    ('notifications'),
    ('attendance'),
    ('aid_management')
) as m(module_key)
on conflict (role_key, module_key) do update set
  can_view = excluded.can_view,
  can_create = excluded.can_create,
  can_edit = excluded.can_edit,
  can_delete = excluded.can_delete,
  can_export = excluded.can_export,
  can_audit = excluded.can_audit,
  can_print = excluded.can_print,
  can_download = excluded.can_download,
  updated_at = now();

-- ——— Geo scope: auditor read-only (no writes) ———
create or replace function public.portal_scope_geo_write_allowed(
  p_dayosisi uuid,
  p_jimbo uuid,
  p_tawi uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r text;
  d_scope uuid;
  j_scope uuid;
  t_scope uuid;
begin
  select public.portal_normalize_role_key(p.role_key),
         nullif(trim(p.dayosisi_scope), '')::uuid,
         nullif(trim(p.jimbo_scope), '')::uuid,
         nullif(trim(p.tawi_scope), '')::uuid
    into r, d_scope, j_scope, t_scope
  from public.portal_directory_profiles p
  where p.auth_user_id = auth.uid()
    and p.status = 'active'
  limit 1;

  if r is null then
    return false;
  end if;

  if r in ('super_admin', 'chief_admin') then
    return true;
  end if;

  if r in ('viewer', 'reviewer', 'auditor', 'member_user') then
    return false;
  end if;

  if r in ('national_admin', 'office_admin', 'secretary')
     and d_scope is null and j_scope is null and t_scope is null then
    return true;
  end if;

  if r = 'tawi_admin' then
    if t_scope is null then return false; end if;
    return p_tawi is not null and p_tawi = t_scope;
  end if;

  if r = 'jimbo_admin' then
    if j_scope is null then return false; end if;
    if p_jimbo is not null and p_jimbo = j_scope then return true; end if;
    if p_tawi is not null then
      return exists (
        select 1 from public.church_tawi t
        where t.id = p_tawi and t.jimbo_id = j_scope
      );
    end if;
    return false;
  end if;

  if r = 'dayosisi_admin' then
    if d_scope is null then return false; end if;
    if p_dayosisi is not null and p_dayosisi = d_scope then return true; end if;
    if p_jimbo is not null then
      return exists (
        select 1 from public.church_jimbo j
        where j.id = p_jimbo and j.dayosisi_id = d_scope
      );
    end if;
    if p_tawi is not null then
      return exists (
        select 1 from public.church_tawi t
        join public.church_jimbo j on j.id = t.jimbo_id
        where t.id = p_tawi and j.dayosisi_id = d_scope
      );
    end if;
    return false;
  end if;

  if r = 'national_admin' then
    if d_scope is null and j_scope is null and t_scope is null then return true; end if;
    if t_scope is not null then
      if p_tawi is null then return false; end if;
      return p_tawi = t_scope;
    end if;
    if j_scope is not null then
      if p_jimbo is not null and p_jimbo = j_scope then return true; end if;
      if p_tawi is not null then
        return exists (select 1 from public.church_tawi t where t.id = p_tawi and t.jimbo_id = j_scope);
      end if;
      return false;
    end if;
    if d_scope is not null then
      if p_dayosisi is not null and p_dayosisi = d_scope then return true; end if;
      if p_jimbo is not null then
        return exists (select 1 from public.church_jimbo j where j.id = p_jimbo and j.dayosisi_id = d_scope);
      end if;
      if p_tawi is not null then
        return exists (
          select 1 from public.church_tawi t
          join public.church_jimbo j on j.id = t.jimbo_id
          where t.id = p_tawi and j.dayosisi_id = d_scope
        );
      end if;
    end if;
    return false;
  end if;

  if r in ('finance_admin', 'editor', 'approver') then
    return true;
  end if;

  return false;
end;
$$;

-- ——— Security audit log (enterprise) ———
create table if not exists public.portal_security_audit_logs (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  role_key text,
  event_type text not null,
  module_key text,
  resource_path text,
  outcome text not null default 'denied' check (outcome in ('allowed', 'denied', 'error')),
  message text,
  detail jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists portal_security_audit_logs_created_idx
  on public.portal_security_audit_logs (created_at desc);
create index if not exists portal_security_audit_logs_user_idx
  on public.portal_security_audit_logs (auth_user_id, created_at desc);
create index if not exists portal_security_audit_logs_event_idx
  on public.portal_security_audit_logs (event_type, created_at desc);

alter table public.portal_security_audit_logs enable row level security;

grant select, insert on public.portal_security_audit_logs to authenticated;

drop policy if exists "portal_security_audit_insert_auth" on public.portal_security_audit_logs;
create policy "portal_security_audit_insert_auth"
  on public.portal_security_audit_logs for insert to authenticated
  with check (auth.uid() is not null);

drop policy if exists "portal_security_audit_select_rbac" on public.portal_security_audit_logs;
create policy "portal_security_audit_select_rbac"
  on public.portal_security_audit_logs for select to authenticated
  using (
    public.portal_has_module_capability('usalama', 'view')
    or public.portal_has_module_capability('usalama', 'audit')
    or auth.uid() = auth_user_id
  );

-- ——— RPC: log security events from portal ———
create or replace function public.portal_log_security_event(
  p_event_type text,
  p_module_key text default null,
  p_resource_path text default null,
  p_outcome text default 'denied',
  p_message text default null,
  p_detail jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_role text;
begin
  v_role := public.current_app_role();
  insert into public.portal_security_audit_logs (
    auth_user_id,
    role_key,
    event_type,
    module_key,
    resource_path,
    outcome,
    message,
    detail
  )
  values (
    auth.uid(),
    nullif(v_role, ''),
    lower(trim(coalesce(p_event_type, 'security'))),
    nullif(trim(coalesce(p_module_key, '')), ''),
    nullif(trim(coalesce(p_resource_path, '')), ''),
    case lower(trim(coalesce(p_outcome, 'denied')))
      when 'allowed' then 'allowed'
      when 'error' then 'error'
      else 'denied'
    end,
    nullif(trim(coalesce(p_message, '')), ''),
    coalesce(p_detail, '{}'::jsonb)
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.portal_log_security_event(text, text, text, text, text, jsonb) from public;
grant execute on function public.portal_log_security_event(text, text, text, text, text, jsonb) to authenticated;

-- ——— portal_access_events: auth_user_id + expanded event types ———
alter table public.portal_access_events
  add column if not exists auth_user_id uuid;

do $$
begin
  alter table public.portal_access_events drop constraint if exists portal_access_events_event_type_check;
  alter table public.portal_access_events add constraint portal_access_events_event_type_check
    check (event_type in (
      'login', 'logout', 'token_refresh', 'page_view', 'api',
      'policy_change', 'rbac_change',
      'rbac_denied', 'permission_denied', 'session_idle', 'rls_denied'
    ));
exception when others then
  null;
end $$;

-- Tighten RLS on portal_access_events (keep insert for authenticated; view for security roles)
drop policy if exists "portal_access_anon_all" on public.portal_access_events;
drop policy if exists "portal_access_auth_all" on public.portal_access_events;

drop policy if exists "portal_access_events_select_rbac" on public.portal_access_events;
create policy "portal_access_events_select_rbac"
  on public.portal_access_events for select to authenticated
  using (
    public.portal_has_module_capability('usalama', 'view')
    or auth.uid() = auth_user_id
  );

drop policy if exists "portal_access_events_insert_auth" on public.portal_access_events;
create policy "portal_access_events_insert_auth"
  on public.portal_access_events for insert to authenticated
  with check (auth.uid() is not null);

drop policy if exists "portal_access_events_insert_service" on public.portal_access_events;
create policy "portal_access_events_insert_service"
  on public.portal_access_events for insert to authenticated
  with check (
    public.current_app_role() in ('chief_admin', 'super_admin')
    or public.portal_has_module_capability('usalama', 'create')
  );

notify pgrst, 'reload schema';
