/**
 * Tukio la kusawazisha KPI za dashibodi na data ya AppLayout baada ya CRUD —
 * kwa kawaida kinasukuma reload iliyopunguzwa (debounce ~380ms katika AppLayout).
 * Tumia `{ immediate: true }` baada ya futa ili hesabu zipungue mara moja (si archive).
 */
export const KMT_PORTAL_RELOAD_METRICS_EVENT = "kmt-portal-reload-metrics" as const;

export type PortalReloadMetricsDetail = {
  /** Punguza au ondoa debounce — muhimu baada ya DELETE ili dashibodi zisasishwe mara moja */
  immediate?: boolean;
};

export function dispatchPortalReloadMetrics(detail?: PortalReloadMetricsDetail): void {
  window.dispatchEvent(new CustomEvent(KMT_PORTAL_RELOAD_METRICS_EVENT, { detail: detail ?? {} }));
}

/** Baada ya kusasisha cache ya portal_master_settings / theme / templates (Realtime au save). */
export const KMT_MASTER_SETTINGS_UPDATED_EVENT = "kmt-master-settings-updated" as const;

export function dispatchMasterSettingsUpdated(): void {
  window.dispatchEvent(new CustomEvent(KMT_MASTER_SETTINGS_UPDATED_EVENT));
}
