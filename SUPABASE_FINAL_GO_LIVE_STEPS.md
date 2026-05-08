# Supabase Final Go-Live Steps (KMK(T))

Hii ndio one-shot order ya mwisho ili tables ziwe live.

## 1) Run SQL kwa order hii kwenye Supabase SQL Editor

1. `phase10-supabase-national-core.sql`
2. `phase10-security-national-rls.sql`
3. `phase16-supabase-access-control.sql`
4. `phase16-security-rls.sql`
5. `phase31-supabase-elevated-access.sql`
6. `phase31-elevated-access-rls.sql`
7. `phase31-storage-elevated-letters.sql`
8. `phase32-supabase-invite-promote.sql`
9. `phase32-invite-promote-rls.sql`

## 2) Run verification file

- `supabase-live-verification.sql`

## 3) Expected pass status

- Tables zionekane:
  - `phase32_invitations`
  - `phase32_promotions`
  - `phase32_permission_layers`
  - `phase32_replacements`
  - `elevated_access_requests`
  - `elevated_access_assignments`
  - `elevated_access_routing`
- RLS = `true` kwa critical tables
- Policies zionekane kwenye `pg_policies`

## 4) Quick app smoke tests

1. Login: `auth-login.html`
2. Invite/Promote: `admin-invite-promote.html`
3. Elevated Access: `request-elevated-access.html`
4. Confirm create/read kwa records mpya kwenye Supabase table editor.

## 5) Notes

- `supabase-config.js` tayari imewekwa `enabled: true`.
- Ikiwa SQL editor inatoa error, simamisha hapo na rekebisha error ya file hiyo kabla ya kuendelea na inayofuata.
