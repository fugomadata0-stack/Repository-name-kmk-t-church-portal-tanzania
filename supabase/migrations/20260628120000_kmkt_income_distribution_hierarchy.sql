-- Usambazaji wa michango: 35% (hierarchy_share) au 100% (full_remittance) — tawi → jimbo → dayosisi → KMK(T)

alter table public.church_income_sources
  add column if not exists distribution_mode text not null default 'hierarchy_share'
    check (distribution_mode in ('hierarchy_share', 'full_remittance')),
  add column if not exists upward_share_percent numeric(5, 2) not null default 35
    check (upward_share_percent >= 0 and upward_share_percent <= 100),
  add column if not exists sort_order int not null default 0;

alter table public.church_income_lines
  add column if not exists distribution_mode text
    check (distribution_mode is null or distribution_mode in ('hierarchy_share', 'full_remittance')),
  add column if not exists upward_share_percent numeric(5, 2)
    check (upward_share_percent is null or (upward_share_percent >= 0 and upward_share_percent <= 100)),
  add column if not exists amount_local_tz numeric(18, 2) not null default 0 check (amount_local_tz >= 0),
  add column if not exists amount_upward_tz numeric(18, 2) not null default 0 check (amount_upward_tz >= 0);

alter table public.finance_settings
  add column if not exists default_upward_share_percent numeric(5, 2) not null default 35
    check (default_upward_share_percent >= 0 and default_upward_share_percent <= 100);

comment on column public.church_income_sources.distribution_mode is
  'hierarchy_share = sehemu (kwa kawaida 35%) kwenda ngazi ya juu; full_remittance = 100% kama ilivyokusanywa';
comment on column public.church_income_lines.amount_upward_tz is
  'Kiasi kinachotumwa ngazi ya juu (jimbo kutoka tawi, dayosisi kutoka jimbo, KMK(T kutoka dayosisi)';

-- Orodha rasmi 47 za vyanzo vya mapato
insert into public.church_income_sources (
  chanzo, source_type, source_code, category, aina, status, frequency, restricted_fund,
  distribution_mode, upward_share_percent, sort_order, maelezo
)
select
  v.chanzo,
  'predefined',
  v.source_code,
  v.category,
  'Mapato Halisi',
  'active',
  'Monthly',
  case when v.distribution_mode = 'full_remittance' then 'Yes' else 'No' end,
  v.distribution_mode,
  v.upward_share_percent,
  v.sort_order,
  m.maelezo
from (
  values
    (1, 'INC-001', 'Meza ya Bwana', 'Michango ya Kiroho', 'hierarchy_share', 35::numeric),
    (2, 'INC-002', 'Sadaka', 'Michango ya Kiroho', 'hierarchy_share', 35),
    (3, 'INC-003', 'Sadaka Maalum', 'Michango ya Kiroho', 'hierarchy_share', 35),
    (4, 'INC-004', 'Zaka', 'Michango ya Kiroho', 'hierarchy_share', 35),
    (5, 'INC-005', 'Shukrani / Rizuku', 'Michango ya Kiroho', 'hierarchy_share', 35),
    (6, 'INC-006', 'Chango / Harambee', 'Michango ya Kiroho', 'hierarchy_share', 35),
    (7, 'INC-007', 'Ukarimu', 'Michango ya Kiroho', 'hierarchy_share', 35),
    (8, 'INC-008', 'Matoleo kwa Mama', 'Michango ya Kiroho', 'hierarchy_share', 35),
    (9, 'INC-009', 'Matoleo Vijana', 'Michango ya Kiroho', 'hierarchy_share', 35),
    (10, 'INC-010', 'Pasaka / Krismasi', 'Michango ya Kiroho', 'hierarchy_share', 35),
    (11, 'INC-011', 'Mwaka Mpya', 'Michango ya Kiroho', 'hierarchy_share', 35),
    (12, 'INC-012', 'Matoleo ya Kwaya', 'Michango ya Kiroho', 'hierarchy_share', 35),
    (13, 'INC-013', 'Sadaka ya Mavuno', 'Michango ya Kiroho', 'hierarchy_share', 35),
    (14, 'INC-014', 'Sadaka ya Uinjilisti', 'Michango ya Kiroho', 'hierarchy_share', 35),
    (15, 'INC-015', 'Sadaka ya Utuume', 'Michango ya Kiroho', 'hierarchy_share', 35),
    (16, 'INC-016', 'Sadaka ya Maombi', 'Michango ya Kiroho', 'hierarchy_share', 35),
    (17, 'INC-017', 'Sadaka ya Ujenzi', 'Michango ya Kiroho', 'hierarchy_share', 35),
    (18, 'INC-018', 'Sadaka ya Watoto', 'Michango ya Kiroho', 'hierarchy_share', 35),
    (19, 'INC-019', 'Matoleo ya KE', 'Makundi / Idara', 'hierarchy_share', 35),
    (20, 'INC-020', 'Matoleo ya ME', 'Makundi / Idara', 'hierarchy_share', 35),
    (21, 'INC-021', 'Matoleo ya JV', 'Makundi / Idara', 'hierarchy_share', 35),
    (22, 'INC-022', 'Michango ya Miradi', 'Miradi na Maendeleo', 'full_remittance', 100),
    (23, 'INC-023', 'Michango ya Elimu', 'Miradi na Maendeleo', 'full_remittance', 100),
    (24, 'INC-024', 'Michango ya Hospitali', 'Miradi na Maendeleo', 'full_remittance', 100),
    (25, 'INC-025', 'Michango ya Chuo cha Biblia', 'Miradi na Maendeleo', 'full_remittance', 100),
    (26, 'INC-026', 'Michango ya Wahisani', 'Miradi na Maendeleo', 'full_remittance', 100),
    (27, 'INC-027', 'Mapato ya Taasisi za Kanisa', 'Taasisi na Mali', 'full_remittance', 100),
    (28, 'INC-028', 'Mapato ya Ukumbi', 'Taasisi na Mali', 'full_remittance', 100),
    (29, 'INC-029', 'Mapato ya Guest House', 'Taasisi na Mali', 'full_remittance', 100),
    (30, 'INC-030', 'Mapato ya Mashamba', 'Taasisi na Mali', 'full_remittance', 100),
    (31, 'INC-031', 'Mapato ya Vitabu na Publications', 'Taasisi na Mali', 'full_remittance', 100),
    (32, 'INC-032', 'Donations za Online', 'Digital na Misaada', 'full_remittance', 100),
    (33, 'INC-033', 'Mobile Money Collections', 'Digital na Misaada', 'full_remittance', 100),
    (34, 'INC-034', 'Conference & Seminar Fees', 'Matukio', 'full_remittance', 100),
    (35, 'INC-035', 'Emergency Fund', 'Mifuko Maalum', 'full_remittance', 100),
    (36, 'INC-036', 'Welfare Contributions', 'Mifuko Maalum', 'full_remittance', 100),
    (37, 'INC-037', 'Mission Support Fund', 'Mifuko Maalum', 'full_remittance', 100),
    (38, 'INC-038', 'Investment Income', 'Taasisi na Mali', 'full_remittance', 100),
    (39, 'INC-039', 'Sadaka ya Wageni', 'Michango ya Kiroho', 'hierarchy_share', 35),
    (40, 'INC-040', 'Matoleo ya Wachungaji', 'Michango ya Kiroho', 'hierarchy_share', 35),
    (41, 'INC-041', 'Michango ya Safari za Huduma', 'Huduma', 'full_remittance', 100),
    (42, 'INC-042', 'Michango ya Mikutano Mikuu', 'Matukio', 'full_remittance', 100),
    (43, 'INC-043', 'Michango ya Huduma za Mazishi', 'Huduma', 'hierarchy_share', 35),
    (44, 'INC-044', 'Michango ya Ndoa', 'Huduma', 'hierarchy_share', 35),
    (45, 'INC-045', 'Michango ya Vijana Camps', 'Matukio', 'full_remittance', 100),
    (46, 'INC-046', 'Michango ya Mafunzo ya Biblia', 'Elimu', 'full_remittance', 100),
    (47, 'INC-047', 'Other Church Income', 'Mengineyo', 'hierarchy_share', 35)
) as v(sort_order, source_code, chanzo, category, distribution_mode, upward_share_percent)
cross join lateral (
  select format(
    'KMK(T) — %s · %s',
    case v.distribution_mode when 'full_remittance' then '100%% juu' else '35%% juu (hierarchy)' end,
    v.chanzo
  ) as maelezo
) m
where not exists (
  select 1 from public.church_income_sources s
  where lower(trim(s.source_code)) = lower(v.source_code)
);

-- Sasisha vyanzo vilivyopo kwa msimbo wa INC-* (bila kubadilisha majina ya kawaida)
update public.church_income_sources s
set
  distribution_mode = v.distribution_mode,
  upward_share_percent = v.upward_share_percent,
  sort_order = v.sort_order,
  source_type = 'predefined'
from (
  values
    ('INC-001', 'hierarchy_share', 35::numeric, 1),
    ('INC-002', 'hierarchy_share', 35, 2),
    ('INC-003', 'hierarchy_share', 35, 3),
    ('INC-004', 'hierarchy_share', 35, 4),
    ('INC-005', 'hierarchy_share', 35, 5),
    ('INC-006', 'hierarchy_share', 35, 6),
    ('INC-007', 'hierarchy_share', 35, 7),
    ('INC-008', 'hierarchy_share', 35, 8),
    ('INC-009', 'hierarchy_share', 35, 9),
    ('INC-010', 'hierarchy_share', 35, 10),
    ('INC-011', 'hierarchy_share', 35, 11),
    ('INC-012', 'hierarchy_share', 35, 12),
    ('INC-013', 'hierarchy_share', 35, 13),
    ('INC-014', 'hierarchy_share', 35, 14),
    ('INC-015', 'hierarchy_share', 35, 15),
    ('INC-016', 'hierarchy_share', 35, 16),
    ('INC-017', 'hierarchy_share', 35, 17),
    ('INC-018', 'hierarchy_share', 35, 18),
    ('INC-019', 'hierarchy_share', 35, 19),
    ('INC-020', 'hierarchy_share', 35, 20),
    ('INC-021', 'hierarchy_share', 35, 21),
    ('INC-022', 'full_remittance', 100, 22),
    ('INC-023', 'full_remittance', 100, 23),
    ('INC-024', 'full_remittance', 100, 24),
    ('INC-025', 'full_remittance', 100, 25),
    ('INC-026', 'full_remittance', 100, 26),
    ('INC-027', 'full_remittance', 100, 27),
    ('INC-028', 'full_remittance', 100, 28),
    ('INC-029', 'full_remittance', 100, 29),
    ('INC-030', 'full_remittance', 100, 30),
    ('INC-031', 'full_remittance', 100, 31),
    ('INC-032', 'full_remittance', 100, 32),
    ('INC-033', 'full_remittance', 100, 33),
    ('INC-034', 'full_remittance', 100, 34),
    ('INC-035', 'full_remittance', 100, 35),
    ('INC-036', 'full_remittance', 100, 36),
    ('INC-037', 'full_remittance', 100, 37),
    ('INC-038', 'full_remittance', 100, 38),
    ('INC-039', 'hierarchy_share', 35, 39),
    ('INC-040', 'hierarchy_share', 35, 40),
    ('INC-041', 'full_remittance', 100, 41),
    ('INC-042', 'full_remittance', 100, 42),
    ('INC-043', 'hierarchy_share', 35, 43),
    ('INC-044', 'hierarchy_share', 35, 44),
    ('INC-045', 'full_remittance', 100, 45),
    ('INC-046', 'full_remittance', 100, 46),
    ('INC-047', 'hierarchy_share', 35, 47)
) as v(source_code, distribution_mode, upward_share_percent, sort_order)
where lower(trim(s.source_code)) = lower(v.source_code);
