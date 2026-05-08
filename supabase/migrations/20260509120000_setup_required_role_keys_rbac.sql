-- KMT Portal — Lazimisha role_keys zinazohitajika + matrix kamili (usikuuzi wa data ya kanisa).
-- Tumia label_sw / label_en (hakuna safu ya role_name kwenye portal_roles).
-- UPSERT tu — hakuna kufuta safu; RLS haiyaguswi.

-- ——— TASK 1: portal_roles (7 jukumu) ———
insert into public.portal_roles (role_key, label_sw, label_en, hierarchy_rank, description, is_system)
values
  ('super_admin', 'Msimamizi Mkuu', 'Super Admin', 10, 'Uchunguzi kamili wa mfumo na data.', true),
  ('national_admin', 'Msimamizi wa Kitaifa', 'National Admin', 30, 'Operesheni za kitaifa bila moduli za usalama wa mfumo.', true),
  ('office_admin', 'Msimamizi wa Ofisi', 'Office Admin', 35, 'Waumini, viongozi, muundo; fedha kwa kiwango kidogo.', true),
  ('finance_admin', 'Msimamizi wa Fedha', 'Finance Admin', 40, 'Fedha, mapato, vyanzo; mtazamaji kwenye moduli zingine.', true),
  ('approver', 'Idhinishaji', 'Approver', 55, 'Kuona na kuidhinisha nyaraka/fedha bila uhariri wa kawaida isipokuwa kwa mpango maalum.', true),
  ('reviewer', 'Mwangalizi', 'Reviewer', 60, 'Utazamaji wa ripoti na rekodi (hakuna uhariri).', true),
  ('viewer', 'Mtazamaji', 'Viewer', 200, 'Dashibodi na ripoti tu.', true)
on conflict (role_key) do update set
  label_sw = excluded.label_sw,
  label_en = excluded.label_en,
  hierarchy_rank = excluded.hierarchy_rank,
  description = excluded.description,
  is_system = excluded.is_system,
  updated_at = now();

-- ——— TASK 2: portal_module_matrix ———
-- Moduli zote (sawa na app-next/src/data/portalModuleKeys.ts)
-- super_admin: CRUD + export kwenye moduli zote; can_audit kwenye fedha/mipangilio/usalama/super_admin
-- national_admin: kamili isipokuwa usalama + super_admin (hakuna ufikiaji)
-- office_admin: msimamizi wa msingi; fedha si kamili (hakuna delete); developer/documents/mahubiri mtazamaji
-- finance_admin: kamili kwenye fedha, mapato_income, vyanzo_mapato; mtazamaji kwengine
-- approver: kuona tu + can_audit kwenye fedha (hakuna create/edit/delete)
-- reviewer: kuona tu kwenye moduli zilizoainishwa
-- viewer: kuona dashibodi + ripoti tu

insert into public.portal_module_matrix (
  role_key, module_key, can_view, can_create, can_edit, can_delete, can_export, can_audit
) values
-- —— super_admin (20 × kamili) ——
('super_admin', 'dashboard', true, true, true, true, true, false),
('super_admin', 'developer', true, true, true, true, true, false),
('super_admin', 'documents', true, true, true, true, true, false),
('super_admin', 'mahubiri', true, true, true, true, true, false),
('super_admin', 'muundo', true, true, true, true, true, false),
('super_admin', 'viongozi', true, true, true, true, true, false),
('super_admin', 'waumini', true, true, true, true, true, false),
('super_admin', 'jumuiya', true, true, true, true, true, false),
('super_admin', 'taasisi', true, true, true, true, true, false),
('super_admin', 'matukio', true, true, true, true, true, false),
('super_admin', 'machapisho', true, true, true, true, true, false),
('super_admin', 'nyaraka', true, true, true, true, true, false),
('super_admin', 'fedha', true, true, true, true, true, true),
('super_admin', 'mapato_income', true, true, true, true, true, false),
('super_admin', 'vyanzo_mapato', true, true, true, true, true, false),
('super_admin', 'ripoti', true, true, true, true, true, false),
('super_admin', 'mawasiliano', true, true, true, true, true, false),
('super_admin', 'mipangilio', true, true, true, true, true, true),
('super_admin', 'usalama', true, true, true, true, true, true),
('super_admin', 'super_admin', true, true, true, true, true, true),

-- —— national_admin: kamili isipokuwa usalama + super_admin ——
('national_admin', 'dashboard', true, true, true, true, true, false),
('national_admin', 'developer', true, true, true, true, true, false),
('national_admin', 'documents', true, true, true, true, true, false),
('national_admin', 'mahubiri', true, true, true, true, true, false),
('national_admin', 'muundo', true, true, true, true, true, false),
('national_admin', 'viongozi', true, true, true, true, true, false),
('national_admin', 'waumini', true, true, true, true, true, false),
('national_admin', 'jumuiya', true, true, true, true, true, false),
('national_admin', 'taasisi', true, true, true, true, true, false),
('national_admin', 'matukio', true, true, true, true, true, false),
('national_admin', 'machapisho', true, true, true, true, true, false),
('national_admin', 'nyaraka', true, true, true, true, true, false),
('national_admin', 'fedha', true, true, true, true, true, true),
('national_admin', 'mapato_income', true, true, true, true, true, false),
('national_admin', 'vyanzo_mapato', true, true, true, true, true, false),
('national_admin', 'ripoti', true, true, true, true, true, false),
('national_admin', 'mawasiliano', true, true, true, true, true, false),
('national_admin', 'mipangilio', true, true, true, true, true, true),
('national_admin', 'usalama', false, false, false, false, false, false),
('national_admin', 'super_admin', false, false, false, false, false, false),

-- —— office_admin: msingi + fedha isiyo na delete; developer/documents/mahubiri mtazamaji ——
('office_admin', 'dashboard', true, true, true, false, true, false),
('office_admin', 'developer', true, false, false, false, true, false),
('office_admin', 'documents', true, false, false, false, true, false),
('office_admin', 'mahubiri', true, false, false, false, true, false),
('office_admin', 'muundo', true, true, true, false, true, false),
('office_admin', 'viongozi', true, true, true, false, true, false),
('office_admin', 'waumini', true, true, true, false, true, false),
('office_admin', 'jumuiya', true, true, true, false, true, false),
('office_admin', 'taasisi', true, true, true, false, true, false),
('office_admin', 'matukio', true, true, true, false, true, false),
('office_admin', 'machapisho', true, true, true, false, true, false),
('office_admin', 'nyaraka', true, true, true, false, true, false),
('office_admin', 'fedha', true, true, true, false, true, true),
('office_admin', 'mapato_income', true, true, true, false, true, false),
('office_admin', 'vyanzo_mapato', true, true, true, false, true, false),
('office_admin', 'ripoti', true, true, true, false, true, false),
('office_admin', 'mawasiliano', true, true, true, false, true, false),
('office_admin', 'mipangilio', true, true, true, false, true, true),
('office_admin', 'usalama', false, false, false, false, false, false),
('office_admin', 'super_admin', false, false, false, false, false, false),

-- —— finance_admin: kamili kwenye fedha / mapato / vyanzo; mtazamaji kwengine ——
('finance_admin', 'dashboard', true, false, false, false, true, false),
('finance_admin', 'developer', true, false, false, false, true, false),
('finance_admin', 'documents', true, false, false, false, true, false),
('finance_admin', 'mahubiri', true, false, false, false, true, false),
('finance_admin', 'muundo', true, false, false, false, true, false),
('finance_admin', 'viongozi', true, false, false, false, true, false),
('finance_admin', 'waumini', true, false, false, false, true, false),
('finance_admin', 'jumuiya', true, false, false, false, true, false),
('finance_admin', 'taasisi', true, false, false, false, true, false),
('finance_admin', 'matukio', true, false, false, false, true, false),
('finance_admin', 'machapisho', true, false, false, false, true, false),
('finance_admin', 'nyaraka', true, false, false, false, true, false),
('finance_admin', 'fedha', true, true, true, false, true, true),
('finance_admin', 'mapato_income', true, true, true, false, true, false),
('finance_admin', 'vyanzo_mapato', true, true, true, false, true, false),
('finance_admin', 'ripoti', true, false, false, false, true, false),
('finance_admin', 'mawasiliano', true, false, false, false, true, false),
('finance_admin', 'mipangilio', false, false, false, false, false, false),
('finance_admin', 'usalama', false, false, false, false, false, false),
('finance_admin', 'super_admin', false, false, false, false, false, false),

-- —— approver: kuona + audit fedha (hakuna create/edit/delete) ——
('approver', 'dashboard', true, false, false, false, true, false),
('approver', 'developer', true, false, false, false, true, false),
('approver', 'documents', true, false, false, false, true, false),
('approver', 'mahubiri', true, false, false, false, true, false),
('approver', 'muundo', false, false, false, false, false, false),
('approver', 'viongozi', false, false, false, false, false, false),
('approver', 'waumini', false, false, false, false, false, false),
('approver', 'jumuiya', false, false, false, false, false, false),
('approver', 'taasisi', false, false, false, false, false, false),
('approver', 'matukio', false, false, false, false, false, false),
('approver', 'machapisho', false, false, false, false, false, false),
('approver', 'nyaraka', true, false, false, false, true, false),
('approver', 'fedha', true, false, false, false, true, true),
('approver', 'mapato_income', true, false, false, false, true, false),
('approver', 'vyanzo_mapato', false, false, false, false, false, false),
('approver', 'ripoti', true, false, false, false, true, false),
('approver', 'mawasiliano', true, false, false, false, true, false),
('approver', 'mipangilio', false, false, false, false, false, false),
('approver', 'usalama', false, false, false, false, false, false),
('approver', 'super_admin', false, false, false, false, false, false),

-- —— reviewer: kuona tu ——
('reviewer', 'dashboard', true, false, false, false, true, false),
('reviewer', 'developer', true, false, false, false, true, false),
('reviewer', 'documents', true, false, false, false, true, false),
('reviewer', 'mahubiri', true, false, false, false, true, false),
('reviewer', 'muundo', true, false, false, false, true, false),
('reviewer', 'viongozi', true, false, false, false, true, false),
('reviewer', 'waumini', true, false, false, false, true, false),
('reviewer', 'jumuiya', false, false, false, false, false, false),
('reviewer', 'taasisi', false, false, false, false, false, false),
('reviewer', 'matukio', false, false, false, false, false, false),
('reviewer', 'machapisho', false, false, false, false, false, false),
('reviewer', 'nyaraka', false, false, false, false, false, false),
('reviewer', 'fedha', true, false, false, false, true, true),
('reviewer', 'mapato_income', true, false, false, false, true, false),
('reviewer', 'vyanzo_mapato', false, false, false, false, false, false),
('reviewer', 'ripoti', true, false, false, false, true, false),
('reviewer', 'mawasiliano', false, false, false, false, false, false),
('reviewer', 'mipangilio', false, false, false, false, false, false),
('reviewer', 'usalama', false, false, false, false, false, false),
('reviewer', 'super_admin', false, false, false, false, false, false),

-- —— viewer: dashibodi + ripoti tu ——
('viewer', 'dashboard', true, false, false, false, true, false),
('viewer', 'developer', false, false, false, false, false, false),
('viewer', 'documents', false, false, false, false, false, false),
('viewer', 'mahubiri', false, false, false, false, false, false),
('viewer', 'muundo', false, false, false, false, false, false),
('viewer', 'viongozi', false, false, false, false, false, false),
('viewer', 'waumini', false, false, false, false, false, false),
('viewer', 'jumuiya', false, false, false, false, false, false),
('viewer', 'taasisi', false, false, false, false, false, false),
('viewer', 'matukio', false, false, false, false, false, false),
('viewer', 'machapisho', false, false, false, false, false, false),
('viewer', 'nyaraka', false, false, false, false, false, false),
('viewer', 'fedha', false, false, false, false, false, false),
('viewer', 'mapato_income', false, false, false, false, false, false),
('viewer', 'vyanzo_mapato', false, false, false, false, false, false),
('viewer', 'ripoti', true, false, false, false, true, false),
('viewer', 'mawasiliano', false, false, false, false, false, false),
('viewer', 'mipangilio', false, false, false, false, false, false),
('viewer', 'usalama', false, false, false, false, false, false),
('viewer', 'super_admin', false, false, false, false, false, false)

on conflict (role_key, module_key) do update set
  can_view = excluded.can_view,
  can_create = excluded.can_create,
  can_edit = excluded.can_edit,
  can_delete = excluded.can_delete,
  can_export = excluded.can_export,
  can_audit = excluded.can_audit,
  updated_at = now();
