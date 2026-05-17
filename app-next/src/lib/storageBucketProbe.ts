/**
 * Uchunguzi wa bucket kwa browser — USITUMIE storage.listBuckets()
 * (inahitaji service_role; anon key → false-negative "Buckets hazipo").
 */
import {
  ALL_STORAGE_BUCKET_NAMES,
  STORAGE_BUCKET_REGISTRY,
  type StorageBucketName,
} from "../config/storageBuckets";
import { getSupabase, validateSupabaseEnv } from "./supabaseClient";

export type StorageBucketHealthStatus =
  | "healthy"
  | "needs_setup"
  | "checking"
  | "unknown"
  | "permission_limited";

export type StorageBucketHealthRow = {
  name: StorageBucketName | string;
  label: string;
  status: StorageBucketHealthStatus;
  message: string;
  setupHint?: string;
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function isStorageObjectNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { message?: string; error?: string };
  const msg = norm(String(e.message ?? ""));
  const errField = norm(String(e.error ?? ""));
  if (errField === "not_found" || errField === "object not found") return true;
  return (
    msg.includes("object not found") ||
    (msg.includes("not found") && !msg.includes("bucket")) ||
    msg.includes("no such key") ||
    msg.includes("the resource was not found")
  );
}

/** Bucket haipo kwenye mradi — ujumbe mahsusi tu (si 404 ya object). */
export function isStorageBucketNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (isStorageObjectNotFoundError(error)) return false;
  const e = error as { message?: string; error?: string };
  const msg = norm(String(e.message ?? ""));
  const errField = norm(String(e.error ?? ""));
  return (
    errField === "bucket not found" ||
    msg.includes("bucket not found") ||
    msg.includes("bucket does not exist") ||
    (msg.includes("not found") && msg.includes("bucket"))
  );
}

function isAccessRestrictedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { message?: string; statusCode?: string | number; status?: string | number };
  const msg = norm(String(e.message ?? ""));
  const code = String(e.statusCode ?? e.status ?? "");
  if (code === "403" || code === "401") return true;
  return (
    msg.includes("row-level security") ||
    msg.includes("permission") ||
    msg.includes("not allowed") ||
    msg.includes("policy") ||
    msg.includes("jwt") ||
    msg.includes("unauthorized") ||
    msg.includes("forbidden")
  );
}

function isNetworkOrTransientError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const msg = norm(String((error as { message?: string }).message ?? ""));
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("aborted")
  );
}

const SETUP_HINT =
  "Endesha migrations za storage kutoka app-next: npm run db:push:safe — kisha onyesha upya. Hakikisha VITE_SUPABASE_* inaelekeza mradi sahihi.";

const PROJECT_MISMATCH_HINT =
  "Buckets zinaweza kuonekana Unknown/Needs Setup ikiwa frontend imeunganishwa na mradi tofauti wa Supabase.";

function healthyRow(bucket: string, label: string, message: string): StorageBucketHealthRow {
  return { name: bucket, label, status: "healthy", message };
}

function permissionLimitedRow(bucket: string, label: string, message: string): StorageBucketHealthRow {
  return { name: bucket, label, status: "permission_limited", message };
}

async function probeBucketViaMissingObject(
  c: NonNullable<ReturnType<typeof getSupabase>>,
  bucket: string,
): Promise<"healthy" | "needs_setup" | "permission_limited" | "unknown"> {
  const probeKey = `.kmkt-bucket-probe-${Date.now()}`;
  const { error } = await c.storage.from(bucket).download(probeKey);
  if (!error) return "healthy";
  if (isStorageObjectNotFoundError(error)) return "healthy";
  if (isStorageBucketNotFoundError(error)) return "needs_setup";
  if (isAccessRestrictedError(error)) return "permission_limited";
  if (isNetworkOrTransientError(error)) return "unknown";
  return "unknown";
}

function supabaseNotReadyRow(bucket: string, label: string): StorageBucketHealthRow {
  return {
    name: bucket,
    label,
    status: "unknown",
    message: "Supabase haijasanidiwa au mteja hauko tayari.",
    setupHint: "Weka VITE_SUPABASE_URL na VITE_SUPABASE_ANON_KEY, kisha build/deploy upya.",
  };
}

/**
 * Jaribu list + download probe — usiseme bucket haipo bila uthibitisho mara mbili.
 */
export async function probeStorageBucket(bucket: string): Promise<StorageBucketHealthRow> {
  const meta = STORAGE_BUCKET_REGISTRY[bucket as StorageBucketName];
  const label = meta?.label ?? bucket;

  const env = validateSupabaseEnv();
  if (!env.ok) {
    return {
      name: bucket,
      label,
      status: "unknown",
      message: env.message,
      setupHint: PROJECT_MISMATCH_HINT,
    };
  }

  const c = getSupabase();
  if (!c) return supabaseNotReadyRow(bucket, label);

  const { error: listError } = await c.storage.from(bucket).list("", { limit: 1 });

  if (!listError) {
    return healthyRow(bucket, label, "Bucket inapatikana na inaweza kusomwa.");
  }

  if (isAccessRestrictedError(listError) || isStorageObjectNotFoundError(listError)) {
    return permissionLimitedRow(
      bucket,
      label,
      "Bucket inaonekana ipo; orodha imezuiwa na ruhusa (RLS). Upakiaji unaweza kuendelea ikiwa una haki.",
    );
  }

  if (isNetworkOrTransientError(listError)) {
    return {
      name: bucket,
      label,
      status: "unknown",
      message: "Ukaguzi haujakamilika (mtandao au muda). Bucket haijatolewa kuwa haipo.",
      setupHint: PROJECT_MISMATCH_HINT,
    };
  }

  const viaDl = await probeBucketViaMissingObject(c, bucket);

  if (viaDl === "healthy") {
    return healthyRow(bucket, label, "Bucket ipo na inaweza kutumika.");
  }

  if (viaDl === "permission_limited") {
    return permissionLimitedRow(
      bucket,
      label,
      "Bucket inaonekana ipo; ukaguzi mdogo umezuiwa na ruhusa.",
    );
  }

  if (viaDl === "needs_setup" && isStorageBucketNotFoundError(listError)) {
    return {
      name: bucket,
      label,
      status: "needs_setup",
      message: "Bucket haijapatikana kwenye mradi huu wa Supabase.",
      setupHint: SETUP_HINT,
    };
  }

  if (viaDl === "needs_setup") {
    return {
      name: bucket,
      label,
      status: "needs_setup",
      message: "Bucket haijapatikana kwenye mradi huu wa Supabase.",
      setupHint: SETUP_HINT,
    };
  }

  return {
    name: bucket,
    label,
    status: "unknown",
    message: "Hali haijulikani — bucket haijathibitishwa kuwa haipo.",
    setupHint: PROJECT_MISMATCH_HINT,
  };
}

export async function probeStorageBuckets(
  buckets: readonly string[] = ALL_STORAGE_BUCKET_NAMES,
): Promise<StorageBucketHealthRow[]> {
  const unique = [...new Set(buckets.map((b) => b.trim()).filter(Boolean))];
  return Promise.all(unique.map((b) => probeStorageBucket(b)));
}

export async function checkStorageBucketsSummary(buckets?: readonly string[]): Promise<{
  ok: boolean;
  missing: string[];
  rows: StorageBucketHealthRow[];
}> {
  const rows = await probeStorageBuckets(buckets);
  const missing = rows.filter((r) => r.status === "needs_setup").map((r) => String(r.name));
  return { ok: missing.length === 0, missing, rows };
}
