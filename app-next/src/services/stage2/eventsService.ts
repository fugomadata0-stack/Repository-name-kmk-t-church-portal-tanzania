import { publicObjectUploadOptions } from "../../lib/storageUpload";
import { formatPostgrestError, formatStorageError } from "../../lib/supabaseErrors";
import { publicStorageObjectPath } from "../../lib/storagePaths";
import { getSupabase } from "../../lib/supabaseClient";
import { unwrapList } from "../../lib/supabaseResult";
import type { ChurchEventRecord } from "../../types";

const BUCKET = "church-events-media";

function clientOrThrow() {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  return c;
}

function rowToRecord(r: Record<string, unknown>): ChurchEventRecord {
  return {
    id: String(r.id ?? ""),
    title: String(r.title ?? ""),
    description: String(r.description ?? ""),
    event_date: r.event_date ? String(r.event_date).slice(0, 10) : "",
    event_time: r.event_time == null ? null : String(r.event_time),
    location: String(r.location ?? ""),
    organizer: String(r.organizer ?? ""),
    speaker: String(r.speaker ?? ""),
    status: (String(r.status ?? "upcoming") as ChurchEventRecord["status"]) ?? "upcoming",
    is_public: Boolean(r.is_public),
    poster_url: r.poster_url == null ? null : String(r.poster_url),
    created_at: String(r.created_at ?? ""),
  };
}

export async function fetchEvents(): Promise<ChurchEventRecord[]> {
  const c = clientOrThrow();
  const res = await c.from("events").select("*").order("event_date", { ascending: false });
  const rows = unwrapList(res, "events.list");
  return rows.map((x) => rowToRecord(x as Record<string, unknown>));
}

export async function upsertEvent(
  row: Partial<ChurchEventRecord> & { title: string; event_date: string }
): Promise<ChurchEventRecord> {
  const c = clientOrThrow();
  const payload = {
    title: row.title.trim(),
    description: (row.description ?? "").trim(),
    event_date: String(row.event_date ?? "").trim().slice(0, 10),
    event_time: row.event_time || null,
    location: (row.location ?? "").trim(),
    organizer: row.organizer?.trim() || null,
    speaker: row.speaker?.trim() || null,
    status: row.status ?? "upcoming",
    is_public: Boolean(row.is_public),
    poster_url: row.poster_url?.trim() || null,
  };
  if (row.id) {
    const { data, error } = await c.from("events").update(payload).eq("id", row.id).select("*").single();
    if (error) throw new Error(formatPostgrestError(error, "events.update"));
    return rowToRecord(data as Record<string, unknown>);
  }
  const { data, error } = await c.from("events").insert(payload).select("*").single();
  if (error) throw new Error(formatPostgrestError(error, "events.insert"));
  return rowToRecord(data as Record<string, unknown>);
}

export async function deleteEvent(id: string): Promise<void> {
  const c = clientOrThrow();
  const { error } = await c.from("events").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "events.delete"));
}

export async function uploadEventPoster(file: File, eventId: string): Promise<string> {
  const c = clientOrThrow();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `posters/${eventId}-${Date.now()}.${ext}`;
  const { error } = await c.storage.from(BUCKET).upload(path, file, publicObjectUploadOptions(file));
  if (error) throw new Error(formatStorageError(error, BUCKET));
  const { data } = c.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function removeEventPosterIfStored(url: string | null | undefined): Promise<void> {
  if (!url?.trim()) return;
  const p = publicStorageObjectPath(url, BUCKET);
  if (!p) return;
  const c = clientOrThrow();
  const { error } = await c.storage.from(BUCKET).remove([p]);
  if (error) throw new Error(formatStorageError(error, BUCKET));
}
