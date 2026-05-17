/**
 * Ultra Premium KMK(T) certificate renderer — university / seminary diploma quality.
 */
import type { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { KMKT_OFFICIAL_NAME, KMKT_SHORT_NAME } from "../../data/kmktCanonicalContent";
import { defaultKmktExecutiveInstitutionLines, mergeKmktInstitutionBlock } from "../kmktExecutiveInstitution";
import { fitPdfLinesToWidth, normalizePdfReadableText } from "../pdfInstitutional";
import type { LeadershipCertificateTheme } from "../leadershipCertificateTheme";
import { resolveLeadershipCertificateTheme, themeToPdfCertPalette } from "../leadershipCertificateTheme";
import { KMK_PREMIUM, PREMIUM_A4, resolvePremiumTypography } from "./premiumDesignSystem";
import type { DocumentCopy } from "./documentCopy";
import type { GovernanceExplainer } from "./governanceCopy";

type Rgb = [number, number, number];

type PremiumPalette = {
  navy: Rgb;
  royal: Rgb;
  gold: Rgb;
  goldLight: Rgb;
  goldPale: Rgb;
  paper: Rgb;
  white: Rgb;
  ink: Rgb;
  inkMuted: Rgb;
  accent: Rgb;
};

function rgb(c: readonly [number, number, number]): Rgb {
  return [c[0], c[1], c[2]];
}

function pal(theme?: LeadershipCertificateTheme | null): PremiumPalette {
  const t = theme ? themeToPdfCertPalette(theme) : null;
  return {
    navy: rgb(t?.navy ?? KMK_PREMIUM.navy),
    royal: rgb(t?.navyMid ?? KMK_PREMIUM.royal),
    gold: rgb(t?.gold ?? KMK_PREMIUM.gold),
    goldLight: rgb(t?.goldSoft ?? KMK_PREMIUM.goldLight),
    goldPale: rgb(KMK_PREMIUM.goldPale),
    paper: rgb(t?.paper ?? KMK_PREMIUM.paper),
    white: rgb(KMK_PREMIUM.white),
    ink: rgb(t?.ink ?? KMK_PREMIUM.ink),
    inkMuted: rgb(KMK_PREMIUM.inkMuted),
    accent: rgb(t?.emerald ?? KMK_PREMIUM.royal),
  };
}

export type PageFoundationOpts = {
  watermarkLine2?: string;
};

function drawSealCircle(
  doc: jsPDF,
  p: PremiumPalette,
  x: number,
  y: number,
  radius: number,
  text: string,
): void {
  doc.setDrawColor(...p.gold);
  doc.setLineWidth(0.35);
  doc.circle(x, y, radius, "S");
  doc.setLineWidth(0.14);
  doc.circle(x, y, radius - 1.6, "S");
  doc.setFont("times", "bold");
  doc.setFontSize(radius > 9 ? 6.2 : 5.4);
  doc.setTextColor(...p.navy);
  const sealLines = doc.splitTextToSize(normalizePdfReadableText(text), radius * 2.2) as string[];
  let sy = y - (sealLines.length * 2.1) / 2 + 1;
  for (const ln of sealLines.slice(0, 3)) {
    doc.text(ln, x, sy, { align: "center" });
    sy += 2.3;
  }
}

/** Double gold frame + corner flourishes + seminary watermark. */
export function drawPremiumPageFoundation(
  doc: jsPDF,
  theme?: LeadershipCertificateTheme | null,
  foundationOpts?: PageFoundationOpts,
): void {
  const p = pal(theme);
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const inset = PREMIUM_A4.frameInset;

  doc.setFillColor(...p.paper);
  doc.rect(0, 0, w, h, "F");

  // Watermark
  const cx = w / 2;
  const cy = h / 2;
  doc.setDrawColor(...p.goldLight);
  doc.setLineWidth(0.28);
  doc.circle(cx, cy, 54, "S");
  doc.setLineWidth(0.14);
  doc.circle(cx, cy, 48, "S");
  doc.setTextColor(248, 246, 240);
  doc.setFont("times", "bold");
  doc.setFontSize(48);
  doc.text(KMKT_SHORT_NAME, cx, cy - 4, { align: "center", angle: -24 });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  const wm2 = foundationOpts?.watermarkLine2?.trim() || "HATI RASMI · SEMINARY GRADE";
  doc.text(wm2, cx, cy + 14, { align: "center", angle: -24 });

  // Outer double border
  doc.setDrawColor(...p.gold);
  doc.setLineWidth(0.85);
  doc.rect(inset, inset, w - inset * 2, h - inset * 2, "S");
  doc.setDrawColor(...p.navy);
  doc.setLineWidth(0.2);
  doc.rect(inset + 1.8, inset + 1.8, w - (inset + 1.8) * 2, h - (inset + 1.8) * 2, "S");
  doc.setDrawColor(...p.gold);
  doc.setLineWidth(0.35);
  doc.rect(inset + 3.2, inset + 3.2, w - (inset + 3.2) * 2, h - (inset + 3.2) * 2, "S");

  // Corner ornaments (gold triangles)
  const s = 11;
  const corners: [number, number, number, number][] = [
    [inset + 3.2, inset + 3.2, 1, 1],
    [w - inset - 3.2, inset + 3.2, -1, 1],
    [inset + 3.2, h - inset - 3.2, 1, -1],
    [w - inset - 3.2, h - inset - 3.2, -1, -1],
  ];
  for (const [ox, oy, dx, dy] of corners) {
    doc.setFillColor(...p.gold);
    doc.triangle(ox, oy, ox + dx * s, oy, ox, oy + dy * s, "F");
    doc.setFillColor(...p.goldLight);
    doc.triangle(ox + dx * 1.5, oy + dy * 1.5, ox + dx * (s * 0.55), oy + dy * 1.5, ox + dx * 1.5, oy + dy * (s * 0.55), "F");
  }

  // Side luxury rails
  const railTop = inset + 18;
  const railBot = h - inset - 18;
  const lx = PREMIUM_A4.margin + 1;
  const rx = w - PREMIUM_A4.margin - 2.5;
  doc.setFillColor(...p.gold);
  doc.rect(lx, railTop, 0.9, railBot - railTop, "F");
  doc.setFillColor(...p.royal);
  doc.rect(lx + 1.1, railTop, 0.45, railBot - railTop, "F");
  doc.setFillColor(...p.accent);
  doc.rect(lx + 1.7, railTop, 0.35, railBot - railTop, "F");
  doc.setFillColor(...p.gold);
  doc.rect(rx, railTop, 0.9, railBot - railTop, "F");
  doc.setFillColor(...p.royal);
  doc.rect(rx + 1.1, railTop, 0.45, railBot - railTop, "F");
  doc.setFillColor(...p.accent);
  doc.rect(rx + 1.7, railTop, 0.35, railBot - railTop, "F");

  doc.setTextColor(...p.ink);
}

export type PremiumHeaderOpts = {
  margin: number;
  logoDataUrl: string | null;
  qrDataUrl: string | null;
  orgLines?: string[];
  certTitleSw: string;
  certTitleEn: string;
  subtitle?: string;
  nationalSubtitle?: string;
  verificationSerial?: string;
  kind: string;
  theme?: LeadershipCertificateTheme | null;
};

/** TOP HEADER — logo centered, official name, gold rules, certificate title. */
export function drawPremiumHeaderBand(doc: jsPDF, opts: PremiumHeaderOpts): number {
  const p = pal(opts.theme);
  const typo = resolvePremiumTypography(opts.kind);
  const w = doc.internal.pageSize.getWidth();
  const m = opts.margin;
  const org = (opts.orgLines?.length ? opts.orgLines : defaultKmktExecutiveInstitutionLines()).map((l) =>
    normalizePdfReadableText(l),
  );

  const headerH = Math.min(PREMIUM_A4.headerMaxH, 34 + org.length * 4.2 + 38);
  const y0 = PREMIUM_A4.frameInset + 4;

  // Navy header panel with tier gradient bands
  doc.setFillColor(...p.navy);
  doc.rect(m - 2, y0, w - (m - 2) * 2, headerH, "F");
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    doc.setFillColor(
      Math.round(p.navy[0] + t * (p.royal[0] - p.navy[0])),
      Math.round(p.navy[1] + t * (p.royal[1] - p.navy[1])),
      Math.round(p.navy[2] + t * (p.royal[2] - p.navy[2])),
    );
    doc.rect(m - 2, y0 + i * 1.2, w - (m - 2) * 2, 1.25, "F");
  }
  doc.setFillColor(...p.accent);
  doc.rect(m - 2, y0 + headerH - 4.8, w - (m - 2) * 2, 0.35, "F");
  doc.setFillColor(...p.royal);
  doc.rect(m - 2, y0 + headerH - 2.2, w - (m - 2) * 2, 2.2, "F");
  doc.setFillColor(...p.gold);
  doc.rect(m - 2, y0 + headerH - 3.6, w - (m - 2) * 2, 0.75, "F");

  const cx = w / 2;
  let hy = y0 + 6;

  // Centered logo
  const logo = opts.logoDataUrl?.trim();
  if (logo) {
    try {
      const ls = PREMIUM_A4.logoSize;
      doc.setFillColor(...p.white);
      doc.circle(cx, hy + ls / 2, ls / 2 + 1.2, "F");
      doc.setDrawColor(...p.gold);
      doc.setLineWidth(0.35);
      doc.circle(cx, hy + ls / 2, ls / 2 + 1.2, "S");
      doc.addImage(logo, logo.includes("jpeg") ? "JPEG" : "PNG", cx - ls / 2, hy, ls, ls);
      hy += ls + 4;
    } catch {
      hy += 4;
    }
  }

  doc.setTextColor(...p.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(typo.orgSize + 0.5);
  doc.text(KMKT_OFFICIAL_NAME, cx, hy, { align: "center", maxWidth: w - m * 2 - 8 });
  hy += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(typo.orgSize - 0.5);
  for (const ln of org.slice(0, 4)) {
    doc.text(ln, cx, hy, { align: "center", maxWidth: w - m * 2 - 10 });
    hy += 3.8;
  }

  if (opts.nationalSubtitle?.trim()) {
    hy += 1;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...p.goldLight);
    doc.text(normalizePdfReadableText(opts.nationalSubtitle), cx, hy, { align: "center" });
    hy += 4;
  }

  // Decorative gold lines
  hy += 1;
  doc.setDrawColor(...p.gold);
  doc.setLineWidth(0.2);
  doc.line(cx - 42, hy, cx + 42, hy);
  doc.setLineWidth(0.45);
  doc.line(cx - 28, hy + 1.2, cx + 28, hy + 1.2);
  hy += 6;

  doc.setFont("helvetica", "bold");
  const sw = normalizePdfReadableText(opts.certTitleSw);
  const tSw = fitPdfLinesToWidth(doc, sw, w - m * 2 - 16, typo.certTitleSwSize, 11, 2);
  doc.setFontSize(tSw.fontSize);
  doc.setTextColor(...p.white);
  for (const ln of tSw.lines) {
    doc.text(ln.toUpperCase(), cx, hy, { align: "center" });
    hy += tSw.lineHeight;
  }

  doc.setFont("times", "italic");
  const en = normalizePdfReadableText(opts.certTitleEn);
  const tEn = fitPdfLinesToWidth(doc, en, w - m * 2 - 16, typo.certTitleEnSize, 9.5, 2);
  doc.setFontSize(tEn.fontSize);
  doc.setTextColor(...p.goldLight);
  for (const ln of tEn.lines) {
    doc.text(ln, cx, hy, { align: "center" });
    hy += tEn.lineHeight;
  }

  if (opts.subtitle?.trim()) {
    hy += 1;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(226, 232, 240);
    doc.text(normalizePdfReadableText(opts.subtitle), cx, hy, { align: "center", maxWidth: w - m * 2 - 12 });
    hy += 4;
  }

  // QR top-right in header zone
  const qr = opts.qrDataUrl?.trim();
  if (qr) {
    try {
      const qs = PREMIUM_A4.qrSize;
      const qx = w - m - qs - 2;
      const qy = y0 + 5;
      doc.setFillColor(...p.white);
      doc.roundedRect(qx, qy, qs, qs, 2, 2, "F");
      doc.setDrawColor(...p.gold);
      doc.setLineWidth(0.25);
      doc.roundedRect(qx, qy, qs, qs, 2, 2, "S");
      doc.addImage(qr, "PNG", qx + 1.2, qy + 1.2, qs - 2.4, qs - 2.4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(4.8);
      doc.setTextColor(...p.goldLight);
      doc.text("VERIFY", qx + qs / 2, qy + qs + 3.2, { align: "center" });
    } catch {
      /* optional */
    }
  }

  doc.setTextColor(...p.ink);
  return y0 + headerH + 5;
}

export type PremiumLaureateOpts = {
  margin: number;
  name: string;
  cheo: string;
  hierarchy: string;
  leadershipLevel?: string;
  kind: string;
  photoDataUrl?: string | null;
  theme?: LeadershipCertificateTheme | null;
};

/** CENTER — large elegant name, position, level (diploma presentation). */
export function drawPremiumLaureateBlock(doc: jsPDF, startY: number, opts: PremiumLaureateOpts): number {
  const p = pal(opts.theme);
  const typo = resolvePremiumTypography(opts.kind);
  const w = doc.internal.pageSize.getWidth();
  const m = opts.margin;
  const cx = w / 2;

  let y = startY + 4;
  const photoW = PREMIUM_A4.portraitW;
  const photoH = PREMIUM_A4.portraitH;
  const photoX = w - m - photoW - 2;
  const textW = w - m * 2 - photoW - 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...p.inkMuted);
  doc.text("HII HATI INATOLEWA KWA", cx, y, { align: "center" });
  y += 7;

  doc.setFont("times", "bold");
  doc.setTextColor(...p.navy);
  const name = normalizePdfReadableText(opts.name);
  const nameFit = fitPdfLinesToWidth(doc, name, textW, typo.nameSize, 12, 3);
  doc.setFontSize(nameFit.fontSize);
  for (const ln of nameFit.lines) {
    doc.text(ln, cx, y, { align: "center" });
    y += nameFit.lineHeight + 0.5;
  }

  y += 2;
  doc.setDrawColor(...p.gold);
  doc.setLineWidth(0.35);
  doc.line(cx - 35, y, cx + 35, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(typo.cheoSize);
  doc.setTextColor(...p.royal);
  const cheo = normalizePdfReadableText(opts.cheo);
  const cheoLines = doc.splitTextToSize(cheo.toUpperCase(), textW) as string[];
  for (const ln of cheoLines.slice(0, 2)) {
    doc.text(ln, cx, y, { align: "center" });
    y += 5.5;
  }

  const level = normalizePdfReadableText(opts.leadershipLevel || opts.hierarchy);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(typo.levelSize);
  doc.setTextColor(...p.inkMuted);
  doc.text(level, cx, y, { align: "center", maxWidth: textW });
  y += 6;

  const img = opts.photoDataUrl?.trim();
  const photoY = startY + 6;
  doc.setFillColor(...p.goldPale);
  doc.roundedRect(photoX - 1.2, photoY - 1.2, photoW + 2.4, photoH + 2.4, 2.5, 2.5, "F");
  doc.setDrawColor(...p.gold);
  doc.setLineWidth(0.5);
  doc.roundedRect(photoX - 1.2, photoY - 1.2, photoW + 2.4, photoH + 2.4, 2.5, 2.5, "S");
  doc.setDrawColor(...p.navy);
  doc.setLineWidth(0.15);
  doc.roundedRect(photoX - 0.5, photoY - 0.5, photoW + 1, photoH + 1, 2.2, 2.2, "S");
  if (img) {
    try {
      doc.addImage(img, img.includes("jpeg") ? "JPEG" : "PNG", photoX, photoY, photoW, photoH);
    } catch {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.text("Picha", photoX + photoW / 2, photoY + photoH / 2, { align: "center" });
    }
  }

  doc.setTextColor(...p.ink);
  return Math.max(y + 4, photoY + photoH + 6);
}

/** Body citation in gold-trim panel. */
export function drawPremiumCitationPanel(
  doc: jsPDF,
  y: number,
  margin: number,
  body: string,
  kind: string,
  theme?: LeadershipCertificateTheme | null,
): number {
  const p = pal(theme);
  const typo = resolvePremiumTypography(kind);
  const w = doc.internal.pageSize.getWidth();
  const boxW = w - margin * 2 - 8;
  const bodyText = normalizePdfReadableText(body);
  const lines = doc.splitTextToSize(bodyText, boxW - 10) as string[];
  const lineH = 4.6;
  const boxH = Math.min(38, 10 + lines.length * lineH);

  doc.setFillColor(...p.goldPale);
  doc.roundedRect(margin + 4, y, boxW, boxH, 2.5, 2.5, "F");
  doc.setDrawColor(...p.gold);
  doc.setLineWidth(0.28);
  doc.roundedRect(margin + 4, y, boxW, boxH, 2.5, 2.5, "S");

  doc.setFont("times", "italic");
  doc.setFontSize(typo.bodySize);
  doc.setTextColor(...p.navy);
  let by = y + 7;
  for (const ln of lines.slice(0, 6)) {
    doc.text(ln, margin + 9, by);
    by += lineH;
  }
  return y + boxH + 5;
}

/** Governance explainer — document purpose, level, approval authority (print-stable). */
export function drawPremiumGovernancePanels(
  doc: jsPDF,
  y: number,
  margin: number,
  explainer: GovernanceExplainer,
  theme?: LeadershipCertificateTheme | null,
): number {
  const p = pal(theme);
  const w = doc.internal.pageSize.getWidth();
  const pageBottom = doc.internal.pageSize.getHeight() - PREMIUM_A4.footerReserve - 6;
  if (y + 26 > pageBottom) return y;

  const boxW = w - margin * 2 - 8;
  const boxH = 26;
  doc.setFillColor(255, 252, 248);
  doc.roundedRect(margin + 4, y, boxW, boxH, 2, 2, "F");
  doc.setDrawColor(...p.gold);
  doc.setLineWidth(0.32);
  doc.roundedRect(margin + 4, y, boxW, boxH, 2, 2, "S");
  doc.setDrawColor(...p.royal);
  doc.setLineWidth(0.12);
  doc.line(margin + 8, y + 8.5, margin + boxW - 4, y + 8.5);
  doc.line(margin + 8, y + 17, margin + boxW - 4, y + 17);

  const colW = (boxW - 14) / 3;
  const blocks: { title: string; sw: string }[] = [
    { title: "HATI / DOCUMENT", sw: explainer.documentPurposeSw },
    { title: "NGAZI / LEVEL", sw: explainer.levelExplainerSw },
    { title: "IDHINI / AUTHORITY", sw: explainer.approvalAuthoritySw },
  ];

  let bx = margin + 8;
  for (const block of blocks) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.8);
    doc.setTextColor(...p.navy);
    doc.text(block.title, bx, y + 4.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...p.ink);
    const lines = doc.splitTextToSize(normalizePdfReadableText(block.sw), colW - 2) as string[];
    let ly = y + 9;
    for (const ln of lines.slice(0, 3)) {
      doc.text(ln, bx, ly);
      ly += 2.6;
    }
    bx += colW + 2;
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(5.2);
  doc.setTextColor(...p.inkMuted);
  doc.text(normalizePdfReadableText(explainer.hierarchyChain), w / 2, y + boxH - 2.5, { align: "center" });

  return y + boxH + 4;
}

/** Inked details grid (compact, seminary register style). */
export function drawPremiumInkedRegister(
  doc: jsPDF,
  y: number,
  margin: number,
  rows: string[][],
  theme?: LeadershipCertificateTheme | null,
): number {
  const p = pal(theme);
  const w = doc.internal.pageSize.getWidth();
  const pageBottom = doc.internal.pageSize.getHeight() - PREMIUM_A4.footerReserve;

  if (y + 28 > pageBottom) return y;

  autoTable(doc, {
    startY: y,
    margin: { left: margin + 5, right: margin },
    tableWidth: w - margin * 2 - 5,
    head: [["Sehemu / Section", "Taarifa / Particulars"]],
    body: rows.map(([a, b]) => [normalizePdfReadableText(a), normalizePdfReadableText(b)]),
    styles: {
      fontSize: 7.2,
      cellPadding: 1.8,
      overflow: "linebreak",
      lineColor: [212, 175, 55],
      lineWidth: 0.1,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [p.navy[0], p.navy[1], p.navy[2]],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [255, 252, 248] },
    columnStyles: {
      0: { cellWidth: 46, fontStyle: "bold", textColor: [18, 60, 105] },
      1: { cellWidth: "auto" },
    },
    theme: "grid",
  });
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
  return Math.min((finalY ?? y + 24) + 3, pageBottom - 2);
}

export type PremiumFooterOpts = {
  margin: number;
  signatureDataUrl?: string | null;
  signerName?: string;
  signerTitle?: string;
  sealText?: string;
  localSealText?: string | null;
  certificateNumber?: string;
  verificationId?: string;
  verifyUrl?: string;
  issuedDate?: string;
  authorityLine?: string;
  qrDataUrl?: string | null;
  theme?: LeadershipCertificateTheme | null;
};

/** BOTTOM — signatures, seal, QR, cert number, issue date, authority. */
export function drawPremiumFooterAuthority(doc: jsPDF, opts: PremiumFooterOpts): void {
  const p = pal(opts.theme);
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const m = opts.margin;
  const footerTop = h - PREMIUM_A4.footerReserve;

  doc.setDrawColor(...p.gold);
  doc.setLineWidth(0.35);
  doc.line(m + 4, footerTop, w - m - 4, footerTop);

  let fy = footerTop + 5;
  const sig = opts.signatureDataUrl?.trim();
  const sigW = 52;
  const sigH = 20;

  if (sig) {
    try {
      doc.setDrawColor(...p.navy);
      doc.setLineWidth(0.15);
      doc.roundedRect(m + 4, fy, sigW, sigH, 1.5, 1.5, "S");
      doc.addImage(sig, sig.includes("jpeg") ? "JPEG" : "PNG", m + 6, fy + 2, sigW - 4, sigH - 4);
    } catch {
      /* */
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...p.navy);
  doc.text(normalizePdfReadableText(opts.signerName || "—"), m + 4 + (sig ? sigW + 5 : 0), fy + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...p.royal);
  doc.text(normalizePdfReadableText(opts.signerTitle || "Cheo cha idhini"), m + 4 + (sig ? sigW + 5 : 0), fy + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...p.inkMuted);
  doc.text("Saini rasmi / Official Signature", m + 4, fy + sigH + 4);

  const sealX = w / 2;
  const sealY = fy + 10;
  const localSeal = opts.localSealText?.trim();
  if (localSeal) {
    drawSealCircle(doc, p, sealX - 30, sealY, 8.5, localSeal);
  }
  drawSealCircle(doc, p, sealX, sealY, 11, opts.sealText || "MUHURI RASMI KMK(T)");

  // QR bottom-right
  const qr = opts.qrDataUrl?.trim();
  if (qr) {
    try {
      const qs = 22;
      const qx = w - m - qs - 4;
      doc.setFillColor(...p.white);
      doc.roundedRect(qx, fy, qs, qs, 1.8, 1.8, "F");
      doc.setDrawColor(...p.gold);
      doc.roundedRect(qx, fy, qs, qs, 1.8, 1.8, "S");
      doc.addImage(qr, "PNG", qx + 1, fy + 1, qs - 2, qs - 2);
    } catch {
      /* */
    }
  }

  fy = footerTop + 32;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...p.ink);
  const certNo = opts.certificateNumber?.trim();
  const vrf = opts.verificationId?.trim();
  if (certNo) doc.text(`Nambari ya cheti: ${certNo}`, m + 4, fy);
  if (vrf) doc.text(`Uhakiki: ${vrf}`, m + 4, fy + 3.8);
  doc.text(`Tarehe: ${opts.issuedDate ?? new Date().toLocaleDateString("sw-TZ", { dateStyle: "long" })}`, w - m - 4, fy, {
    align: "right",
  });
  if (opts.authorityLine?.trim()) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.5);
    doc.text(normalizePdfReadableText(opts.authorityLine), w / 2, fy + 8, { align: "center", maxWidth: w - m * 2 });
  }
  if (opts.verifyUrl?.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...p.royal);
    const vu = normalizePdfReadableText(opts.verifyUrl);
    const clipped = vu.length > 72 ? `${vu.slice(0, 69)}…` : vu;
    doc.text(`Uhakiki QR: ${clipped}`, w / 2, fy + 12, { align: "center", maxWidth: w - m * 2 - 8 });
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(5.8);
  doc.setTextColor(...p.inkMuted);
  doc.text("A4 · Print-Perfect · KMK(T) Print & PDF Master Engine", w / 2, h - 6, { align: "center" });
}

export type RenderUltraPremiumInput = {
  doc: jsPDF;
  copy: DocumentCopy;
  kind: string;
  margin: number;
  logoDataUrl: string | null;
  qrDataUrl: string | null;
  orgLines?: string[] | null;
  name: string;
  cheo: string;
  hierarchy: string;
  leadershipLevel?: string;
  bodyText: string;
  detailRows: string[][];
  photoDataUrl?: string | null;
  signatureDataUrl?: string | null;
  certificateNumber?: string;
  verificationId?: string;
  approverName?: string;
  approverTitle?: string;
  governance?: GovernanceExplainer | null;
  verifyUrl?: string;
  theme?: LeadershipCertificateTheme | null;
  levelRibbon?: string;
  localSealText?: string | null;
  watermarkLine2?: string;
};

/** Full page composition — single orchestrated pass. */
export function renderUltraPremiumCertificatePage(input: RenderUltraPremiumInput): void {
  const theme =
    input.theme ??
    resolveLeadershipCertificateTheme({
      cheo: input.cheo,
      leadershipLevel: input.leadershipLevel,
    });

  drawPremiumPageFoundation(input.doc, theme, {
    watermarkLine2: input.watermarkLine2 ?? input.copy.watermarkLine2,
  });

  const ribbon =
    input.levelRibbon?.trim() ||
    (input.kind === "executive_bishop_certificate"
      ? "Uongozi wa Kitaifa · Mamlaka ya Askofu"
      : undefined);

  const yAfterHeader = drawPremiumHeaderBand(input.doc, {
    margin: input.margin,
    logoDataUrl: input.logoDataUrl,
    qrDataUrl: input.qrDataUrl,
    orgLines: mergeKmktInstitutionBlock(input.orgLines ?? null),
    certTitleSw: input.copy.certTitleSw,
    certTitleEn: input.copy.certTitleEn,
    subtitle: input.hierarchy,
    nationalSubtitle: ribbon,
    verificationSerial: input.certificateNumber || input.verificationId,
    kind: input.kind,
    theme,
  });

  let y = drawPremiumLaureateBlock(input.doc, yAfterHeader, {
    margin: input.margin,
    name: input.name,
    cheo: input.cheo,
    hierarchy: input.hierarchy,
    leadershipLevel: input.leadershipLevel,
    kind: input.kind,
    photoDataUrl: input.photoDataUrl,
    theme,
  });

  y = drawPremiumCitationPanel(input.doc, y, input.margin, input.bodyText, input.kind, theme);

  if (input.governance) {
    y = drawPremiumGovernancePanels(input.doc, y, input.margin, input.governance, theme);
  }

  const pageBottom = input.doc.internal.pageSize.getHeight() - PREMIUM_A4.footerReserve - 8;
  if (y + 20 < pageBottom) {
    y = drawPremiumInkedRegister(input.doc, y, input.margin, input.detailRows.slice(0, 8), theme);
  }

  const authorityLine = input.governance
    ? `Idhini: ${input.governance.approvalAuthoritySw.slice(0, 120)}`
    : "Idhini ya Kanisa la Mennonite la Kiinjili Tanzania (KMK(T))";

  drawPremiumFooterAuthority(input.doc, {
    margin: input.margin,
    signatureDataUrl: input.signatureDataUrl,
    signerName: input.approverName,
    signerTitle: input.approverTitle,
    sealText: input.copy.sealText,
    localSealText: input.localSealText,
    certificateNumber: input.certificateNumber,
    verificationId: input.verificationId,
    verifyUrl: input.verifyUrl,
    issuedDate: new Date().toLocaleDateString("sw-TZ", { dateStyle: "long" }),
    authorityLine,
    qrDataUrl: input.qrDataUrl,
    theme,
  });
}
