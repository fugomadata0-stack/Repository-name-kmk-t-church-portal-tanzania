import { enterpriseStorageUpload, PORTAL_AUDIO_FILE_GUARD } from "../../lib/enterpriseStorageUpload";
import { formatPostgrestError, formatStorageError } from "../../lib/supabaseErrors";
import { publicStorageObjectPath } from "../../lib/storagePaths";
import { getSupabase } from "../../lib/supabase";
import { unwrapList } from "../../lib/supabaseResult";
import { STORAGE_BUCKETS } from "../../lib/storageBuckets";
import type { ChurchAudioRecord } from "../../types";

const BUCKET = STORAGE_BUCKETS.churchAudio;

function clientOrThrow() {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  return c;
}

function rowToRecord(r: Record<string, unknown>): ChurchAudioRecord {
  return {
    id: String(r.id ?? ""),
    title: String(r.title ?? ""),
    audio_url: String(r.audio_url ?? ""),
    created_at: String(r.created_at ?? ""),
  };
}

export async function fetchAudios(): Promise<ChurchAudioRecord[]> {
  const c = clientOrThrow();
  const res = await c.from("audios").select("*").order("created_at", { ascending: false });
  const rows = unwrapList(res, "audios.list");
  return rows.map((x) => rowToRecord(x as Record<string, unknown>));
}

export async function upsertAudio(row: Partial<ChurchAudioRecord> & { title: string; audio_url: string }): Promise<ChurchAudioRecord> {
  const c = clientOrThrow();
  const payload = {
    title: row.title.trim(),
    audio_url: row.audio_url.trim(),
  };
  if (row.id) {
    const { data, error } = await c.from("audios").update(payload).eq("id", row.id).select("*").single();
    if (error) throw new Error(formatPostgrestError(error, "audios.update"));
    return rowToRecord(data as Record<string, unknown>);
  }
  const { data, error } = await c.from("audios").insert(payload).select("*").single();
  if (error) throw new Error(formatPostgrestError(error, "audios.insert"));
  return rowToRecord(data as Record<string, unknown>);
}

export async function deleteAudio(id: string): Promise<void> {
  const c = clientOrThrow();
  const { error } = await c.from("audios").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "audios.delete"));
}

export async function uploadAudioFile(file: File): Promise<string> {
  const { publicUrl } = await enterpriseStorageUpload({
    bucket: BUCKET,
    file,
    pathPrefix: "tracks",
    guard: PORTAL_AUDIO_FILE_GUARD,
    upsert: false,
  });
  return publicUrl;
}

export async function removeAudioFileFromStorage(url: string | null | undefined): Promise<void> {
  if (!url?.trim()) return;
  const p = publicStorageObjectPath(url, BUCKET);
  if (!p) return;
  const c = clientOrThrow();
  const { error } = await c.storage.from(BUCKET).remove([p]);
  if (error) throw new Error(formatStorageError(error, BUCKET));
}
