import { safeLower } from "./safe";

export type FileGuardOptions = {
  allowedExtensions: string[];
  maxBytes: number;
  allowedMimePrefixes?: string[];
  labelSw?: string;
};

export type UploadModuleKey = "documents" | "images" | "audio" | "video" | "archives";

export const UPLOAD_LIMITS_MB: Record<UploadModuleKey, number> = {
  documents: 50,
  images: 15,
  audio: 80,
  video: 300,
  archives: 100,
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
    return "Faili hii hairuhusiwi.";
  }
  if (opts.allowedMimePrefixes?.length) {
    const mime = safeLower(file.type || "");
    const okMime = opts.allowedMimePrefixes.some((p) => mime.startsWith(safeLower(p)));
    if (!okMime) {
      return "Faili hii hairuhusiwi.";
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
