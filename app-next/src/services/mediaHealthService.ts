import { ALL_STORAGE_BUCKET_NAMES, MEDIA_MODULE_BUCKET_NAMES } from "../lib/storageBuckets";
import { checkStorageBucketsSummary } from "../lib/storageBucketProbe";
import { formatPostgrestError, isMissingTableError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabaseClient";

/** @deprecated Tumia `ALL_STORAGE_BUCKET_NAMES` kutoka `storageBuckets`. */
export const REQUIRED_MEDIA_BUCKETS = ALL_STORAGE_BUCKET_NAMES;

/**
 * Kagua buckets — kwa System Health / diagnostics pekee.
 * Usiite kwenye moduli za media (Gallery, Video, nk.).
 */
export async function checkRequiredMediaBuckets(buckets?: readonly string[]) {
  return checkStorageBucketsSummary(buckets ?? ALL_STORAGE_BUCKET_NAMES);
}

/** Kagua buckets za moduli za media (gallery, video, audio, events). */
export async function checkMediaModuleBuckets() {
  return checkStorageBucketsSummary(MEDIA_MODULE_BUCKET_NAMES);
}

/** Muunganisho wa DB (si orodha ya buckets). */
export async function checkSupabaseMediaLink(): Promise<{ ok: boolean; message: string }> {
  const c = getSupabase();
  if (!c) return { ok: false, message: "Supabase haijasanidiwa." };
  const probes = [
    { table: "site_settings", label: "site_settings.head" },
    { table: "news_posts", label: "news_posts.head" },
    { table: "documents", label: "documents.head" },
  ] as const;
  let lastMsg = "Muunganisho haukufanikiwa.";
  for (const p of probes) {
    const { error } = await c.from(p.table).select("id", { count: "exact", head: true });
    if (!error) return { ok: true, message: "Muunganisho wa Supabase uko sawa." };
    lastMsg = formatPostgrestError(error, p.label);
    if (!isMissingTableError(error)) return { ok: false, message: lastMsg };
  }
  return { ok: false, message: lastMsg };
}
