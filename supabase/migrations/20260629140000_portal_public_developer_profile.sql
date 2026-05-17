-- Wasifu wa developer kwa ukurasa wa kuingia (umma) — safu moja, hakuna RBAC ya ndani.
-- Inafuata muundo wa portal_public_dashboard_counts (security definer, safu zilizochaguliwa tu).

create or replace function public.portal_public_developer_profile()
returns table (
  full_name text,
  email text,
  phone text,
  address text,
  po_box text,
  photo_url text,
  bio text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(dp.full_name, '')::text as full_name,
    coalesce(dp.email, '')::text as email,
    coalesce(dp.phone, '')::text as phone,
    coalesce(dp.address, '')::text as address,
    coalesce(dp.po_box, '')::text as po_box,
    dp.photo_url::text as photo_url,
    coalesce(dp.bio, '')::text as bio
  from public.developer_profile dp
  order by dp.created_at asc nulls last
  limit 1;
$$;

comment on function public.portal_public_developer_profile() is
  'Singleton developer contact card for public login landing — no module RBAC required.';

revoke all on function public.portal_public_developer_profile() from public;
grant execute on function public.portal_public_developer_profile() to anon, authenticated;
