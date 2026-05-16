import { enterpriseStorageUpload, PORTAL_DOCUMENT_FILE_GUARD } from "../../lib/enterpriseStorageUpload";
import { inferContentType } from "../../lib/storageUpload";
import { formatPostgrestError, formatStorageError } from "../../lib/supabaseErrors";
import { publicStorageObjectPath } from "../../lib/storagePaths";
import { getSupabase } from "../../lib/supabase";
import { unwrapList } from "../../lib/supabaseResult";
import { safeLower } from "../../lib/safe";
import type { ChurchFileStorageBucket, FileManagerItemRecord } from "../../types";

function clientOrThrow() {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  return c;
}

export function slugCategory(raw: string): string {
  const s = safeLower(raw.trim()).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || "jumla";
}

function rowToRecord(r: Record<string, unknown>): FileManagerItemRecord {
  return {
    id: String(r.id ?? ""),
    title: String(r.title ?? ""),
    file_url: String(r.file_url ?? ""),
    bucket_name: r.bucket_name as ChurchFileStorageBucket,
    file_path: String(r.file_path ?? ""),
    file_type: String(r.file_type ?? ""),
    category: String(r.category ?? ""),
    description: String(r.description ?? ""),
    created_at: String(r.created_at ?? ""),
  };
}

export async function fetchFileManagerItems(): Promise<FileManagerItemRecord[]> {
  const c = clientOrThrow();
  const res = await c.from("file_manager_items").select("*").order("created_at", { ascending: false });
  const rows = unwrapList(res, "file_manager_items.list");
  return rows.map((x) => rowToRecord(x as Record<string, unknown>));
}

export async function uploadChurchFile(
  bucket: ChurchFileStorageBucket,
  file: File,
  category: string,
  onProgress?: (pct: number) => void
): Promise<{ filePath: string; publicUrl: string; mime: string }> {
  const folder = slugCategory(category);
  const safeBase = file.name.replace(/[^\w.-]+/g, "_").slice(0, 120) || "faili";
  const filePath = `${folder}/${crypto.randomUUID()}-${safeBase}`;

  /** Baadhi ya vivinjari havipei progress halisi — tumia animation ya wastani. */
  let t: ReturnType<typeof setInterval> | null = null;
  if (onProgress) {
    let x = 5;
    onProgress(5);
    t = setInterval(() => {
      x = Math.min(92, x + Math.random() * 12);
      onProgress(Math.round(x));
    }, 220);
  }

  try {
    const uploaded = await enterpriseStorageUpload({
      bucket,
      file,
      path: filePath,
      guard: PORTAL_DOCUMENT_FILE_GUARD,
      upsert: false,
      onProgress: onProgress
        ? (p) => onProgress(p.percent)
        : undefined,
    });
    return {
      filePath: uploaded.path,
      publicUrl: uploaded.publicUrl,
      mime: uploaded.contentType || inferContentType(file) || file.type || "application/octet-stream",
    };
  } finally {
    if (t) clearInterval(t);
    onProgress?.(100);
  }
}

export async function upsertFileManagerItem(
  row: Partial<FileManagerItemRecord> & {
    title: string;
    bucket_name: ChurchFileStorageBucket;
    file_url: string;
    file_path: string;
    file_type: string;
  }
): Promise<FileManagerItemRecord> {
  const c = clientOrThrow();
  const payload = {
    title: row.title.trim(),
    file_url: row.file_url.trim(),
    bucket_name: row.bucket_name,
    file_path: row.file_path.trim(),
    file_type: row.file_type.trim() || "application/octet-stream",
    category: (row.category ?? "").trim(),
    description: (row.description ?? "").trim(),
  };
  if (row.id) {
    const { data, error } = await c.from("file_manager_items").update(payload).eq("id", row.id).select("*").single();
    if (error) throw new Error(formatPostgrestError(error, "file_manager_items.update"));
    return rowToRecord(data as Record<string, unknown>);
  }
  const { data, error } = await c.from("file_manager_items").insert(payload).select("*").single();
  if (error) throw new Error(formatPostgrestError(error, "file_manager_items.insert"));
  return rowToRecord(data as Record<string, unknown>);
}

export async function removeStoredObject(bucket: ChurchFileStorageBucket, publicUrl: string): Promise<void> {
  const p = publicStorageObjectPath(publicUrl, bucket);
  if (!p) return;
  const c = clientOrThrow();
  const { error } = await c.storage.from(bucket).remove([p]);
  if (error) throw new Error(formatStorageError(error, bucket));
}

export async function deleteFileManagerItem(row: FileManagerItemRecord): Promise<void> {
  const c = clientOrThrow();
  await removeStoredObject(row.bucket_name, row.file_url).catch(() => {});
  const { error } = await c.from("file_manager_items").delete().eq("id", row.id);
  if (error) throw new Error(formatPostgrestError(error, "file_manager_items.delete"));
}
