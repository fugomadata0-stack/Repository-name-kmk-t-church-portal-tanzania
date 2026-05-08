export const EXCEL_INSTRUCTIONS_SHEET = "Maelekezo";
export const EXCEL_DATA_SHEET = "Data";

function normCell(s: unknown): string {
  return String(s ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\u00a0/g, " ")
    .trim();
}

/** Linganisha vichwa hata Excel ikiongeza nafasi nyingi mfululizo. */
function normHeaderLabel(s: unknown): string {
  return normCell(s).replace(/\s+/g, " ");
}

/** Jedwali la maelezo + Data yenye vichwa, safu tupu za kujaza, urefu wa safu na autofilter. */
async function buildPortalExcelWorkbook(opts: {
  instructionTitle: string;
  instructionSubtitle?: string;
  instructionRows: (string | number)[][];
  columns: { key: string; label: string }[];
  dataRows?: (string | number)[][];
}) {
  const XLSX = await import("xlsx");
  const labels = opts.columns.map((c) => c.label);
  const instAoA: (string | number)[][] = [
    [opts.instructionTitle],
    ...(opts.instructionSubtitle ? [[opts.instructionSubtitle]] : []),
    [],
    ...opts.instructionRows,
  ];
  const inst = XLSX.utils.aoa_to_sheet(instAoA);
  inst["!cols"] = [{ wch: 96 }];

  const body =
    opts.dataRows && opts.dataRows.length > 0
      ? [labels, ...opts.dataRows]
      : [labels, ...Array.from({ length: 55 }, () => labels.map(() => ""))];
  const data = XLSX.utils.aoa_to_sheet(body);
  const ncol = Math.max(labels.length, 1);
  const lastRow = Math.max(body.length - 1, 1);
  data["!cols"] = labels.map(() => ({ wch: 22 }));
  data["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: ncol - 1 } }) };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, inst, EXCEL_INSTRUCTIONS_SHEET);
  XLSX.utils.book_append_sheet(wb, data, EXCEL_DATA_SHEET);
  return wb;
}

export async function downloadPortalExcelTemplate(opts: {
  filenameBase: string;
  instructionTitle: string;
  instructionSubtitle?: string;
  instructionRows: (string | number)[][];
  columns: { key: string; label: string }[];
}) {
  const XLSX = await import("xlsx");
  const wb = await buildPortalExcelWorkbook({
    instructionTitle: opts.instructionTitle,
    instructionSubtitle: opts.instructionSubtitle,
    instructionRows: opts.instructionRows,
    columns: opts.columns,
  });
  const safe = opts.filenameBase.replace(/[^\w-]+/g, "_").slice(0, 80) || "template";
  XLSX.writeFile(wb, `${safe}_blanki.xlsx`);
}

export async function downloadPortalExcelDataExport(opts: {
  filenameBase: string;
  instructionTitle: string;
  instructionSubtitle?: string;
  instructionRows: (string | number)[][];
  columns: { key: string; label: string }[];
  dataRows: (string | number)[][];
}) {
  const XLSX = await import("xlsx");
  const wb = await buildPortalExcelWorkbook({
    instructionTitle: opts.instructionTitle,
    instructionSubtitle: opts.instructionSubtitle,
    instructionRows: opts.instructionRows,
    columns: opts.columns,
    dataRows: opts.dataRows,
  });
  const safe = opts.filenameBase.replace(/[^\w-]+/g, "_").slice(0, 80) || "data";
  XLSX.writeFile(wb, `${safe}_orodha.xlsx`);
}

/** Soma jalada "Data"; safu ya kwanza lazima iwe sawa na vichwa vilivyotarajiwa kwa mpangilio ule ule. */
export async function parsePortalExcelDataSheet(
  file: File,
  expectedLabels: string[]
): Promise<Record<string, string>[]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName =
    wb.SheetNames.find((n) => n.trim().toLowerCase() === EXCEL_DATA_SHEET.toLowerCase()) ?? wb.SheetNames[0];
  if (!sheetName) throw new Error("Faili halina jalada lolote.");
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Jalada "${sheetName}" halipatikani.`);
  const aoa = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];
  if (!aoa.length) throw new Error("Jalada la Data ni tupu.");
  const header = (aoa[0] as unknown[]).map((c) => normCell(c));
  if (header.length < expectedLabels.length) {
    throw new Error(`Vichwa vina uhaba: tarajia safu ${expectedLabels.length}, yaliyopo ${header.length}.`);
  }
  for (let i = 0; i < expectedLabels.length; i++) {
    const got = normHeaderLabel(header[i]);
    const want = normHeaderLabel(expectedLabels[i]);
    if (got !== want) {
      throw new Error(
        `Kichwa safu ${i + 1} halilingani.\nTarajio: "${want}"\nYaliyopo: "${got || ""}"\nPakua tena «Pakua blanki» kutoka portal, jaza jalada «Data» pekee, kisha hifadhi .xlsx bila kubadilisha majina ya safu ya kwanza.`
      );
    }
  }
  const keys = expectedLabels;
  const out: Record<string, string>[] = [];
  for (let r = 1; r < aoa.length; r++) {
    const row = (aoa[r] as unknown[]) || [];
    const cells = keys.map((_, j) => normCell(row[j]));
    if (cells.every((c) => c === "")) continue;
    const obj: Record<string, string> = {};
    keys.forEach((label, j) => {
      obj[label] = cells[j] ?? "";
    });
    out.push(obj);
  }
  return out;
}

/** Badilisha safu zilizosomwa kwa kitambulisho cha ndani (ufunguo wa uwanja). */
export function mapLabelRowsToKeyRecords(
  rows: Record<string, string>[],
  columns: { key: string; label: string }[]
): Record<string, string>[] {
  return rows.map((row) => {
    const o: Record<string, string> = {};
    for (const c of columns) {
      o[c.key] = row[c.label] ?? "";
    }
    return o;
  });
}
