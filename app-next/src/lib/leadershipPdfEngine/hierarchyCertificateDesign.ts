/**
 * Hierarchy-distinct leadership certificate presentation — Tawi / Jimbo / Dayosisi / KMK(T).
 */
import type { LeadershipHierarchyLevel } from "../certificateEngine/types";
import { resolveHierarchyLevelFromLeader } from "../certificateEngine/resolveLevel";
import type { KiongoziRecord } from "../../types";
import {
  resolveLeadershipCertificateTheme,
  type LeadershipCertificateTheme,
} from "../leadershipCertificateTheme";
import { getDocumentCopy, type DocumentCopy } from "./documentCopy";
import type { AdvancedLeadershipPdfKind } from "./types";

export type CertificateHierarchyLevel = "tawi" | "jimbo" | "dayosisi" | "national";

export type HierarchyCertificatePresentation = {
  level: CertificateHierarchyLevel;
  certTitleSw: string;
  certTitleEn: string;
  watermarkLine2: string;
  levelRibbon: string;
  localSealText: string | null;
  nationalSealText: string;
  theme: LeadershipCertificateTheme;
};

const LEVEL_META: Record<
  CertificateHierarchyLevel,
  {
    certTitleSw: string;
    certTitleEn: string;
    watermarkLine2: string;
    levelRibbon: string;
    localSealText: string | null;
    nationalSealText: string;
  }
> = {
  tawi: {
    certTitleSw: "CHETI CHA UONGOZI WA TAWI",
    certTitleEn: "Branch Leadership Certificate",
    watermarkLine2: "UONGOZI WA TAWI · KMK(T)",
    levelRibbon: "Ngazi ya Tawi / Kituo · Mamlaka ya Jimbo",
    localSealText: "MUHURI WA TAWI",
    nationalSealText: "KMK(T) · THIBITISHO",
  },
  jimbo: {
    certTitleSw: "CHETI CHA UONGOZI WA JIMBO",
    certTitleEn: "Regional (Jimbo) Leadership Certificate",
    watermarkLine2: "UONGOZI WA JIMBO · KMK(T)",
    levelRibbon: "Ngazi ya Jimbo · Mamlaka ya Dayosisi",
    localSealText: "MUHURI WA JIMBO",
    nationalSealText: "KMK(T) · THIBITISHO",
  },
  dayosisi: {
    certTitleSw: "CHETI CHA UONGOZI WA DAYOSISI",
    certTitleEn: "Diocesan Leadership Certificate",
    watermarkLine2: "UONGOZI WA DAYOSISI · KMK(T)",
    levelRibbon: "Ngazi ya Dayosisi · Mamlaka ya Kitaifa",
    localSealText: "MUHURI WA DAYOSISI",
    nationalSealText: "KMK(T) · THIBITISHO",
  },
  national: {
    certTitleSw: "CHETI CHA UONGOZI WA NGAZI KUU",
    certTitleEn: "National Executive Leadership Certificate",
    watermarkLine2: "NGAZI KUU · KMK(T) TANZANIA",
    levelRibbon: "Uongozi wa Kitaifa · Kanisa la Mennonite la Kiinjili Tanzania",
    localSealText: null,
    nationalSealText: "KMK(T) · NGAZI KUU",
  },
};

function norm(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function inferLevelFromText(cheo?: string | null, leadershipLevel?: string | null, roleKey?: string | null): CertificateHierarchyLevel | null {
  const blob = norm(`${roleKey ?? ""} ${cheo ?? ""} ${leadershipLevel ?? ""}`);
  if (/askofu\s+mkuu|katibu\s+mkuu|mhasibu|kitaifa|national|ngazi\s+kuu/.test(blob)) return "national";
  if (/dayosisi|diocese|askofu/.test(blob)) return "dayosisi";
  if (/jimbo|mkuu\s+wa\s+jimbo|mchungaji\s+mkuu|shemasi/.test(blob)) return "jimbo";
  if (/tawi|kituo|mwongozi\s+wa\s+tawi/.test(blob)) return "tawi";
  return null;
}

export function mapHierarchyLevelToCertificate(
  level: LeadershipHierarchyLevel | null | undefined,
): CertificateHierarchyLevel {
  if (level === "national") return "national";
  if (level === "dayosisi") return "dayosisi";
  if (level === "jimbo") return "jimbo";
  if (level === "tawi") return "tawi";
  return "tawi";
}

export function resolveCertificateHierarchyLevel(input: {
  isNationalLeadership?: boolean;
  hierarchyLevel?: LeadershipHierarchyLevel | null;
  leader?: KiongoziRecord | null;
  cheo?: string | null;
  leadershipLevel?: string | null;
  roleKey?: string | null;
}): CertificateHierarchyLevel {
  if (input.isNationalLeadership) return "national";
  if (input.hierarchyLevel && input.hierarchyLevel !== "other") {
    return mapHierarchyLevelToCertificate(input.hierarchyLevel);
  }
  if (input.leader) {
    const fromLeader = resolveHierarchyLevelFromLeader(input.leader);
    if (fromLeader !== "other") return mapHierarchyLevelToCertificate(fromLeader);
  }
  const inferred = inferLevelFromText(input.cheo, input.leadershipLevel, input.roleKey);
  if (inferred) return inferred;
  return "tawi";
}

function themeForLevel(level: CertificateHierarchyLevel): LeadershipCertificateTheme {
  return resolveLeadershipCertificateTheme({
    hierarchyLevel: level,
    roleKey: level === "national" ? "askofu_mkuu" : null,
    leadershipLevel: level,
  });
}

const HIERARCHY_TITLE_KINDS: AdvancedLeadershipPdfKind[] = [
  "leadership_certificate",
  "executive_bishop_certificate",
];

function usesHierarchyTitles(kind: AdvancedLeadershipPdfKind): boolean {
  return HIERARCHY_TITLE_KINDS.includes(kind);
}

export function buildHierarchyCertificatePresentation(opts: {
  kind: AdvancedLeadershipPdfKind;
  level: CertificateHierarchyLevel;
  baseCopy?: DocumentCopy;
}): HierarchyCertificatePresentation & { copy: DocumentCopy } {
  const meta = LEVEL_META[opts.level];
  const base = opts.baseCopy ?? getDocumentCopy(opts.kind);
  const theme = themeForLevel(opts.level);
  const applyTitles = usesHierarchyTitles(opts.kind);
  const levelForTitles = opts.kind === "executive_bishop_certificate" ? "national" : opts.level;
  const titleMeta = LEVEL_META[levelForTitles];

  const copy: DocumentCopy = {
    ...base,
    certTitleSw: applyTitles ? titleMeta.certTitleSw : base.certTitleSw,
    certTitleEn: applyTitles ? titleMeta.certTitleEn : base.certTitleEn,
    watermarkLine2: applyTitles ? titleMeta.watermarkLine2 : base.watermarkLine2,
    sealText: applyTitles ? titleMeta.nationalSealText : base.sealText,
  };

  return {
    level: opts.level,
    certTitleSw: copy.certTitleSw,
    certTitleEn: copy.certTitleEn,
    watermarkLine2: copy.watermarkLine2,
    levelRibbon: meta.levelRibbon,
    localSealText: applyTitles ? meta.localSealText : null,
    nationalSealText: titleMeta.nationalSealText,
    theme,
    copy,
  };
}

export function hierarchyPresentationForLeader(
  leader: KiongoziRecord,
  kind: AdvancedLeadershipPdfKind,
): HierarchyCertificatePresentation & { copy: DocumentCopy } {
  const level = resolveCertificateHierarchyLevel({ leader });
  return buildHierarchyCertificatePresentation({ kind, level });
}

export function hierarchyPresentationForNational(
  kind: AdvancedLeadershipPdfKind,
  roleKey?: string | null,
): HierarchyCertificatePresentation & { copy: DocumentCopy } {
  const level = resolveCertificateHierarchyLevel({ isNationalLeadership: true, roleKey });
  return buildHierarchyCertificatePresentation({ kind, level });
}

export function hierarchyPreviewTitles(input: {
  documentKind?: "certificate" | "cv";
  kind?: AdvancedLeadershipPdfKind;
  level: CertificateHierarchyLevel;
}): { certTitleSw: string; certTitleEn: string; watermarkLine2: string; localSealText: string | null } {
  if (input.documentKind === "cv") {
    return {
      certTitleSw: "WASIFU RASMI WA KIONGOZI",
      certTitleEn: "Executive Leadership Profile",
      watermarkLine2: "WASIFU · DATA LIVE",
      localSealText: null,
    };
  }
  const pres = buildHierarchyCertificatePresentation({
    kind: input.kind ?? "leadership_certificate",
    level: input.level,
  });
  return {
    certTitleSw: pres.certTitleSw,
    certTitleEn: pres.certTitleEn,
    watermarkLine2: pres.watermarkLine2,
    localSealText: pres.localSealText,
  };
}
