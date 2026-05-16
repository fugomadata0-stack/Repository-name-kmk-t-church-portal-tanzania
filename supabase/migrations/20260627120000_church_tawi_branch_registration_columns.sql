-- Usajili wa kina wa tawi: msimbo, eneo, GPS, tarehe ya kuanzishwa, uhakiki.

alter table if exists public.church_tawi
  add column if not exists branch_code text;

alter table if exists public.church_tawi
  add column if not exists mkoa text;

alter table if exists public.church_tawi
  add column if not exists wilaya text;

alter table if exists public.church_tawi
  add column if not exists kata text;

alter table if exists public.church_tawi
  add column if not exists mtaa text;

alter table if exists public.church_tawi
  add column if not exists gps_lat double precision;

alter table if exists public.church_tawi
  add column if not exists gps_lng double precision;

alter table if exists public.church_tawi
  add column if not exists founded_date date;

alter table if exists public.church_tawi
  add column if not exists verification_status text not null default 'unverified';

alter table if exists public.church_tawi
  add column if not exists verified_at timestamptz;

alter table if exists public.church_tawi
  add column if not exists verified_by uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'church_tawi_verification_status_chk'
      and conrelid = 'public.church_tawi'::regclass
  ) then
    alter table public.church_tawi
      add constraint church_tawi_verification_status_chk
      check (verification_status in ('unverified', 'pending_review', 'verified'));
  end if;
end $$;

create unique index if not exists church_tawi_branch_code_per_jimbo_uq
  on public.church_tawi (jimbo_id, lower(trim(branch_code)))
  where branch_code is not null and length(trim(branch_code)) > 0;

create index if not exists idx_church_tawi_branch_code on public.church_tawi (branch_code);
create index if not exists idx_church_tawi_verification on public.church_tawi (verification_status);

comment on column public.church_tawi.branch_code is 'Msimbo wa tawi/kituo (kipekee ndani ya jimbo).';
comment on column public.church_tawi.verification_status is 'Uhakiki wa usajili: unverified | pending_review | verified.';
