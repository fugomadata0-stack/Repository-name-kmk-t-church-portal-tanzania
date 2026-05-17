/**
 * Chanzo cha kweli (single source of truth) kwa majina ya Supabase Storage buckets.
 * Moduli, services, na diagnostics lazima zitumie faili hii pekee (au re-export kutoka lib/storageBuckets).
 *
 * DEV NOTE: Ikiwa diagnostics inaonyesha "Needs Setup" kwa buckets zote,
 * angalia VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — frontend inaweza kuwa
 * imeunganishwa na mradi tofauti wa Supabase kuliko ule ulio na migrations.
 */

export const STORAGE_BUCKETS = {
  churchGallery: "church-gallery",
  churchVideos: "church-videos",
  churchAudio: "church-audio",
  churchEventsMedia: "church-events-media",
  churchImages: "church-images",
  churchMedia: "church-media",
  churchFiles: "church-files",
  churchDocuments: "church-documents",
  developerPhotos: "developer-photos",
  leadershipCvAttachments: "leadership-cv-attachments",
  leadershipCertificateAssets: "leadership-certificate-assets",
  siteAssets: "site-assets",
  structureLeaders: "structure-leaders",
  portalUploads: "portal-uploads",
  certificates: "certificates",
} as const;

export type StorageBucketName = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/** Orodha rasmi — case-sensitive, lazima ilingane na supabase/migrations. */
export const ALL_STORAGE_BUCKET_NAMES: readonly StorageBucketName[] = Object.values(STORAGE_BUCKETS);

export type StorageBucketRegistryEntry = {
  label: string;
  module: string;
  publicBucket: boolean;
};

export const STORAGE_BUCKET_REGISTRY: Record<StorageBucketName, StorageBucketRegistryEntry> = {
  "church-gallery": { label: "Gallery (picha)", module: "gallery", publicBucket: true },
  "church-videos": { label: "Video (thumbnails)", module: "videos", publicBucket: true },
  "church-audio": { label: "Audio / muziki", module: "audios", publicBucket: true },
  "church-events-media": { label: "Matukio (media)", module: "events", publicBucket: true },
  "church-images": { label: "Picha za kanisa", module: "media", publicBucket: true },
  "church-media": { label: "Media kubwa (video/audio)", module: "media", publicBucket: true },
  "church-files": { label: "Faili za kanisa", module: "file_manager", publicBucket: true },
  "church-documents": { label: "Nyaraka", module: "documents", publicBucket: true },
  "developer-photos": { label: "Picha za msanidi", module: "developer", publicBucket: true },
  "leadership-cv-attachments": { label: "Viambatisho vya CV", module: "viongozi", publicBucket: false },
  "leadership-certificate-assets": { label: "Mali za cheti", module: "viongozi", publicBucket: false },
  "site-assets": { label: "Mali za tovuti", module: "settings", publicBucket: true },
  "structure-leaders": { label: "Viongozi wa muundo", module: "muundo", publicBucket: false },
  "portal-uploads": { label: "Upakiaji wa portal", module: "portal", publicBucket: true },
  certificates: { label: "Vyeti (PDF)", module: "viongozi", publicBucket: true },
};

/** Buckets za moduli za media (stage2). */
export const MEDIA_MODULE_BUCKET_NAMES: readonly StorageBucketName[] = [
  STORAGE_BUCKETS.churchGallery,
  STORAGE_BUCKETS.churchVideos,
  STORAGE_BUCKETS.churchAudio,
  STORAGE_BUCKETS.churchEventsMedia,
] as const;

/** Buckets za File Manager (stage3). */
export const FILE_MANAGER_BUCKET_NAMES = [
  STORAGE_BUCKETS.churchFiles,
  STORAGE_BUCKETS.churchImages,
  STORAGE_BUCKETS.churchMedia,
  STORAGE_BUCKETS.portalUploads,
  STORAGE_BUCKETS.certificates,
] as const satisfies readonly StorageBucketName[];

export type FileManagerStorageBucket = (typeof FILE_MANAGER_BUCKET_NAMES)[number];

export function isKnownStorageBucket(name: string): name is StorageBucketName {
  return (ALL_STORAGE_BUCKET_NAMES as readonly string[]).includes(name);
}

export function getStorageBucketLabel(name: string): string {
  if (isKnownStorageBucket(name)) return STORAGE_BUCKET_REGISTRY[name].label;
  return name;
}
