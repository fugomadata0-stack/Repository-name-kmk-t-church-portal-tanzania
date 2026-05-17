-- KMK(T) Step 12 — Enterprise audit tracking (additive)

alter table if exists public.audit_logs
  add column if not exists action_category text;

do $$
begin
  alter table public.audit_logs
    add constraint audit_logs_action_category_check
    check (
      action_category is null
      or action_category in ('create', 'update', 'delete', 'approve', 'upload', 'export', 'download', 'login', 'other')
    );
exception when others then null;
end $$;

create index if not exists idx_audit_logs_action_category on public.audit_logs (action_category, created_at desc);
create index if not exists idx_audit_logs_module_created on public.audit_logs (module, created_at desc);

-- Backfill category from legacy action strings (safe, idempotent)
update public.audit_logs
set action_category = case
  when action_category is not null then action_category
  when action ~* '(^|_)(create|insert|add|new|signup|register)(_|$)' then 'create'
  when action ~* '(approve|idhini|verify|verified|reject)' then 'approve'
  when action ~* '(delete|remove|drop)' then 'delete'
  when action ~* '(upload|pakua_up|attach)' then 'upload'
  when action ~* '(export|pdf|excel|print|download)' and action !~* 'upload' then
    case when action ~* 'download' then 'download' else 'export' end
  when action ~* '(login|logout|sign_in|sign_out|session)' then 'login'
  when action ~* '(update|edit|upsert|save|patch)' then 'update'
  else 'other'
end
where action_category is null;

-- Normalize timestamps: ensure created_at always set server-side on insert
create or replace function public.audit_logs_set_timestamps()
returns trigger
language plpgsql
as $$
begin
  if new.created_at is null then
    new.created_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists audit_logs_set_timestamps_trg on public.audit_logs;
create trigger audit_logs_set_timestamps_trg
  before insert on public.audit_logs
  for each row execute function public.audit_logs_set_timestamps();

-- Infer category when omitted
create or replace function public.audit_logs_infer_category()
returns trigger
language plpgsql
as $$
begin
  if new.action_category is null or trim(new.action_category) = '' then
    new.action_category := case
      when new.action ~* '(^|_)(create|insert|add|new)(_|$)' then 'create'
      when new.action ~* '(approve|idhini|verify|reject)' then 'approve'
      when new.action ~* '(delete|remove)' then 'delete'
      when new.action ~* 'upload' then 'upload'
      when new.action ~* 'download' then 'download'
      when new.action ~* '(export|pdf|excel|print)' then 'export'
      when new.action ~* '(login|logout|session)' then 'login'
      when new.action ~* '(update|edit|upsert|save)' then 'update'
      else 'other'
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists audit_logs_infer_category_trg on public.audit_logs;
create trigger audit_logs_infer_category_trg
  before insert on public.audit_logs
  for each row execute function public.audit_logs_infer_category();

-- Dashboard summary RPC
create or replace function public.portal_audit_dashboard_summary(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
  v_total bigint;
  v_failed bigint;
  v_by_category jsonb;
  v_by_module jsonb;
  v_by_day jsonb;
  v_top_users jsonb;
begin
  if not (
    public.portal_has_module_capability('usalama', 'view')
    or public.portal_has_module_capability('usalama', 'audit')
    or public.portal_has_module_capability('dashboard', 'view')
  ) then
    return jsonb_build_object('error', 'forbidden');
  end if;

  select count(*)::bigint into v_total
  from public.audit_logs
  where created_at >= v_since;

  select count(*)::bigint into v_failed
  from public.audit_logs
  where created_at >= v_since and status = 'failed';

  select coalesce(jsonb_agg(jsonb_build_object('category', action_category, 'count', cnt) order by cnt desc), '[]'::jsonb)
  into v_by_category
  from (
    select coalesce(action_category, 'other') as action_category, count(*)::bigint as cnt
    from public.audit_logs
    where created_at >= v_since
    group by 1
  ) s;

  select coalesce(jsonb_agg(jsonb_build_object('module', module, 'count', cnt) order by cnt desc), '[]'::jsonb)
  into v_by_module
  from (
    select coalesce(nullif(trim(module), ''), 'general') as module, count(*)::bigint as cnt
    from public.audit_logs
    where created_at >= v_since
    group by 1
    order by cnt desc
    limit 12
  ) s;

  select coalesce(jsonb_agg(jsonb_build_object('day', day, 'total', cnt) order by day), '[]'::jsonb)
  into v_by_day
  from (
    select to_char(date_trunc('day', created_at at time zone 'Africa/Dar_es_Salaam'), 'YYYY-MM-DD') as day,
           count(*)::bigint as cnt
    from public.audit_logs
    where created_at >= v_since
    group by 1
  ) s;

  select coalesce(jsonb_agg(jsonb_build_object('name', performed_by_name, 'count', cnt) order by cnt desc), '[]'::jsonb)
  into v_top_users
  from (
    select coalesce(nullif(trim(performed_by_name), ''), 'Haijulikani') as performed_by_name,
           count(*)::bigint as cnt
    from public.audit_logs
    where created_at >= v_since
    group by 1
    order by cnt desc
    limit 8
  ) s;

  return jsonb_build_object(
    'since', v_since,
    'days', p_days,
    'total', v_total,
    'failed', v_failed,
    'by_category', v_by_category,
    'by_module', v_by_module,
    'by_day', v_by_day,
    'top_users', v_top_users
  );
end;
$$;

revoke all on function public.portal_audit_dashboard_summary(int) from public;
grant execute on function public.portal_audit_dashboard_summary(int) to authenticated;

notify pgrst, 'reload schema';
