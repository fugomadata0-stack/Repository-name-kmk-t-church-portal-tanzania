import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { modules } from "../../data/portalModules";
import type { DayosisiRecord, FedhaRecord, IncomeManagementRecord, IncomeSourceRecord, JimboRecord, KiongoziRecord, TawiRecord } from "../../types";
import { usePortal } from "../../context/PortalContext";
import { NoModuleAccessNotice } from "../auth/NoModuleAccessNotice";
import { getSupabase, isSupabaseRealtimeEnabled } from "../../lib/supabaseClient";
import { useSiteDocumentMeta } from "../../hooks/useSiteDocumentMeta";
import { fetchAuditLogCount } from "../../services/auditLogService";
import { fetchPortalSecurityCountsStrict } from "../../services/securityService";
import { fetchWauminiCountsStrict } from "../../services/wauminiService";
import { fetchDashboardBootBundle } from "../../lib/portalBootCache";
import { AsyncTimeoutError, withTimeout } from "../../lib/asyncTimeout";
import { PORTAL_LOAD_TIMEOUTS } from "../../lib/portalLoadTimeouts";
import { PORTAL_SLOW_NETWORK_SW } from "../../lib/supabaseUiMessages";
import { useBoundedLoading } from "../../hooks/useBoundedLoading";
import { fetchDayosisi } from "../../services/dayosisiService";
import { fetchChurchFinanceEntries } from "../../services/financeEntriesService";
import { fetchChurchIncomeLines, fetchChurchIncomeSources } from "../../services/incomeModuleService";
import { fetchChurchJimbo, fetchChurchTawi } from "../../services/muundoHierarchyService";
import { fetchChurchViongozi } from "../../services/viongoziService";
import { refreshMasterSettingsCache } from "../../services/masterSettingsService";
import {
  emptyDashboardKpiSnapshot,
  fetchDashboardKpiAggregates,
  type DashboardKpiSnapshot,
} from "../../services/dashboardKpiAggregatesService";
import { dedupeInFlight } from "../../lib/inFlightDedupe";
import { repairAllLegacyStructureLinks } from "../../lib/legacyStructureMirror";
import { isAbortLikeError } from "../../lib/supabaseErrors";
import { DASHBOARD_KPI_LOAD_ERROR_SW } from "../../lib/supabaseUiMessages";
import { dispatchPortalReloadMetrics, KMT_PORTAL_RELOAD_METRICS_EVENT } from "../../lib/portalEvents";
import { coalesceRealtimeCallback } from "../../lib/portalHardening/realtimeCoalesce";
import { PORTAL_DASHBOARD_REALTIME_TABLES } from "../../lib/portalDashboardRealtimeTables";
import { roleBypassesGeoScope } from "../../utils/scopeAccess";
import { logRbacDenied } from "../../services/enterpriseSecurityService";
import { readPortalUiSnapshot, writePortalUiSnapshot } from "../../lib/portalUiPersistence";
import {
  buildBranchEnginePortalUrl,
  PORTAL_HOME_AFTER_LOGIN,
  shouldOpenBranchEngineAsPortalHome,
} from "../../lib/branchEnginePortalUrl";
import { isPortalBranchEngineSurface } from "../../lib/branchEngineRoute";
import { getPortalLayoutMode, shouldHidePortalProjectRibbon } from "../../lib/portalLayoutMode";
import { InternalDashboardRouter } from "../dashboard/InternalDashboardRouter";
import {
  coerceSubmoduleForModule,
  DASHBOARD_COMMAND_CENTER_SUBMODULE,
  DASHBOARD_PENDING_APPROVALS_SUBMODULE,
  getDashboardDefaultSubmodule,
  getFirstSubmoduleForModule,
  normalizeDashboardSubmodule,
} from "../../lib/dashboardSubmodules";
import {
  clearPortalDraft,
  confirmPortalDraftNavigation,
  PORTAL_DRAFT_EVENT_CLEAR_CURRENT,
  PORTAL_DRAFT_EVENT_FLUSH,
  type PortalDraftScope,
} from "../../lib/portalDraftRecovery";
import { ErrorBoundary } from "../common/ErrorBoundary";
import { PortalBootShell, PortalPanelSkeleton } from "../common/PortalSkeleton";
import { CookieConsentBanner } from "./CookieConsentBanner";
import { MaintenanceBanner } from "./MaintenanceBanner";
import { PortalAutoDraftRecovery } from "../draft/PortalAutoDraftRecovery";
import { SiteFooter } from "./SiteFooter";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ExecutiveMenuBar } from "../executive/ExecutiveMenuBar";
import { PortalChromeHeader } from "./PortalChromeHeader";
import { useThrottledElementScroll } from "../../hooks/useThrottledElementScroll";
import { PortalProjectNotesRibbon } from "./PortalProjectNotesRibbon";
const ModulePage = lazy(async () => {
  const m = await import("../../pages/ModulePage");
  return { default: m.ModulePage };
});

function ModuleLoadingFallback() {
  return <PortalPanelSkeleton rows={5} />;
}

export function AppLayout() {
  const {
    pushToast,
    reportError,
    site,
    about,
    canPortalViewModule,
    noModuleRbac,
    authInitialized,
    authUser,
    role,
    rbacLoading,
    portalProfile,
  } = usePortal();
  useSiteDocumentMeta(site);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const snap = typeof window !== "undefined" ? readPortalUiSnapshot(authUser?.id) : null;
    if (typeof snap?.sidebarCollapsed === "boolean") return snap.sidebarCollapsed;
    return Boolean(authUser);
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const snap = typeof window !== "undefined" ? readPortalUiSnapshot(authUser?.id) : null;
    if (snap?.expanded && Object.keys(snap.expanded).length > 0) return snap.expanded;
    return Object.fromEntries(
      modules.map((m) => [m.key, m.key === "dashboard" || m.key === PORTAL_HOME_AFTER_LOGIN.moduleKey]),
    );
  });
  const [activeModule, setActiveModule] = useState(() => {
    if (typeof window === "undefined") return PORTAL_HOME_AFTER_LOGIN.moduleKey;
    const params = new URLSearchParams(window.location.search);
    const urlMk = params.get("module")?.trim();
    if (urlMk) return urlMk;
    if (shouldOpenBranchEngineAsPortalHome(params.toString())) return PORTAL_HOME_AFTER_LOGIN.moduleKey;
    const snap = readPortalUiSnapshot(authUser?.id);
    if (snap?.activeModule) return snap.activeModule;
    return PORTAL_HOME_AFTER_LOGIN.moduleKey;
  });
  const [activeSubmodule, setActiveSubmodule] = useState(() => {
    if (typeof window === "undefined") return PORTAL_HOME_AFTER_LOGIN.submodule;
    const params = new URLSearchParams(window.location.search);
    const urlMk = params.get("module")?.trim();
    const urlSub = params.get("submodule")?.trim();
    if (urlMk) return coerceSubmoduleForModule(urlMk, urlSub);
    if (shouldOpenBranchEngineAsPortalHome(params.toString())) {
      return PORTAL_HOME_AFTER_LOGIN.submodule;
    }
    const snap = readPortalUiSnapshot(authUser?.id);
    if (snap?.activeModule) {
      return coerceSubmoduleForModule(snap.activeModule, snap.activeSubmodule ?? undefined);
    }
    return PORTAL_HOME_AFTER_LOGIN.submodule;
  });
  const [highlightRecordId, setHighlightRecordId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("recordId")?.trim() || null;
  });
  const [branchEngineModuleId, setBranchEngineModuleId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("engineModuleId")?.trim() || null;
  });

  const [dayosisi, setDayosisi] = useState<DayosisiRecord[]>([]);
  const [majimbo, setMajimbo] = useState<JimboRecord[]>([]);
  const [matawi, setMatawi] = useState<TawiRecord[]>([]);
  const [viongozi, setViongozi] = useState<KiongoziRecord[]>([]);
  const [fedha, setFedha] = useState<FedhaRecord[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSourceRecord[]>([]);
  const [incomeManagement, setIncomeManagement] = useState<IncomeManagementRecord[]>([]);
  const [kpiLive, setKpiLive] = useState<DashboardKpiSnapshot>(() => emptyDashboardKpiSnapshot());
  const [wauminiCounts, setWauminiCounts] = useState({
    families: 0,
    members: 0,
    activeMembers: 0,
    baptized: 0,
  });
  const [kpiRefreshing, setKpiRefreshing] = useState(false);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const kpiErrorToastRef = useRef<string | null>(null);
  const kpiRefreshGuardRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showRbacBootShell = useBoundedLoading(rbacLoading, PORTAL_LOAD_TIMEOUTS.rbacUiCapMs);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    if (!kpiError || kpiError === kpiErrorToastRef.current) return;
    kpiErrorToastRef.current = kpiError;
    pushToast(kpiError, "error");
  }, [kpiError, pushToast]);

  /** Muda wa mwisho wa kuwa nyuma ya tab (kupima kurudi); si tokeni. */
  const hiddenAtRef = useRef<number | null>(null);
  /** Nusu sekunde za mwisho za kuwa nyuma — kusawazisha vipima baada ya kurudi. */
  const lastResumeHiddenMsRef = useRef(0);
  const lastDashboardMetricsAtRef = useRef(0);
  const legacyStructureRepairRef = useRef(false);
  const fullMetricsScheduledRef = useRef(false);
  const activeModuleRef = useRef(activeModule);
  activeModuleRef.current = activeModule;
  const [branchEngineMountEnabled, setBranchEngineMountEnabled] = useState(false);
  const lastIncomeDataAtRef = useRef(0);
  const restoredScrollRef = useRef(false);

  useEffect(() => {
    if (!authUser?.id || legacyStructureRepairRef.current) return;
    const t = window.setTimeout(() => {
      if (legacyStructureRepairRef.current) return;
      legacyStructureRepairRef.current = true;
      void dedupeInFlight("portal:repair-legacy-structure-links", () => repairAllLegacyStructureLinks());
    }, 90_000);
    return () => window.clearTimeout(t);
  }, [authUser?.id]);

  const VISIBILITY_SKIP_HIDDEN_MS = 120_000;
  const METRICS_RECENT_FETCH_MS = 180_000;

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }
      lastResumeHiddenMsRef.current = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
      hiddenAtRef.current = null;
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (!authUser?.id) return;
    writePortalUiSnapshot({
      userId: authUser.id,
      activeModule,
      activeSubmodule,
      expanded,
      sidebarCollapsed,
    });
  }, [authUser?.id, activeModule, activeSubmodule, expanded, sidebarCollapsed]);

  useEffect(() => {
    if (!authUser?.id || restoredScrollRef.current) return;
    const snap = readPortalUiSnapshot(authUser.id);
    if (!snap || snap.scrollTop <= 0) {
      restoredScrollRef.current = true;
      return;
    }
    const apply = () => {
      const el = document.getElementById("portal-main-scroll");
      if (el) el.scrollTop = snap.scrollTop;
    };
    requestAnimationFrame(apply);
    restoredScrollRef.current = true;
  }, [authUser?.id]);

  const persistScrollSnapshot = useCallback(
    (el: HTMLElement) => {
      if (!authUser?.id) return;
      writePortalUiSnapshot({
        userId: authUser.id,
        activeModule,
        activeSubmodule,
        expanded,
        sidebarCollapsed,
        scrollTop: el.scrollTop,
      });
    },
    [authUser?.id, activeModule, activeSubmodule, expanded, sidebarCollapsed],
  );

  useThrottledElementScroll("portal-main-scroll", persistScrollSnapshot, {
    enabled: Boolean(authUser?.id),
    minIntervalMs: 700,
  });

  /** Boot ya haraka: RPC 1–2 + waumini counts (si orodha nzito wala ~70 queries). */
  const loadDashboardMetricsBoot = useCallback(async () => {
    return dedupeInFlight(
      "portal:load-dashboard-metrics-boot",
      async () => {
      const client = getSupabase();
      if (!client) {
        setKpiLive(emptyDashboardKpiSnapshot());
        setKpiError(null);
        return;
      }
      setKpiError(null);
      try {
        const { kpi, waumini } = await fetchDashboardBootBundle(roleBypassesGeoScope(role));
        setKpiLive(kpi);
        setWauminiCounts(waumini);
      } catch (err) {
        if (err instanceof AsyncTimeoutError) {
          setKpiLive(emptyDashboardKpiSnapshot());
          setKpiError(null);
          pushToast(PORTAL_SLOW_NETWORK_SW, "info");
        } else if (!isAbortLikeError(err)) {
          reportError(err, "Dashibodi — vipimo (boot)");
          setKpiError(DASHBOARD_KPI_LOAD_ERROR_SW);
          setKpiLive(emptyDashboardKpiSnapshot());
        }
      } finally {
        lastDashboardMetricsAtRef.current = Date.now();
      }
    },
      { timeoutMs: PORTAL_LOAD_TIMEOUTS.bootKpiMs + 2000 },
    );
  }, [reportError, role, pushToast]);

  /** Hesabu kamili za KPI (baadaye / on-demand) — bila orodha za jimbo/tawi/viongozi. */
  const loadDashboardMetricsFull = useCallback(async () => {
    return dedupeInFlight("portal:load-dashboard-metrics-full", async () => {
      const client = getSupabase();
      if (!client) return;
      setKpiRefreshing(true);
      if (kpiRefreshGuardRef.current) window.clearTimeout(kpiRefreshGuardRef.current);
      kpiRefreshGuardRef.current = window.setTimeout(() => {
        setKpiRefreshing(false);
      }, PORTAL_LOAD_TIMEOUTS.fullKpiMs + 2500);
      setKpiError(null);
      try {
        const [kpiSettled, auditSettled, securitySettled, wauminiSettled] = await Promise.allSettled([
          withTimeout(
            fetchDashboardKpiAggregates({ alignCoreCountsWithPublicRpc: roleBypassesGeoScope(role) }),
            PORTAL_LOAD_TIMEOUTS.fullKpiMs,
            "kpi-full",
          ),
          withTimeout(fetchAuditLogCount(), PORTAL_LOAD_TIMEOUTS.bootKpiMs, "kpi-audit"),
          withTimeout(fetchPortalSecurityCountsStrict(), PORTAL_LOAD_TIMEOUTS.bootKpiMs, "kpi-security"),
          withTimeout(fetchWauminiCountsStrict(), PORTAL_LOAD_TIMEOUTS.bootKpiMs, "kpi-waumini"),
        ]);
        if (wauminiSettled.status === "fulfilled") setWauminiCounts(wauminiSettled.value);
        const auditErr =
          auditSettled.status === "rejected" && !isAbortLikeError(auditSettled.reason)
            ? String((auditSettled.reason as Error)?.message ?? auditSettled.reason)
            : null;
        const securityErr =
          securitySettled.status === "rejected" && !isAbortLikeError(securitySettled.reason)
            ? String((securitySettled.reason as Error)?.message ?? securitySettled.reason)
            : null;
        if (kpiSettled.status === "fulfilled") {
          const baseKpi = kpiSettled.value;
          setKpiLive({
            ...baseKpi,
            failedKpis: {
              ...(baseKpi.failedKpis ?? {}),
              ...(auditErr ? { "kpi.audit_logs.count": auditErr } : {}),
              ...(securityErr
                ? {
                    "kpi.portal_directory_profiles.count": securityErr,
                    "kpi.portal_visibility_rules.count": securityErr,
                    "kpi.portal_module_matrix.count": securityErr,
                  }
                : {}),
            },
          });
          setKpiError(null);
        } else if (!isAbortLikeError(kpiSettled.reason)) {
          if (kpiSettled.reason instanceof AsyncTimeoutError) {
            pushToast(PORTAL_SLOW_NETWORK_SW, "info");
          } else {
            reportError(kpiSettled.reason, "Dashibodi — vipimo (kamili)");
            setKpiError(DASHBOARD_KPI_LOAD_ERROR_SW);
          }
        }
      } catch (err) {
        if (err instanceof AsyncTimeoutError) {
          pushToast(PORTAL_SLOW_NETWORK_SW, "info");
        } else {
          reportError(err, "Dashibodi — vipimo");
          setKpiError(DASHBOARD_KPI_LOAD_ERROR_SW);
        }
      } finally {
        if (kpiRefreshGuardRef.current) {
          window.clearTimeout(kpiRefreshGuardRef.current);
          kpiRefreshGuardRef.current = null;
        }
        setKpiRefreshing(false);
        lastDashboardMetricsAtRef.current = Date.now();
      }
    },
      { timeoutMs: PORTAL_LOAD_TIMEOUTS.fullKpiMs + 3000 },
    );
  }, [reportError, role, pushToast]);

  const scheduleDashboardMetricsFull = useCallback(() => {
    if (fullMetricsScheduledRef.current) return;
    fullMetricsScheduledRef.current = true;
    const run = () => {
      if (activeModuleRef.current !== "dashboard") return;
      void loadDashboardMetricsFull();
    };
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(run, { timeout: 8000 });
    } else {
      window.setTimeout(run, 3500);
    }
  }, [loadDashboardMetricsFull]);

  const loadDashboardMetrics = useCallback(
    async (mode: "boot" | "full" = "boot") => {
      if (mode === "full") return loadDashboardMetricsFull();
      return loadDashboardMetricsBoot();
    },
    [loadDashboardMetricsBoot, loadDashboardMetricsFull],
  );

  const loadStructureListsForBranch = useCallback(async () => {
    return dedupeInFlight(
      "portal:load-structure-for-branch",
      async () => {
      if (!getSupabase()) return;
      const settled = await Promise.allSettled([
        withTimeout(fetchDayosisi(), PORTAL_LOAD_TIMEOUTS.structureListsMs, "dayosisi"),
        withTimeout(fetchChurchJimbo(), PORTAL_LOAD_TIMEOUTS.structureListsMs, "jimbo"),
        withTimeout(fetchChurchTawi(), PORTAL_LOAD_TIMEOUTS.structureListsMs, "tawi"),
      ]);
      if (settled[0].status === "fulfilled") setDayosisi(settled[0].value);
      if (settled[1].status === "fulfilled") setMajimbo(settled[1].value);
      if (settled[2].status === "fulfilled") setMatawi(settled[2].value);
    },
      { timeoutMs: PORTAL_LOAD_TIMEOUTS.structureListsMs + 1500 },
    );
  }, []);

  const coalescedMetricsReloadRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    coalescedMetricsReloadRef.current = coalesceRealtimeCallback(() => {
      if (activeModuleRef.current !== "dashboard") return;
      void loadDashboardMetricsBoot();
    }, 2200);
  }, [loadDashboardMetricsBoot]);

  const scheduleMetricsReload = useCallback(
    (immediate?: boolean, full = false) => {
      if (activeModuleRef.current !== "dashboard") return;
      if (immediate) {
        void loadDashboardMetrics(full ? "full" : "boot");
        return;
      }
      coalescedMetricsReloadRef.current?.();
    },
    [loadDashboardMetrics],
  );

  const loadViongoziList = useCallback(async () => {
    return dedupeInFlight("portal:load-viongozi-list", async () => {
    if (!getSupabase()) {
      setViongozi([]);
      return;
    }
    try {
      const rows = await fetchChurchViongozi();
      setViongozi(rows);
    } catch (err) {
      if (!isAbortLikeError(err)) {
        reportError(err, "Viongozi — orodha");
        setViongozi([]);
      }
    }
    });
  }, [reportError]);

  const loadIncomeModuleData = useCallback(async () => {
    return dedupeInFlight("portal:load-income-module", async () => {
    if (!getSupabase()) {
      setIncomeSources([]);
      setIncomeManagement([]);
      return;
    }
    try {
      const [srcRes, linesRes] = await Promise.allSettled([
        fetchChurchIncomeSources(),
        fetchChurchIncomeLines(),
      ]);
      if (srcRes.status === "fulfilled") setIncomeSources(srcRes.value);
      else if (!isAbortLikeError(srcRes.reason)) {
        reportError(srcRes.reason, "Mapato — orodha");
        setIncomeSources([]);
      }
      if (linesRes.status === "fulfilled") setIncomeManagement(linesRes.value);
      else if (!isAbortLikeError(linesRes.reason)) {
        reportError(linesRes.reason, "Mapato — orodha");
        setIncomeManagement([]);
      }
    } catch (err) {
      if (!isAbortLikeError(err)) {
        reportError(err, "Mapato — orodha");
        setIncomeSources([]);
        setIncomeManagement([]);
      }
    } finally {
      lastIncomeDataAtRef.current = Date.now();
    }
    });
  }, [reportError]);

  const loadFinanceEntries = useCallback(async () => {
    return dedupeInFlight("portal:load-finance-entries", async () => {
    if (!getSupabase()) {
      setFedha([]);
      return;
    }
    try {
      const rows = await fetchChurchFinanceEntries();
      setFedha(rows);
    } catch (err) {
      if (!isAbortLikeError(err)) {
        reportError(err, "Fedha — orodha");
        setFedha([]);
      }
    }
    });
  }, [reportError]);

  /** Muundo bila kupitia Dashibodi (au kusasisha orodha baada ya kuingia Muundo). */
  const loadMuundoLists = useCallback(async () => {
    return dedupeInFlight("portal:load-muundo-lists", async () => {
    if (!getSupabase()) {
      setMajimbo([]);
      setMatawi([]);
      return;
    }
    try {
      const [jRes, tRes] = await Promise.allSettled([fetchChurchJimbo(), fetchChurchTawi()]);
      if (jRes.status === "fulfilled") setMajimbo(jRes.value);
      else if (!isAbortLikeError(jRes.reason)) {
        reportError(jRes.reason, "Muundo — orodha");
        setMajimbo([]);
      }
      if (tRes.status === "fulfilled") setMatawi(tRes.value);
      else if (!isAbortLikeError(tRes.reason)) {
        reportError(tRes.reason, "Muundo — orodha");
        setMatawi([]);
      }
    } catch (err) {
      if (!isAbortLikeError(err)) {
        reportError(err, "Muundo — orodha");
        setMajimbo([]);
        setMatawi([]);
      }
    }
    });
  }, [reportError]);

  const loadPendingApprovalsData = useCallback(async () => {
    return dedupeInFlight("portal:load-pending-approvals-data", async () => {
      if (!getSupabase()) return;
      const settled = await Promise.allSettled([
        loadMuundoLists(),
        fetchChurchFinanceEntries(),
        fetchChurchIncomeLines(),
      ]);
      if (settled[1].status === "fulfilled") setFedha(settled[1].value);
      if (settled[2].status === "fulfilled") setIncomeManagement(settled[2].value);
    });
  }, [loadMuundoLists]);

  const masterSettingsRealtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authInitialized || !authUser || rbacLoading) return;
    if (!getSupabase()) {
      setMajimbo([]);
      setMatawi([]);
      setKpiLive(emptyDashboardKpiSnapshot());
      setKpiError(null);
      setKpiRefreshing(false);
      return;
    }
    if (activeModule !== "dashboard") return;

    let cancelled = false;
    fullMetricsScheduledRef.current = false;
    setBranchEngineMountEnabled(false);
    void loadDashboardMetricsBoot();

    const branchTimer = window.setTimeout(() => {
      if (!cancelled) {
        setBranchEngineMountEnabled(true);
        void loadStructureListsForBranch();
      }
    }, 1400);

    if (!isSupabaseRealtimeEnabled()) {
      const onVisibility = () => {
        if (document.visibilityState !== "visible" || cancelled) return;
        const hiddenMs = lastResumeHiddenMsRef.current;
        const since = Date.now() - lastDashboardMetricsAtRef.current;
        if (hiddenMs > 0 && hiddenMs < VISIBILITY_SKIP_HIDDEN_MS && since < METRICS_RECENT_FETCH_MS) return;
        void loadDashboardMetricsBoot();
      };
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        cancelled = true;
        window.clearTimeout(branchTimer);
        document.removeEventListener("visibilitychange", onVisibility);
      };
    }

    const scheduleReload = () => {
      if (!cancelled) scheduleMetricsReload();
    };

    const client = getSupabase()!;
    let channel = client.channel("portal-dashboard-live");
    for (const table of PORTAL_DASHBOARD_REALTIME_TABLES) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, scheduleReload);
    }
    channel.subscribe();

    const onVisibility = () => {
      if (document.visibilityState !== "visible" || cancelled) return;
      const since = Date.now() - lastDashboardMetricsAtRef.current;
      if (since < METRICS_RECENT_FETCH_MS) return;
      scheduleMetricsReload();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearTimeout(branchTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      void client.removeChannel(channel);
    };
  }, [
    activeModule,
    loadDashboardMetricsBoot,
    scheduleMetricsReload,
    scheduleDashboardMetricsFull,
    loadStructureListsForBranch,
    authInitialized,
    authUser,
    rbacLoading,
  ]);

  useEffect(() => {
    if (!authInitialized || !authUser) return;
    if (activeModule !== "dashboard") return;
    const sub = normalizeDashboardSubmodule(activeSubmodule);
    if (sub === DASHBOARD_PENDING_APPROVALS_SUBMODULE) {
      void loadPendingApprovalsData();
    }
    if (sub === DASHBOARD_COMMAND_CENTER_SUBMODULE && !fullMetricsScheduledRef.current) {
      scheduleDashboardMetricsFull();
    }
  }, [
    activeModule,
    activeSubmodule,
    authInitialized,
    authUser,
    loadPendingApprovalsData,
    scheduleDashboardMetricsFull,
  ]);

  useEffect(() => {
    if (!authInitialized || !authUser) return;
    if (!getSupabase()) return;
    if (activeModule !== "muundo") return;
    void loadMuundoLists();
  }, [activeModule, loadMuundoLists, authInitialized, authUser]);

  useEffect(() => {
    if (!authInitialized || !authUser) return;
    if (!getSupabase()) return;
    if (activeModule !== "fedha") return;
    void loadFinanceEntries();
  }, [activeModule, loadFinanceEntries, authInitialized, authUser]);

  useEffect(() => {
    if (!authInitialized || !authUser) return;
    if (!getSupabase()) return;
    if (activeModule !== "viongozi") return;
    void loadViongoziList();
  }, [activeModule, loadViongoziList, authInitialized, authUser]);

  const incomeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!getSupabase()) return;
    if (activeModule !== "vyanzo_mapato" && activeModule !== "mapato_income") return;
    if (!isSupabaseRealtimeEnabled()) return;

    let cancelled = false;
    void loadIncomeModuleData();

    const scheduleIncomeReload = () => {
      if (incomeDebounceRef.current) clearTimeout(incomeDebounceRef.current);
      incomeDebounceRef.current = setTimeout(() => {
        incomeDebounceRef.current = null;
        if (!cancelled) void loadIncomeModuleData();
      }, 400);
    };

    const client = getSupabase()!;
    const channel = client
      .channel("portal-income-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "church_income_sources" }, scheduleIncomeReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "church_income_lines" }, scheduleIncomeReload)
      .subscribe();

    const onVisibility = () => {
      if (document.visibilityState !== "visible" || cancelled) return;
      const hiddenMs = lastResumeHiddenMsRef.current;
      const since = Date.now() - lastIncomeDataAtRef.current;
      if (hiddenMs > 0 && hiddenMs < VISIBILITY_SKIP_HIDDEN_MS && since < METRICS_RECENT_FETCH_MS) return;
      void loadIncomeModuleData();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (incomeDebounceRef.current) clearTimeout(incomeDebounceRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      void client.removeChannel(channel);
    };
  }, [activeModule, loadIncomeModuleData, authInitialized, authUser]);

  useEffect(() => {
    if (!authInitialized || !authUser) return;
    if (!getSupabase()) return;
    if (!isSupabaseRealtimeEnabled()) return;

    let cancelled = false;
    const client = getSupabase()!;
    const scheduleMasterRefresh = () => {
      if (masterSettingsRealtimeDebounceRef.current) clearTimeout(masterSettingsRealtimeDebounceRef.current);
      masterSettingsRealtimeDebounceRef.current = setTimeout(() => {
        masterSettingsRealtimeDebounceRef.current = null;
        if (cancelled) return;
        void refreshMasterSettingsCache();
      }, 420);
    };

    const channel = client
      .channel("portal-master-settings-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "portal_master_settings" }, scheduleMasterRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "portal_theme_settings" }, scheduleMasterRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "portal_template_settings" }, scheduleMasterRefresh)
      .subscribe();

    return () => {
      cancelled = true;
      if (masterSettingsRealtimeDebounceRef.current) clearTimeout(masterSettingsRealtimeDebounceRef.current);
      void client.removeChannel(channel);
    };
  }, [authInitialized, authUser]);

  const visibleModules = useMemo(() => {
    if (rbacLoading) return modules;
    return modules.filter((m) => canPortalViewModule(m.key));
  }, [rbacLoading, canPortalViewModule]);
  const draftScope = useMemo<PortalDraftScope>(
    () => ({ userId: authUser?.id, moduleKey: activeModule, submodule: activeSubmodule }),
    [activeModule, activeSubmodule, authUser?.id]
  );

  const canLeaveDraftScope = useCallback(
    (nextModule: string, nextSubmodule: string) => {
      if (nextModule === activeModule && nextSubmodule === activeSubmodule) return true;
      window.dispatchEvent(new CustomEvent(PORTAL_DRAFT_EVENT_FLUSH));
      return confirmPortalDraftNavigation(draftScope);
    },
    [activeModule, activeSubmodule, draftScope]
  );

  const syncPortalUrl = useCallback(
    (moduleKey: string, submodule: string, extras?: { recordId?: string | null; engineModuleId?: string | null }) => {
      if (typeof window === "undefined") return;
      try {
        if (isPortalBranchEngineSurface(moduleKey, submodule)) {
          const href = buildBranchEnginePortalUrl({
            moduleKey: moduleKey === "dashboard" ? "dashboard" : "muundo",
            submodule,
            recordId: extras?.recordId ?? highlightRecordId ?? undefined,
            engineModuleId: extras?.engineModuleId ?? branchEngineModuleId ?? undefined,
          });
          window.history.replaceState(null, "", href);
          return;
        }
        const url = new URL(window.location.href);
        url.searchParams.set("module", moduleKey);
        url.searchParams.set("submodule", submodule);
        url.searchParams.delete("recordId");
        url.searchParams.delete("engineModuleId");
        const qs = url.searchParams.toString();
        window.history.replaceState(null, "", `${url.pathname}${qs ? `?${qs}` : ""}`);
      } catch {
        /* ignore */
      }
    },
    [branchEngineModuleId, highlightRecordId],
  );

  const selectModule = useCallback(
    (moduleKey: string, submodule: string) => {
      if (rbacLoading && showRbacBootShell) return;
      const resolvedSub = coerceSubmoduleForModule(moduleKey, submodule);
      if (!canLeaveDraftScope(moduleKey, resolvedSub)) return;
      setActiveModule(moduleKey);
      setActiveSubmodule(resolvedSub);
      setExpanded((p) => ({ ...p, [moduleKey]: true }));
      setMobileOpen(false);
      syncPortalUrl(moduleKey, resolvedSub);
    },
    [canLeaveDraftScope, syncPortalUrl, rbacLoading, showRbacBootShell]
  );

  const urlBootRef = useRef(false);
  useEffect(() => {
    if (!authInitialized || !authUser || (rbacLoading && showRbacBootShell) || urlBootRef.current) return;
    urlBootRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const mk = params.get("module")?.trim();
    if (mk && canPortalViewModule(mk)) {
      const mod = modules.find((m) => m.key === mk);
      const rawSm = params.get("submodule")?.trim() || mod?.submodules[0] || "";
      const sm = coerceSubmoduleForModule(mk, rawSm || undefined);
      const rid = params.get("recordId")?.trim();
      const mid = params.get("engineModuleId")?.trim();
      if (mid) setBranchEngineModuleId(mid);
      if (rid) setHighlightRecordId(rid);
      selectModule(mk, sm);
      if (rid || mid) {
        syncPortalUrl(mk, sm, { recordId: rid || null, engineModuleId: mid || null });
      }
      return;
    }
    if (!shouldOpenBranchEngineAsPortalHome(params.toString())) return;
    const home = PORTAL_HOME_AFTER_LOGIN;
    if (canPortalViewModule(home.moduleKey)) {
      selectModule(home.moduleKey, home.submodule);
      return;
    }
    selectModule("dashboard", getDashboardDefaultSubmodule());
  }, [authInitialized, authUser, rbacLoading, showRbacBootShell, canPortalViewModule, selectModule, syncPortalUrl]);

  useEffect(() => {
    const onReloadMetrics = (ev: Event) => {
      if (activeModuleRef.current !== "dashboard") return;
      const detail = (ev as CustomEvent<{ immediate?: boolean; full?: boolean }>).detail;
      const immediate = Boolean(detail?.immediate);
      scheduleMetricsReload(immediate, Boolean(detail?.full));
    };
    window.addEventListener(KMT_PORTAL_RELOAD_METRICS_EVENT, onReloadMetrics);
    return () => window.removeEventListener(KMT_PORTAL_RELOAD_METRICS_EVENT, onReloadMetrics);
  }, [scheduleMetricsReload]);

  useEffect(() => {
    const onNavigate = (ev: Event) => {
      const detail = (
        ev as CustomEvent<{
          moduleKey?: string;
          submodule?: string;
          recordId?: string;
          engineModuleId?: string;
        }>
      ).detail;
      const mk = detail?.moduleKey?.trim();
      if (!mk || !canPortalViewModule(mk)) return;
      const mod = modules.find((m) => m.key === mk);
      const rawSm = detail?.submodule?.trim() || mod?.submodules[0] || "";
      const sm = coerceSubmoduleForModule(mk, rawSm || undefined);
      selectModule(mk, sm);
      const rid = detail?.recordId?.trim();
      const mid = detail?.engineModuleId?.trim();
      setBranchEngineModuleId(mid || null);
      if (rid) {
        requestAnimationFrame(() => setHighlightRecordId(rid));
      } else {
        setHighlightRecordId(null);
      }
    };
    window.addEventListener("kmt-portal-navigate", onNavigate);
    return () => window.removeEventListener("kmt-portal-navigate", onNavigate);
  }, [canPortalViewModule, selectModule]);

  /** Rudi: usitumie history.back (SPA moja / Vercel) — rudi kwenye submodule ya kwanza, kisha dashboard. */
  useEffect(() => {
    const onSubBack = () => {
      const mod = modules.find((m) => m.key === activeModule);
      const subs = mod?.submodules ?? [];
      const first =
        subs[0] != null && subs[0] !== ""
          ? coerceSubmoduleForModule(activeModule, subs[0])
          : getFirstSubmoduleForModule(activeModule);
      if (activeSubmodule !== first) {
        if (!canLeaveDraftScope(activeModule, first)) return;
        selectModule(activeModule, first);
        requestAnimationFrame(() => {
          document.getElementById("portal-main-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
        });
        return;
      }
      if (activeModule !== "dashboard" && canPortalViewModule("dashboard")) {
        selectModule("dashboard", getDashboardDefaultSubmodule());
      }
    };
    window.addEventListener("kmt-portal-submodule-back", onSubBack);
    return () => window.removeEventListener("kmt-portal-submodule-back", onSubBack);
  }, [activeModule, activeSubmodule, canLeaveDraftScope, canPortalViewModule, selectModule]);

  useEffect(() => {
    if (noModuleRbac) {
      setActiveModule("dashboard");
      setActiveSubmodule(getDashboardDefaultSubmodule());
      return;
    }
    if (activeModule === "dashboard" && !canPortalViewModule("dashboard")) {
      const first = modules.find((m) => canPortalViewModule(m.key));
      if (first) {
        setActiveModule(first.key);
        setActiveSubmodule(getFirstSubmoduleForModule(first.key));
      }
      return;
    }
    if (activeModule !== "dashboard" && !canPortalViewModule(activeModule)) {
      pushToast("Huna ruhusa ya moduli hii.", "error");
      void logRbacDenied(activeModule, { submodule: activeSubmodule, source: "AppLayout.guard" });
      if (canPortalViewModule("dashboard")) {
        setActiveModule("dashboard");
        setActiveSubmodule(getDashboardDefaultSubmodule());
      } else {
        const first = modules.find((m) => canPortalViewModule(m.key));
        if (first) {
          setActiveModule(first.key);
          setActiveSubmodule(getFirstSubmoduleForModule(first.key));
        }
      }
    }
  }, [activeModule, noModuleRbac, canPortalViewModule, pushToast]);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!highlightRecordId) return;
    const t = window.setTimeout(() => setHighlightRecordId(null), 5200);
    return () => window.clearTimeout(t);
  }, [highlightRecordId]);

  const layoutMode = getPortalLayoutMode(activeModule, activeSubmodule);
  const branchEngineSurface = layoutMode === "fullscreen";
  const moduleWorkspace = activeModule !== "dashboard";

  const canSubBack = useMemo(() => {
    const mod = modules.find((m) => m.key === activeModule);
    const subs = mod?.submodules ?? [];
    const first =
      subs[0] != null && subs[0] !== ""
        ? coerceSubmoduleForModule(activeModule, subs[0])
        : getFirstSubmoduleForModule(activeModule);
    if (activeSubmodule !== first) return true;
    return activeModule !== "dashboard" && canPortalViewModule("dashboard");
  }, [activeModule, activeSubmodule, canPortalViewModule]);

  const activeModuleMeta = useMemo(
    () => modules.find((m) => m.key === activeModule),
    [activeModule],
  );
  const topbarModuleLabel = activeModuleMeta?.label ?? activeModule;
  const topbarSubmoduleLabel = activeSubmodule?.trim() || undefined;

  const handleTopbarBack = useCallback(() => {
    window.dispatchEvent(new Event("kmt-portal-submodule-back"));
  }, []);

  const handleDashboardNavigate = useCallback(
    (moduleKey: string, submodule: string) => {
      selectModule(moduleKey, submodule);
    },
    [selectModule],
  );

  const handleRefreshDashboardKpis = useCallback(() => {
    void loadDashboardMetrics("full");
  }, [loadDashboardMetrics]);

  return (
    <div className="portal-app-shell flex h-screen flex-col overflow-hidden bg-[#F3F6FA]" style={{ height: "100dvh" }}>
      <a
        href="#portal-main-scroll"
        className="pointer-events-none fixed left-4 top-4 z-[300] -translate-y-[160%] rounded-xl bg-[#0f1e46] px-4 py-2.5 text-sm font-semibold text-white opacity-0 shadow-lg ring-2 ring-white/90 transition-transform duration-200 focus:pointer-events-auto focus:translate-y-0 focus:opacity-100 focus:outline-none"
      >
        Ruka hadi maudhui
      </a>
      <div className="flex min-h-0 min-w-0 flex-1">
        <Sidebar
          modules={visibleModules}
          activeModule={activeModule}
          activeSubmodule={activeSubmodule}
          expanded={expanded}
          onToggle={(k) => setExpanded((p) => ({ ...p, [k]: !p[k] }))}
          onSelect={(moduleKey, submodule) => {
            selectModule(moduleKey, submodule);
          }}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          collapsed={authUser ? sidebarCollapsed : false}
          onToggleCollapse={
            authUser
              ? () => setSidebarCollapsed((c) => !c)
              : undefined
          }
        />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col" data-portal-main>
          <PortalChromeHeader
            topbar={
              <Topbar
                moduleLabel={topbarModuleLabel}
                submoduleLabel={topbarSubmoduleLabel}
                canBack={canSubBack}
                onBack={handleTopbarBack}
                onOpenMobileSidebar={() => setMobileOpen(true)}
                onNavigateToModule={(moduleKey, submodule) => {
                  selectModule(moduleKey, submodule ?? "");
                }}
                sidebarCollapsed={authUser ? sidebarCollapsed : undefined}
                onToggleSidebarCollapse={
                  authUser ? () => setSidebarCollapsed((c) => !c) : undefined
                }
              />
            }
            menu={
              authUser ? (
                <ExecutiveMenuBar
                  activeModule={activeModule}
                  activeSubmodule={activeSubmodule}
                  canViewModule={canPortalViewModule}
                  onNavigate={(moduleKey, submodule) => selectModule(moduleKey, submodule)}
                />
              ) : null
            }
          />
          <div
            id="portal-main-scroll"
            tabIndex={-1}
            className={`portal-main-scroll relative flex min-h-0 min-w-0 flex-1 flex-col overscroll-y-contain [-webkit-overflow-scrolling:touch] focus:outline-none ${
              branchEngineSurface
                ? "overflow-hidden"
                : "overflow-y-auto overflow-x-hidden pb-[max(5rem,env(safe-area-inset-bottom))]"
            }`}
          >
            {!online ? (
              <div className="border-b border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                Uko offline. Baadhi ya huduma (auth/sync) zinahitaji intaneti.
              </div>
            ) : null}
            <MaintenanceBanner site={site} />
            {authInitialized &&
            authUser &&
            !rbacLoading &&
            visibleModules.length > 0 &&
            !shouldHidePortalProjectRibbon(activeModule, activeSubmodule) ? (
              <PortalProjectNotesRibbon show />
            ) : null}
            {!rbacLoading && noModuleRbac ? (
              <div className="portal-page-content">
                <NoModuleAccessNotice />
              </div>
            ) : null}
            {authUser ? (
            <div
              className={`portal-workspace-layer portal-page-content flex w-full min-w-0 flex-1 flex-col ${
                branchEngineSurface ? "portal-page-content--fullscreen min-h-0 p-0" : ""
              } ${moduleWorkspace && !branchEngineSurface ? "min-h-0" : ""}`}
            >
            {rbacLoading && showRbacBootShell ? (
              <div className="portal-rbac-boot-overlay" aria-busy="true" aria-label="Inapakia ruhusa">
                <PortalBootShell className="flex-1" />
              </div>
            ) : null}
            <Suspense fallback={<ModuleLoadingFallback />}>
              <ErrorBoundary sectionLabel={activeModule === "dashboard" ? "Dashibodi" : `Moduli: ${activeModule}`}>
              {activeModule === "dashboard" ? (
                <div className="flex min-h-0 w-full flex-1 flex-col">
                <InternalDashboardRouter
                  activeSubmodule={activeSubmodule}
                  dayosisi={dayosisi}
                  majimbo={majimbo}
                  matawi={matawi}
                  fedha={fedha}
                  incomeManagement={incomeManagement}
                  kpiLive={kpiLive}
                  kpiRefreshing={kpiRefreshing}
                  wauminiCounts={wauminiCounts}
                  matawiRegistryPendingReviewKpi={kpiLive.matawiRegistryPendingReviewCount}
                  matawiRegistryPendingReviewKpiFailed={Boolean(
                    (kpiLive.failedKpis ?? {})["kpi.church_tawi.count_registry_pending_review"],
                  )}
                  portalProfile={portalProfile}
                  highlightRecordId={highlightRecordId}
                  branchEngineModuleId={branchEngineModuleId}
                  canViewModule={canPortalViewModule}
                  onNavigateModule={handleDashboardNavigate}
                  branchEngineMountEnabled={branchEngineMountEnabled}
                  onRefreshKpis={handleRefreshDashboardKpis}
                />
                </div>
              ) : (
                <ModulePage
                  moduleKey={activeModule}
                  submodule={activeSubmodule}
                  layoutMode={layoutMode}
                  kpiLive={kpiLive}
                  kpiRefreshing={kpiRefreshing}
                  canNavigateBack={canSubBack}
                  dayosisi={dayosisi}
                  setDayosisi={setDayosisi}
                  majimbo={majimbo}
                  setMajimbo={setMajimbo}
                  matawi={matawi}
                  setMatawi={setMatawi}
                  viongozi={viongozi}
                  setViongozi={setViongozi}
                  fedha={fedha}
                  setFedha={setFedha}
                  incomeSources={incomeSources}
                  setIncomeSources={setIncomeSources}
                  incomeManagement={incomeManagement}
                  setIncomeManagement={setIncomeManagement}
                  matawiRegistryPendingReviewKpi={kpiLive.matawiRegistryPendingReviewCount}
                  matawiRegistryPendingReviewKpiFailed={Boolean(
                    (kpiLive.failedKpis ?? {})["kpi.church_tawi.count_registry_pending_review"]
                  )}
                  highlightRecordId={highlightRecordId}
                  branchEngineModuleId={branchEngineModuleId}
                  onCrudSuccess={(action, meta) => {
                    dispatchPortalReloadMetrics();
                    clearPortalDraft({ userId: authUser?.id, moduleKey: meta.moduleKey, submodule: meta.submodule });
                    window.dispatchEvent(new CustomEvent(PORTAL_DRAFT_EVENT_CLEAR_CURRENT));
                    const mod = modules.find((m) => m.key === meta.moduleKey);
                    const target = meta.targetSubmodule?.trim();
                    if (
                      meta.moduleKey === activeModule &&
                      target &&
                      mod?.submodules.includes(target) &&
                      target !== activeSubmodule
                    ) {
                      setActiveSubmodule(target);
                    }
                    requestAnimationFrame(() => {
                      document.getElementById("portal-main-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
                    });
                    if (action === "create" && meta.recordId) {
                      setHighlightRecordId(meta.recordId);
                    }
                    if (action === "delete" && meta.recordId) {
                      setHighlightRecordId((cur) => (cur === meta.recordId ? null : cur));
                    }
                  }}
                />
              )}
              </ErrorBoundary>
            </Suspense>
            </div>
            ) : null}
          </div>
          <PortalAutoDraftRecovery scope={draftScope} rootId="portal-main-scroll" enabled={authInitialized && Boolean(authUser)} />
          {!branchEngineSurface && !moduleWorkspace ? <SiteFooter site={site} about={about} /> : null}
        </main>
      </div>
      <CookieConsentBanner site={site} />
    </div>
  );
}
