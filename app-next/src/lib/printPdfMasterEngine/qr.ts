import { fetchUrlAsPdfImageDataUrl } from "../pdfInstitutional";

export function buildMasterQrDataUrl(verifyUrl: string, size = 280): string {
  const u = String(verifyUrl ?? "").trim();
  if (!u) return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(u)}`;
}

export async function fetchMasterQrImage(verifyUrl: string): Promise<string | null> {
  const src = buildMasterQrDataUrl(verifyUrl);
  if (!src) return null;
  return fetchUrlAsPdfImageDataUrl(src);
}
