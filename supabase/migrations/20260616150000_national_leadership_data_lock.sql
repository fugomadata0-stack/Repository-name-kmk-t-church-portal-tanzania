-- FINAL NATIONAL LEADERSHIP DATA LOCK (KMK(T))
-- Preserves official leaders and keeps system dynamic for unlimited future records.

alter table if exists public.church_viongozi
  add column if not exists title text,
  add column if not exists signature_url text,
  add column if not exists biography text,
  add column if not exists active_status boolean not null default true,
  add column if not exists term_start date,
  add column if not exists term_end date,
  add column if not exists official_lock_key text,
  add column if not exists official_locked boolean not null default false;

-- Backfill compatibility columns from existing structure if needed.
update public.church_viongozi
set
  title = coalesce(nullif(title, ''), nullif(cheo, '')),
  full_name = coalesce(nullif(full_name, ''), nullif(jina, '')),
  term_start = coalesce(term_start, start_date),
  term_end = coalesce(term_end, end_date),
  active_status = case
    when lower(coalesce(status, 'active')) in ('active', 'enabled', 'published') then true
    else false
  end
where true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'church_viongozi_official_lock_key_unique'
  ) then
    alter table public.church_viongozi
      add constraint church_viongozi_official_lock_key_unique unique (official_lock_key);
  end if;
end $$;

insert into public.church_viongozi (
  full_name,
  jina,
  title,
  cheo,
  simu,
  email,
  whatsapp,
  photo_url,
  signature_url,
  biography,
  leadership_level,
  ngazi,
  status,
  active_status,
  appointment_date,
  term_start,
  term_end,
  official_lock_key,
  official_locked
)
values
  (
    'LAMECK NICODEMUS MANJI',
    'LAMECK NICODEMUS MANJI',
    'ASKOFU MKUU WA KMK(T)',
    'ASKOFU MKUU WA KMK(T)',
    '0755927252',
    null,
    '0755927252',
    null,
    null,
    'Kiongozi rasmi wa kitaifa wa KMK(T).',
    'KMK(T) National Level',
    'KMK(T) National Level',
    'active',
    true,
    null,
    null,
    null,
    'kmkt_official_askofu_mkuu',
    true
  ),
  (
    'MCH JOHN MUTTANI SEAN',
    'MCH JOHN MUTTANI SEAN',
    'KATIBU MKUU WA KMK(T)',
    'KATIBU MKUU WA KMK(T)',
    '+255783858902',
    null,
    '+255783858902',
    null,
    null,
    'Kiongozi rasmi wa kitaifa wa KMK(T).',
    'KMK(T) National Level',
    'KMK(T) National Level',
    'active',
    true,
    null,
    null,
    null,
    'kmkt_official_katibu_mkuu',
    true
  ),
  (
    'Zakaria Rukonge Bunini',
    'Zakaria Rukonge Bunini',
    'NAIBU KATIBU MKUU WA KMK(T)',
    'NAIBU KATIBU MKUU WA KMK(T)',
    '0743979707',
    null,
    '0743979707',
    null,
    null,
    'Kiongozi rasmi wa kitaifa wa KMK(T).',
    'KMK(T) National Level',
    'KMK(T) National Level',
    'active',
    true,
    null,
    null,
    null,
    'kmkt_official_naibu_katibu_mkuu',
    true
  ),
  (
    'MCH SOSPITER MASAMAKI CHANGURU',
    'MCH SOSPITER MASAMAKI CHANGURU',
    'MHASIBU WA KMK(T)',
    'MHASIBU WA KMK(T)',
    '0784775746',
    'changurukmkt@gmail.com',
    '0784775746',
    null,
    null,
    'Kiongozi rasmi wa kitaifa wa KMK(T).',
    'KMK(T) National Level',
    'KMK(T) National Level',
    'active',
    true,
    null,
    null,
    null,
    'kmkt_official_mhasibu',
    true
  )
on conflict (official_lock_key)
do update set
  full_name = excluded.full_name,
  jina = excluded.jina,
  title = excluded.title,
  cheo = excluded.cheo,
  simu = excluded.simu,
  email = excluded.email,
  whatsapp = excluded.whatsapp,
  photo_url = excluded.photo_url,
  signature_url = excluded.signature_url,
  biography = excluded.biography,
  leadership_level = excluded.leadership_level,
  ngazi = excluded.ngazi,
  status = excluded.status,
  active_status = excluded.active_status,
  appointment_date = excluded.appointment_date,
  term_start = excluded.term_start,
  term_end = excluded.term_end,
  official_locked = true,
  updated_at = now();

create or replace function public.kmkt_guard_official_leadership()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and old.official_locked is true then
    raise exception 'Official KMK(T) national leadership record is locked and cannot be deleted.';
  end if;

  if tg_op = 'UPDATE' and old.official_locked is true then
    if
      coalesce(new.full_name, '') <> coalesce(old.full_name, '') or
      coalesce(new.jina, '') <> coalesce(old.jina, '') or
      coalesce(new.title, '') <> coalesce(old.title, '') or
      coalesce(new.cheo, '') <> coalesce(old.cheo, '') or
      coalesce(new.simu, '') <> coalesce(old.simu, '') or
      coalesce(new.email, '') <> coalesce(old.email, '') or
      coalesce(new.whatsapp, '') <> coalesce(old.whatsapp, '') or
      coalesce(new.official_lock_key, '') <> coalesce(old.official_lock_key, '')
    then
      raise exception 'Official KMK(T) national leadership identity fields are locked.';
    end if;

    if new.official_locked is distinct from true then
      raise exception 'Official KMK(T) national leadership lock cannot be removed.';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_kmkt_guard_official_leadership_upd on public.church_viongozi;
create trigger trg_kmkt_guard_official_leadership_upd
before update on public.church_viongozi
for each row
execute function public.kmkt_guard_official_leadership();

drop trigger if exists trg_kmkt_guard_official_leadership_del on public.church_viongozi;
create trigger trg_kmkt_guard_official_leadership_del
before delete on public.church_viongozi
for each row
execute function public.kmkt_guard_official_leadership();

-- Ensure realtime publication includes leadership source table.
do $pub$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'church_viongozi'
    ) then
      execute 'alter publication supabase_realtime add table public.church_viongozi';
    end if;
  end if;
end
$pub$;

alter table if exists public.church_viongozi replica identity full;
