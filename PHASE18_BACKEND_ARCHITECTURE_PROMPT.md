# PHASE 18 - Supabase Backend Architecture Prompt (Planning Only)

## Lengo Kuu / Primary Goal
Tengeneza muongozo wa backend architecture kwa Supabase kwa modules zote za `Phase 1` hadi `Phase 17` za KMK(T) Portal.

Muhimu:
- Hii ni **planning + schema architecture prompt**, sio kuweka secrets.
- Usihardcode `anon keys`, `service keys`, au credentials.
- Tumia comments na labels kwa muundo wa Kiswahili (70%) + English (30%).

---

## 1) Auth & Profiles

### Tables za msingi
- `profiles`
  - `id (uuid, fk -> auth.users.id)`
  - `full_name`, `email`, `phone`, `status`
  - `dayosisi_id`, `jimbo_id`, `tawi_id` (nullable by scope)
  - `created_at`, `updated_at`
- `user_roles`
  - `id`, `user_id`, `role_key`, `is_primary`, `created_at`
- `role_permissions`
  - `id`, `role_key`, `module_key`
  - `can_view`, `can_add`, `can_edit`, `can_delete`, `can_submit`, `can_approve`, `can_export`, `can_print`
  - `created_at`, `updated_at`

### Auth mapping
- Supabase Auth ndio source ya user identity.
- `profiles.id = auth.users.id`.
- JWT claims za scope:
  - `app_role`
  - `dayosisi_name`
  - `jimbo_name`
  - `branch_name`

---

## 2) Church Hierarchy (Muundo wa Kanisa)

### Tables
- `dayosisi` (`id`, `name`, `code`, `status`)
- `majimbo` (`id`, `dayosisi_id`, `name`, `code`, `status`)
- `matawi` (`id`, `jimbo_id`, `name`, `code`, `status`)
- `church_units`
  - generic unit registry kwa hierarchy ya extra units
  - `unit_level` (`Dayosisi|Jimbo|Tawi|Idara|Jumuiya|Kwaya|Taasisi`)
  - `parent_unit_id` self-reference

### Relationships
- `dayosisi 1 -> n majimbo`
- `majimbo 1 -> n matawi`
- `church_units` self hierarchy kwa muundo unaopanuka.

---

## 3) Leaders

### Tables
- `leaders`
- `leader_assignments`
- `leadership_history`

### Relationship
- `leaders 1 -> n leader_assignments`
- `leaders 1 -> n leadership_history`
- Assignment iweze ku-link na `dayosisi/jimbo/tawi/church_units`.

---

## 4) Members

### Tables
- `members`
- `member_families`
- `baptism_records`

### Relationship
- `member_families 1 -> n members` (family grouping)
- `members 1 -> n baptism_records` (history ya sakramenti)

---

## 5) Ministries

### Tables
- `ministries`
- `ministry_members`
- `ministry_leaders`
- `ministry_activities`

### Relationship
- `ministries 1 -> n ministry_members`
- `ministries 1 -> n ministry_leaders`
- `ministries 1 -> n ministry_activities`

---

## 6) Events + 7) Camps

### Tables
- `events`
- `camps`
- `event_participants`
- `camp_participants`

### Relationship
- `events 1 -> n event_participants`
- `camps 1 -> n camp_participants`

---

## 8) Attendance

### Tables
- `attendance_records`
- `attendance_items`

### Relationship
- `attendance_records 1 -> n attendance_items`
- `attendance_records` iwe na `record_type` (`service|meeting|ministry|event|camp`).

---

## 9) Finance

### Tables
- `finance_transactions`
- `finance_budgets`
- `finance_approvals`

### Strategy
- `finance_transactions.transaction_type` = `income|expense`.
- Approval separation: creator != approver.

---

## 10) Payments

### Tables
- `payment_transactions`
- `payment_verifications`
- `refund_requests`

### Relationship
- `payment_transactions 1 -> n payment_verifications`
- `payment_transactions 1 -> n refund_requests`

---

## 11) Media

### Tables
- `media_items`
- `media_categories`

### Strategy
- `media_items.visibility` (`public|internal|restricted`)
- public website isome public-only.

---

## 12) Communications

### Tables
- `notifications`
- `sms_campaigns`
- `email_campaigns`

### Strategy
- Target by `role`, `scope`, au `user_id`.
- Track status: `draft|scheduled|sent|failed`.

---

## 13) Reports

### Tables
- `reports_registry`
- `report_exports`

### Strategy
- `reports_registry` for metadata + approval stage.
- `report_exports` for generated files + download tracking.

---

## 14) Settings

### Table
- `system_settings` (core key-value/JSON blocks)

### Strategy
- optional split tables per domain (branding, security, backup) kama scale inahitaji.

---

## 15) Security

### Tables
- `security_alerts`
- (supports) auth guard tables from prior phases (login attempts, sessions, policy placeholders)

---

## 16) Monitoring / System Health

### Tables
- `system_health`
- `module_health`
- `error_logs`

### Strategy
- health snapshots + service/module status.
- error triage status: `open|monitoring|resolved`.

---

## 17) Logs / Audit

### Tables
- `audit_logs`
- `activity_logs`

### Strategy
- critical actions zote ziingie audit log.
- include `actor_user_id`, `actor_role`, `module`, `action`, `payload`, `created_at`.

---

## Storage Buckets Plan

Create buckets:
- `church-assets`
- `leader-photos`
- `member-photos`
- `documents`
- `media-videos`
- `media-audio`
- `reports`
- `camp-media`
- `backups-placeholder`

Bucket policy principle:
- Public media: read public, write restricted.
- Internal/confidential docs: read by scoped roles only.

---

## Role Scope Strategy (Mandatory)

- `super_admin` = global
- `admin` = configurable scope
- `askofu_mkuu` = national leadership scope
- `askofu_dayosisi` = assigned Dayosisi
- `mchungaji` = assigned Jimbo/Tawi
- `kiongozi_idara` = assigned ministry scope
- `finance_officer` = finance-limited scope
- `media_admin` = media-limited scope
- `member` = self/public limited scope

Implementation note:
- Role + scope yawe mapped kwenye `profiles` + `user_roles`.
- JWT claims zitumike kwa RLS enforcement.

---

## RLS Strategy Placeholder (By Module)

For each module:
- view own scope
- create within scope
- edit within scope
- approve only allowed roles
- read public vs internal media
- finance approval separation
- report export permissions

Global pattern:
- `SELECT`: scope-based or role-based.
- `INSERT/UPDATE/DELETE`: role + ownership + scope checks.
- Chief/Super admin override kwa audit-sensitive operations.

---

## Realtime Targets

Enable realtime kwa tables zifuatazo (priority):
- `notifications`
- `security_alerts`
- `system_health`
- `module_health`
- `error_logs`
- `payment_transactions` (optional operational feeds)

---

## Audit Strategy

- Log all critical actions:
  - role changes
  - approval/rejection
  - security events
  - finance/payment status changes
  - settings changes
- Store structured payload (`jsonb`) for forensic tracing.
- Keep immutable audit trail policy for high-risk modules.

---

## Seed Data Placeholders

Plan seeds (no secrets):
- roles and permission matrix
- sample hierarchy (`dayosisi`, `majimbo`, `matawi`)
- status labels for workflow
- default settings rows
- sample monitoring/system health rows
- sample media categories
- initial report templates metadata

---

## Final Prompt Output Contract (for implementation phase)

When generating SQL implementation from this plan:
1. Create tables with PK/FK/indexes.
2. Add constraints/checks by business rules.
3. Add RLS functions + policies by role/scope.
4. Add storage bucket policies.
5. Add seed placeholders only (no production secrets).
6. Add migration order document.

