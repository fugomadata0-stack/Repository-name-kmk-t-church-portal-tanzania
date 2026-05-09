import { useEffect, useMemo, useState } from "react";
import { Bell, ShieldAlert, Activity, Siren } from "lucide-react";
import { GradientKpiCard } from "../components/common/GradientKpiCard";
import { PendingApprovalsDashboard } from "../components/dashboard/PendingApprovalsDashboard";
import { modules } from "../data/portalModules";
import { usePortal } from "../context/PortalContext";
import { resolvePortalDisplayName, resolvePortalSubtitle } from "../lib/settingsDisplay";
import { fetchChurchIdentityOptional, fetchSystemSettingsOptional } from "../services/settingsTablesService";
import type { ChurchIdentityRow, SystemSettingsRow } from "../services/settingsTablesService";
import { formatMoneyTz } from "../lib/money";
import { HAKUNA_DATA_BADO_SW } from "../lib/supabaseUiMessages";
import type { DayosisiRecord, FedhaRecord, IncomeManagementRecord, JimboRecord, KiongoziRecord, TawiRecord } from "../types";
import { safeArray } from "../lib/safe";
import type { DashboardKpiSnapshot } from "../services/dashboardKpiAggregatesService";
import { fetchAuditLogs, toTableRows } from "../services/auditLogService";
import { fetchNotificationsWithReadState } from "../services/notificationsService";
import { fetchSystemAlerts, syncSmartAlerts } from "../services/alertsService";
import type { PortalNotificationRow, SystemAlertRow } from "../types";
import { getSupabase, isSupabaseRealtimeEnabled } from "../lib/supabaseClient";
import { priorityMeta } from "../components/notifications/notificationUi";

const fedhaDatePrefix10 = (value: unknown): string | null => {
  const raw =
    typeof value === "string"
      ? value
      : value && typeof value === "object"
        ? String(
            (value as { tarehe?: unknown }).tarehe ??
              (value as { date?: unknown }).date ??
              (value as { created_at?: unknown }).created_at ??
              (value as { createdAt?: unknown }).createdAt ??
              ""
          )
        : "";

  const trimmed = raw.trim();
  return trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed || null;
};

type DashMode = "overview" | "kpi" | "alerts" | "activity" | "pending";

function resolveDashMode(submodule: string | undefined): DashMode {
  const s = (submodule ?? "Overview").trim();
  if (s === "KPI Cards") return "kpi";
  if (s === "Alerts") return "alerts";
  if (s === "Recent Activity") return "activity";
  if (s === "Pending Approvals") return "pending";
  return "overview";
}

interface Props {
  /** Kutoka menyu ya Dashibodi — huonyesha sehemu husika badala ya ukurasa mmoja usiobadilika */
  submodule?: string;
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
  viongozi: KiongoziRecord[];
  fedha: FedhaRecord[];
  incomeManagement: IncomeManagementRecord[];
  auditLogCount?: number;
  /** Hesabu kutoka jedwali za Usalama (Supabase) */
  securityCounts?: { directory: number; visibilityRules: number; rbacMatrixRows: number };
  /** Hesabu kutoka church_families / church_members */
  wauminiCounts?: { families: number; members: number; activeMembers: number; baptized: number };
  /** Vipimo vya KPI kutoka Supabase (hesabu kamili / sum, si sample ya safu). */
  kpiLive: DashboardKpiSnapshot;
  kpiRefreshing?: boolean;
  kpiError?: string | null;
}

export function Dashboard({
  submodule = "Overview",
  fedha,
  incomeManagement,
  auditLogCount = 0,
  securityCounts = { directory: 0, visibilityRules: 0, rbacMatrixRows: 0 },
  wauminiCounts = { families: 0, members: 0, activeMembers: 0, baptized: 0 },
  kpiLive,
  kpiRefreshing = false,
  kpiError = null,
}: Props) {
  const { about, site, canPortalViewModule, authInitialized, authUser } = usePortal();
  const mode = useMemo(() => resolveDashMode(submodule), [submodule]);
  const visibleModules = useMemo(() => modules.filter((m) => canPortalViewModule(m.key)), [canPortalViewModule]);
  const [identityRow, setIdentityRow] = useState<ChurchIdentityRow | null>(null);
  const [systemRow, setSystemRow] = useState<SystemSettingsRow | null>(null);
  const [recentAudit, setRecentAudit] = useState<ReturnType<typeof toTableRows>>([]);
  const [liveNotifications, setLiveNotifications] = useState<PortalNotificationRow[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<SystemAlertRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [id, sys] = await Promise.all([fetchChurchIdentityOptional(), fetchSystemSettingsOptional()]);
      if (!cancelled) {
        setIdentityRow(id);
        setSystemRow(sys);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [about.church_name, about.abbreviation]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const logs = await fetchAuditLogs(8);
        if (!cancelled) setRecentAudit(toTableRows(logs).slice(0, 8));
      } catch {
        if (!cancelled) setRecentAudit([]);
      }
    })();
    const onReload = () => {
      void (async () => {
        try {
          const logs = await fetchAuditLogs(8);
          if (!cancelled) setRecentAudit(toTableRows(logs).slice(0, 8));
        } catch {
          if (!cancelled) setRecentAudit([]);
        }
      })();
    };
    window.addEventListener("kmt-portal-reload-metrics", onReload);
    return () => {
      cancelled = true;
      window.removeEventListener("kmt-portal-reload-metrics", onReload);
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    const loadLive = async () => {
      try {
        const [n, a] = await Promise.all([fetchNotificationsWithReadState(), fetchSystemAlerts("open")]);
        if (!cancelled) {
          setLiveNotifications(n.slice(0, 8));
          setLiveAlerts(a.slice(0, 8));
        }
      } catch {
        if (!cancelled) {
          setLiveNotifications([]);
          setLiveAlerts([]);
        }
      }
    };
    void loadLive();
    if (!isSupabaseRealtimeEnabled()) {
      return () => {
        cancelled = true;
      };
    }
    if (!authInitialized || !authUser) {
      return () => {
        cancelled = true;
      };
    }
    const client = getSupabase();
    if (!client) return () => { cancelled = true; };
    const ch = client
      .channel("dashboard-live-center")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => void loadLive())
      .on("postgres_changes", { event: "*", schema: "public", table: "notification_reads" }, () => void loadLive())
      .on("postgres_changes", { event: "*", schema: "public", table: "system_alerts" }, () => void loadLive())
      .subscribe();
    return () => {
      cancelled = true;
      void client.removeChannel(ch);
    };
  }, [authInitialized, authUser]);
  const pending = kpiLive.pendingRecordsCrossModule;
  const incomplete = kpiLive.incompleteLeadersCount;
  const pendingVerification = kpiLive.pendingVerificationCount;
  const unposted = kpiLive.unpostedCollectionsCount;
  const failedLoginsRecent = liveNotifications.filter((n) => n.type === "auth" && n.priority !== "success").length;
  const realtimeState = typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline";

  const heroTitle = resolvePortalDisplayName(about, identityRow, systemRow);
  const heroAbbr = resolvePortalSubtitle(about, identityRow);

  const pendingVerifLabel =
    kpiLive.pendingVerificationSum > 0
      ? `${kpiLive.pendingVerificationCount} · TZS ${formatMoneyTz(kpiLive.pendingVerificationSum)}`
      : String(kpiLive.pendingVerificationCount);
  const pendingApprIncLabel =
    kpiLive.pendingApprovalIncomeSum > 0
      ? `${kpiLive.pendingApprovalIncomeCount} · TZS ${formatMoneyTz(kpiLive.pendingApprovalIncomeSum)}`
      : String(kpiLive.pendingApprovalIncomeCount);
  const unpostedLabel =
    kpiLive.unpostedCollectionsSum > 0
      ? `${kpiLive.unpostedCollectionsCount} · TZS ${formatMoneyTz(kpiLive.unpostedCollectionsSum)}`
      : String(kpiLive.unpostedCollectionsCount);
  const kpiFailedKeys = Object.keys(kpiLive.failedKpis ?? {});
  const failedValue = (value: string | number, keys: string[]): string | number =>
    keys.some((k) => kpiFailedKeys.includes(k)) ? "Haijapatikana" : value;

  const cards: readonly (readonly [string, string | number, string])[] = [
    ["Jumla ya Dayosisi", failedValue(kpiLive.dayosisiCount, ["kpi.dayosisi.count"]), "from-blue-600 to-blue-800"],
    ["Jumla ya Majimbo", failedValue(kpiLive.majimboCount, ["kpi.church_jimbo.count"]), "from-slate-700 to-slate-900"],
    ["Jumla ya Matawi / Vituo", failedValue(kpiLive.matawiCount, ["kpi.church_tawi.count"]), "from-amber-500 to-yellow-700"],
    ["Jumla ya Viongozi", failedValue(kpiLive.viongoziCount, ["kpi.church_viongozi.count"]), "from-emerald-600 to-emerald-800"],
    ["KMK(T) Viongozi wa Ngazi Kuu", kpiLive.viongoziNgaziKuuCount, "from-[#0B1F3A] to-[#123C69]"],
    ["Viongozi wa Dayosisi", kpiLive.viongoziDayosisiCount, "from-blue-700 to-indigo-800"],
    ["Viongozi wa Majimbo", kpiLive.viongoziMajimboCount, "from-cyan-700 to-blue-900"],
    ["Viongozi wa Matawi/Vituo", kpiLive.viongoziMatawiCount, "from-sky-600 to-indigo-700"],
    ["Active Leaders", kpiLive.viongoziActiveCount, "from-emerald-700 to-teal-900"],
    ["Pending Leaders", kpiLive.viongoziPendingCount, "from-amber-600 to-orange-700"],
    ["Expiring Terms", kpiLive.viongoziExpiringTermsCount, "from-rose-600 to-red-700"],
    ["Jumla ya Waumini", String(wauminiCounts.members), "from-purple-600 to-indigo-700"],
    ["Jumla ya Jumuiya", kpiLive.jumuiyaCount, "from-rose-600 to-rose-800"],
    ["Jumla ya Idara", kpiLive.idaraCount, "from-teal-600 to-teal-800"],
    ["Jumla ya Huduma", kpiLive.hudumaCount, "from-sky-600 to-blue-800"],
    ["Jumla ya Taasisi", kpiLive.taasisiCount, "from-orange-500 to-orange-700"],
    [
      "Active Structures",
      failedValue(kpiLive.activeStructuresCount, ["kpi.church_structure_entities.count_active"]),
      "from-emerald-600 to-green-800",
    ],
    [
      "Pending Structures",
      failedValue(kpiLive.pendingStructuresCount, ["kpi.church_structure_entities.count_pending"]),
      "from-amber-600 to-orange-700",
    ],
    [
      "Mahudhurio ya Leo",
      failedValue(kpiLive.attendanceTodayCount, ["kpi.attendance_sessions.count_today"]),
      "from-[#0B1F3A] to-[#123C69]",
    ],
    [
      "Mahudhurio ya Wiki",
      failedValue(kpiLive.attendanceWeekCount, ["kpi.attendance_sessions.count_week"]),
      "from-indigo-600 to-indigo-800",
    ],
    [
      "Mahudhurio ya Mwezi",
      failedValue(kpiLive.attendanceMonthCount, ["kpi.attendance_sessions.count_month"]),
      "from-cyan-600 to-blue-800",
    ],
    [
      "Visitors (Mwezi)",
      failedValue(kpiLive.attendanceVisitorsMonth, ["kpi.attendance_sessions.sum_visitors_month"]),
      "from-[#D4AF37] to-amber-700",
    ],
    ["Jumla ya Nyaraka", failedValue(kpiLive.documentsCount, ["kpi.documents.count"]), "from-[#0B1F3A] to-[#123C69]"],
    [
      "Total Finance Sources",
      failedValue(kpiLive.totalFinanceSources, ["kpi.church_income_sources.count_all"]),
      "from-[#0B1F3A] to-[#1F3A5F]",
    ],
    [
      "Active Finance Sources",
      failedValue(kpiLive.activeFinanceSources, ["kpi.church_income_sources.count_active"]),
      "from-emerald-600 to-emerald-800",
    ],
    [
      "Custom Finance Sources",
      failedValue(kpiLive.customFinanceSources, ["kpi.church_income_sources.count_custom"]),
      "from-indigo-600 to-indigo-800",
    ],
    [
      "Restricted Funds Count",
      failedValue(kpiLive.restrictedFundsCount, ["kpi.church_income_sources.count_restricted"]),
      "from-amber-600 to-yellow-800",
    ],
    [
      "Mapato ya Mwezi (TZ)",
      failedValue(`TZS ${formatMoneyTz(kpiLive.mapatoFedhaMweziMapato)}`, ["kpi.church_finance_entries.sum_mapato_month_all"]),
      "from-indigo-600 to-indigo-800",
    ],
    [
      "Matumizi ya Mwezi (TZ)",
      failedValue(`TZS ${formatMoneyTz(kpiLive.matumiziFedhaMwezi)}`, ["kpi.church_finance_entries.sum_matumizi_month"]),
      "from-green-600 to-green-800",
    ],
    ["Pending Approvals", pending, "from-pink-600 to-rose-700"],
    ["Rekodi za Audit (jumla)", String(auditLogCount), "from-zinc-700 to-zinc-900"],
    ["Watumiaji — directory", String(securityCounts.directory), "from-red-700 to-rose-900"],
    ["Sheria za mwonekano", String(securityCounts.visibilityRules), "from-red-600 to-red-800"],
    ["Seli za RBAC (matrix)", String(securityCounts.rbacMatrixRows), "from-rose-700 to-pink-900"],
    ["System Health Alerts (Open)", liveAlerts.length, "from-rose-700 to-red-900"],
    ["Failed Logins (Recent)", failedLoginsRecent, "from-amber-600 to-orange-800"],
    ["Realtime Sync Status", realtimeState, "from-cyan-700 to-blue-900"],
    ["Incomplete Profiles", incomplete, "from-cyan-600 to-cyan-800"],
    ["Jumla ya Mapato Leo", `TZS ${formatMoneyTz(kpiLive.mapatoLeoTotal)}`, "from-blue-700 to-indigo-900"],
    ["Jumla ya Mapato Wiki Hii", `TZS ${formatMoneyTz(kpiLive.mapatoWikiTotal)}`, "from-slate-700 to-slate-900"],
    ["Jumla ya Mapato Mwezi Huu", `TZS ${formatMoneyTz(kpiLive.mapatoIncomeMwezi)}`, "from-amber-500 to-yellow-700"],
    ["Jumla ya Zaka", `TZS ${formatMoneyTz(kpiLive.jumlaZakaMwezi)}`, "from-emerald-600 to-emerald-800"],
    ["Jumla ya Sadaka", `TZS ${formatMoneyTz(kpiLive.jumlaSadakaMwezi)}`, "from-purple-600 to-indigo-700"],
    ["Jumla ya Ujenzi", `TZS ${formatMoneyTz(kpiLive.jumlaUjenziMwezi)}`, "from-amber-500 to-amber-700"],
    ["Jumla ya Matoleo ya Makusudi", `TZS ${formatMoneyTz(kpiLive.jumlaMatoleoMakusudiMwezi)}`, "from-rose-600 to-rose-800"],
    ["Jumla ya Donations", `TZS ${formatMoneyTz(kpiLive.jumlaDonationsMwezi)}`, "from-teal-600 to-teal-800"],
    ["Pending Verifications", pendingVerifLabel, "from-orange-500 to-orange-700"],
    ["Pending Approvals (Income)", pendingApprIncLabel, "from-indigo-600 to-indigo-800"],
    ["Restricted Funds Balance", `TZS ${formatMoneyTz(kpiLive.restrictedFundBalance)}`, "from-green-600 to-green-800"],
    ["Unposted Collections", unpostedLabel, "from-pink-600 to-rose-700"],
    ["Budget vs Actual Income", kpiLive.budgetedVsActualLabel, "from-cyan-600 to-cyan-800"],
    ["Growth % vs Last Month", kpiLive.growthVsLastMonthLabel, "from-blue-500 to-cyan-700"],
    ["Year to Date Income", `TZS ${formatMoneyTz(kpiLive.yearToDateIncomeTotal)}`, "from-fuchsia-600 to-purple-800"],
  ];

  const recentFedhaRows = useMemo(() => {
    return [...safeArray(fedha)]
      .sort((a, b) => String(b.tarehe).localeCompare(String(a.tarehe)))
      .slice(0, 14);
  }, [fedha]);

  const recentIncomeRows = useMemo(() => {
    const okDate = (x: IncomeManagementRecord) =>
      Boolean(x.collectionDate && String(x.collectionDate).length >= 10);
    return [...safeArray(incomeManagement)]
      .filter(okDate)
      .sort((a, b) => String(b.collectionDate).localeCompare(String(a.collectionDate)))
      .slice(0, 14);
  }, [incomeManagement]);

  const alertItems = useMemo(() => {
    const items: { label: string; count: number }[] = [];
    if (pending > 0) items.push({ label: "Rekodi zenye hali Pending (muundo / fedha / n.k.)", count: pending });
    if (incomplete > 0) items.push({ label: "Viongozi wasio kamili / Needs Review", count: incomplete });
    if (unposted > 0) items.push({ label: "Makusanyo yasiyochapishwa kwenye ledger", count: unposted });
    if (pendingVerification > 0) items.push({ label: "Mapato yanayosubiri uhakiki / idhini", count: pendingVerification });
    return items;
  }, [pending, incomplete, unposted, pendingVerification]);

  const showWaumini = mode === "overview" || mode === "alerts";
  const showModuleShortcuts = mode === "overview" || mode === "activity";
  const showMapatoKat = mode === "overview" || mode === "activity";
  const mapatoKwaKategoriaMwezi = kpiLive.mapatoKwaKategoriaMwezi;
  const incomeBySourceMwezi = kpiLive.incomeBySourceMwezi;
  const showHero = mode === "overview" || mode === "kpi";
  const showKpiGrid = mode === "overview" || mode === "kpi";

  /** Muundo tupu halisi (hakuna hitilafu ya kupakia) — si kosa la mtandao. */
  const kpiCoreStructurallyEmpty = useMemo(() => {
    if (kpiError) return false;
    return (
      kpiLive.dayosisiCount === 0 &&
      kpiLive.majimboCount === 0 &&
      kpiLive.matawiCount === 0 &&
      kpiLive.viongoziCount === 0 &&
      kpiLive.jumuiyaCount === 0 &&
      wauminiCounts.members === 0
    );
  }, [
    kpiError,
    kpiLive.dayosisiCount,
    kpiLive.majimboCount,
    kpiLive.matawiCount,
    kpiLive.viongoziCount,
    kpiLive.jumuiyaCount,
    wauminiCounts.members,
  ]);
  const showAlertsPanel = mode === "alerts";
  const showRecentPanel = mode === "activity";

  const desiredSmartAlerts = useMemo(() => {
    const out: Parameters<typeof syncSmartAlerts>[0] = [];
    if (pending > 0) {
      out.push({
        type: "auto_rule.finance.pending_approvals",
        module: "fedha",
        title: "Pending finance approvals",
        message: `Kuna approvals ${pending} zinazohitaji hatua.`,
        priority: pending >= 10 ? "critical" : "warning",
        action_url: "/portal?module=dashboard&submodule=Pending%20Approvals",
        metadata: { count: pending },
      });
    }
    if (kpiLive.mapatoIncomeMwezi <= 0) {
      out.push({
        type: "auto_rule.finance.low_income",
        module: "mapato_income",
        title: "Low income warning",
        message: "Mapato ya mwezi huu yapo chini ya kiwango (au sifuri).",
        priority: "critical",
        action_url: "/portal?module=mapato_income",
      });
    }
    if (kpiLive.restrictedFundsCount > 0 && kpiLive.restrictedFundBalance < 0) {
      out.push({
        type: "auto_rule.finance.restricted_misuse",
        module: "fedha",
        title: "Restricted fund misuse attempt",
        message: "Balance ya restricted funds imeingia hasi; hakiki matumizi mara moja.",
        priority: "critical",
        action_url: "/portal?module=fedha",
      });
    }
    if (incomplete > 0) {
      out.push({
        type: "auto_rule.content.missing_reports",
        module: "viongozi",
        title: "Missing reports",
        message: `Kuna profiles ${incomplete} zisizo kamili zinazohitaji taarifa.`,
        priority: "warning",
        action_url: "/portal?module=viongozi",
      });
    }
    if (unposted > 0) {
      out.push({
        type: "auto_rule.content.failed_uploads",
        module: "fedha",
        title: "Unposted collections detected",
        message: `Makusanyo ${unposted} hayajachapishwa kwenye ledger.`,
        priority: "warning",
        action_url: "/portal?module=fedha",
      });
    }
    const failedLogins = liveNotifications.filter((n) => n.type === "auth" && n.priority !== "success").length;
    if (failedLogins > 0) {
      out.push({
        type: "auto_rule.system.failed_logins",
        module: "usalama",
        title: "Failed logins detected",
        message: `Kuna matukio ${failedLogins} ya login zilizofeli hivi karibuni.`,
        priority: failedLogins >= 5 ? "critical" : "warning",
        action_url: "/portal?module=usalama",
      });
    }
    const suspiciousPerms = recentAudit.filter((r) => {
      const action = String(r.action ?? "").toLowerCase();
      const moduleName = String(r.module ?? "").toLowerCase();
      return moduleName.includes("security") || action.includes("permission") || action.includes("role");
    }).length;
    if (suspiciousPerms > 0) {
      out.push({
        type: "auto_rule.system.suspicious_permissions",
        module: "usalama",
        title: "Suspicious permission changes",
        message: `Mabadiliko ${suspiciousPerms} ya role/permission yameonekana kwenye audit trail.`,
        priority: suspiciousPerms >= 3 ? "critical" : "warning",
        action_url: "/portal?module=usalama",
      });
    }
    if (kpiLive.matawiCount > 0 && wauminiCounts.activeMembers === 0) {
      out.push({
        type: "auto_rule.church.inactive_branches",
        module: "muundo",
        title: "Inactive branches warning",
        message: "Matawi yapo lakini hakuna waumini active; hakiki submissions za mwezi.",
        priority: "warning",
        action_url: "/portal?module=muundo",
      });
    }
    return out;
  }, [
    pending,
    kpiLive.mapatoIncomeMwezi,
    kpiLive.restrictedFundsCount,
    kpiLive.restrictedFundBalance,
    kpiLive.matawiCount,
    incomplete,
    unposted,
    liveNotifications,
    recentAudit,
    wauminiCounts.activeMembers,
  ]);

  useEffect(() => {
    void (async () => {
      try {
        await syncSmartAlerts(desiredSmartAlerts);
      } catch {
        // Smart alerts are best-effort.
      }
    })();
  }, [desiredSmartAlerts]);

  if (mode === "pending") {
    return <PendingApprovalsDashboard incomeManagement={incomeManagement} fedha={fedha} />;
  }

  return (
    <div className="space-y-4">
      {showWaumini ? (
      <section
        className="grid gap-3 rounded-2xl border border-emerald-900/30 bg-gradient-to-r from-[#064e3b] via-[#0f766e] to-[#064e3b] p-4 text-white shadow-lg sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Muhtasari wa waumini na familia"
      >
        <div className="rounded-xl border border-white/25 bg-black/15 px-4 py-3 shadow-inner">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-50">Familia</p>
          <p className="text-2xl font-bold tabular-nums text-white">{wauminiCounts.families}</p>
          <p className="text-xs font-medium text-emerald-50/95">church_families</p>
        </div>
        <div className="rounded-xl border border-white/25 bg-black/15 px-4 py-3 shadow-inner">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-50">Waumini wote</p>
          <p className="text-2xl font-bold tabular-nums text-white">{wauminiCounts.members}</p>
          <p className="text-xs font-medium text-emerald-50/95">church_members</p>
        </div>
        <div className="rounded-xl border border-white/25 bg-black/15 px-4 py-3 shadow-inner">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-50">Hali: hai</p>
          <p className="text-2xl font-bold tabular-nums text-white">{wauminiCounts.activeMembers}</p>
          <p className="text-xs font-medium text-emerald-50/95">membership_status = active</p>
        </div>
        <div className="rounded-xl border border-white/25 bg-black/15 px-4 py-3 shadow-inner">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-50">Waliobatizwa</p>
          <p className="text-2xl font-bold tabular-nums text-white">{wauminiCounts.baptized}</p>
          <p className="text-xs font-medium text-emerald-50/95">is_baptized = true</p>
        </div>
      </section>
      ) : null}

      {showModuleShortcuts ? (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg" aria-label="Moduli za mfumo">
        <h2 className="text-sm font-bold text-[#0B1F3A]">Moduli za mfumo</h2>
        <p className="mt-1 text-xs text-slate-700">
          Hizi ndizo moduli unazoweza kufungua kwa jukumu lako (RBAC). Kama &ldquo;Misaada ya Kanisa&rdquo; haipo hapa, angalia{" "}
          <strong>Usalama → Permissions</strong> au endesha migration ya <code className="rounded bg-slate-100 px-1 text-[11px]">aid_management</code> kwenye Supabase.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {visibleModules.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("kmt-portal-navigate", {
                    detail: { moduleKey: m.key, submodule: m.submodules[0] ?? "Overview" },
                  })
                )
              }
              className={`max-w-full truncate rounded-xl bg-gradient-to-r ${m.color} px-3 py-2 text-left text-xs font-semibold text-white shadow-sm hover:opacity-95`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>
      ) : null}

      {showMapatoKat && mapatoKwaKategoriaMwezi.length > 0 ? (
        <section
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
          aria-label="Mapato kwa kategoria — mwezi huu"
        >
          <h2 className="text-sm font-bold text-[#0B1F3A]">Mapato kwa kategoria (mwezi huu — Supabase)</h2>
          <p className="mt-1 text-xs text-[#475569]">
            Fedha (kategoria) + Mapato (aina kuu / chanzo), hali zilizokubaliwa; hadi safu 15,000 kwa kila chanzo.
            {kpiLive.categoryBreakdownTruncated ? (
              <span className="mt-1 block font-semibold text-amber-800">
                Tahadhari: data zimefikia kikomo — hesabu ya kategoria inaweza kuwa sehemu tu.
              </span>
            ) : null}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {mapatoKwaKategoriaMwezi.map(({ label, amount }) => (
              <span
                key={label}
                className="inline-flex max-w-[280px] items-center gap-2 truncate rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-950"
                title={label}
              >
                <span className="truncate font-medium">{label}</span>
                <span className="shrink-0 font-semibold tabular-nums text-emerald-900">TZS {formatMoneyTz(amount)}</span>
              </span>
            ))}
          </div>
        </section>
      ) : null}
      {showMapatoKat && incomeBySourceMwezi.length > 0 ? (
        <section
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
          aria-label="Mapato kwa source — mwezi huu"
        >
          <h2 className="text-sm font-bold text-[#0B1F3A]">Mapato kwa source (mwezi huu — Supabase)</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {incomeBySourceMwezi.map(({ label, amount }) => (
              <span
                key={label}
                className="inline-flex max-w-[280px] items-center gap-2 truncate rounded-full border border-[#D4AF37]/40 bg-[#0B1F3A]/5 px-3 py-1 text-xs text-[#0B1F3A]"
                title={label}
              >
                <span className="truncate font-medium">{label}</span>
                <span className="shrink-0 font-semibold tabular-nums">TZS {formatMoneyTz(amount)}</span>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {showAlertsPanel ? (
        <section
          className="rounded-2xl border border-rose-200 bg-white p-4 shadow-lg"
          aria-label="Tahadhari na foleni"
        >
          <h2 className="text-sm font-bold text-[#0B1F3A]">Tahadhari na foleni</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-800">
            {alertItems.length === 0 ? (
              <li>Hakuna tahadhari za kiotomatiki kwa vigezo vya sasa.</li>
            ) : (
              alertItems.map((a) => (
                <li key={a.label}>
                  <strong className="tabular-nums">{a.count}</strong> — {a.label}
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}
      {showAlertsPanel ? (
        <section className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-lg">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#0B1F3A]"><Bell className="h-4 w-4 text-[#D4AF37]" /> Notifications</h2>
            <div className="mt-2 space-y-2">
              {liveNotifications.length === 0 ? <p className="text-xs text-slate-500">Hakuna notifications mpya.</p> : liveNotifications.map((n) => (
                <div key={n.id} className="rounded-xl border border-slate-200 p-2">
                  <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                  <p className="line-clamp-2 text-xs text-slate-600">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-white p-4 shadow-lg">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#0B1F3A]"><Siren className="h-4 w-4 text-rose-700" /> Recent alerts</h2>
            <div className="mt-2 space-y-2">
              {liveAlerts.length === 0 ? <p className="text-xs text-slate-500">Hakuna alerts wazi.</p> : liveAlerts.map((a) => {
                const pm = priorityMeta(a.priority);
                return (
                  <div key={a.id} className="rounded-xl border border-slate-200 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900">{a.title}</p>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${pm.chip}`}>{pm.label}</span>
                    </div>
                    <p className="line-clamp-2 text-xs text-slate-600">{a.message}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {showRecentPanel ? (
        <section className="grid gap-3 lg:grid-cols-3" aria-label="Shughuli za hivi karibuni">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
            <h2 className="text-sm font-bold text-[#0B1F3A]">Fedha — mistari ya hivi karibuni</h2>
            <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white text-xs shadow-inner">
              <table className="w-full min-w-[280px] text-left">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 text-slate-900">
                  <tr>
                    <th className="px-2 py-2 font-semibold">Tarehe</th>
                    <th className="px-2 py-2 font-semibold">Aina</th>
                    <th className="px-2 py-2 font-semibold">Kiasi</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {recentFedhaRows.length === 0 ? (
                    <tr>
                      <td className="px-2 py-4 text-center text-slate-700" colSpan={3}>
                        Hakuna rekodi za fedha.
                      </td>
                    </tr>
                  ) : (
                    recentFedhaRows.map((r) => (
                      <tr key={r.id} className="border-t border-slate-200 odd:bg-slate-50/80">
                        <td className="px-2 py-2 tabular-nums text-slate-900">{fedhaDatePrefix10(r) ?? "—"}</td>
                        <td className="px-2 py-2 text-slate-800">{r.aina ?? "—"}</td>
                        <td className="px-2 py-2 font-semibold tabular-nums text-[#0B1F3A]">TZS {formatMoneyTz(Number(r.kiasi) || 0)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
            <h2 className="text-sm font-bold text-[#0B1F3A]">Mapato — mistari ya hivi karibuni</h2>
            <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white text-xs shadow-inner">
              <table className="w-full min-w-[280px] text-left">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 text-slate-900">
                  <tr>
                    <th className="px-2 py-2 font-semibold">Tarehe</th>
                    <th className="px-2 py-2 font-semibold">Chanzo</th>
                    <th className="px-2 py-2 font-semibold">Kiasi</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {recentIncomeRows.length === 0 ? (
                    <tr>
                      <td className="px-2 py-4 text-center text-slate-700" colSpan={3}>
                        Hakuna mistari ya mapato yenye tarehe.
                      </td>
                    </tr>
                  ) : (
                    recentIncomeRows.map((r) => (
                      <tr key={r.id} className="border-t border-slate-200 odd:bg-slate-50/80">
                        <td className="px-2 py-2 tabular-nums text-slate-900">
                          {r.collectionDate && String(r.collectionDate).length >= 10
                            ? String(r.collectionDate).slice(0, 10)
                            : "—"}
                        </td>
                        <td className="px-2 py-2 text-slate-800">{r.sourceName ?? "—"}</td>
                        <td className="px-2 py-2 font-semibold tabular-nums text-[#0B1F3A]">
                          TZS {(Number(r.amount) || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
            <h2 className="text-sm font-bold text-[#0B1F3A]">Matukio ya Hivi Karibuni</h2>
            <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white text-xs shadow-inner">
              <table className="w-full min-w-[280px] text-left">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 text-slate-900">
                  <tr>
                    <th className="px-2 py-2 font-semibold">User</th>
                    <th className="px-2 py-2 font-semibold">Action</th>
                    <th className="px-2 py-2 font-semibold">Module</th>
                    <th className="px-2 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {recentAudit.length === 0 ? (
                    <tr>
                      <td className="px-2 py-4 text-center text-slate-700" colSpan={4}>
                        Hakuna matukio ya audit bado.
                      </td>
                    </tr>
                  ) : (
                    recentAudit.map((r) => (
                      <tr key={r.id} className="border-t border-slate-200 odd:bg-slate-50/80">
                        <td className="px-2 py-2 text-slate-800">{r.performed_by_name}</td>
                        <td className="px-2 py-2 text-slate-800">{r.action}</td>
                        <td className="px-2 py-2 text-slate-800">{r.module}</td>
                        <td className="px-2 py-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.status === "success" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
      {showRecentPanel ? (
        <section className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#0B1F3A]"><ShieldAlert className="h-4 w-4" /> System health</h2>
            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              <li>Pending approvals: {pending}</li>
              <li>Failed logins: {liveNotifications.filter((n) => n.type === "auth" && n.priority !== "success").length}</li>
              <li>Open alerts: {liveAlerts.length}</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg lg:col-span-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#0B1F3A]"><Activity className="h-4 w-4" /> Realtime activity</h2>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {liveNotifications.slice(0, 6).map((n) => (
                <div key={n.id} className="rounded-xl border border-slate-200 px-2 py-1.5 text-xs">
                  <p className="font-semibold text-slate-900">{n.module} · {n.title}</p>
                  <p className="line-clamp-2 text-slate-600">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {showHero ? (
      <section className="relative overflow-hidden rounded-2xl border border-[#123C69]/50 bg-gradient-to-br from-[#0B1F3A] via-[#0f2744] to-[#123C69] p-5 text-white shadow-2xl">
        {site.hero_image_url ? (
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <img src={site.hero_image_url} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white drop-shadow md:text-2xl">
              {heroTitle || "Portal ya Kanisa — sanidi taarifa (Mipangilio → Kuhusu KMKT / Church Identity)"}
            </h1>
            <p className="text-base font-medium text-slate-100">OFISI YA NGAZI KUU · {heroAbbr || "—"}</p>
            {about.motto ? (
              <p className="mt-2 max-w-2xl text-sm italic text-[#F5E6B4]">&ldquo;{about.motto}&rdquo;</p>
            ) : null}
            <p className="mt-2 text-sm font-medium text-slate-100">Makao Makuu: {about.headquarters || "—"}</p>
          </div>
          {site.cross_image_url ? (
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-amber-400/50 bg-white/10 p-1 shadow-lg backdrop-blur">
              <img src={site.cross_image_url} alt="Msalaba" className="h-full w-full object-contain" />
            </div>
          ) : null}
        </div>
      </section>
      ) : null}
      {showKpiGrid && kpiError ? (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950 shadow-md"
          role="alert"
        >
          {kpiError}
        </div>
      ) : null}
      {showKpiGrid && kpiRefreshing ? (
        <p className="text-sm font-medium text-[#475569]" role="status" aria-live="polite">
          Inasasisha vipimo kutoka Supabase…
        </p>
      ) : null}
      {showKpiGrid && !kpiError && kpiFailedKeys.length > 0 ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Baadhi ya KPI hazijapatikana kwa sasa. Angalia Supabase.
        </div>
      ) : null}
      {showKpiGrid ? (
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([title, value, gradient]) => (
          <GradientKpiCard key={title} title={title} value={value} gradient={gradient} />
        ))}
      </section>
      ) : null}
      {showKpiGrid && !kpiError && !kpiRefreshing && kpiCoreStructurallyEmpty ? (
        <div
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-sm"
          role="status"
        >
          <p className="font-medium text-slate-900">{HAKUNA_DATA_BADO_SW}</p>
          <p className="mt-1 text-slate-600">Ongeza taarifa ili zionekane hapa (muundo, waumini, nk.).</p>
        </div>
      ) : null}
    </div>
  );
}
