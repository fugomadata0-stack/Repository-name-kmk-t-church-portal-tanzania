-- Muhtasari wa KPI, fedha na mahudhurio kwa kila ngazi (chini → juu).

create or replace function public.portal_ngazi_operations_summary(
  p_dayosisi_id uuid default null,
  p_jimbo_id uuid default null,
  p_tawi_id uuid default null,
  p_from date default null,
  p_to date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from date := coalesce(p_from, date_trunc('month', current_date)::date);
  v_to date := coalesce(p_to, (date_trunc('month', current_date) + interval '1 month - 1 day')::date);
  v_levels jsonb := '[]'::jsonb;
  v_rollup jsonb;
begin
  -- Tawi (chini)
  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.sort_key), '[]'::jsonb)
  into v_levels
  from (
    select
      1 as sort_key,
      'tawi'::text as ngazi,
      t.id as entity_id,
      t.jina as label,
      j.id as jimbo_id,
      j.jina as jimbo_label,
      d.id as dayosisi_id,
      d.jina as dayosisi_label,
      coalesce((
        select sum(fe.amount_tz)
        from public.church_finance_entries fe
        where fe.tawi_id = t.id
          and fe.aina = 'Mapato'
          and fe.entry_date between v_from and v_to
          and coalesce(fe.status, 'active') = 'active'
      ), 0)::numeric as finance_mapato,
      coalesce((
        select sum(fe.amount_tz)
        from public.church_finance_entries fe
        where fe.tawi_id = t.id
          and fe.aina = 'Matumizi'
          and fe.entry_date between v_from and v_to
          and coalesce(fe.status, 'active') = 'active'
      ), 0)::numeric as finance_matumizi,
      coalesce((
        select sum(il.amount_tz)
        from public.church_income_lines il
        where il.tawi_id = t.id
          and il.collection_date between v_from and v_to
          and coalesce(il.status, 'active') = 'active'
      ), 0)::numeric as income_lines_total,
      coalesce((
        select count(*)::int
        from public.attendance_sessions a
        where a.tawi_id = t.id
          and a.attendance_date between v_from and v_to
          and coalesce(a.status, 'active') = 'active'
      ), 0) as attendance_sessions,
      coalesce((
        select sum(a.total_attendance)::bigint
        from public.attendance_sessions a
        where a.tawi_id = t.id
          and a.attendance_date between v_from and v_to
          and coalesce(a.status, 'active') = 'active'
      ), 0)::bigint as attendance_total,
      coalesce((
        select count(*)::int
        from public.church_members m
        where lower(coalesce(m.tawi_name, '')) = lower(t.jina)
           or exists (
             select 1 from public.church_families f
             where f.id = m.family_id and lower(coalesce(f.tawi_name, '')) = lower(t.jina)
           )
      ), 0) as members_count,
      coalesce((
        select count(*)::int from public.church_families f
        where lower(coalesce(f.tawi_name, '')) = lower(t.jina)
      ), 0) as families_count
    from public.church_tawi t
    join public.church_jimbo j on j.id = t.jimbo_id
    join public.dayosisi d on d.id = j.dayosisi_id
    where (p_tawi_id is null or t.id = p_tawi_id)
      and (p_jimbo_id is null or j.id = p_jimbo_id)
      and (p_dayosisi_id is null or d.id = p_dayosisi_id)
  ) x;

  -- Jimbo (kati) — moja kwa moja + jumla ya matawi
  v_levels := v_levels || coalesce((
    select jsonb_agg(row_to_json(x)::jsonb order by x.sort_key)
    from (
      select
        2 as sort_key,
        'jimbo'::text as ngazi,
        j.id as entity_id,
        j.jina as label,
        j.id as jimbo_id,
        j.jina as jimbo_label,
        d.id as dayosisi_id,
        d.jina as dayosisi_label,
        coalesce((
          select sum(fe.amount_tz)
          from public.church_finance_entries fe
          where fe.jimbo_id = j.id
            and fe.aina = 'Mapato'
            and fe.entry_date between v_from and v_to
            and coalesce(fe.status, 'active') = 'active'
        ), 0)::numeric
        + coalesce((
          select sum(fe.amount_tz)
          from public.church_finance_entries fe
          join public.church_tawi tw on tw.id = fe.tawi_id
          where tw.jimbo_id = j.id
            and fe.aina = 'Mapato'
            and fe.entry_date between v_from and v_to
            and coalesce(fe.status, 'active') = 'active'
        ), 0)::numeric as finance_mapato,
        coalesce((
          select sum(fe.amount_tz)
          from public.church_finance_entries fe
          where fe.jimbo_id = j.id
            and fe.aina = 'Matumizi'
            and fe.entry_date between v_from and v_to
            and coalesce(fe.status, 'active') = 'active'
        ), 0)::numeric
        + coalesce((
          select sum(fe.amount_tz)
          from public.church_finance_entries fe
          join public.church_tawi tw on tw.id = fe.tawi_id
          where tw.jimbo_id = j.id
            and fe.aina = 'Matumizi'
            and fe.entry_date between v_from and v_to
            and coalesce(fe.status, 'active') = 'active'
        ), 0)::numeric as finance_matumizi,
        coalesce((
          select sum(il.amount_tz)
          from public.church_income_lines il
          where il.jimbo_id = j.id
            and il.collection_date between v_from and v_to
            and coalesce(il.status, 'active') = 'active'
        ), 0)::numeric
        + coalesce((
          select sum(il.amount_tz)
          from public.church_income_lines il
          join public.church_tawi tw on tw.id = il.tawi_id
          where tw.jimbo_id = j.id
            and il.collection_date between v_from and v_to
            and coalesce(il.status, 'active') = 'active'
        ), 0)::numeric as income_lines_total,
        coalesce((
          select count(*)::int
          from public.attendance_sessions a
          where a.jimbo_id = j.id
            and a.attendance_date between v_from and v_to
            and coalesce(a.status, 'active') = 'active'
        ), 0)
        + coalesce((
          select count(*)::int
          from public.attendance_sessions a
          join public.church_tawi tw on tw.id = a.tawi_id
          where tw.jimbo_id = j.id
            and a.attendance_date between v_from and v_to
            and coalesce(a.status, 'active') = 'active'
        ), 0) as attendance_sessions,
        coalesce((
          select sum(a.total_attendance)::bigint
          from public.attendance_sessions a
          where a.jimbo_id = j.id
            and a.attendance_date between v_from and v_to
            and coalesce(a.status, 'active') = 'active'
        ), 0)::bigint
        + coalesce((
          select sum(a.total_attendance)::bigint
          from public.attendance_sessions a
          join public.church_tawi tw on tw.id = a.tawi_id
          where tw.jimbo_id = j.id
            and a.attendance_date between v_from and v_to
            and coalesce(a.status, 'active') = 'active'
        ), 0)::bigint as attendance_total,
        coalesce((
          select count(*)::int
          from public.church_members m
          where lower(coalesce(m.tawi_name, '')) like '%' || lower(j.jina) || '%'
             or exists (
               select 1 from public.church_families f
               where f.id = m.family_id and lower(coalesce(f.jimbo_name, '')) = lower(j.jina)
             )
        ), 0) as members_count,
        coalesce((
          select count(*)::int from public.church_families f
          where lower(coalesce(f.jimbo_name, '')) = lower(j.jina)
        ), 0) as families_count
      from public.church_jimbo j
      join public.dayosisi d on d.id = j.dayosisi_id
      where (p_jimbo_id is null or j.id = p_jimbo_id)
        and (p_dayosisi_id is null or d.id = p_dayosisi_id)
        and (p_tawi_id is null)
    ) x
  ), '[]'::jsonb);

  -- Dayosisi (juu)
  v_levels := v_levels || coalesce((
    select jsonb_agg(row_to_json(x)::jsonb order by x.sort_key)
    from (
      select
        3 as sort_key,
        'dayosisi'::text as ngazi,
        d.id as entity_id,
        d.jina as label,
        null::uuid as jimbo_id,
        null::text as jimbo_label,
        d.id as dayosisi_id,
        d.jina as dayosisi_label,
        coalesce((
          select sum(fe.amount_tz)
          from public.church_finance_entries fe
          where fe.dayosisi_id = d.id
            and fe.aina = 'Mapato'
            and fe.entry_date between v_from and v_to
            and coalesce(fe.status, 'active') = 'active'
        ), 0)::numeric as finance_mapato,
        coalesce((
          select sum(fe.amount_tz)
          from public.church_finance_entries fe
          where fe.dayosisi_id = d.id
            and fe.aina = 'Matumizi'
            and fe.entry_date between v_from and v_to
            and coalesce(fe.status, 'active') = 'active'
        ), 0)::numeric as finance_matumizi,
        coalesce((
          select sum(il.amount_tz)
          from public.church_income_lines il
          where il.dayosisi_id = d.id
            and il.collection_date between v_from and v_to
            and coalesce(il.status, 'active') = 'active'
        ), 0)::numeric as income_lines_total,
        coalesce((
          select count(*)::int
          from public.attendance_sessions a
          where a.dayosisi_id = d.id
            and a.jimbo_id is null
            and a.tawi_id is null
            and a.attendance_date between v_from and v_to
            and coalesce(a.status, 'active') = 'active'
        ), 0) as attendance_sessions,
        coalesce((
          select sum(a.total_attendance)::bigint
          from public.attendance_sessions a
          where a.dayosisi_id = d.id
            and a.jimbo_id is null
            and a.tawi_id is null
            and a.attendance_date between v_from and v_to
            and coalesce(a.status, 'active') = 'active'
        ), 0)::bigint as attendance_total,
        coalesce((
          select count(*)::int from public.church_members m
          where m.dayosisi_id = d.id
             or exists (select 1 from public.church_families f where f.id = m.family_id and f.dayosisi_id = d.id)
        ), 0) as members_count,
        coalesce((
          select count(*)::int from public.church_families f where f.dayosisi_id = d.id
        ), 0) as families_count
      from public.dayosisi d
      where (p_dayosisi_id is null or d.id = p_dayosisi_id)
        and (p_jimbo_id is null)
        and (p_tawi_id is null)
    ) x
  ), '[]'::jsonb);

  -- Kitaifa / Makao Makuu
  v_levels := v_levels || jsonb_build_array(
    jsonb_build_object(
      'sort_key', 4,
      'ngazi', 'kitaifa',
      'entity_id', null,
      'label', 'Makao Makuu KMK(T)',
      'jimbo_id', null,
      'jimbo_label', null,
      'dayosisi_id', null,
      'dayosisi_label', null,
      'finance_mapato', coalesce((
        select sum(fe.amount_tz)
        from public.church_finance_entries fe
        where fe.dayosisi_id is null and fe.jimbo_id is null and fe.tawi_id is null
          and fe.aina = 'Mapato'
          and fe.entry_date between v_from and v_to
          and coalesce(fe.status, 'active') = 'active'
      ), 0),
      'finance_matumizi', coalesce((
        select sum(fe.amount_tz)
        from public.church_finance_entries fe
        where fe.dayosisi_id is null and fe.jimbo_id is null and fe.tawi_id is null
          and fe.aina = 'Matumizi'
          and fe.entry_date between v_from and v_to
          and coalesce(fe.status, 'active') = 'active'
      ), 0),
      'income_lines_total', 0,
      'attendance_sessions', 0,
      'attendance_total', 0,
      'members_count', coalesce((select count(*)::int from public.national_leadership_profiles where coalesce(status, 'active') = 'active'), 0),
      'families_count', 0
    )
  );

  select jsonb_build_object(
    'finance_mapato', coalesce(sum((e->>'finance_mapato')::numeric), 0),
    'finance_matumizi', coalesce(sum((e->>'finance_matumizi')::numeric), 0),
    'income_lines_total', coalesce(sum((e->>'income_lines_total')::numeric), 0),
    'attendance_sessions', coalesce(sum((e->>'attendance_sessions')::int), 0),
    'attendance_total', coalesce(sum((e->>'attendance_total')::bigint), 0),
    'members_count', coalesce(max((e->>'members_count')::int) filter (where e->>'ngazi' = 'dayosisi'), 0),
    'families_count', coalesce(max((e->>'families_count')::int) filter (where e->>'ngazi' = 'dayosisi'), 0)
  )
  into v_rollup
  from jsonb_array_elements(v_levels) e
  where p_tawi_id is not null or p_jimbo_id is not null or p_dayosisi_id is not null;

  if v_rollup is null then
    select jsonb_build_object(
      'finance_mapato', coalesce(sum((e->>'finance_mapato')::numeric), 0),
      'finance_matumizi', coalesce(sum((e->>'finance_matumizi')::numeric), 0),
      'income_lines_total', coalesce(sum((e->>'income_lines_total')::numeric), 0),
      'attendance_sessions', coalesce(sum((e->>'attendance_sessions')::int), 0),
      'attendance_total', coalesce(sum((e->>'attendance_total')::bigint), 0)
    )
    into v_rollup
    from jsonb_array_elements(v_levels) e
    where e->>'ngazi' in ('tawi', 'jimbo', 'dayosisi', 'kitaifa');
  end if;

  return jsonb_build_object(
    'from', v_from,
    'to', v_to,
    'levels', (
      select coalesce(jsonb_agg(e order by (e->>'sort_key')::int), '[]'::jsonb)
      from jsonb_array_elements(v_levels) e
    ),
    'rollup', v_rollup || jsonb_build_object(
      'finance_saldo',
      coalesce((v_rollup->>'finance_mapato')::numeric, 0) - coalesce((v_rollup->>'finance_matumizi')::numeric, 0)
    )
  );
end;
$$;

comment on function public.portal_ngazi_operations_summary(uuid, uuid, uuid, date, date) is
  'KPI za fedha, mapato na mahudhurio kwa ngazi (tawi → jimbo → dayosisi → kitaifa).';

revoke all on function public.portal_ngazi_operations_summary(uuid, uuid, uuid, date, date) from public;
grant execute on function public.portal_ngazi_operations_summary(uuid, uuid, uuid, date, date) to anon, authenticated;
