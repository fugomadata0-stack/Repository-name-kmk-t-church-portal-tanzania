import type { CellHookData } from "jspdf-autotable";
import { drawKmktPdfWatermark, fitPdfLinesToWidth, normalizePdfReadableText } from "./pdfInstitutional";
import { fetchMasterSettingsOptional, readMasterSettingsCache } from "../services/masterSettingsService";
import { fetchChurchIdentityOptional } from "../services/settingsTablesService";
import type { ChurchStructureEntity, ChurchStructureLeader } from "../types";
import { fetchLeadersForEntity } from "../services/churchStructureLeadersService";

/** Navy / gold institutional palette */
export const KMKT_NAVY: [number, number, number] = [11, 31, 58];
export const KMKT_GOLD: [number, number, number] = [212, 175, 55];
export const KMKT_SLATE: [number, number, number] = [71, 85, 105];
export const KMKT_EMERALD: [number, number, number] = [16, 129, 96];
export const KMKT_LIGHT_GRAY: [number, number, number] = [248, 250, 252];
const KMKT_PUBLIC_URL = "https://v0-church-portal-tanzania.vercel.app";

function printableGeneratedAt(): string {
  return new Date().toLocaleString("sw-TZ");
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(blob);
  });
}

async function tryLoadImageDataUrl(url: string): Promise<string | null> {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  try {
    const res = await fetch(trimmed, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function excelColWidths(headers: string[], rows: (string | number)[][], minWch = 10, maxWch = 52): { wch: number }[] {
  const n = headers.length;
  return Array.from({ length: n }, (_, c) => {
    let maxLen = String(headers[c] ?? "").length;
    for (const row of rows) {
      const v = row[c];
      const len = v === undefined || v === null ? 0 : String(v).length;
      if (len > maxLen) maxLen = len;
    }
    return { wch: Math.min(maxWch, Math.max(minWch, maxLen + 2)) };
  });
}

function hexToRgbTuple(value: string | undefined, fallback: [number, number, number]): [number, number, number] {
  const v = String(value ?? "").trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(v)) return fallback;
  return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
}

function officialReportTitle(title: string): string {
  const t = normalizePdfReadableText(title).toUpperCase();
  if (!t) return "TAARIFA RASMI YA MFUMO WA KMK(T) PORTAL — DATA HAI";
  if (/(VIONGOZI|UONGOZI|LEADERSHIP)/i.test(t))
    return t.includes("WASIFU") ? t : `TAARIFA KAMILI YA VIONGOZI NA UONGOZI WA KMK(T) — ${t}`;
  if (/(DAYOSISI|JIMBO|MAJIMBO|TAWI|MATAWI|MUUNDO)/i.test(t))
    return t.includes("RIPOTI") ? t : `RIPOTI KAMILI YA MUUNDO WA KANISA NA VIWANGO — ${t}`;
  if (/(FEDHA|MAPATO|FINANCE|INCOME|MATUMIZI)/i.test(t))
    return t.includes("RIPOTI") ? t : `RIPOTI KAMILI YA FEDHA, MAPATO NA MATUMIZI — ${t}`;
  if (/(WAUMINI|FAMILIA|MEMBERS)/i.test(t))
    return t.includes("RIPOTI") ? t : `RIPOTI KAMILI YA WAUMINI NA FAMILIA — ${t}`;
  return t.startsWith("TAARIFA") || t.startsWith("RIPOTI") ? t : `TAARIFA RASMI KAMILI YA ${t} — KMK(T) PORTAL`;
}

function addWrappedText(
  doc: InstanceType<typeof import("jspdf").jsPDF>,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  options?: { align?: "left" | "center" | "right" }
): number {
  const cleaned = normalizePdfReadableText(text);
  const lines = doc.splitTextToSize(cleaned, maxWidth) as string[];
  const align = options?.align ?? "left";
  if (align === "center") {
    let yy = y;
    for (const line of lines) {
      doc.text(line, x, yy, { align: "center" });
      yy += lineHeight;
    }
    return yy;
  }
  doc.text(lines, x, y, options);
  return y + Math.max(1, lines.length) * lineHeight;
}

export interface ExportExcelOptions {
  /** Extra merged title row (e.g. report name) */
  reportTitle?: string;
  /** Long filter / scope line */
  filterSummary?: string;
  sheetName?: string;
}

export async function exportRowsToExcel(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
  options?: ExportExcelOptions
) {
  const master = (await fetchMasterSettingsOptional()) ?? readMasterSettingsCache();
  const XLSX = await import("xlsx");

  const excelHeader = master.theme.excel_header_text || master.identity.official_name || "KMK(T)";
  const metaLines: string[] = [excelHeader];
  if (master.identity.motto?.trim()) metaLines.push(master.identity.motto.trim());
  if (master.identity.address?.trim()) metaLines.push(master.identity.address.trim());
  if (options?.reportTitle?.trim()) metaLines.push(options.reportTitle.trim());
  if (options?.filterSummary?.trim()) metaLines.push(options.filterSummary.trim());
  if (master.identity.system_footer?.trim()) metaLines.push(master.identity.system_footer.trim());
  metaLines.push(`Imetengenezwa: ${printableGeneratedAt()}`);

  const colCount = Math.max(1, headers.length);
  const blankRowIndex = metaLines.length;
  const headerRowIndex = blankRowIndex + 1;
  const topAoA: (string | number)[][] = [...metaLines.map((line) => [line]), [], headers, ...rows];

  const ws = XLSX.utils.aoa_to_sheet(topAoA);
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
  for (let r = 0; r < metaLines.length; r++) {
    merges.push({ s: { r, c: 0 }, e: { r, c: colCount - 1 } });
  }
  ws["!merges"] = merges;
  ws["!cols"] = excelColWidths(headers, rows);
  ws["!freeze"] = { xSplit: 0, ySplit: headerRowIndex + 1 };
  const lastExcelRow = headerRowIndex + rows.length + 1;
  const endCol = XLSX.utils.encode_col(colCount - 1);
  ws["!autofilter"] = { ref: `A${headerRowIndex + 1}:${endCol}${lastExcelRow}` };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, options?.sheetName?.trim() || "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export interface ExportPdfOptions {
  /** Line under the main title */
  subtitle?: string;
  /** Filter / scope summary */
  filterSummary?: string;
  /** Short signature line in footer */
  showSignatureLine?: boolean;
  /** Presentation-grade explanation shown above the table */
  description?: string;
  /** Override orientation when a report should be portrait */
  orientation?: "portrait" | "landscape";
}

export async function exportTableToPdf(
  title: string,
  filename: string,
  headers: string[],
  rows: (string | number)[][],
  options?: ExportPdfOptions
) {
  const [masterRaw, identity] = await Promise.all([
    fetchMasterSettingsOptional().catch(() => null),
    fetchChurchIdentityOptional().catch(() => null),
  ]);
  const master = masterRaw ?? readMasterSettingsCache();
  const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableMod.default;

  const doc = new jsPDF({
    orientation: options?.orientation ?? "landscape",
    unit: "mm",
    format: "a4",
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 11;
  const bottomReserve = options?.showSignatureLine ? 34 : 18;
  const primary = hexToRgbTuple(identity?.primary_color || master.theme.primary_color, KMKT_NAVY);
  const secondary = hexToRgbTuple(identity?.secondary_color || master.theme.secondary_color, [18, 60, 105]);
  const accent = hexToRgbTuple(identity?.accent_color || master.theme.accent_color, KMKT_GOLD);
  const official =
    normalizePdfReadableText(
      identity?.official_church_name?.trim() ||
        master.theme.pdf_header_text ||
        master.identity.official_name ||
        "KANISA LA MENNONITE LA KIINJILI TANZANIA KMK(T)"
    );
  const motto = normalizePdfReadableText(identity?.vision?.trim() || master.identity.motto?.trim() || "");
  const address = [
    identity?.postal_address,
    identity?.headquarters || master.identity.address,
    identity?.region,
    identity?.district,
  ]
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .join(" · ");
  const contact = [
    identity?.main_phone || master.identity.phone,
    identity?.main_email || master.identity.email,
    identity?.website_url || master.identity.website || KMKT_PUBLIC_URL,
  ]
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .join("  |  ");
  const reportTitle = officialReportTitle(title);

  let y = 8;

  doc.setFillColor(...primary);
  doc.rect(0, 0, pageWidth, 34, "F");
  doc.setFillColor(...secondary);
  doc.rect(0, 28, pageWidth, 8, "F");
  doc.setFillColor(...accent);
  doc.rect(0, 35.5, pageWidth, 1.4, "F");

  const logoUrl = identity?.logo_url?.trim() || master.theme.logo_url?.trim();
  if (logoUrl) {
    const dataUrl = await tryLoadImageDataUrl(logoUrl);
    if (dataUrl) {
      try {
        const fmt =
          dataUrl.includes("image/jpeg") || dataUrl.includes("image/jpg") ? "JPEG" : ("PNG" as const);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, 7, 22, 22, 3, 3, "F");
        doc.addImage(dataUrl, fmt, margin + 2, 9, 18, 18);
      } catch {
        // Logo is optional; keep the report exportable.
      }
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const headerBandW = pageWidth - 74;
  let oy = 12;
  const oLines = doc.splitTextToSize(official.toUpperCase(), headerBandW) as string[];
  for (const ln of oLines) {
    doc.text(ln, pageWidth / 2, oy, { align: "center" });
    oy += 4.35;
  }
  oy += 1.2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  if (motto) {
    const my = doc.splitTextToSize(motto, headerBandW) as string[];
    for (const ln of my) {
      doc.text(ln, pageWidth / 2, oy, { align: "center" });
      oy += 3.85;
    }
    oy += 0.9;
  }
  const addressNorm = normalizePdfReadableText(address);
  if (addressNorm) {
    const ad = doc.splitTextToSize(addressNorm, headerBandW) as string[];
    for (const ln of ad) {
      doc.text(ln, pageWidth / 2, oy, { align: "center" });
      oy += 3.85;
    }
    oy += 0.9;
  }
  const contactNorm = normalizePdfReadableText(contact);
  if (contactNorm) {
    const ct = doc.splitTextToSize(contactNorm, headerBandW) as string[];
    for (const ln of ct) {
      doc.text(ln, pageWidth / 2, oy, { align: "center" });
      oy += 3.85;
    }
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(
    identity?.website_url || master.identity.website || KMKT_PUBLIC_URL
  )}`;
  const qrData = await tryLoadImageDataUrl(qrUrl);
  if (qrData) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(pageWidth - margin - 20, 7, 20, 20, 2, 2, "F");
      doc.addImage(qrData, "PNG", pageWidth - margin - 18.5, 8.5, 17, 17);
    } catch {
      // QR is optional when remote image loading is blocked.
    }
  }

  y = 43;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primary);
  const titleMaxW = pageWidth - margin * 3;
  const titleFit = fitPdfLinesToWidth(doc, reportTitle, titleMaxW, 14, 9.5, 6);
  const titleBlockH = Math.max(
    28,
    titleFit.lines.length * titleFit.lineHeight + 14
  );
  doc.setFillColor(...KMKT_LIGHT_GRAY);
  doc.roundedRect(margin, y - 4, pageWidth - margin * 2, titleBlockH, 3, 3, "F");
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, y - 4, pageWidth - margin * 2, titleBlockH, 3, 3, "S");

  doc.setFontSize(titleFit.fontSize);
  let titleY = y + 2;
  for (const line of titleFit.lines) {
    doc.text(line, pageWidth / 2, titleY, { align: "center" });
    titleY += titleFit.lineHeight;
  }
  y = titleY;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...KMKT_SLATE);
  if (options?.subtitle?.trim()) {
    y = addWrappedText(doc, options.subtitle.trim(), pageWidth / 2, y + 0.5, pageWidth - 2 * margin, 4.35, { align: "center" });
  }
  if (options?.filterSummary?.trim()) {
    y = addWrappedText(doc, options.filterSummary.trim(), pageWidth / 2, y + 0.5, pageWidth - 2 * margin, 4.35, { align: "center" });
  }

  const description = normalizePdfReadableText(
    options?.description?.trim() ||
      "Ripoti hii imetengenezwa na KMT Portal kwa matumizi rasmi ya uongozi, ufuatiliaji wa taarifa, uchambuzi na maamuzi ya taasisi."
  );
  y += 4;
  const descTextWidth = pageWidth - margin * 2 - 38;
  const descLineH = 4.25;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  const descLines = doc.splitTextToSize(description, Math.max(40, descTextWidth)) as string[];
  const descBlockH = Math.max(1, descLines.length) * descLineH;
  const descBoxH = Math.max(14, descBlockH + 9);
  const minSpaceBeforeTable = bottomReserve + 40;
  if (y + descBoxH > pageHeight - minSpaceBeforeTable) {
    doc.addPage();
    y = margin;
  }
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(margin, y, pageWidth - margin * 2, descBoxH, 2.5, 2.5, "F");
  doc.setTextColor(...KMKT_EMERALD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text("MAELEZO YA RIPOTI", margin + 4, y + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  doc.text(descLines, margin + 34, y + 5.5);
  y += descBoxH + 4;

  doc.setFillColor(...primary);
  doc.roundedRect(margin, y, 42, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`Rekodi: ${rows.length.toLocaleString("sw-TZ")}`, margin + 4, y + 6.5);
  doc.setFillColor(...accent);
  doc.roundedRect(margin + 46, y, 56, 10, 2, 2, "F");
  doc.setTextColor(...primary);
  doc.text(`Imetolewa: ${printableGeneratedAt()}`, margin + 50, y + 6.5);
  y += 14;

  const tableStartY = y + 2;

  autoTable(doc, {
    startY: tableStartY,
    head: [headers],
    body: rows,
    showHead: "everyPage",
    margin: { left: margin, right: margin, bottom: bottomReserve },
    styles: {
      fontSize: rows.length > 250 ? 6.7 : 7.4,
      cellPadding: rows.length > 250 ? 1.25 : 1.65,
      minCellHeight: 4,
      overflow: "linebreak",
      valign: "top",
      halign: "left",
      lineColor: [203, 213, 225],
      lineWidth: 0.1,
      textColor: [15, 23, 42],
    },
    headStyles: {
      fillColor: [primary[0], primary[1], primary[2]],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      lineColor: accent,
      lineWidth: 0.22,
      overflow: "linebreak",
    },
    tableLineColor: primary,
    tableLineWidth: 0.25,
    theme: "grid",
    willDrawPage: (data: { doc: InstanceType<typeof import("jspdf").jsPDF> }) => {
      drawKmktPdfWatermark(data.doc, {
        line1: master.identity.short_name?.trim() || "KMK(T)",
        line2: "RIPOTI RASMI · DATA LIVE KUTOKA SUPABASE",
      });
    },
    didParseCell: (data: CellHookData) => {
      if (data.section === "body") {
        const fills: [number, number, number][] = [
          [255, 255, 255],
          [247, 249, 253],
          [252, 253, 255],
          [243, 246, 252],
        ];
        data.cell.styles.fillColor = fills[data.column.index % fills.length];
      }
    },
    didDrawPage: (data: { doc: InstanceType<typeof import("jspdf").jsPDF>; pageNumber: number }) => {
      const d = data.doc;
      const pc = d.getNumberOfPages();
      const pn = data.pageNumber;
      d.setFillColor(...primary);
      d.rect(0, pageHeight - 16, pageWidth, 16, "F");
      d.setFillColor(...accent);
      d.rect(0, pageHeight - 16, pageWidth, 1.2, "F");
      d.setFont("helvetica", "normal");
      d.setFontSize(8);
      d.setTextColor(255, 255, 255);
      const footY = pageHeight - 6;
      d.text(`Ukurasa ${pn} / ${pc}`, pageWidth / 2, footY, { align: "center" });
      d.text(`Generated by KMT Portal · ${printableGeneratedAt()}`, margin, footY);
      const footerRight = master.identity.system_footer?.trim() || "KMK(T) Tanzania";
      if (footerRight) {
        d.text(footerRight, pageWidth - margin, footY, { align: "right" });
      }
      if (options?.showSignatureLine) {
        const sigY = pageHeight - 27;
        const boxW = (pageWidth - margin * 2 - 8) / 3;
        d.setDrawColor(...accent);
        d.setLineWidth(0.25);
        d.setTextColor(...primary);
        d.setFont("helvetica", "bold");
        d.setFontSize(7.4);
        [
          ["Chief Admin", margin],
          ["Katibu / Secretary", margin + boxW + 4],
          ["Muhuri Rasmi", margin + (boxW + 4) * 2],
        ].forEach(([label, x]) => {
          const xNum = Number(x);
          d.line(xNum, sigY, xNum + boxW, sigY);
          d.text(String(label), xNum + boxW / 2, sigY + 4, { align: "center" });
        });
      }
    },
  });

  doc.save(`${filename}.pdf`);
}

export interface PrintableTableOptions {
  filterSummary?: string;
  subtitle?: string;
}

export async function openPrintableTable(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  options?: PrintableTableOptions
) {
  const masterRow = await fetchMasterSettingsOptional();
  const master = masterRow ?? readMasterSettingsCache();
  const w = window.open("", "_blank", "width=1100,height=780");
  if (!w) return;

  const official = master.theme.print_header_text || master.identity.official_name || "KMK(T)";
  const logoUrl = master.theme.logo_url?.trim();
  const logo = logoUrl
    ? `<div class="logo-wrap"><img src="${escapeHtml(logoUrl)}" alt="" crossorigin="anonymous" style="max-height:56px;max-width:200px;object-fit:contain"/></div>`
    : "";

  const head = headers
    .map((h) => `<th scope="col">${escapeHtml(String(h))}</th>`)
    .join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td>${escapeHtml(String(c))}</td>`).join("")}</tr>`
    )
    .join("");

  const titleNorm = normalizePdfReadableText(title);
  const docTitle = `${escapeHtml(titleNorm)} — ${escapeHtml(master.identity.short_name || "KMK(T)")}`;
  const filterBlock = options?.filterSummary?.trim()
    ? `<p class="filter-line">${escapeHtml(options.filterSummary.trim())}</p>`
    : "";
  const subBlock = options?.subtitle?.trim()
    ? `<p class="subtitle">${escapeHtml(options.subtitle.trim())}</p>`
    : "";

  w.document.write(`<!DOCTYPE html><html lang="sw"><head><meta charset="utf-8"/><title>${docTitle}</title>
    <style>
      @page { size: A4 landscape; margin: 10mm 12mm; }
      * { box-sizing: border-box; }
      body {
        font-family: system-ui, "Segoe UI", Arial, sans-serif;
        color: #0B1F3A;
        background: #fff;
        margin: 0;
        padding: 12px;
        line-height: 1.6;
        overflow-wrap: break-word;
        word-break: break-word;
      }
      .sheet {
        border: 4px double #0B1F3A;
        padding: 14px 16px 18px;
        background: #fff;
      }
      .brand-header {
        text-align: center;
        border-bottom: 3px double #D4AF37;
        padding-bottom: 10px;
        margin-bottom: 12px;
      }
      .logo-wrap { margin-bottom: 8px; }
      .official-name {
        font-size: 1.05rem;
        font-weight: 700;
        color: #0B1F3A;
        margin: 0;
        line-height: 1.35;
      }
      .motto {
        font-size: 0.82rem;
        color: #475569;
        margin: 6px 0 0;
        line-height: 1.35;
      }
      .address {
        font-size: 0.78rem;
        color: #64748b;
        margin: 4px 0 0;
      }
      .report-title {
        text-align: center;
        font-size: 1.1rem;
        font-weight: 700;
        color: #0B1F3A;
        margin: 12px 0 8px;
        line-height: 1.55;
        letter-spacing: 0.01em;
        word-wrap: break-word;
        overflow-wrap: anywhere;
      }
      .subtitle { text-align: center; font-size: 0.85rem; color: #475569; margin: 0 0 6px; line-height: 1.4; word-wrap: break-word; }
      .filter-line {
        font-size: 0.78rem;
        color: #334155;
        text-align: center;
        margin: 0 0 12px;
        line-height: 1.45;
        word-wrap: break-word;
        overflow-wrap: anywhere;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 0.78rem;
      }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
      th, td {
        border: 1px solid #0B1F3A;
        padding: 7px 8px;
        vertical-align: top;
        text-align: left;
        word-wrap: break-word;
        overflow-wrap: anywhere;
        hyphens: auto;
        line-height: 1.55;
        white-space: normal;
      }
      th {
        background: #0B1F3A;
        color: #D4AF37;
        font-weight: 700;
      }
      tbody tr:nth-child(even) { background: #f8fafc; }
      .print-footer {
        margin-top: 14px;
        font-size: 0.72rem;
        color: #64748b;
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 8px;
      }
    </style>
    </head><body>
      <div class="sheet">
        <header class="brand-header">
          ${logo}
          <p class="official-name">${escapeHtml(official)}</p>
          ${master.identity.motto?.trim() ? `<p class="motto">${escapeHtml(master.identity.motto.trim())}</p>` : ""}
          ${master.identity.address?.trim() ? `<p class="address">${escapeHtml(master.identity.address.trim())}</p>` : ""}
        </header>
        <h1 class="report-title">${escapeHtml(titleNorm)}</h1>
        ${subBlock}
        ${filterBlock}
        <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
        <footer class="print-footer">
          <span>${escapeHtml(master.identity.system_footer || "")}</span>
          <span>Imetengenezwa: ${escapeHtml(printableGeneratedAt())}</span>
        </footer>
      </div>
      <script>window.onload=function(){window.print();}</script>
    </body></html>`);
  w.document.close();
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Kichwa cha PDF kinacholingana na ngazi (Kiswahili rasmi). */
export function officialStructureRecordPdfTitle(level: string): string {
  switch (String(level || "").toLowerCase()) {
    case "kmkt":
      return "TAARIFA RASMI YA KMK(T) NGAZI KUU";
    case "dayosisi":
      return "TAARIFA RASMI YA DAYOSISI";
    case "jimbo":
      return "RIPOTI YA JIMBO";
    case "tawi":
      return "TAARIFA YA TAWI / KITUO";
    case "jumuiya":
      return "TAARIFA YA JUMUIYA";
    case "idara":
      return "TAARIFA YA IDARA";
    case "huduma":
      return "TAARIFA YA HUDUMA";
    case "taasisi":
      return "TAARIFA YA TAASISI";
    default:
      return "TAARIFA RASMI YA MUUNDO WA KANISA";
  }
}

/** Safu za PDF/Excel kwa rekodi moja ya church_structure_entities. */
export function churchStructureEntityDetailRows(
  entity: ChurchStructureEntity,
  hierarchyPath: string
): (string | number)[][] {
  const att = (entity.attachment_urls ?? []).join(", ");
  const tags = (entity.category_tags ?? []).join(", ");
  return [
    ["Njia ya hierarchy", hierarchyPath || "—"],
    ["Ngazi (level)", entity.level],
    ["Jina", entity.name],
    ["Code", entity.code],
    ["Aina (entity_type)", entity.entity_type || "—"],
    ["Jina rasmi", entity.official_name || "—"],
    ["Short code", entity.short_code || "—"],
    ["Status", entity.status],
    ["Maelezo", entity.description || "—"],
    ["Mkoa / Region", entity.region || "—"],
    ["Wilaya / District", entity.district || "—"],
    ["Kata / Ward", entity.ward || "—"],
    ["Kijiji / Mtaa", entity.village_street || "—"],
    ["Anwani", entity.address || "—"],
    ["GPS", entity.gps_coordinates || "—"],
    ["Mhusika / Contact", entity.contact_person || "—"],
    ["Simu", entity.phone || "—"],
    ["WhatsApp", entity.whatsapp || "—"],
    ["Barua pepe", entity.email || "—"],
    ["Tovuti", entity.website || "—"],
    ["Google Maps", entity.google_maps_url || "—"],
    ["Logo URL", entity.logo_url || "—"],
    ["Picha URL", entity.photo_url || "—"],
    ["Saini URL", entity.signature_url || "—"],
    ["Kiongozi", entity.leader_name || "—"],
    ["Wasaidizi wa uongozi", entity.assistant_leaders || "—"],
    ["Katibu", entity.secretary_name || "—"],
    ["Mhasibu", entity.treasurer_name || "—"],
    ["Tarehe ya kuanzishwa", entity.established_date || "—"],
    ["Mzazi (jina)", entity.parent_name || "—"],
    ["ID ya mzazi (UUID)", entity.parent_id || "—"],
    ["Maelezo ya ziada", entity.notes || "—"],
    ["Viambatisho (URLs)", att || "—"],
    ["Tags", tags || "—"],
    ["Rekodi za chini (children_count)", entity.children_count ?? 0],
    ["Wanachama (members_count)", entity.members_count ?? 0],
    ["Familia (families_count)", entity.families_count ?? 0],
    ["Ukamilifu wa wasifu %", entity.profile_completeness ?? 0],
    ["Muhtasari hierarchy (DB)", entity.hierarchy_summary || "—"],
    ["Imeundwa", entity.created_at],
    ["Imesasishwa", entity.updated_at],
    ["Imeundwa na (UUID)", entity.created_by || "—"],
    ["Imesasishwa na (UUID)", entity.updated_by || "—"],
    ["ID ya rekodi", entity.id],
  ];
}

/** Safu za viongozi wa jedwali `church_structure_leaders` kwa PDF/Excel. */
export function churchStructureLeaderDetailRows(leaders: ChurchStructureLeader[]): (string | number)[][] {
  const rows: (string | number)[][] = [];
  const active = leaders.filter((l) => l.status !== "archived");
  active.forEach((l, idx) => {
    rows.push([`— Kiongozi ${idx + 1} —`, ""]);
    rows.push(["Cheo", l.position_title]);
    rows.push(["Kategoria ya uongozi", l.leadership_category || "—"]);
    rows.push(["Jina kamili", l.full_name]);
    rows.push(["Simu", l.phone || "—"]);
    rows.push(["Barua pepe", l.email || "—"]);
    rows.push(["Picha URL", l.photo_url || "—"]);
    rows.push(["Saini URL", l.signature_url || "—"]);
    rows.push(["Hati ya uteuzi (URL)", l.appointment_document_url || "—"]);
    rows.push(["Muda wa mwanzo", l.term_start || "—"]);
    rows.push(["Muda wa mwisho", l.term_end || "—"]);
    rows.push(["Hali", l.status]);
    rows.push(["Maelezo", l.notes || "—"]);
  });
  if (active.length === 0) rows.push(["Viongozi wa jedwali", "Hakuna viongozi vilivyosajiliwa kwenye jedwali la viongozi."]);
  return rows;
}

/** PDF ya kiwango cha juu — hutumia kichwa cha taasisi, QR, saini, na kurasa. */
export async function exportChurchStructureEntityPdf(
  entity: ChurchStructureEntity,
  opts: { hierarchyPath: string }
): Promise<void> {
  let leaderRows: (string | number)[][] = [];
  try {
    const leaders = await fetchLeadersForEntity(entity.id);
    leaderRows = churchStructureLeaderDetailRows(leaders);
  } catch {
    leaderRows = [["Viongozi wa jedwali", "Haijapakiwa (angalia ruhusa / migration)."]];
  }
  const body = [...churchStructureEntityDetailRows(entity, opts.hierarchyPath), ...leaderRows];
  const safeCode = String(entity.code ?? "rekodi")
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 64);
  const pdfTitle = officialStructureRecordPdfTitle(entity.level);
  await exportTableToPdf(
    pdfTitle,
    `muundo_${safeCode}_${entity.id.slice(0, 8)}`,
    ["Kipengele", "Thamani"],
    body,
    {
      orientation: "portrait",
      showSignatureLine: true,
      subtitle: entity.official_name?.trim() || entity.name,
      filterSummary: `Njia: ${opts.hierarchyPath || "—"} · ID: ${entity.id}`,
      description:
        "Nakala rasmi ya rekodi ya muundo wa kanisa (public.church_structure_entities + church_structure_leaders) — KMT Portal. Eneo la muhuri na saini hapa chini.",
    }
  );
}
