-- Rekebisha RPC ya rate limit: jsonb (PostgREST), md5 (hakuna pgcrypto), schema cache safi

drop function if exists public.portal_rate_limit_check_and_increment(text, text, int, int, int);
drop function if exists public.portal_rate_limit_check_and_increment(text, text);
drop function if exists public.portal_rate_limit_reset(text, text);

create or replace function public.portal_rate_limit_check_and_increment(
  p_scope text,
  p_identifier text,
  p_max_attempts int default 5,
  p_window_seconds int default 300,
  p_block_seconds int default 300
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_scope text := lower(trim(both from coalesce(p_scope, 'login')));
  v_id text := lower(trim(both from coalesce(p_identifier, '')));
  v_hash text;
  v_row public.portal_rate_limits%rowtype;
  v_window interval := (greatest(1, coalesce(p_window_seconds, 300))::text || ' seconds')::interval;
  v_block interval := (greatest(1, coalesce(p_block_seconds, 300))::text || ' seconds')::interval;
  v_max int := greatest(1, coalesce(p_max_attempts, 5));
begin
  if v_id = '' then
    return jsonb_build_object('allowed', true, 'retry_after_seconds', 0, 'attempts', 0);
  end if;

  v_hash := md5(v_scope || '|' || v_id);

  insert into public.portal_rate_limits (scope, identifier_hash, attempts, window_started_at, blocked_until, updated_at)
  values (v_scope, v_hash, 0, v_now, null, v_now)
  on conflict (scope, identifier_hash) do nothing;

  select * into v_row
  from public.portal_rate_limits
  where scope = v_scope and identifier_hash = v_hash
  for update;

  if not found then
    return jsonb_build_object('allowed', true, 'retry_after_seconds', 0, 'attempts', 0);
  end if;

  if v_row.blocked_until is not null and v_row.blocked_until > v_now then
    return jsonb_build_object(
      'allowed', false,
      'retry_after_seconds', greatest(1, ceil(extract(epoch from (v_row.blocked_until - v_now)))::int),
      'attempts', v_row.attempts
    );
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
    return jsonb_build_object(
      'allowed', false,
      'retry_after_seconds', greatest(1, ceil(extract(epoch from (v_row.blocked_until - v_now)))::int),
      'attempts', v_row.attempts
    );
  end if;

  return jsonb_build_object('allowed', true, 'retry_after_seconds', 0, 'attempts', v_row.attempts);
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
  v_id text := lower(trim(both from coalesce(p_identifier, '')));
  v_hash text;
begin
  if v_id = '' then
    return;
  end if;
  v_hash := md5(v_scope || '|' || v_id);
  update public.portal_rate_limits
  set attempts = 0,
      blocked_until = null,
      window_started_at = now(),
      updated_at = now()
  where scope = v_scope and identifier_hash = v_hash;
end;
$$;

revoke all on function public.portal_rate_limit_check_and_increment(text, text, int, int, int) from public;
revoke all on function public.portal_rate_limit_reset(text, text) from public;

grant execute on function public.portal_rate_limit_check_and_increment(text, text, int, int, int) to anon, authenticated, service_role;
grant execute on function public.portal_rate_limit_reset(text, text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
