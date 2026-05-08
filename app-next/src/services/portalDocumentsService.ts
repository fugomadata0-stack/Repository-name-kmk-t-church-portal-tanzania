import { buildSafeStoragePath, publicObjectUploadOptions } from "../lib/storageUpload";
import { formatPostgrestError, formatStorageError } from "../lib/supabaseErrors";
import { publicStorageObjectPath } from "../lib/storagePaths";
import { getSupabase } from "../lib/supabaseClient";
import { unwrapList } from "../lib/supabaseResult";
import type { ChurchDocumentRecord } from "../types";
import { safeLower } from "../lib/safe";
import { logAuditAction } from "./auditLogService";

const BUCKET = "church-documents";

function classifyError(err: unknown, fallback: string): Error {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message?: unknown }).message ?? "")
      : String(err ?? "");
  const low = safeLower(msg);
  if (low.includes("failed to fetch") || low.includes("network") || low.includes("networkerror")) {
    return new Error("Imeshindikana kuwasiliana na seva.");
  }
  if (low.includes("does not exist") || low.includes("undefined table") || low.includes("42p01")) {
    return new Error("Jedwali husika halijapatikana kwenye Supabase.");
  }
  return new Error(fallback);
}

function clientOrThrow() {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  return c;
}

function rowToRecord(r: Record<string, unknown>): ChurchDocumentRecord {
  return {
    id: String(r.id ?? ""),
    title: String(r.title ?? ""),
    category: String(r.category ?? ""),
    type: String(r.type ?? r.file_type ?? ""),
    department: String(r.department ?? r.idara ?? ""),
    uploaded_by: String(r.uploaded_by ?? r.created_by ?? ""),
    branch: String(r.branch ?? r.dayosisi ?? ""),
    file_url: String(r.file_url ?? ""),
    description: String(r.description ?? ""),
    created_at: String(r.created_at ?? ""),
    status: String(r.status ?? "Active") as ChurchDocumentRecord["status"],
  };
}

export async function fetchChurchDocuments(): Promise<ChurchDocumentRecord[]> {
  try {
    const c = clientOrThrow();
    const res = await c.from("documents").select("*").order("created_at", { ascending: false });
    const rows = unwrapList(res, "documents.list");
    return rows.map((x) => rowToRecord(x as Record<string, unknown>));
  } catch (err) {
    console.error("[Documents:fetchChurchDocuments]", err);
    throw classifyError(err, "Imeshindikana kupakua nyaraka.");
  }
}

export async function insertChurchDocument(row: {
  title: string;
  category: string;
  type?: string;
  department?: string;
  uploaded_by?: string;
  branch?: string;
  file_url: string;
  description: string;
}): Promise<ChurchDocumentRecord> {
  try {
    const c = clientOrThrow();
    const { data, error } = await c
      .from("documents")
      .insert({
        title: row.title.trim(),
        category: row.category.trim(),
        type: row.type?.trim() || null,
        department: row.department?.trim() || null,
        uploaded_by: row.uploaded_by?.trim() || null,
        branch: row.branch?.trim() || null,
        file_url: row.file_url.trim(),
        description: row.description.trim(),
      })
      .select("*")
      .single();
    if (error) throw new Error(formatPostgrestError(error, "documents.insert"));
    const saved = rowToRecord(data as Record<string, unknown>);
    await logAuditAction({
      module: "documents",
      action: "document_uploaded",
      entity_type: "document",
      entity_id: saved.id,
      entity_name: saved.title,
      status: "success",
      new_values: saved as unknown as Record<string, unknown>,
    });
    return saved;
  } catch (err) {
    console.error("[Documents:insertChurchDocument]", err);
    throw classifyError(err, "Imeshindikana kuhifadhi nyaraka.");
  }
}

export async function updateChurchDocument(
  id: string,
  patch: Partial<Pick<ChurchDocumentRecord, "title" | "category" | "type" | "department" | "uploaded_by" | "branch" | "description" | "file_url">>
): Promise<ChurchDocumentRecord> {
  try {
    const c = clientOrThrow();
    const { data, error } = await c.from("documents").update(patch).eq("id", id).select("*").single();
    if (error) throw new Error(formatPostgrestError(error, "documents.update"));
    const saved = rowToRecord(data as Record<string, unknown>);
    await logAuditAction({
      module: "documents",
      action: "document_updated",
      entity_type: "document",
      entity_id: saved.id,
      entity_name: saved.title,
      status: "success",
      new_values: saved as unknown as Record<string, unknown>,
    });
    return saved;
  } catch (err) {
    console.error("[Documents:updateChurchDocument]", err);
    throw classifyError(err, "Imeshindikana kuhifadhi nyaraka.");
  }
}

/** Ondoa faili kwenye storage pekee (baada ya kubadilisha URL). */
export async function removeChurchDocumentFileFromStorage(fileUrl: string): Promise<void> {
  const path = publicStorageObjectPath(fileUrl, BUCKET);
  if (!path) return;
  const c = clientOrThrow();
  const { error } = await c.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(formatStorageError(error, BUCKET));
}

export async function deleteChurchDocument(id: string, fileUrl: string): Promise<void> {
  try {
    const c = clientOrThrow();
    const path = publicStorageObjectPath(fileUrl, BUCKET);
    if (path) {
      const { error: rmErr } = await c.storage.from(BUCKET).remove([path]);
      if (rmErr) throw new Error(formatStorageError(rmErr, BUCKET));
    }
    const { error } = await c.from("documents").delete().eq("id", id);
    if (error) throw new Error(formatPostgrestError(error, "documents.delete"));
    await logAuditAction({
      module: "documents",
      action: "document_deleted",
      entity_type: "document",
      entity_id: id,
      status: "success",
      message: "Nyaraka imefutwa.",
    });
  } catch (err) {
    console.error("[Documents:deleteChurchDocument]", err);
    throw classifyError(err, "Imeshindikana kufuta nyaraka.");
  }
}

export async function uploadChurchDocumentFile(file: File): Promise<{ path: string; publicUrl: string }> {
  const c = clientOrThrow();
  const path = buildSafeStoragePath("uploads", file.name);
  const { error } = await c.storage.from(BUCKET).upload(path, file, publicObjectUploadOptions(file, { upsert: false }));
  if (error) throw new Error(formatStorageError(error, BUCKET));
  const { data } = c.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}
