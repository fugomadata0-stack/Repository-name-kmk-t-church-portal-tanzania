import { validateSupabaseEnv } from "../../lib/supabaseClient";

export function SettingsSupabaseBanner() {
  const v = validateSupabaseEnv();
  if (v.ok) return null;
  return (
    <div className="mb-4 rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
      <strong>Muunganisho wa Supabase hauwezi kuanza.</strong> {v.message} Weka thamani sahihi kwenye{" "}
      <code className="rounded bg-white px-1">app-next/.env.local</code> (<code className="rounded bg-white px-1">VITE_SUPABASE_URL</code>,{" "}
      <code className="rounded bg-white px-1">VITE_SUPABASE_ANON_KEY</code>), kisha anzisha upya dev server.
    </div>
  );
}
