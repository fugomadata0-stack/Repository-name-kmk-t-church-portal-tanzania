-- Geo FK kwa mistari ya mapato + data ya majaribio (tawi → jimbo → dayosisi) — fedha & mahudhurio.

alter table if exists public.church_income_lines
  add column if not exists dayosisi_id uuid references public.dayosisi (id) on delete set null,
  add column if not exists jimbo_id uuid references public.church_jimbo (id) on delete set null,
  add column if not exists tawi_id uuid references public.church_tawi (id) on delete set null;

create index if not exists church_income_lines_dayosisi_idx on public.church_income_lines (dayosisi_id);
create index if not exists church_income_lines_jimbo_idx on public.church_income_lines (jimbo_id);
create index if not exists church_income_lines_tawi_idx on public.church_income_lines (tawi_id);

-- Vyanzo vya mapato (ikiwa hayapo)
insert into public.church_income_sources (chanzo, category, aina, status)
select 'Sadaka ya Jumapili', 'Sadaka', 'Mapato Halisi', 'active'
where not exists (select 1 from public.church_income_sources where lower(trim(chanzo)) = lower('Sadaka ya Jumapili'));

insert into public.church_income_sources (chanzo, category, aina, status)
select 'Michango ya Wajibu', 'Michango', 'Mapato Halisi', 'active'
where not exists (select 1 from public.church_income_sources where lower(trim(chanzo)) = lower('Michango ya Wajibu'));

insert into public.church_income_sources (chanzo, category, aina, status)
select 'Zaka', 'Sadaka', 'Mapato Halisi', 'active'
where not exists (select 1 from public.church_income_sources where lower(trim(chanzo)) = lower('Zaka'));

do $$
declare
  v_dayosisi uuid;
  v_jimbo uuid;
  v_tawi_musoma uuid;
  v_tawi_mfano uuid;
  v_jimbo_mfano uuid;
  d0 date := date_trunc('month', current_date)::date;
begin
  select id into v_dayosisi from public.dayosisi where lower(trim(code)) = 'mara' limit 1;
  select j.id into v_jimbo
  from public.church_jimbo j
  join public.dayosisi d on d.id = j.dayosisi_id
  where lower(trim(j.jina)) = lower('Jimbo la Musoma') and lower(trim(d.code)) = 'mara'
  limit 1;

  select t.id into v_tawi_musoma
  from public.church_tawi t
  where lower(trim(t.jina)) = lower('Tawi la Makao Makuu — Musoma')
  limit 1;

  select j.id into v_jimbo_mfano
  from public.church_jimbo j
  join public.dayosisi d on d.id = j.dayosisi_id
  where lower(trim(j.jina)) = lower('Jimbo la Mfano') and lower(trim(d.code)) = 'mara'
  limit 1;

  select t.id into v_tawi_mfano
  from public.church_tawi t
  where lower(trim(t.jina)) = lower('Tawi la Mfano — Muundo')
  limit 1;

  if v_dayosisi is null then
    raise notice 'trial_ngazi: dayosisi MARA haipo — ruka seed';
    return;
  end if;

  -- ——— TAWI: Makao Makuu Musoma (chini) ———
  if v_tawi_musoma is not null then
    insert into public.church_finance_entries (entry_date, aina, kategoria, amount_tz, ngazi, dayosisi_id, jimbo_id, tawi_id, status, notes)
    select d0 + 3, 'Mapato', 'Sadaka', 285000, 'Tawi', v_dayosisi, v_jimbo, v_tawi_musoma, 'active', 'TRIAL-NGAZI tawi mapato'
    where not exists (select 1 from public.church_finance_entries where notes = 'TRIAL-NGAZI tawi mapato');

    insert into public.church_finance_entries (entry_date, aina, kategoria, amount_tz, ngazi, dayosisi_id, jimbo_id, tawi_id, status, notes)
    select d0 + 5, 'Matumizi', 'Uendeshaji', 95000, 'Tawi', v_dayosisi, v_jimbo, v_tawi_musoma, 'active', 'TRIAL-NGAZI tawi matumizi'
    where not exists (select 1 from public.church_finance_entries where notes = 'TRIAL-NGAZI tawi matumizi');

    insert into public.church_income_lines (
      income_code, source_name, main_category, church_level, amount_tz, collection_date, status,
      branch_center, remarks, dayosisi_id, jimbo_id, tawi_id
    )
    select 'TRIAL-TAW-SAD-001', 'Sadaka ya Jumapili', 'Sadaka', 'Tawi', 185000, d0 + 2, 'active',
      'Tawi la Makao Makuu — Musoma', 'TRIAL-NGAZI income tawi', v_dayosisi, v_jimbo, v_tawi_musoma
    where not exists (select 1 from public.church_income_lines where income_code = 'TRIAL-TAW-SAD-001');

    insert into public.attendance_sessions (
      attendance_date, service_name, attendance_type, dayosisi_id, jimbo_id, tawi_id,
      total_men, total_women, total_youth, total_children, visitors, total_attendance, status, notes
    )
    select d0 + 7, 'Ibada ya Jumapili', 'Ibada ya Jumapili', v_dayosisi, v_jimbo, v_tawi_musoma,
      32, 41, 18, 12, 5, 108, 'active', 'TRIAL-NGAZI attendance tawi musoma'
    where not exists (select 1 from public.attendance_sessions where notes = 'TRIAL-NGAZI attendance tawi musoma');
  end if;

  -- ——— TAWI: Mfano ———
  if v_tawi_mfano is not null and v_jimbo_mfano is not null then
    insert into public.church_finance_entries (entry_date, aina, kategoria, amount_tz, ngazi, dayosisi_id, jimbo_id, tawi_id, status, notes)
    select d0 + 4, 'Mapato', 'Sadaka', 120000, 'Tawi', v_dayosisi, v_jimbo_mfano, v_tawi_mfano, 'active', 'TRIAL-NGAZI tawi mfano mapato'
    where not exists (select 1 from public.church_finance_entries where notes = 'TRIAL-NGAZI tawi mfano mapato');

    insert into public.attendance_sessions (
      attendance_date, service_name, attendance_type, dayosisi_id, jimbo_id, tawi_id,
      total_men, total_women, total_youth, total_children, visitors, total_attendance, status, notes
    )
    select d0 + 6, 'Ibada ya Jumapili', 'Ibada ya Jumapili', v_dayosisi, v_jimbo_mfano, v_tawi_mfano,
      18, 22, 9, 6, 2, 57, 'active', 'TRIAL-NGAZI attendance tawi mfano'
    where not exists (select 1 from public.attendance_sessions where notes = 'TRIAL-NGAZI attendance tawi mfano');
  end if;

  -- ——— JIMBO: Musoma (kati) ———
  if v_jimbo is not null then
    insert into public.church_finance_entries (entry_date, aina, kategoria, amount_tz, ngazi, dayosisi_id, jimbo_id, tawi_id, status, notes)
    select d0 + 8, 'Mapato', 'Michango', 680000, 'Jimbo', v_dayosisi, v_jimbo, null, 'active', 'TRIAL-NGAZI jimbo mapato'
    where not exists (select 1 from public.church_finance_entries where notes = 'TRIAL-NGAZI jimbo mapato');

    insert into public.church_finance_entries (entry_date, aina, kategoria, amount_tz, ngazi, dayosisi_id, jimbo_id, tawi_id, status, notes)
    select d0 + 10, 'Matumizi', 'Miradi', 210000, 'Jimbo', v_dayosisi, v_jimbo, null, 'active', 'TRIAL-NGAZI jimbo matumizi'
    where not exists (select 1 from public.church_finance_entries where notes = 'TRIAL-NGAZI jimbo matumizi');

    insert into public.church_income_lines (
      income_code, source_name, main_category, church_level, amount_tz, collection_date, status,
      branch_center, remarks, dayosisi_id, jimbo_id, tawi_id
    )
    select 'TRIAL-JIM-ZAK-001', 'Zaka', 'Sadaka', 'Jimbo', 420000, d0 + 9, 'active',
      'Jimbo la Musoma', 'TRIAL-NGAZI income jimbo', v_dayosisi, v_jimbo, null
    where not exists (select 1 from public.church_income_lines where income_code = 'TRIAL-JIM-ZAK-001');

    insert into public.attendance_sessions (
      attendance_date, service_name, attendance_type, dayosisi_id, jimbo_id, tawi_id,
      total_men, total_women, total_youth, total_children, visitors, total_attendance, status, notes
    )
    select d0 + 11, 'Mkutano wa Jimbo', 'Mkutano', v_dayosisi, v_jimbo, null,
      85, 92, 40, 28, 12, 257, 'active', 'TRIAL-NGAZI attendance jimbo musoma'
    where not exists (select 1 from public.attendance_sessions where notes = 'TRIAL-NGAZI attendance jimbo musoma');
  end if;

  -- ——— DAYOSISI: Mara (juu) ———
  insert into public.church_finance_entries (entry_date, aina, kategoria, amount_tz, ngazi, dayosisi_id, jimbo_id, tawi_id, status, notes)
  select d0 + 12, 'Mapato', 'Michango', 1250000, 'Dayosisi', v_dayosisi, null, null, 'active', 'TRIAL-NGAZI dayosisi mapato'
  where not exists (select 1 from public.church_finance_entries where notes = 'TRIAL-NGAZI dayosisi mapato');

  insert into public.church_finance_entries (entry_date, aina, kategoria, amount_tz, ngazi, dayosisi_id, jimbo_id, tawi_id, status, notes)
  select d0 + 14, 'Matumizi', 'Ofisi', 380000, 'Dayosisi', v_dayosisi, null, null, 'active', 'TRIAL-NGAZI dayosisi matumizi'
  where not exists (select 1 from public.church_finance_entries where notes = 'TRIAL-NGAZI dayosisi matumizi');

  insert into public.church_income_lines (
    income_code, source_name, main_category, church_level, amount_tz, collection_date, status,
    branch_center, remarks, dayosisi_id, jimbo_id, tawi_id
  )
  select 'TRIAL-DAY-MCH-001', 'Michango ya Wajibu', 'Michango', 'Dayosisi', 890000, d0 + 13, 'active',
    'Dayosisi ya Mara', 'TRIAL-NGAZI income dayosisi', v_dayosisi, null, null
  where not exists (select 1 from public.church_income_lines where income_code = 'TRIAL-DAY-MCH-001');

  insert into public.attendance_sessions (
    attendance_date, service_name, attendance_type, dayosisi_id, jimbo_id, tawi_id,
    total_men, total_women, total_youth, total_children, visitors, total_attendance, status, notes
  )
  select d0 + 15, 'Mkutano wa Dayosisi', 'Mkutano', v_dayosisi, null, null,
    120, 135, 55, 40, 20, 370, 'active', 'TRIAL-NGAZI attendance dayosisi mara'
  where not exists (select 1 from public.attendance_sessions where notes = 'TRIAL-NGAZI attendance dayosisi mara');

  -- ——— KITAIFA (makao makuu — hakuna FK geo) ———
  insert into public.church_finance_entries (entry_date, aina, kategoria, amount_tz, ngazi, dayosisi_id, jimbo_id, tawi_id, status, notes)
  select d0 + 16, 'Mapato', 'Michango', 450000, 'Makao Makuu KMK(T)', null, null, null, 'active', 'TRIAL-NGAZI kitaifa mapato'
  where not exists (select 1 from public.church_finance_entries where notes = 'TRIAL-NGAZI kitaifa mapato');

  insert into public.church_finance_entries (entry_date, aina, kategoria, amount_tz, ngazi, dayosisi_id, jimbo_id, tawi_id, status, notes)
  select d0 + 17, 'Matumizi', 'Ofisi Kuu', 175000, 'Makao Makuu KMK(T)', null, null, null, 'active', 'TRIAL-NGAZI kitaifa matumizi'
  where not exists (select 1 from public.church_finance_entries where notes = 'TRIAL-NGAZI kitaifa matumizi');
end $$;
