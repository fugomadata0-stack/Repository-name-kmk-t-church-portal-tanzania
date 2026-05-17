-- Ensure phase33_signup_requests.dynamic_payload exists (PostgREST schema cache / legacy DBs).
-- Does not drop columns, RLS policies, or grants.

begin;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'phase33_signup_requests'
      and column_name = 'dynamic_payload'
  ) then
    alter table public.phase33_signup_requests
      add column dynamic_payload jsonb not null default '{}'::jsonb;
  else
    alter table public.phase33_signup_requests
      alter column dynamic_payload set default '{}'::jsonb;

    update public.phase33_signup_requests
    set dynamic_payload = '{}'::jsonb
    where dynamic_payload is null;

    alter table public.phase33_signup_requests
      alter column dynamic_payload set not null;
  end if;
end $$;

comment on column public.phase33_signup_requests.dynamic_payload is
  'Role-specific signup fields (JSON). Defaults to empty object.';

notify pgrst, 'reload schema';

commit;
