import {
  enterpriseStorageUpload,
  type EnterpriseUploadMetadata,
} from "../lib/enterpriseStorageUpload";
import { STORAGE_BUCKETS } from "../lib/storageBuckets";
import { getSupabase } from "../lib/supabaseClient";
import type { MasterBranchScope } from "./masterBranchEngineService";

export async function uploadBranchEngineFile(input: {
  file: File;
  scope: MasterBranchScope;
  entityId?: string;
  moduleId?: string;
  fieldId?: string;
}): Promise<EnterpriseUploadMetadata> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  const {
    data: { user },
  } = await c.auth.getUser();
  if (!user) throw new Error("Ingia kwenye akaunti ili kupakia faili.");

  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
  const prefix = [
    "branch-engine",
    user.id,
    input.scope,
    input.entityId || "national",
    input.moduleId || "general",
    input.fieldId || "file",
  ].join("/");

  const result = await enterpriseStorageUpload({
    bucket: STORAGE_BUCKETS.portalUploads,
    file: input.file,
    pathPrefix: prefix,
    path: `${prefix}/${Date.now()}_${safeName}`,
    upsert: false,
    guard: {
      maxBytes: 8 * 1024 * 1024,
      allowedExtensions: [".pdf", ".xlsx", ".xls", ".csv", ".png", ".jpg", ".jpeg", ".webp", ".doc", ".docx"],
    },
  });

  return {
    fileName: input.file.name,
    filePath: result.path,
    publicUrl: result.publicUrl,
    bucket: result.bucket,
    mimeType: result.contentType || input.file.type || "application/octet-stream",
    fileSize: result.bytes,
    uploadedBy: user.id,
    uploadedAt: new Date().toISOString(),
  };
}
