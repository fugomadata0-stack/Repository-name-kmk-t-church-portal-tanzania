/**
 * =============================================================================
 * KIOLEZO LA supabase-config.js  (nakili faili hii → supabase-config.js)
 * Faili halisi iwe kwenye .gitignore; usiiweke kwenye umma / GitHub.
 * =============================================================================
 *
 * [ ] 1. Project Settings → API: nakala ya Project URL na anon / publishable key
 * [ ] 2. weka enabled: true (baada ya kujaza url + anonKey)
 * [ ] 3. Authentication → URL Configuration:
 *        Site URL:  http://localhost/KMT-CHURCH-TANZANIA-PORTAL/
 *        Redirects: ongeza localhost + tovuti ya uzalishaji
 * [ ] 4. SQL (mpangilio): phase33-signup-supabase.sql → phase33-password-validation-supabase.sql
 *        → phase33-signup-rls.sql → (hiari) phase33-auth-hooks-supabase.sql
 * [ ] 5. Desktop na XAMPP: endesha sync-to-xampp.ps1; nakili supabase-config.js pande zote mbili
 * [ ] 6. Jaribu: system-health.html → Run Supabase Check (Auth /health + jedwali)
 * [ ] 7. Dashibodi: beji “Supabase ✓” juu inathibitisha API handshake (phase3-supabase.js)
 *
 * Tatizo: “Invalid API key” → angalia nakala ya ufunguo; “Failed to fetch” → mtandao au URL.
 * =============================================================================
 */
window.KMT_SUPABASE_CONFIG = {
  url: "https://YOUR-PROJECT-REF.supabase.co",
  anonKey: "YOUR-ANON-OR-PUBLISHABLE-KEY",
  enabled: false,
};
