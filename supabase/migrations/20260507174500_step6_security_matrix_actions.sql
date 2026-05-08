-- STEP 6: Extend security matrix for action-level permissions

alter table public.portal_module_matrix
  add column if not exists can_approve boolean not null default false,
  add column if not exists can_reject boolean not null default false,
  add column if not exists can_print boolean not null default false,
  add column if not exists can_upload boolean not null default false,
  add column if not exists can_download boolean not null default false,
  add column if not exists can_manage_settings boolean not null default false;

-- Ensure required roles exist
insert into public.portal_roles (role_key, label_sw, label_en, hierarchy_rank, description, is_system)
values
  ('member_user', 'Mwanachama', 'Member User', 980, 'Mwanachama wa kawaida mwenye ufikiaji mdogo.', false),
  ('editor', 'Mhariri', 'Editor', 820, 'Mhariri wa maudhui ya umma na nyaraka.', false),
  ('dayosisi_admin', 'Msimamizi wa Dayosisi', 'Diocese Admin', 420, 'Usimamizi wa ngazi ya dayosisi.', true),
  ('jimbo_admin', 'Msimamizi wa Jimbo', 'Jimbo Admin', 520, 'Usimamizi wa ngazi ya jimbo.', true),
  ('tawi_admin', 'Msimamizi wa Tawi', 'Branch Admin', 620, 'Usimamizi wa ngazi ya tawi/kituo.', true),
  ('finance_admin', 'Msimamizi wa Fedha', 'Finance Admin', 360, 'Usimamizi wa fedha na mapato.', true),
  ('national_admin', 'Msimamizi wa Taifa', 'National Admin', 250, 'Usimamizi wa kitaifa chini ya super_admin.', true),
  ('viewer', 'Mtazamaji', 'Viewer', 990, 'Mtumiaji wa kusoma pekee.', true),
  ('super_admin', 'Super Admin', 'Super Admin', 1, 'Msimamizi mkuu wa mfumo mzima.', true)
on conflict (role_key) do nothing;
