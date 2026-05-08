import { buildSafeStoragePath, publicObjectUploadOptions } from "../../lib/storageUpload";
import { formatPostgrestError, formatStorageError } from "../../lib/supabaseErrors";
import { publicStorageObjectPath } from "../../lib/storagePaths";
import { getSupabase } from "../../lib/supabaseClient";
import { unwrapList } from "../../lib/supabaseResult";
import type { GalleryImageRecord } from "../../types";

const BUCKET = "church-gallery";

function clientOrThrow() {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  return c;
}

function rowToRecord(r: Record<string, unknown>): GalleryImageRecord {
  return {
    id: String(r.id ?? ""),
    title: String(r.title ?? ""),
    image_url: String(r.image_url ?? ""),
    category: String(r.category ?? ""),
    created_at: String(r.created_at ?? ""),
  };
}

export async function fetchGalleryImages(): Promise<GalleryImageRecord[]> {
  const c = clientOrThrow();
  const res = await c.from("gallery").select("*").order("created_at", { ascending: false });
  const rows = unwrapList(res, "gallery.list");
  return rows.map((x) => rowToRecord(x as Record<string, unknown>));
}

export async function upsertGalleryImage(
  row: Partial<GalleryImageRecord> & { title: string; image_url: string }
): Promise<GalleryImageRecord> {
  const c = clientOrThrow();
  const payload = {
    title: row.title.trim(),
    image_url: row.image_url.trim(),
    category: (row.category ?? "").trim(),
  };
  if (row.id) {
    const { data, error } = await c.from("gallery").update(payload).eq("id", row.id).select("*").single();
    if (error) throw new Error(formatPostgrestError(error, "gallery.update"));
    return rowToRecord(data as Record<string, unknown>);
  }
  const { data, error } = await c.from("gallery").insert(payload).select("*").single();
  if (error) throw new Error(formatPostgrestError(error, "gallery.insert"));
  return rowToRecord(data as Record<string, unknown>);
}

export async function deleteGalleryImage(id: string): Promise<void> {
  const c = clientOrThrow();
  const { error } = await c.from("gallery").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "gallery.delete"));
}

export async function uploadGalleryImage(file: File, prefix = "items"): Promise<{ path: string; publicUrl: string }> {
  const c = clientOrThrow();
  const path = buildSafeStoragePath(prefix, file.name);
  const { error } = await c.storage.from(BUCKET).upload(path, file, publicObjectUploadOptions(file, { upsert: false }));
  if (error) throw new Error(formatStorageError(error, BUCKET));
  const { data } = c.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function removeGalleryFileFromStorage(fileUrl: string): Promise<void> {
  const p = publicStorageObjectPath(fileUrl, BUCKET);
  if (!p) return;
  const c = clientOrThrow();
  const { error } = await c.storage.from(BUCKET).remove([p]);
  if (error) throw new Error(formatStorageError(error, BUCKET));
}
