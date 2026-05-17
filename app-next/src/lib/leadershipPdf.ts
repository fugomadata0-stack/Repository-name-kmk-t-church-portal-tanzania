import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { CellHookData } from "jspdf-autotable";
import {
  buildLeadershipVerificationUrl,
  formatLeadershipCredentialSerial,
  mergeKmktInstitutionBlock,
} from "./kmktExecutiveInstitution";
import { fetchUrlAsPdfImageDataUrl, fitPdfLinesToWidth, normalizePdfReadableText } from "./pdfInstitutional";
import {
  CERT,
  drawAuthorizationFooterBlock,
  drawCertificateOrnamentalFrame,
  drawExecutiveCertificateHeaderBand,
  drawExecutiveExperienceTimeline,
  drawExecutivePortraitFrame,
  drawLuxuryCertificateWatermark,
  drawLuxurySectionBar,
  resolveLeadershipCertificateTheme,
  type TimelineEntry,
} from "./pdfExecutiveCertificate";
import type { KiongoziRecord, LeadershipCvBundle } from "../types";

const navyRgb = [11, 31, 58] as const;
const goldRgb = [212, 175, 55] as const;

function fitTitle(doc: jsPDF, text: string, maxWidth: number, startSize: number, minSize: number): number {
  let size = startSize;
  doc.setFontSize(size);
  const raw = normalizePdfReadableText(text);
  while (size > minSize && doc.getTextWidth(raw) > maxWidth) {
    size -= 0.35;
    doc.setFontSize(size);
  }
  return size;
}

const columnStripeFills: [number, number, number][] = [
  [255, 255, 255],
  [247, 249, 253],
  [252, 253, 255],
  [243, 246, 252],
];

function stripeAutoTableOpts() {
  return {
    didParseCell: (data: CellHookData) => {
      if (data.section === "body") {
        data.cell.styles.fillColor = columnStripeFills[data.column.index % columnStripeFills.length];
      }
    },
  };
}

/** Nafasi chini ya maudhui kwa footer (nambari ya ukurasa + muda). */
const FOOTER_RESERVE_MM = 14;

function applyLeadershipPdfFooters(doc: jsPDF, meta?: { rightTag?: string; generatedAt?: string }) {
  const total = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  const ts = meta?.generatedAt ?? new Date().toLocaleString("sw-TZ");
  const right = meta?.rightTag ?? "KMK(T) · Enterprise PDF";
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...goldRgb);
    doc.setLineWidth(0.2);
    doc.line(margin, pageH - FOOTER_RESERVE_MM + 2, pageW - margin, pageH - FOOTER_RESERVE_MM + 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Ukurasa ${i} / ${total}`, margin, pageH - 5);
    doc.text(ts, pageW / 2, pageH - 5, { align: "center", maxWidth: pageW - margin * 2 - 52 });
    const tag = right.length > 52 ? `${right.slice(0, 49)}…` : right;
    doc.text(tag, pageW - margin, pageH - 5, { align: "right", maxWidth: 52 });
  }
}

export type LeaderProfilePdfOpts = {
  portalBaseUrl?: string;
  churchName?: string;
  /** Mistari ya anwani rasmi (mf. S.L.P, jiji) — chaguo-msingi ni anwani ya KMK(T). */
  institutionalLines?: string[];
  bundle?: LeadershipCvBundle | null;
  photoDataUrl?: string | null;
  signatureDataUrl?: string | null;
  logoDataUrl?: string | null;
};

export async function buildLeaderProfilePdfDocument(
  leader: KiongoziRecord,
  opts?: LeaderProfilePdfOpts,
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 14;

  const churchName = (opts?.churchName || "KMK(T) — Kanisa la Mennonite la Kiinjili Tanzania").toUpperCase();
  const origin = opts?.portalBaseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const base = String(origin || "").replace(/\/$/, "") || "https://v0-church-portal-tanzania.vercel.app";
  const verifyUrl = buildLeadershipVerificationUrl(base, "church", leader.id);
  const credentialSerial = formatLeadershipCredentialSerial("CV", leader.id);
  const bundle = opts?.bundle ?? null;
  const prof = bundle?.profile;
  const theme = resolveLeadershipCertificateTheme({
    cheo: leader.cheo,
    leadershipLevel: leader.leadership_level ?? leader.ngazi,
  });

  const decoratePage = () => {
    drawLuxuryCertificateWatermark(doc, {
      line1: "KMK(T)",
      line2: "WASIFU RASMI · DATA LIVE SUPABASE",
      sealText: "HATI YA UONGOZI",
      theme,
    });
    drawCertificateOrnamentalFrame(doc, 5, theme);
  };
  decoratePage();

  const logo = opts?.logoDataUrl?.trim() ? opts.logoDataUrl : null;
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
    subtitle: churchName,
    verificationSerial: credentialSerial,
    theme,
  });

  const photo =
    (opts?.photoDataUrl?.trim() ? opts.photoDataUrl : null) ||
    (leader.photo_url ? await fetchUrlAsPdfImageDataUrl(leader.photo_url) : null);
  const sig =
    (opts?.signatureDataUrl?.trim() ? opts.signatureDataUrl : null) ||
    (leader.signature_url ? await fetchUrlAsPdfImageDataUrl(leader.signature_url) : null);

  const photoW = 40;
  const photoH = 48;
  const photoX = pageWidth - margin - photoW;
  const photoY = y;
  const textMaxW = pageWidth - margin * 2 - photoW - 8;

  doc.setTextColor(...CERT.navy);
  doc.setFont("helvetica", "bold");
  fitTitle(doc, leader.jina || leader.full_name || "—", textMaxW, 14, 9.5);
  doc.text(leader.jina || leader.full_name || "—", margin, photoY + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...CERT.emerald);
  doc.text(leader.cheo || "—", margin, photoY + 19);
  doc.setTextColor(...CERT.ink);
  doc.setFontSize(8.6);
  const metaLine = [leader.leadership_level, leader.assigned_entity].filter(Boolean).join(" · ");
  const metaLines = doc.splitTextToSize(metaLine || "—", textMaxW) as string[];
  let ty = photoY + 26;
  for (const ln of metaLines) {
    doc.text(ln, margin, ty);
    ty += 4.8;
  }

  drawExecutivePortraitFrame(doc, photoX, photoY, photo, photoW, photoH);

  y = Math.max(photoY + photoH + 8, ty + 4);

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
    y = drawLuxurySectionBar(doc, y, margin, pageWidth, label);
  };

  const row = (k: string, v: string) => {
    ensureSpace(18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...CERT.emerald);
    const keyLines = doc.splitTextToSize(k, 42) as string[];
    doc.text(keyLines, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...CERT.ink);
    const lines = doc.splitTextToSize(v || "—", pageWidth - margin * 2 - 52) as string[];
    doc.text(lines, margin + 48, y);
    const lh = 5;
    y += Math.max(keyLines.length * lh, lines.length * lh, lh + 1);
  };

  const tableFinalY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;

  section("Taarifa binafsi");
  row("Jina kamili", leader.full_name || leader.jina);
  row("Jinsia", leader.gender || "—");
  row("Tarehe ya kuzaliwa", leader.date_of_birth || "—");
  row("Uraia", prof?.nationality?.trim() || "—");
  row("NIDA / Pasipoti", [leader.national_id, leader.passport_number].filter(Boolean).join(" / ") || "—");
  row("Kitambulisho cha mwanachama", leader.church_member_id || "—");
  row("Simu / WhatsApp", [leader.simu, leader.whatsapp].filter(Boolean).join(" / ") || "—");
  row("Barua pepe", leader.email || "—");
  row("Mkoa / Wilaya / Kata", [leader.mkoa, leader.wilaya, leader.kata].filter(Boolean).join(" / ") || "—");
  row("Anwani", leader.address || "—");

  section("Taarifa za uongozi");
  row("Cheo", leader.cheo);
  row("Ngazi", leader.leadership_level || leader.ngazi || "—");
  row("Entity", leader.assigned_entity || "—");
  row("Ofisi inayo ripoti", prof?.reporting_office?.trim() || "—");
  row("Dayosisi / Jimbo / Tawi", [leader.dayosisi, leader.jimbo, leader.tawi].filter(Boolean).join(" → ") || "—");
  row("Idara / Huduma / Taasisi / Jumuiya", [leader.idara_name, leader.huduma_name, leader.taasisi_name, leader.jumuiya_name].filter(Boolean).join(" · ") || "—");
  row("Tarehe ya uteuzi", leader.appointment_date || leader.start_date || "—");
  row("Muda wa mhula", [leader.start_date, leader.end_date].filter(Boolean).join(" — ") || "—");
  row("Hali", `${leader.term_status || "—"} · ${leader.status}`);
  row("Aliyewahi kuwa kiongozi", leader.former_leader ? "Ndiyo" : "Hapana");
  if (leader.reason_for_leaving) row("Sababu ya kuondoka", leader.reason_for_leaving);

  const bioText =
    prof?.biography?.trim() ||
    leader.biography?.trim() ||
    leader.notes?.trim() ||
    "";
  if (bioText) {
    section("Wasifu / Hadithi fupi");
    ensureSpace(24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.2);
    doc.setTextColor(...CERT.ink);
    doc.setLineHeightFactor(1.62);
    const paras = doc.splitTextToSize(bioText, pageWidth - margin * 2) as string[];
    const lh = 5.2;
    for (const line of paras) {
      ensureSpace(lh + 1);
      doc.text(line, margin, y);
      y += lh;
    }
    doc.setLineHeightFactor(1.15);
    y += 2;
  }

  if (bundle?.experience?.length) {
    section("Uzoefu wa huduma — mstari wa wakati");
    ensureSpace(36);
    const entries: TimelineEntry[] = bundle.experience.map((ex) => ({
      start_year: Number(ex.start_year) || 0,
      end_year: ex.end_year == null ? null : Number(ex.end_year),
      position: ex.position || "—",
      institution: ex.institution || "—",
      description: ex.description || "—",
    }));
    const h = drawExecutiveExperienceTimeline(doc, y, margin, pageWidth - margin * 2, entries);
    y += h + 6;
  } else if (leader.ministry_experience?.trim()) {
    section("Uzoefu wa huduma");
    row("Muhtasari", leader.ministry_experience);
  }

  if (bundle?.education?.length) {
    section("Elimu na mafunzo");
    ensureSpace(28);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Aina", "Stashahada / Kozi", "Taasisi", "Mwaka", "Utaalamu"]],
      body: bundle.education.map((ed) => [
        ed.education_kind || "—",
        ed.qualification || "—",
        ed.institution || "—",
        ed.year != null ? String(ed.year) : "—",
        ed.specialization || "—",
      ]),
      styles: { fontSize: 8, cellPadding: 1.4, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.1, overflow: "linebreak" },
      headStyles: { fillColor: [navyRgb[0], navyRgb[1], navyRgb[2]], textColor: 255, fontStyle: "bold", overflow: "linebreak" },
      ...stripeAutoTableOpts(),
    });
    const fy = tableFinalY();
    y = (typeof fy === "number" ? fy : y) + 8;
  } else {
    section("Elimu & mafunzo (muhtasari)");
    row("Elimu", leader.education_summary || "—");
    row("Mafunzo ya theology", leader.theology_training || "—");
  }

  if (bundle?.skills?.length) {
    section("Ujuzi, lugha na karama");
    const byCat = new Map<string, string[]>();
    for (const s of bundle.skills) {
      const k = s.skill_category || "other";
      if (!byCat.has(k)) byCat.set(k, []);
      byCat.get(k)!.push(s.label);
    }
    for (const [cat, labels] of byCat) {
      row(cat.replace(/_/g, " "), labels.filter(Boolean).join(" · ") || "—");
    }
  } else {
    section("Ujuzi & huduma (muhtasari)");
    row("Ujuzi wa kitaalamu", leader.professional_skills || "—");
    row("Karama / huduma", leader.ministry_gifts || "—");
  }

  if (bundle?.certificates?.length) {
    section("Vyeti & stakabadhi");
    ensureSpace(24);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Jina la cheti", "Mtoleaji", "Mwaka", "Maelezo"]],
      body: bundle.certificates.map((c) => [
        c.certificate_name || "—",
        c.issuer || "—",
        c.year != null ? String(c.year) : "—",
        (c.notes || "—").slice(0, 280),
      ]),
      styles: { fontSize: 8, cellPadding: 1.3, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.1, overflow: "linebreak" },
      headStyles: { fillColor: [navyRgb[0], navyRgb[1], navyRgb[2]], textColor: 255, fontStyle: "bold", overflow: "linebreak" },
      ...stripeAutoTableOpts(),
    });
    const fy = tableFinalY();
    y = (typeof fy === "number" ? fy : y) + 8;
  } else if (leader.certificates_summary?.trim()) {
    section("Vyeti (muhtasari)");
    row("Muhtasari", leader.certificates_summary);
  }

  if (bundle?.attachments?.length) {
    section("Viambatanisho vilivyopakiwa");
    ensureSpace(22);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Aina", "Jina la faili", "Ukubwa (baiti)"]],
      body: bundle.attachments.map((a) => [a.attachment_kind, a.file_name || "—", a.file_size != null ? String(a.file_size) : "—"]),
      styles: { fontSize: 8, cellPadding: 1.2, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.1, overflow: "linebreak" },
      headStyles: { fillColor: [navyRgb[0], navyRgb[1], navyRgb[2]], textColor: 255, fontStyle: "bold", overflow: "linebreak" },
      ...stripeAutoTableOpts(),
    });
    const fy = tableFinalY();
    y = (typeof fy === "number" ? fy : y) + 8;
  }

  if (prof?.original_cv_file_name?.trim()) {
    section("Faili ya CV asili (iliyopakiwa)");
    row("Jina la faili", prof.original_cv_file_name);
    row("Aina", prof.original_cv_mime || "—");
  }

  ensureSpace(42);
  y += 4;
  y = drawAuthorizationFooterBlock(doc, y, margin, pageWidth, {
    signatureDataUrl: sig,
    signerName: leader.pdf_issued_by_name || undefined,
    signerTitle: leader.pdf_issued_by_title || undefined,
    sealText: "Idhini rasmi — KMT Portal (thibitisho kwa QR)",
  });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Hati hii ni ya matumizi ya ndani / rasmi za kanisa pekee.", margin, y);
  y += 5;
  const issuer = [leader.pdf_issued_by_name, leader.pdf_issued_by_title].filter(Boolean).join(" — ");
  doc.text(issuer ? `Anayeitoa (maandishi): ${issuer}` : "Anayeitoa: Mfumo rasmi wa KMT Portal (thibitisho kwa QR)", margin, y);

  const hierarchyPath = [leader.dayosisi, leader.jimbo, leader.tawi].filter(Boolean).join(" → ");
  applyLeadershipPdfFooters(doc, {
    rightTag: `${credentialSerial} · ${hierarchyPath ? hierarchyPath.slice(0, 28) : leader.id.slice(0, 8)}`.slice(0, 52),
  });
  return doc;
}

export async function downloadLeaderProfilePdf(leader: KiongoziRecord, opts?: LeaderProfilePdfOpts) {
  const doc = await buildLeaderProfilePdfDocument(leader, opts);
  doc.save(`wasifu-kiongozi-${(leader.jina || "kiongozi").replace(/\s+/g, "-").slice(0, 40)}.pdf`);
}

export async function downloadLeadershipDirectoryPdf(leaders: KiongoziRecord[], opts?: { title?: string; churchName?: string }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const footerReserve = FOOTER_RESERVE_MM;

  drawLuxuryCertificateWatermark(doc, { line1: "KMK(T)", line2: "ORODHA YA VIONGOZI · LIVE SUPABASE", sealText: "HATI RASMI" });
  drawCertificateOrnamentalFrame(doc, 4);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  const mainTitle = normalizePdfReadableText((opts?.title || "ORODHA KAMILI YA VIONGOZI — DIRA YA UONGOZI NA VIWANGO").toUpperCase());
  const titleFit = fitPdfLinesToWidth(doc, mainTitle, pageWidth - margin * 2, 14, 10, 6);
  const nTitle = titleFit.lines.length;
  const lh = titleFit.lineHeight;
  const jumlaBaseline = 11 + nTitle * lh + 1.2 + 4.6;
  const headerH = Math.max(42, jumlaBaseline + 10);

  doc.setFillColor(...navyRgb);
  doc.rect(0, 0, pageWidth, headerH, "F");
  doc.setFillColor(...goldRgb);
  doc.rect(0, headerH - 1.1, pageWidth, 1.1, "F");

  doc.setFontSize(titleFit.fontSize);
  let hy = 11;
  for (const ln of titleFit.lines) {
    doc.text(ln, pageWidth / 2, hy, { align: "center" });
    hy += titleFit.lineHeight;
  }
  hy += 1.2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(normalizePdfReadableText((opts?.churchName || "KMK(T) Portal").toUpperCase()), pageWidth / 2, hy, { align: "center" });
  hy += 4.6;
  doc.text(`Jumla: ${leaders.length} · ${new Date().toLocaleDateString("sw-TZ")}`, pageWidth / 2, hy, { align: "center" });

  const tableStart = Math.max(headerH + 6, hy + 8);

  autoTable(doc, {
    startY: tableStart,
    margin: { left: margin, right: margin, bottom: footerReserve },
    head: [["#", "Jina", "Cheo", "Ngazi", "Simu"]],
    body: leaders.map((L, idx) => [
      String(idx + 1),
      L.jina || L.full_name || "—",
      L.cheo || "—",
      L.leadership_level || L.ngazi || "—",
      L.simu || "—",
    ]),
    styles: {
      fontSize: 7.2,
      cellPadding: 1.45,
      overflow: "linebreak",
      valign: "top",
      lineColor: [226, 232, 240],
      lineWidth: 0.12,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [navyRgb[0], navyRgb[1], navyRgb[2]],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      overflow: "linebreak",
    },
    ...stripeAutoTableOpts(),
    tableLineColor: [navyRgb[0], navyRgb[1], navyRgb[2]],
    theme: "grid",
    willDrawPage: (data: { pageNumber: number; doc: jsPDF }) => {
      if (data.pageNumber <= 1) return;
      drawLuxuryCertificateWatermark(data.doc, { line1: "KMK(T)", line2: "ORODHA · LIVE SUPABASE", sealText: "HATI RASMI" });
      drawCertificateOrnamentalFrame(data.doc, 4);
    },
  });

  applyLeadershipPdfFooters(doc, { rightTag: `Jumla: ${leaders.length} viongozi` });
  doc.save(`orodha-viongozi-${new Date().toISOString().slice(0, 10)}.pdf`);
}
