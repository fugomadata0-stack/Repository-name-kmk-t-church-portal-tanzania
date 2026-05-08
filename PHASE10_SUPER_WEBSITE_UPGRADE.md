# KMT Super Website Upgrade Guide

Huu ni ushauri wa moja kwa moja wa kuifanya portal iwe **national-level, official, premium, trusted**.

## 1) UX & Trust Layer (High Impact, Fast)
- Ongeza `National Trust Bar` juu ya page: jina rasmi la kanisa, headquarters, na status ya mfumo.
- Ongeza `Last Updated` timestamp kwenye module headers zote.
- Tumia `empty states` zenye CTA wazi: *"Hakuna data bado - Bonyeza Add..."*.
- Buttons ziwe na consistency: `Add`, `Edit`, `Archive`, `Export PDF`, `Export Excel`, `Print`.

## 2) Performance Layer
- Lazy-load charts/modules nzito baada ya first paint.
- Compress images (especially media/gallery uploads) kabla ya upload.
- Cache filter options na static lookup data (`categories`, `types`, `roles`) kwa local storage.
- Tumia pagination + virtualized tables kwa datasets kubwa.

## 3) Security & Governance
- JWT claims ziwe na `app_role`, `dayosisi_id`, `jimbo_id`, `branch_id`.
- Kila write action iandike `audit_logs` (create/edit/archive/restore/delete/permission_change/file_upload).
- Sensitive fields ziwe `Restricted` kwa default (NIDA, confidential notes, family internals).
- Public pages zisome records zenye `visibility_level = 'Public'` tu.

## 4) Design Polish (Premium Feel)
- Tumia card elevation 3-levels: normal, hover, active.
- Add subtle motion: 120ms-220ms transitions, no aggressive bouncing.
- Unified color tokens:
  - Primary blue (governance)
  - Gold accent (official)
  - Emerald success
  - Red warning/error
- Typography consistency: heading strong, body readable, table compact.

## 5) Data Quality Workflows
- Add `Data Completeness Score` kwa modules kuu (Leadership, Members, Institutions).
- Add dashboard cards:
  - Incomplete profiles
  - Vacant positions
  - Terms expiring < 90 days
  - Pending approvals
- Add scheduled reports weekly/monthly with template presets.

## 6) Production Folder Structure (Recommended)
- `core/` shared utils, constants, formatters
- `modules/` each module files grouped together
- `services/` Supabase APIs per domain
- `styles/` global tokens + utilities
- `sql/` migrations + RLS + seeds

## 7) Immediate Next Sprint (Practical)
1. Wire live Supabase reads for `dioceses`, `majimbo`, `members`, `national_leaders`.
2. Replace mock save actions with real insert/update calls + optimistic UI.
3. Add global error boundary + retry button on every major page.
4. Add print-ready layouts per module (A4 clean mode).
5. Add Excel/PDF export adapter with same column config as table views.

---

Ukifuata hizi hatua, website itaonekana na kuhisi kama **official national church governance platform**, si local/basic site.
