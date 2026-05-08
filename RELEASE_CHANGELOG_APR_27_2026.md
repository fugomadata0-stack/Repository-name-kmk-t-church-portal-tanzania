# KMK(T) Portal Release Changelog
Date: 2026-04-27

## Completed Improvements

1. Supabase frontend config enabled in `supabase-config.js`.
2. Supabase scripts added to `admin-invite-promote.html`.
3. Login lock/attempt handling polished in `phase2.js`:
   - better lock messaging,
   - remaining attempts feedback,
   - expired lock auto-clear,
   - safer defaults.
4. Global auto-uppercase input behavior added in `global-back-button.js`:
   - all text inputs/textarea forced uppercase,
   - email fields excluded.
5. Data normalization at save-time in `phase4-structure-main.js`:
   - uppercase for text fields,
   - lowercase for email fields,
   - trimmed values.
6. Chief Admin full management permissions enabled across key modules:
   - `phase4-structure-main.js`
   - `phase5-leadership-hooks.js`
   - `phase5-leadership-services.js`
   - `phase6-members-hooks.js`
   - `phase6-members-main.js`
   - `phase7-ministries-hooks.js`
   - `phase7-ministries-main.js`
7. Auto-role suggestion by level added in `phase16-access-services.js`.
8. Auto-slot selection for assignment added in `phase16-access-services.js`.
9. Assign flow upgraded in `phase16-access-main.js`:
   - role auto-suggest with manual override,
   - modal-based user + role assignment,
   - saved format: `FULL_NAME (ROLE)`.
10. Supabase verification and go-live helper files added:
    - `supabase-live-verification.sql`
    - `supabase-emergency-bootstrap-phase31-32.sql`
    - `SUPABASE_FINAL_GO_LIVE_STEPS.md`

## Notes

- Node/npm/npx issue was resolved on environment side.
- Supabase skills package was installed successfully after Git availability fix.
- Final DB table live state depends on executing SQL in the correct Supabase project (`tjtsrirwdssocaplsfql`) and confirming verification results.
