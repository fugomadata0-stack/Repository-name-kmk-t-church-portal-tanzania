-- Usambazaji wa michango: 35% (hierarchy_share) vs 100% (full_remittance) — Tawi → Jimbo → Dayosisi → KMK(T)

alter table public.church_income_sources
  add column if not exists distribution_mode text not null default 'hierarchy_share'
    check (distribution_mode in ('hierarchy_share', 'full_remittance')),
  add column if not exists upward_share_percent numeric(5, 2) not null default 35
    check (upward_share_percent >= 0 and upward_share_percent <= 100);

alter table public.church_income_lines
  add column if not exists distribution_mode text
    check (distribution_mode is null or distribution_mode in ('hierarchy_share', 'full_remittance')),
  add column if not exists upward_share_percent numeric(5, 2)
    check (upward_share_percent is null or (upward_share_percent >= 0 and upward_share_percent <= 100)),
  add column if not exists amount_local_tz numeric(18, 2)
    check (amount_local_tz is null or amount_local_tz >= 0),
  add column if not exists amount_upward_tz numeric(18, 2)
    check (amount_upward_tz is null or amount_upward_tz >= 0);

alter table public.finance_settings
  add column if not exists hierarchy_share_percent numeric(5, 2) not null default 35
    check (hierarchy_share_percent >= 0 and hierarchy_share_percent <= 100);

comment on column public.church_income_sources.distribution_mode is
  'hierarchy_share = sehemu (kwa kawaida 35%) inapanda jimbo/dayosisi/kmkt; full_remittance = 100% kamili juu';
comment on column public.church_income_lines.amount_upward_tz is
  'Kiasi kinachotumwa ngazi ya juu (jimbo kutoka tawi, nk.)';

-- Orodha rasmi ya aina 47 za michango (preset)
insert into public.church_income_sources (
  chanzo, category, aina, status, source_type, source_code, frequency,
  restricted_fund, approval_required, distribution_mode, upward_share_percent, maelezo
)
select
  v.chanzo,
  v.category,
  'Mapato Halisi',
  'active',
  'predefined',
  v.code,
  'Monthly',
  case when v.mode = 'full_remittance' then 'Yes' else 'No' end,
  'No',
  v.mode,
  case when v.mode = 'full_remittance' then 100 else 35 end,
  'KMK(T) — aina rasmi ya mchango (usambazaji ngazi)'
from (
  values
    ('MCH001', 'Meza ya Bwana', 'Michango ya Kiroho', 'hierarchy_share'),
    ('MCH002', 'Sadaka', 'Michango ya Kiroho', 'hierarchy_share'),
    ('MCH003', 'Sadaka Maalum', 'Michango ya Kiroho', 'hierarchy_share'),
    ('MCH004', 'Zaka', 'Michango ya Kiroho', 'hierarchy_share'),
    ('MCH005', 'Shukrani / Rizuku', 'Michango ya Kiroho', 'hierarchy_share'),
    ('MCH006', 'Chango / Harambee', 'Michango ya Kiroho', 'hierarchy_share'),
    ('MCH007', 'Ukarimu', 'Michango ya Kiroho', 'hierarchy_share'),
    ('MCH008', 'Matoleo kwa Mama', 'Makundi / Idara', 'hierarchy_share'),
    ('MCH009', 'Matoleo Vijana', 'Makundi / Idara', 'hierarchy_share'),
    ('MCH010', 'Pasaka / Krismasi', 'Matukio', 'hierarchy_share'),
    ('MCH011', 'Mwaka Mpya', 'Matukio', 'hierarchy_share'),
    ('MCH012', 'Matoleo ya Kwaya', 'Makundi / Idara', 'hierarchy_share'),
    ('MCH013', 'Sadaka ya Mavuno', 'Michango ya Kiroho', 'hierarchy_share'),
    ('MCH014', 'Sadaka ya Uinjilisti', 'Michango ya Kiroho', 'hierarchy_share'),
    ('MCH015', 'Sadaka ya Utuume', 'Michango ya Kiroho', 'hierarchy_share'),
    ('MCH016', 'Sadaka ya Maombi', 'Michango ya Kiroho', 'hierarchy_share'),
    ('MCH017', 'Sadaka ya Ujenzi', 'Maendeleo', 'hierarchy_share'),
    ('MCH018', 'Sadaka ya Watoto', 'Michango ya Kiroho', 'hierarchy_share'),
    ('MCH019', 'Matoleo ya KE', 'Makundi / Idara', 'hierarchy_share'),
    ('MCH020', 'Matoleo ya ME', 'Makundi / Idara', 'hierarchy_share'),
    ('MCH021', 'Matoleo ya JV', 'Makundi / Idara', 'hierarchy_share'),
    ('MCH022', 'Michango ya Miradi', 'Maendeleo', 'full_remittance'),
    ('MCH023', 'Michango ya Elimu', 'Maendeleo', 'full_remittance'),
    ('MCH024', 'Michango ya Hospitali', 'Huduma na Jamii', 'full_remittance'),
    ('MCH025', 'Michango ya Chuo cha Biblia', 'Maendeleo', 'full_remittance'),
    ('MCH026', 'Michango ya Wahisani', 'Huduma na Jamii', 'full_remittance'),
    ('MCH027', 'Mapato ya Taasisi za Kanisa', 'Taasisi', 'full_remittance'),
    ('MCH028', 'Mapato ya Ukumbi', 'Taasisi', 'full_remittance'),
    ('MCH029', 'Mapato ya Guest House', 'Taasisi', 'full_remittance'),
    ('MCH030', 'Mapato ya Mashamba', 'Taasisi', 'full_remittance'),
    ('MCH031', 'Mapato ya Vitabu na Publications', 'Taasisi', 'full_remittance'),
    ('MCH032', 'Donations za Online', 'Ruzuku na Donations', 'full_remittance'),
    ('MCH033', 'Mobile Money Collections', 'Ruzuku na Donations', 'full_remittance'),
    ('MCH034', 'Conference & Seminar Fees', 'Matukio', 'full_remittance'),
    ('MCH035', 'Emergency Fund', 'Huduma na Jamii', 'full_remittance'),
    ('MCH036', 'Welfare Contributions', 'Huduma na Jamii', 'full_remittance'),
    ('MCH037', 'Mission Support Fund', 'Huduma na Jamii', 'full_remittance'),
    ('MCH038', 'Investment Income', 'Miradi na Uwekezaji', 'full_remittance'),
    ('MCH039', 'Sadaka ya Wageni', 'Michango ya Kiroho', 'hierarchy_share'),
    ('MCH040', 'Matoleo ya Wachungaji', 'Michango ya Kiroho', 'hierarchy_share'),
    ('MCH041', 'Michango ya Safari za Huduma', 'Huduma na Jamii', 'full_remittance'),
    ('MCH042', 'Michango ya Mikutano Mikuu', 'Matukio', 'full_remittance'),
    ('MCH043', 'Michango ya Huduma za Mazishi', 'Huduma na Jamii', 'full_remittance'),
    ('MCH044', 'Michango ya Ndoa', 'Matukio', 'full_remittance'),
    ('MCH045', 'Michango ya Vijana Camps', 'Matukio', 'full_remittance'),
    ('MCH046', 'Michango ya Mafunzo ya Biblia', 'Maendeleo', 'full_remittance'),
    ('MCH047', 'Other Church Income', 'Mengineyo', 'hierarchy_share')
) as v(code, chanzo, category, mode)
where not exists (
  select 1 from public.church_income_sources s
  where lower(trim(s.source_code)) = lower(v.code)
);

-- Sasisha preset zilizopo (chanzo zinazolingana kwa jina)
update public.church_income_sources s
set
  distribution_mode = v.mode,
  upward_share_percent = case when v.mode = 'full_remittance' then 100 else 35 end,
  source_type = coalesce(nullif(s.source_type, ''), 'predefined'),
  updated_at = now()
from (
  values
    ('MCH001', 'Meza ya Bwana', 'hierarchy_share'),
    ('MCH002', 'Sadaka', 'hierarchy_share'),
    ('MCH004', 'Zaka', 'hierarchy_share')
) as v(code, chanzo, mode)
where lower(trim(s.chanzo)) = lower(v.chanzo);
