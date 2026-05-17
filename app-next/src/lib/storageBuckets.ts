/** Majina rasmi ya buckets za Supabase Storage — lazima yalingane na migrations (case-sensitive). */
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

export const ALL_STORAGE_BUCKET_NAMES: StorageBucketName[] = Object.values(STORAGE_BUCKETS);

/** Lebo za UI na moduli husika — kwa diagnostics pekee. */
export const STORAGE_BUCKET_REGISTRY: Record<
  StorageBucketName,
  { label: string; module: string; publicBucket: boolean }
> = {
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

/** Buckets zinazohitajika kwa moduli za media (stage2). */
export const MEDIA_MODULE_BUCKET_NAMES: StorageBucketName[] = [
  STORAGE_BUCKETS.churchGallery,
  STORAGE_BUCKETS.churchVideos,
  STORAGE_BUCKETS.churchAudio,
  STORAGE_BUCKETS.churchEventsMedia,
];
