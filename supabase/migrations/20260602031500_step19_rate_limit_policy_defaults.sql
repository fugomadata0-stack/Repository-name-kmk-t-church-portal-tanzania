-- STEP 19: Advanced Security Hardening
-- Add rate-limit policy defaults for portal_security_policies JSON config.

update public.portal_security_policies
set
  policy_json = coalesce(policy_json, '{}'::jsonb) || jsonb_build_object(
    'session_idle_minutes', coalesce((policy_json->>'session_idle_minutes')::int, 30),
    'lockout_attempts', coalesce((policy_json->>'lockout_attempts')::int, 5),
    'rate_limit',
      coalesce(policy_json->'rate_limit', '{}'::jsonb) || jsonb_build_object(
        'login', coalesce(policy_json #> '{rate_limit,login}', jsonb_build_object(
          'enabled', true,
          'window_seconds', 300,
          'max_attempts', 5,
          'block_seconds', 300
        )),
        'api', coalesce(policy_json #> '{rate_limit,api}', jsonb_build_object(
          'enabled', true,
          'window_seconds', 60,
          'max_attempts', 120,
          'block_seconds', 60
        )),
        'uploads', coalesce(policy_json #> '{rate_limit,uploads}', jsonb_build_object(
          'enabled', true,
          'window_seconds', 60,
          'max_attempts', 30,
          'block_seconds', 180
        ))
      )
  ),
  updated_at = now()
where id = 1;

insert into public.portal_security_policies (id, policy_json, updated_at)
values (
  1,
  jsonb_build_object(
    'password_min_length', 10,
    'lockout_attempts', 5,
    'session_idle_minutes', 30,
    'mfa_enforced_roles', jsonb_build_array('super_admin', 'chief_admin', 'finance_admin'),
    'ip_allowlist_enabled', false,
    'ip_allowlist_cidrs', '[]'::jsonb,
    'require_email_verify', true,
    'audit_retention_days', 365,
    'rate_limit', jsonb_build_object(
      'login', jsonb_build_object('enabled', true, 'window_seconds', 300, 'max_attempts', 5, 'block_seconds', 300),
      'api', jsonb_build_object('enabled', true, 'window_seconds', 60, 'max_attempts', 120, 'block_seconds', 60),
      'uploads', jsonb_build_object('enabled', true, 'window_seconds', 60, 'max_attempts', 30, 'block_seconds', 180)
    )
  ),
  now()
)
on conflict (id) do update
set policy_json = excluded.policy_json, updated_at = now();
