/**
 * Institutional PDF helpers used by `exportHelpers.ts` and `leadershipPdf.ts`.
 * Resolved as `./pdfInstitutional` — must remain in repo for CI / Linux builds.
 */
import type { jsPDF } from "jspdf";

/** Safisha kujitosha na kuunganisha nafasi ili maneno yasisiane kwenye PDF. */
export function normalizePdfReadableText(text: string): string {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

export type PdfWatermarkOpts = {
  /** Mstari mkubwa (mf. KMK(T)) */
  line1?: string;
  /** Neno dogo chini (mf. HATI RASMI · LIVE DATA) */
  line2?: string;
};

/**
 * Watermark ya kiinstitutional — huchorwa kabla ya maudhui kwenye ukurasa (willDrawPage / mwanzo wa ukurasa).
 */
export function drawKmktPdfWatermark(doc: jsPDF, opts?: PdfWatermarkOpts): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const cx = pageWidth / 2;
  const cy = pageHeight / 2;
  const line1 = normalizePdfReadableText(opts?.line1 ?? "KMK(T)");
  const line2 = normalizePdfReadableText(opts?.line2 ?? "HATI RASMI · DATA HAI KUTOKA SUPABASE");

  doc.setTextColor(236, 240, 247);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(46);
  doc.text(line1, cx, cy - 4, { align: "center", angle: -24 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text(line2, cx, cy + 10, { align: "center", angle: -24 });

  doc.setTextColor(15, 23, 42);
}

/** Punguza ukubwa wa font hadi maandishi yapo kwenye upana bila mistari mingi sana. */
export function fitPdfLinesToWidth(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  startFontSize: number,
  minFontSize: number,
  maxLines: number
): { lines: string[]; fontSize: number; lineHeight: number } {
  const raw = normalizePdfReadableText(text);
  let fontSize = startFontSize;
  let lines: string[] = [];
  while (fontSize >= minFontSize) {
    doc.setFontSize(fontSize);
    lines = doc.splitTextToSize(raw || "—", maxWidth) as string[];
    if (lines.length <= maxLines) break;
    fontSize -= 0.35;
  }
  const lineHeight = Math.max(6.2, fontSize * 0.48);
  return { lines, fontSize, lineHeight };
}
