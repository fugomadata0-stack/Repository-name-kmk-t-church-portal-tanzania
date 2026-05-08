# PHASE 21 Setup - Nyaraka Rasmi & Approval Workflow

## Goal
Kuandaa module ya `Nyaraka Rasmi & Approval Workflow` kwa live matumizi (Supabase + UI integration).

## Files za Module
- `documents-approval-workflow.html`
- `phase21-docs-workflow.css`
- `phase21-docs-workflow-hooks.js`
- `phase21-docs-workflow-services.js`
- `phase21-docs-workflow-main.js`
- `phase21-docs-workflow-schema.sql`
- `phase21-docs-workflow-rls.sql`

## SQL Apply Order (ongeza baada ya phase20/live-validation)
1. `phase21-docs-workflow-schema.sql`
2. `phase21-docs-workflow-rls.sql`

## Supabase Tables zinazotumika
- `documents`
- `document_templates`
- `approval_requests`
- `approval_steps`
- `document_versions`
- `document_archive`
- `document_audit_logs`

## Routing / Access
- Dashboard module label: `Nyaraka Rasmi`
- Page target: `documents-approval-workflow.html`
- Super Admin Control Center utility link pia ipo (`Open Nyaraka Workflow`)

## Validation Checklist
- [ ] Create document
- [ ] Submit for approval
- [ ] Approve/Reject flow
- [ ] Archive flow
- [ ] Template table loads
- [ ] Version history table loads
- [ ] Audit log insert works
- [ ] RLS role access works

## Notes
- Status badge colors zimeunganishwa na `phase-final-standards.js` kwa consistency ya mfumo mzima.
- Ikiwa Supabase haipo, module inaendelea na local fallback data bila ku-crash.
