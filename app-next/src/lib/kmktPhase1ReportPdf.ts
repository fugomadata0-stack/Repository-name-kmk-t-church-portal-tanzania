import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { KMKT_GOLD, KMKT_NAVY, KMKT_SLATE } from "./exportHelpers";
import { drawChurchLogoOnPdf, withChurchLogoMeta } from "./churchPdfBranding";
import { drawKmktPdfWatermark, normalizePdfReadableText } from "./pdfInstitutional";
import type {
  ChurchInstitutionProject,
  FinanceDistributionSummary,
  MembershipCategoryStats,
  Phase1Scope,
} from "../services/phase1FoundationService";
import { MEMBERSHIP_CATEGORY_LABELS, PROJECT_TYPE_LABELS } from "../services/phase1FoundationService";
import { formatMoneyTzOrDash } from "./money";

export type Phase1ReportKind = "membership" | "finance" | "projects" | "combined";

export type Phase1PdfMeta = {
  titleSw: string;
  titleEn: string;
  aboutSw: string;
  aboutEn: string;
  level: Phase1Scope;
  levelLabel: string;
  periodStart?: string;
  periodEnd?: string;
  approvals?: string;
  hierarchyFlow?: string;
  /** Logo ya kanisa (data URL) — kutoka mipangilio. */
  logoDataUrl?: string | null;
};

function scopeLabel(scope: Phase1Scope): string {
  const map: Record<Phase1Scope, string> = {
    tawi: "Tawi / Branch",
    jimbo: "Jimbo / Presbytery",
    dayosisi: "Dayosisi / Diocese",
    kmkt: "KMK(T) / National",
  };
  return map[scope] ?? scope;
}

function drawPhase1Header(doc: jsPDF, meta: Phase1PdfMeta, yStart: number): number {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = yStart;

  doc.setFillColor(...KMKT_NAVY);
  doc.rect(0, 0, pageW, 38, "F");
  doc.setFillColor(...KMKT_GOLD);
  doc.rect(0, 38, pageW, 2.5, "F");

  drawChurchLogoOnPdf(doc, meta.logoDataUrl, { x: margin + 2, y: 7, size: 22, whiteBg: true });

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(normalizePdfReadableText(meta.titleSw), pageW / 2, 14, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(normalizePdfReadableText(meta.titleEn), pageW / 2, 21, { align: "center" });
  doc.setFontSize(8.5);
  doc.text(
    normalizePdfReadableText(`Ngazi: ${meta.levelLabel} · ${new Date().toLocaleString("sw-TZ")}`),
    pageW / 2,
    30,
    { align: "center" }
  );

  doc.setTextColor(15, 23, 42);
  y = 48;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Maelezo / About", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const about = `${meta.aboutSw}\n${meta.aboutEn}`;
  const lines = doc.splitTextToSize(normalizePdfReadableText(about), pageW - margin * 2) as string[];
  doc.text(lines, margin, y);
  y += lines.length * 4.2 + 4;

  const infoRows: string[][] = [
    ["Ngazi / Level", meta.levelLabel],
    ["Muda / Period", [meta.periodStart, meta.periodEnd].filter(Boolean).join(" — ") || "—"],
    ["Mtiririko / Hierarchy", meta.hierarchyFlow ?? "Tawi → Jimbo → Dayosisi → KMK(T)"],
    ["Idhini / Approvals", meta.approvals ?? "—"],
  ];
  autoTable(doc, {
    startY: y,
    head: [["Kipengele / Field", "Thamani / Value"]],
    body: infoRows,
    theme: "grid",
    styles: {
      fontSize: 8.5,
      halign: "center",
      cellPadding: 2.5,
      lineColor: KMKT_NAVY,
      lineWidth: 0.35,
    },
    headStyles: {
      fillColor: KMKT_NAVY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin, bottom: 48 },
    rowPageBreak: "avoid",
  });
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20;
}

export function drawDoubleBorderTable(
  doc: jsPDF,
  startY: number,
  head: string[][],
  body: (string | number)[][]
): number {
  const margin = 14;
  autoTable(doc, {
    startY,
    head,
    body,
    theme: "grid",
    styles: {
      fontSize: 9,
      halign: "center",
      valign: "middle",
      cellPadding: 3,
      lineColor: KMKT_NAVY,
      lineWidth: 0.45,
    },
    headStyles: {
      fillColor: KMKT_NAVY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      lineWidth: 0.6,
    },
    bodyStyles: {
      lineWidth: 0.4,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin, bottom: 48 },
    rowPageBreak: "avoid",
    showHead: "everyPage",
  });
  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 20;
  const pageW = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...KMKT_GOLD);
  doc.setLineWidth(0.8);
  doc.rect(margin - 2, startY - 2, pageW - margin * 2 + 4, finalY - startY + 6);
  return finalY + 10;
}

export async function buildMembershipPhase1Pdf(
  stats: MembershipCategoryStats,
  meta: Phase1PdfMeta
): Promise<jsPDF> {
  const m = await withChurchLogoMeta(meta);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  drawKmktPdfWatermark(doc, { line1: "KMK(T)", line2: "RIPOTI YA UANACHAMA · MEMBERSHIP" });

  const body = MEMBERSHIP_CATEGORY_LABELS.map((c) => [
    c.sw,
    c.en,
    String(stats[c.key] ?? 0),
  ]);
  const y = drawPhase1Header(doc, m, 48);
  drawDoubleBorderTable(doc, y, [["Kategoria (SW)", "Category (EN)", "Idadi / Count"]], body);

  doc.setFontSize(8);
  doc.setTextColor(...KMKT_SLATE);
  doc.text(
    normalizePdfReadableText("Hati rasmi — data kutoka portal_membership_statistics (Supabase)."),
    14,
    doc.internal.pageSize.getHeight() - 8
  );
  return doc;
}

export async function buildFinancePhase1Pdf(
  summary: FinanceDistributionSummary,
  remittances: { from_level: string; to_level: string; amount_tz: number; transfer_amount_tz: number; remaining_amount_tz: number; approval_status: string; receipt_number?: string | null }[] = [],
  meta: Phase1PdfMeta
): Promise<jsPDF> {
  const m = await withChurchLogoMeta(meta);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  drawKmktPdfWatermark(doc, { line1: "KMK(T)", line2: "RIPOTI YA FEDHA · FINANCE" });

  const fmt = (n: number) =>
    n.toLocaleString("sw-TZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " TZS";

  const body: (string | number)[][] = [
    ["Mapato / Income", fmt(summary.income_total)],
    ["Mapato ya ndani / Local", fmt(summary.income_local)],
    ["Mapato ya juu / Upward", fmt(summary.income_upward)],
    ["Matumizi / Expenses", fmt(summary.expenses_total)],
    ["Salio / Balance", fmt(summary.balance)],
    ["Uhamisho (idhini) / Transfers approved", fmt(summary.transfers_approved)],
    ["Uhamisho (inasubiri) / Pending", fmt(summary.transfers_pending)],
    ["Moja kwa moja KMK(T) / Direct", fmt(summary.direct_kmkt_total ?? 0)],
    ["Kiasi kilichobaki / Remaining", fmt(summary.remaining)],
  ];

  let y = drawPhase1Header(doc, { ...m, levelLabel: scopeLabel(summary.scope) }, 48);
  y = drawDoubleBorderTable(doc, y, [["Kipengele / Item", "Kiasi / Amount"]], body);

  if (remittances.length > 0) {
    const ledgerRows = remittances.slice(0, 40).map((r) => [
      `${r.from_level} → ${r.to_level}`,
      fmt(r.amount_tz),
      fmt(r.transfer_amount_tz),
      fmt(r.remaining_amount_tz),
      r.approval_status,
      r.receipt_number ?? "—",
    ]);
    drawDoubleBorderTable(
      doc,
      y + 4,
      [["Njia / Route", "Kiasi", "Uhamisho", "Kilichobaki", "Idhini", "Risiti"]],
      ledgerRows
    );
  }

  return doc;
}

export async function buildProjectsPhase1Pdf(
  projects: ChurchInstitutionProject[],
  meta: Phase1PdfMeta
): Promise<jsPDF> {
  const m = await withChurchLogoMeta(meta);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  drawKmktPdfWatermark(doc, { line1: "KMK(T)", line2: "RIPOTI YA MIRADI · PROJECTS" });

  const totalIncome = projects.reduce((s, p) => s + Number(p.budget_income_tz || 0), 0);
  const totalExpense = projects.reduce((s, p) => s + Number(p.budget_expense_tz || 0), 0);
  const totalBalance = projects.reduce((s, p) => s + Number(p.balance_tz || 0), 0);

  const summaryBody: (string | number)[][] = [
    ["Miradi / Projects", String(projects.length)],
    ["Mapato / Income", formatMoneyTzOrDash(totalIncome)],
    ["Matumizi / Expenses", formatMoneyTzOrDash(totalExpense)],
    ["Salio / Balance", formatMoneyTzOrDash(totalBalance)],
  ];

  let y = drawPhase1Header(doc, m, 48);
  y = drawDoubleBorderTable(doc, y, [["Kipengele", "Thamani"]], summaryBody);

  const rows = projects.map((p) => [
    PROJECT_TYPE_LABELS[p.project_type] ?? p.project_type,
    p.name,
    p.location_region ?? "—",
    p.leader_name ?? "—",
    formatMoneyTzOrDash(p.budget_income_tz),
    formatMoneyTzOrDash(p.budget_expense_tz),
    formatMoneyTzOrDash(p.balance_tz),
    p.approval_status,
  ]);

  drawDoubleBorderTable(
    doc,
    y + 4,
    [["Aina", "Jina", "Mkoa", "Mkuu", "Mapato", "Matumizi", "Salio", "Hali"]],
    rows.length ? rows : [["—", "Hakuna miradi", "—", "—", "—", "—", "—", "—"]]
  );

  return doc;
}

export function downloadPhase1Pdf(doc: jsPDF, filename: string): void {
  doc.save(filename.replace(/[^\w.-]+/g, "_"));
}
