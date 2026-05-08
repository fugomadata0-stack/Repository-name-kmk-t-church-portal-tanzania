import { formatPostgrestError } from "../../lib/supabaseErrors";
import { getSupabase } from "../../lib/supabaseClient";
import { unwrapList } from "../../lib/supabaseResult";
import type { LiveStreamRecord } from "../../types";

function clientOrThrow() {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  return c;
}

function rowToRecord(r: Record<string, unknown>): LiveStreamRecord {
  return {
    id: String(r.id ?? ""),
    title: String(r.title ?? ""),
    platform: String(r.platform ?? ""),
    stream_url: String(r.stream_url ?? ""),
    embed_url: String(r.embed_url ?? ""),
    status: (String(r.status ?? "scheduled") as LiveStreamRecord["status"]) ?? "scheduled",
    is_live: Boolean(r.is_live),
    scheduled_at: r.scheduled_at ? String(r.scheduled_at) : null,
    ended_at: r.ended_at ? String(r.ended_at) : null,
    description: String(r.description ?? ""),
    thumbnail_url: r.thumbnail_url ? String(r.thumbnail_url) : null,
    preacher: String(r.preacher ?? ""),
    event_link: String(r.event_link ?? ""),
    category: String(r.category ?? ""),
    is_public: Boolean(r.is_public),
    created_at: String(r.created_at ?? ""),
  };
}

export async function fetchLiveStreams(): Promise<LiveStreamRecord[]> {
  const c = clientOrThrow();
  const res = await c.from("live_streams").select("*").order("scheduled_at", { ascending: false, nullsFirst: false });
  const rows = unwrapList(res, "live_streams.list");
  return rows.map((x) => rowToRecord(x as Record<string, unknown>));
}

export async function upsertLiveStream(
  row: Partial<LiveStreamRecord> & { title: string; stream_url: string; embed_url: string }
): Promise<LiveStreamRecord> {
  const c = clientOrThrow();
  const payload = {
    title: row.title.trim(),
    platform: (row.platform ?? "").trim(),
    stream_url: row.stream_url.trim(),
    embed_url: row.embed_url.trim(),
    status: row.status ?? (row.is_live ? "live" : "scheduled"),
    is_live: Boolean(row.is_live),
    scheduled_at: row.scheduled_at?.trim() ? row.scheduled_at : null,
    ended_at: row.ended_at?.trim() ? row.ended_at : null,
    description: (row.description ?? "").trim(),
    thumbnail_url: row.thumbnail_url?.trim() || null,
    preacher: row.preacher?.trim() || null,
    event_link: row.event_link?.trim() || null,
    category: row.category?.trim() || null,
    is_public: Boolean(row.is_public),
  };
  if (row.id) {
    const { data, error } = await c.from("live_streams").update(payload).eq("id", row.id).select("*").single();
    if (error) throw new Error(formatPostgrestError(error, "live_streams.update"));
    return rowToRecord(data as Record<string, unknown>);
  }
  const { data, error } = await c.from("live_streams").insert(payload).select("*").single();
  if (error) throw new Error(formatPostgrestError(error, "live_streams.insert"));
  return rowToRecord(data as Record<string, unknown>);
}

export async function deleteLiveStream(id: string): Promise<void> {
  const c = clientOrThrow();
  const { error } = await c.from("live_streams").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "live_streams.delete"));
}

/** Badilisha kiungo cha kutazama kuwa embed kwa YouTube / Facebook (rahisi). */
export function normalizeEmbedUrl(platform: string, watchOrShareUrl: string, existingEmbed: string): string {
  const ex = existingEmbed.trim();
  if (ex && (ex.includes("/embed/") || ex.includes("facebook.com/plugins/video.php"))) return ex;
  const u = watchOrShareUrl.trim();
  if (!u) return ex;
  const low = platform.toLowerCase();
  try {
    const url = new URL(u);
    if (low.includes("youtube") || url.hostname.includes("youtu.be")) {
      if (url.hostname.includes("youtu.be")) {
        const id = url.pathname.replace(/^\//, "").split("/")[0];
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      const v = url.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("embed");
      if (idx >= 0 && parts[idx + 1]) return `https://www.youtube.com/embed/${parts[idx + 1]}`;
    }
    if (low.includes("facebook") || url.hostname.includes("facebook.com")) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u)}&show_text=false`;
    }
  } catch {
    return ex || u;
  }
  return ex || u;
}
