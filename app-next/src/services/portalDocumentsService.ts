import {
  enterpriseStorageUpload,
  PORTAL_DOCUMENT_FILE_GUARD,
  type StorageUploadProgress,
} from "../lib/enterpriseStorageUpload";
import { inferContentType } from "../lib/storageUpload";
import { formatCaughtError, formatPostgrestError, formatStorageError } from "../lib/supabaseErrors";
import { publicStorageObjectPath } from "../lib/storagePaths";
import { STORAGE_BUCKETS } from "../lib/storageBuckets";
import { getSupabase, getSupabaseOrThrow } from "../lib/supabase";
import { unwrapList } from "../lib/supabaseResult";
import { getCurrentUserId } from "../lib/supabaseAuthSession";
import type { ChurchDocumentRecord } from "../types";
import { safeLower } from "../lib/safe";
import { logAuditAction } from "./auditLogService";

export const CHURCH_DOCUMENTS_BUCKET = STORAGE_BUCKETS.churchDocuments;

function classifyError(err: unknown, fallback: string): Error {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message?: unknown }).message ?? "")
      : String(err ?? "");
  const low = safeLower(msg);
  if (low.includes("failed to fetch") || low.includes("network") || low.includes("networkerror")) {
    return new Error("Hitilafu ya mtandao. Jaribu tena au angalia intaneti.");
  }
  if (low.includes("no api key found")) {
    return new Error("Funguo ya API haipo — sanidi VITE_SUPABASE_ANON_KEY na ujenzi upya.");
  }
  if (low.includes("mime") || low.includes("invalid mime") || low.includes("content-type")) {
    return new Error("Aina ya faili hairuhusiwi kwenye hifadhi. Jaribu PDF/DOCX/XLSX au wasiliana na msimamizi.");
  }
  if (low.includes("payload too large") || low.includes("too large") || low.includes("entity too large")) {
    return new Error("Faili ni kubwa mno. Jaribu faili ndogo au ongeza kikomo cha bucket (migrations).");
  }
  if (low.includes("policy") || low.includes("denied") || low.includes("forbidden") || low.includes("row-level security")) {
    return new Error("Ruhusa imekataliwa. Hakikisha una haki ya moduli ya Nyaraka (documents) kwenye matrix.");
  }
  if (low.includes("does not exist") || low.includes("undefined table") || low.includes("42p01")) {
    return new Error("Jedwali husika halijapatikana kwenye Supabase.");
  }
  return new Error(formatCaughtError(err) || fallback);
}

function clientOrThrow() {
  return getSupabaseOrThrow();
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
    file_name: r.file_name == null ? null : String(r.file_name),
    file_path: r.file_path == null ? null : String(r.file_path),
    file_size: r.file_size == null ? null : Number(r.file_size),
    mime_type: r.mime_type == null ? null : String(r.mime_type),
    uploaded_at: r.uploaded_at == null ? null : String(r.uploaded_at),
    description: String(r.description ?? ""),
    created_at: String(r.created_at ?? ""),
    updated_at: r.updated_at == null ? undefined : String(r.updated_at),
    created_by: r.created_by == null ? null : String(r.created_by),
    updated_by: r.updated_by == null ? null : String(r.updated_by),
    status: String(r.status ?? "Active") as ChurchDocumentRecord["status"],
    visibility_level: String(r.visibility_level ?? "internal"),
  };
}

async function currentUploaderLabel(): Promise<string> {
  const c = getSupabase();
  if (!c) return "";
  const { data } = await c.auth.getUser();
  const u = data.user;
  if (!u) return "";
  return String(u.user_metadata?.full_name ?? u.email ?? "").trim();
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

export type ChurchDocumentInsertPayload = {
  title: string;
  category: string;
  type?: string;
  department?: string;
  uploaded_by?: string;
  branch?: string;
  file_url: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  description: string;
  visibility_level?: string;
  status?: string;
};

export async function insertChurchDocument(row: ChurchDocumentInsertPayload): Promise<ChurchDocumentRecord> {
  try {
    const c = clientOrThrow();
    const userId = await getCurrentUserId();
    const uploader = row.uploaded_by?.trim() || (await currentUploaderLabel());
    const now = new Date().toISOString();
    const { data, error } = await c
      .from("documents")
      .insert({
        title: row.title.trim(),
        category: row.category.trim(),
        type: row.type?.trim() || null,
        department: row.department?.trim() || null,
        uploaded_by: uploader || null,
        branch: row.branch?.trim() || null,
        file_url: row.file_url.trim(),
        file_name: row.file_name,
        file_path: row.file_path,
        file_size: row.file_size,
        mime_type: row.mime_type,
        uploaded_at: now,
        description: row.description.trim(),
        visibility_level: row.visibility_level?.trim() || "internal",
        status: row.status?.trim() || "Active",
        created_by: userId,
        updated_by: userId,
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
  patch: Partial<
    Pick<
      ChurchDocumentRecord,
      | "title"
      | "category"
      | "type"
      | "department"
      | "uploaded_by"
      | "branch"
      | "description"
      | "file_url"
      | "file_name"
      | "file_path"
      | "file_size"
      | "mime_type"
      | "visibility_level"
      | "status"
    >
  >
): Promise<ChurchDocumentRecord> {
  try {
    const c = clientOrThrow();
    const userId = await getCurrentUserId();
    const { data, error } = await c
      .from("documents")
      .update({
        ...patch,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
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

export async function removeChurchDocumentFileFromStorage(fileUrl: string): Promise<void> {
  const path = publicStorageObjectPath(fileUrl, CHURCH_DOCUMENTS_BUCKET);
  if (!path) return;
  const c = clientOrThrow();
  const { error } = await c.storage.from(CHURCH_DOCUMENTS_BUCKET).remove([path]);
  if (error) throw new Error(formatStorageError(error, CHURCH_DOCUMENTS_BUCKET));
}

export async function deleteChurchDocument(id: string, fileUrl: string): Promise<void> {
  try {
    const c = clientOrThrow();
    const path = publicStorageObjectPath(fileUrl, CHURCH_DOCUMENTS_BUCKET);
    if (path) {
      const { error: rmErr } = await c.storage.from(CHURCH_DOCUMENTS_BUCKET).remove([path]);
      if (rmErr) throw new Error(formatStorageError(rmErr, CHURCH_DOCUMENTS_BUCKET));
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

/** Pakia faili kwenye church-documents — mteja mmoja, header za API, metadata kamili. */
export async function uploadChurchDocumentFile(
  file: File,
  opts?: { onProgress?: (p: StorageUploadProgress) => void; signal?: AbortSignal }
): Promise<{
  path: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}> {
  const uploaded = await enterpriseStorageUpload({
    bucket: CHURCH_DOCUMENTS_BUCKET,
    file,
    pathPrefix: "uploads",
    guard: PORTAL_DOCUMENT_FILE_GUARD,
    upsert: true,
    optimizeImage: true,
    onProgress: opts?.onProgress,
    signal: opts?.signal,
  });
  const mimeType = uploaded.contentType || inferContentType(file) || "application/octet-stream";
  return {
    path: uploaded.path,
    publicUrl: uploaded.publicUrl,
    fileName: file.name,
    mimeType,
    fileSize: uploaded.bytes,
  };
}
