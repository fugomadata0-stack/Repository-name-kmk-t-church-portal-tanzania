# PHASE 8 Events & Camps Setup

## Apply SQL
1. `phase8-supabase-events.sql`
2. `phase8-security-rls.sql`

## Supabase-ready tables
- `events`
- `camps`
- `camp_participants`
- `event_participants`
- `camp_speakers`
- `camp_budgets`
- `camp_attendance`
- `camp_media`
- `scheduled_messages`
- `activity_logs` (already exists)

## UI behavior
- If Supabase config missing: mock mode
- If Supabase config valid: live CRUD mode

## Role testing (mock)
Use localStorage values:
- `mock_role`
- `mock_dayosisi`
- `mock_tawi`

## New hardening completed
- Strict role-aware RLS for events/camps/participants/budgets/attendance/media/scheduled_messages
- Full mini-modal forms (add/edit) in UI
- SMS reminder records saved to `scheduled_messages` table
