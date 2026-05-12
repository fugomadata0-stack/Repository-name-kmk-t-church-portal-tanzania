-- Hesabu ya viongozi kwenye strip ya umma / KPI isilingane na orodha ya ndani: acha archived.

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
    (select count(*) from public.church_viongozi where status is distinct from 'archived')::bigint as viongozi,
    (select count(*) from public.documents)::bigint as nyaraka,
    (select count(*) from public.events)::bigint as matukio;
$$;

comment on function public.portal_public_dashboard_counts() is
  'Aggregate public landing totals; viongozi excludes archived rows.';
