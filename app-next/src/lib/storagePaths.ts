/** NJIA ya faili ndani ya bucket kutoka kwa URL ya umma ya Supabase Storage. */
export function publicStorageObjectPath(fileUrl: string, bucketId: string): string | null {
  const marker = `/object/public/${bucketId}/`;
  const i = fileUrl.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(fileUrl.slice(i + marker.length));
}
