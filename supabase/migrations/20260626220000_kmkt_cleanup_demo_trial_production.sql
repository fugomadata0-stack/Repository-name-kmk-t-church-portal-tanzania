-- Hatua 18: Ondoa data ya majaribio (TRIAL-NGAZI) na waumini wa mfano — tayari kwa uingizaji halisi.

-- Fedha / mapato / mahudhurio ya majaribio
delete from public.church_finance_entries
where coalesce(notes, '') like 'TRIAL-NGAZI%';

delete from public.church_income_lines
where lower(trim(income_code)) like 'trial-%'
   or coalesce(remarks, '') like 'TRIAL-NGAZI%';

delete from public.attendance_sessions
where coalesce(notes, '') like 'TRIAL-NGAZI%';

-- Waumini wa kuanzia (Makundi / Shirima)
delete from public.church_members
where member_number in ('KMKT-MARA-0001', 'KMKT-MARA-0002', 'KMKT-MARA-0003', 'KMKT-MARA-0004');

delete from public.church_families
where family_name in ('Familia Makundi — Musoma', 'Familia Shirima — Musoma');

-- Familia ya Petro — acha safu, ondoa maelezo ya mfano
update public.church_families
set
  maelezo = 'Weka familia halisi kupitia moduli ya Waumini.',
  updated_at = now()
where family_name = 'Familia ya Mfano — Petro';

-- Taarifa kwa timu (mara moja)
insert into public.system_alerts (type, module, title, message, priority, status, action_url)
select
  'announcement',
  'portal',
  'Data halisi — anza uingizaji',
  'Data ya majaribio (TRIAL-NGAZI) imeondolewa. Ingiza fedha, mapato na mahudhurio kupitia moduli husika; pakia picha halisi za viongozi kwenye Mipangilio → Uongozi wa Kitaifa.',
  'info',
  'open',
  'https://v0-church-portal-tanzania.vercel.app/'
where not exists (
  select 1 from public.system_alerts
  where lower(trim(title)) = lower('Data halisi — anza uingizaji')
);
