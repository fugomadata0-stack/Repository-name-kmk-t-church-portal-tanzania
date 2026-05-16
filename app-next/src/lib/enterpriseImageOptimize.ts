/** Ukubwa wa juu baada ya kubana (px — upande mrefu). */
const MAX_EDGE_PX = 1920;
const DEFAULT_JPEG_QUALITY = 0.86;

function isOptimizableRaster(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  if (t === "image/svg+xml" || t === "image/gif") return false;
  return t.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|avif)$/i.test(file.name);
}

/**
 * Kubana picha kubwa kabla ya Storage — haraka zaidi, gharama ndogo, CDN-friendly.
 */
export async function optimizeImageForUpload(file: File): Promise<File> {
  if (!isOptimizableRaster(file) || file.size < 256 * 1024) return file;
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const maxEdge = Math.max(bitmap.width, bitmap.height);
    if (maxEdge <= MAX_EDGE_PX) return file;

    const scale = MAX_EDGE_PX / maxEdge;
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", DEFAULT_JPEG_QUALITY);
    });
    if (!blob || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
