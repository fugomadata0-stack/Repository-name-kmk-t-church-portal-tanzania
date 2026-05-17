import type { jsPDF } from "jspdf";
import { CERT } from "../pdfExecutiveCertificate";
import { resolveLeadershipCertificateTheme, themeToPdfCertPalette } from "../leadershipCertificateTheme";
import type { LeadershipCertificateTheme } from "../leadershipCertificateTheme";

export const PDF_LAYOUT = {
  margin: 14,
  frameInset: 5,
  footerReserveMm: 14,
  photoW: 42,
  photoH: 50,
  signatureBlockH: 38,
  bodyBoxH: 34,
} as const;

function pal(theme?: LeadershipCertificateTheme | null) {
  if (!theme) return CERT;
  const p = themeToPdfCertPalette(theme);
  return {
    navy: p.navy,
    gold: p.gold,
    goldSoft: p.goldSoft,
    flagGreen: p.flagGreen,
    goldVibrant: p.goldVibrant,
    ink: p.ink,
    emerald: p.emerald,
  };
}

/** Mistari wima wa rangi — kushoto mwa maudhui. */
export function drawContentVerticalAccentRails(
  doc: jsPDF,
  yTop: number,
  yBottom: number,
  margin: number,
  theme?: LeadershipCertificateTheme | null,
): void {
  const palette = pal(theme);
  const x = margin + 1.5;
  const h = Math.max(8, yBottom - yTop);
  const fg = palette.flagGreen as [number, number, number];
  const gv = palette.goldVibrant as [number, number, number];
  const nv = palette.navy as [number, number, number];
  doc.setFillColor(fg[0], fg[1], fg[2]);
  doc.rect(x, yTop, 1.1, h, "F");
  doc.setFillColor(gv[0], gv[1], gv[2]);
  doc.rect(x + 1.25, yTop, 0.75, h, "F");
  doc.setFillColor(nv[0], nv[1], nv[2]);
  doc.rect(x + 2.15, yTop, 0.45, h, "F");
}

export { resolveLeadershipCertificateTheme };

export function pageBottomY(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight() - PDF_LAYOUT.footerReserveMm;
}

export function contentWidth(doc: jsPDF): number {
  return doc.internal.pageSize.getWidth() - PDF_LAYOUT.margin * 2;
}
