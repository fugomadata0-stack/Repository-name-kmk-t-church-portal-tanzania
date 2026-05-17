import type { jsPDF } from "jspdf";
import type { Phase1Scope } from "../../services/phase1FoundationService";
import type { AdvancedLeadershipPdfInput } from "../leadershipPdfEngine/types";

export type MasterPdfScope = Phase1Scope;

export type MasterReportCategory =
  | "hierarchy"
  | "membership"
  | "finance"
  | "projects"
  | "leadership";

export type MasterHierarchyReportKind = "tawi" | "jimbo" | "dayosisi" | "kmkt";

export type MasterReportKind =
  | MasterHierarchyReportKind
  | "membership"
  | "finance"
  | "projects"
  | "leadership";

export type MasterPdfMeta = {
  titleSw: string;
  titleEn: string;
  aboutSw: string;
  aboutEn: string;
  scope: MasterPdfScope;
  scopeLabel: string;
  periodStart?: string;
  periodEnd?: string;
  hierarchyFlow?: string;
  approvals?: string;
  documentId?: string;
  verifyUrl?: string;
  logoDataUrl?: string | null;
};

export type BuiltMasterPdf = {
  doc: jsPDF;
  filename: string;
  verifyUrl: string;
  displaySerial: string;
};

export type BuildMasterLeadershipInput = AdvancedLeadershipPdfInput;
