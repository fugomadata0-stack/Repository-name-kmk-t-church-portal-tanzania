# PHASE 32 Final Hardening Advice

## Status ya sasa (imekamilika)
- UI module complete: `admin-invite-promote.html`
- Logic + workflows complete: `phase32-invite-promote-main.js`
- Services + storage + DB sync: `phase32-invite-promote-services.js`
- Schema: `phase32-supabase-invite-promote.sql`
- RLS: `phase32-invite-promote-rls.sql`
- Dashboard + landing links integrated.

## Production deployment order
1. Run `phase16-security-rls.sql` (helper functions + security baseline).
2. Run `phase32-supabase-invite-promote.sql` (tables/indexes).
3. Run `phase32-invite-promote-rls.sql` (row-level policies).
4. Ensure JWT contains `app_role` claim for `current_app_role()` policies.
5. Test with users: chief_admin, super_admin, national_admin, admin.

## Security maboresho muhimu (priority high)
- **Server-side super slot lock:** add DB trigger/function kuhakikisha Super Admin slots <= 4 at all times.
- **Invite token hardening:** save hashed token in DB (not plain), set one-time consumption flag.
- **Approval integrity:** enforce status transition rules at DB layer (e.g. cannot move `Rejected -> Sent` directly).
- **Audit immutability:** restrict update/delete on critical audit rows; append-only policy.

## Workflow quality improvements
- Add `approved_at`, `rejected_at`, `cancelled_at`, `archived_at` columns for full timeline clarity.
- Add `requested_by_user_id` and `approved_by_user_id` (FK to auth/profile table).
- Add replacement linkage fields:
  - `replaced_assignment_id`
  - `new_assignment_id`
  - `task_transfer_mode`

## Notifications (next integration)
- Current in-app notifications are local+UI.
- Integrate channels:
  - Email (SMTP/Resend/SendGrid)
  - SMS/WhatsApp (Twilio/Africa's Talking)
- Queue notifications via server function to avoid client-side tampering.

## Performance & reliability
- Add pagination server-side for large tables (`limit/offset`).
- Add indexed search columns:
  - `lower(email)`, `status`, `submitted_at`, `assigned_level`.
- Add retry/backoff for network failures and optimistic UI rollback when write fails.

## Compliance / governance
- Keep role matrix policy document aligned with:
  - Chief authority boundaries
  - Super invite delegation settings
  - Temporary access expiry SLAs
- Add quarterly review report:
  - active elevated assignments
  - expired temporary access
  - rejected/approved ratio

## QA checklist (before go-live)
- [ ] Chief Admin can create Super Admin invite when slot available.
- [ ] Super Admin cannot create super invite unless setting is enabled.
- [ ] Slot full shows exact block message.
- [ ] Limited Office Admin cannot approve/reject/archive/expire actions.
- [ ] Temporary assignments auto-expire and are visible as `Imeisha Muda`.
- [ ] Realtime sync updates across two browser sessions.
- [ ] Audit logs capture all key actions.
- [ ] CSV export + print work on active assignments table.

## Recommended next sprint
- Build backend API/edge functions for:
  - signed invite acceptance endpoint
  - atomic approval + assignment write
  - replacement task transfer routine
  - notification queue processor
