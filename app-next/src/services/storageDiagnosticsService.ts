import type { StorageBucketHealthRow, StorageBucketHealthStatus } from "../lib/storageBucketProbe";
import { checkStorageBucketsSummary } from "../lib/storageBucketProbe";
import { ALL_STORAGE_BUCKET_NAMES } from "../lib/storageBuckets";
import { getCachedAuthUserEmail, getCachedSession } from "../lib/authSessionCache";
import { getSupabaseProjectOrigin, validateSupabaseEnv } from "../lib/supabase";
import { checkSupabaseMediaLink } from "./mediaHealthService";

export type StorageDiagnosticRow = {
  id: string;
  label: string;
  ok: boolean;
  status: StorageBucketHealthStatus | "ok" | "warn";
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
  bucket_rows: StorageBucketHealthRow[];
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
    status: env.ok ? "ok" : "warn",
    message: env.ok ? "URL na funguo ya anon/publishable zimesanidiwa." : env.message,
    hint: env.ok ? undefined : "Weka app-next/.env.local au Vercel Environment Variables, kisha build/deploy upya.",
  });

  const cached = getCachedSession();
  const authSignedIn = Boolean(cached);
  const authEmail = getCachedAuthUserEmail();

  rows.push({
    id: "auth",
    label: "Kikao cha mtumiaji",
    ok: authSignedIn,
    status: authSignedIn ? "ok" : "warn",
    message: authSignedIn ? `Umeingia kama ${authEmail ?? "mtumiaji"}.` : "Huna kikao — baadhi ya buckets za faragha zinaweza kuonekana tu baada ya kuingia.",
    hint: authSignedIn ? undefined : "Ingia kwenye portal kisha kagua tena.",
  });

  const link = await checkSupabaseMediaLink();
  rows.push({
    id: "api",
    label: "Muunganisho wa API",
    ok: link.ok,
    status: link.ok ? "ok" : "warn",
    message: link.message,
    hint: link.ok ? undefined : "Angalia URL ya mradi, funguo, na mtandao.",
  });

  const buckets = await checkStorageBucketsSummary(ALL_STORAGE_BUCKET_NAMES);
  const healthyCount = buckets.rows.filter((b) => b.status === "healthy").length;
  const setupCount = buckets.rows.filter((b) => b.status === "needs_setup").length;

  rows.push({
    id: "buckets",
    label: "Buckets za storage",
    ok: buckets.ok,
    status: buckets.ok ? "ok" : setupCount > 0 ? "warn" : "warn",
    message: buckets.ok
      ? `Buckets ${healthyCount}/${ALL_STORAGE_BUCKET_NAMES.length} ziko tayari.`
      : setupCount > 0
        ? `Buckets ${setupCount} zinahitaji usanidi kwenye Supabase.`
        : "Angalia orodha ya buckets hapa chini.",
    hint: buckets.ok ? undefined : "Endesha migrations za storage (npm run db:push:safe kutoka app-next).",
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
    bucket_rows: buckets.rows,
    rows,
  };
}
