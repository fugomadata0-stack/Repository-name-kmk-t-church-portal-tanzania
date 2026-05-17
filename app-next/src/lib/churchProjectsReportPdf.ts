import { jsPDF } from "jspdf";
import type { ChurchInstitutionProject } from "../services/phase1FoundationService";
import { PROJECT_TYPE_LABELS } from "../services/phase1FoundationService";
import { formatMoneyTzOrDash } from "./money";
import { drawDoubleBorderTable, type Phase1PdfMeta } from "./kmktPhase1ReportPdf";
import { drawChurchLogoOnPdf, resolveChurchLogoDataUrl, withChurchLogoMeta } from "./churchPdfBranding";
import { drawKmktPdfWatermark, normalizePdfReadableText } from "./pdfInstitutional";
import { KMKT_GOLD, KMKT_NAVY } from "./exportHelpers";

export async function buildChurchProjectDetailPdf(
  project: ChurchInstitutionProject,
  meta?: Phase1PdfMeta,
  logoDataUrl?: string | null,
): Promise<jsPDF> {
  const m = meta ? await withChurchLogoMeta(meta) : null;
  const resolvedLogo = logoDataUrl ?? m?.logoDataUrl ?? (await resolveChurchLogoDataUrl());
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  drawKmktPdfWatermark(doc, { line1: "KMK(T)", line2: "MRADI / PROJECT" });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  doc.setFillColor(...KMKT_NAVY);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setFillColor(...KMKT_GOLD);
  doc.rect(0, 32, pageW, 2, "F");
  drawChurchLogoOnPdf(doc, resolvedLogo, { x: margin, y: 5, size: 20, whiteBg: true });
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(normalizePdfReadableText(project.name), pageW / 2, 14, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    normalizePdfReadableText(PROJECT_TYPE_LABELS[project.project_type] ?? project.project_type),
    pageW / 2,
    22,
    { align: "center" }
  );

  const income = Number(project.budget_income_tz || 0);
  const expense = Number(project.budget_expense_tz || 0);
  const balance = Number(project.balance_tz || 0) || income - expense;

  const body: (string | number)[][] = [
    ["Usajili / Registration", project.registration_number ?? "—"],
    ["Mkoa / Region", project.location_region ?? "—"],
    ["Wilaya / District", project.location_district ?? "—"],
    ["Anwani / Address", project.location_address ?? "—"],
    ["Mkuu / Director", project.leader_name ?? "—"],
    ["Cheo / Title", project.leader_title ?? "—"],
    ["Simu / Phone", project.leader_phone ?? "—"],
    ["Mapato / Income", formatMoneyTzOrDash(income)],
    ["Matumizi / Expenses", formatMoneyTzOrDash(expense)],
    ["Salio / Balance", formatMoneyTzOrDash(balance)],
    ["Hali / Status", project.approval_status],
    ["Maelezo / Notes", project.notes ?? "—"],
  ];

  drawDoubleBorderTable(doc, 40, [["Kipengele", "Thamani"]], body);
  return doc;
}

export { buildProjectsPhase1Pdf, downloadPhase1Pdf } from "./kmktPhase1ReportPdf";
