-- Hesabu za mahudhurio kwenye strip ya umma (login) — vikao vya leo, vikao vya mwezi (TZ Dar), na jumla ya wageni wa mwezi.
-- Inafuata 20260627150100_portal_public_dashboard_matawi_registry_pending_review.sql.

drop function if exists public.portal_public_dashboard_counts();

create or replace function public.portal_public_dashboard_counts()
returns table (
  dayosisi bigint,
  majimbo bigint,
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
  attendance_visitors_month bigint
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
    (select count(*) from public.dayosisi)::bigint as dayosisi,
    (select count(*) from public.church_jimbo)::bigint as majimbo,
    (select count(*) from public.church_tawi)::bigint as matawi,
    (select count(*) from public.church_tawi where coalesce(lower(trim(status)), '') = 'active')::bigint as matawi_active,
    (select count(*) from public.church_tawi where coalesce(lower(trim(status)), '') = 'pending')::bigint as matawi_pending,
    (select count(*) from public.church_tawi where coalesce(verification_status, 'unverified') = 'verified')::bigint as matawi_registry_verified,
    (select count(*) from public.church_tawi where coalesce(verification_status, 'unverified') = 'pending_review')::bigint as matawi_registry_pending_review,
    (select count(*) from public.church_members)::bigint as waumini,
    (select count(*) from public.church_viongozi where status is distinct from 'archived')::bigint as viongozi,
    (select count(*) from public.documents)::bigint as nyaraka,
    (select count(*) from public.events)::bigint as matukio,
    (
      select count(*)::bigint
      from public.attendance_sessions s
      cross join portal_cal c
      where s.attendance_date = c.portal_today
    ) as attendance_sessions_today,
    (
      select count(*)::bigint
      from public.attendance_sessions s
      cross join portal_cal c
      where s.attendance_date >= c.month_start
        and s.attendance_date < c.month_next
    ) as attendance_sessions_month,
    (
      select coalesce(sum(coalesce(s.visitors, 0)), 0)::bigint
      from public.attendance_sessions s
      cross join portal_cal c
      where s.attendance_date >= c.month_start
        and s.attendance_date < c.month_next
    ) as attendance_visitors_month
  from portal_cal;
$$;

comment on function public.portal_public_dashboard_counts() is
  'Aggregate public landing totals; includes attendance session counts (portal TZ Africa/Dar_es_Salaam) for today and calendar month plus monthly visitors sum.';

revoke all on function public.portal_public_dashboard_counts() from public;
grant execute on function public.portal_public_dashboard_counts() to anon, authenticated;
