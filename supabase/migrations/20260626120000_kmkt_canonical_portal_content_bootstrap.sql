-- Bootstrap / re-sync canonical KMK(T) content (matches app-next/src/data/kmktCanonicalContent.ts)

-- ——— 1) Master settings hub ———
insert into public.portal_master_settings (
  singleton_key,
  official_name,
  short_name,
  motto,
  address,
  phone,
  email,
  website,
  country,
  timezone,
  official_seal_text,
  system_footer
) values (
  'default',
  'KANISA LA MENNONITE LA KIINJILI TANZANIA',
  'KMK(T)',
  'Kuwa na umoja katika imani na huduma',
  'S.L.P 317, MUSOMA — MARA, TANZANIA',
  '0755 927 252',
  'mennonitekiinjilikmkt@gmail.com',
  'https://v0-church-portal-tanzania.vercel.app',
  'Tanzania',
  'Africa/Dar_es_Salaam',
  'KMK(T)',
  'KMK(T) Tanzania · mennonitekiinjilikmkt@gmail.com'
)
on conflict (singleton_key) do update set
  official_name = excluded.official_name,
  short_name = excluded.short_name,
  motto = excluded.motto,
  address = excluded.address,
  phone = excluded.phone,
  email = excluded.email,
  website = excluded.website,
  country = excluded.country,
  timezone = excluded.timezone,
  official_seal_text = excluded.official_seal_text,
  system_footer = excluded.system_footer,
  updated_at = now();

insert into public.portal_theme_settings (
  singleton_key,
  primary_color,
  secondary_color,
  accent_color,
  background_color,
  text_color,
  pdf_header_text,
  excel_header_text,
  print_header_text
) values (
  'default',
  '#0B1F3A',
  '#123C69',
  '#D4AF37',
  '#FFFFFF',
  '#0F172A',
  E'KANISA LA MENNONITE LA KIINJILI TANZANIA\nKMK(T)\nS.L.P 317, MUSOMA — MARA, TANZANIA\nSIMU: 0755 927 252\nEMAIL: mennonitekiinjilikmkt@gmail.com\nTOVUTI: https://v0-church-portal-tanzania.vercel.app',
  'KANISA LA MENNONITE LA KIINJILI TANZANIA (KMK(T))',
  'KANISA LA MENNONITE LA KIINJILI TANZANIA — S.L.P 317, MUSOMA — MARA, TANZANIA'
)
on conflict (singleton_key) do update set
  primary_color = excluded.primary_color,
  secondary_color = excluded.secondary_color,
  accent_color = excluded.accent_color,
  background_color = excluded.background_color,
  text_color = excluded.text_color,
  pdf_header_text = excluded.pdf_header_text,
  excel_header_text = excluded.excel_header_text,
  print_header_text = excluded.print_header_text,
  updated_at = now();

insert into public.portal_template_settings (singleton_key)
values ('default')
on conflict (singleton_key) do nothing;

-- ——— 2) Church identity (enterprise profile) ———
insert into public.church_identity (
  singleton_key,
  official_church_name,
  country,
  headquarters,
  main_phone,
  main_email,
  postal_address,
  website_url,
  vision,
  mission,
  core_values,
  region,
  district,
  whatsapp_url,
  primary_color,
  secondary_color,
  accent_color
) values (
  'default',
  'KANISA LA MENNONITE LA KIINJILI TANZANIA',
  'Tanzania',
  'MUSOMA — MARA',
  '0755927252',
  'mennonitekiinjilikmkt@gmail.com',
  'S.L.P 317, MUSOMA — MARA, TANZANIA',
  'https://v0-church-portal-tanzania.vercel.app',
  'Kuwa kanisa linaloongoza kwa Injili, umoja, na huduma endelevu kwa jamii na taifa.',
  'Kuhubiri Injili, kukuza imani, na kutoa huduma za kiroho na kijamii kupitia muundo wa KMK(T) Tanzania.',
  'Imani · Umoja · Huduma · Uadilifu · Uwajibikaji · Upendo',
  'Mara',
  'Musoma',
  'https://wa.me/255755927252',
  '#0B1F3A',
  '#123C69',
  '#D4AF37'
)
on conflict (singleton_key) do update set
  official_church_name = excluded.official_church_name,
  country = excluded.country,
  headquarters = excluded.headquarters,
  main_phone = excluded.main_phone,
  main_email = excluded.main_email,
  postal_address = excluded.postal_address,
  website_url = excluded.website_url,
  vision = excluded.vision,
  mission = excluded.mission,
  core_values = excluded.core_values,
  region = excluded.region,
  district = excluded.district,
  whatsapp_url = excluded.whatsapp_url,
  primary_color = excluded.primary_color,
  secondary_color = excluded.secondary_color,
  accent_color = excluded.accent_color,
  updated_at = now();

-- ——— 3) About KMKT (published) ———
insert into public.about_kmkt (
  church_name,
  abbreviation,
  motto,
  mission,
  vision,
  core_values,
  history,
  objectives,
  headquarters,
  contacts,
  leadership_message,
  bible_verse,
  status,
  published
)
select
  'KANISA LA MENNONITE LA KIINJILI TANZANIA',
  'KMK(T)',
  'Kuwa na umoja katika imani na huduma',
  'Kuhubiri Injili, kukuza imani, na kutoa huduma za kiroho na kijamii kupitia muundo wa KMK(T) Tanzania.',
  'Kuwa kanisa linaloongoza kwa Injili, umoja, na huduma endelevu kwa jamii na taifa.',
  'Imani · Umoja · Huduma · Uadilifu · Uwajibikaji · Upendo',
  'Kanisa la Mennonite la Kiinjili Tanzania (KMK(T)) ni taasisi ya Kikristo inayohudumia jamii kupitia ushuhuda wa Injili, uongozi wa kitaifa, na muundo wa dayosisi, jimbo, na makanisa.',
  'Kuimarisha ushirika wa imani, kuendesha uongozi wenye uwajibikaji, na kuwezesha huduma za kiroho, elimu, na jamii.',
  'MUSOMA — MARA',
  E'Simu: 0755 927 252\nBarua pepe: mennonitekiinjilikmkt@gmail.com\nWhatsApp: 0755927252',
  'Tunakaribisha waumini, viongozi, na washirika katika huduma ya pamoja ya KMK(T) Tanzania.',
  'Mathayo 28:19-20',
  'active',
  true
where not exists (select 1 from public.about_kmkt limit 1);

update public.about_kmkt
set
  church_name = coalesce(nullif(trim(church_name), ''), 'KANISA LA MENNONITE LA KIINJILI TANZANIA'),
  abbreviation = coalesce(nullif(trim(abbreviation), ''), 'KMK(T)'),
  motto = coalesce(nullif(trim(motto), ''), 'Kuwa na umoja katika imani na huduma'),
  mission = coalesce(nullif(trim(mission), ''), 'Kuhubiri Injili, kukuza imani, na kutoa huduma za kiroho na kijamii kupitia muundo wa KMK(T) Tanzania.'),
  vision = coalesce(nullif(trim(vision), ''), 'Kuwa kanisa linaloongoza kwa Injili, umoja, na huduma endelevu kwa jamii na taifa.'),
  core_values = coalesce(nullif(trim(core_values), ''), 'Imani · Umoja · Huduma · Uadilifu · Uwajibikaji · Upendo'),
  history = coalesce(nullif(trim(history), ''), 'Kanisa la Mennonite la Kiinjili Tanzania (KMK(T)) ni taasisi ya Kikristo inayohudumia jamii kupitia ushuhuda wa Injili, uongozi wa kitaifa, na muundo wa dayosisi, jimbo, na makanisa.'),
  objectives = coalesce(nullif(trim(objectives), ''), 'Kuimarisha ushirika wa imani, kuendesha uongozi wenye uwajibikaji, na kuwezesha huduma za kiroho, elimu, na jamii.'),
  headquarters = coalesce(nullif(trim(headquarters), ''), 'MUSOMA — MARA'),
  contacts = coalesce(nullif(trim(contacts), ''), E'Simu: 0755 927 252\nBarua pepe: mennonitekiinjilikmkt@gmail.com\nWhatsApp: 0755927252'),
  leadership_message = coalesce(nullif(trim(leadership_message), ''), 'Tunakaribisha waumini, viongozi, na washirika katika huduma ya pamoja ya KMK(T) Tanzania.'),
  bible_verse = coalesce(nullif(trim(bible_verse), ''), 'Mathayo 28:19-20'),
  status = 'active',
  published = true,
  updated_at = now()
where true;

-- ——— 4) Site settings row (ensure exists) ———
insert into public.site_settings (id)
select gen_random_uuid()
where not exists (select 1 from public.site_settings limit 1);

-- ——— 5) National leadership (re-sync) ———
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
  ('askofu_mkuu', 'ASKOFU MKUU WA KMK(T)', 'Presiding Bishop', 'LAMECK NICODEMUS MANJI', '0755927252', '0755927252', 'manjikmkt@gmail.com', 'Kiongozi rasmi wa kitaifa wa KMK(T).', 'Huduma na uongozi wa KMK(T) Tanzania.', 1, 'active', true),
  ('katibu_mkuu', 'KATIBU MKUU WA KMK(T)', 'General Secretary', 'MCH JOHN MUTTANI SEAN', '+255783858902', '+255783858902', 'seankmkt@gmail.com', 'Kiongozi rasmi wa kitaifa wa KMK(T).', 'Huduma na uongozi wa KMK(T) Tanzania.', 2, 'active', true),
  ('naibu_katibu_mkuu', 'NAIBU KATIBU MKUU WA KMK(T)', 'Deputy General Secretary', 'Zakaria Rukonge Bunini', '0743979707', '0743979707', 'buninikmkt@gmail.com', 'Kiongozi rasmi wa kitaifa wa KMK(T).', 'Huduma na uongozi wa KMK(T) Tanzania.', 3, 'active', true),
  ('mhasibu_mkuu', 'MHASIBU MKUU WA KMK(T)', 'Chief Accountant / Treasurer', 'MCH SOSPITER MASAMAKI CHANGURU', '0784775746', '0784775746', 'changurukmkt@gmail.com', 'Kiongozi rasmi wa kitaifa wa KMK(T).', 'Huduma na uongozi wa KMK(T) Tanzania.', 4, 'active', true)
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

alter table public.church_viongozi disable trigger trg_kmkt_guard_official_leadership_upd;

update public.church_viongozi set email = 'manjikmkt@gmail.com', updated_at = now() where official_lock_key = 'kmkt_official_askofu_mkuu';
update public.church_viongozi set email = 'seankmkt@gmail.com', updated_at = now() where official_lock_key = 'kmkt_official_katibu_mkuu';
update public.church_viongozi set email = 'buninikmkt@gmail.com', updated_at = now() where official_lock_key = 'kmkt_official_naibu_katibu_mkuu';
update public.church_viongozi set email = 'changurukmkt@gmail.com', updated_at = now() where official_lock_key = 'kmkt_official_mhasibu';

alter table public.church_viongozi enable trigger trg_kmkt_guard_official_leadership_upd;
