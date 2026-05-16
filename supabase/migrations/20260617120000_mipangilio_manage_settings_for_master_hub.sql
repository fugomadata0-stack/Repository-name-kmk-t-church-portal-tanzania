-- Kituo cha mipangilio mikuu (MasterSettingsCenterPanel) kinahitisha can_edit NA can_manage_settings
-- kwenye safu ya portal_module_matrix ya module_key = 'mipangilio'.
-- Baada ya 20260507174500 (can_manage_settings default false), migrations 20260609150000 na 20260610100000
-- ziliwasha can_manage_settings kwa chief_admin/super_admin tu. national_admin, office_admin, n.k.
-- walibaki na can_edit=true lakini can_manage_settings=false — UI inaonyesha "Huna ruhusa ya kubadilisha".

update public.portal_module_matrix
set
  can_manage_settings = true,
  updated_at = now()
where module_key = 'mipangilio'
  and coalesce(can_edit, false) = true
  and coalesce(can_manage_settings, false) = false;
