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
import { isAbortLikeError } from "../../lib/supabaseErrors";
import { DASHBOARD_KPI_LOAD_ERROR_SW, HAIJAPATIKANA_DATA_SW } from "../../lib/supabaseUiMessages";
import { dispatchPortalReloadMetrics, KMT_PORTAL_RELOAD_METRICS_EVENT } from "../../lib/portalEvents";
import { PORTAL_GLOBAL_REALTIME_TABLES } from "../../lib/portalRealtimeSyncTables";
import { roleBypassesGeoScope } from "../../utils/scopeAccess";
import { readPortalUiSnapshot, writePortalUiSnapshot } from "../../lib/portalUiPersistence";
import {
  coerceSubmoduleForModule,
  getDashboardDefaultSubmodule,
  getFirstSubmoduleForModule,
} from "../../lib/dashboardSubmodules";
import {
  clearPortalDraft,
  confirmPortalDraftNavigation,
  PORTAL_DRAFT_EVENT_CLEAR_CURRENT,
  PORTAL_DRAFT_EVENT_FLUSH,
  type PortalDraftScope,
} from "../../lib/portalDraftRecovery";
import { CookieConsentBanner } from "./CookieConsentBanner";
import { MaintenanceBanner } from "./MaintenanceBanner";
import { PortalAutoDraftRecovery } from "../draft/PortalAutoDraftRecovery";
import { SiteFooter } from "./SiteFooter";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { PortalProjectNotesRibbon } from "./PortalProjectNotesRibbon";
const Dashboard = lazy(async () => {
  const m = await import("../../pages/Dashboard");
  return { default: m.Dashboard };
});

const ModulePage = lazy(async () => {
  const m = await import("../../pages/ModulePage");
  return { default: m.ModulePage };
});

function ModuleLoadingFallback() {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-8 text-slate-600"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-blue-900 border-t-transparent" aria-hidden />
      <p className="text-sm font-medium">Inapakia moduli…</p>
    </div>
  );
}

export function AppLayout() {
  const { pushToast, reportError, site, about, canPortalViewModule, noModuleRbac, authInitialized, authUser, role, rbacLoading } =
    usePortal();
  useSiteDocumentMeta(site);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const snap = typeof window !== "undefined" ? readPortalUiSnapshot(authUser?.id) : null;
    if (snap?.expanded && Object.keys(snap.expanded).length > 0) return snap.expanded;
    return Object.fromEntries(modules.map((m) => [m.key, m.key === "dashboard"]));
  });
  const [activeModule, setActiveModule] = useState(() => {
    if (typeof window === "undefined") return "dashboard";
    const snap = readPortalUiSnapshot(authUser?.id);
    if (snap?.activeModule) return snap.activeModule;
    return new URLSearchParams(window.location.search).get("module")?.trim() || "dashboard";
  });
  const [activeSubmodule, setActiveSubmodule] = useState(() => {
    if (typeof window === "undefined") return getDashboardDefaultSubmodule();
    const snap = readPortalUiSnapshot(authUser?.id);
    const params = new URLSearchParams(window.location.search);
    const urlMk = params.get("module")?.trim();
    const urlSub = params.get("submodule")?.trim();
    if (snap?.activeModule) {
      return coerceSubmoduleForModule(snap.activeModule, snap.activeSubmodule ?? undefined);
    }
    const mod = urlMk ?? "dashboard";
    return coerceSubmoduleForModule(mod, urlSub);
  });
  const [highlightRecordId, setHighlightRecordId] = useState<string | null>(null);

  const [dayosisi, setDayosisi] = useState<DayosisiRecord[]>([]);
  const [majimbo, setMajimbo] = useState<JimboRecord[]>([]);
  const [matawi, setMatawi] = useState<TawiRecord[]>([]);
  const [viongozi, setViongozi] = useState<KiongoziRecord[]>([]);
  const [fedha, setFedha] = useState<FedhaRecord[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSourceRecord[]>([]);
  const [incomeManagement, setIncomeManagement] = useState<IncomeManagementRecord[]>([]);
  const [auditLogCount, setAuditLogCount] = useState(0);
  const [securityCounts, setSecurityCounts] = useState({ directory: 0, visibilityRules: 0, rbacMatrixRows: 0 });
  const [wauminiCounts, setWauminiCounts] = useState({ families: 0, members: 0, activeMembers: 0, baptized: 0 });
  const [kpiLive, setKpiLive] = useState<DashboardKpiSnapshot>(() => emptyDashboardKpiSnapshot());
  const [kpiRefreshing, setKpiRefreshing] = useState(false);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);

  /** Muda wa mwisho wa kuwa nyuma ya tab (kupima kurudi); si tokeni. */
  const hiddenAtRef = useRef<number | null>(null);
  /** Nusu sekunde za mwisho za kuwa nyuma — kusawazisha vipima baada ya kurudi. */
  const lastResumeHiddenMsRef = useRef(0);
  const lastDashboardMetricsAtRef = useRef(0);
  const lastIncomeDataAtRef = useRef(0);
  const restoredScrollRef = useRef(false);

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
    });
  }, [authUser?.id, activeModule, activeSubmodule, expanded]);

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
    apply();
    requestAnimationFrame(apply);
    window.setTimeout(apply, 80);
    restoredScrollRef.current = true;
  }, [authUser?.id]);

  useEffect(() => {
    const el = document.getElementById("portal-main-scroll");
    if (!el || !authUser?.id) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => {
        writePortalUiSnapshot({
          userId: authUser.id,
          activeModule,
          activeSubmodule,
          expanded,
          scrollTop: el.scrollTop,
        });
      }, 400);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (t) window.clearTimeout(t);
    };
  }, [authUser?.id, activeModule, activeSubmodule, expanded]);

  /** Hesabu + dayosisi za KPI za dashibodi — zote kutoka Supabase kwa wakati mmoja. */
  const loadDashboardMetrics = useCallback(async () => {
    return dedupeInFlight("portal:load-dashboard-metrics", async () => {
    const client = getSupabase();
    if (!client) {
      setAuditLogCount(0);
      setSecurityCounts({ directory: 0, visibilityRules: 0, rbacMatrixRows: 0 });
      setWauminiCounts({ families: 0, members: 0, activeMembers: 0, baptized: 0 });
      setDayosisi([]);
      setMajimbo([]);
      setMatawi([]);
      setFedha([]);
      setIncomeSources([]);
      setIncomeManagement([]);
      setKpiLive(emptyDashboardKpiSnapshot());
      setKpiError(null);
      return;
    }
    setKpiRefreshing(true);
    setKpiError(null);
    try {
      const settled = await Promise.allSettled([
        fetchDayosisi(),
        fetchAuditLogCount(),
        fetchPortalSecurityCountsStrict(),
        fetchWauminiCountsStrict(),
        fetchChurchJimbo(),
        fetchChurchTawi(),
        fetchChurchFinanceEntries(),
        fetchChurchIncomeSources(),
        fetchChurchIncomeLines(),
        fetchChurchViongozi(),
        fetchDashboardKpiAggregates({ alignCoreCountsWithPublicRpc: roleBypassesGeoScope(role) }),
      ]);
      const getVal = <T,>(idx: number, fallback: T, keepOnAbort?: T): T => {
        const r = settled[idx];
        if (r.status === "fulfilled") return r.value as T;
        if (isAbortLikeError(r.reason)) return (keepOnAbort ?? fallback) as T;
        if (import.meta.env.DEV) console.warn("[Dashibodi — kipimo kimeshindwa]", r.reason);
        return fallback;
      };
      const getErr = (idx: number): string | null => {
        const r = settled[idx];
        if (r.status === "fulfilled") return null;
        if (isAbortLikeError(r.reason)) return null;
        return String((r.reason as { message?: unknown } | null)?.message ?? r.reason ?? HAIJAPATIKANA_DATA_SW);
      };
      const failedCritical = settled.filter(
        (r) => r.status === "rejected" && !isAbortLikeError(r.reason)
      ).length;
      const auditErr = getErr(1);
      const securityErr = getErr(2);
      const wauminiErr = getErr(3);
      setDayosisi((prev) => getVal(0, [], prev));
      setAuditLogCount((prev) => getVal(1, 0, prev));
      setSecurityCounts((prev) => getVal(2, { directory: 0, visibilityRules: 0, rbacMatrixRows: 0 }, prev));
      setWauminiCounts((prev) => getVal(3, { families: 0, members: 0, activeMembers: 0, baptized: 0 }, prev));
      setMajimbo((prev) => getVal(4, [], prev));
      setMatawi((prev) => getVal(5, [], prev));
      setFedha((prev) => getVal(6, [], prev));
      setIncomeSources((prev) => getVal(7, [], prev));
      setIncomeManagement((prev) => getVal(8, [], prev));
      setViongozi((prev) => getVal(9, [], prev));
      setKpiLive((prevKpi) => {
        const baseKpi = getVal(10, emptyDashboardKpiSnapshot(), prevKpi);
        return {
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
          ...(wauminiErr
            ? {
                "kpi.church_families.count": wauminiErr,
                "kpi.church_members.count": wauminiErr,
                "kpi.church_members.count_active": wauminiErr,
                "kpi.church_members.count_baptized": wauminiErr,
              }
            : {}),
        },
      };
      });
      setKpiError(failedCritical >= settled.length ? DASHBOARD_KPI_LOAD_ERROR_SW : null);
    } catch (err) {
      reportError(err, "Dashibodi — vipimo");
      setKpiError(DASHBOARD_KPI_LOAD_ERROR_SW);
      setKpiLive(emptyDashboardKpiSnapshot());
    } finally {
      setKpiRefreshing(false);
      lastDashboardMetricsAtRef.current = Date.now();
    }
    });
  }, [reportError, role]);

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

  /** Orodha ya dayosisi kwa moduli zingine hata kabla hazijafungua Dashibodi (au baada ya kubofya haraka). */
  useEffect(() => {
    if (!getSupabase()) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchDayosisi();
        if (!cancelled) setDayosisi(rows);
      } catch (err) {
        if (!cancelled && !isAbortLikeError(err)) reportError(err, "Dayosisi — orodha");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportError]);

  const dashboardDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const globalRealtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const masterSettingsRealtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authInitialized || !authUser) return;
    if (!getSupabase()) {
      setAuditLogCount(0);
      setSecurityCounts({ directory: 0, visibilityRules: 0, rbacMatrixRows: 0 });
      setWauminiCounts({ families: 0, members: 0, activeMembers: 0, baptized: 0 });
      setMajimbo([]);
      setMatawi([]);
      return;
    }
    if (activeModule !== "dashboard") return;

    let cancelled = false;
    void loadDashboardMetrics();

    if (!isSupabaseRealtimeEnabled()) {
      const onVisibility = () => {
        if (document.visibilityState !== "visible" || cancelled) return;
        const hiddenMs = lastResumeHiddenMsRef.current;
        const since = Date.now() - lastDashboardMetricsAtRef.current;
        if (hiddenMs > 0 && hiddenMs < VISIBILITY_SKIP_HIDDEN_MS && since < METRICS_RECENT_FETCH_MS) return;
        void loadDashboardMetrics();
      };
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        cancelled = true;
        document.removeEventListener("visibilitychange", onVisibility);
      };
    }

    const scheduleReload = () => {
      if (dashboardDebounceRef.current) clearTimeout(dashboardDebounceRef.current);
      dashboardDebounceRef.current = setTimeout(() => {
        dashboardDebounceRef.current = null;
        if (!cancelled) void loadDashboardMetrics();
      }, 400);
    };

    const client = getSupabase()!;
    const channel = client
      .channel("portal-dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "church_members" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "church_families" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "dayosisi" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "audit_logs" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "portal_directory_profiles" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "portal_visibility_rules" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "portal_module_matrix" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "church_jimbo" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "church_tawi" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "church_finance_entries" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "church_income_sources" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "church_income_lines" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "church_viongozi" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "national_leadership_profiles" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "portal_domain_entities" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "gallery" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "news_posts" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "videos" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "audios" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "sermons" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_sessions" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_records" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "file_manager_items" }, scheduleReload)
      .subscribe();

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !cancelled) void loadDashboardMetrics();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (dashboardDebounceRef.current) clearTimeout(dashboardDebounceRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      void client.removeChannel(channel);
    };
  }, [activeModule, loadDashboardMetrics, authInitialized, authUser]);

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

  /**
   * Global realtime sync (all modules):
   * Any change in public schema triggers a debounced refresh of shared datasets
   * and dispatches the cross-module reload event used by dashboard/widgets.
   */
  useEffect(() => {
    if (!authInitialized || !authUser) return;
    if (!getSupabase()) return;
    if (!isSupabaseRealtimeEnabled()) return;

    let cancelled = false;
    const client = getSupabase()!;
    const scheduleGlobalRefresh = () => {
      if (globalRealtimeDebounceRef.current) clearTimeout(globalRealtimeDebounceRef.current);
      globalRealtimeDebounceRef.current = setTimeout(() => {
        globalRealtimeDebounceRef.current = null;
        if (cancelled) return;
        dispatchPortalReloadMetrics();
        void loadDashboardMetrics();
      }, 900);
    };

    let channel = client.channel("portal-global-live-sync");
    for (const table of PORTAL_GLOBAL_REALTIME_TABLES) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, scheduleGlobalRefresh);
    }
    channel.subscribe();

    return () => {
      cancelled = true;
      if (globalRealtimeDebounceRef.current) clearTimeout(globalRealtimeDebounceRef.current);
      void client.removeChannel(channel);
    };
  }, [
    authInitialized,
    authUser,
    loadDashboardMetrics,
    loadIncomeModuleData,
    loadFinanceEntries,
    loadViongoziList,
    loadMuundoLists,
  ]);

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

  const visibleModules = useMemo(() => modules.filter((m) => canPortalViewModule(m.key)), [canPortalViewModule]);
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

  const syncPortalUrl = useCallback((moduleKey: string, submodule: string) => {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("module", moduleKey);
      url.searchParams.set("submodule", submodule);
      const qs = url.searchParams.toString();
      window.history.replaceState(null, "", `${url.pathname}${qs ? `?${qs}` : ""}`);
    } catch {
      /* ignore */
    }
  }, []);

  const selectModule = useCallback(
    (moduleKey: string, submodule: string) => {
      const resolvedSub = coerceSubmoduleForModule(moduleKey, submodule);
      if (!canLeaveDraftScope(moduleKey, resolvedSub)) return;
      setActiveModule(moduleKey);
      setActiveSubmodule(resolvedSub);
      setExpanded((p) => ({ ...p, [moduleKey]: true }));
      setMobileOpen(false);
      syncPortalUrl(moduleKey, resolvedSub);
    },
    [canLeaveDraftScope, syncPortalUrl]
  );

  const urlBootRef = useRef(false);
  useEffect(() => {
    if (!authInitialized || !authUser || rbacLoading || urlBootRef.current) return;
    urlBootRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const mk = params.get("module")?.trim();
    if (!mk || !canPortalViewModule(mk)) return;
    const mod = modules.find((m) => m.key === mk);
    const rawSm = params.get("submodule")?.trim() || mod?.submodules[0] || "";
    const sm = coerceSubmoduleForModule(mk, rawSm || undefined);
    selectModule(mk, sm);
  }, [authInitialized, authUser, rbacLoading, canPortalViewModule, selectModule]);

  const reloadMetricsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onReloadMetrics = (ev: Event) => {
      const immediate = Boolean((ev as CustomEvent<{ immediate?: boolean }>).detail?.immediate);
      const ms = immediate ? 0 : 380;
      if (reloadMetricsDebounceRef.current) clearTimeout(reloadMetricsDebounceRef.current);
      reloadMetricsDebounceRef.current = setTimeout(() => {
        reloadMetricsDebounceRef.current = null;
        void loadDashboardMetrics();
      }, ms);
    };
    window.addEventListener(KMT_PORTAL_RELOAD_METRICS_EVENT, onReloadMetrics);
    return () => {
      window.removeEventListener(KMT_PORTAL_RELOAD_METRICS_EVENT, onReloadMetrics);
      if (reloadMetricsDebounceRef.current) clearTimeout(reloadMetricsDebounceRef.current);
    };
  }, [loadDashboardMetrics]);

  useEffect(() => {
    const onNavigate = (ev: Event) => {
      const detail = (ev as CustomEvent<{ moduleKey?: string; submodule?: string; recordId?: string }>).detail;
      const mk = detail?.moduleKey?.trim();
      if (!mk || !canPortalViewModule(mk)) return;
      const mod = modules.find((m) => m.key === mk);
      const rawSm = detail?.submodule?.trim() || mod?.submodules[0] || "";
      const sm = coerceSubmoduleForModule(mk, rawSm || undefined);
      selectModule(mk, sm);
      const rid = detail?.recordId?.trim();
      if (rid) {
        requestAnimationFrame(() => setHighlightRecordId(rid));
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

  return (
    <div className="flex h-screen flex-col bg-[#F3F6FA]" style={{ height: "100dvh" }}>
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
        />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col" data-portal-main>
          {!online ? (
            <div className="border-b border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
              Uko offline. Baadhi ya huduma (auth/sync) zinahitaji intaneti.
            </div>
          ) : null}
          <MaintenanceBanner site={site} />
          <Topbar
            title={activeSubmodule || "Dashibodi Kuu"}
            onOpenMobileSidebar={() => setMobileOpen(true)}
            onNavigateToModule={(moduleKey, submodule) => {
              selectModule(moduleKey, submodule ?? "");
            }}
            canBack={canSubBack}
          />
          <div
            id="portal-main-scroll"
            tabIndex={-1}
            className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto overscroll-y-contain p-3 pb-[max(5rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] focus:outline-none sm:p-4"
          >
            {authInitialized && authUser && visibleModules.length > 0 ? (
              <PortalProjectNotesRibbon show />
            ) : null}
            {noModuleRbac ? (
              <div className="mb-4">
                <NoModuleAccessNotice />
              </div>
            ) : null}
            <Suspense fallback={<ModuleLoadingFallback />}>
              {activeModule === "dashboard" ? (
                <Dashboard
                  submodule={activeSubmodule}
                  dayosisi={dayosisi}
                  majimbo={majimbo}
                  matawi={matawi}
                  viongozi={viongozi}
                  fedha={fedha}
                  incomeManagement={incomeManagement}
                  auditLogCount={auditLogCount}
                  securityCounts={securityCounts}
                  wauminiCounts={wauminiCounts}
                  kpiLive={kpiLive}
                  kpiRefreshing={kpiRefreshing}
                  kpiError={kpiError}
                />
              ) : (
                <ModulePage
                  moduleKey={activeModule}
                  submodule={activeSubmodule}
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
            </Suspense>
          </div>
          <PortalAutoDraftRecovery scope={draftScope} rootId="portal-main-scroll" enabled={authInitialized && Boolean(authUser)} />
          <SiteFooter site={site} about={about} />
        </main>
      </div>
      <CookieConsentBanner site={site} />
    </div>
  );
}
