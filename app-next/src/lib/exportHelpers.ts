import { fetchMasterSettingsOptional, readMasterSettingsCache } from "../services/masterSettingsService";

function printableGeneratedAt(): string {
  return new Date().toLocaleString("sw-TZ");
}

export async function exportRowsToExcel(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const master = (await fetchMasterSettingsOptional()) ?? readMasterSettingsCache();
  const XLSX = await import("xlsx");

  const excelHeader = master.theme.excel_header_text || master.identity.official_name || "KMK(T) Export";
  const topRows: (string | number)[][] = [
    [excelHeader],
    [master.identity.motto || ""],
    [master.identity.address || ""],
    [master.identity.system_footer || ""],
    [`Generated: ${printableGeneratedAt()}`],
    [],
  ];

  const ws = XLSX.utils.aoa_to_sheet([...topRows, headers, ...rows]);
  ws["!freeze"] = { xSplit: 0, ySplit: topRows.length + 1 };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function exportTableToPdf(
  title: string,
  filename: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const master = (await fetchMasterSettingsOptional()) ?? readMasterSettingsCache();
  const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableMod.default;

  const doc = new jsPDF({ orientation: "landscape" });
  const header = master.theme.pdf_header_text || master.identity.official_name || "KMK(T)";
  doc.setFontSize(12);
  doc.text(header, 14, 12);
  if (master.identity.motto) {
    doc.setFontSize(10);
    doc.text(master.identity.motto, 14, 17);
  }
  if (master.identity.address) {
    doc.setFontSize(9);
    doc.text(master.identity.address, 14, 22);
  }
  doc.setFontSize(10);
  doc.text(title, 14, 28);

  autoTable(doc, {
    startY: 34,
    head: [headers],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [11, 31, 58] },
  });

  const footerY = 198;
  doc.setFontSize(9);
  doc.text(master.identity.system_footer || "", 14, footerY);
  doc.text(`Generated: ${printableGeneratedAt()}`, 220, footerY);
  doc.text(
    `${master.identity.official_name} ${master.identity.official_seal_text ? `| ${master.identity.official_seal_text}` : ""}`,
    14,
    footerY + 5
  );

  if (master.theme.signature_image_url) {
    doc.text("Signature on file", 260, footerY + 5);
  }

  doc.save(`${filename}.pdf`);
}

export function openPrintableTable(title: string, headers: string[], rows: (string | number)[][]) {
  const master = readMasterSettingsCache();
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;

  const head = headers.map((h) => `<th class="p-2 text-left border-b">${escapeHtml(String(h))}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td class="p-2 border-b text-sm">${escapeHtml(String(c))}</td>`).join("")}</tr>`
    )
    .join("");

  const printHeader = master.theme.print_header_text || master.identity.official_name || "KMK(T)";
  const logo = master.theme.logo_url ? `<img src="${escapeHtml(master.theme.logo_url)}" style="max-height:58px;object-fit:contain"/>` : "";

  w.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title>
    <style>
      body{font-family:system-ui;padding:16px;color:${escapeHtml(master.theme.text_color)};background:${escapeHtml(master.theme.background_color)}}
      table{width:100%;border-collapse:collapse}
      th{background:${escapeHtml(master.theme.primary_color)};color:#fff}
      .meta{font-size:12px;color:#334155}
    </style>
    </head><body>
      <div style="display:flex;align-items:center;gap:12px">${logo}<div><h1 style="font-size:18px;margin:0">${escapeHtml(printHeader)}</h1><p class="meta" style="margin:0">${escapeHtml(master.identity.motto || "")}</p></div></div>
      <p class="meta">${escapeHtml(master.identity.address || "")}</p>
      <p><strong>${escapeHtml(title)}</strong></p>
      <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
      <p class="meta" style="margin-top:16px">${escapeHtml(master.identity.system_footer || "")}</p>
      <p class="meta">Generated: ${escapeHtml(printableGeneratedAt())}</p>
      <script>window.onload=function(){window.print();}</script>
    </body></html>`);
  w.document.close();
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

