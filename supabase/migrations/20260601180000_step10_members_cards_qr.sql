-- Step 10: Members pro fields + family relations + digital member card + verification endpoint.

alter table if exists public.church_families
  add column if not exists head_member_id uuid null references public.church_members (id) on delete set null,
  add column if not exists head_member_name text null;

alter table if exists public.church_members
  add column if not exists relation_to_head text null,
  add column if not exists nida_number text null,
  add column if not exists photo_url text null,
  add column if not exists marital_status text null,
  add column if not exists occupation text null,
  add column if not exists region_name text null,
  add column if not exists district_name text null,
  add column if not exists ward_street text null,
  add column if not exists jimbo_name text null,
  add column if not exists jumuiya_name text null,
  add column if not exists idara_name text null,
  add column if not exists huduma_name text null;

create unique index if not exists church_members_phone_uq on public.church_members (phone) where phone is not null and length(trim(phone)) > 0;
create unique index if not exists church_members_email_uq on public.church_members (lower(email)) where email is not null and length(trim(email)) > 0;

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.church_families (id) on delete cascade,
  member_id uuid not null references public.church_members (id) on delete cascade,
  relationship_type text not null default 'ndugu',
  is_head boolean not null default false,
  created_at timestamptz not null default now(),
  unique (family_id, member_id)
);

create table if not exists public.member_cards (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.church_members (id) on delete cascade,
  card_number text not null unique,
  qr_url text not null,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create or replace function public.portal_generate_member_number()
returns text
language plpgsql
as $$
declare
  y text := to_char(now(), 'YYYY');
  next_n bigint;
begin
  select coalesce(max(split_part(member_number, '-', 3)::bigint), 0) + 1
    into next_n
  from public.church_members
  where member_number like ('KMKT-' || y || '-%');
  return 'KMKT-' || y || '-' || lpad(next_n::text, 6, '0');
end;
$$;

create or replace function public.portal_members_before_insert()
returns trigger
language plpgsql
as $$
begin
  if new.member_number is null or length(trim(new.member_number)) = 0 then
    new.member_number := public.portal_generate_member_number();
  end if;
  return new;
end;
$$;

drop trigger if exists portal_members_before_insert on public.church_members;
create trigger portal_members_before_insert
before insert on public.church_members
for each row execute procedure public.portal_members_before_insert();

alter table public.family_members enable row level security;
alter table public.member_cards enable row level security;
revoke all on table public.family_members from anon;
revoke all on table public.member_cards from anon;
grant select, insert, update, delete on table public.family_members to authenticated;
grant select, insert, update, delete on table public.member_cards to authenticated;

drop policy if exists "family_members_auth_rbac_all" on public.family_members;
create policy "family_members_auth_rbac_all"
  on public.family_members for all to authenticated
  using (public.portal_has_module_capability('waumini', 'view'))
  with check (public.portal_has_module_capability('waumini', 'edit'));

drop policy if exists "member_cards_auth_rbac_all" on public.member_cards;
create policy "member_cards_auth_rbac_all"
  on public.member_cards for all to authenticated
  using (public.portal_has_module_capability('waumini', 'view'))
  with check (public.portal_has_module_capability('waumini', 'edit'));

create or replace function public.verify_member_public(p_member_id uuid)
returns table (
  member_id uuid,
  full_name text,
  member_number text,
  membership_status text,
  branch_name text,
  valid_member boolean
)
language sql
security definer
set search_path = public
as $$
  select
    m.id,
    trim(coalesce(m.first_name, '') || ' ' || coalesce(m.last_name, '')) as full_name,
    m.member_number,
    m.membership_status::text,
    coalesce(m.tawi_name, '') as branch_name,
    true as valid_member
  from public.church_members m
  where m.id = p_member_id
  limit 1;
$$;

revoke all on function public.verify_member_public(uuid) from public;
grant execute on function public.verify_member_public(uuid) to anon, authenticated;
