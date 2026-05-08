-- Phase 35: token_hash tu (hakuna token ghafi kwenye DB), scope_type/scope_id, RPC kuthibitisha

create extension if not exists pgcrypto;

-- ——— Safu mpya / kurekebisha phase34_invites ———
alter table public.phase34_invites
  add column if not exists token_hash text,
  add column if not exists scope_type text,
  add column if not exists scope_id text,
  add column if not exists invited_by uuid references auth.users (id) on delete set null,
  add column if not exists accepted_by uuid references auth.users (id) on delete set null;

-- Nyuma: jaza token_hash kutoka invite_token ya zamani (UTF-8 = sawa na Web Crypto)
update public.phase34_invites i
set token_hash = encode(digest(convert_to(trim(both from i.invite_token), 'UTF8'), 'sha256'), 'hex')
where i.token_hash is null and i.invite_token is not null;

-- Pakua scope_type / scope_id kutoka safu za zamani
update public.phase34_invites
set
  scope_type = coalesce(scope_type, scope_level, 'national'),
  scope_id = coalesce(
    scope_id,
    case
      when coalesce(scope_level, scope_type) = 'national' then '{}'::text
      else json_build_object(
        'dayosisi', dayosisi_scope,
        'jimbo', jimbo_scope,
        'tawi', tawi_scope
      )::text
    end
  )
where scope_type is null or scope_id is null;

update public.phase34_invites
set invited_by = coalesce(invited_by, created_by)
where invited_by is null and created_by is not null;

-- Hakikisha kila mstari ana token_hash kabla ya kuondoa invite_token
update public.phase34_invites
set token_hash = encode(digest(convert_to(gen_random_uuid()::text || random()::text, 'UTF8'), 'sha256'), 'hex')
where token_hash is null;

alter table public.phase34_invites
  alter column token_hash set not null;

drop index if exists phase34_invites_token_unique;
create unique index if not exists phase34_invites_token_hash_uq on public.phase34_invites (token_hash);

-- Ondoa safu ya token ghafi
alter table public.phase34_invites drop column if exists invite_token;

-- Safu za zamani za scope (optional drop — metadata iko scope_id)
alter table public.phase34_invites drop column if exists scope_level;
alter table public.phase34_invites drop column if exists dayosisi_scope;
alter table public.phase34_invites drop column if exists jimbo_scope;
alter table public.phase34_invites drop column if exists tawi_scope;

comment on column public.phase34_invites.token_hash is 'SHA-256 hex ya token — si token halisi.';
comment on column public.phase34_invites.scope_type is 'national | diocese | jimbo | tawi';
comment on column public.phase34_invites.scope_id is 'JSON string au kitambulisho cha eneo';

-- ——— RPC: uthibitishaji wa umma (hakuna token inayoonyeshwa kwenye jedwali kwa anon) ———
create or replace function public.phase35_validate_invite_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text := encode(digest(convert_to(trim(both from coalesce(p_token, '')), 'UTF8'), 'sha256'), 'hex');
  r public.phase34_invites%rowtype;
begin
  if length(trim(both from coalesce(p_token, ''))) < 16 then
    return jsonb_build_object('valid', false, 'code', 'invalid_format');
  end if;

  select * into r from public.phase34_invites where token_hash = v_hash limit 1;
  if not found then
    return jsonb_build_object('valid', false, 'code', 'not_found');
  end if;

  if r.status = 'revoked' then
    return jsonb_build_object('valid', false, 'code', 'revoked');
  end if;
  if r.status = 'accepted' then
    return jsonb_build_object('valid', false, 'code', 'already_accepted');
  end if;
  if r.status <> 'pending' then
    return jsonb_build_object('valid', false, 'code', r.status);
  end if;
  if r.expires_at < now() then
    return jsonb_build_object('valid', false, 'code', 'expired');
  end if;

  return jsonb_build_object(
    'valid', true,
    'invite_id', r.id,
    'email', r.email,
    'role_key', r.role_key,
    'scope_type', r.scope_type,
    'scope_id', r.scope_id,
    'expires_at', r.expires_at,
    'message', r.message
  );
end;
$$;

grant execute on function public.phase35_validate_invite_token(text) to anon, authenticated;

-- Hash kwa ajili ya Edge / majaribio (si lazima kwenye DB lakini inatumika na scripts)
create or replace function public.phase35_hash_invite_token(p_token text)
returns text
language sql
immutable
security invoker
set search_path = public
as $$
  select encode(digest(convert_to(trim(both from coalesce(p_token, '')), 'UTF8'), 'sha256'), 'hex');
$$;

grant execute on function public.phase35_hash_invite_token(text) to anon, authenticated, service_role;

comment on function public.phase35_validate_invite_token(text) is 'Orodha ya umma: thibitisha token bila kuonyesha token_hash kwenye API ya moja kwa moja.';
