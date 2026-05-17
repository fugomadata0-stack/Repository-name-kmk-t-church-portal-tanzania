/**
 * Cache ya boot baada ya login — epuka duplicate RPC/counts kwa dakika fupi.
 */
import {
  emptyDashboardKpiSnapshot,
  fetchDashboardKpiBootSnapshot,
  type DashboardKpiSnapshot,
} from "../services/dashboardKpiAggregatesService";
import { dedupeInFlight } from "./inFlightDedupe";
import { PORTAL_LOAD_TIMEOUTS } from "./portalLoadTimeouts";
import { withTimeout } from "./asyncTimeout";
import { fetchWauminiCountsStrict } from "../services/wauminiService";

const BOOT_KPI_KEY = "portal:boot-kpi-snapshot";
const TTL_MS = 60_000;

type WauminiPack = {
  families: number;
  members: number;
  activeMembers: number;
  baptized: number;
};

let kpiCache: { at: number; snap: DashboardKpiSnapshot } | null = null;
let wauminiCache: { at: number; pack: WauminiPack } | null = null;

export function invalidatePortalBootCache(): void {
  kpiCache = null;
  wauminiCache = null;
}

export async function fetchDashboardBootBundle(alignPublicRpc: boolean): Promise<{
  kpi: DashboardKpiSnapshot;
  waumini: WauminiPack;
}> {
  const cacheKey = `${BOOT_KPI_KEY}:${alignPublicRpc}`;
  const now = Date.now();
  if (
    kpiCache &&
    wauminiCache &&
    now - kpiCache.at < TTL_MS &&
    now - wauminiCache.at < TTL_MS
  ) {
    return { kpi: kpiCache.snap, waumini: wauminiCache.pack };
  }

  return dedupeInFlight(
    cacheKey,
    async () => {
    const [kpiSettled, wauminiSettled] = await Promise.allSettled([
      withTimeout(
        fetchDashboardKpiBootSnapshot({ alignCoreCountsWithPublicRpc: alignPublicRpc }),
        PORTAL_LOAD_TIMEOUTS.bootKpiMs,
        "boot-kpi",
      ),
      withTimeout(fetchWauminiCountsStrict(), PORTAL_LOAD_TIMEOUTS.bootKpiMs, "boot-waumini"),
    ]);
    const kpi =
      kpiSettled.status === "fulfilled"
        ? kpiSettled.value
        : (kpiCache?.snap ?? emptyDashboardKpiSnapshot());
    const waumini =
      wauminiSettled.status === "fulfilled"
        ? wauminiSettled.value
        : wauminiCache?.pack ?? { families: 0, members: 0, activeMembers: 0, baptized: 0 };
    kpiCache = { at: Date.now(), snap: kpi };
    wauminiCache = { at: Date.now(), pack: waumini };
    return { kpi, waumini };
    },
    { timeoutMs: PORTAL_LOAD_TIMEOUTS.bootKpiMs + 1500 },
  );
}
