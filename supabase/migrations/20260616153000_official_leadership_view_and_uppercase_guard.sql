-- Official national leadership hardening (follow-up):
-- 1) Enforce uppercase names/titles for locked official leaders.
-- 2) Provide a single immutable view for PDF/CV/cards/reports/signature dropdowns.
-- 3) Add QA helper function to verify all 4 required leaders exist.

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
      upper(coalesce(new.full_name, '')) <> upper(coalesce(old.full_name, '')) or
      upper(coalesce(new.jina, '')) <> upper(coalesce(old.jina, '')) or
      upper(coalesce(new.title, '')) <> upper(coalesce(old.title, '')) or
      upper(coalesce(new.cheo, '')) <> upper(coalesce(old.cheo, '')) or
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

update public.church_viongozi
set
  full_name = upper(coalesce(full_name, '')),
  jina = upper(coalesce(jina, '')),
  title = upper(coalesce(title, '')),
  cheo = upper(coalesce(cheo, ''))
where official_locked is true;

create or replace function public.kmkt_enforce_official_uppercase()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.official_locked is true then
    new.full_name := upper(coalesce(new.full_name, ''));
    new.jina := upper(coalesce(new.jina, ''));
    new.title := upper(coalesce(new.title, ''));
    new.cheo := upper(coalesce(new.cheo, ''));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_kmkt_enforce_official_uppercase on public.church_viongozi;
create trigger trg_kmkt_enforce_official_uppercase
before insert or update on public.church_viongozi
for each row
execute function public.kmkt_enforce_official_uppercase();

create or replace view public.v_official_national_leadership
with (security_invoker = true)
as
select
  id,
  full_name,
  title,
  simu as phone,
  email,
  whatsapp,
  photo_url,
  signature_url,
  biography,
  leadership_level,
  active_status,
  appointment_date,
  term_start,
  term_end,
  created_at,
  updated_at
from public.church_viongozi
where official_locked is true
  and active_status is true
order by title asc;

create or replace function public.kmkt_official_leaders_qa()
returns table (
  check_name text,
  ok boolean,
  details text
)
language sql
stable
set search_path = public
as $$
  with expected(lock_key, full_name, title) as (
    values
      ('kmkt_official_askofu_mkuu', 'LAMECK NICODEMUS MANJI', 'ASKOFU MKUU WA KMK(T)'),
      ('kmkt_official_katibu_mkuu', 'MCH JOHN MUTTANI SEAN', 'KATIBU MKUU WA KMK(T)'),
      ('kmkt_official_naibu_katibu_mkuu', 'ZAKARIA RUKONGE BUNINI', 'NAIBU KATIBU MKUU WA KMK(T)'),
      ('kmkt_official_mhasibu', 'MCH SOSPITER MASAMAKI CHANGURU', 'MHASIBU WA KMK(T)')
  ),
  matched as (
    select
      e.lock_key,
      e.full_name,
      e.title,
      v.id is not null as found
    from expected e
    left join public.church_viongozi v
      on v.official_lock_key = e.lock_key
     and upper(coalesce(v.full_name, '')) = e.full_name
     and upper(coalesce(v.title, '')) = e.title
     and v.official_locked is true
  ),
  summary as (
    select
      count(*)::int as expected_count,
      count(*) filter (where found)::int as found_count
    from matched
  )
  select
    'OFFICIAL_LEADERS_PRESENT'::text as check_name,
    (found_count = expected_count) as ok,
    ('FOUND ' || found_count || ' OF ' || expected_count || ' REQUIRED OFFICIAL LEADERS')::text as details
  from summary
  union all
  select
    'OFFICIAL_NAMES_UPPERCASE'::text,
    not exists (
      select 1
      from public.church_viongozi
      where official_locked is true
        and (
          full_name <> upper(coalesce(full_name, ''))
          or title <> upper(coalesce(title, ''))
        )
    ) as ok,
    'ALL LOCKED OFFICIAL LEADER NAMES/TITLES MUST BE UPPERCASE'::text as details;
$$;
