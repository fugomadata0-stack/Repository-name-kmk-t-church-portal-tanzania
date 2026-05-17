/**
 * Uchunguzi wa bucket kwa mteja wa browser — USITUMIE storage.listBuckets()
 * (inahitaji service_role; anon key inarudisha tupu/error → false-negative).
 */
import { getSupabase } from "./supabaseClient";
import {
  ALL_STORAGE_BUCKET_NAMES,
  STORAGE_BUCKET_REGISTRY,
  type StorageBucketName,
} from "./storageBuckets";

export type StorageBucketHealthStatus = "healthy" | "needs_setup" | "restricted" | "unknown";

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

/** Faili halipo ndani ya bucket — bucket yenyewe ipo. */
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

/** Bucket haipo kwenye mradi — tumia ujumbe mahsusi tu (si 404 ya object). */
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

const SETUP_HINT =
  "Endesha migrations za storage kutoka app-next: npm run db:push:safe — kisha onyesha upya ukurasa huu.";

function healthyRow(bucket: string, label: string, message: string): StorageBucketHealthRow {
  return { name: bucket, label, status: "healthy", message };
}

/** Jaribu download ya faili isiyopo — tofautisha bucket vs object. */
async function probeBucketViaMissingObject(
  c: NonNullable<ReturnType<typeof getSupabase>>,
  bucket: string,
): Promise<"healthy" | "needs_setup" | "ambiguous"> {
  const probeKey = `.kmkt-bucket-probe-${Date.now()}`;
  const { error } = await c.storage.from(bucket).download(probeKey);
  if (!error) return "healthy";
  if (isStorageObjectNotFoundError(error)) return "healthy";
  if (isStorageBucketNotFoundError(error)) return "needs_setup";
  if (isAccessRestrictedError(error)) return "healthy";
  return "ambiguous";
}

/**
 * Jaribu list('') kisha download probe — epuka false-negative kwa moduli za media.
 */
export async function probeStorageBucket(bucket: string): Promise<StorageBucketHealthRow> {
  const meta = STORAGE_BUCKET_REGISTRY[bucket as StorageBucketName];
  const label = meta?.label ?? bucket;
  const c = getSupabase();
  if (!c) {
    return {
      name: bucket,
      label,
      status: "unknown",
      message: "Supabase haijasanidiwa (VITE_SUPABASE_URL / funguo).",
      setupHint: "Weka app-next/.env.local kulingana na mradi wa Supabase, kisha build/deploy upya.",
    };
  }

  const { error: listError } = await c.storage.from(bucket).list("", { limit: 1 });

  if (!listError) {
    return healthyRow(bucket, label, "Bucket inapatikana na inaweza kusomwa.");
  }

  if (isStorageBucketNotFoundError(listError)) {
    const viaDl = await probeBucketViaMissingObject(c, bucket);
    if (viaDl === "needs_setup") {
      return {
        name: bucket,
        label,
        status: "needs_setup",
        message: "Bucket haijapatikana kwenye mradi huu wa Supabase.",
        setupHint: SETUP_HINT,
      };
    }
    if (viaDl === "healthy") {
      return healthyRow(bucket, label, "Bucket ipo (orodha ilizuiliwa lakini storage inafanya kazi).");
    }
  }

  if (isAccessRestrictedError(listError) || isStorageObjectNotFoundError(listError)) {
    return healthyRow(bucket, label, "Bucket ipo; orodha inaweza kuzuiliwa na RLS.");
  }

  const viaDl = await probeBucketViaMissingObject(c, bucket);
  if (viaDl === "healthy") {
    return healthyRow(bucket, label, "Bucket ipo na inaweza kutumika.");
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

  // Chaguo salama: usionyeshe onyo la bucket kwenye moduli ikiwa haijulikani
  return healthyRow(
    bucket,
    label,
    "Bucket inachukuliwa kuwa tayari (ukaguzi haukuweza kuthibitisha kwa uhakika).",
  );
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
