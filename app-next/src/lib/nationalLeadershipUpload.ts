import {
  enterpriseStorageUpload,
  PORTAL_DOCUMENT_FILE_GUARD,
  PORTAL_IMAGE_FILE_GUARD,
} from "./enterpriseStorageUpload";
import { mbToBytes } from "./fileUploadGuard";
import { STORAGE_BUCKETS } from "./storageBuckets";
import { buildSafeStoragePath } from "./storageUpload";

const MAX_IMAGE = mbToBytes(5);
const MAX_PDF = mbToBytes(12);

export async function uploadNationalLeadershipAsset(
  pathPrefix: string,
  file: File,
  kind: "photo" | "signature" | "cv"
): Promise<string> {
  const prefix = pathPrefix.replace(/^\/+|\/+$/g, "");
  const path = buildSafeStoragePath(prefix, file.name);

  if (kind === "cv") {
    const { publicUrl } = await enterpriseStorageUpload({
      bucket: STORAGE_BUCKETS.leadershipCvAttachments,
      file,
      path,
      guard: { ...PORTAL_DOCUMENT_FILE_GUARD, maxBytes: MAX_PDF, labelSw: "CV (PDF)" },
      upsert: true,
    });
    return publicUrl;
  }

  const { publicUrl } = await enterpriseStorageUpload({
    bucket: STORAGE_BUCKETS.siteAssets,
    file,
    path,
    guard: { ...PORTAL_IMAGE_FILE_GUARD, maxBytes: MAX_IMAGE, labelSw: kind === "signature" ? "Saini" : "Picha" },
    upsert: true,
  });
  return publicUrl;
}
