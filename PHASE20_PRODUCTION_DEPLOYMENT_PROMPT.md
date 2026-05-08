# PHASE 20 - Production Deployment Prompt (Go-Live Readiness)

## Goal / Lengo
Tayarisha prompt ya mwisho ya kwenda production kwa KMT Church Tanzania Portal, kwa usalama na uthabiti wa kiwango cha juu.

Hii prompt ni kwa implementation ndani ya Cursor au Lovable:
- **Frontend hosting placeholder** (Vercel/Netlify style)
- **Backend** (Supabase)
- **Domain mapping**
- **Email provider placeholder**
- **SMS provider placeholder**
- **Payment provider placeholder**

Muhimu:
- Usihardcode secrets.
- Tumia environment variables.
- Kila sensitive value iwe placeholder only.

---

## 1) Environment Variables Structure

Tengeneza `.env.example` na mgawanyo huu:

### Public keys placeholders
- `NEXT_PUBLIC_APP_NAME=KMT_CHURCH_TANZANIA_PORTAL`
- `NEXT_PUBLIC_APP_ENV=production`
- `NEXT_PUBLIC_SUPABASE_URL=<SUPABASE_URL_PLACEHOLDER>`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY_PLACEHOLDER>`
- `NEXT_PUBLIC_PUBLIC_SITE_URL=<PUBLIC_SITE_URL_PLACEHOLDER>`

### Secret keys placeholders
- `SUPABASE_SERVICE_ROLE_KEY=<SUPABASE_SERVICE_ROLE_KEY_PLACEHOLDER>`
- `EMAIL_PROVIDER_API_KEY=<EMAIL_PROVIDER_API_KEY_PLACEHOLDER>`
- `SMS_PROVIDER_API_KEY=<SMS_PROVIDER_API_KEY_PLACEHOLDER>`
- `PAYMENT_PROVIDER_SECRET=<PAYMENT_PROVIDER_SECRET_PLACEHOLDER>`
- `WEBHOOK_SIGNING_SECRET=<WEBHOOK_SIGNING_SECRET_PLACEHOLDER>`

### Feature toggles placeholders
- `FEATURE_ENABLE_PAYMENTS=true`
- `FEATURE_ENABLE_SMS=true`
- `FEATURE_ENABLE_EMAIL=true`
- `FEATURE_ENABLE_LIVE_VALIDATION=true`
- `FEATURE_MAINTENANCE_MODE=false`

### Callback URLs placeholders
- `AUTH_REDIRECT_URL=<AUTH_REDIRECT_URL_PLACEHOLDER>`
- `PAYMENT_CALLBACK_URL=<PAYMENT_CALLBACK_URL_PLACEHOLDER>`
- `EMAIL_WEBHOOK_URL=<EMAIL_WEBHOOK_URL_PLACEHOLDER>`
- `SMS_WEBHOOK_URL=<SMS_WEBHOOK_URL_PLACEHOLDER>`

---

## 2) Build & Release

### Build steps
1. Install dependencies (`npm install`).
2. Run lint checks.
3. Run unit/integration tests placeholders.
4. Build frontend artifact (`npm run build`).
5. Run production preview smoke test.

### Test steps
- Auth flow test (login/reset/change password).
- Role scope test (super_admin/admin/askofu/mchungaji/etc).
- Core module smoke tests (members, leaders, ministries, finance, reports, media).
- Supabase connectivity + RLS smoke checks.

### Staging placeholder
- Deploy to staging URL placeholder first.
- Run live validation center in staging.
- Approve release only after sign-off checklist.

### Production release checklist
- Tag release version (`vX.Y.Z`).
- Apply SQL migrations in approved order.
- Deploy frontend.
- Verify domain + SSL + callbacks.
- Enable monitoring alerts.

---

## 3) Domain & SSL

### Domain mapping
- `portal.<domain>` -> protected dashboard app
- `www.<domain>` / `<domain>` -> public website

### www redirect
- Force canonical domain redirect (single source URL).

### HTTPS enforcement
- Redirect all HTTP -> HTTPS.
- HSTS placeholder (`Strict-Transport-Security`).

### Security headers placeholder
- `Content-Security-Policy` placeholder
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy` placeholder

---

## 4) Storage & Media

### Bucket review
Review buckets:
- `church-assets`
- `leader-photos`
- `member-photos`
- `documents`
- `media-videos`
- `media-audio`
- `reports`
- `camp-media`
- `backups-placeholder`

### Public/private access review
- Public media only kwenye public routes.
- Internal/restricted media iwe role + scope protected.

### CDN placeholder
- Attach CDN for static/media delivery (provider placeholder).

### Media optimization placeholder
- Image compression pipeline placeholder.
- Video transcoding/thumbnail placeholder.

---

## 5) Database & Backups

### Migration strategy
- Run migrations sequentially using `MASTER_DEPLOYMENT_ORDER.md`.
- Migration run logs zihifadhiwe.
- Stop deploy if critical SQL step fails.

### Seed strategy
- Seed placeholder data for roles, statuses, settings.
- Avoid production sensitive personal seed data.

### Backup schedule
- Daily automated backup.
- Weekly full snapshot.
- Monthly retention review.

### Restore test placeholder
- Perform restore drill on staging at planned interval.
- Document RTO/RPO placeholders.

---

## 6) Monitoring & Logs

### Error tracking placeholder
- Connect app error tracking provider placeholder.
- Capture frontend + backend exceptions.

### Uptime checks placeholder
- Health endpoint checks every interval placeholder.
- Alert on downtime and latency spikes.

### Audit verification
- Verify `audit_logs`, `activity_logs`, `system_audit_logs` ingestion.
- Ensure critical actions are logged.

### Admin alerts
- Route alerts to Super Admin channels:
  - email placeholder
  - SMS placeholder
  - in-app alerts

---

## 7) Go-Live Checklist

### Auth validation
- Login, logout, forgot/reset/change password validated.
- Session timeout + lockout behavior validated.

### Permissions validation
- Role scope access validated for all major roles.
- Protected routes block unauthorized users.

### Finance validation
- Finance transactions + approvals + reports verified.
- Payment callbacks tested with sandbox placeholder.

### Media validation
- Upload/access rules validated by visibility level.
- Public media route returns only allowed content.

### Reports validation
- Report generation/export/print flows validated.

### Notifications validation
- In-app notifications working.
- Email/SMS provider placeholders verified in integration mode.

### Mobile responsiveness validation
- Dashboard and key modules tested on mobile breakpoints.

---

## 8) Rollback Checklist

### Rollback build
- Keep previous stable frontend artifact ready.
- One-command rollback path placeholder.

### Revert migrations placeholder
- Use reversible migrations where possible.
- If not reversible: restore from backup snapshot.

### Disable new features
- Use feature toggles to disable risky modules quickly.

### Restore backup placeholder
- Trigger restore runbook.
- Validate critical data integrity post-restore.

---

## 9) Post-Launch Validation (First 24-72 Hours)

- Run Live Validation Center after go-live.
- Check auth success/failure rates.
- Monitor error trends + payment/webhook health.
- Verify report exports and scheduled jobs.
- Confirm audit logs are complete and readable.
- Conduct user acceptance pass with Super Admin team.

---

## Implementation Prompt (Cursor/Lovable Ready)

Tumia prompt hii kutekeleza production deployment workflow:
1. Prepare `.env.example` with placeholder keys only.
2. Configure staging + production pipelines.
3. Apply SQL migrations in approved order.
4. Configure domain/SSL/security headers placeholders.
5. Validate storage bucket policies and access separation.
6. Enable monitoring, logs, and admin alerts.
7. Execute go-live checklist and capture sign-off.
8. Keep rollback plan active until stability window passes.

Acceptance criteria:
- System is live on HTTPS domain.
- Supabase integration stable.
- Role + scope permissions verified.
- Monitoring/alerts active.
- Rollback path documented and tested (placeholder drill).
