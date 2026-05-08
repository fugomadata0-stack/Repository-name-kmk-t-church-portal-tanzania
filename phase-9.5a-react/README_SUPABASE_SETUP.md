# KMT Worship Module - Supabase Setup

Mwongozo huu unakusaidia kuifanya `WorshipAttendanceOfferingModule` itumie Supabase live.

## 1) Weka environment variables

Ndani ya `phase-9.5a-react`, tengeneza faili `.env`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Kisha restart app:

```bash
npm run dev
```

## 2) Run SQL schema + RLS

Kwenye Supabase SQL Editor, run faili:

- `phase9-5a-supabase-worship-records.sql`

Hii itaunda:

- `public.worship_service_records`
- indexes
- trigger ya `updated_at`
- RLS policies

## 3) Verify kwenye UI

Fungua dashboard ya module na angalia badge ya juu:

- `Supabase Connected` = OK (live DB)
- `Local Fallback` = env/DB/RLS issue

Bonyeza `Refresh` karibu na badge kufanya check upya.

## 4) Smoke test ya CRUD

1. `Add Record` -> rekodi mpya ionekane
2. `Duplicate` -> copy ya record ionekane
3. `Lock/Unlock` -> status ibadilike
4. `Delete` -> record iondoke
5. Refresh browser -> mabadiliko yabaki (ikiwa Supabase imeunganishwa)

## 5) Troubleshooting ya haraka

- **Badge ni Local Fallback**
  - hakikisha `.env` ipo na keys sahihi
  - hakikisha SQL file ime-run bila error
  - hakikisha user ana `authenticated` role access
- **Data haisave lakini hakuna error ya wazi**
  - mara nyingi ni RLS policy mismatch (dayosisi/tawi/app_role)
- **Build fail kwa env typings**
  - hakikisha `src/vite-env.d.ts` ipo na:
    - `/// <reference types="vite/client" />`

## 6) Security note

Usiweke service role key kwenye frontend. Tumia `VITE_SUPABASE_ANON_KEY` tu.
