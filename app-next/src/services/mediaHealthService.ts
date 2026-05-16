import { ALL_STORAGE_BUCKET_NAMES } from "../lib/storageBuckets";
import { formatPostgrestError, isMissingTableError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabase";

export const REQUIRED_MEDIA_BUCKETS = ALL_STORAGE_BUCKET_NAMES;

export async function checkRequiredMediaBuckets(): Promise<{ ok: boolean; missing: string[] }> {
  const c = getSupabase();
  if (!c) return { ok: false, missing: [...REQUIRED_MEDIA_BUCKETS] };
  const { data, error } = await c.storage.listBuckets();
  if (error) return { ok: false, missing: [...REQUIRED_MEDIA_BUCKETS] };
  const have = new Set((data ?? []).map((b) => b.name));
  const missing = REQUIRED_MEDIA_BUCKETS.filter((b) => !have.has(b));
  return { ok: missing.length === 0, missing };
}

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
