import { enterpriseStorageUpload, PORTAL_IMAGE_FILE_GUARD } from "../../lib/enterpriseStorageUpload";
import { formatPostgrestError, formatStorageError } from "../../lib/supabaseErrors";
import { publicStorageObjectPath } from "../../lib/storagePaths";
import { getSupabase } from "../../lib/supabase";
import { unwrapList } from "../../lib/supabaseResult";
import { STORAGE_BUCKETS } from "../../lib/storageBuckets";
import type { ChurchVideoRecord } from "../../types";

const BUCKET = STORAGE_BUCKETS.churchVideos;

function clientOrThrow() {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  return c;
}

function rowToRecord(r: Record<string, unknown>): ChurchVideoRecord {
  return {
    id: String(r.id ?? ""),
    title: String(r.title ?? ""),
    video_url: String(r.video_url ?? ""),
    thumbnail_url: r.thumbnail_url == null || String(r.thumbnail_url) === "" ? null : String(r.thumbnail_url),
    created_at: String(r.created_at ?? ""),
  };
}

export async function fetchVideos(): Promise<ChurchVideoRecord[]> {
  const c = clientOrThrow();
  const res = await c.from("videos").select("*").order("created_at", { ascending: false });
  const rows = unwrapList(res, "videos.list");
  return rows.map((x) => rowToRecord(x as Record<string, unknown>));
}

export async function upsertVideo(row: Partial<ChurchVideoRecord> & { title: string; video_url: string }): Promise<ChurchVideoRecord> {
  const c = clientOrThrow();
  const payload = {
    title: row.title.trim(),
    video_url: row.video_url.trim(),
    thumbnail_url: row.thumbnail_url?.trim() || null,
  };
  if (row.id) {
    const { data, error } = await c.from("videos").update(payload).eq("id", row.id).select("*").single();
    if (error) throw new Error(formatPostgrestError(error, "videos.update"));
    return rowToRecord(data as Record<string, unknown>);
  }
  const { data, error } = await c.from("videos").insert(payload).select("*").single();
  if (error) throw new Error(formatPostgrestError(error, "videos.insert"));
  return rowToRecord(data as Record<string, unknown>);
}

export async function deleteVideo(id: string): Promise<void> {
  const c = clientOrThrow();
  const { error } = await c.from("videos").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "videos.delete"));
}

export async function uploadVideoThumbnail(file: File, videoId: string): Promise<string> {
  const { publicUrl } = await enterpriseStorageUpload({
    bucket: BUCKET,
    file,
    pathPrefix: `thumbs/${videoId}`,
    guard: PORTAL_IMAGE_FILE_GUARD,
  });
  return publicUrl;
}

export async function removeVideoThumbnailIfStored(url: string | null | undefined): Promise<void> {
  if (!url?.trim()) return;
  const p = publicStorageObjectPath(url, BUCKET);
  if (!p) return;
  const c = clientOrThrow();
  const { error } = await c.storage.from(BUCKET).remove([p]);
  if (error) throw new Error(formatStorageError(error, BUCKET));
}

/** Badilisha kiungo cha YouTube/Vimeo kuwa embed URL kwa iframe. */
export function toEmbedUrl(videoUrl: string): string {
  const u = videoUrl.trim();
  if (!u) return "";
  try {
    const parsed = new URL(u);
    const h = parsed.hostname.replace(/^www\./, "");
    if (h === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "");
      return id ? `https://www.youtube.com/embed/${id}` : u;
    }
    if (h.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      const m = parsed.pathname.match(/\/embed\/([^/]+)/);
      if (m) return `https://www.youtube.com/embed/${m[1]}`;
      const s = parsed.pathname.match(/\/shorts\/([^/]+)/);
      if (s) return `https://www.youtube.com/embed/${s[1]}`;
    }
    if (h.includes("vimeo.com")) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      const id = parts[parts.length - 1];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return u;
  }
  return u;
}
