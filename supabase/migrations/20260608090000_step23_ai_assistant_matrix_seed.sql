-- STEP 23: AI module matrix seed (future AI integrations, no secrets in frontend)

insert into public.portal_module_matrix (
  role_key,
  module_key,
  can_view,
  can_create,
  can_edit,
  can_delete,
  can_export,
  can_audit,
  updated_at
)
values
  ('super_admin', 'ai_assistant', true, true, true, true, true, true, now()),
  ('chief_admin', 'ai_assistant', true, true, true, false, true, false, now()),
  ('national_admin', 'ai_assistant', true, true, true, false, true, false, now()),
  ('office_admin', 'ai_assistant', true, false, false, false, false, false, now()),
  ('finance_admin', 'ai_assistant', true, false, false, false, false, false, now()),
  ('secretary', 'ai_assistant', true, false, false, false, false, false, now()),
  ('approver', 'ai_assistant', false, false, false, false, false, false, now()),
  ('reviewer', 'ai_assistant', false, false, false, false, false, false, now()),
  ('dayosisi_admin', 'ai_assistant', false, false, false, false, false, false, now()),
  ('jimbo_admin', 'ai_assistant', false, false, false, false, false, false, now()),
  ('tawi_admin', 'ai_assistant', false, false, false, false, false, false, now()),
  ('viewer', 'ai_assistant', false, false, false, false, false, false, now())
on conflict (role_key, module_key)
do update set
  can_view = excluded.can_view,
  can_create = excluded.can_create,
  can_edit = excluded.can_edit,
  can_delete = excluded.can_delete,
  can_export = excluded.can_export,
  can_audit = excluded.can_audit,
  updated_at = now();
