-- Mfumo wa Role: "view all, edit assigned scope only"
--
-- 1) Pia chief_admin atakuwa fugomadata0@gmail.com (anateua wengine vyeo).
-- 2) *_admin (national/dayosisi/jimbo/tawi) wapate can_view = true kwa moduli zote za data
--    (waumini, viongozi, muundo, jumuiya, taasisi, matukio, machapisho, nyaraka, fedha,
--     mapato_income, vyanzo_mapato, ripoti, mawasiliano, aid_management, communications,
--     analytics, n.k.) — bila kufungua can_create/can_edit/can_delete (RLS ya scope itadhibiti).
-- 3) Watumiaji `usalama` na `super_admin` (moduli) zinabaki kufungwa kwa wasimamizi wa juu tu.
--
-- Kanuni:
--   * Hakuna kufuta safu — UPSERT tu (idempotent).
--   * Hakuna kuongeza ruhusa za uandishi nje ya scope.

-- ——— TASK 1: chief_admin seed: fugomadata0@gmail.com ———
-- Insert (au update kwa role + status) — auth_user_id huunganishwa mara ya kwanza atakapoingia
-- kupitia logic iliyopo kwenye PortalContext.tsx (loadPortalAccess) baada ya kuthibitisha barua pepe.

insert into public.portal_directory_profiles (email, full_name, role_key, status, notes)
values (
  'fugomadata0@gmail.com',
  'ENOCK FUGO',
  'chief_admin',
  'active',
  'Mkuu wa Utawala (chief_admin) — anateua vyeo kwa watumiaji wengine. Auto-linked kwa auth.users baada ya kuingia.'
)
on conflict (email) do update set
  role_key = excluded.role_key,
  full_name = coalesce(public.portal_directory_profiles.full_name, excluded.full_name),
  status = case
             when public.portal_directory_profiles.status in ('suspended') then public.portal_directory_profiles.status
             else excluded.status
           end,
  notes = coalesce(public.portal_directory_profiles.notes, excluded.notes),
  updated_at = now();

-- ——— TASK 2: panua can_view kwa national_admin (moduli za data, si usalama wala super_admin) ———
do $$
declare
  view_modules text[] := array[
    'dashboard', 'developer', 'documents', 'mahubiri',
    'events', 'gallery', 'habari', 'video_library', 'audio_library',
    'file_manager', 'live_stream', 'analytics', 'ai_assistant', 'notifications',
    'attendance', 'muundo', 'viongozi', 'waumini', 'jumuiya', 'taasisi',
    'matukio', 'machapisho', 'nyaraka', 'fedha', 'mapato_income', 'vyanzo_mapato',
    'ripoti', 'mawasiliano', 'communications', 'aid_management',
    'mipangilio', 'registration_requests', 'invite_promote_permissions'
  ];
begin
  -- national_admin: can_view kwa moduli zote za data (mawasiliano + communications zote)
  insert into public.portal_module_matrix (
    role_key, module_key, can_view, can_create, can_edit, can_delete, can_export, can_audit
  )
  select 'national_admin', m, true, false, false, false, true, false
  from unnest(view_modules) as m
  on conflict (role_key, module_key) do update set
    can_view = true,
    can_export = greatest(public.portal_module_matrix.can_export::int, 1)::boolean,
    updated_at = now();

  -- dayosisi_admin: can_view kwa moduli zote za data
  insert into public.portal_module_matrix (
    role_key, module_key, can_view, can_create, can_edit, can_delete, can_export, can_audit
  )
  select 'dayosisi_admin', m, true, false, false, false, true, false
  from unnest(view_modules) as m
  on conflict (role_key, module_key) do update set
    can_view = true,
    can_export = greatest(public.portal_module_matrix.can_export::int, 1)::boolean,
    updated_at = now();

  -- jimbo_admin: can_view kwa moduli zote za data
  insert into public.portal_module_matrix (
    role_key, module_key, can_view, can_create, can_edit, can_delete, can_export, can_audit
  )
  select 'jimbo_admin', m, true, false, false, false, true, false
  from unnest(view_modules) as m
  on conflict (role_key, module_key) do update set
    can_view = true,
    can_export = greatest(public.portal_module_matrix.can_export::int, 1)::boolean,
    updated_at = now();

  -- tawi_admin: can_view kwa moduli zote za data
  insert into public.portal_module_matrix (
    role_key, module_key, can_view, can_create, can_edit, can_delete, can_export, can_audit
  )
  select 'tawi_admin', m, true, false, false, false, true, false
  from unnest(view_modules) as m
  on conflict (role_key, module_key) do update set
    can_view = true,
    can_export = greatest(public.portal_module_matrix.can_export::int, 1)::boolean,
    updated_at = now();
end;
$$;

-- ——— TASK 3: chief_admin + super_admin — ufikiaji KAMILI kwa moduli zote (action-level) ———
-- Step 6 (20260507174500_step6_security_matrix_actions.sql) iliongeza safu:
--   can_approve, can_reject, can_print, can_upload, can_download, can_manage_settings
-- (zote default = false). Tunahakikisha chief_admin na super_admin wana TRUE kwa hizi
-- pia kwa kila moduli ambayo wana can_view = true. Hivyo: kuidhinisha/kukataa/kuchapisha/
-- kupakia/kupakua/kuhariri mipangilio — vyote vimewashwa.
update public.portal_module_matrix
set
  can_approve = true,
  can_reject = true,
  can_print = true,
  can_upload = true,
  can_download = true,
  can_manage_settings = true,
  updated_at = now()
where role_key in ('super_admin', 'chief_admin')
  and can_view = true;

-- ——— TASK 4: maelezo ya muundo wa role kwenye DB ———
comment on table public.portal_directory_profiles is
  'Watumiaji wa portal. chief_admin (fugomadata0@gmail.com) anateua role + scope. RBAC matrix + scope geo helpers vinaongoza ufikiaji.';

comment on table public.portal_module_matrix is
  'Matrix ya RBAC kwa role × module. chief_admin/super_admin wana actions zote (approve/reject/print/upload/download/manage_settings) kwa moduli zote walizonazo can_view. *_admin roles zina can_view = true kote (data modules); can_edit/create/delete zinathibitishwa pia na portal_scope_geo_write_allowed (RLS).';
