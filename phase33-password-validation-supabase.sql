-- Phase 33: Uchambuzi wa nenosiri (sawa na phase33-dynamic-signup-services.js)
-- Endesha kipande hiki kwenye Supabase SQL Editor baada ya phase33-signup-supabase.sql
-- Inaruhusu RPC `phase33_password_valid` / `phase33_analyze_password` kwa uthibitishaji upande wa seva.

create or replace function public.phase33_analyze_password(p text)
returns jsonb
language sql
immutable
security invoker
set search_path = public
as $$
  with s as (select coalesce(p, '') as t),
  d as (
    select
      char_length(s.t) as len,
      (s.t ~ '^[A-Z]') as first_upper,
      (s.t ~ '[a-z]') as has_lower,
      (s.t ~ '[@#$!]') as has_special,
      char_length(regexp_replace(s.t, '[^0-9]', '', 'g')) as digit_count
    from s
  )
  select jsonb_build_object(
    'length', d.len >= 8,
    'firstUpper', d.first_upper,
    'hasLower', d.has_lower,
    'hasSpecial', d.has_special,
    'fourDigits', d.digit_count >= 4,
    'valid', d.len >= 8 and d.first_upper and d.has_lower and d.has_special and d.digit_count >= 4,
    'digitCount', d.digit_count
  )
  from d;
$$;

create or replace function public.phase33_password_valid(p text)
returns boolean
language sql
immutable
security invoker
set search_path = public
as $$
  select coalesce((phase33_analyze_password(p) ->> 'valid')::boolean, false);
$$;

grant execute on function public.phase33_analyze_password(text) to anon, authenticated;
grant execute on function public.phase33_password_valid(text) to anon, authenticated;

comment on function public.phase33_analyze_password(text) is
  'Kigezo cha nenosiri cha KMT Phase 33 (sheria sawa na mfumo wa JS).';
comment on function public.phase33_password_valid(text) is
  'Rudi true ikiwa nenosiri linakidhi mahitaji yote ya Phase 33.';

-- Auth Hooks (GoTrue): angalia `phase33-auth-hooks-supabase.sql`.
