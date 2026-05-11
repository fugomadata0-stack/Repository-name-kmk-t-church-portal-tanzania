-- Chief Admin + Super Admin: matrix kamili (hakuna nywila / siri hapa).
-- 1) Hakikisha Chief Admin ana role chief_admin kwenye portal_directory_profiles.
-- 2) Unganisha auth_user_id ikiwa akaunti ya Supabase Auth tayari ipo.
-- 3) chief_admin na super_admin: kila module_key (orodha kamili + vilivyopo kwenye DB) — CRUD + vitendo vyote.
--
-- Kanuni: UPSERT tu; hakuna kufuta safu.

-- ——— 1) Wasifu wa Chief Admin ———
insert into public.portal_directory_profiles (email, full_name, role_key, status, notes)
values (
  'fugomadata0@gmail.com',
  'ENOCK FUGO',
  'chief_admin',
  'active',
  'chief_admin — matrix kamili; haijumuishi nywila.'
)
on conflict (email) do update set
  role_key = excluded.role_key,
  full_name = coalesce(public.portal_directory_profiles.full_name, excluded.full_name),
  status = case
    when public.portal_directory_profiles.status = 'suspended' then public.portal_directory_profiles.status
    else excluded.status
  end,
  notes = coalesce(public.portal_directory_profiles.notes, excluded.notes),
  updated_at = now();

-- ——— 2) Unganisha auth.users wakati akaunti ipo ———
update public.portal_directory_profiles p
set
  auth_user_id = u.id,
  updated_at = now()
from auth.users u
where lower(trim(both from p.email)) = lower(trim(both from 'fugomadata0@gmail.com'))
  and lower(trim(both from u.email)) = lower(trim(both from 'fugomadata0@gmail.com'))
  and p.auth_user_id is distinct from u.id;

-- ——— 3) Matrix kamili kwa chief_admin + super_admin ———
-- Safu za kiufundi (communications + urithi wa mawasiliano) pamoja na vilivyomo tayari kwenye jedwali.
with
  known as (
    select unnest(
      array[
        'dashboard', 'developer', 'documents', 'mahubiri', 'events', 'gallery', 'habari',
        'video_library', 'audio_library', 'file_manager', 'live_stream', 'analytics',
        'ai_assistant', 'notifications', 'attendance', 'muundo', 'viongozi', 'waumini',
        'jumuiya', 'taasisi', 'matukio', 'machapisho', 'nyaraka', 'fedha', 'mapato_income',
        'aid_management', 'vyanzo_mapato', 'ripoti', 'communications', 'registration_requests',
        'invite_promote_permissions', 'mipangilio', 'usalama', 'super_admin', 'mawasiliano'
      ]
    ) as module_key
  ),
  mods as (
    select distinct module_key
    from (
      select module_key from known
      union
      select module_key from public.portal_module_matrix
    ) x
  )
insert into public.portal_module_matrix (
  role_key,
  module_key,
  can_view,
  can_create,
  can_edit,
  can_delete,
  can_export,
  can_audit,
  can_approve,
  can_reject,
  can_print,
  can_upload,
  can_download,
  can_manage_settings
)
select
  r.role_key,
  m.module_key,
  true,
  true,
  true,
  true,
  true,
  case
    when m.module_key in ('fedha', 'mipangilio', 'usalama', 'super_admin', 'aid_management') then true
    else false
  end,
  true,
  true,
  true,
  true,
  true,
  true
from mods m
cross join (values ('chief_admin'), ('super_admin')) as r(role_key)
on conflict (role_key, module_key) do update set
  can_view = true,
  can_create = true,
  can_edit = true,
  can_delete = true,
  can_export = true,
  can_audit = case
    when excluded.module_key in ('fedha', 'mipangilio', 'usalama', 'super_admin', 'aid_management') then true
    else greatest(public.portal_module_matrix.can_audit::int, excluded.can_audit::int)::boolean
  end,
  can_approve = true,
  can_reject = true,
  can_print = true,
  can_upload = true,
  can_download = true,
  can_manage_settings = true,
  updated_at = now();

comment on table public.portal_directory_profiles is
  'Watumiaji wa portal. Chief Admin msingi: fugomadata0@gmail.com (chief_admin). Hakuna nywila kwenye DB — Auth ya Supabase pekee.';
