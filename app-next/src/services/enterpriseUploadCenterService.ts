import {
  buildUploadMetadata,
  enterpriseStorageUpload,
  type StorageUploadProgress,
} from "../lib/enterpriseStorageUpload";
import {
  isPrivateUploadBucket,
  uploadCategoryBucket,
  uploadCategoryGuard,
  uploadCategoryPathPrefix,
  type UploadCenterCategory,
  type UploadRegistryRow,
} from "../lib/enterpriseUploadCenter";
import { formatPostgrestError } from "../lib/supabaseErrors";
import { getSupabaseOrThrow } from "../lib/supabaseClient";
import { buildSafeStoragePath } from "../lib/storageUpload";
import { logAuditAction } from "./auditLogService";

function mapRow(r: Record<string, unknown>): UploadRegistryRow {
  return {
    id: String(r.id ?? ""),
    category: String(r.category ?? "receipt") as UploadCenterCategory,
    bucket: String(r.bucket ?? ""),
    file_path: String(r.file_path ?? ""),
    public_url: r.public_url != null ? String(r.public_url) : null,
    file_name: String(r.file_name ?? ""),
    mime_type: r.mime_type != null ? String(r.mime_type) : null,
    file_size_bytes: Number(r.file_size_bytes ?? 0),
    version_number: Number(r.version_number ?? 1),
    parent_upload_id: r.parent_upload_id != null ? String(r.parent_upload_id) : null,
    entity_type: r.entity_type != null ? String(r.entity_type) : null,
    entity_id: r.entity_id != null ? String(r.entity_id) : null,
    uploaded_by: r.uploaded_by != null ? String(r.uploaded_by) : null,
    status: (String(r.status ?? "active") as UploadRegistryRow["status"]) || "active",
    meta: (r.meta as Record<string, unknown> | null) ?? null,
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

export async function fetchUploadHistory(
  category?: UploadCenterCategory,
  limit = 80,
): Promise<UploadRegistryRow[]> {
  let q = getSupabaseOrThrow()
    .from("portal_upload_registry")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (category) q = q.eq("category", category);
  const { data, error } = await q;
  if (error) {
    if (/does not exist|42P01/i.test(error.message ?? "")) return [];
    throw new Error(formatPostgrestError(error, "portal_upload_registry"));
  }
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

export async function resolveUploadPreviewUrl(row: UploadRegistryRow): Promise<string | null> {
  if (row.public_url && !isPrivateUploadBucket(row.bucket)) {
    return row.public_url;
  }
  const path = row.file_path?.trim();
  if (!path) return row.public_url;
  const c = getSupabaseOrThrow();
  const { data, error } = await c.storage.from(row.bucket).createSignedUrl(path, 7200);
  if (error || !data?.signedUrl) return row.public_url;
  return data.signedUrl;
}

export type EnterpriseUploadParams = {
  category: UploadCenterCategory;
  file: File;
  entityType?: string;
  entityId?: string | null;
  parentUploadId?: string | null;
  uploadedBy?: string | null;
  onProgress?: (p: StorageUploadProgress) => void;
};

export async function uploadToEnterpriseCenter(params: EnterpriseUploadParams): Promise<UploadRegistryRow> {
  const bucket = uploadCategoryBucket(params.category);
  const guard = uploadCategoryGuard(params.category);
  const prefix = uploadCategoryPathPrefix(params.category, params.entityId);
  const versionSuffix = params.parentUploadId ? `v${Date.now()}` : "";

  const result = await enterpriseStorageUpload({
    bucket,
    file: params.file,
    path: buildSafeStoragePath(
      versionSuffix ? `${prefix}/${versionSuffix}` : prefix,
      params.file.name,
    ),
    guard,
    onProgress: params.onProgress,
  });

  const meta = buildUploadMetadata(result, params.file, { uploadedBy: params.uploadedBy ?? undefined });

  let versionNumber = 1;
  if (params.parentUploadId) {
    const { data: parent } = await getSupabaseOrThrow()
      .from("portal_upload_registry")
      .select("version_number")
      .eq("id", params.parentUploadId)
      .maybeSingle();
    versionNumber = Number((parent as { version_number?: number } | null)?.version_number ?? 0) + 1;
    await getSupabaseOrThrow()
      .from("portal_upload_registry")
      .update({ status: "superseded", updated_at: new Date().toISOString() })
      .eq("id", params.parentUploadId);
  }

  const { data, error } = await getSupabaseOrThrow()
    .from("portal_upload_registry")
    .insert({
      category: params.category,
      bucket,
      file_path: result.path,
      public_url: isPrivateUploadBucket(bucket) ? null : result.publicUrl,
      file_name: params.file.name,
      mime_type: meta.mimeType,
      file_size_bytes: meta.fileSize,
      version_number: versionNumber,
      parent_upload_id: params.parentUploadId ?? null,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      uploaded_by: params.uploadedBy ?? null,
      status: "active",
      meta: { originalName: params.file.name },
    })
    .select("*")
    .single();

  if (error) throw new Error(formatPostgrestError(error, "portal_upload_registry.insert"));
  const row = mapRow(data as Record<string, unknown>);
  void logAuditAction({
    module: "file_manager",
    action: "enterprise_upload",
    action_category: "upload",
    entity_type: params.entityType ?? "portal_upload_registry",
    entity_id: row.id,
    entity_name: params.file.name,
    performed_by_user_id: params.uploadedBy ?? null,
    status: "success",
    new_values: {
      category: params.category,
      bucket,
      path: result.path,
      version: versionNumber,
    },
  });
  return row;
}

export async function uploadNewVersion(
  parent: UploadRegistryRow,
  file: File,
  uploadedBy?: string | null,
  onProgress?: (p: StorageUploadProgress) => void,
): Promise<UploadRegistryRow> {
  return uploadToEnterpriseCenter({
    category: parent.category,
    file,
    entityType: parent.entity_type ?? undefined,
    entityId: parent.entity_id,
    parentUploadId: parent.id,
    uploadedBy,
    onProgress,
  });
}
