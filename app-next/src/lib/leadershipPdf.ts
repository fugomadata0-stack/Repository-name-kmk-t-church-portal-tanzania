import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { KiongoziRecord, LeadershipCvBundle } from "../types";

const navyRgb = [11, 31, 58] as const;
const goldRgb = [212, 175, 55] as const;
const emeraldRgb = [16, 185, 129] as const;

async function imageDataUrl(url: string): Promise<string | null> {
  const u = String(url ?? "").trim();
  if (!u) return null;
  try {
    const res = await fetch(u, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => reject(new Error("read"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function fitTitle(doc: jsPDF, text: string, maxWidth: number, startSize: number, minSize: number): number {
  let size = startSize;
  doc.setFontSize(size);
  while (size > minSize && doc.getTextWidth(text) > maxWidth) {
    size -= 0.35;
    doc.setFontSize(size);
  }
  return size;
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
  bundle?: LeadershipCvBundle | null;
  photoDataUrl?: string | null;
  signatureDataUrl?: string | null;
  logoDataUrl?: string | null;
};

export async function downloadLeaderProfilePdf(leader: KiongoziRecord, opts?: LeaderProfilePdfOpts) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 12;

  const churchName = (opts?.churchName || "KMK(T) — Kanisa la Mennonite la Kiinjili Tanzania").toUpperCase();
  const verifyUrl = `${(opts?.portalBaseUrl || window.location.origin).replace(/\/$/, "")}/portal`;
  const bundle = opts?.bundle ?? null;

  doc.setFillColor(...navyRgb);
  doc.rect(0, 0, pageWidth, 46, "F");
  doc.setFillColor(...goldRgb);
  doc.rect(0, 44, pageWidth, 1.2, "F");

  const logo = opts?.logoDataUrl?.trim() ? opts.logoDataUrl : null;
  if (logo) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, 8, 22, 22, 2, 2, "F");
      doc.addImage(logo, logo.includes("jpeg") ? "JPEG" : "PNG", margin + 1, 9, 20, 20);
    } catch {
      /* optional */
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  const title1 = "WASIFU RASMI WA KIONGOZI";
  fitTitle(doc, title1, pageWidth - margin * 2 - 30, 14, 10);
  doc.text(title1, pageWidth / 2, 12, { align: "center" });
  doc.setFontSize(9.5);
  const title2 = "KANISA LA MENNONITE LA KIINJILI TANZANIA KMK(T)";
  fitTitle(doc, title2, pageWidth - margin * 2 - 30, 9.5, 7.5);
  doc.text(title2, pageWidth / 2, 20, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.text(churchName, pageWidth / 2, 28, { align: "center", maxWidth: pageWidth - margin * 2 - 28 });
  doc.text(`Imetolewa: ${new Date().toLocaleString("sw-TZ")}`, pageWidth / 2, 35, { align: "center" });

  const qr = await imageDataUrl(
    `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`${verifyUrl} · ${leader.id}`)}`
  );
  if (qr) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(pageWidth - margin - 24, 8, 24, 24, 2, 2, "F");
      doc.addImage(qr, "PNG", pageWidth - margin - 22.5, 9.5, 21, 21);
    } catch {
      /* optional */
    }
  }

  y = 52;
  doc.setTextColor(...navyRgb);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  fitTitle(doc, leader.jina || leader.full_name || "—", pageWidth - margin * 2 - 36, 12, 9);
  doc.text(leader.jina || leader.full_name || "—", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...emeraldRgb);
  doc.text(leader.cheo || "—", margin, y + 6);
  doc.setTextColor(71, 85, 105);
  doc.text([leader.leadership_level, leader.assigned_entity].filter(Boolean).join(" · "), margin, y + 11);
  y += 18;

  const mediaTop = y;
  const photo = (opts?.photoDataUrl?.trim() ? opts.photoDataUrl : null) || (leader.photo_url ? await imageDataUrl(leader.photo_url) : null);
  if (photo) {
    try {
      doc.setDrawColor(...goldRgb);
      doc.roundedRect(margin, mediaTop, 38, 44, 3, 3, "S");
      doc.addImage(photo, photo.includes("jpeg") ? "JPEG" : "PNG", margin + 1, mediaTop + 1, 36, 42);
    } catch {
      /* optional */
    }
  }

  const sig =
    (opts?.signatureDataUrl?.trim() ? opts.signatureDataUrl : null) ||
    (leader.signature_url ? await imageDataUrl(leader.signature_url) : null);
  const sigX = margin + (photo ? 44 : 0);
  if (sig) {
    try {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...navyRgb);
      doc.text("Saini rasmi", sigX, mediaTop);
      doc.roundedRect(sigX, mediaTop + 3, 52, 22, 2, 2, "S");
      doc.addImage(sig, sig.includes("jpeg") ? "JPEG" : "PNG", sigX + 2, mediaTop + 5, 48, 16);
    } catch {
      /* optional */
    }
  }

  y = mediaTop + (photo || sig ? 50 : 4);

  const pageBottom = () => doc.internal.pageSize.getHeight() - FOOTER_RESERVE_MM;
  const ensureSpace = (h: number) => {
    if (y + h > pageBottom()) {
      doc.addPage();
      y = 14;
    }
  };

  const section = (label: string) => {
    ensureSpace(20);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 8, 2, 2, "F");
    doc.setFillColor(...goldRgb);
    doc.rect(margin, y + 6.5, pageWidth - margin * 2, 0.9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...navyRgb);
    doc.text(label.toUpperCase(), margin + 3, y + 5);
    y += 12;
  };

  const row = (k: string, v: string) => {
    ensureSpace(18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...emeraldRgb);
    const keyLines = doc.splitTextToSize(k, 40) as string[];
    doc.text(keyLines, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(v || "—", pageWidth - margin * 2 - 50) as string[];
    doc.text(lines, margin + 46, y);
    const lh = 4.8;
    y += Math.max(keyLines.length * lh, lines.length * lh, lh + 1);
  };

  const tableFinalY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;

  const prof = bundle?.profile;

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

  const bioText = prof?.biography?.trim();
  if (bioText) {
    section("Wasifu / Hadithi fupi");
    ensureSpace(24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    const paras = doc.splitTextToSize(bioText, pageWidth - margin * 2) as string[];
    const lh = 5.2;
    for (const line of paras) {
      ensureSpace(lh + 1);
      doc.text(line, margin, y);
      y += lh;
    }
    y += 2;
  }

  if (bundle?.experience?.length) {
    section("Uzoefu wa huduma");
    ensureSpace(28);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Mwaka", "Nafasi", "Taasisi / Jimbo", "Maelezo"]],
      body: bundle.experience.map((ex) => [
        `${ex.start_year} – ${ex.end_year == null ? "Sasa" : String(ex.end_year)}`,
        ex.position || "—",
        ex.institution || "—",
        (ex.description || "—").slice(0, 500),
      ]),
      styles: { fontSize: 8, cellPadding: 1.4, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.1 },
      headStyles: { fillColor: [navyRgb[0], navyRgb[1], navyRgb[2]], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [252, 252, 253] },
    });
    const fy = tableFinalY();
    y = (typeof fy === "number" ? fy : y) + 8;
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
      styles: { fontSize: 8, cellPadding: 1.4, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.1 },
      headStyles: { fillColor: [navyRgb[0], navyRgb[1], navyRgb[2]], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [252, 252, 253] },
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
      styles: { fontSize: 8, cellPadding: 1.3, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.1 },
      headStyles: { fillColor: [navyRgb[0], navyRgb[1], navyRgb[2]], textColor: 255, fontStyle: "bold" },
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
      styles: { fontSize: 8, cellPadding: 1.2, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.1 },
      headStyles: { fillColor: [navyRgb[0], navyRgb[1], navyRgb[2]], textColor: 255, fontStyle: "bold" },
    });
    const fy = tableFinalY();
    y = (typeof fy === "number" ? fy : y) + 8;
  }

  if (prof?.original_cv_file_name?.trim()) {
    section("Faili ya CV asili (iliyopakiwa)");
    row("Jina la faili", prof.original_cv_file_name);
    row("Aina", prof.original_cv_mime || "—");
  }

  y += 4;
  doc.setDrawColor(...goldRgb);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const issuer = [leader.pdf_issued_by_name, leader.pdf_issued_by_title].filter(Boolean).join(" — ");
  doc.text(issuer ? `Anayeitoa: ${issuer}` : "Anayeitoa: Mfumo rasmi wa KMT Portal (thibitisho kwa QR)", margin, y);
  y += 5;
  doc.text("Hati hii ni ya matumizi ya ndani / rasmi za kanisa pekee.", margin, y);

  const hierarchyPath = [leader.dayosisi, leader.jimbo, leader.tawi].filter(Boolean).join(" → ");
  applyLeadershipPdfFooters(doc, {
    rightTag: hierarchyPath ? `Njia: ${hierarchyPath}` : `Kiongozi ID: ${leader.id.slice(0, 8)}…`,
  });
  doc.save(`wasifu-kiongozi-${(leader.jina || "kiongozi").replace(/\s+/g, "-").slice(0, 40)}.pdf`);
}

export async function downloadLeadershipDirectoryPdf(leaders: KiongoziRecord[], opts?: { title?: string; churchName?: string }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentBottom = pageHeight - FOOTER_RESERVE_MM;
  let y = 14;

  doc.setFillColor(...navyRgb);
  doc.rect(0, 0, pageWidth, 36, "F");
  doc.setFillColor(...goldRgb);
  doc.rect(0, 34, pageWidth, 1.1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  const mainTitle = (opts?.title || "ORODHA YA VIONGOZI — DIRA YA UONGOZI").toUpperCase();
  fitTitle(doc, mainTitle, pageWidth - margin * 2, 14, 9);
  doc.text(mainTitle, pageWidth / 2, 12, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text((opts?.churchName || "KMK(T) Portal").toUpperCase(), pageWidth / 2, 22, { align: "center" });
  doc.text(`Jumla: ${leaders.length} · ${new Date().toLocaleDateString("sw-TZ")}`, pageWidth / 2, 28, { align: "center" });

  y = 42;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...navyRgb);
  const cols = [8, 52, 92, 128, 162] as const;
  const headers = ["#", "Jina", "Cheo", "Ngazi", "Simu"];
  headers.forEach((h, i) => doc.text(h, cols[i], y));
  y += 4;
  doc.setDrawColor(...goldRgb);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  const colWidths = [10, 38, 36, 34, 34] as const;
  leaders.forEach((L, idx) => {
    const nameRaw = L.jina || L.full_name || "—";
    const cheoRaw = L.cheo || "—";
    const ngaziRaw = L.leadership_level || L.ngazi || "—";
    const simuRaw = L.simu || "—";
    doc.setFontSize(6.8);
    const nameLines = doc.splitTextToSize(nameRaw, colWidths[1] - 1) as string[];
    const cheoLines = doc.splitTextToSize(cheoRaw, colWidths[2] - 1) as string[];
    const ngaziLines = doc.splitTextToSize(ngaziRaw, colWidths[3] - 1) as string[];
    const simuLines = doc.splitTextToSize(simuRaw, colWidths[4] - 1) as string[];
    const maxLines = Math.max(1, nameLines.length, cheoLines.length, ngaziLines.length, simuLines.length);
    const rowH = maxLines * 3.2 + 1.5;
    if (y + rowH > contentBottom) {
      doc.addPage();
      y = 14;
    }
    doc.text(String(idx + 1), cols[0], y);
    doc.text(nameLines, cols[1], y);
    doc.text(cheoLines, cols[2], y);
    doc.text(ngaziLines, cols[3], y);
    doc.text(simuLines, cols[4], y);
    y += rowH;
  });

  applyLeadershipPdfFooters(doc, { rightTag: `Jumla: ${leaders.length} viongozi` });
  doc.save(`orodha-viongozi-${new Date().toISOString().slice(0, 10)}.pdf`);
}
