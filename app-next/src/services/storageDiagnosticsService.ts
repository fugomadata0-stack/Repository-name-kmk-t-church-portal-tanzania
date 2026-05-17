import { REQUIRED_MEDIA_BUCKETS, checkRequiredMediaBuckets, checkSupabaseMediaLink } from "./mediaHealthService";
import { getCachedAuthUserEmail, getCachedSession } from "../lib/authSessionCache";
import { getSupabaseProjectOrigin, validateSupabaseEnv } from "../lib/supabase";

export type StorageDiagnosticRow = {
  id: string;
  label: string;
  ok: boolean;
  message: string;
  hint?: string;
};

export type StorageDiagnosticsSnapshot = {
  checked_at: string;
  env_ok: boolean;
  env_message: string;
  project_origin: string;
  has_anon_key: boolean;
  auth_signed_in: boolean;
  auth_email: string | null;
  api_connectivity_ok: boolean;
  api_message: string;
  buckets_ok: boolean;
  missing_buckets: string[];
  rows: StorageDiagnosticRow[];
};

export async function fetchStorageDiagnostics(): Promise<StorageDiagnosticsSnapshot> {
  const env = validateSupabaseEnv();
  const origin = getSupabaseProjectOrigin();
  const anonPresent = Boolean(String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim());
  const rows: StorageDiagnosticRow[] = [];

  rows.push({
    id: "env",
    label: "Mazingira (VITE_SUPABASE_*)",
    ok: env.ok,
    message: env.ok ? "URL na funguo ya anon/publishable zime sanidiwa." : env.message,
    hint: env.ok ? undefined : "Weka app-next/.env.local au Vercel Environment Variables, kisha build/deploy upya.",
  });

  let authSignedIn = false;
  let authEmail: string | null = null;

  const cached = getCachedSession();
  authSignedIn = Boolean(cached);
  authEmail = getCachedAuthUserEmail();

  rows.push({
    id: "auth",
    label: "Kikao cha mtumiaji",
    ok: authSignedIn,
    message: authSignedIn ? `Umeingia kama ${authEmail ?? "mtumiaji"}.` : "Huna kikao — upakiaji unahitaji kuingia.",
    hint: authSignedIn ? undefined : "Ingia kwenye portal kisha jaribu upakiaji tena.",
  });

  const link = await checkSupabaseMediaLink();
  rows.push({
    id: "api",
    label: "Muunganisho wa API",
    ok: link.ok,
    message: link.message,
    hint: link.ok ? undefined : "Angalia URL ya mradi, funguo, na mtandao.",
  });

  const buckets = await checkRequiredMediaBuckets();
  rows.push({
    id: "buckets",
    label: "Buckets za media",
    ok: buckets.ok,
    message: buckets.ok
      ? `Buckets ${REQUIRED_MEDIA_BUCKETS.length} ziko tayari.`
      : `Buckets zinakosekana: ${buckets.missing.join(", ")}`,
    hint: buckets.ok ? undefined : "Endesha migrations za Supabase (storage buckets).",
  });

  return {
    checked_at: new Date().toISOString(),
    env_ok: env.ok,
    env_message: env.ok ? "Sawa" : env.message,
    project_origin: origin || "(haijaseti)",
    has_anon_key: anonPresent,
    auth_signed_in: authSignedIn,
    auth_email: authEmail,
    api_connectivity_ok: link.ok,
    api_message: link.message,
    buckets_ok: buckets.ok,
    missing_buckets: buckets.missing,
    rows,
  };
}
