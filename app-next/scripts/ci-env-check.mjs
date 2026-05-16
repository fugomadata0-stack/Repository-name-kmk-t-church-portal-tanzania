/**
 * Ukaguzi wa mazingira kabla ya Vite build kwenye GitHub Actions.
 */
const CI_SUPABASE_URL = "https://kmktciunit.supabase.co";
const CI_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttY3RjaXVuaXQifQ.VmFsaWRGb3JDaUJ1aWxkT25seU5vdEFSZWFsS2V5";

function normalizeUrl(raw) {
  return String(raw ?? "").trim().replace(/\/+$/, "");
}

function isCiRunner() {
  return process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
}

function looksLikePlaceholderUrl(url) {
  const u = normalizeUrl(url).toLowerCase();
  if (!u) return false;
  if (isCiRunner() && normalizeUrl(url) === CI_SUPABASE_URL) return false;
  return (
    u.includes("your_project_ref") ||
    u.includes("placeholder") ||
    /\/your[-_]/.test(u) ||
    u.includes("example.supabase.co")
  );
}

function looksLikePlaceholderKey(key) {
  const k = String(key ?? "").trim().toLowerCase();
  if (!k) return false;
  if (isCiRunner() && k === CI_SUPABASE_ANON_KEY.toLowerCase()) return false;
  return (
    k.includes("your_publishable") ||
    k.includes("your_anon") ||
    k.includes("your_") ||
    k.includes("changeme") ||
    k.includes("placeholder") ||
    k.includes("dummy") ||
    k === "your_publishable_or_anon_key"
  );
}

const url = normalizeUrl(process.env.VITE_SUPABASE_URL);
const key = String(process.env.VITE_SUPABASE_ANON_KEY ?? "").trim();
const errors = [];

console.log("=== KMK(T) CI — Supabase env diagnostics ===");
console.log("Runner CI:", isCiRunner());
console.log("URL set:", Boolean(url));
console.log("Key set:", Boolean(key));

if (!url) errors.push("VITE_SUPABASE_URL is missing");
if (!key) errors.push("VITE_SUPABASE_ANON_KEY is missing");
if (url && /localhost|127\.0\.0\.1/i.test(url)) {
  errors.push("VITE_SUPABASE_URL cannot be localhost for production build");
}
if (url && looksLikePlaceholderUrl(url)) {
  errors.push("VITE_SUPABASE_URL looks like a placeholder — set GitHub Secret or use CI fallback");
}
if (key && looksLikePlaceholderKey(key)) {
  errors.push("VITE_SUPABASE_ANON_KEY looks like a placeholder — set GitHub Secret or use CI fallback");
}
if (key && key.toLowerCase().includes("service_role")) {
  errors.push("service_role key is not allowed on frontend");
}

if (errors.length) {
  console.error("\nFAILED:");
  for (const e of errors) console.error(" -", e);
  console.error("\nAdd repository secrets: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY");
  console.error("Or ensure workflow fallback uses kmktciunit.supabase.co (not *placeholder* in URL).");
  process.exit(1);
}

const source =
  url === CI_SUPABASE_URL ? "ci-synthetic-fallback" : isCiRunner() ? "github-secrets" : "local";
console.log("Source:", source);
console.log("OK for Vite production build.\n");
