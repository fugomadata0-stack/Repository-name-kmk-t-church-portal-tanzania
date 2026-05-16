-- Viongozi wa muundo: hakikisha church_structure_entities, kisha ongeza viongozi.

-- Sync jimbo/tawi → entities (kama bridge haijafanya)
insert into public.church_structure_entities (
  id, name, code, level, parent_id, parent_name, region, phone, description, leader_name, status, official_name, short_code
)
select
  j.id,
  trim(j.jina),
  'JIM-' || replace(j.id::text, '-', ''),
  'jimbo',
  j.dayosisi_id,
  trim(ds.jina),
  nullif(trim(j.mkoa), ''),
  nullif(trim(j.simu), ''),
  'Jimbo — KMK(T).',
  nullif(trim(j.mkuu), ''),
  'active',
  trim(j.jina),
  'JIM-' || replace(j.id::text, '-', '')
from public.church_jimbo j
join public.dayosisi ds on ds.id = j.dayosisi_id
where lower(trim(j.jina)) = lower('Jimbo la Musoma')
on conflict (id) do update set
  name = excluded.name,
  leader_name = excluded.leader_name,
  phone = excluded.phone,
  updated_at = now();

insert into public.church_structure_entities (
  id, name, code, level, parent_id, parent_name, phone, description, leader_name, status, official_name, short_code, entity_type
)
select
  t.id,
  trim(t.jina),
  'TAW-' || replace(t.id::text, '-', ''),
  'tawi',
  t.jimbo_id,
  trim(j.jina),
  nullif(trim(t.simu), ''),
  'Tawi — KMK(T).',
  nullif(trim(t.kiongozi), ''),
  'active',
  trim(t.jina),
  'TAW-' || replace(t.id::text, '-', ''),
  nullif(trim(t.aina), 'Tawi')
from public.church_tawi t
join public.church_jimbo j on j.id = t.jimbo_id
where lower(trim(t.jina)) = lower('Tawi la Makao Makuu — Musoma')
on conflict (id) do update set
  name = excluded.name,
  leader_name = excluded.leader_name,
  phone = excluded.phone,
  updated_at = now();

do $$
declare
  base text := 'https://tjtsrirwdssocaplsfql.supabase.co/storage/v1/object/public/site-assets';
  v_jimbo uuid;
  v_tawi uuid;
begin
  select e.id into v_jimbo
  from public.church_structure_entities e
  join public.church_jimbo j on j.id = e.id
  where lower(trim(j.jina)) = lower('Jimbo la Musoma')
  limit 1;

  select e.id into v_tawi
  from public.church_structure_entities e
  join public.church_tawi t on t.id = e.id
  where lower(trim(t.jina)) = lower('Tawi la Makao Makuu — Musoma')
  limit 1;

  if v_jimbo is not null then
    insert into public.church_structure_leaders (
      entity_id, position_title, leadership_category, full_name, phone, email, photo_url, status, sort_order
    )
    select
      v_jimbo,
      'Mkuu wa Jimbo',
      'Jimbo',
      'LAMECK NICODEMUS MANJI',
      '0755927252',
      'manjikmkt@gmail.com',
      base || '/about/national/askofu_mkuu.svg',
      'active',
      1
    where not exists (
      select 1 from public.church_structure_leaders l
      where l.entity_id = v_jimbo and lower(trim(l.position_title)) = lower('Mkuu wa Jimbo')
    );
  end if;

  if v_tawi is not null then
    insert into public.church_structure_leaders (
      entity_id, position_title, leadership_category, full_name, phone, email, photo_url, status, sort_order
    )
    select
      v_tawi,
      'Kiongozi wa Tawi',
      'Tawi',
      'MCH JOHN MUTTANI SEAN',
      '+255783858902',
      'seankmkt@gmail.com',
      base || '/about/national/katibu_mkuu.svg',
      'active',
      1
    where not exists (
      select 1 from public.church_structure_leaders l
      where l.entity_id = v_tawi and lower(trim(l.position_title)) = lower('Kiongozi wa Tawi')
    );
  end if;
end $$;

update public.church_structure_entities e
set google_maps_url = coalesce(nullif(trim(e.google_maps_url), ''), 'https://maps.google.com/?q=Musoma,Tanzania'),
    updated_at = now()
from public.church_jimbo j
where e.id = j.id and lower(trim(j.jina)) = lower('Jimbo la Musoma');
