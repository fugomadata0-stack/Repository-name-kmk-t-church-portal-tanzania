# KMK(T) Enterprise Frontend (React/TS)

Scaffold sasa ipo tayari (package/config + src structure).

## Planned stack
- React + TypeScript
- Tailwind CSS + shadcn/ui
- Framer Motion
- Supabase client
- Sass support for complex module styles

## Core routes (phase 1)
- `/auth/signup-request`
- `/admin/registration-requests`
- `/admin/invite-promote`
- `/dashboard/national`

## Start command
```bash
npm install
npm run dev
```

## One-click bootstrap (Windows PowerShell)
```powershell
.\bootstrap-enterprise.ps1
```

If npm is missing, script will stop and show install command.

## Current implemented layout
- Left sidebar (desktop) + hamburger drawer (mobile)
- Topbar: title, search, bell, role badge, logout, theme placeholder
- Dashboard KPI cards auto-update from same mock state source
- Reusable PremiumTable with Add/Edit/Delete/View/Clear/Export/Print actions
- First modules ready:
  - Dayosisi table
  - Majimbo table
  - Matawi/Vituo table
  - Viongozi table
  - Fedha transactions table

## Notes
- Keep legacy HTML/JS portal active during migration.
- Use shared Supabase schema and RLS policies already created in root SQL files.
