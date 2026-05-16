import { safeLower } from "./safe";

/** Jaribu tena upakiaji wa Storage wakati kosa ni la mtandao / seva ya kati (si MIME wala RLS). */
export function isRetriableStorageErrorMessage(message: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return (
    m.includes("network") ||
    m.includes("failed to fetch") ||
    m.includes("timeout") ||
    m.includes("timed out") ||
    m.includes("load failed") ||
    m.includes("503") ||
    m.includes("502") ||
    m.includes("504") ||
    m.includes("429")
  );
}

export async function runStorageOpWithRetries<T extends { error: { message?: string } | null }>(
  op: () => Promise<T>,
  opts?: { retries?: number; delayMs?: number }
): Promise<T> {
  const retries = opts?.retries ?? 3;
  const base = opts?.delayMs ?? 400;
  let last!: T;
  for (let attempt = 0; attempt < retries; attempt++) {
    last = await op();
    if (!last.error) return last;
    if (!isRetriableStorageErrorMessage(last.error.message) || attempt === retries - 1) return last;
    await new Promise((r) => setTimeout(r, base * (attempt + 1)));
  }
  return last;
}

/** Thamani ya Content-Type wakati kivinjari hakitoi `file.type` (kawaida Windows / faili zilizohamishwa). */
export function inferContentType(file: File): string | undefined {
  const direct = file.type?.trim();
  if (direct) return direct;
  const name = safeLower(file.name);
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".jfif": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".heic": "image/heic",
    ".heif": "image/heif",
    ".avif": "image/avif",
    ".ico": "image/x-icon",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".zip": "application/zip",
    ".rar": "application/vnd.rar",
    ".mkv": "video/x-matroska",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
  };
  return map[ext] || undefined;
}

/** Chaguo za kawaida kwa upload za bucket za umma (cache ya CDN + aina ya faili halisi kwa Supabase bucket MIME filter). */
export function publicObjectUploadOptions(file: File, opts?: { upsert?: boolean }) {
  const contentType = inferContentType(file);
  return {
    upsert: opts?.upsert ?? true,
    contentType: contentType || undefined,
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
