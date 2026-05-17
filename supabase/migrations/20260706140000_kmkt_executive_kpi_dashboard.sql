-- KMK(T) Step 7 — Executive KPI Dashboard (additive)

-- ——— Scoped executive KPI bundle ———
create or replace function public.portal_executive_kpi_dashboard(
  p_scope text default 'kmkt',
  p_entity_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_scope text := lower(trim(coalesce(p_scope, 'kmkt')));
  v_start date := date_trunc('month', current_date)::date;
  v_end date := current_date;
  v_membership jsonb;
  v_finance jsonb;
  v_projects jsonb;
  v_att_sessions int := 0;
  v_att_today int := 0;
  v_att_visitors bigint := 0;
  v_uploads_pending int := 0;
  v_uploads_total int := 0;
  v_rem_pending int := 0;
  v_income_pending int := 0;
begin
  if not (
    public.portal_has_module_capability('ripoti', 'view')
    or public.portal_has_module_capability('analytics', 'view')
    or public.portal_has_module_capability('dashboard', 'view')
  ) then
    return jsonb_build_object('error', 'forbidden');
  end if;

  v_membership := public.portal_membership_statistics(v_scope, p_entity_id);
  v_finance := public.portal_finance_distribution_summary(v_scope, p_entity_id, v_start, v_end);
  v_projects := public.portal_church_projects_analytics(v_scope, p_entity_id);

  select count(*)::int into v_uploads_total from public.church_contribution_form_uploads;
  select count(*)::int into v_uploads_pending
  from public.church_contribution_form_uploads
  where verification_status = 'pending';

  select count(*)::int into v_rem_pending
  from public.church_income_remittances
  where approval_status = 'pending';

  select count(*)::int into v_income_pending
  from public.church_income_lines
  where lower(coalesce(status, '')) in ('submitted', 'pending', 'verified');

  with att as (
    select a.*
    from public.attendance_sessions a
    where a.attendance_date >= v_start and a.attendance_date <= v_end
      and case v_scope
        when 'tawi' then p_entity_id is null or a.tawi_id = p_entity_id
        when 'jimbo' then
          p_entity_id is null
          or a.jimbo_id = p_entity_id
          or a.tawi_id in (select t.id from public.church_tawi t where t.jimbo_id = p_entity_id)
        when 'dayosisi' then
          p_entity_id is null
          or a.dayosisi_id = p_entity_id
          or a.jimbo_id in (select j.id from public.church_jimbo j where j.dayosisi_id = p_entity_id)
        else true
      end
  )
  select
    count(*)::int,
    count(*) filter (where attendance_date = current_date)::int,
    coalesce(sum(coalesce(visitors, 0)), 0)::bigint
  into v_att_sessions, v_att_today, v_att_visitors
  from att;

  return jsonb_build_object(
    'scope', v_scope,
    'entity_id', p_entity_id,
    'period_start', v_start,
    'period_end', v_end,
    'membership', coalesce(v_membership, '{}'::jsonb),
    'finance', coalesce(v_finance, '{}'::jsonb),
    'projects', coalesce(v_projects, '{}'::jsonb),
    'attendance', jsonb_build_object(
      'sessions_month', v_att_sessions,
      'sessions_today', v_att_today,
      'visitors_month', v_att_visitors
    ),
    'uploads', jsonb_build_object(
      'total', v_uploads_total,
      'pending_verification', v_uploads_pending
    ),
    'approvals', jsonb_build_object(
      'remittance_pending', v_rem_pending,
      'income_pending', v_income_pending,
      'total_pending', v_rem_pending + v_income_pending
    )
  );
end;
$$;

grant execute on function public.portal_executive_kpi_dashboard(text, uuid) to authenticated;

-- ——— Public strip: projects + approvals (additive columns) ———
drop function if exists public.portal_public_dashboard_counts();

create or replace function public.portal_public_dashboard_counts()
returns table (
  dayosisi bigint,
  majimbo bigint,
  majimbo_active bigint,
  matawi bigint,
  matawi_active bigint,
  matawi_pending bigint,
  matawi_registry_verified bigint,
  matawi_registry_pending_review bigint,
  waumini bigint,
  viongozi bigint,
  nyaraka bigint,
  matukio bigint,
  attendance_sessions_today bigint,
  attendance_sessions_month bigint,
  attendance_visitors_month bigint,
  projects_active bigint,
  contribution_uploads_pending bigint,
  approvals_pending bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with portal_cal as (
    select
      (now() at time zone 'Africa/Dar_es_Salaam')::date as portal_today,
      (date_trunc('month', (now() at time zone 'Africa/Dar_es_Salaam')))::date as month_start,
      ((date_trunc('month', (now() at time zone 'Africa/Dar_es_Salaam')) + interval '1 month'))::date as month_next
  )
  select
    (select count(*) from public.dayosisi)::bigint,
    (select count(*) from public.church_jimbo)::bigint,
    (select count(*)::bigint from public.church_jimbo j where coalesce(lower(trim(j.status)), 'active') = 'active'),
    (select count(*) from public.church_tawi)::bigint,
    (select count(*) from public.church_tawi where coalesce(lower(trim(status)), '') = 'active')::bigint,
    (select count(*) from public.church_tawi where coalesce(lower(trim(status)), '') = 'pending')::bigint,
    (select count(*) from public.church_tawi where coalesce(verification_status, 'unverified') = 'verified')::bigint,
    (select count(*) from public.church_tawi where coalesce(verification_status, 'unverified') = 'pending_review')::bigint,
    (select count(*) from public.church_members)::bigint,
    (select count(*) from public.church_viongozi where status is distinct from 'archived')::bigint,
    (select count(*) from public.documents)::bigint,
    (select count(*) from public.events)::bigint,
    (select count(*)::bigint from public.attendance_sessions s cross join portal_cal c where s.attendance_date = c.portal_today),
    (select count(*)::bigint from public.attendance_sessions s cross join portal_cal c where s.attendance_date >= c.month_start and s.attendance_date < c.month_next),
    (select coalesce(sum(coalesce(s.visitors, 0)), 0)::bigint from public.attendance_sessions s cross join portal_cal c where s.attendance_date >= c.month_start and s.attendance_date < c.month_next),
    (select count(*)::bigint from public.church_institution_projects where approval_status = 'active'),
    (select count(*)::bigint from public.church_contribution_form_uploads where verification_status = 'pending'),
    (
      (select count(*)::bigint from public.church_income_remittances where approval_status = 'pending')
      + (select count(*)::bigint from public.church_income_lines where lower(coalesce(status, '')) in ('submitted', 'pending', 'verified'))
    )::bigint
  from portal_cal;
$$;

revoke all on function public.portal_public_dashboard_counts() from public;
grant execute on function public.portal_public_dashboard_counts() to anon, authenticated;

notify pgrst, 'reload schema';
