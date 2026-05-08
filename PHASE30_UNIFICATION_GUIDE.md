# PHASE 30 - Unified National Platform

This phase unifies all existing modules into one consistent national church digital platform architecture.

## Core Deliverables

- Shared design system: `phase30-design-system.css`
- Shared reusable components: `components/app-components.js`
- Global role access and permission engine: `phase30-role-access.js`
- Supabase-ready architecture placeholder: `phase30-supabase-ready.js`
- Unified services entry and auth guard:
  - `services/index.js`
  - `services/auth-service.js`
- Reusable hooks:
  - `hooks/use-permissions.js`
  - `hooks/use-realtime-placeholder.js`
- Database type placeholder: `types/database.types.js`
- Environment variables example: `.env.example`
- Unified platform page:
  - `phase30-unified-platform.html`
  - `phase30-unified-main.js`

## Dayosisi Language Policy

- Use **Dayosisi** consistently in all user-facing strings.
- Avoid visible usage of the word "Dayosisi alternatives" in UI.

## Architecture Notes

- Route protection uses role checks (`services/auth-service.js` + `phase30-role-access.js`).
- Action permissions are centralized via `can(role, action)`.
- Realtime placeholders are prepared for future module subscriptions.
- RLS planning comments are included in `phase30-supabase-ready.js`.

## Production-readiness Checklist

- Consistent spacing, typography, cards, hero visuals, KPI frames, and table styles.
- Reusable add/edit/delete/view/export/print patterns.
- Loading, empty, error, and permission-denied states.
- Mobile-friendly layout and baseline accessibility semantics.
