# PHASE 20 - One-Command Deployment Runbook (Staging -> Production)

## Kusudi / Purpose
Huu ni mwongozo wa haraka wa kupeleka KMK(T) Portal live kwa utaratibu mmoja unaorudiwa (repeatable), salama, na wenye rollback plan.

Inatumika pamoja na:
- `PHASE20_PRODUCTION_DEPLOYMENT_PROMPT.md`
- `MASTER_DEPLOYMENT_ORDER.md`

---

## 1) Pre-Deploy Requirements

Kabala ya command kuu:
- `.env` values zipo (placeholders zimeshaondolewa kwa values halali kwenye mazingira husika).
- Supabase project imeandaliwa.
- DNS/domain records zimewekwa.
- Team approvals:
  - Tech lead sign-off
  - Security sign-off
  - Product/Church operations sign-off

---

## 2) One-Command Concept

Target command concept (placeholder):

`deploy:go-live`

Command hii inapaswa kufanya flow hii:
1. Lint + tests
2. Build frontend
3. Apply SQL migrations (ordered)
4. Deploy to staging
5. Run staging smoke validations
6. Promote to production
7. Run post-launch validations

---

## 3) Suggested Script Layout (Placeholder)

### package.json scripts (example pattern)
- `deploy:verify` -> lint + tests + env check
- `deploy:migrate` -> apply SQL order from `MASTER_DEPLOYMENT_ORDER.md`
- `deploy:staging` -> push build to staging hosting
- `deploy:prod` -> push build to production hosting
- `deploy:postcheck` -> run live validation checks
- `deploy:rollback` -> rollback to previous release
- `deploy:go-live` -> chain all above

Mfano wa chaining:
- `deploy:go-live = deploy:verify && deploy:migrate && deploy:staging && deploy:postcheck && deploy:prod && deploy:postcheck`

---

## 4) Deployment Flow SOP

### Step A - Verify
- Run verification command.
- Fail ikiwa:
  - tests fail
  - missing env vars
  - migration files not found

### Step B - Migrate
- Apply SQL in strict order.
- Capture migration log output.
- Stop immediately on SQL error.

### Step C - Staging Release
- Deploy artifact to staging.
- Run smoke checks:
  - auth routes
  - protected routes
  - role scope checks
  - Supabase read/write probes

### Step D - Production Release
- Promote same tested artifact to production.
- Enable monitoring alerts.

### Step E - Post-Launch Check
- Run Live Validation Center.
- Verify logs/alerts/dashboard data feed.

---

## 5) Go-Live Sign-off Template

Mark all as ✅ before final go-live:
- [ ] Auth flow confirmed
- [ ] Role/permissions confirmed
- [ ] Finance/payment flow confirmed
- [ ] Media/public-private separation confirmed
- [ ] Reports export confirmed
- [ ] Notifications confirmed
- [ ] Mobile responsiveness confirmed
- [ ] Monitoring + alerts active
- [ ] Rollback path tested

---

## 6) Rollback SOP (Emergency)

Trigger rollback when:
- login failures spike
- payment flow breaks
- severe permission leak
- repeated production 5xx errors

Rollback steps:
1. Enable maintenance mode toggle (if needed).
2. Re-deploy previous stable frontend artifact.
3. Disable risky feature flags.
4. Restore backup snapshot placeholder if data issue exists.
5. Re-run postcheck and reopen platform gradually.

---

## 7) Post-Launch 72-Hour Watch Plan

### Hour 0-2
- Continuous monitoring by Super Admin + technical owner.

### Hour 2-24
- Check error trend, auth failures, payment callbacks, media access patterns.

### Day 2-3
- Validate stability metrics and user feedback.
- Close go-live window with final report.

---

## 8) Cursor/Lovable Execution Prompt

Use this prompt when automating release:

1. Read deployment docs and verify env completeness.
2. Execute verify/build/test pipeline.
3. Apply SQL migrations in strict order.
4. Deploy staging and run smoke checks.
5. Promote to production only after green checks.
6. Run post-launch validation and generate report.
7. Keep rollback command ready until 72-hour stability window closes.

