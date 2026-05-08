# PHASE 4 Setup (Supabase Ready)

## 1) Washa Supabase mode
- Open `supabase-config.js`
- Weka:
  - `url`: Supabase project URL
  - `anonKey`: Supabase anon key
  - `enabled: true`

## 2) Tengeneza tables hizi Supabase
- `dayosisi`:
  - `id bigint generated always as identity primary key`
  - `name text`
  - `region text`
  - `leader text`
  - `status text`
- `majimbo`:
  - `id`, `name`, `region`, `dayosisi`, `status`
- `matawi`:
  - `id`, `name`, `region`, `jimbo`, `status`
- `waumini`:
  - `id`, `name`, `region`, `simu`, `status`
- `viongozi`:
  - `id`, `name`, `region`, `cheo`, `status`
- `mahudhurio`:
  - `id`, `name`, `region`, `idadi`, `status`
- `michango`:
  - `id`, `name`, `region`, `kiasi`, `status`

## 3) RLS quick note
- Kwa Phase 4 foundation unaweza kuweka read/write kwa authenticated users.
- Baadaye tutaweka role-based RLS policies kwa `super_admin`, `admin`, `askofu_dayosisi`, n.k.

## 4) Verification
- Fungua `dashboard.html`
- Topbar itaonyesha `Data: Supabase` ikishawaka vizuri.
- CRUD kwenye workspace itaanza kuandika/kusoma Supabase badala ya mock store.
