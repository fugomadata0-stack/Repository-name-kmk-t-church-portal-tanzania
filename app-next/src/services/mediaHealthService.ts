import { getSupabase } from "../lib/supabaseClient";

export const REQUIRED_MEDIA_BUCKETS = [
  "church-gallery",
  "church-videos",
  "church-audio",
  "church-events-media",
  "church-images",
  "church-media",
  "site-assets",
] as const;

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
  const { error } = await c.from("news_posts").select("id", { count: "exact", head: true });
  if (error) return { ok: false, message: "Imeshindikana kuunganisha Supabase kwa media." };
  return { ok: true, message: "Muunganisho wa Supabase uko sawa." };
}
