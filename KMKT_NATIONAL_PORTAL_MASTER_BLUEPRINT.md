# KMK(T) National Portal Master Blueprint

## Executive check (iko tayari kiasi gani)
- **Ndiyo, foundation ipo**: modules nyingi za core zipo tayari kwenye static modular architecture.
- **Bado haijafika stack uliotaja**: hakuna React + TypeScript + Tailwind + shadcn + Framer build pipeline bado.
- **Hitaji la kuboresha**: migrate kwa app mpya ya frontend (Vite/Next) while preserving domain logic ya sasa.

## Target identity
- KANISA LA MENNONITE LA KIINJILI TANZANIA – KMK(T)
- Ofisi ya Ngazi Kuu ya Kanisa Tanzania
- HQ: Musoma Mjini, Mara, S.L.P 317

## Language policy
- UI copy: Kiswahili dominant (~70%)
- English contextual (~30%) for terms: Dashboard, Analytics, Filter, Export, Role, Status

## Core architecture (production)
- Frontend: React + TypeScript + Tailwind + shadcn/ui + Framer Motion
- Backend: Supabase (Auth, Postgres, Storage, Realtime, Edge Functions)
- Security: RLS + audit logs + workflow approvals + visibility levels

## Master extensibility rule (applies to every module)
Kila module iwe na:
- Ongeza Kategoria Mpya
- Ongeza Aina Mpya
- Ongeza Field Mpya
- Ongeza Sehemu Mpya
- Hariri / Hifadhi / Panga upya / Washa-Zima category

## Module map (Sections 1–37 condensed)
1. Master Settings  
2. Dashboard Kuu  
3. Church Structure (hierarchy dynamic)  
4. Dayosisi  
5. Majimbo  
6. Matawi/Parokia/Vituo  
7. Viongozi wa Ngazi Kuu  
8. Viongozi wa Dayosisi  
9. Maaskofu  
10. Wachungaji  
11. Wainjilisti  
12. Wazee  
13. Waongozi wa Matawi  
14. Mashemasi  
15. Waumini  
16. Jumuiya  
17. Idara  
18. Kwaya  
19. Katekisimu  
20. Partners  
21. MWC Global Relations  
22. Taasisi  
23. Machapisho / Digital Library  
24. Media / Habari / Gallery  
25. Events / Ratiba / Makambi  
26. Document Center  
27. Branding & Identity  
28. Reports & Print Center  
29. Smart Search & Directory  
30. RBAC  
31. Approval Workflow  
32. Audit Logs  
33. Notifications  
34. UX Standards (forms/tables/cards)  
35. Database schema  
36. Seed data  
37. Output/quality governance

## Public vs Admin separation
- Public pages: homepage, selected publications/media/events, signup request
- Admin pages: dashboard + governance modules + approval center
- Sensitive records: internal/restricted/confidential visibility flags

## Data model baseline
- Core entities already aligned in your direction (dioceses, majimbo, leadership, events, docs, access workflows).
- Keep generic support tables global:
  - `custom_fields`, `custom_field_values`
  - `status_labels`
  - `tags`, `entity_tags`
  - `file_uploads`, `notes`, `comments`
  - `approval_workflows`, `approval_steps`
  - `audit_logs`

## RLS strategy
- `anon`: public read-only tables + signup insert with strict role whitelist
- `authenticated`: scoped read by role/scope claims
- `chief_admin/super_admin`: approval + activation + archive + override actions
- Use JWT claims: `app_role`, `diocese_name`, `jimbo_name`, `branch_name`

## File storage structure (Supabase Storage)
- `branding/`
- `profiles/`
- `leadership-docs/`
- `institutions/`
- `publications/`
- `events/`
- `documents/official/`
- `documents/restricted/`
- `temp-uploads/`

## Migration roadmap (recommended)
1. Freeze current static modules as stable baseline.
2. Bootstrap React+TS app in `/app-next` or separate repo.
3. Port module shells + shared UI kit first.
4. Move one domain module at a time (Dayosisi -> Majimbo -> Leaders -> Members).
5. Keep Supabase schema backward-compatible.
6. Cut over route by route.

## Immediate deliverables already done in this workspace
- Phase 32: Invite/Promote/Permission Layers (premium admin)
- Phase 33: Dynamic public sign-up + pending registration admin table
- Supabase schema + RLS scripts for both workflows
- Sass foundation added for scalable styling migration

## Final recommendation
Ukitaka kufikia exactly “full-scale React/TS/Tailwind/shadcn/Framer” quality uliyoeleza, hatua bora ni:
- kuanzisha **new frontend scaffold** immediately,
- kutumia current JS modules kama domain reference,
- na kuhamisha modules kwa phased enterprise migration plan.
