/**
 * Tukio la kusawazisha KPI za dashibodi na data ya AppLayout baada ya CRUD —
 * kinasukuma reload iliyopunguzwa (debounce ~380ms katika AppLayout).
 */
export const KMT_PORTAL_RELOAD_METRICS_EVENT = "kmt-portal-reload-metrics" as const;

export function dispatchPortalReloadMetrics(): void {
  window.dispatchEvent(new CustomEvent(KMT_PORTAL_RELOAD_METRICS_EVENT));
}
