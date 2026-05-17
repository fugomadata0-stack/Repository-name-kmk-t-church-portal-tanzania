import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { KMKT_INCOME_CONTRIBUTION_TYPES } from "../data/kmktIncomeContributionTypes";
import { KMKT_GOLD, KMKT_NAVY } from "./exportHelpers";
import { drawChurchLogoOnPdfAuto } from "./churchPdfBranding";
import { drawKmktPdfWatermark, normalizePdfReadableText } from "./pdfInstitutional";
import { downloadPortalExcelTemplate } from "./excelPortalBulk";
import { downloadCsvTemplate } from "./csvPortalBulk";
import {
  buildContributionFormsExcelBundle,
  CONTRIBUTION_FORMS_COLUMNS,
} from "./contributionFormsSpec";

export async function downloadContributionFormsExcelTemplate(): Promise<void> {
  const bundle = buildContributionFormsExcelBundle();
  await downloadPortalExcelTemplate({
    filenameBase: bundle.templateBasename,
    instructionTitle: bundle.specTitle,
    instructionSubtitle: bundle.specSubtitle,
    instructionRows: bundle.instructionRows,
    columns: bundle.columns,
  });
}

export function downloadContributionFormsCsvTemplate(): void {
  downloadCsvTemplate(
    "KMKT_Contribution_Forms",
    CONTRIBUTION_FORMS_COLUMNS.map((c) => c.label)
  );
}

/** Blanki ya PDF — jedwali la safu tupu kwa kuchapisha/kujaza. */
export async function downloadContributionFormsPdfTemplate(): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  drawKmktPdfWatermark(doc, { line1: "KMK(T)", line2: "FOMU ZA MICHANGO · CONTRIBUTION FORMS" });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 10;
  doc.setFillColor(...KMKT_NAVY);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setFillColor(...KMKT_GOLD);
  doc.rect(0, 28, pageW, 2, "F");
  await drawChurchLogoOnPdfAuto(doc, { x: margin, y: 4, size: 18, whiteBg: true });
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(normalizePdfReadableText("Fomu za Michango — Blanki"), pageW / 2, 12, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    normalizePdfReadableText("Jaza safu kwa safu · Pakia .xlsx au .csv kwenye portal"),
    pageW / 2,
    20,
    { align: "center" }
  );

  const head = CONTRIBUTION_FORMS_COLUMNS.filter((c) => c.key !== "id").map((c) => c.label);
  const emptyRows = Array.from({ length: 12 }, () => head.map(() => ""));
  autoTable(doc, {
    startY: 36,
    head: [head],
    body: emptyRows,
    theme: "grid",
    styles: { fontSize: 7, halign: "center", cellPadding: 2, lineColor: KMKT_NAVY, lineWidth: 0.35 },
    headStyles: { fillColor: KMKT_NAVY, textColor: [255, 255, 255], fontStyle: "bold" },
    margin: { left: 8, right: 8 },
  });

  const y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120;
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  const codes = KMKT_INCOME_CONTRIBUTION_TYPES.slice(0, 20)
    .map((t) => `${t.code}: ${t.name}`)
    .join(" · ");
  const codeLines = doc.splitTextToSize(normalizePdfReadableText(`Aina: ${codes}…`), pageW - 16) as string[];
  doc.text(codeLines, 8, y + 8);

  doc.save(`KMKT_Contribution_Forms_blanki_${Date.now()}.pdf`);
}
