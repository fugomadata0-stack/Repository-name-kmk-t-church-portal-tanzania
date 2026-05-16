import { enterpriseStorageUpload, PORTAL_IMAGE_FILE_GUARD } from "./enterpriseStorageUpload";
import { mbToBytes } from "./fileUploadGuard";
import { STORAGE_BUCKETS } from "./storageBuckets";
import { buildSafeStoragePath } from "./storageUpload";

/**
 * Pakia faili kwenye bucket `site-assets` na urejeshe URL ya umma.
 * `pathPrefix` mfano: hero, cross, gallery, about/logo
 */
export async function uploadSitePublicAsset(pathPrefix: string, file: File): Promise<string> {
  const prefix = pathPrefix.replace(/^\/+|\/+$/g, "");
  const path = buildSafeStoragePath(prefix, file.name);
  const { publicUrl } = await enterpriseStorageUpload({
    bucket: STORAGE_BUCKETS.siteAssets,
    file,
    path,
    guard: { ...PORTAL_IMAGE_FILE_GUARD, maxBytes: mbToBytes(70), labelSw: "Faili ya tovuti" },
  });
  return publicUrl;
}
