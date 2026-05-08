# PHASE 19 - Frontend Integration Prompt (Unified System)

## Goal
Unganisha frontend ya `Phase 1` hadi `Phase 18` kuwa mfumo mmoja wenye app shell, routing, shared components, shared data flow, na role-aware access.

Hii ni implementation prompt ya frontend architecture (planning + execution guide), sio kuweka secrets.

---

## Global Design Rules (Lazima)

- Language mix: Kiswahili 70% + English 30%.
- Tumia neno `Dayosisi` consistently.
- Colors za msingi:
  - Blue
  - Navy
  - Gold
  - White
  - Soft Ivory
- UI tone:
  - premium enterprise church style
  - modern glow
  - glassmorphism
  - animated hero where needed
- Keep visual zones:
  - Jesus image area
  - Bible image area
  - Church image area

---

## 1) App Layout Shell

Implement shared shell:
- `AppShell`
  - `AppSidebar`
  - `AppTopbar`
  - `main content outlet`
  - global toast area
  - confirm modal root
  - drawer root

Shell behavior:
- responsive collapse/expand sidebar
- sticky topbar
- role badge and data mode badge (Mock/Supabase)
- notification quick panel placeholder

---

## 2) Route Structure

Use route groups:

1. Public routes
- `/`
- `/about`
- `/news`
- `/media/public`
- `/contact`

2. Auth routes
- `/auth/login`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/auth/change-password`

3. Protected dashboard routes
- `/dashboard`
- `/dashboard/leadership`
- `/dashboard/members`
- `/dashboard/ministries`
- `/dashboard/events`
- `/dashboard/attendance`
- `/dashboard/finance`
- `/dashboard/payments`
- `/dashboard/media`
- `/dashboard/comms`
- `/dashboard/reports`
- `/dashboard/settings`
- `/dashboard/security`

4. Admin-only routes
- `/dashboard/settings/system`
- `/dashboard/settings/security`
- `/dashboard/reports/admin`

5. Super-admin-only routes
- `/dashboard/control-center`
- `/dashboard/live-validation`
- `/dashboard/security/access-control`

6. Shared report routes
- `/reports/official/:id`
- `/reports/export-history`

7. Public media routes
- `/media/public/:slug`

---

## 3) Protected Routes + Role-Aware Navigation

### Guard layers
- `RequireAuth`
- `RequireRole`
- `RequireScope`
- `PermissionGuard`

### Scope rules
- super_admin: global
- admin: configurable scope
- askofu_mkuu: national scope
- askofu_dayosisi: assigned Dayosisi
- mchungaji: assigned Jimbo/Tawi
- kiongozi_idara: assigned ministry scope
- finance_officer: finance modules only
- media_admin: media modules only
- member: self/public limited

### Navigation strategy
- Sidebar menu items rendered by `canView(moduleKey, role, scope)`.
- Hidden routes should not appear in nav.
- Direct URL access still passes through guards.

---

## 4) Shared Components Library

Build reusable components:
- `AppSidebar`
- `AppTopbar`
- `HeroBanner`
- `GradientKpiCard`
- `PremiumTable`
- `FilterToolbar`
- `SearchInput`
- `StatusBadge`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `ConfirmDeleteModal`
- `DrawerForm`
- `RoleBadge`
- `PermissionGuard`
- `ExportMenu`
- `ChartCard`
- `FileUploadCard`
- `MediaCard`

Component standards:
- consistent spacing, border radius, glow
- status color mapping centralized
- accessibility baseline (`aria-label`, keyboard focus)

---

## 5) Shared Systems

### Shared table system
- single `PremiumTable` API:
  - columns config
  - sorting
  - filtering
  - pagination
  - row actions
  - bulk selection

### Shared modal/drawer system
- `modalStore` / `drawerStore` for global open-close state.

### Shared filter bars
- `FilterToolbar` with slots:
  - search
  - select filters
  - date range
  - action buttons

### Shared KPI cards
- gradient variants (`blue/navy/gold/...`) and icon slots.

### Shared chart wrappers
- `ChartCard` wraps chart library (line, bar, doughnut, radar).

### Shared empty/loading/error states
- one unified design pattern across all modules.

### Shared export buttons
- `ExportMenu` supports CSV/PDF/Print (adapter-driven).

---

## 6) Data Flow Architecture

Use this pipeline:

`UI -> service layer -> Supabase-ready adapters -> state hooks -> components`

### Layer roles
1. **UI components**
- pure display + event callbacks

2. **State hooks**
- `useModuleData`, `useFilters`, `usePagination`, `usePermissions`

3. **Service layer**
- business logic and transformations

4. **Supabase adapters**
- select/insert/update/delete calls
- safe client wrapper
- fallback handling

5. **Mock data layer**
- same interface as Supabase adapters
- used in offline/dev mode

---

## 7) Shared Service Layer Structure

Recommended structure:

- `services/core/`
  - `integration-core` (safeAsync/getSafeSupabase/error logging)
  - `auth-service`
  - `permission-service`
- `services/modules/`
  - `leadership-service`
  - `members-service`
  - `ministries-service`
  - `events-service`
  - `attendance-service`
  - `finance-service`
  - `payments-service`
  - `media-service`
  - `comms-service`
  - `reports-service`
  - `settings-service`
  - `security-service`
  - `monitoring-service`

All services lazima ziwe na:
- `loadData()`
- `save(entity)`
- `delete(id)`
- `clear()` (if allowed by role)
- `logActivity()`

---

## 8) Shared Hooks Layer

Create hooks:
- `useAuthSession`
- `useRoleScope`
- `usePermissionGuard`
- `useStatusTheme`
- `useTableState`
- `useModuleSummaryKpis`
- `useLiveValidation`

Hooks ziwe framework-agnostic kwa logic, UI layer ichukue output only.

---

## 9) Shared Theme Tokens

Define tokens:
- colors (`blue`, `navy`, `gold`, `white`, `soft-ivory`)
- gradients
- shadows/glow
- border radius
- spacing scale
- typography scale
- status colors

Tokens zitumike uniformly kwenye cards, tables, hero, modals, drawers.

---

## 10) Shared Animation System

Animation rules:
- subtle entrance fades/slides
- hover glow on KPI cards
- smooth table row highlight
- modal/drawer transitions
- hero ambient motion (non-distracting)

Respect accessibility:
- support reduced motion preference.

---

## 11) Integration Rollout Plan (Step-by-step)

1. Create shared shell + route groups.
2. Move existing module pages under protected routes.
3. Introduce permission guards and role-aware nav.
4. Replace repeated table UIs with `PremiumTable`.
5. Standardize states (loading/empty/error).
6. Migrate module logic to shared service/hook layers.
7. Connect Supabase adapters with fallback mock layer.
8. Final QA: role scope checks + cross-module navigation + export flows.

---

## 12) Output Contract for Implementation

When implementing this prompt:
- preserve existing module behavior first
- refactor incrementally module-by-module
- no hardcoded production secrets
- keep Supabase config external
- enforce consistent bilingual labels
- keep public vs admin boundary strict

