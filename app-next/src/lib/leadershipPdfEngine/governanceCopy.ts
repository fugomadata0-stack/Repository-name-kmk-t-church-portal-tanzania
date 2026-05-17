import type { AdvancedLeadershipPdfKind } from "./types";
import { KMKT_OFFICIAL_NAME, KMKT_SHORT_NAME } from "../../data/kmktCanonicalContent";
import { getDocumentCopy } from "./documentCopy";

export type GovernanceExplainer = {
  documentPurposeSw: string;
  documentPurposeEn: string;
  levelExplainerSw: string;
  levelExplainerEn: string;
  approvalAuthoritySw: string;
  approvalAuthorityEn: string;
  hierarchyChain: string;
};

const KMK_HIERARCHY_CHAIN = "Tawi / Kituo → Jimbo → Dayosisi → KMK(T) Kitaifa";

function resolveLevelKey(cheo?: string, leadershipLevel?: string): string {
  const hay = `${cheo ?? ""} ${leadershipLevel ?? ""}`.toLowerCase();
  if (/askofu\s+mkuu|katibu\s+mkuu|mhasibu|kitaifa|national/i.test(hay)) return "national";
  if (/askofu|dayosisi|diocese/i.test(hay)) return "dayosisi";
  if (/mkuu\s+wa\s+jimbo|jimbo|mchungaji|shemasi/i.test(hay)) return "jimbo";
  if (/tawi|kituo|mwongozi\s+wa\s+tawi/i.test(hay)) return "tawi";
  return "general";
}

const LEVEL_SW: Record<string, string> = {
  tawi: "Ngazi ya Tawi / Kituo — uongozi wa shamba la kanisa ndani ya jimbo.",
  jimbo: "Ngazi ya Jimbo — uongozi wa mkoa wa kanisa (majimbo) chini ya dayosisi.",
  dayosisi: "Ngazi ya Dayosisi — uongozi wa eneo la kanisa lenye mamlaka ya askofu.",
  national: "Ngazi ya KMK(T) Kitaifa — uongozi wa Kanisa lote Tanzania (mamlaka ya juu).",
  general: "Muundo wa KMK(T) — ngazi zinazounganisha tawi, jimbo, dayosisi na taasisi ya kitaifa.",
};

const LEVEL_EN: Record<string, string> = {
  tawi: "Branch / Outstation level leadership within the regional church structure.",
  jimbo: "Regional (Jimbo) level — pastoral oversight under the diocese.",
  dayosisi: "Diocesan level — bishop-led regional church authority.",
  national: "KMK(T) National level — presiding and general church executive authority.",
  general: "KMK(T) hierarchy linking branch, region, diocese and national offices.",
};

const APPROVAL_SW: Record<string, string> = {
  tawi: "Idhini: Mkuu wa Jimbo / Katibu wa Jimbo na usajili wa Dayosisi.",
  jimbo: "Idhini: Askofu wa Dayosisi / Makamu Mwenyekiti na Katibu wa Dayosisi.",
  dayosisi: "Idhini: Askofu Mkuu / Katibu Mkuu KMK(T) na Baraza la Kanisa.",
  national: "Idhini: Baraza Kuu la KMK(T), Askofu Mkuu na Katibu Mkuu (mamlaka ya juu).",
  general: "Idhini: Mamlaka iliyoteuliwa chini ya katiba na taratibu za KMK(T).",
};

const APPROVAL_EN: Record<string, string> = {
  tawi: "Approved by Regional Head / Secretary with diocesan registry.",
  jimbo: "Approved by Diocesan Bishop / Vice Chair and Diocesan Secretary.",
  dayosisi: "Approved by Presiding Bishop / General Secretary and Church Council.",
  national: "Approved by KMK(T) General Conference authority and national officers.",
  general: "Approved under KMK(T) constitution and designated church authority.",
};

export function buildGovernanceExplainer(opts: {
  kind: AdvancedLeadershipPdfKind;
  hierarchy: string;
  cheo?: string;
  leadershipLevel?: string;
  hierarchyLevelKey?: string;
  approverTitle?: string;
}): GovernanceExplainer {
  const copy = getDocumentCopy(opts.kind);
  const levelKey =
    opts.hierarchyLevelKey?.trim() ||
    resolveLevelKey(opts.cheo, opts.leadershipLevel);
  const hierarchy = opts.hierarchy.trim() || "KMK(T)";
  const approver = opts.approverTitle?.trim();

  const purposeSw = `${copy.certTitleSw}: hati rasmi ya ${KMKT_SHORT_NAME} inayothibitisha taarifa za uongozi, uteuzi na uhakiki wa umma kwa QR.`;
  const purposeEn = `${copy.certTitleEn}: official ${KMKT_SHORT_NAME} record with public QR verification.`;

  let approvalSw = APPROVAL_SW[levelKey] ?? APPROVAL_SW.general;
  let approvalEn = APPROVAL_EN[levelKey] ?? APPROVAL_EN.general;
  if (approver) {
    approvalSw += ` Mhakiki: ${approver}.`;
    approvalEn += ` Officer: ${approver}.`;
  }

  return {
    documentPurposeSw: purposeSw,
    documentPurposeEn: purposeEn,
    levelExplainerSw: `${LEVEL_SW[levelKey]} Eneo: ${hierarchy}.`,
    levelExplainerEn: `${LEVEL_EN[levelKey]} Scope: ${hierarchy}.`,
    approvalAuthoritySw: approvalSw,
    approvalAuthorityEn: approvalEn,
    hierarchyChain: KMK_HIERARCHY_CHAIN,
  };
}

export function governanceFooterAuthorityLine(explainer: GovernanceExplainer): string {
  return `${KMKT_OFFICIAL_NAME} · ${explainer.hierarchyChain}`;
}
