-- STEP 19: Server-side rate limiting RPC for auth/login
create extension if not exists pgcrypto;

create table if not exists public.portal_rate_limits (
  id bigserial primary key,
  scope text not null,
  identifier_hash text not null,
  attempts int not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now(),
  unique (scope, identifier_hash)
);

create index if not exists portal_rate_limits_scope_idx on public.portal_rate_limits (scope);
create index if not exists portal_rate_limits_blocked_idx on public.portal_rate_limits (blocked_until);

alter table public.portal_rate_limits enable row level security;

drop policy if exists "portal_rate_limits_no_direct_access_anon" on public.portal_rate_limits;
create policy "portal_rate_limits_no_direct_access_anon"
on public.portal_rate_limits for all to anon
using (false) with check (false);

drop policy if exists "portal_rate_limits_no_direct_access_auth" on public.portal_rate_limits;
create policy "portal_rate_limits_no_direct_access_auth"
on public.portal_rate_limits for all to authenticated
using (false) with check (false);

create or replace function public.portal_rate_limit_check_and_increment(
  p_scope text,
  p_identifier text,
  p_max_attempts int default 5,
  p_window_seconds int default 300,
  p_block_seconds int default 300
)
returns table (allowed boolean, retry_after_seconds int, attempts int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_scope text := lower(trim(both from coalesce(p_scope, 'login')));
  v_hash text := encode(digest(convert_to(lower(trim(both from coalesce(p_identifier, ''))), 'UTF8'), 'sha256'), 'hex');
  v_row public.portal_rate_limits%rowtype;
  v_window interval := make_interval(secs => greatest(1, p_window_seconds));
  v_block interval := make_interval(secs => greatest(1, p_block_seconds));
  v_max int := greatest(1, p_max_attempts);
begin
  insert into public.portal_rate_limits (scope, identifier_hash, attempts, window_started_at, blocked_until, updated_at)
  values (v_scope, v_hash, 0, v_now, null, v_now)
  on conflict (scope, identifier_hash) do nothing;

  select * into v_row
  from public.portal_rate_limits
  where scope = v_scope and identifier_hash = v_hash
  for update;

  if v_row.blocked_until is not null and v_row.blocked_until > v_now then
    return query select false, greatest(1, ceil(extract(epoch from (v_row.blocked_until - v_now)))::int), v_row.attempts;
    return;
  end if;

  if v_row.window_started_at + v_window <= v_now then
    update public.portal_rate_limits
    set attempts = 1,
        window_started_at = v_now,
        blocked_until = null,
        updated_at = v_now
    where id = v_row.id
    returning * into v_row;
  else
    update public.portal_rate_limits
    set attempts = attempts + 1,
        updated_at = v_now
    where id = v_row.id
    returning * into v_row;
  end if;

  if v_row.attempts > v_max then
    update public.portal_rate_limits
    set blocked_until = v_now + v_block,
        updated_at = v_now
    where id = v_row.id
    returning * into v_row;
    return query select false, greatest(1, ceil(extract(epoch from (v_row.blocked_until - v_now)))::int), v_row.attempts;
    return;
  end if;

  return query select true, 0, v_row.attempts;
end;
$$;

create or replace function public.portal_rate_limit_reset(
  p_scope text,
  p_identifier text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text := lower(trim(both from coalesce(p_scope, 'login')));
  v_hash text := encode(digest(convert_to(lower(trim(both from coalesce(p_identifier, ''))), 'UTF8'), 'sha256'), 'hex');
begin
  update public.portal_rate_limits
  set attempts = 0,
      blocked_until = null,
      window_started_at = now(),
      updated_at = now()
  where scope = v_scope and identifier_hash = v_hash;
end;
$$;

grant execute on function public.portal_rate_limit_check_and_increment(text, text, int, int, int) to anon, authenticated;
grant execute on function public.portal_rate_limit_reset(text, text) to anon, authenticated;
