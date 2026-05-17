import autoTable from "jspdf-autotable";
import {
  fetchFinanceDistributionSummary,
  fetchMembershipStatistics,
  listInstitutionProjectsForScope,
  type Phase1Scope,
} from "../../services/phase1FoundationService";
import { MEMBERSHIP_CATEGORY_LABELS, PROJECT_TYPE_LABELS } from "../../services/phase1FoundationService";
import { formatMoneyTzOrDash } from "../money";
import { KMKT_NAVY } from "../exportHelpers";
import { normalizePdfReadableText } from "../pdfInstitutional";
import {
  buildFinancePhase1Pdf,
  buildMembershipPhase1Pdf,
  buildProjectsPhase1Pdf,
  drawDoubleBorderTable,
  type Phase1PdfMeta,
} from "../kmktPhase1ReportPdf";
import { buildAdvancedLeadershipPdf } from "../leadershipPdfEngine/buildAdvancedPdf";
import type { BuildMasterLeadershipInput, BuiltMasterPdf, MasterPdfMeta, MasterReportKind } from "./types";
import {
  applyMasterChromeToAllPages,
  createMasterPdfDocument,
  drawMasterInstitutionalHeader,
  drawMasterWatermark,
  ensureMasterPageSpace,
  MASTER_PDF,
  scopeLabelSw,
} from "./layout";
import { resolveChurchLogoDataUrl } from "../churchPdfBranding";
import { fetchMasterQrImage } from "./qr";

const HIERARCHY_KINDS = new Set<MasterReportKind>(["tawi", "jimbo", "dayosisi", "kmkt"]);

function portalBase(): string {
  return typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "https://kmkt.or.tz";
}

function metaForScope(scope: Phase1Scope, titleSw: string, titleEn: string): MasterPdfMeta {
  const serial = `KMK-${scope.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const verifyUrl = `${portalBase()}/#/ripoti?scope=${scope}&doc=${serial}`;
  return {
    titleSw,
    titleEn,
    aboutSw: "Ripoti rasmi ya kiinstitutional — data hai kutoka Supabase.",
    aboutEn: "Official institutional report — live data from Supabase.",
    scope,
    scopeLabel: scopeLabelSw(scope),
    hierarchyFlow: "Tawi → Jimbo → Dayosisi → KMK(T)",
    documentId: serial,
    verifyUrl,
  };
}

function phase1MetaFromMaster(meta: MasterPdfMeta): Phase1PdfMeta {
  return {
    titleSw: meta.titleSw,
    titleEn: meta.titleEn,
    aboutSw: meta.aboutSw,
    aboutEn: meta.aboutEn,
    level: meta.scope,
    levelLabel: meta.scopeLabel,
    periodStart: meta.periodStart,
    periodEnd: meta.periodEnd,
    hierarchyFlow: meta.hierarchyFlow,
    approvals: meta.approvals,
    logoDataUrl: meta.logoDataUrl,
  };
}

async function masterMetaWithLogo(
  scope: Phase1Scope,
  titleSw: string,
  titleEn: string,
): Promise<MasterPdfMeta> {
  const meta = metaForScope(scope, titleSw, titleEn);
  meta.logoDataUrl = await resolveChurchLogoDataUrl();
  return meta;
}

async function finalizeMasterDoc(doc: import("jspdf").jsPDF, meta: MasterPdfMeta, filename: string): Promise<BuiltMasterPdf> {
  const qr = meta.verifyUrl ? await fetchMasterQrImage(meta.verifyUrl) : null;
  applyMasterChromeToAllPages(doc, meta, qr);
  return {
    doc,
    filename,
    verifyUrl: meta.verifyUrl ?? "",
    displaySerial: meta.documentId ?? filename,
  };
}

/** Ripoti kamili ya ngazi — uanachama + fedha + miradi (ukurasa mmoja+). */
export async function buildHierarchyMasterPdf(scope: Phase1Scope): Promise<BuiltMasterPdf> {
  const labels: Record<Phase1Scope, { sw: string; en: string }> = {
    tawi: { sw: "Ripoti ya Tawi", en: "Branch Master Report" },
    jimbo: { sw: "Ripoti ya Jimbo", en: "Presbytery Master Report" },
    dayosisi: { sw: "Ripoti ya Dayosisi", en: "Diocese Master Report" },
    kmkt: { sw: "Ripoti ya KMK(T)", en: "National Master Report" },
  };
  const meta = await masterMetaWithLogo(scope, labels[scope].sw, labels[scope].en);

  const [mem, fin, projects] = await Promise.all([
    fetchMembershipStatistics(scope),
    fetchFinanceDistributionSummary(scope),
    listInstitutionProjectsForScope(scope),
  ]);
  if (mem.error) throw new Error(mem.error);
  if (fin.error) throw new Error(fin.error);

  meta.periodStart = fin.period_start;
  meta.periodEnd = fin.period_end;
  meta.approvals = `${projects.length} miradi · ${fin.transfers_pending} uhamisho inasubiri`;

  const doc = createMasterPdfDocument();
  drawMasterWatermark(doc, `RIPOTI YA ${scope.toUpperCase()} · HIERARCHY MASTER`);
  let y = drawMasterInstitutionalHeader(doc, meta);

  const memRows = MEMBERSHIP_CATEGORY_LABELS.map((c) => [c.sw, c.en, String(mem.categories[c.key] ?? 0)]);
  y = ensureMasterPageSpace(doc, y, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Sehemu A — Uanachama / Membership", MASTER_PDF.margin + 4, y);
  y = drawDoubleBorderTable(doc, y + 4, [["Kategoria (SW)", "Category (EN)", "Idadi"]], memRows);

  const fmt = (n: number) =>
    n.toLocaleString("sw-TZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " TZS";
  const finRows: (string | number)[][] = [
    ["Mapato", fmt(fin.income_total)],
    ["Matumizi", fmt(fin.expenses_total)],
    ["Salio", fmt(fin.balance)],
    ["Uhamisho inasubiri", fmt(fin.transfers_pending)],
  ];
  y = ensureMasterPageSpace(doc, y, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Sehemu B — Fedha / Finance", MASTER_PDF.margin + 4, y);
  y = drawDoubleBorderTable(doc, y + 4, [["Kipengele", "Kiasi"]], finRows);

  const projRows = projects.slice(0, 35).map((p) => [
    PROJECT_TYPE_LABELS[p.project_type] ?? p.project_type,
    p.name,
    formatMoneyTzOrDash(p.balance_tz),
    p.approval_status,
  ]);
  y = ensureMasterPageSpace(doc, y, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Sehemu C — Miradi / Projects", MASTER_PDF.margin + 4, y);
  drawDoubleBorderTable(
    doc,
    y + 4,
    [["Aina", "Jina", "Salio", "Hali"]],
    projRows.length ? projRows : [["—", "Hakuna miradi", "—", "—"]],
  );

  return finalizeMasterDoc(doc, meta, `kmkt-${scope}-master-hierarchy.pdf`);
}

export async function buildMembershipMasterPdf(scope: Phase1Scope): Promise<BuiltMasterPdf> {
  const stats = await fetchMembershipStatistics(scope);
  if (stats.error) throw new Error(stats.error);
  const meta = await masterMetaWithLogo(scope, "Ripoti ya Uanachama", "Membership Master PDF");
  const doc = await buildMembershipPhase1Pdf(stats.categories, phase1MetaFromMaster(meta));
  return finalizeMasterDoc(doc, meta, `kmkt-${scope}-membership-master.pdf`);
}

export async function buildFinanceMasterPdf(scope: Phase1Scope): Promise<BuiltMasterPdf> {
  const fin = await fetchFinanceDistributionSummary(scope);
  if (fin.error) throw new Error(fin.error);
  const meta = await masterMetaWithLogo(scope, "Ripoti ya Fedha", "Finance Master PDF");
  meta.periodStart = fin.period_start;
  meta.periodEnd = fin.period_end;
  const doc = await buildFinancePhase1Pdf(fin, [], phase1MetaFromMaster(meta));
  return finalizeMasterDoc(doc, meta, `kmkt-${scope}-finance-master.pdf`);
}

export async function buildProjectsMasterPdf(scope: Phase1Scope): Promise<BuiltMasterPdf> {
  const projects = await listInstitutionProjectsForScope(scope);
  const meta = await masterMetaWithLogo(scope, "Ripoti ya Miradi", "Projects Master PDF");
  meta.approvals = `${projects.length} miradi`;
  const doc = await buildProjectsPhase1Pdf(projects, phase1MetaFromMaster(meta));
  return finalizeMasterDoc(doc, meta, `kmkt-${scope}-projects-master.pdf`);
}

export async function buildLeadershipMasterPdf(input: BuildMasterLeadershipInput): Promise<BuiltMasterPdf> {
  const logoDataUrl = input.logoDataUrl ?? (await resolveChurchLogoDataUrl());
  const built = await buildAdvancedLeadershipPdf({ ...input, portalBaseUrl: portalBase(), logoDataUrl });
  return {
    doc: built.doc,
    filename: built.filename,
    verifyUrl: built.verifyUrl,
    displaySerial: built.displaySerial,
  };
}

export function hierarchyKindToScope(kind: MasterReportKind): Phase1Scope | null {
  if (HIERARCHY_KINDS.has(kind)) return kind as Phase1Scope;
  return null;
}

export async function buildMasterReport(
  kind: MasterReportKind,
  scope: Phase1Scope = "kmkt",
  leadershipInput?: BuildMasterLeadershipInput,
): Promise<BuiltMasterPdf> {
  if (kind === "leadership") {
    if (!leadershipInput) throw new Error("Chagua kiongozi kwa PDF ya uongozi.");
    return buildLeadershipMasterPdf(leadershipInput);
  }
  const hierarchyScope = hierarchyKindToScope(kind);
  if (hierarchyScope) return buildHierarchyMasterPdf(hierarchyScope);
  if (kind === "membership") return buildMembershipMasterPdf(scope);
  if (kind === "finance") return buildFinanceMasterPdf(scope);
  if (kind === "projects") return buildProjectsMasterPdf(scope);
  throw new Error(`Aina ya ripoti haijulikani: ${kind}`);
}

/** Ripoti fupi ya muhtasari — jedwali la ngazi (kwa chapisho). */
export function buildNgaziSummaryTablePdf(
  rows: { label: string; value: string }[],
  meta: MasterPdfMeta,
): import("jspdf").jsPDF {
  const doc = createMasterPdfDocument();
  drawMasterWatermark(doc, normalizePdfReadableText(meta.titleEn));
  const y = drawMasterInstitutionalHeader(doc, meta);
  autoTable(doc, {
    startY: y,
    head: [["Kipengele / Field", "Thamani / Value"]],
    body: rows.map((r) => [r.label, r.value]),
    theme: "grid",
    styles: {
      fontSize: 9,
      halign: "center",
      cellPadding: 3,
      lineColor: KMKT_NAVY,
      lineWidth: 0.4,
    },
    headStyles: { fillColor: KMKT_NAVY, textColor: [255, 255, 255], fontStyle: "bold" },
    margin: { left: MASTER_PDF.margin, right: MASTER_PDF.margin, bottom: MASTER_PDF.footerReserve },
  });
  return doc;
}
