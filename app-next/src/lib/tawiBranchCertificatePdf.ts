import { jsPDF } from "jspdf";
import {
  buildTawiCertificateVerificationUrl,
  formatTawiBranchCredentialSerial,
  mergeKmktInstitutionBlock,
} from "./kmktExecutiveInstitution";
import { fetchUrlAsPdfImageDataUrl, fitPdfLinesToWidth, normalizePdfReadableText } from "./pdfInstitutional";
import {
  CERT,
  drawAuthorizationFooterBlock,
  drawCertificateOrnamentalFrame,
  drawExecutiveCertificateHeaderBand,
  drawLuxuryCertificateWatermark,
  drawLuxurySectionBar,
} from "./pdfExecutiveCertificate";
import type { TawiRecord } from "../types";

const FOOTER_MM = 14;

function applyFooters(doc: jsPDF, serial: string) {
  const total = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const m = 12;
  const ts = new Date().toLocaleString("sw-TZ");
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...CERT.gold);
    doc.setLineWidth(0.2);
    doc.line(m, pageH - FOOTER_MM + 2, pageW - m, pageH - FOOTER_MM + 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Ukurasa ${i} / ${total}`, m, pageH - 5);
    doc.text(ts, pageW / 2, pageH - 5, { align: "center", maxWidth: pageW - m * 2 - 70 });
    doc.text(serial, pageW - m, pageH - 5, { align: "right", maxWidth: 68 });
  }
}

function addDetailLines(doc: jsPDF, y: number, margin: number, pageW: number, pairs: [string, string][]): number {
  const w = pageW - margin * 2;
  let yy = y;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  doc.setTextColor(...CERT.ink);
  for (const [k, v] of pairs) {
    const label = normalizePdfReadableText(k);
    const val = normalizePdfReadableText(v);
    const block = `${label}: ${val}`;
    const lines = doc.splitTextToSize(block, w) as string[];
    for (const ln of lines) {
      if (yy > doc.internal.pageSize.getHeight() - FOOTER_MM - 42) {
        doc.addPage();
        drawLuxuryCertificateWatermark(doc, {
          line1: "KMK(T)",
          line2: "CHETI CHA TAWI · BRANCH CERTIFICATE",
          sealText: "WATERMARK",
        });
        drawCertificateOrnamentalFrame(doc);
        yy = 18;
      }
      doc.text(ln, margin, yy);
      yy += 4.35;
    }
    yy += 1;
  }
  return yy;
}

export type TawiBranchCertificatePdfOpts = {
  portalBaseUrl?: string;
  logoDataUrl?: string | null;
  institutionalLines?: string[] | null;
};

/**
 * Cheti cha kitaaluma cha tawi/kituo: mandhari ya navy/dhahabu, watermark KMK(T), QR, nambari ya mfululizo, eneo la muhuri.
 */
export async function downloadTawiBranchCertificatePdf(tawi: TawiRecord, opts?: TawiBranchCertificatePdfOpts): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const origin = opts?.portalBaseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const base = String(origin || "").replace(/\/$/, "") || "https://v0-church-portal-tanzania.vercel.app";
  const verifyUrl = buildTawiCertificateVerificationUrl(base, tawi.id);
  const serial = formatTawiBranchCredentialSerial(tawi.id);

  const decorate = () => {
    drawLuxuryCertificateWatermark(doc, {
      line1: "KMK(T)",
      line2: "CHETI CHA TAWI · THIBITISHO KWA QR",
      sealText: "HATI RASMI",
    });
    drawCertificateOrnamentalFrame(doc);
  };
  decorate();

  const logo =
    (opts?.logoDataUrl?.trim() ? opts.logoDataUrl : null) ||
    (await fetchUrlAsPdfImageDataUrl(`${base}/pwa-192.png`));

  const qr = verifyUrl
    ? await fetchUrlAsPdfImageDataUrl(
        `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`,
      )
    : null;

  let y = drawExecutiveCertificateHeaderBand(doc, {
    margin,
    logoDataUrl: logo,
    qrDataUrl: qr,
    orgLines: mergeKmktInstitutionBlock(opts?.institutionalLines ?? null),
    certTitleSw: "CHETI CHA USAJILI WA TAWI",
    certTitleEn: "Branch Registration Certificate",
    subtitle: "Hati hii inathibitisha kuwa tawi/kituo kilichoorodheshwa ni sehemu ya muundo rasmi wa KMK(T) Tanzania.",
    verificationSerial: serial,
  });

  y += 4;
  y = drawLuxurySectionBar(doc, y, margin, pageW, "Taarifa za tawi / Branch");

  const gps =
    tawi.gps_lat != null && tawi.gps_lng != null && Number.isFinite(tawi.gps_lat) && Number.isFinite(tawi.gps_lng)
      ? `${tawi.gps_lat}, ${tawi.gps_lng}`
      : "—";

  const pairs: [string, string][] = [
    ["Jina la tawi", tawi.jina],
    ["Branch code", tawi.branch_code?.trim() || "—"],
    ["Aina", tawi.aina || "—"],
    ["Dayosisi", tawi.dayosisi || "—"],
    ["Jimbo", tawi.jimbo || "—"],
    ["Mkoa", tawi.mkoa?.trim() || "—"],
    ["Wilaya", tawi.wilaya?.trim() || "—"],
    ["Kata", tawi.kata?.trim() || "—"],
    ["Kijiji / mtaa", tawi.mtaa?.trim() || "—"],
    ["GPS", gps],
    ["Tarehe ya kuanzishwa", tawi.founded_date ? String(tawi.founded_date).slice(0, 10) : "—"],
    ["Kiongozi wa tawi", tawi.kiongozi?.trim() || "—"],
    ["Simu", tawi.simu?.trim() || "—"],
    ["Hali (status)", String(tawi.status ?? "—")],
    ["Uhakiki wa usajili", String(tawi.verification_status ?? "unverified")],
    ...(tawi.verified_at
      ? ([["Imethibitishwa (sajili)", String(tawi.verified_at).slice(0, 19).replace("T", " ")]] as [string, string][])
      : []),
    ["Kitambulisho cha mfumo (UUID)", tawi.id],
  ];
  y = addDetailLines(doc, y, margin, pageW, pairs);

  y += 2;
  doc.setFont("times", "italic");
  doc.setFontSize(9.2);
  doc.setTextColor(51, 65, 85);
  const body =
    "Kwa niaba ya taasisi, hati hii inapatikana kwa matumizi ya ndani ya kanisa, uwasilishaji kwa mamlaka husika, na uthibitisho wa uwepo wa tawi lilo sajiliwa kwenye mfumo wa KMK(T) Tanzania Portal.";
  const fit = fitPdfLinesToWidth(doc, normalizePdfReadableText(body), pageW - margin * 2, 10, 8, 5);
  doc.setFontSize(fit.fontSize);
  for (const ln of fit.lines) {
    if (y > doc.internal.pageSize.getHeight() - FOOTER_MM - 48) {
      doc.addPage();
      decorate();
      y = 22;
    }
    doc.text(ln, margin, y, { maxWidth: pageW - margin * 2 });
    y += fit.lineHeight;
  }

  y += 6;
  if (y > doc.internal.pageSize.getHeight() - FOOTER_MM - 52) {
    doc.addPage();
    decorate();
    y = 22;
  }
  y = drawLuxurySectionBar(doc, y, margin, pageW, "Idhini / Saini rasmi");
  y += 2;
  y = drawAuthorizationFooterBlock(doc, y, margin, pageW, {
    signerName: "Ofisi ya Makao Makuu — KMK(T)",
    signerTitle: "Mfumo rasmi wa portal (uhakiki kwa QR)",
    sealText: "Eneo la muhuri wa kidigitali / Digital seal area",
    generatedAt: new Date().toLocaleString("sw-TZ"),
  });

  applyFooters(doc, serial);
  const slug = normalizePdfReadableText(tawi.jina)
    .replace(/[^\w\u00C0-\u024f]+/g, "_")
    .slice(0, 48);
  doc.save(`cheti_tawi_${slug || "tawi"}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
