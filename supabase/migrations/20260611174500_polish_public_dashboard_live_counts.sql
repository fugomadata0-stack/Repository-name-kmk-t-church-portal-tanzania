-- Final polish: public landing/dashboard KPI cards should reflect live portal totals.
-- Row-level public lists remain restricted to explicitly public/published content.

create or replace function public.portal_public_dashboard_counts()
returns table (
  dayosisi bigint,
  majimbo bigint,
  matawi bigint,
  waumini bigint,
  viongozi bigint,
  nyaraka bigint,
  matukio bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.dayosisi)::bigint as dayosisi,
    (select count(*) from public.church_jimbo)::bigint as majimbo,
    (select count(*) from public.church_tawi)::bigint as matawi,
    (select count(*) from public.church_members)::bigint as waumini,
    (select count(*) from public.church_viongozi)::bigint as viongozi,
    (select count(*) from public.documents)::bigint as nyaraka,
    (select count(*) from public.events)::bigint as matukio;
$$;

comment on function public.portal_public_dashboard_counts() is
  'Returns aggregate live public landing dashboard totals only; detailed row lists are still controlled by RLS.';

revoke all on function public.portal_public_dashboard_counts() from public;
grant execute on function public.portal_public_dashboard_counts() to anon, authenticated;
