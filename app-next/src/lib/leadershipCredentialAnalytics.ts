import type { LeadershipCredentialAutoFill } from "./certificateEngine/autoFill";
import { resolveHierarchyLevelFromLeader } from "./certificateEngine/resolveLevel";
import type { LeadershipHierarchyLevel } from "./certificateEngine/types";
import type { OfficialCertificateRow, OfficialCertificateStatus } from "../services/leadershipOfficialCertificateService";
import type { KiongoziRecord } from "../types";

export type HierarchyLeadershipCounts = Record<LeadershipHierarchyLevel, number>;

export type LeadershipCredentialHubStats = {
  totalLeaders: number;
  byLevel: HierarchyLeadershipCounts;
  avgFillPercent: number;
  withPhoto: number;
  withCv: number;
  officialCertsTotal: number;
  certsByStatus: Partial<Record<OfficialCertificateStatus, number>>;
  pendingApprovals: number;
  approvedCerts: number;
};

export type ServiceDurationBucket = { label: string; count: number };

export type EducationKindStat = { kind: string; label: string; count: number };

export type LeadershipGrowthPoint = { label: string; value: number; max: number };

export function countLeadersByHierarchy(viongozi: KiongoziRecord[]): HierarchyLeadershipCounts {
  const out: HierarchyLeadershipCounts = {
    national: 0,
    dayosisi: 0,
    jimbo: 0,
    tawi: 0,
    other: 0,
  };
  for (const v of viongozi) {
    const level = resolveHierarchyLevelFromLeader(v);
    out[level] = (out[level] ?? 0) + 1;
  }
  return out;
}

export function computeHubStats(
  viongozi: KiongoziRecord[],
  nationalCount: number,
  officialCerts: OfficialCertificateRow[],
  autoFillSamples: LeadershipCredentialAutoFill[],
): LeadershipCredentialHubStats {
  const byLevel = countLeadersByHierarchy(viongozi);
  byLevel.national += nationalCount;

  const certsByStatus: Partial<Record<OfficialCertificateStatus, number>> = {};
  for (const c of officialCerts) {
    certsByStatus[c.status] = (certsByStatus[c.status] ?? 0) + 1;
  }

  const fillPercents = autoFillSamples.map((a) => a.fillPercent).filter((n) => Number.isFinite(n));
  const avgFillPercent = fillPercents.length
    ? Math.round(fillPercents.reduce((a, b) => a + b, 0) / fillPercents.length)
    : 0;

  let withPhoto = 0;
  let withCv = 0;
  for (const a of autoFillSamples) {
    if (a.photoUrl || a.photoDataUrl) withPhoto += 1;
    if (a.cvBundle?.education?.length || a.cvBundle?.experience?.length) withCv += 1;
  }

  return {
    totalLeaders: viongozi.length + nationalCount,
    byLevel,
    avgFillPercent,
    withPhoto,
    withCv,
    officialCertsTotal: officialCerts.length,
    certsByStatus,
    pendingApprovals: certsByStatus.pending ?? 0,
    approvedCerts: (certsByStatus.approved ?? 0) + (certsByStatus.verified ?? 0),
  };
}

export function serviceDurationBuckets(autoFill: LeadershipCredentialAutoFill | null): ServiceDurationBucket[] {
  if (!autoFill?.cvBundle?.experience?.length) {
    const years = autoFill?.fields?.yearsInMinistry?.value ?? autoFill?.fields?.yearsInPosition?.value;
    const n = typeof years === "number" ? years : Number(years);
    if (Number.isFinite(n) && n > 0) {
      return [{ label: "Uzoefu ulioripotiwa", count: Math.round(n) }];
    }
    return [{ label: "Hakuna data", count: 0 }];
  }
  const buckets = new Map<string, number>();
  for (const ex of autoFill.cvBundle.experience) {
    const start = Number(ex.start_year) || 0;
    const end = ex.end_year != null ? Number(ex.end_year) : new Date().getFullYear();
    const span = Math.max(0, end - start);
    const key = span >= 15 ? "15+ miaka" : span >= 10 ? "10–14 miaka" : span >= 5 ? "5–9 miaka" : "Chini ya miaka 5";
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([label, count]) => ({ label, count }));
}

const EDU_LABELS: Record<string, string> = {
  primary: "Msingi",
  secondary: "Sekondari",
  certificate: "Cheti",
  diploma: "Stashahada",
  degree: "Shahada",
  masters: "Uzamili",
  doctorate: "Uzamivu",
  other: "Nyingine",
};

export function educationKindStats(autoFill: LeadershipCredentialAutoFill | null): EducationKindStat[] {
  const rows = autoFill?.cvBundle?.education ?? [];
  if (!rows.length) return [{ kind: "none", label: "Hakuna rekodi", count: 0 }];
  const map = new Map<string, number>();
  for (const e of rows) {
    const k = String(e.education_kind ?? "other").trim() || "other";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([kind, count]) => ({ kind, label: EDU_LABELS[kind] ?? kind, count }))
    .sort((a, b) => b.count - a.count);
}

export function leadershipGrowthMetrics(
  stats: LeadershipCredentialHubStats,
  autoFill: LeadershipCredentialAutoFill | null,
): LeadershipGrowthPoint[] {
  const fill = autoFill?.fillPercent ?? stats.avgFillPercent;
  const edu = autoFill?.cvBundle?.education?.length ?? 0;
  const exp = autoFill?.cvBundle?.experience?.length ?? 0;
  const max = 100;
  return [
    { label: "Ukamilifu wa wasifu", value: fill, max },
    { label: "Vyeti vilivyoidhinishwa", value: Math.min(stats.approvedCerts * 10, max), max },
    { label: "Elimu (rekodi)", value: Math.min(edu * 20, max), max },
    { label: "Uzoefu (rekodi)", value: Math.min(exp * 15, max), max },
  ];
}
