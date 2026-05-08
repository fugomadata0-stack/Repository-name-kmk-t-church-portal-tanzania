/** Chaguo za kawaida kwa upload za bucket za umma (cache ya CDN + aina ya faili). */
export function publicObjectUploadOptions(file: File, opts?: { upsert?: boolean }) {
  return {
    upsert: opts?.upsert ?? true,
    contentType: file.type || undefined,
    cacheControl: "3600",
  } as const;
}

export function buildSafeStoragePath(prefix: string, originalName: string): string {
  const clean = originalName
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const stamp = new Date()
    .toISOString()
    .replace(/-/g, "")
    .replace(/:/g, "")
    .replace("T", "")
    .replace("Z", "")
    .replace(/\./g, "")
    .slice(0, 14);
  const safeName = clean || "file";
  return `${prefix}/${stamp}_${crypto.randomUUID()}_${safeName}`;
}
