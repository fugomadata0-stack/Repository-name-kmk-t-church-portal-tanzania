# PHASE 16 Access Control Setup

## New Module Files
- `access-control-workflow.html`
- `phase16-access.css`
- `phase16-access-hooks.js`
- `phase16-access-services.js`
- `phase16-access-main.js`
- `phase16-supabase-access-control.sql`
- `phase16-security-rls.sql`

## Implemented Sections
1. `Eneo Maalum la Super Admin` with exactly 4 slots
2. Chief Admin profile card seeded as ENOCK FUGO
3. `Usajili Maalum wa Super Admin` flow with slot availability + validations
4. Role assignment table: `WATUMIAJI WENYE RUHUSA KWA KILA ENEO`
5. Data submission workflow with Kiswahili statuses
6. Dashboard: `Ufuatiliaji wa Uwasilishaji wa Taarifa` with KPI cards + progress bars
7. Modern enterprise tables (search/filter/sort/pagination/export/print/bulk actions)
8. Permissions matrix with add/clone/disable/reset role actions
9. Audit logs table
10. Notification center (In-app now, Email/SMS/WhatsApp ready)

## Supabase Seed Notes
- Chief Admin uses secure hash (`crypt('2026', gen_salt('bf'))`) for initial setup only.
- Plain password is not shown in UI.
- Super Admin slots are enforced in app logic and SQL slot table (`slot_number 1..4`).

## Integration Status
- Dashboard route/link is connected (`Usalama` -> `access-control-workflow.html`).
- Supabase CRUD wiring is active with safe mock fallback.
- RLS strict policies added in `phase16-security-rls.sql`.

## Operational Notes
- Ensure JWT claims are populated for scoped policies:
  - `app_role`
  - `diocese_name`
  - `jimbo_name`
  - `branch_name`
- For strict Chief Admin governance, set Chief Admin account claim to `chief_admin`.
