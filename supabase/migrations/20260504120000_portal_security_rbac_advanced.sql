-- KMT Portal — Usalama wa hali ya juu (RBAC matrix, directory, visibility, sessions diary, sera)
-- Kinatumia RLS + anon policies za maendeleo (nyeti kwa uzalishani — fungana anon na tumia Auth + RLS kali).
-- Chanzo cha matrix: sawa na app-next/src/utils/permissions.ts (gen-rbac-seed.mjs).

-- ——— Roles metadata ———
create table if not exists public.portal_roles (
  role_key text primary key,
  label_sw text not null,
  label_en text,
  hierarchy_rank int not null default 500,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ——— Module × role capability matrix (canonical RBAC store) ———
create table if not exists public.portal_module_matrix (
  role_key text not null references public.portal_roles (role_key) on delete cascade,
  module_key text not null,
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  can_export boolean not null default false,
  can_audit boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (role_key, module_key)
);

create index if not exists portal_module_matrix_module_idx on public.portal_module_matrix (module_key);

-- ——— Watumiaji wa portal (directory; auth_user_id inaunganisha baada ya mwaliko wa Auth) ———
create table if not exists public.portal_directory_profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  phone text,
  role_key text not null references public.portal_roles (role_key),
  auth_user_id uuid references auth.users (id) on delete set null,
  dayosisi_scope text,
  jimbo_scope text,
  tawi_scope text,
  status text not null default 'pending' check (status in ('pending', 'invited', 'active', 'suspended')),
  notes text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portal_directory_profiles_role_idx on public.portal_directory_profiles (role_key);
create index if not exists portal_directory_profiles_auth_idx on public.portal_directory_profiles (auth_user_id);

-- ——— Sheria za mwonekano wa data (scope / ngazi) ———
create table if not exists public.portal_visibility_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  module_key text not null,
  scope_type text not null check (scope_type in ('national', 'dayosisi', 'jimbo', 'tawi', 'self')),
  dayosisi_match text,
  jimbo_match text,
  tawi_match text,
  allowed_roles text[] not null default '{}',
  priority int not null default 100,
  active boolean not null default true,
  notes text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portal_visibility_rules_module_idx on public.portal_visibility_rules (module_key);

-- ——— Diary ya matukio ya kuingia / API (siyo auth.sessions ya ndani ya GoTrue) ———
create table if not exists public.portal_access_events (
  id bigserial primary key,
  user_label text,
  auth_user_id uuid,
  event_type text not null check (event_type in ('login', 'logout', 'token_refresh', 'page_view', 'api', 'policy_change', 'rbac_change')),
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists portal_access_events_created_idx on public.portal_access_events (created_at desc);

-- ——— Sera za mfumo (moja kwa moja — JSON inayo badilika) ———
create table if not exists public.portal_security_policies (
  id int primary key default 1 check (id = 1),
  policy_json jsonb not null default jsonb_build_object(
    'password_min_length', 10,
    'lockout_attempts', 5,
    'session_idle_minutes', 45,
    'mfa_enforced_roles', jsonb_build_array('chief_admin', 'finance_admin'),
    'ip_allowlist_enabled', false,
    'ip_allowlist_cidrs', '[]'::jsonb,
    'require_email_verify', true,
    'audit_retention_days', 365
  ),
  updated_at timestamptz not null default now()
);

insert into public.portal_security_policies (id) values (1) on conflict (id) do nothing;

-- ——— Seed roles ———
insert into public.portal_roles (role_key, label_sw, label_en, hierarchy_rank, description, is_system)
values
  ('super_admin', 'Msimamizi Mkuu', 'Super Admin', 10, 'Uchunguzi kamili na mfumo.', true),
  ('chief_admin', 'Mkuu wa Utawala', 'Chief Admin', 20, 'Utawala wa kitaifa na tovuti.', true),
  ('national_admin', 'Msimamizi wa Kitaifa', 'National Admin', 30, 'Operesheni za kitaifa (bila usalama wa mfumo).', true),
  ('office_admin', 'Msimamizi wa Ofisi', 'Office Admin', 35, 'Ofisi kuu & nyaraka.', true),
  ('finance_admin', 'Msimamizi wa Fedha', 'Finance Admin', 40, 'Fedha na ripoti.', true),
  ('secretary', 'Katibu', 'Secretary', 50, 'Waumini, matukio, mawasiliano.', true),
  ('approver', 'Idhinishaji', 'Approver', 55, 'Idhini ya nyaraka/fedha.', true),
  ('reviewer', 'Mwangalizi', 'Reviewer', 60, 'Kusoma na kuhakiki.', true),
  ('dayosisi_admin', 'Msimamizi wa Dayosisi', 'Diocese Admin', 70, 'mhimili wa dayosisi.', true),
  ('jimbo_admin', 'Msimamizi wa Jimbo', 'District Admin', 80, 'mhimili wa jimbo.', true),
  ('tawi_admin', 'Msimamizi wa Tawi', 'Branch Admin', 90, 'mhimili wa tawi/kituo.', true),
  ('viewer', 'Mtazamaji', 'Viewer', 200, 'Tazama ripoti tu.', true)
on conflict (role_key) do update set
  label_sw = excluded.label_sw,
  label_en = excluded.label_en,
  hierarchy_rank = excluded.hierarchy_rank,
  description = excluded.description;

-- ——— Seed RBAC matrix (221 rows) ———
insert into public.portal_module_matrix (
  role_key, module_key, can_view, can_create, can_edit, can_delete, can_export, can_audit
) values
('super_admin', 'dashboard', true, true, true, true, true, false),
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
('chief_admin', 'dashboard', true, true, true, true, true, false),
('chief_admin', 'muundo', true, true, true, true, true, false),
('chief_admin', 'viongozi', true, true, true, true, true, false),
('chief_admin', 'waumini', true, true, true, true, true, false),
('chief_admin', 'jumuiya', true, true, true, true, true, false),
('chief_admin', 'taasisi', true, true, true, true, true, false),
('chief_admin', 'matukio', true, true, true, true, true, false),
('chief_admin', 'machapisho', true, true, true, true, true, false),
('chief_admin', 'nyaraka', true, true, true, true, true, false),
('chief_admin', 'fedha', true, true, true, true, true, true),
('chief_admin', 'mapato_income', true, true, true, true, true, false),
('chief_admin', 'vyanzo_mapato', true, true, true, true, true, false),
('chief_admin', 'ripoti', true, true, true, true, true, false),
('chief_admin', 'mawasiliano', true, true, true, true, true, false),
('chief_admin', 'mipangilio', true, true, true, true, true, true),
('chief_admin', 'usalama', true, true, true, true, true, true),
('chief_admin', 'super_admin', false, false, false, false, false, false),
('national_admin', 'dashboard', true, true, true, true, true, false),
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
('office_admin', 'dashboard', true, true, true, false, true, false),
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
('finance_admin', 'dashboard', true, true, true, false, true, false),
('finance_admin', 'muundo', true, true, true, false, true, false),
('finance_admin', 'viongozi', false, false, false, false, false, false),
('finance_admin', 'waumini', false, false, false, false, false, false),
('finance_admin', 'jumuiya', false, false, false, false, false, false),
('finance_admin', 'taasisi', false, false, false, false, false, false),
('finance_admin', 'matukio', false, false, false, false, false, false),
('finance_admin', 'machapisho', false, false, false, false, false, false),
('finance_admin', 'nyaraka', true, true, true, false, true, false),
('finance_admin', 'fedha', true, true, true, false, true, true),
('finance_admin', 'mapato_income', true, true, true, false, true, false),
('finance_admin', 'vyanzo_mapato', true, true, true, false, true, false),
('finance_admin', 'ripoti', true, true, true, false, true, false),
('finance_admin', 'mawasiliano', true, true, true, false, true, false),
('finance_admin', 'mipangilio', false, false, false, false, false, false),
('finance_admin', 'usalama', false, false, false, false, false, false),
('finance_admin', 'super_admin', false, false, false, false, false, false),
('secretary', 'dashboard', true, true, true, false, true, false),
('secretary', 'muundo', true, true, true, false, true, false),
('secretary', 'viongozi', false, false, false, false, false, false),
('secretary', 'waumini', true, true, true, false, true, false),
('secretary', 'jumuiya', true, true, true, false, true, false),
('secretary', 'taasisi', false, false, false, false, false, false),
('secretary', 'matukio', true, true, true, false, true, false),
('secretary', 'machapisho', true, true, true, false, true, false),
('secretary', 'nyaraka', true, true, true, false, true, false),
('secretary', 'fedha', false, false, false, false, false, false),
('secretary', 'mapato_income', false, false, false, false, false, false),
('secretary', 'vyanzo_mapato', false, false, false, false, false, false),
('secretary', 'ripoti', false, false, false, false, false, false),
('secretary', 'mawasiliano', true, true, true, false, true, false),
('secretary', 'mipangilio', false, false, false, false, false, false),
('secretary', 'usalama', false, false, false, false, false, false),
('secretary', 'super_admin', false, false, false, false, false, false),
('approver', 'dashboard', true, false, false, false, true, false),
('approver', 'muundo', false, false, false, false, false, false),
('approver', 'viongozi', false, false, false, false, false, false),
('approver', 'waumini', false, false, false, false, false, false),
('approver', 'jumuiya', false, false, false, false, false, false),
('approver', 'taasisi', false, false, false, false, false, false),
('approver', 'matukio', false, false, false, false, false, false),
('approver', 'machapisho', false, false, false, false, false, false),
('approver', 'nyaraka', true, false, true, false, true, false),
('approver', 'fedha', true, false, true, false, true, true),
('approver', 'mapato_income', true, false, true, false, true, false),
('approver', 'vyanzo_mapato', false, false, false, false, false, false),
('approver', 'ripoti', true, false, false, false, true, false),
('approver', 'mawasiliano', true, false, true, false, true, false),
('approver', 'mipangilio', false, false, false, false, false, false),
('approver', 'usalama', false, false, false, false, false, false),
('approver', 'super_admin', false, false, false, false, false, false),
('reviewer', 'dashboard', true, false, false, false, true, false),
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
('dayosisi_admin', 'dashboard', true, true, true, false, true, false),
('dayosisi_admin', 'muundo', true, true, true, false, true, false),
('dayosisi_admin', 'viongozi', true, true, true, false, true, false),
('dayosisi_admin', 'waumini', true, true, true, false, true, false),
('dayosisi_admin', 'jumuiya', true, true, true, false, true, false),
('dayosisi_admin', 'taasisi', false, false, false, false, false, false),
('dayosisi_admin', 'matukio', true, true, true, false, true, false),
('dayosisi_admin', 'machapisho', false, false, false, false, false, false),
('dayosisi_admin', 'nyaraka', false, false, false, false, false, false),
('dayosisi_admin', 'fedha', true, true, true, false, true, true),
('dayosisi_admin', 'mapato_income', false, false, false, false, false, false),
('dayosisi_admin', 'vyanzo_mapato', true, true, true, false, true, false),
('dayosisi_admin', 'ripoti', true, true, true, false, true, false),
('dayosisi_admin', 'mawasiliano', true, true, true, false, true, false),
('dayosisi_admin', 'mipangilio', false, false, false, false, false, false),
('dayosisi_admin', 'usalama', false, false, false, false, false, false),
('dayosisi_admin', 'super_admin', false, false, false, false, false, false),
('jimbo_admin', 'dashboard', true, true, true, false, true, false),
('jimbo_admin', 'muundo', true, true, true, false, true, false),
('jimbo_admin', 'viongozi', true, true, true, false, true, false),
('jimbo_admin', 'waumini', true, true, true, false, true, false),
('jimbo_admin', 'jumuiya', true, true, true, false, true, false),
('jimbo_admin', 'taasisi', false, false, false, false, false, false),
('jimbo_admin', 'matukio', true, true, true, false, true, false),
('jimbo_admin', 'machapisho', false, false, false, false, false, false),
('jimbo_admin', 'nyaraka', false, false, false, false, false, false),
('jimbo_admin', 'fedha', true, true, true, false, true, true),
('jimbo_admin', 'mapato_income', false, false, false, false, false, false),
('jimbo_admin', 'vyanzo_mapato', true, true, true, false, true, false),
('jimbo_admin', 'ripoti', true, true, true, false, true, false),
('jimbo_admin', 'mawasiliano', false, false, false, false, false, false),
('jimbo_admin', 'mipangilio', false, false, false, false, false, false),
('jimbo_admin', 'usalama', false, false, false, false, false, false),
('jimbo_admin', 'super_admin', false, false, false, false, false, false),
('tawi_admin', 'dashboard', true, true, false, false, true, false),
('tawi_admin', 'muundo', true, true, false, false, true, false),
('tawi_admin', 'viongozi', true, true, false, false, true, false),
('tawi_admin', 'waumini', true, true, false, false, true, false),
('tawi_admin', 'jumuiya', true, true, false, false, true, false),
('tawi_admin', 'taasisi', false, false, false, false, false, false),
('tawi_admin', 'matukio', true, true, false, false, true, false),
('tawi_admin', 'machapisho', false, false, false, false, false, false),
('tawi_admin', 'nyaraka', false, false, false, false, false, false),
('tawi_admin', 'fedha', false, false, false, false, false, false),
('tawi_admin', 'mapato_income', false, false, false, false, false, false),
('tawi_admin', 'vyanzo_mapato', false, false, false, false, false, false),
('tawi_admin', 'ripoti', false, false, false, false, false, false),
('tawi_admin', 'mawasiliano', false, false, false, false, false, false),
('tawi_admin', 'mipangilio', false, false, false, false, false, false),
('tawi_admin', 'usalama', false, false, false, false, false, false),
('tawi_admin', 'super_admin', false, false, false, false, false, false),
('viewer', 'dashboard', true, false, false, false, true, false),
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

-- ——— Demo seed: directory, visibility, events ———
insert into public.portal_directory_profiles (email, full_name, role_key, status, notes)
values
  ('msimamizi@kmkt.or.tz', 'Mfano — Mkuu wa Utawala', 'chief_admin', 'active', 'Rekodi ya mfano — futa au sasisha kwa mtumiaji halisi.'),
  ('fedha@kmkt.or.tz', 'Mfano — Fedha', 'finance_admin', 'invited', 'Mwaliko utatumwa baada ya kuunganisha Supabase Auth.')
on conflict (email) do nothing;

insert into public.portal_visibility_rules (name, module_key, scope_type, dayosisi_match, allowed_roles, priority, active, notes)
select * from (values
  ('Fedha — ukingo wa dayosisi', 'fedha', 'dayosisi', null::text, array['dayosisi_admin','jimbo_admin','finance_admin']::text[], 10, true, 'Ripoti za fedha kwa ngazi ya dayosisi na chini.'),
  ('Ripoti — taifa nzima', 'ripoti', 'national', null::text, array['chief_admin','national_admin','office_admin']::text[], 5, true, 'Kuangalia takwimu za taifa.')
) as v(name, module_key, scope_type, dayosisi_match, allowed_roles, priority, active, notes)
where not exists (select 1 from public.portal_visibility_rules r where r.name = v.name);

insert into public.portal_access_events (user_label, event_type, detail)
select * from (values
  ('[demo] mfumo', 'page_view', '{"path":"/usalama/Sessions","note":"sample"}'::jsonb),
  ('[demo] sera', 'policy_change', '{"field":"session_idle_minutes"}'::jsonb)
) as v(user_label, event_type, detail)
where not exists (select 1 from public.portal_access_events e where e.user_label = v.user_label and e.event_type = v.event_type);

-- ——— RLS ———
alter table public.portal_roles enable row level security;
alter table public.portal_module_matrix enable row level security;
alter table public.portal_directory_profiles enable row level security;
alter table public.portal_visibility_rules enable row level security;
alter table public.portal_access_events enable row level security;
alter table public.portal_security_policies enable row level security;

-- Maendeleo: anon + authenticated kamili (ondoa anon kwa uzalishani)
drop policy if exists "portal_roles_anon_all" on public.portal_roles;
create policy "portal_roles_anon_all" on public.portal_roles for all to anon using (true) with check (true);

drop policy if exists "portal_roles_auth_all" on public.portal_roles;
create policy "portal_roles_auth_all" on public.portal_roles for all to authenticated using (true) with check (true);

drop policy if exists "portal_matrix_anon_all" on public.portal_module_matrix;
create policy "portal_matrix_anon_all" on public.portal_module_matrix for all to anon using (true) with check (true);

drop policy if exists "portal_matrix_auth_all" on public.portal_module_matrix;
create policy "portal_matrix_auth_all" on public.portal_module_matrix for all to authenticated using (true) with check (true);

drop policy if exists "portal_directory_anon_all" on public.portal_directory_profiles;
create policy "portal_directory_anon_all" on public.portal_directory_profiles for all to anon using (true) with check (true);

drop policy if exists "portal_directory_auth_all" on public.portal_directory_profiles;
create policy "portal_directory_auth_all" on public.portal_directory_profiles for all to authenticated using (true) with check (true);

drop policy if exists "portal_visibility_anon_all" on public.portal_visibility_rules;
create policy "portal_visibility_anon_all" on public.portal_visibility_rules for all to anon using (true) with check (true);

drop policy if exists "portal_visibility_auth_all" on public.portal_visibility_rules;
create policy "portal_visibility_auth_all" on public.portal_visibility_rules for all to authenticated using (true) with check (true);

drop policy if exists "portal_access_anon_all" on public.portal_access_events;
create policy "portal_access_anon_all" on public.portal_access_events for all to anon using (true) with check (true);

drop policy if exists "portal_access_auth_all" on public.portal_access_events;
create policy "portal_access_auth_all" on public.portal_access_events for all to authenticated using (true) with check (true);

drop policy if exists "portal_policies_anon_all" on public.portal_security_policies;
create policy "portal_policies_anon_all" on public.portal_security_policies for all to anon using (true) with check (true);

drop policy if exists "portal_policies_auth_all" on public.portal_security_policies;
create policy "portal_policies_auth_all" on public.portal_security_policies for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.portal_roles to anon, authenticated;
grant select, insert, update, delete on public.portal_module_matrix to anon, authenticated;
grant select, insert, update, delete on public.portal_directory_profiles to anon, authenticated;
grant select, insert, update, delete on public.portal_visibility_rules to anon, authenticated;
grant select, insert, update, delete on public.portal_access_events to anon, authenticated;
grant select, insert, update, delete on public.portal_security_policies to anon, authenticated;

grant usage, select on sequence public.portal_access_events_id_seq to anon, authenticated;
