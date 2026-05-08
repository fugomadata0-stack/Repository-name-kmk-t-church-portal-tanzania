# KMT Master Deployment Order

Tumia order hii ili kuunganisha modules zote bila conflict:

1. `phase10-supabase-national-core.sql`
2. `phase10-security-national-rls.sql`
3. `phase16-supabase-access-control.sql`
4. `phase16-security-rls.sql`
5. `phase31-supabase-elevated-access.sql` (Omba Ruhusa ya Juu / elevated requests + assignments + routing)
6. `phase31-elevated-access-rls.sql` (RLS ya elevated access — baada ya `phase16-security-rls.sql` kwa `current_app_role()`)
6b. `phase31-storage-elevated-letters.sql` (Storage bucket + sera za barua za maombi — baada ya Auth/RLS)
7. `phase17-super-admin-schema.sql`
8. `phase17-super-admin-rls.sql`
9. `phase-live-validation-schema.sql`
10. `phase-live-validation-rls.sql`
11. `phase21-docs-workflow-schema.sql`
12. `phase21-docs-workflow-rls.sql`

Baada ya SQL:

13. Weka `supabase-config.js`
   - `url`
   - `anonKey`
   - `enabled: true`

14. Login kupitia `auth-login.html`
15. Fungua `dashboard.html`
16. Nenda module ya `Usalama` (inaelekeza `access-control-workflow.html`)
17. Nenda module ya **Omba Ruhusa ya Juu** (`request-elevated-access.html`) kupitia menu au dashibodi
18. Nenda module ya `Logs` (inaelekeza `super-admin-control-center.html`)
19. Nenda `live-validation-center.html` kupitia `Open Live Validation`
20. Nenda `documents-approval-workflow.html` kupitia menu ya `Nyaraka Rasmi`
21. Validate checklist:
   - `final-quality-audit-checklist.md`
22. Rejea standards:
   - `phase-final-standards.js`
   - `FINAL_QUALITY_ENFORCEMENT_REPORT.md`
   - `PHASE31_ELEVATED_ACCESS_SETUP.md` (module ya Omba Ruhusa ya Juu)
