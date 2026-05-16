-- Strip ya KPI ya umma: hesabu ya matawi yenye sajili inayosubiri uhakiki (verification_status = pending_review).
-- Inafuata 20260627150000_portal_public_dashboard_matawi_breakdown.sql ili isifutwe na migrations za baadaye.

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
    (select count(*) from public.church_tawi where coalesce(lower(trim(status)), '') = 'active')::bigint as matawi_active,
    (select count(*) from public.church_tawi where coalesce(lower(trim(status)), '') = 'pending')::bigint as matawi_pending,
    (select count(*) from public.church_tawi where coalesce(verification_status, 'unverified') = 'verified')::bigint as matawi_registry_verified,
    (select count(*) from public.church_tawi where coalesce(verification_status, 'unverified') = 'pending_review')::bigint as matawi_registry_pending_review,
    (select count(*) from public.church_members)::bigint as waumini,
    (select count(*) from public.church_viongozi where status is distinct from 'archived')::bigint as viongozi,
    (select count(*) from public.documents)::bigint as nyaraka,
    (select count(*) from public.events)::bigint as matukio;
$$;

comment on function public.portal_public_dashboard_counts() is
  'Aggregate public landing totals; viongozi excludes archived; matawi includes active/pending-status/verified-registry/pending-review-registry breakdown.';

revoke all on function public.portal_public_dashboard_counts() from public;
grant execute on function public.portal_public_dashboard_counts() to anon, authenticated;
