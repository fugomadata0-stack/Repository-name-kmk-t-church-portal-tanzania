import { jsPDF, type jsPDF as JsPDFType } from "jspdf";
import { KMKT_GOLD, KMKT_NAVY, KMKT_SLATE } from "../exportHelpers";
import { drawChurchLogoOnPdf } from "../churchPdfBranding";
import { drawKmktPdfWatermark, normalizePdfReadableText } from "../pdfInstitutional";
import { drawContentVerticalAccentRails } from "../leadershipPdfEngine/layout";
import type { MasterPdfMeta } from "./types";

export const MASTER_PDF = {
  margin: 14,
  headerH: 40,
  footerReserve: 44,
  frameInset: 6,
  contentTop: 48,
  minBottom: 52,
} as const;

export function scopeLabelSw(scope: string): string {
  const map: Record<string, string> = {
    tawi: "Tawi / Branch",
    jimbo: "Jimbo / Presbytery",
    dayosisi: "Dayosisi / Diocese",
    kmkt: "KMK(T) / National",
  };
  return map[scope] ?? scope;
}

export function createMasterPdfDocument(): JsPDFType {
  return new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
}

export function pageSize(doc: JsPDFType): { w: number; h: number } {
  return { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
}

/** Watermark — call once per page before content when building fresh pages. */
export function drawMasterWatermark(doc: JsPDFType, line2: string): void {
  drawKmktPdfWatermark(doc, { line1: "KMK(T)", line2 });
}

/** Pande mbili za mistari — kushoto na kulia. */
export function drawMasterVerticalRails(doc: JsPDFType, yTop: number, yBottom: number): void {
  const { w } = pageSize(doc);
  const m = MASTER_PDF.margin;
  drawContentVerticalAccentRails(doc, yTop, yBottom, m);
  drawContentVerticalAccentRails(doc, yTop, yBottom, w - m - 5);
}

/** Fremu ya pande mbili — print-stable A4. */
export function drawMasterDoubleBorderFrame(doc: JsPDFType): void {
  const { w, h } = pageSize(doc);
  const outer = MASTER_PDF.frameInset;
  const inner = outer + 2.5;
  doc.setDrawColor(...KMKT_GOLD);
  doc.setLineWidth(0.75);
  doc.rect(outer, outer, w - outer * 2, h - outer * 2);
  doc.setDrawColor(...KMKT_NAVY);
  doc.setLineWidth(0.4);
  doc.rect(inner, inner, w - inner * 2, h - inner * 2);
}

export function drawMasterInstitutionalHeader(doc: JsPDFType, meta: MasterPdfMeta): number {
  const { w } = pageSize(doc);
  const m = MASTER_PDF.margin;

  doc.setFillColor(...KMKT_NAVY);
  doc.rect(0, 0, w, MASTER_PDF.headerH, "F");
  doc.setFillColor(...KMKT_GOLD);
  doc.rect(0, MASTER_PDF.headerH, w, 2.2, "F");

  drawChurchLogoOnPdf(doc, meta.logoDataUrl, { x: m + 1, y: 8, size: 24, whiteBg: true });

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.text(normalizePdfReadableText(meta.titleSw), w / 2, 13, { align: "center" });
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.text(normalizePdfReadableText(meta.titleEn), w / 2, 20, { align: "center" });
  doc.setFontSize(8);
  doc.text(
    normalizePdfReadableText(
      `Ngazi: ${meta.scopeLabel} · ${new Date().toLocaleString("sw-TZ")}`,
    ),
    w / 2,
    28,
    { align: "center" },
  );
  doc.text(
    normalizePdfReadableText("Kanisa la Kiinjili la Kilutheri Tanzania — KMK(T)"),
    w / 2,
    34,
    { align: "center" },
  );

  doc.setTextColor(15, 23, 42);
  let y = MASTER_PDF.contentTop;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("Maelezo / About", m + 4, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const about = `${meta.aboutSw}\n${meta.aboutEn}`;
  const lines = doc.splitTextToSize(normalizePdfReadableText(about), w - m * 2 - 8) as string[];
  doc.text(lines, m + 4, y);
  return y + lines.length * 4 + 6;
}

export type MasterFooterOpts = {
  verifyUrl?: string;
  qrDataUrl?: string | null;
  documentId?: string;
  pageIndex: number;
  pageTotal: number;
  signatureLeft?: string;
  signatureRight?: string;
};

/** Saini, QR, nambari — chini ya ukurasa (hifadhi nafasi). */
export function drawMasterFooterBlock(doc: JsPDFType, opts: MasterFooterOpts): void {
  const { w, h } = pageSize(doc);
  const m = MASTER_PDF.margin;
  const fy = h - MASTER_PDF.footerReserve;
  const sigW = (w - m * 2 - 12) / 2;

  doc.setDrawColor(...KMKT_GOLD);
  doc.setLineWidth(0.35);
  doc.line(m, fy - 4, w - m, fy - 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...KMKT_SLATE);

  const leftTitle = opts.signatureLeft ?? "Katibu Mkuu / General Secretary";
  const rightTitle = opts.signatureRight ?? "Askofu Mkuu / Presiding Bishop";

  doc.line(m + 2, fy + 14, m + 2 + sigW - 4, fy + 14);
  doc.text(leftTitle, m + 2, fy + 18, { maxWidth: sigW - 4 });
  doc.line(m + sigW + 8, fy + 14, w - m - 2, fy + 14);
  doc.text(rightTitle, m + sigW + 8, fy + 18, { maxWidth: sigW - 4 });

  const qr = opts.qrDataUrl?.trim();
  if (qr) {
    const qs = 22;
    const qx = w / 2 - qs / 2;
    try {
      doc.setDrawColor(...KMKT_GOLD);
      doc.setLineWidth(0.4);
      doc.rect(qx - 0.5, fy - 1, qs + 1, qs + 1);
      doc.addImage(qr, "PNG", qx, fy, qs, qs);
    } catch {
      /* skip broken QR */
    }
  }

  if (opts.documentId) {
    doc.setFontSize(7);
    doc.text(`Nambari: ${normalizePdfReadableText(opts.documentId)}`, m + 2, fy + 26);
  }
  if (opts.verifyUrl) {
    const clipped = normalizePdfReadableText(opts.verifyUrl).slice(0, 72);
    doc.text(`Uhakiki: ${clipped}`, m + 2, fy + 30, { maxWidth: w - m * 2 - 30 });
  }

  doc.setFontSize(7);
  doc.text(
    normalizePdfReadableText(`Ukurasa ${opts.pageIndex}/${opts.pageTotal} · A4 Print-Ready · KMK(T) PDF Master`),
    w / 2,
    h - 7,
    { align: "center" },
  );
}

/** Ongeza ukurasa ikiwa hakuna nafasi — epuka kukatwa. */
export function ensureMasterPageSpace(doc: JsPDFType, currentY: number, neededMm: number): number {
  const { h } = pageSize(doc);
  if (currentY + neededMm <= h - MASTER_PDF.minBottom) return currentY;
  doc.addPage();
  drawMasterWatermark(doc, "KMK(T) · PDF MASTER");
  drawMasterDoubleBorderFrame(doc);
  drawMasterVerticalRails(doc, MASTER_PDF.contentTop, h - MASTER_PDF.footerReserve);
  return MASTER_PDF.contentTop;
}

/** Chrome kwa kurasa zilizopo (baada ya autoTable). */
export function applyMasterChromeToAllPages(
  doc: JsPDFType,
  meta: MasterPdfMeta,
  qrDataUrl?: string | null,
): void {
  const total = doc.getNumberOfPages();
  const { h } = pageSize(doc);
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawMasterDoubleBorderFrame(doc);
    drawMasterVerticalRails(doc, MASTER_PDF.frameInset + 4, h - MASTER_PDF.footerReserve - 2);
    drawMasterFooterBlock(doc, {
      verifyUrl: meta.verifyUrl,
      qrDataUrl: i === total ? qrDataUrl : null,
      documentId: meta.documentId,
      pageIndex: i,
      pageTotal: total,
    });
  }
}
