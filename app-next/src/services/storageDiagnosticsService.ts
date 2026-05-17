import type { StorageBucketHealthRow, StorageBucketHealthStatus } from "../lib/storageBucketProbe";
import { checkStorageBucketsSummary } from "../lib/storageBucketProbe";
import { ALL_STORAGE_BUCKET_NAMES } from "../config/storageBuckets";
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
  overall_ok: boolean;
  env_ok: boolean;
  env_message: string;
  project_origin: string;
  project_mismatch_note: string;
  has_anon_key: boolean;
  auth_signed_in: boolean;
  auth_email: string | null;
  api_connectivity_ok: boolean;
  api_message: string;
  buckets_ok: boolean;
  buckets_healthy_count: number;
  buckets_needs_setup_count: number;
  buckets_permission_limited_count: number;
  buckets_unknown_count: number;
  missing_buckets: string[];
  bucket_rows: StorageBucketHealthRow[];
  rows: StorageDiagnosticRow[];
};

const PROJECT_MISMATCH_NOTE =
  "Buckets zinaweza kuonekana Unknown au Needs Setup ikiwa VITE_SUPABASE_URL / ANON_KEY zinaelekeza mradi tofauti wa Supabase.";

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
    message: authSignedIn
      ? `Umeingia kama ${authEmail ?? "mtumiaji"}.`
      : "Huna kikao — buckets za faragha zinaweza kuonekana tu baada ya kuingia (si hitilafu ya storage).",
    hint: authSignedIn ? undefined : "Ingia kwenye portal kisha kagua tena.",
  });

  const [link, buckets] = await Promise.all([
    checkSupabaseMediaLink(),
    checkStorageBucketsSummary(ALL_STORAGE_BUCKET_NAMES),
  ]);

  rows.push({
    id: "api",
    label: "Muunganisho wa API",
    ok: link.ok,
    status: link.ok ? "ok" : "warn",
    message: link.message,
    hint: link.ok ? undefined : "Angalia URL ya mradi, funguo, na mtandao.",
  });

  const healthyCount = buckets.rows.filter((b) => b.status === "healthy").length;
  const setupCount = buckets.rows.filter((b) => b.status === "needs_setup").length;
  const permCount = buckets.rows.filter((b) => b.status === "permission_limited").length;
  const unknownCount = buckets.rows.filter((b) => b.status === "unknown").length;

  rows.push({
    id: "buckets",
    label: "Buckets za storage",
    ok: buckets.ok,
    status: buckets.ok ? "ok" : setupCount > 0 ? "warn" : permCount > 0 || unknownCount > 0 ? "warn" : "ok",
    message: buckets.ok
      ? `Buckets ${healthyCount}/${ALL_STORAGE_BUCKET_NAMES.length} ziko tayari.`
      : setupCount > 0
        ? `Buckets ${setupCount} zinahitaji usanidi kwenye Supabase.`
        : permCount > 0
          ? `Buckets ${permCount} zina ruhusa mdogo (zinaweza bado kufanya kazi).`
          : "Angalia orodha ya buckets hapa chini.",
    hint: buckets.ok ? undefined : "Endesha migrations za storage (npm run db:push:safe kutoka app-next).",
  });

  const overallOk = env.ok && link.ok && buckets.ok;

  return {
    checked_at: new Date().toISOString(),
    overall_ok: overallOk,
    env_ok: env.ok,
    env_message: env.ok ? "Sawa" : env.message,
    project_origin: origin || "(haijaseti)",
    project_mismatch_note: PROJECT_MISMATCH_NOTE,
    has_anon_key: anonPresent,
    auth_signed_in: authSignedIn,
    auth_email: authEmail,
    api_connectivity_ok: link.ok,
    api_message: link.message,
    buckets_ok: buckets.ok,
    buckets_healthy_count: healthyCount,
    buckets_needs_setup_count: setupCount,
    buckets_permission_limited_count: permCount,
    buckets_unknown_count: unknownCount,
    missing_buckets: buckets.missing,
    bucket_rows: buckets.rows,
    rows,
  };
}
