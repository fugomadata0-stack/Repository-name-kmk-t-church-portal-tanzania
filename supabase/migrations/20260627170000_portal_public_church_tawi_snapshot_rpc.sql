-- Hatua 5: uhakiki wa umma wa tawi kwa UUID (hali yoyote ya status) — security definer, data finyu.

create or replace function public.portal_public_church_tawi_snapshot(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  (
    select to_jsonb(sub)
    from (
      select
        t.id,
        t.jina,
        t.branch_code,
        t.aina,
        t.status,
        t.verification_status,
        t.verified_at,
        t.mkoa,
        t.wilaya,
        t.kata,
        t.mtaa,
        t.founded_date,
        t.gps_lat,
        t.gps_lng,
        t.kiongozi,
        t.simu,
        (
          select jsonb_build_object(
            'jina', j.jina,
            'dayosisi', jsonb_build_object('jina', d.jina)
          )
          from public.church_jimbo j
          join public.dayosisi d on d.id = j.dayosisi_id
          where j.id = t.jimbo_id
        ) as church_jimbo
      from public.church_tawi t
      where t.id = p_id
    ) sub
  );
$$;

comment on function public.portal_public_church_tawi_snapshot(uuid) is
  'Public verify page: single tawi JSON (no list leak); bypasses anon active-only SELECT.';

revoke all on function public.portal_public_church_tawi_snapshot(uuid) from public;
grant execute on function public.portal_public_church_tawi_snapshot(uuid) to anon, authenticated;
