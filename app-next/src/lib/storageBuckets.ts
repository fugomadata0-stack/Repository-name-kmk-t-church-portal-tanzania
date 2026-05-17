/** Majina rasmi ya buckets za Supabase Storage — lazima yalingane na migrations. */
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
