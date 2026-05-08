# PHASE 20 Backend Setup (Production-ready)

## Goal
Complete backend implementation kwa KMK(T) National Church Portal:
- PostgreSQL schema
- Supabase Auth mapping
- RLS policies
- storage/file upload tables
- seeds (roles, slots, statuses, units)
- workflow/audit/notification systems

## Apply SQL in order
1. `phase10-supabase-national-core.sql`
2. `phase10-security-national-rls.sql`
3. `phase16-supabase-access-control.sql`
4. `phase16-security-rls.sql`
5. `phase20-supabase-backend.sql`
6. `phase20-security-rls.sql`

## Included in PHASE 20
- Auth user profile mapping table (`auth_user_profiles`)
- Role-scope mapping (`role_scope_mapping`)
- Confidential field policy mapping (`confidential_field_rules`)
- Scoped slot units + assignments with slot-limit trigger
- Super Admin slot table with strict max-4 active trigger
- Submission workflow records + status history table
- System notifications table
- System audit logs table
- Global categories/types/custom fields/file uploads tables

## Seed highlights
- Chief Admin seed marker:
  - ENOCK FUGO
  - fugomadata0@gmail.com
  - initial setup password hint: 2026
- 4 Super Admin slots (Open)
- 3-slot default units for known Dayosisi/Jimbo/Tawi
- Role mapping seed (Chief/Super/National/Office/Dayosisi/Jimbo/Branch/etc.)
- Status labels seed (full submission lifecycle)
- Categories seed (JVKMKT, JWKMK, departments, institutions, publications)

## RLS guarantees
- Scope-based access (Dayosisi/Jimbo/Tawi via JWT claims)
- Role-based admin controls
- Confidential rule visibility
- Submission workflow scope protection
- Notification targeting by role/user
- Audit logs restricted to higher roles

## JWT claims required
- `app_role`
- `dayosisi_name`
- `jimbo_name`
- `branch_name`

## Security notes
- Never store plain passwords in custom tables
- Create users using Supabase Auth
- Use `auth_user_profiles` for role/scope mapping and policy decisions
