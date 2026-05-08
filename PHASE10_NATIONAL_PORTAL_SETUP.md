# PHASE 10 National Portal Setup

## Apply SQL in order
1. `phase10-supabase-national-core.sql`
2. `phase10-security-national-rls.sql`
3. `phase16-supabase-access-control.sql`
4. `phase16-security-rls.sql`

## Tables included (Supabase/PostgreSQL)
- `church_settings`
- `church_branding_assets`
- `hierarchy_levels`
- `hierarchy_nodes`
- `dayosisi`
- `dayosisi_leadership_positions`
- `dayosisi_leaders`
- `jimbo_types`
- `majimbo`
- `local_unit_types`
- `local_units`
- `national_leadership_positions`
- `national_leaders`
- `bishops`
- `pastors`
- `evangelists`
- `elders`
- `local_leaders`
- `deacons`
- `members`
- `families`
- `ministries`
- `ministry_categories`
- `fellowships`
- `fellowship_types`
- `departments`
- `department_categories`
- `choirs`
- `choir_categories`
- `catechism_classes`
- `catechism_students`
- `catechism_teachers`
- `partner_organizations`
- `global_affiliations`
- `institutions`
- `institution_types`
- `publications`
- `publication_categories`
- `media_posts`
- `media_categories`
- `events`
- `event_categories`
- `documents`
- `document_categories`
- `report_templates`
- `notification_templates`
- `user_roles`
- `permissions`
- `role_permissions`
- `approval_workflows`
- `approval_steps`
- `audit_logs`
- `tags`
- `entity_tags`
- `custom_fields`
- `custom_field_values`
- `status_labels`
- `addresses`
- `contacts`
- `file_uploads`
- `comments`
- `notes`

## Shared architecture features for major entities
- Custom fields (`custom_fields`, `custom_field_values`)
- Categories and types (entity columns + dedicated category/type tables)
- Tags (`tags`, `entity_tags`)
- File management (`file_uploads` + Supabase storage buckets)
- Notes (`notes`) and comments (`comments`)
- Audit trail (`audit_logs`)
- Visibility level (`visibility_level`)
- Status labels (`status_label_id`)

## Storage buckets configured
- `logos`
- `profile-photos`
- `documents`
- `certificates`
- `cv-files`
- `publications`
- `media`
- `event-files`
- `institution-files`
- `private-files`

## RLS strategy summary
- **Super Admin**: full read/write
- **National Admin**: broad national-level access
- **Office Admin**: strong operational admin access
- **Dayosisi Admin**: records scoped to assigned dayosisi
- **Jimbo Admin**: records scoped to assigned jimbo
- **Branch Admin**: records scoped to assigned branch
- **Executive Viewer**: read-focused leadership visibility
- **Public Viewer / anon**: only public records
- Confidential data protected through visibility + strict policies

## Seed data included
- KMT headquarters profile
- 6 dayosisi (Mara, Mwanza, Bunda, Dodoma, Dar es Salaam, Kigoma)
- Known majimbo samples
- Fellowship types: `JVKMKT`, `JWKMK`
- Department categories
- Institution categories
- Publication categories
- Event categories
- National leader sample: `MCH. SOSPITER MASAMAKI CHANGURU`

## UI polish coverage (Phase 10 target)
- Responsive layout and premium cards
- Enhanced empty states and loading skeleton hooks
- Confirmation modals and clean action naming
- Role-aware data messaging
- Consistent Kiswahili/English tone for official national portal

## Final enforcement artifacts
- `phase-final-standards.js`
- `FINAL_QUALITY_ENFORCEMENT_REPORT.md`
- `final-quality-audit-checklist.md`
