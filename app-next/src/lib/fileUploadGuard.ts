import { safeLower } from "./safe";
import { inferContentType } from "./storageUpload";

export type FileGuardOptions = {
  allowedExtensions: string[];
  maxBytes: number;
  allowedMimePrefixes?: string[];
  labelSw?: string;
};

export type UploadModuleKey = "documents" | "images" | "audio" | "video" | "archives";

export const UPLOAD_LIMITS_MB: Record<UploadModuleKey, number> = {
  documents: 200,
  images: 50,
  audio: 200,
  video: 800,
  archives: 350,
};

const DANGEROUS_EXTENSIONS = [".exe", ".bat", ".cmd", ".js", ".php", ".sh", ".html"] as const;

function fmtMb(n: number): string {
  return `${Math.round((n / (1024 * 1024)) * 10) / 10}MB`;
}

export function mbToBytes(mb: number): number {
  return Math.floor(mb * 1024 * 1024);
}

function fileExt(name: string): string {
  const n = safeLower(name.trim());
  const idx = n.lastIndexOf(".");
  return idx >= 0 ? n.slice(idx) : "";
}

export function sanitizeFileName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "file";
}

export function isDangerousFileExtension(name: string): boolean {
  const ext = fileExt(name);
  return DANGEROUS_EXTENSIONS.includes(ext as (typeof DANGEROUS_EXTENSIONS)[number]);
}

export function validateSelectedFile(file: File, opts: FileGuardOptions): string | null {
  const label = opts.labelSw ?? "faili";
  const name = safeLower(file.name);
  const ext = fileExt(name);
  if (isDangerousFileExtension(name)) {
    return "Faili hii hairuhusiwi.";
  }
  const allowed = opts.allowedExtensions.map((x) => safeLower(x.trim())).filter(Boolean);
  const normalizedAllowed = allowed.map((x) => (x.startsWith(".") ? x : `.${x}`));
  const okExt = normalizedAllowed.some((allowedExt) => ext === allowedExt);
  if (!okExt) {
    return `Kiendelezi si sahihi. Tumia moja ya: ${normalizedAllowed.join(", ")}.`;
  }
  if (opts.allowedMimePrefixes?.length) {
    const direct = safeLower(file.type || "");
    const inferred = safeLower(inferContentType(file) || "");
    const mime = direct || inferred;
    if (!mime) {
      return "Aina ya faili haijulikani — tumia faili yenye kiendelezi kinachokubalika.";
    }
    const okMime = opts.allowedMimePrefixes.some((p) => mime.startsWith(safeLower(p)));
    if (!okMime) {
      return "Aina ya faili (MIME) hairuhusiwi kwa faili hii.";
    }
  }
  if (file.size <= 0) {
    return `${label} ni tupu au imeharibika.`;
  }
  if (file.size > opts.maxBytes) {
    return `Ukubwa wa faili umezidi kiwango. (Kikomo: ${fmtMb(opts.maxBytes)})`;
  }
  return null;
}
