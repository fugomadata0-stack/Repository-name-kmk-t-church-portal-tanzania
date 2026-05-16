-- Linganisha dayosisi, Jimbo la Musoma, Tawi la Makao Makuu, na church_structure_entities
-- na chanzo kimoja (kmktCanonicalContent.ts — taarifa rasmi za KMK(T)).

-- ——— Jedwali la dayosisi ———
update public.dayosisi
set
  jina = 'Dayosisi ya Mara',
  askofu = 'LAMECK NICODEMUS MANJI',
  mkoa = 'Mara',
  ofisi = 'Musoma',
  simu = '0755927252',
  email = 'mennonitekiinjilikmkt@gmail.com',
  updated_at = now()
where lower(trim(code)) = 'mara';

update public.dayosisi
set
  jina = 'Dayosisi ya Mwanza',
  askofu = 'Paulo Petro Chemere',
  mkoa = 'Mwanza',
  ofisi = 'Mwanza',
  simu = '+255700111002',
  email = 'mwanza@kmkt.or.tz',
  updated_at = now()
where lower(trim(code)) = 'mwz';

-- ——— Jimbo / Tawi — Musoma ———
update public.church_jimbo j
set
  mkuu = 'LAMECK NICODEMUS MANJI',
  mkoa = 'Mara',
  simu = '0755927252',
  updated_at = now()
from public.dayosisi d
where j.dayosisi_id = d.id
  and lower(trim(d.code)) = 'mara'
  and lower(trim(j.jina)) = lower('Jimbo la Musoma');

update public.church_tawi t
set
  kiongozi = 'MCH JOHN MUTTANI SEAN',
  simu = '+255783858902',
  updated_at = now()
from public.church_jimbo j
join public.dayosisi d on d.id = j.dayosisi_id
where t.jimbo_id = j.id
  and lower(trim(d.code)) = 'mara'
  and lower(trim(j.jina)) = lower('Jimbo la Musoma')
  and lower(trim(t.jina)) = lower('Tawi la Makao Makuu — Musoma');

-- ——— church_structure_entities (legacy bridge IDs = dayosisi/jimbo/tawi ids) ———
update public.church_structure_entities e
set
  name = trim(d.jina),
  code = trim(d.code),
  region = nullif(trim(d.mkoa), ''),
  district = nullif(trim(coalesce(d.ofisi, '')), ''),
  phone = nullif(trim(d.simu), ''),
  email = nullif(trim(d.email), ''),
  leader_name = nullif(trim(d.askofu), ''),
  official_name = trim(d.jina),
  short_code = trim(d.code),
  updated_at = now()
from public.dayosisi d
where e.id = d.id
  and e.level = 'dayosisi';

update public.church_structure_entities e
set
  name = trim(j.jina),
  region = nullif(trim(j.mkoa), ''),
  phone = nullif(trim(j.simu), ''),
  leader_name = nullif(trim(j.mkuu), ''),
  parent_id = j.dayosisi_id,
  parent_name = trim(ds.jina),
  updated_at = now()
from public.church_jimbo j
join public.dayosisi ds on ds.id = j.dayosisi_id
where e.id = j.id
  and e.level = 'jimbo';

update public.church_structure_entities e
set
  name = trim(t.jina),
  phone = nullif(trim(t.simu), ''),
  leader_name = nullif(trim(t.kiongozi), ''),
  parent_id = t.jimbo_id,
  parent_name = trim(jb.jina),
  updated_at = now()
from public.church_tawi t
join public.church_jimbo jb on jb.id = t.jimbo_id
where e.id = t.id
  and e.level = 'tawi';
