export type {
  BuiltMasterPdf,
  BuildMasterLeadershipInput,
  MasterHierarchyReportKind,
  MasterPdfMeta,
  MasterPdfScope,
  MasterReportCategory,
  MasterReportKind,
} from "./types";

export {
  applyMasterChromeToAllPages,
  createMasterPdfDocument,
  drawMasterDoubleBorderFrame,
  drawMasterFooterBlock,
  drawMasterInstitutionalHeader,
  drawMasterVerticalRails,
  drawMasterWatermark,
  ensureMasterPageSpace,
  MASTER_PDF,
  scopeLabelSw,
} from "./layout";

export { buildMasterQrDataUrl, fetchMasterQrImage } from "./qr";

export {
  buildFinanceMasterPdf,
  buildHierarchyMasterPdf,
  buildLeadershipMasterPdf,
  buildMasterReport,
  buildMembershipMasterPdf,
  buildNgaziSummaryTablePdf,
  buildProjectsMasterPdf,
  hierarchyKindToScope,
} from "./buildReports";

export type { BuiltLeadershipPdf, AdvancedLeadershipPdfInput, AdvancedLeadershipPdfKind } from "../leadershipPdfEngine/types";
export {
  ADVANCED_PDF_KINDS,
  ADVANCED_PDF_LABELS,
  buildAdvancedLeadershipPdf,
  downloadAdvancedLeadershipPdf,
} from "../leadershipPdfEngine";
export {
  buildGovernanceExplainer,
  governanceFooterAuthorityLine,
  type GovernanceExplainer,
} from "../leadershipPdfEngine/governanceCopy";
export {
  downloadLeadershipPdf,
  printLeadershipPdf,
  shareLeadershipPdf,
  downloadLeadershipPdfHiRes,
  openLeadershipPdfPreview,
  printHtmlMasterPreview,
  leadershipPdfBlobUrl,
  revokePdfBlobUrl,
} from "../leadershipPdfEngine/exportActions";
export { KMK_PREMIUM_HEX, PREMIUM_PREVIEW_CSS, PREMIUM_A4 } from "../leadershipPdfEngine/premiumDesignSystem";
