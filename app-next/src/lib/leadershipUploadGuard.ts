import { mbToBytes, validateSelectedFile, type FileGuardOptions } from "./fileUploadGuard";

export type LeadershipUploadKind = "photo" | "signature" | "cv" | "cert" | "attach" | "seal" | "logo";

const GUARDS: Record<LeadershipUploadKind, FileGuardOptions> = {
  photo: {
    allowedExtensions: [".png", ".jpg", ".jpeg", ".webp", ".gif"],
    allowedMimePrefixes: ["image/"],
    maxBytes: mbToBytes(12),
    labelSw: "Picha ya kiongozi",
  },
  signature: {
    allowedExtensions: [".png", ".jpg", ".jpeg", ".webp"],
    allowedMimePrefixes: ["image/"],
    maxBytes: mbToBytes(8),
    labelSw: "Saini",
  },
  seal: {
    allowedExtensions: [".png", ".jpg", ".jpeg", ".webp"],
    allowedMimePrefixes: ["image/"],
    maxBytes: mbToBytes(8),
    labelSw: "Muhuri",
  },
  logo: {
    allowedExtensions: [".png", ".jpg", ".jpeg", ".webp"],
    allowedMimePrefixes: ["image/"],
    maxBytes: mbToBytes(8),
    labelSw: "Nembo",
  },
  cv: {
    allowedExtensions: [".pdf"],
    allowedMimePrefixes: ["application/pdf"],
    maxBytes: mbToBytes(25),
    labelSw: "CV (PDF)",
  },
  cert: {
    allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg", ".webp"],
    allowedMimePrefixes: ["application/pdf", "image/"],
    maxBytes: mbToBytes(20),
    labelSw: "Cheti",
  },
  attach: {
    allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".doc", ".docx"],
    allowedMimePrefixes: ["application/pdf", "image/", "application/msword"],
    maxBytes: mbToBytes(30),
    labelSw: "Kiambatanisho",
  },
};

export function validateLeadershipUploadFile(kind: LeadershipUploadKind, file: File): string | null {
  const guard = GUARDS[kind];
  if (!guard) return "Aina ya upakiaji haijulikani.";
  return validateSelectedFile(file, guard);
}
