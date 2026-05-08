export function downloadCsvTemplate(filenameBase: string, labels: string[]): void {
  const safe = filenameBase.replace(/[^\w-]+/g, "_").slice(0, 80) || "template";
  const csv = `${labels.join(",")}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safe}_blanki.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCsvDataExport(filenameBase: string, labels: string[], dataRows: (string | number)[][]): void {
  const safe = filenameBase.replace(/[^\w-]+/g, "_").slice(0, 80) || "data";
  const escapeCell = (v: string | number) => {
    const s = String(v ?? "");
    return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [labels.map(escapeCell).join(","), ...dataRows.map((r) => r.map(escapeCell).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safe}_orodha.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
      continue;
    }
    if (ch === "," && !inQ) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export async function parseCsvData(file: File, expectedLabels: string[]): Promise<Record<string, string>[]> {
  const text = await file.text();
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((x) => x.trim().length > 0);
  if (!lines.length) throw new Error("CSV ni tupu.");
  const header = parseCsvLine(lines[0]);
  if (header.length < expectedLabels.length) {
    throw new Error(`CSV ina vichwa vichache: tarajia ${expectedLabels.length}, vimepatikana ${header.length}.`);
  }
  for (let i = 0; i < expectedLabels.length; i++) {
    if (header[i].trim() !== expectedLabels[i].trim()) {
      throw new Error(`Kichwa safu ${i + 1} hakilingani. Tarajia "${expectedLabels[i]}", kimepatikana "${header[i]}".`);
    }
  }
  const out: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.every((c) => c.trim() === "")) continue;
    const row: Record<string, string> = {};
    expectedLabels.forEach((label, idx) => {
      row[label] = String(cells[idx] ?? "").trim();
    });
    out.push(row);
  }
  return out;
}
