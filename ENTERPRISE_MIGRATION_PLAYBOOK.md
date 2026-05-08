# KMK(T) Enterprise Migration Playbook

## Why this path (ushauri bora)
Codebase ya sasa ni stable na imefikia kiwango kizuri cha modules, lakini target yako ya mwisho ni:
- React + TypeScript + Tailwind + shadcn/ui + Framer Motion
- Supabase Auth + RLS + Storage + Realtime
- National-grade architecture

Suluhisho salama ni **parallel migration**:
1. Keep legacy portal running.
2. Build new enterprise frontend separately.
3. Migrate module by module without downtime.

## Current blocker found
- `node` is available.
- `npm/pnpm/yarn` are not available in PATH.

## Immediate fix (Windows)
1. Reinstall Node.js LTS (with npm included), or repair existing install.
2. Verify:
   - `node -v`
   - `npm -v`
3. Restart terminal/IDE.

## Bootstrap steps (once npm is available)
```bash
npm create vite@latest kmkt-enterprise -- --template react-ts
cd kmkt-enterprise
npm install
npm install -D tailwindcss postcss autoprefixer sass
npx tailwindcss init -p
npm install framer-motion @supabase/supabase-js
npx shadcn@latest init
```

## Recommended initial apps/pages
- `/auth/signup-request` (Phase 33 dynamic sign-up)
- `/admin/registration-requests`
- `/admin/invite-promote`
- `/dashboard/national`
- `/settings/master`

## Data contracts first (avoid regressions)
Before moving UI, freeze these contracts:
- signup request payload
- invite/promote/permission payload
- status enums (bilingual)
- audit log payload
- notification payload

## Module migration order (safe)
1. Auth + session + role guard
2. Public sign-up request + admin approval table
3. Invite/Promote/Permission module
4. Dashboard Kuu
5. Church hierarchy + Dayosisi + Majimbo
6. Leadership stack modules
7. Reports + global search

## Non-negotiable quality gates
- RLS enabled on every sensitive table
- No high-role self-registration
- Approval-based activation only
- Audit trail for create/update/status change
- Export/Print available on core governance tables

## Language quality gate
- Kiswahili ~70%, English ~30%
- Major labels/button/menu/table states in Kiswahili

