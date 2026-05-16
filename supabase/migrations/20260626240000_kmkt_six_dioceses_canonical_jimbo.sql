-- Orodha rasmi: dayosisi 6, uongozi kamili, majimbo (Mara 11, Mwanza 19, Bunda 8).
-- Chanzo cha msimbo: app-next/src/data/kmktSixDayosisiCanonical.ts

alter table public.dayosisi
  add column if not exists makamu_mwenyekiti text not null default '',
  add column if not exists katibu text not null default '',
  add column if not exists naibu_katibu text not null default '',
  add column if not exists mhasibu text not null default '';

-- Dayosisi mpya (ikiwa hazipo)
insert into public.dayosisi (code, jina, askofu, mkoa, ofisi, simu, email, makamu_mwenyekiti, katibu, naibu_katibu, mhasibu, maelezo, status)
select 'BUNDA', 'Dayosisi ya Bunda', 'Simoni Masare Mtatiro', 'Mara', 'Bunda', '', '',
  'Ladhameni Bulenga Maendeka', 'Arstaliko Lazaro', 'Jumapili Mauka', 'MCH Sospiter Masamaki Changuru', '', 'active'
where not exists (select 1 from public.dayosisi where lower(trim(code)) = 'bunda');

insert into public.dayosisi (code, jina, askofu, mkoa, ofisi, simu, email, makamu_mwenyekiti, katibu, naibu_katibu, mhasibu, maelezo, status)
select 'DODOMA', 'Dayosisi ya Dodoma', 'Godwill Paslotus Maregesi', 'Dodoma', 'Dodoma', '', '',
  'Hakuna kwa sasa', 'Abiudi Michael Matara', 'Bado hajatajwa', 'Bado hajatajwa',
  'Majimbo bado yanaendelea kusajiliwa kwenye mfumo.', 'active'
where not exists (select 1 from public.dayosisi where lower(trim(code)) = 'dodoma');

insert into public.dayosisi (code, jina, askofu, mkoa, ofisi, simu, email, makamu_mwenyekiti, katibu, naibu_katibu, mhasibu, maelezo, status)
select 'DAR', 'Dayosisi ya Dar es Salaam', 'Yeremia Mawawa Magomba', 'Dar es Salaam', 'Dar es Salaam', '', '',
  'Yuda Bwire Chikumbiro', 'Maregesi Stephano Ndaro', 'Mtipa Nashoni Mswaga', 'Maarifa Benjamini Wafurungu',
  'Majimbo bado yanaendelea kusajiliwa kwenye mfumo.', 'active'
where not exists (select 1 from public.dayosisi where lower(trim(code)) = 'dar');

insert into public.dayosisi (code, jina, askofu, mkoa, ofisi, simu, email, makamu_mwenyekiti, katibu, naibu_katibu, mhasibu, maelezo, status)
select 'KIGOMA', 'Dayosisi ya Kigoma', 'Samsoni Makuri Wairaro', 'Kigoma', 'Kigoma', '', '',
  'Jackson Makiriro', 'Bado hajatajwa', 'Bado hajatajwa', 'Bado hajatajwa',
  'Majimbo bado yanaendelea kusajiliwa kwenye mfumo.', 'active'
where not exists (select 1 from public.dayosisi where lower(trim(code)) = 'kigoma');

-- Sasisha uongozi (zote 6)
update public.dayosisi set
  jina = 'Dayosisi ya Mara',
  askofu = 'Lameck Nicodemus Manji',
  mkoa = 'Mara', ofisi = 'Musoma', simu = '0755927252', email = 'mennonitekiinjilikmkt@gmail.com',
  makamu_mwenyekiti = 'Boaz Maingu Nyeura', katibu = 'Lameck Barnabas Musema',
  naibu_katibu = 'Emmanuel Mutani Yebete', mhasibu = 'Makunja Jastus Magoro', maelezo = '', updated_at = now()
where lower(trim(code)) = 'mara';

update public.dayosisi set
  jina = 'Dayosisi ya Mwanza',
  askofu = 'Paulo Petro Chemere',
  mkoa = 'Mwanza', ofisi = 'Mwanza', simu = '+255700111002', email = 'mwanza@kmkt.or.tz',
  makamu_mwenyekiti = 'Alex Semba Ekokoro', katibu = 'Mathias Meja Masami',
  naibu_katibu = 'Stanslaus Chacha Maguri', mhasibu = 'Sadock Manyama', maelezo = '', updated_at = now()
where lower(trim(code)) = 'mwz';

update public.dayosisi set
  jina = 'Dayosisi ya Bunda',
  askofu = 'Simoni Masare Mtatiro',
  mkoa = 'Mara', ofisi = 'Bunda',
  makamu_mwenyekiti = 'Ladhameni Bulenga Maendeka', katibu = 'Arstaliko Lazaro',
  naibu_katibu = 'Jumapili Mauka', mhasibu = 'MCH Sospiter Masamaki Changuru', maelezo = '', updated_at = now()
where lower(trim(code)) = 'bunda';

update public.dayosisi set
  jina = 'Dayosisi ya Dodoma',
  askofu = 'Godwill Paslotus Maregesi',
  mkoa = 'Dodoma', ofisi = 'Dodoma',
  makamu_mwenyekiti = 'Hakuna kwa sasa', katibu = 'Abiudi Michael Matara',
  naibu_katibu = 'Bado hajatajwa', mhasibu = 'Bado hajatajwa',
  maelezo = 'Majimbo bado yanaendelea kusajiliwa kwenye mfumo.', updated_at = now()
where lower(trim(code)) = 'dodoma';

update public.dayosisi set
  jina = 'Dayosisi ya Dar es Salaam',
  askofu = 'Yeremia Mawawa Magomba',
  mkoa = 'Dar es Salaam', ofisi = 'Dar es Salaam',
  makamu_mwenyekiti = 'Yuda Bwire Chikumbiro', katibu = 'Maregesi Stephano Ndaro',
  naibu_katibu = 'Mtipa Nashoni Mswaga', mhasibu = 'Maarifa Benjamini Wafurungu',
  maelezo = 'Majimbo bado yanaendelea kusajiliwa kwenye mfumo.', updated_at = now()
where lower(trim(code)) = 'dar';

update public.dayosisi set
  jina = 'Dayosisi ya Kigoma',
  askofu = 'Samsoni Makuri Wairaro',
  mkoa = 'Kigoma', ofisi = 'Kigoma',
  makamu_mwenyekiti = 'Jackson Makiriro', katibu = 'Bado hajatajwa',
  naibu_katibu = 'Bado hajatajwa', mhasibu = 'Bado hajatajwa',
  maelezo = 'Majimbo bado yanaendelea kusajiliwa kwenye mfumo.', updated_at = now()
where lower(trim(code)) = 'kigoma';

-- Majimbo rasmi (idempotent)
insert into public.church_jimbo (dayosisi_id, jina, mkuu, mkoa, simu, status)
select d.id, v.jina, '', v.mkoa, '', 'active'
from public.dayosisi d
join (values
  ('mara', 'Jimbo la Saragana', 'Mara'),
  ('mara', 'Jimbo la Wanyere', 'Mara'),
  ('mara', 'Jimbo la Murangi', 'Mara'),
  ('mara', 'Jimbo la Mgango', 'Mara'),
  ('mara', 'Jimbo la Kwikerege', 'Mara'),
  ('mara', 'Jimbo la Mtiro', 'Mara'),
  ('mara', 'Jimbo la Kiabakari', 'Mara'),
  ('mara', 'Jimbo la Musoma Kusini', 'Mara'),
  ('mara', 'Jimbo la Musoma Kaskazini', 'Mara'),
  ('mara', 'Jimbo la Busumi', 'Mara'),
  ('mara', 'Jimbo la Nyakatende', 'Mara'),
  ('mwz', 'Jimbo la Nkuyu', 'Mwanza'),
  ('mwz', 'Jimbo la Mhunze', 'Mwanza'),
  ('mwz', 'Jimbo la Itilima', 'Mwanza'),
  ('mwz', 'Jimbo la Budalabujiga', 'Mwanza'),
  ('mwz', 'Jimbo la Bariadi', 'Mwanza'),
  ('mwz', 'Jimbo la Lamadi', 'Mwanza'),
  ('mwz', 'Jimbo la Nassa', 'Mwanza'),
  ('mwz', 'Jimbo la Busega', 'Mwanza'),
  ('mwz', 'Jimbo la Manara', 'Mwanza'),
  ('mwz', 'Jimbo la Igoma', 'Mwanza'),
  ('mwz', 'Jimbo la Nyagezi', 'Mwanza'),
  ('mwz', 'Jimbo la Igombe', 'Mwanza'),
  ('mwz', 'Jimbo la Nyasaka', 'Mwanza'),
  ('mwz', 'Jimbo la Geita', 'Mwanza'),
  ('mwz', 'Jimbo la Kayenze', 'Mwanza'),
  ('mwz', 'Jimbo la Kagu', 'Mwanza'),
  ('mwz', 'Jimbo la Senga', 'Mwanza'),
  ('mwz', 'Jimbo la Misungwi', 'Mwanza'),
  ('mwz', 'Jimbo la Katoro', 'Mwanza'),
  ('bunda', 'Jimbo la Ukerewe', 'Mara'),
  ('bunda', 'Jimbo la Kisorya', 'Mara'),
  ('bunda', 'Jimbo la Kibara', 'Mara'),
  ('bunda', 'Jimbo la Butimba', 'Mara'),
  ('bunda', 'Jimbo la Kwiramba', 'Mara'),
  ('bunda', 'Jimbo la Bunda', 'Mara'),
  ('bunda', 'Jimbo la Kung''ombe', 'Mara'),
  ('bunda', 'Jimbo la Mugumu', 'Mara')
) as v(code, jina, mkoa) on lower(trim(d.code)) = v.code
where not exists (
  select 1 from public.church_jimbo j
  where j.dayosisi_id = d.id and lower(trim(j.jina)) = lower(trim(v.jina))
);

-- Hamisha tawi la makao makuu kwenda Jimbo la Musoma Kusini
update public.church_tawi t
set jimbo_id = j_new.id, updated_at = now()
from public.church_jimbo j_old
join public.dayosisi d on d.id = j_old.dayosisi_id
join public.church_jimbo j_new on j_new.dayosisi_id = d.id and lower(trim(j_new.jina)) = lower('Jimbo la Musoma Kusini')
where t.jimbo_id = j_old.id
  and lower(trim(d.code)) = 'mara'
  and lower(trim(j_old.jina)) = lower('Jimbo la Musoma')
  and lower(trim(t.jina)) = lower('Tawi la Makao Makuu — Musoma');

update public.church_families set jimbo_name = 'Jimbo la Musoma Kusini', updated_at = now()
where lower(trim(jimbo_name)) = lower('Jimbo la Musoma');

update public.church_jimbo set status = 'inactive', updated_at = now()
where lower(trim(jina)) in (lower('Jimbo la Mfano'), lower('Jimbo la Musoma'));

update public.church_tawi set status = 'inactive', updated_at = now()
where lower(trim(jina)) = lower('Tawi la Mfano — Muundo');

update public.church_structure_entities e set
  name = trim(d.jina),
  code = trim(d.code),
  region = nullif(trim(d.mkoa), ''),
  district = nullif(trim(coalesce(d.ofisi, '')), ''),
  phone = nullif(trim(d.simu), ''),
  email = nullif(trim(d.email), ''),
  leader_name = nullif(trim(d.askofu), ''),
  assistant_leaders = nullif(trim(d.makamu_mwenyekiti), ''),
  secretary_name = nullif(trim(d.katibu), ''),
  treasurer_name = nullif(trim(d.mhasibu), ''),
  notes = case when length(trim(coalesce(d.naibu_katibu, ''))) > 0 then 'Naibu katibu: ' || trim(d.naibu_katibu) end,
  description = nullif(trim(d.maelezo), ''),
  official_name = trim(d.jina),
  short_code = trim(d.code),
  updated_at = now()
from public.dayosisi d
where e.id = d.id and e.level = 'dayosisi';

insert into public.church_structure_entities (
  id, name, code, level, parent_id, parent_name, region, district, phone, email,
  leader_name, assistant_leaders, secretary_name, treasurer_name, notes, description,
  status, official_name, short_code, attachment_urls, custom_fields, category_tags, created_at, updated_at
)
select
  d.id, trim(d.jina), trim(d.code), 'dayosisi',
  (select c.id from public.church_structure_entities c where c.level = 'kmkt' and c.status in ('active', 'pending') order by c.created_at asc limit 1),
  (select c.name from public.church_structure_entities c where c.level = 'kmkt' and c.status in ('active', 'pending') order by c.created_at asc limit 1),
  nullif(trim(d.mkoa), ''), nullif(trim(coalesce(d.ofisi, '')), ''),
  nullif(trim(d.simu), ''), nullif(trim(d.email), ''),
  nullif(trim(d.askofu), ''), nullif(trim(d.makamu_mwenyekiti), ''),
  nullif(trim(d.katibu), ''), nullif(trim(d.mhasibu), ''),
  case when length(trim(coalesce(d.naibu_katibu, ''))) > 0 then 'Naibu katibu: ' || trim(d.naibu_katibu) end,
  nullif(trim(d.maelezo), ''),
  case lower(trim(coalesce(d.status, 'active'))) when 'inactive' then 'inactive' when 'archived' then 'archived' else 'active' end,
  trim(d.jina), trim(d.code), '[]'::jsonb,
  jsonb_build_object('source', 'kmkt_six_dioceses'), '{}'::text[], now(), now()
from public.dayosisi d
where not exists (select 1 from public.church_structure_entities e where e.id = d.id)
on conflict (id) do nothing;

insert into public.church_structure_entities (
  id, name, code, level, parent_id, parent_name, region, phone, leader_name, status,
  official_name, short_code, description, attachment_urls, custom_fields, category_tags, created_at, updated_at
)
select
  j.id, trim(j.jina), 'JIM-' || replace(j.id::text, '-', ''), 'jimbo',
  j.dayosisi_id, trim(ds.jina), nullif(trim(j.mkoa), ''), nullif(trim(j.simu), ''),
  nullif(trim(j.mkuu), ''),
  case when j.status = 'inactive' then 'inactive' else 'active' end,
  trim(j.jina), 'JIM-' || replace(j.id::text, '-', ''),
  'Orodha rasmi ya majimbo — KMK(T).', '[]'::jsonb,
  jsonb_build_object('source', 'kmkt_six_dioceses'), '{}'::text[], now(), now()
from public.church_jimbo j
join public.dayosisi ds on ds.id = j.dayosisi_id
where not exists (select 1 from public.church_structure_entities e where e.id = j.id)
on conflict (id) do update set
  name = excluded.name,
  parent_id = excluded.parent_id,
  parent_name = excluded.parent_name,
  region = excluded.region,
  phone = excluded.phone,
  leader_name = excluded.leader_name,
  status = excluded.status,
  official_name = excluded.official_name,
  short_code = excluded.short_code,
  description = excluded.description,
  updated_at = excluded.updated_at;

update public.church_structure_entities e set
  parent_name = trim(jb.jina),
  updated_at = now()
from public.church_tawi t
join public.church_jimbo jb on jb.id = t.jimbo_id
where e.id = t.id and e.level = 'tawi';
