# PHASE 6 Storage & Security Setup

## 1) Supabase Storage Bucket
- Create bucket: `leadership-assets`
- Access: Private recommended (or Public for MVP)

## 2) Storage policies (example)
- Allow upload/read for authenticated roles:
  - `super_admin`, `admin`, `askofu_mkuu`, `askofu_dayosisi`
- Add RLS policies on `storage.objects` for bucket `leadership-assets`

## 3) Apply SQL files in order
1. `phase5-supabase-leadership.sql`
2. `phase6-security-rls.sql`

## 4) JWT custom claims required
- `app_role`
- `dayosisi` (for askofu_dayosisi scope restrictions)

## 5) UI behavior
- If Supabase config disabled: app uses mock mode
- If enabled and valid: app uses live CRUD + uploads + DB activity logs
