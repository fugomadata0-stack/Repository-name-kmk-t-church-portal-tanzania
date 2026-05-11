-- Bridge: legacy muundo (dayosisi, church_jimbo, church_tawi) → church_structure_entities
-- Idempotent. Uses SAME primary key UUIDs as legacy rows so FK (portal_directory, waumini, nk.) zibaki halali.
-- Hatua: KMK(T) mizizi → dayosisi → jimbo → tawi.

set search_path = public;

alter table if exists public.church_structure_entities add column if not exists whatsapp text;
alter table if exists public.church_structure_entities add column if not exists entity_type text;

do $migration$
declare
  v_kmkt uuid;
  v_kmkt_name text;
begin
  if to_regclass('public.church_structure_entities') is null then
    raise notice 'legacy_muundo_bridge: church_structure_entities haipo — ruka';
    return;
  end if;

  if to_regclass('public.dayosisi') is null then
    raise notice 'legacy_muundo_bridge: dayosisi haipo — ruka';
    return;
  end if;

  select c.id, c.name
  into v_kmkt, v_kmkt_name
  from church_structure_entities c
  where c.level = 'kmkt'
    and c.status in ('active', 'pending')
  order by c.created_at asc
  limit 1;

  if v_kmkt is null then
    insert into church_structure_entities (
      name,
      code,
      level,
      status,
      description,
      attachment_urls,
      custom_fields,
      category_tags
    )
    values (
      'Kanisa la Mennonite la Kiinjili Tanzania (KMK(T))',
      'KMK-T-ROOT',
      'kmkt',
      'active',
      'Mizizi ya taifa — iliyoundwa na uhamishaji wa muundo wa zamani (legacy → church_structure_entities).',
      '[]'::jsonb,
      jsonb_build_object('legacy_bridge', true, 'legacy_bridge_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
      '{}'::text[]
    )
    returning id, name into v_kmkt, v_kmkt_name;
  end if;

  -- Dayosisi (id = dayosisi.id)
  insert into church_structure_entities (
    id,
    name,
    code,
    level,
    parent_id,
    parent_name,
    region,
    district,
    address,
    phone,
    email,
    description,
    leader_name,
    contact_person,
    status,
    official_name,
    short_code,
    attachment_urls,
    custom_fields,
    category_tags,
    created_at,
    updated_at
  )
  select
    d.id,
    trim(d.jina),
    trim(d.code),
    'dayosisi',
    v_kmkt,
    v_kmkt_name,
    nullif(trim(d.mkoa), ''),
    nullif(trim(coalesce(d.ofisi, '')), ''),
    nullif(trim(coalesce(d.anwani, '')), ''),
    nullif(trim(d.simu), ''),
    nullif(trim(d.email), ''),
    nullif(trim(d.maelezo), ''),
    nullif(trim(d.askofu), ''),
    null,
    case lower(trim(coalesce(d.status, 'active')))
      when 'inactive' then 'inactive'
      when 'pending' then 'pending'
      when 'archived' then 'archived'
      when 'needs_review' then 'pending'
      else 'active'
    end,
    trim(d.jina),
    trim(d.code),
    '[]'::jsonb,
    jsonb_build_object('legacy_source', 'dayosisi', 'migrated_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
    '{}'::text[],
    coalesce(d.created_at, now()),
    coalesce(d.updated_at, now())
  from dayosisi d
  on conflict (id) do update set
    name = excluded.name,
    code = excluded.code,
    level = excluded.level,
    parent_id = coalesce(excluded.parent_id, church_structure_entities.parent_id),
    parent_name = coalesce(excluded.parent_name, church_structure_entities.parent_name),
    region = excluded.region,
    district = excluded.district,
    address = excluded.address,
    phone = excluded.phone,
    email = excluded.email,
    description = excluded.description,
    leader_name = excluded.leader_name,
    status = excluded.status,
    official_name = excluded.official_name,
    short_code = excluded.short_code,
    custom_fields = church_structure_entities.custom_fields || excluded.custom_fields,
    updated_at = excluded.updated_at;

  if to_regclass('public.church_jimbo') is null then
    raise notice 'legacy_muundo_bridge: church_jimbo haipo — dayosisi tu';
    return;
  end if;

  insert into church_structure_entities (
    id,
    name,
    code,
    level,
    parent_id,
    parent_name,
    region,
    phone,
    description,
    leader_name,
    status,
    official_name,
    short_code,
    attachment_urls,
    custom_fields,
    category_tags,
    created_at,
    updated_at
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
    'Uhamishaji kutoka church_jimbo.',
    nullif(trim(j.mkuu), ''),
    case lower(trim(coalesce(j.status, 'active')))
      when 'inactive' then 'inactive'
      when 'pending' then 'pending'
      when 'archived' then 'archived'
      else 'active'
    end,
    trim(j.jina),
    'JIM-' || replace(j.id::text, '-', ''),
    '[]'::jsonb,
    jsonb_build_object('legacy_source', 'church_jimbo', 'migrated_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
    '{}'::text[],
    coalesce(j.created_at, now()),
    coalesce(j.updated_at, now())
  from church_jimbo j
  join dayosisi ds on ds.id = j.dayosisi_id
  on conflict (id) do update set
    name = excluded.name,
    code = excluded.code,
    level = excluded.level,
    parent_id = excluded.parent_id,
    parent_name = excluded.parent_name,
    region = excluded.region,
    phone = excluded.phone,
    description = excluded.description,
    leader_name = excluded.leader_name,
    status = excluded.status,
    official_name = excluded.official_name,
    short_code = excluded.short_code,
    custom_fields = church_structure_entities.custom_fields || excluded.custom_fields,
    updated_at = excluded.updated_at;

  if to_regclass('public.church_tawi') is null then
    raise notice 'legacy_muundo_bridge: church_tawi haipo — maliza';
    return;
  end if;

  insert into church_structure_entities (
    id,
    name,
    code,
    level,
    parent_id,
    parent_name,
    phone,
    description,
    leader_name,
    status,
    official_name,
    short_code,
    entity_type,
    attachment_urls,
    custom_fields,
    category_tags,
    created_at,
    updated_at
  )
  select
    t.id,
    trim(t.jina),
    'TW-' || replace(t.id::text, '-', ''),
    'tawi',
    t.jimbo_id,
    trim(jb.jina),
    nullif(trim(t.simu), ''),
    'Uhamishaji kutoka church_tawi.',
    nullif(trim(t.kiongozi), ''),
    case lower(trim(coalesce(t.status, 'active')))
      when 'inactive' then 'inactive'
      when 'pending' then 'pending'
      when 'archived' then 'archived'
      else 'active'
    end,
    trim(t.jina),
    'TW-' || replace(t.id::text, '-', ''),
    nullif(trim(t.aina), ''),
    '[]'::jsonb,
    jsonb_build_object('legacy_source', 'church_tawi', 'migrated_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
    '{}'::text[],
    coalesce(t.created_at, now()),
    coalesce(t.updated_at, now())
  from church_tawi t
  join church_jimbo jb on jb.id = t.jimbo_id
  on conflict (id) do update set
    name = excluded.name,
    code = excluded.code,
    level = excluded.level,
    parent_id = excluded.parent_id,
    parent_name = excluded.parent_name,
    phone = excluded.phone,
    description = excluded.description,
    leader_name = excluded.leader_name,
    status = excluded.status,
    official_name = excluded.official_name,
    short_code = excluded.short_code,
    entity_type = coalesce(excluded.entity_type, church_structure_entities.entity_type),
    custom_fields = church_structure_entities.custom_fields || excluded.custom_fields,
    updated_at = excluded.updated_at;
end;
$migration$ language plpgsql;
