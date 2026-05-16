import { optimizeImageForUpload } from "./enterpriseImageOptimize";
import type { FileGuardOptions } from "./fileUploadGuard";
import { mbToBytes, UPLOAD_LIMITS_MB, validateSelectedFile } from "./fileUploadGuard";
import { getSupabaseOrThrow, validateSupabaseEnv } from "./supabase";
import type { StorageBucketName } from "./storageBuckets";
import { formatStorageError } from "./supabaseErrors";
import { buildSafeStoragePath, inferContentType, publicObjectUploadOptions, runStorageOpWithRetries } from "./storageUpload";

export type StorageUploadPhase = "validating" | "optimizing" | "uploading" | "finalizing" | "complete" | "error";

export type StorageUploadProgress = {
  phase: StorageUploadPhase;
  /** 0–100 */
  percent: number;
  bytesLoaded?: number;
  bytesTotal?: number;
  bytesPerSecond?: number;
};

/** Metadata ya faili baada ya upakiaji — kwa kuhifadhi kwenye DB. */
export type EnterpriseUploadMetadata = {
  fileName: string;
  filePath: string;
  publicUrl: string;
  bucket: string;
  mimeType: string;
  fileSize: number;
  uploadedBy?: string;
  uploadedAt: string;
};

export function buildUploadMetadata(
  result: EnterpriseStorageUploadResult,
  file: File,
  extras?: { uploadedBy?: string }
): EnterpriseUploadMetadata {
  return {
    fileName: file.name,
    filePath: result.path,
    publicUrl: result.publicUrl,
    bucket: result.bucket,
    mimeType: result.contentType || inferContentType(file) || "application/octet-stream",
    fileSize: result.bytes,
    uploadedBy: extras?.uploadedBy,
    uploadedAt: new Date().toISOString(),
  };
}

export type EnterpriseStorageUploadParams = {
  bucket: StorageBucketName | string;
  file: File;
  /** Njia kamili ndani ya bucket (ikiwa haijatolewa, inajengwa kutoka pathPrefix). */
  path?: string;
  pathPrefix?: string;
  upsert?: boolean;
  guard?: FileGuardOptions;
  /** Kubana picha kubwa kabla ya upakiaji (chaguomsingi: true kwa image/*). */
  optimizeImage?: boolean;
  onProgress?: (p: StorageUploadProgress) => void;
  signal?: AbortSignal;
};

export type EnterpriseStorageUploadResult = {
  path: string;
  publicUrl: string;
  bucket: string;
  bytes: number;
  contentType: string | undefined;
};

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Upakiaji umesitishwa.", "AbortError");
}

/**
 * Upakiaji wa kiwango cha biashara — `supabase.storage.from(bucket).upload()` pekee.
 * Inathibitisha mazingira, MIME, na header za API kabla ya kutuma faili.
 */
export async function enterpriseStorageUpload(
  params: EnterpriseStorageUploadParams
): Promise<EnterpriseStorageUploadResult> {
  const env = validateSupabaseEnv();
  if (!env.ok) throw new Error(env.message);

  const client = getSupabaseOrThrow();
  const { onProgress, signal } = params;

  const report = (phase: StorageUploadPhase, percent: number, extra?: Partial<StorageUploadProgress>) => {
    onProgress?.({ phase, percent, ...extra });
  };

  try {
    report("validating", 4);
    assertNotAborted(signal);

    if (params.guard) {
      const guardErr = validateSelectedFile(params.file, params.guard);
      if (guardErr) throw new Error(guardErr);
    }

    let file = params.file;
    const shouldOptimize =
      params.optimizeImage !== false && (file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name));

    if (shouldOptimize) {
      report("optimizing", 12);
      assertNotAborted(signal);
      file = await optimizeImageForUpload(file);
    }

    const path =
      params.path?.trim() ||
      buildSafeStoragePath((params.pathPrefix ?? "uploads").replace(/^\/+|\/+$/g, ""), file.name);

    report("uploading", 28, { bytesTotal: file.size, bytesLoaded: 0 });
    assertNotAborted(signal);

    const uploadStarted = performance.now();
    const { error } = await runStorageOpWithRetries(
      () =>
        client.storage.from(params.bucket).upload(path, file, publicObjectUploadOptions(file, { upsert: params.upsert })),
      { retries: 3, delayMs: 450 }
    );

    if (error) throw new Error(formatStorageError(error, params.bucket));

    const elapsedSec = Math.max(0.001, (performance.now() - uploadStarted) / 1000);
    report("finalizing", 92, {
      bytesLoaded: file.size,
      bytesTotal: file.size,
      bytesPerSecond: Math.round(file.size / elapsedSec),
    });

    const { data } = client.storage.from(params.bucket).getPublicUrl(path);
    report("complete", 100, { bytesLoaded: file.size, bytesTotal: file.size });

    return {
      path,
      publicUrl: data.publicUrl,
      bucket: params.bucket,
      bytes: file.size,
      contentType: file.type || undefined,
    };
  } catch (e) {
    report("error", 0);
    throw e;
  }
}

/** Vigezo vya kawaida vya picha za portal (jpg/png/webp/svg, kikomo 50MB). */
export const PORTAL_IMAGE_FILE_GUARD: FileGuardOptions = {
  allowedExtensions: [".jpg", ".jpeg", ".jfif", ".png", ".webp", ".gif", ".heic", ".heif", ".svg", ".avif"],
  maxBytes: mbToBytes(UPLOAD_LIMITS_MB.images),
  allowedMimePrefixes: ["image/"],
  labelSw: "Picha",
};

/** Nyaraka: PDF, Office, picha, TXT, ZIP — bucket church-documents. */
export const PORTAL_DOCUMENT_FILE_GUARD: FileGuardOptions = {
  allowedExtensions: [
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".txt",
    ".zip",
    ".rar",
  ],
  maxBytes: mbToBytes(UPLOAD_LIMITS_MB.documents),
  allowedMimePrefixes: ["application/", "image/", "text/"],
  labelSw: "Nyaraka",
};

/** Video / media kubwa — church-media, church-videos, n.k. */
export const PORTAL_VIDEO_FILE_GUARD: FileGuardOptions = {
  allowedExtensions: [".mp4", ".webm", ".mov", ".mkv", ".m4v"],
  maxBytes: mbToBytes(UPLOAD_LIMITS_MB.video),
  allowedMimePrefixes: ["video/"],
  labelSw: "Video",
};

export const PORTAL_AUDIO_FILE_GUARD: FileGuardOptions = {
  allowedExtensions: [".mp3", ".wav", ".m4a", ".ogg", ".aac"],
  maxBytes: mbToBytes(UPLOAD_LIMITS_MB.audio),
  allowedMimePrefixes: ["audio/"],
  labelSw: "Sauti",
};
