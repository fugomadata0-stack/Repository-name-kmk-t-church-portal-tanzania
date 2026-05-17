import { jsPDF } from "jspdf";
import {
  buildLeadershipVerificationUrl,
  formatLeadershipCredentialSerial,
  mergeKmktInstitutionBlock,
} from "./kmktExecutiveInstitution";
import { resolveChurchLogoDataUrl } from "./churchPdfBranding";
import { fetchUrlAsPdfImageDataUrl, normalizePdfReadableText } from "./pdfInstitutional";
import {
  CERT,
  drawAuthorizationFooterBlock,
  drawCertificateOrnamentalFrame,
  drawExecutiveCertificateHeaderBand,
  drawExecutivePortraitFrame,
  drawLuxuryCertificateWatermark,
  drawLuxurySectionBar,
  resolveLeadershipCertificateTheme,
} from "./pdfExecutiveCertificate";
import { nationalLeadershipDisplayTitle, type NationalLeadershipProfileRow } from "../services/nationalLeadershipService";

const FOOTER_RESERVE_MM = 14;

function applyFooters(doc: jsPDF, rightTag: string) {
  const total = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  const ts = new Date().toLocaleString("sw-TZ");
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...CERT.gold);
    doc.setLineWidth(0.2);
    doc.line(margin, pageH - FOOTER_RESERVE_MM + 2, pageW - margin, pageH - FOOTER_RESERVE_MM + 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Ukurasa ${i} / ${total}`, margin, pageH - 5);
    doc.text(ts, pageW / 2, pageH - 5, { align: "center", maxWidth: pageW - margin * 2 - 52 });
    doc.text(rightTag.slice(0, 52), pageW - margin, pageH - 5, { align: "right", maxWidth: 52 });
  }
}

export type NationalLeadershipCertificateOpts = {
  portalBaseUrl?: string;
  logoDataUrl?: string | null;
  institutionalLines?: string[];
  officialSealText?: string;
};

/** Cheti cha kiwango cha juu cha uongozi wa kitaifa (PDF) — data kutoka Supabase. */
export async function downloadNationalLeadershipExecutiveCertificate(
  row: NationalLeadershipProfileRow,
  opts?: NationalLeadershipCertificateOpts
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 14;

  const origin = opts?.portalBaseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const base = String(origin || "").replace(/\/$/, "") || "https://v0-church-portal-tanzania.vercel.app";
  const verifyUrl = buildLeadershipVerificationUrl(base, "national", row.role_key);
  const credentialSerial = formatLeadershipCredentialSerial("NAT", row.role_key);
  const roleTitle = nationalLeadershipDisplayTitle(row, "sw");
  const roleTitleEn = nationalLeadershipDisplayTitle(row, "en");
  const theme = resolveLeadershipCertificateTheme({ roleKey: row.role_key, cheo: roleTitle });

  const decoratePage = () => {
    drawLuxuryCertificateWatermark(doc, {
      line1: "KMK(T)",
      line2: "UONGOZI WA KITAIFA · DATA LIVE",
      sealText: "CHETI RASMI",
      theme,
    });
    drawCertificateOrnamentalFrame(doc, 5, theme);
  };
  decoratePage();

  const logo = opts?.logoDataUrl?.trim() ? opts.logoDataUrl : await resolveChurchLogoDataUrl();
  const qr = await fetchUrlAsPdfImageDataUrl(
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`
  );

  y = drawExecutiveCertificateHeaderBand(doc, {
    margin,
    logoDataUrl: logo,
    qrDataUrl: qr,
    orgLines: mergeKmktInstitutionBlock(opts?.institutionalLines ?? null),
    certTitleSw: "WASIFU RASMI WA KIONGOZI",
    certTitleEn: "EXECUTIVE LEADERSHIP PROFILE",
    subtitle: normalizePdfReadableText(`${roleTitle} · ${roleTitleEn}`),
    verificationSerial: credentialSerial,
    theme,
  });

  const photo = row.profile_photo_url?.trim() ? await fetchUrlAsPdfImageDataUrl(row.profile_photo_url) : null;
  const sig = row.signature_url?.trim() ? await fetchUrlAsPdfImageDataUrl(row.signature_url) : null;

  const photoW = 42;
  const photoH = 50;
  const photoX = pageW - margin - photoW;
  const photoY = y;
  const textMaxW = pageW - margin * 2 - photoW - 8;

  doc.setTextColor(...CERT.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const name = row.full_name.trim() || "—";
  const nameLines = doc.splitTextToSize(normalizePdfReadableText(name), textMaxW) as string[];
  let ty = photoY + 8;
  for (const ln of nameLines) {
    doc.text(ln, margin, ty);
    ty += 6.2;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...CERT.emerald);
  doc.text(normalizePdfReadableText(roleTitle), margin, ty + 2);

  doc.setFontSize(8.2);
  doc.setTextColor(...CERT.ink);
  const term = [row.start_date, row.end_date].filter(Boolean).join(" — ") || "—";
  doc.text(`Muda / term: ${term} · Miaka: ${row.term_years != null ? String(row.term_years) : "—"}`, margin, ty + 10, { maxWidth: textMaxW });

  drawExecutivePortraitFrame(doc, photoX, photoY, photo, photoW, photoH);

  y = Math.max(photoY + photoH + 10, ty + 22);

  const pageBottom = () => doc.internal.pageSize.getHeight() - FOOTER_RESERVE_MM;
  const ensureSpace = (h: number) => {
    if (y + h > pageBottom()) {
      doc.addPage();
      decoratePage();
      y = 18;
    }
  };

  const section = (label: string) => {
    ensureSpace(22);
    y = drawLuxurySectionBar(doc, y, margin, pageW, label);
  };

  const rowLine = (k: string, v: string) => {
    ensureSpace(18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...CERT.emerald);
    const keyLines = doc.splitTextToSize(k, 40) as string[];
    doc.text(keyLines, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...CERT.ink);
    const lines = doc.splitTextToSize(v || "—", pageW - margin * 2 - 50) as string[];
    doc.text(lines, margin + 46, y);
    const lh = 4.9;
    y += Math.max(keyLines.length * lh, lines.length * lh, lh + 1);
  };

  if (row.leadership_quote.trim()) {
    section("Kauli ya uongozi");
    ensureSpace(20);
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(margin, y, pageW - margin * 2, 22, 2, 2, "F");
    doc.setDrawColor(...CERT.gold);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, y, pageW - margin * 2, 22, 2, 2, "S");
    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...CERT.navy);
    const qLines = doc.splitTextToSize(normalizePdfReadableText(row.leadership_quote), pageW - margin * 2 - 8) as string[];
    let qy = y + 6;
    for (const ln of qLines.slice(0, 6)) {
      doc.text(ln, margin + 4, qy);
      qy += 5.2;
    }
    y = y + 26;
  }

  const execBio =
    row.biography.trim() ||
    `${row.full_name.trim() || "Kiongozi"} ni ${roleTitle} wa KMK(T) mwenye jukumu la kuwakilisha taasisi rasmi na kuimarisha huduma za kiutawala na kiimani katika ngazi ya kitaifa.`;

  section("Wasifu rasmi / Executive biography");
  ensureSpace(28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.2);
  doc.setTextColor(...CERT.ink);
  doc.setLineHeightFactor(1.62);
  const paras = doc.splitTextToSize(normalizePdfReadableText(execBio), pageW - margin * 2) as string[];
  const lh = 5.1;
  for (const line of paras.slice(0, 28)) {
    ensureSpace(lh + 1);
    doc.text(line, margin, y);
    y += lh;
  }
  doc.setLineHeightFactor(1.15);
  y += 3;

  section("Taarifa binafsi & mawasiliano");
  rowLine("Jinsia", row.gender || "—");
  rowLine("Simu", row.phone || "—");
  rowLine("WhatsApp", row.whatsapp || "—");
  rowLine("Barua pepe", row.email || "—");
  rowLine("Tovuti", row.website_url || "—");

  section("Mahali / Location");
  rowLine("Nchi", row.country || "—");
  rowLine("Mkoa", row.region || "—");
  rowLine("Wilaya", row.district || "—");
  rowLine("Kata", row.ward || "—");
  rowLine("Anwani", row.physical_address || "—");

  if (row.attachments_json.length) {
    section("Viambatanisho");
    for (const a of row.attachments_json) {
      rowLine(a.name || "Kiambatanisho", a.url || "—");
    }
  }

  ensureSpace(38);
  y += 4;
  y = drawAuthorizationFooterBlock(doc, y, margin, pageW, {
    signatureDataUrl: sig,
    signerName: row.full_name.trim() || undefined,
    signerTitle: roleTitle,
    sealText: opts?.officialSealText || "Idhini rasmi — KMK(T) National Leadership · Portal",
  });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.8);
  doc.setTextColor(100, 116, 139);
  doc.text("Hati hii ni ya matumizi ya ndani / rasmi za kanisa. Thibitisha kwa QR.", margin, y);
  y += 5;

  applyFooters(doc, credentialSerial);
  const safe = row.full_name.trim().replace(/\s+/g, "-").slice(0, 36) || row.role_key;
  doc.save(`cheti-uongozi-kitaifa-${safe}.pdf`);
}
