/** Re-exports kwa ukaguzi wa storage — tumia System Health Center pekee kwenye UI. */
export {
  checkStorageBucketsSummary,
  isStorageBucketNotFoundError,
  isStorageObjectNotFoundError,
  probeStorageBucket,
  probeStorageBuckets,
  type StorageBucketHealthRow,
  type StorageBucketHealthStatus,
} from "./storageBucketProbe";
export {
  ALL_STORAGE_BUCKET_NAMES,
  MEDIA_MODULE_BUCKET_NAMES,
  STORAGE_BUCKET_REGISTRY,
  STORAGE_BUCKETS,
  type StorageBucketName,
} from "./storageBuckets";
