import type { DashboardKpiSnapshot } from "../../services/dashboardKpiAggregatesService";

/** Fingerprint ya thamani za KPI — epuka re-render wakati object reference inabadilika tu. */
export function dashboardKpiFingerprint(kpi: DashboardKpiSnapshot | null | undefined): string {
  if (!kpi) return "";
  return [
    kpi.dayosisiCount,
    kpi.majimboCount,
    kpi.matawiCount,
    kpi.matawiActiveCount,
    kpi.viongoziCount,
    kpi.viongoziActiveCount,
    kpi.mapatoLeoTotal,
    kpi.mapatoWikiTotal,
    kpi.mapatoMweziTotal,
    kpi.matumiziFedhaMwezi,
    kpi.pendingRecordsCrossModule,
    kpi.attendanceMonthCount,
    kpi.attendanceWeekCount,
    kpi.attendanceTodayCount,
    kpi.pendingVerificationCount,
    kpi.growthVsLastMonthPercent,
    kpi.restrictedFundBalance,
    kpi.unpostedCollectionsCount,
    kpi.matawiRegistryPendingReviewCount,
    Object.keys(kpi.failedKpis ?? {}).length,
  ].join("|");
}
