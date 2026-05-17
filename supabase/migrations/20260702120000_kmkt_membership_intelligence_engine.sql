-- KMK(T) Step 2 — Membership Intelligence Engine (additive)
-- Hierarchy rollup · remittance dedupe · improved membership RPC

-- ——— Remittance: epuka nakala za mara mbili kwa kila mstari wa mapato ———
create unique index if not exists church_income_remittances_line_hop_uq
  on public.church_income_remittances (income_line_id, from_level, to_level)
  where income_line_id is not null;

-- ——— Membership statistics (rollup sahihi: Tawi → Jimbo → Dayosisi → KMK(T)) ———
create or replace function public.portal_membership_statistics(
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
  v_result jsonb;
begin
  if not (
    public.portal_has_module_capability('waumini', 'view')
    or public.portal_has_module_capability('ripoti', 'view')
  ) then
    return jsonb_build_object('error', 'forbidden');
  end if;

  with base as (
    select m.*
    from public.church_members m
    where
      case v_scope
        when 'tawi' then
          p_entity_id is null or m.tawi_id = p_entity_id
        when 'jimbo' then
          p_entity_id is null
          or m.jimbo_id = p_entity_id
          or m.tawi_id in (
            select t.id from public.church_tawi t where t.jimbo_id = p_entity_id
          )
        when 'dayosisi' then
          p_entity_id is null
          or m.dayosisi_id = p_entity_id
          or m.jimbo_id in (
            select j.id from public.church_jimbo j where j.dayosisi_id = p_entity_id
          )
          or m.tawi_id in (
            select t.id
            from public.church_tawi t
            inner join public.church_jimbo j on j.id = t.jimbo_id
            where j.dayosisi_id = p_entity_id
          )
        else true
      end
  ),
  agg as (
    select
      count(*)::bigint as total,
      count(*) filter (
        where lower(coalesce(gender, '')) in ('m', 'me', 'male', 'kiume', 'mwanaume', 'wanaume')
      )::bigint as wanaume,
      count(*) filter (
        where lower(coalesce(gender, '')) in ('f', 'ke', 'female', 'kike', 'mwanamke', 'wanawake')
      )::bigint as wanawake,
      count(*) filter (
        where birth_date is not null
          and extract(year from age(current_date, birth_date)) between 13 and 35
      )::bigint as vijana,
      count(*) filter (
        where birth_date is not null
          and extract(year from age(current_date, birth_date)) < 13
      )::bigint as watoto,
      count(*) filter (
        where birth_date is not null
          and extract(year from age(current_date, birth_date)) >= 60
      )::bigint as wazee,
      count(*) filter (where lower(coalesce(membership_status, '')) = 'visitor')::bigint as wageni,
      count(*) filter (where coalesce(is_baptized, false))::bigint as waliobatizwa,
      count(*) filter (where not coalesce(is_baptized, false))::bigint as wasio_batizwa,
      count(*) filter (where ministry_segment = 'ke')::bigint as ke,
      count(*) filter (where ministry_segment = 'me')::bigint as me,
      count(*) filter (where ministry_segment = 'jvkmkt')::bigint as jvkmkt,
      count(*) filter (where ministry_segment = 'jwkmkt')::bigint as jwkmkt
    from base
  )
  select jsonb_build_object(
    'scope', v_scope,
    'entity_id', p_entity_id,
    'generated_at', now(),
    'categories', jsonb_build_object(
      'total', total,
      'wanaume', wanaume,
      'wanawake', wanawake,
      'vijana', vijana,
      'watoto', watoto,
      'wazee', wazee,
      'wageni', wageni,
      'waliobatizwa', waliobatizwa,
      'wasio_batizwa', wasio_batizwa,
      'ke', ke,
      'me', me,
      'jvkmkt', jvkmkt,
      'jwkmkt', jwkmkt
    )
  )
  into v_result
  from agg;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

-- ——— Breakdown kwa ngazi ya chini (aggregation) ———
create or replace function public.portal_membership_hierarchy_breakdown(
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
begin
  if not (
    public.portal_has_module_capability('waumini', 'view')
    or public.portal_has_module_capability('ripoti', 'view')
  ) then
    return jsonb_build_object('error', 'forbidden');
  end if;

  if v_scope = 'kmkt' then
    return coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'entity_id', d.id,
          'entity_name', d.jina,
          'child_scope', 'dayosisi',
          'total', cnt.total
        )
        order by d.jina
      )
      from public.dayosisi d
      cross join lateral (
        select (public.portal_membership_statistics('dayosisi', d.id)->'categories'->>'total')::bigint as total
      ) cnt
    ), '[]'::jsonb);
  end if;

  if v_scope = 'dayosisi' and p_entity_id is not null then
    return coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'entity_id', j.id,
          'entity_name', j.jina,
          'child_scope', 'jimbo',
          'total', cnt.total
        )
        order by j.jina
      )
      from public.church_jimbo j
      cross join lateral (
        select (public.portal_membership_statistics('jimbo', j.id)->'categories'->>'total')::bigint as total
      ) cnt
      where j.dayosisi_id = p_entity_id
    ), '[]'::jsonb);
  end if;

  if v_scope = 'jimbo' and p_entity_id is not null then
    return coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'entity_id', t.id,
          'entity_name', t.jina,
          'child_scope', 'tawi',
          'total', cnt.total
        )
        order by t.jina
      )
      from public.church_tawi t
      cross join lateral (
        select (public.portal_membership_statistics('tawi', t.id)->'categories'->>'total')::bigint as total
      ) cnt
      where t.jimbo_id = p_entity_id
    ), '[]'::jsonb);
  end if;

  return '[]'::jsonb;
end;
$$;

revoke all on function public.portal_membership_hierarchy_breakdown(text, uuid) from public;
grant execute on function public.portal_membership_hierarchy_breakdown(text, uuid) to authenticated;

notify pgrst, 'reload schema';
