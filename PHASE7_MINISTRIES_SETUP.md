# PHASE 7 Ministries Setup (Production Ready)

## 1) Apply SQL files in order
1. `phase7-supabase-ministries.sql`
2. `phase7-security-rls.sql`

## 2) JWT custom claims required
- `app_role`: `super_admin | admin | askofu_dayosisi | mchungaji | kiongozi_idara | member`
- `dayosisi`: for Dayosisi scope
- `tawi`: for Tawi scope
- `ministry_name`: for `kiongozi_idara` own ministry scope

## 3) Frontend role/scope mock keys
For local testing in browser localStorage:
- `mock_role`
- `mock_dayosisi`
- `mock_tawi`
- `mock_ministry`

## 4) What is now enforced
- UI role-gates (buttons/actions)
- Scope checks in frontend (dayosisi/tawi/ministry)
- Strict RLS policies for:
  - `ministries`
  - `ministry_members`
  - `ministry_leaders`
  - `ministry_activities`
  - `ministry_contributions`
  - ministries-only inserts to `activity_logs`

## 5) Data mode behavior
- If Supabase config is missing/invalid: app runs in mock mode
- If Supabase config is valid: app switches to live mode automatically
