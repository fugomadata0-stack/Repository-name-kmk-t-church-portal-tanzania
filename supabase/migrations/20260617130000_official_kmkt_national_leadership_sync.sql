-- Synchronization: canonical KMK(T) national leadership in national_leadership_profiles + church_viongozi contacts.
-- Fixes empty names in UI/PDF when legacy church_identity migration had nothing to copy.
-- Unlocks national_leadership_profiles writes for any role with mipangilio.edit (matrix), not only chief/super JWT.

-- ——— 1) national_leadership_profiles — rekodi rasmi nne (UPSERT) ———
insert into public.national_leadership_profiles (
  role_key,
  display_title_sw,
  display_title_en,
  full_name,
  phone,
  whatsapp,
  email,
  biography,
  leadership_quote,
  sort_order,
  status,
  is_visible
) values
  (
    'askofu_mkuu',
    'ASKOFU MKUU WA KMK(T)',
    'Presiding Bishop',
    'LAMECK NICODEMUS MANJI',
    '0755927252',
    '0755927252',
    'manjikmkt@gmail.com',
    'Kiongozi rasmi wa kitaifa wa KMK(T).',
    'Huduma na uongozi wa KMK(T) Tanzania.',
    1,
    'active',
    true
  ),
  (
    'katibu_mkuu',
    'KATIBU MKUU WA KMK(T)',
    'General Secretary',
    'MCH JOHN MUTTANI SEAN',
    '+255783858902',
    '+255783858902',
    'seankmkt@gmail.com',
    'Kiongozi rasmi wa kitaifa wa KMK(T).',
    'Huduma na uongozi wa KMK(T) Tanzania.',
    2,
    'active',
    true
  ),
  (
    'naibu_katibu_mkuu',
    'NAIBU KATIBU MKUU WA KMK(T)',
    'Deputy General Secretary',
    'Zakaria Rukonge Bunini',
    '0743979707',
    '0743979707',
    'buninikmkt@gmail.com',
    'Kiongozi rasmi wa kitaifa wa KMK(T).',
    'Huduma na uongozi wa KMK(T) Tanzania.',
    3,
    'active',
    true
  ),
  (
    'mhasibu_mkuu',
    'MHASIBU MKUU WA KMK(T)',
    'Chief Accountant / Treasurer',
    'MCH SOSPITER MASAMAKI CHANGURU',
    '0784775746',
    '0784775746',
    'changurukmkt@gmail.com',
    'Kiongozi rasmi wa kitaifa wa KMK(T).',
    'Huduma na uongozi wa KMK(T) Tanzania.',
    4,
    'active',
    true
  )
on conflict (role_key) do update set
  display_title_sw = excluded.display_title_sw,
  display_title_en = excluded.display_title_en,
  full_name = excluded.full_name,
  phone = excluded.phone,
  whatsapp = excluded.whatsapp,
  email = excluded.email,
  biography = excluded.biography,
  leadership_quote = excluded.leadership_quote,
  sort_order = excluded.sort_order,
  status = excluded.status,
  is_visible = excluded.is_visible,
  updated_at = now();

-- ——— 2) church_viongozi — barua pepe rasmi (zilikuwa null; trigger ya lock inazuia UPDATE bila disable) ———
alter table public.church_viongozi disable trigger trg_kmkt_guard_official_leadership_upd;

update public.church_viongozi
set email = 'manjikmkt@gmail.com', updated_at = now()
where official_lock_key = 'kmkt_official_askofu_mkuu';

update public.church_viongozi
set email = 'seankmkt@gmail.com', updated_at = now()
where official_lock_key = 'kmkt_official_katibu_mkuu';

update public.church_viongozi
set email = 'buninikmkt@gmail.com', updated_at = now()
where official_lock_key = 'kmkt_official_naibu_katibu_mkuu';

update public.church_viongozi
set email = 'changurukmkt@gmail.com', updated_at = now()
where official_lock_key = 'kmkt_official_mhasibu';

alter table public.church_viongozi enable trigger trg_kmkt_guard_official_leadership_upd;

-- ——— 3) RLS national_leadership_profiles — mipangilio.edit (matrix) au JWT chief/super ———
drop policy if exists national_leadership_insert_admin on public.national_leadership_profiles;
drop policy if exists national_leadership_update_admin on public.national_leadership_profiles;
drop policy if exists national_leadership_delete_admin on public.national_leadership_profiles;

create policy national_leadership_insert_rbac
on public.national_leadership_profiles
for insert
to authenticated
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('chief_admin', 'super_admin')
  or public.portal_has_module_capability('mipangilio', 'edit')
);

create policy national_leadership_update_rbac
on public.national_leadership_profiles
for update
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('chief_admin', 'super_admin')
  or public.portal_has_module_capability('mipangilio', 'edit')
)
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('chief_admin', 'super_admin')
  or public.portal_has_module_capability('mipangilio', 'edit')
);

create policy national_leadership_delete_rbac
on public.national_leadership_profiles
for delete
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('chief_admin', 'super_admin')
  or public.portal_has_module_capability('mipangilio', 'delete')
);
