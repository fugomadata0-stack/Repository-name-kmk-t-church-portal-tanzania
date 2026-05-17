/**
 * Luxury executive / university-style certificate chrome for leadership PDFs (jsPDF).
 */
import type { jsPDF } from "jspdf";
import { defaultKmktExecutiveInstitutionLines } from "./kmktExecutiveInstitution";
import {
  resolveLeadershipCertificateTheme,
  themeToPdfCertPalette,
  type LeadershipCertificateTheme,
} from "./leadershipCertificateTheme";
import { fitPdfLinesToWidth, normalizePdfReadableText } from "./pdfInstitutional";

export const CERT = {
  navy: [11, 31, 77] as const,
  navyMid: [18, 56, 105] as const,
  /** Dhahabu ya kawaida (miundo ya awali). */
  gold: [212, 175, 55] as const,
  /** Dhahabu ang'avu (#FFD700) — mistari ya msisitizo / bendera. */
  goldVibrant: [255, 215, 0] as const,
  goldSoft: [244, 228, 188] as const,
  emerald: [5, 120, 85] as const,
  /** Kijani cha bendera ya Tanzania (msisitizo). */
  flagGreen: [30, 181, 58] as const,
  flagBlue: [0, 122, 204] as const,
  flagBlack: [15, 23, 42] as const,
  cream: [255, 252, 245] as const,
  paper: [253, 251, 247] as const,
  ink: [30, 41, 59] as const,
};

export function defaultKmktInstitutionalAddressLines(): string[] {
  return defaultKmktExecutiveInstitutionLines();
}

export type ExecutiveCertificatePalette = {
  navy: readonly [number, number, number];
  navyMid: readonly [number, number, number];
  gold: readonly [number, number, number];
  goldSoft: readonly [number, number, number];
  goldVibrant: readonly [number, number, number];
  emerald: readonly [number, number, number];
  flagGreen: readonly [number, number, number];
  flagBlue: readonly [number, number, number];
  flagBlack: readonly [number, number, number];
  cream: readonly [number, number, number];
  paper: readonly [number, number, number];
  ink: readonly [number, number, number];
};

function paletteFromTheme(theme?: LeadershipCertificateTheme | null): ExecutiveCertificatePalette {
  if (!theme) return CERT;
  const p = themeToPdfCertPalette(theme);
  return {
    navy: p.navy,
    navyMid: p.navyMid,
    gold: p.gold,
    goldSoft: p.goldSoft,
    goldVibrant: p.goldVibrant,
    emerald: p.emerald,
    flagGreen: p.flagGreen,
    flagBlue: p.flagBlue,
    flagBlack: p.flagBlack,
    cream: p.cream,
    paper: p.paper,
    ink: p.ink,
  };
}

/** Pembe nne — mistari ya rangi za bendera (institutional premium). */
export function drawNationalFlagCornerOrnaments(doc: jsPDF, theme?: LeadershipCertificateTheme | null, insetMm = 5): void {
  const pal = paletteFromTheme(theme);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const len = 28;
  const thick = 1.1;
  const gap = 0.35;

  const drawCorner = (ox: number, oy: number, dx: number, dy: number) => {
    const stripes = [pal.flagGreen, pal.goldVibrant, pal.flagBlue, pal.flagBlack] as const;
    stripes.forEach((rgb, i) => {
      doc.setDrawColor(...rgb);
      doc.setLineWidth(thick);
      const off = i * (thick + gap);
      doc.line(ox, oy + dy * off, ox + dx * len, oy + dy * off + dx * len * 0.02);
      doc.line(ox + dx * off, oy, ox + dx * off + dy * len * 0.02, oy + dy * len);
    });
  };

  drawCorner(insetMm, insetMm, 1, 1);
  drawCorner(pageW - insetMm, insetMm, -1, 1);
  drawCorner(insetMm, pageH - insetMm, 1, -1);
  drawCorner(pageW - insetMm, pageH - insetMm, -1, -1);
}

export { resolveLeadershipCertificateTheme, type LeadershipCertificateTheme };

/** Mchoro wa watermark + muhuri wa kioo — chini ya maudhui. */
export function drawLuxuryCertificateWatermark(
  doc: jsPDF,
  opts?: { line1?: string; line2?: string; sealText?: string; theme?: LeadershipCertificateTheme | null }
): void {
  const pal = paletteFromTheme(opts?.theme);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const cx = pageW / 2;
  const cy = pageH / 2;
  const line1 = normalizePdfReadableText(opts?.line1 ?? "KMK(T)");
  const line2 = normalizePdfReadableText(opts?.line2 ?? "HATI RASMI · THIBITISHO KWA QR");
  const seal = normalizePdfReadableText(opts?.sealText ?? "CHETI RASMI");

  doc.setDrawColor(...pal.goldSoft);
  doc.setLineWidth(0.35);
  doc.circle(cx, cy, 52, "S");
  doc.setLineWidth(0.18);
  doc.circle(cx, cy, 46, "S");

  doc.setTextColor(250, 248, 242);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(52);
  doc.text(line1, cx, cy - 6, { align: "center", angle: -22 });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  doc.text(line2, cx, cy + 12, { align: "center", angle: -22 });

  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.setTextColor(248, 250, 252);
  doc.text(seal, cx, cy + 22, { align: "center", angle: -22 });

  doc.setTextColor(...CERT.ink);
}

/** Pembe za dhahabu + bingi mbili za ukurasa. */
export function drawCertificateOrnamentalFrame(doc: jsPDF, insetMm = 5, theme?: LeadershipCertificateTheme | null): void {
  const pal = paletteFromTheme(theme);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const x0 = insetMm;
  const y0 = insetMm;
  const x1 = pageW - insetMm;
  const y1 = pageH - insetMm;

  drawNationalFlagCornerOrnaments(doc, theme, insetMm);

  doc.setDrawColor(...pal.gold);
  doc.setLineWidth(0.55);
  doc.rect(x0, y0, x1 - x0, y1 - y0, "S");

  doc.setDrawColor(...pal.navy);
  doc.setLineWidth(0.22);
  doc.rect(x0 + 1.4, y0 + 1.4, x1 - x0 - 2.8, y1 - y0 - 2.8, "S");

  const s = 9;
  doc.setFillColor(...pal.goldSoft);
  doc.triangle(x0, y0, x0 + s, y0, x0, y0 + s, "F");
  doc.triangle(x1, y0, x1 - s, y0, x1, y0 + s, "F");
  doc.triangle(x0, y1, x0 + s, y1, x0, y1 - s, "F");
  doc.triangle(x1, y1, x1 - s, y1, x1, y1 - s, "F");

  doc.setFillColor(...pal.gold);
  doc.triangle(x0 + 1.2, y0 + 1.2, x0 + s * 0.55, y0 + 1.2, x0 + 1.2, y0 + s * 0.55, "F");
  doc.triangle(x1 - 1.2, y0 + 1.2, x1 - s * 0.55, y0 + 1.2, x1 - 1.2, y0 + s * 0.55, "F");
  doc.triangle(x0 + 1.2, y1 - 1.2, x0 + s * 0.55, y1 - 1.2, x0 + 1.2, y1 - s * 0.55, "F");
  doc.triangle(x1 - 1.2, y1 - 1.2, x1 - s * 0.55, y1 - 1.2, x1 - 1.2, y1 - s * 0.55, "F");
}

export type ExecutiveCertificateHeaderOpts = {
  margin: number;
  logoDataUrl: string | null;
  qrDataUrl: string | null;
  orgLines?: string[];
  certTitleSw: string;
  certTitleEn: string;
  subtitle?: string;
  /** Nambari ya kumbukumbu / uhakiki inayoonekana kwenye cheti. */
  verificationSerial?: string;
  theme?: LeadershipCertificateTheme | null;
};

/** Band ya juu ya cheti: navy + dhahabu, nembo, QR, majina makubwa. Rudisha `y` baada ya kanda. */
export function drawExecutiveCertificateHeaderBand(doc: jsPDF, opts: ExecutiveCertificateHeaderOpts): number {
  const pal = paletteFromTheme(opts.theme);
  const pageW = doc.internal.pageSize.getWidth();
  const m = opts.margin;
  const org = (opts.orgLines?.length ? opts.orgLines : defaultKmktInstitutionalAddressLines()).map((l) => normalizePdfReadableText(l));

  const lineCount = Math.max(4, org.length);
  const lineStep = 4.85;
  const headerH = Math.min(128, Math.max(92, 36 + lineCount * lineStep + (opts.subtitle?.trim() ? 24 : 14)));
  doc.setFillColor(...pal.navy);
  doc.rect(0, 0, pageW, headerH, "F");

  doc.setFillColor(...pal.flagGreen);
  doc.rect(0, 0, 2.2, headerH, "F");
  doc.setFillColor(...pal.goldVibrant);
  doc.rect(2.2, 0, 1.4, headerH, "F");

  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    doc.setFillColor(7 + t * 8, 24 + t * 18, 52 + t * 22);
    doc.rect(0, i * 1.1, pageW, 1.15, "F");
  }

  doc.setFillColor(...pal.goldVibrant);
  doc.rect(0, headerH - 1.6, pageW, 1.6, "F");
  doc.setFillColor(...pal.goldSoft);
  doc.rect(0, headerH - 3.2, pageW, 0.9, "F");

  const logo = opts.logoDataUrl?.trim() ? opts.logoDataUrl : null;
  if (logo) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(m, 9, 24, 24, 2.2, 2.2, "F");
      doc.setDrawColor(...pal.gold);
      doc.setLineWidth(0.25);
      doc.roundedRect(m, 9, 24, 24, 2.2, 2.2, "S");
      doc.addImage(logo, logo.includes("jpeg") ? "JPEG" : "PNG", m + 1.1, 10.1, 21.8, 21.8);
    } catch {
      /* optional */
    }
  }

  const qr = opts.qrDataUrl?.trim() ? opts.qrDataUrl : null;
  if (qr) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(pageW - m - 26, 8, 26, 26, 2.2, 2.2, "F");
      doc.setDrawColor(...pal.gold);
      doc.roundedRect(pageW - m - 26, 8, 26, 26, 2.2, 2.2, "S");
      doc.addImage(qr, "PNG", pageW - m - 24.2, 10, 22.4, 22.4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.2);
      doc.setTextColor(255, 255, 255);
      doc.text("THIBITISHO / QR", pageW - m - 13, 37.5, { align: "center" });
      const serial = opts.verificationSerial?.trim();
      if (serial) {
        doc.setFontSize(4.8);
        doc.setTextColor(255, 248, 220);
        doc.text(serial.length > 34 ? `${serial.slice(0, 33)}…` : serial, pageW - m - 13, 41.2, {
          align: "center",
          maxWidth: 28,
        });
      }
    } catch {
      /* optional */
    }
  }

  const textLeft = m + (logo ? 30 : 0);
  const textRight = pageW - m - (qr ? 32 : 0);
  const bandW = Math.max(40, textRight - textLeft);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  let hy = 12;
  for (const ln of org) {
    doc.text(ln, pageW / 2, hy, { align: "center", maxWidth: pageW - m * 2 });
    hy += lineStep;
  }

  hy += 2;
  doc.setDrawColor(...pal.goldSoft);
  doc.setLineWidth(0.12);
  doc.line(pageW / 2 - 38, hy, pageW / 2 + 38, hy);
  hy += 5;

  doc.setFont("helvetica", "bold");
  const swTitle = normalizePdfReadableText(opts.certTitleSw);
  const tSw = fitPdfLinesToWidth(doc, swTitle, bandW, 16, 11, 3);
  doc.setFontSize(tSw.fontSize);
  for (const ln of tSw.lines) {
    doc.text(ln, pageW / 2, hy, { align: "center" });
    hy += tSw.lineHeight;
  }

  doc.setFont("times", "italic");
  doc.setFontSize(10);
  doc.setTextColor(255, 248, 220);
  const enTitle = normalizePdfReadableText(opts.certTitleEn);
  const tEn = fitPdfLinesToWidth(doc, enTitle, bandW, 12, 9.5, 3);
  doc.setFontSize(tEn.fontSize);
  for (const ln of tEn.lines) {
    doc.text(ln, pageW / 2, hy, { align: "center" });
    hy += tEn.lineHeight;
  }

  if (opts.subtitle?.trim()) {
    hy += 1;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(226, 232, 240);
    const sub = fitPdfLinesToWidth(doc, normalizePdfReadableText(opts.subtitle), bandW, 9, 7.5, 3);
    doc.setFontSize(sub.fontSize);
    for (const ln of sub.lines) {
      doc.text(ln, pageW / 2, hy, { align: "center" });
      hy += sub.lineHeight;
    }
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(226, 232, 240);
  doc.text(`Imetolewa: ${new Date().toLocaleString("sw-TZ")}`, pageW / 2, headerH - 6, { align: "center" });

  doc.setTextColor(...CERT.ink);
  return headerH + 6;
}

/** Picha ya paspoti katika fremu ya kiongozi. */
export function drawExecutivePortraitFrame(
  doc: jsPDF,
  x: number,
  y: number,
  photoDataUrl: string | null,
  w = 40,
  h = 48
): void {
  doc.setFillColor(...CERT.cream);
  doc.roundedRect(x - 1, y - 1, w + 2, h + 2, 3, 3, "F");
  doc.setDrawColor(...CERT.gold);
  doc.setLineWidth(0.45);
  doc.roundedRect(x - 1, y - 1, w + 2, h + 2, 3, 3, "S");
  doc.setDrawColor(...CERT.navy);
  doc.setLineWidth(0.15);
  doc.roundedRect(x - 0.5, y - 0.5, w + 1, h + 1, 2.6, 2.6, "S");
  const img = photoDataUrl?.trim();
  if (img) {
    try {
      doc.addImage(img, img.includes("jpeg") ? "JPEG" : "PNG", x, y, w, h);
    } catch {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Picha", x + w / 2, y + h / 2, { align: "center" });
    }
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Picha rasmi", x + w / 2, y + h / 2, { align: "center" });
  }
  doc.setTextColor(...CERT.ink);
}

export type TimelineEntry = {
  start_year: number;
  end_year: number | null;
  position: string;
  institution: string;
  description: string;
};

/** Mstari wa uzoefu kama “executive timeline”. Rudisha urefu wa mm zilizotumika. */
export function drawExecutiveExperienceTimeline(
  doc: jsPDF,
  y: number,
  margin: number,
  contentW: number,
  entries: TimelineEntry[]
): number {
  const railX = margin + 2;
  let cursor = y;
  const lhSmall = 4.6;
  const gap = 5;

  for (const ex of entries) {
    const years = `${ex.start_year}–${ex.end_year == null ? "Sasa" : String(ex.end_year)}`;
    const desc = normalizePdfReadableText(ex.description || "—").slice(0, 420);
    const descLines = doc.splitTextToSize(desc, contentW - 22) as string[];
    const blockH = 10 + descLines.length * lhSmall;

    doc.setFillColor(...CERT.gold);
    doc.rect(railX, cursor, 1.4, blockH, "F");
    doc.setFillColor(...CERT.navy);
    doc.circle(railX + 0.7, cursor + 4, 1.6, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...CERT.gold);
    doc.text(years, margin + 8, cursor + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...CERT.navy);
    doc.text(normalizePdfReadableText(ex.position || "—"), margin + 8, cursor + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(...CERT.emerald);
    doc.text(normalizePdfReadableText(ex.institution || "—"), margin + 8, cursor + 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...CERT.ink);
    let dy = cursor + 20;
    for (const ln of descLines) {
      doc.text(ln, margin + 8, dy);
      dy += lhSmall;
    }

    cursor += blockH + gap;
  }

  return cursor - y;
}

/** Kichwa cha sehemu chenye mstari wa dhahabu. */
export function drawLuxurySectionBar(doc: jsPDF, y: number, margin: number, pageW: number, label: string): number {
  const w = pageW - margin * 2;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, w, 9.5, 1.8, 1.8, "F");
  doc.setFillColor(...CERT.gold);
  doc.rect(margin, y + 3.2, 3.2, 5.6, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.1);
  doc.roundedRect(margin, y, w, 9.5, 1.8, 1.8, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  doc.setTextColor(...CERT.navy);
  doc.text(normalizePdfReadableText(label).toUpperCase(), margin + 6, y + 6.4);
  doc.setTextColor(...CERT.ink);
  return y + 12;
}

/** Saini + idhini + muda (chini). */
export function drawAuthorizationFooterBlock(
  doc: jsPDF,
  y: number,
  margin: number,
  pageW: number,
  opts: {
    signatureDataUrl?: string | null;
    signerName?: string;
    signerTitle?: string;
    sealText?: string;
    generatedAt?: string;
  }
): number {
  let yy = y;
  doc.setDrawColor(...CERT.gold);
  doc.setLineWidth(0.25);
  doc.line(margin, yy, pageW - margin, yy);
  yy += 6;

  const sig = opts.signatureDataUrl?.trim();
  const sigW = 58;
  const sigH = 22;
  if (sig) {
    try {
      doc.setDrawColor(...CERT.navy);
      doc.setLineWidth(0.15);
      doc.roundedRect(margin, yy, sigW, sigH, 1.5, 1.5, "S");
      doc.addImage(sig, sig.includes("jpeg") ? "JPEG" : "PNG", margin + 2, yy + 2, sigW - 4, sigH - 4);
    } catch {
      /* */
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...CERT.navy);
  const name = normalizePdfReadableText(opts.signerName || "");
  const title = normalizePdfReadableText(opts.signerTitle || "");
  doc.text(name || "—", margin + (sig ? sigW + 6 : 0), yy + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...CERT.emerald);
  doc.text(title || "Cheo rasmi", margin + (sig ? sigW + 6 : 0), yy + 11);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const seal = normalizePdfReadableText(opts.sealText || "Idhini ya mfumo rasmi wa KMK(T) Portal");
  const ts = opts.generatedAt ?? new Date().toLocaleString("sw-TZ");
  const rightX = pageW - margin;
  doc.text(seal, rightX, yy + 6, { align: "right", maxWidth: 85 });
  doc.text(`Muda wa wingu / cloud: ${ts}`, rightX, yy + 11, { align: "right", maxWidth: 85 });

  yy += Math.max(sigH, 18) + 4;
  doc.setTextColor(...CERT.ink);
  return yy;
}
