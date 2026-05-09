import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { modules } from "../../data/portalModules";
import type { DayosisiRecord, FedhaRecord, IncomeManagementRecord, IncomeSourceRecord, JimboRecord, KiongoziRecord, TawiRecord } from "../../types";
import { usePortal } from "../../context/PortalContext";
import { NoModuleAccessNotice } from "../auth/NoModuleAccessNotice";
import { getSupabase } from "../../lib/supabaseClient";
import { useSiteDocumentMeta } from "../../hooks/useSiteDocumentMeta";
import { fetchAuditLogCount } from "../../services/auditLogService";
import { fetchPortalSecurityCounts } from "../../services/securityService";
import { fetchWauminiCounts } from "../../services/wauminiService";
import { fetchDayosisi } from "../../services/dayosisiService";
import { fetchChurchFinanceEntries } from "../../services/financeEntriesService";
import { fetchChurchIncomeLines, fetchChurchIncomeSources } from "../../services/incomeModuleService";
import { fetchChurchJimbo, fetchChurchTawi } from "../../services/muundoHierarchyService";
import { fetchChurchViongozi } from "../../services/viongoziService";
import {
  emptyDashboardKpiSnapshot,
  fetchDashboardKpiAggregates,
  type DashboardKpiSnapshot,
} from "../../services/dashboardKpiAggregatesService";
import { DASHBOARD_KPI_LOAD_ERROR_SW } from "../../lib/supabaseUiMessages";
import { CookieConsentBanner } from "./CookieConsentBanner";
import { MaintenanceBanner } from "./MaintenanceBanner";
import { SiteFooter } from "./SiteFooter";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
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
  const { pushToast, reportError, site, about, canPortalViewModule, noModuleRbac, authInitialized, authUser } = usePortal();
  useSiteDocumentMeta(site);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(modules.map((m) => [m.key, m.key === "dashboard"]))
  );
  const [activeModule, setActiveModule] = useState("dashboard");
  const [activeSubmodule, setActiveSubmodule] = useState("Overview");
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

  /** Hesabu + dayosisi za KPI za dashibodi — zote kutoka Supabase kwa wakati mmoja. */
  const loadDashboardMetrics = useCallback(async () => {
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
        fetchPortalSecurityCounts(),
        fetchWauminiCounts(),
        fetchChurchJimbo(),
        fetchChurchTawi(),
        fetchChurchFinanceEntries(),
        fetchChurchIncomeSources(),
        fetchChurchIncomeLines(),
        fetchChurchViongozi(),
        fetchDashboardKpiAggregates(),
      ]);
      const getVal = <T,>(idx: number, fallback: T): T => {
        const r = settled[idx];
        if (r.status === "fulfilled") return r.value as T;
        if (import.meta.env.DEV) console.warn("[Dashibodi — kipimo kimeshindwa]", r.reason);
        return fallback;
      };
      const failedCritical = settled.filter((r) => r.status === "rejected").length;
      setDayosisi(getVal(0, []));
      setAuditLogCount(getVal(1, 0));
      setSecurityCounts(getVal(2, { directory: 0, visibilityRules: 0, rbacMatrixRows: 0 }));
      setWauminiCounts(getVal(3, { families: 0, members: 0, activeMembers: 0, baptized: 0 }));
      setMajimbo(getVal(4, []));
      setMatawi(getVal(5, []));
      setFedha(getVal(6, []));
      setIncomeSources(getVal(7, []));
      setIncomeManagement(getVal(8, []));
      setViongozi(getVal(9, []));
      setKpiLive(getVal(10, emptyDashboardKpiSnapshot()));
      setKpiError(failedCritical >= settled.length ? DASHBOARD_KPI_LOAD_ERROR_SW : null);
    } catch (err) {
      reportError(err, "Dashibodi — vipimo");
      setKpiError(DASHBOARD_KPI_LOAD_ERROR_SW);
      setKpiLive(emptyDashboardKpiSnapshot());
    } finally {
      setKpiRefreshing(false);
    }
  }, [reportError]);

  const loadViongoziList = useCallback(async () => {
    if (!getSupabase()) {
      setViongozi([]);
      return;
    }
    try {
      const rows = await fetchChurchViongozi();
      setViongozi(rows);
    } catch (err) {
      reportError(err, "Viongozi — orodha");
      setViongozi([]);
    }
  }, [reportError]);

  const loadIncomeModuleData = useCallback(async () => {
    if (!getSupabase()) {
      setIncomeSources([]);
      setIncomeManagement([]);
      return;
    }
    try {
      const [src, lines] = await Promise.all([fetchChurchIncomeSources(), fetchChurchIncomeLines()]);
      setIncomeSources(src);
      setIncomeManagement(lines);
    } catch (err) {
      reportError(err, "Mapato — orodha");
      setIncomeSources([]);
      setIncomeManagement([]);
    }
  }, [reportError]);

  const loadFinanceEntries = useCallback(async () => {
    if (!getSupabase()) {
      setFedha([]);
      return;
    }
    try {
      const rows = await fetchChurchFinanceEntries();
      setFedha(rows);
    } catch (err) {
      reportError(err, "Fedha — orodha");
      setFedha([]);
    }
  }, [reportError]);

  /** Muundo bila kupitia Dashibodi (au kusasisha orodha baada ya kuingia Muundo). */
  const loadMuundoLists = useCallback(async () => {
    if (!getSupabase()) {
      setMajimbo([]);
      setMatawi([]);
      return;
    }
    try {
      const [j, t] = await Promise.all([fetchChurchJimbo(), fetchChurchTawi()]);
      setMajimbo(j);
      setMatawi(t);
    } catch (err) {
      reportError(err, "Muundo — orodha");
      setMajimbo([]);
      setMatawi([]);
    }
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
        if (!cancelled) reportError(err, "Dayosisi — orodha");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportError]);

  const dashboardDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (document.visibilityState === "visible" && !cancelled) void loadIncomeModuleData();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (incomeDebounceRef.current) clearTimeout(incomeDebounceRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      void client.removeChannel(channel);
    };
  }, [activeModule, loadIncomeModuleData, authInitialized, authUser]);

  const visibleModules = useMemo(() => modules.filter((m) => canPortalViewModule(m.key)), [canPortalViewModule]);

  useEffect(() => {
    const onReloadMetrics = () => {
      void loadDashboardMetrics();
      void loadIncomeModuleData();
      void loadFinanceEntries();
      void loadViongoziList();
    };
    window.addEventListener("kmt-portal-reload-metrics", onReloadMetrics);
    return () => window.removeEventListener("kmt-portal-reload-metrics", onReloadMetrics);
  }, [loadDashboardMetrics, loadIncomeModuleData, loadFinanceEntries, loadViongoziList]);

  useEffect(() => {
    const onNavigate = (ev: Event) => {
      const detail = (ev as CustomEvent<{ moduleKey?: string; submodule?: string }>).detail;
      const mk = detail?.moduleKey?.trim();
      if (!mk || !canPortalViewModule(mk)) return;
      const mod = modules.find((m) => m.key === mk);
      const sm = detail?.submodule?.trim() || mod?.submodules[0] || "Overview";
      setActiveModule(mk);
      setActiveSubmodule(sm);
      setExpanded((p) => ({ ...p, [mk]: true }));
    };
    window.addEventListener("kmt-portal-navigate", onNavigate);
    return () => window.removeEventListener("kmt-portal-navigate", onNavigate);
  }, [canPortalViewModule]);

  useEffect(() => {
    if (noModuleRbac) {
      setActiveModule("dashboard");
      setActiveSubmodule("Overview");
      return;
    }
    if (activeModule === "dashboard" && !canPortalViewModule("dashboard")) {
      const first = modules.find((m) => canPortalViewModule(m.key));
      if (first) {
        setActiveModule(first.key);
        setActiveSubmodule(first.submodules[0] ?? "Overview");
      }
      return;
    }
    if (activeModule !== "dashboard" && !canPortalViewModule(activeModule)) {
      pushToast("Huna ruhusa ya moduli hii.", "error");
      if (canPortalViewModule("dashboard")) {
        setActiveModule("dashboard");
        setActiveSubmodule("Overview");
      } else {
        const first = modules.find((m) => canPortalViewModule(m.key));
        if (first) {
          setActiveModule(first.key);
          setActiveSubmodule(first.submodules[0] ?? "Overview");
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

  return (
    <div className="flex min-h-screen flex-col bg-[#F3F6FA]">
      <a
        href="#portal-main-scroll"
        className="pointer-events-none fixed left-4 top-4 z-[300] -translate-y-[160%] rounded-xl bg-[#0f1e46] px-4 py-2.5 text-sm font-semibold text-white opacity-0 shadow-lg ring-2 ring-white/90 transition-transform duration-200 focus:pointer-events-auto focus:translate-y-0 focus:opacity-100 focus:outline-none"
      >
        Ruka hadi maudhui
      </a>
      <div className="flex min-h-0 flex-1">
        <Sidebar
          modules={visibleModules}
          activeModule={activeModule}
          activeSubmodule={activeSubmodule}
          expanded={expanded}
          onToggle={(k) => setExpanded((p) => ({ ...p, [k]: !p[k] }))}
          onSelect={(moduleKey, submodule) => {
            setActiveModule(moduleKey);
            setActiveSubmodule(submodule);
            setMobileOpen(false);
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
              setActiveModule(moduleKey);
              setActiveSubmodule(submodule ?? "Orodha");
              setExpanded((p) => ({ ...p, [moduleKey]: true }));
              setMobileOpen(false);
            }}
          />
          <div
            id="portal-main-scroll"
            tabIndex={-1}
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain p-3 pb-24 [-webkit-overflow-scrolling:touch] focus:outline-none sm:p-4"
          >
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
                  highlightRecordId={highlightRecordId}
                  onCrudSuccess={(action, meta) => {
                    window.dispatchEvent(new Event("kmt-portal-reload-metrics"));
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
          <SiteFooter site={site} about={about} />
        </main>
      </div>
      <CookieConsentBanner site={site} />
    </div>
  );
}
