-- Phase 33: Auth Hooks (Postgres) — ulinganifu na sheria za nenosiri
-- Matakwa: endesha kwanza `phase33-password-validation-supabase.sql` (fazi `phase33_password_valid`).
--
-- Sanifu kwenye Supabase Dashboard: Authentication → Hooks
--   1) Before user created  → Postgres:
--        pg-functions://postgres/public/hook_before_user_created_kmt
--   2) (Hiari, Teams/Enterprise) Password verification attempt:
--        pg-functions://postgres/public/hook_password_verification_attempt_kmt
--
-- UFAHAMU: GoTrue inatuma `user` bila nenosiri wazi (encrypted_password haikusanyi JSON).
-- Hivyo mstari wa kigezo wa Phase 33 hutekelezwa tu iwapo siku moja kipengele
-- kitaongeza nenosiri kwenye event. Sasa: usajili wa `auth.signUp` bado unapaswa
-- uthibitishaji wa mteja (RPC) + urefu na vialama kwenye Authentication → Providers.
-- Usajili wa fomu ya `phase33_signup_requests` unadhibitiwa na `validatePasswordRemote` + RPC.

grant usage on schema public to supabase_auth_admin;

create or replace function public.hook_before_user_created_kmt(event jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  pwd text;
begin
  -- Nenosiri wazi hapatikani kwa sasa; hifadhi hii kwa ujumbe wa ujuzi / mustakabali
  pwd := coalesce(
    nullif(trim(event->>'password'), ''),
    nullif(trim(event->'credentials'->>'password'), ''),
    nullif(trim(event->'user'->>'password'), '')
  );

  if pwd is not null and length(pwd) > 0 then
    if not public.phase33_password_valid(pwd) then
      return jsonb_build_object(
        'error', jsonb_build_object(
          'message', 'Nenosiri halikidhi kigezo cha Phase 33 (herufi, alama, nambari nne, urefu).',
          'http_code', 400
        )
      );
    end if;
  end if;

  return '{}'::jsonb;
end;
$$;

comment on function public.hook_before_user_created_kmt(jsonb) is
  'Kuzuia usajili (Auth) endapo nenosiri liwepo kwenye event na halikidhi Phase 33; sasa uwezo mkuu ni uwekaji wa siku zijazo.';

grant execute on function public.hook_before_user_created_kmt(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created_kmt(jsonb) from authenticated, anon, public;

-- ---------------------------------------------------------------------------
-- Password verification attempt: `user_id` + `valid` (hakuna nenosiri wazi).
-- Inaruhusu sera za ziada (arifa, kikomo) — sio ulinganifu wa kigezo cha Phase 33.
-- Linasasishwa: Teams / Enterprise. Ruhusu mtiririko chaguo-msingi.
-- ---------------------------------------------------------------------------

create or replace function public.hook_password_verification_attempt_kmt(event jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
begin
  return jsonb_build_object(
    'decision', 'continue',
    'message', '',
    'should_logout_user', false
  );
end;
$$;

comment on function public.hook_password_verification_attempt_kmt(jsonb) is
  'Rudishi continue; ongeza hapa sera za baada ya majaribio ya nenosiri.';

grant execute on function public.hook_password_verification_attempt_kmt(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_password_verification_attempt_kmt(jsonb) from authenticated, anon, public;
