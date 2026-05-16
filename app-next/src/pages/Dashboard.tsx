import { useEffect, useMemo, useState } from "react";
import { Bell, ShieldAlert, Activity, Siren, LayoutGrid, Building2 } from "lucide-react";
import { GradientKpiCard } from "../components/common/GradientKpiCard";
import { DashboardSubnav } from "../components/dashboard/DashboardSubnav";
import { EnterpriseCommandPanel } from "../components/dashboard/EnterpriseCommandPanel";
import { PendingApprovalsDashboard } from "../components/dashboard/PendingApprovalsDashboard";
import { modules } from "../data/portalModules";
import { usePortal } from "../context/PortalContext";
import { resolvePortalDisplayName, resolvePortalSubtitle } from "../lib/settingsDisplay";
import { fetchChurchIdentityOptional, fetchSystemSettingsOptional } from "../services/settingsTablesService";
import type { ChurchIdentityRow, SystemSettingsRow } from "../services/settingsTablesService";
import { formatMoneyTz } from "../lib/money";
import { HAKUNA_DATA_BADO_SW, HAIJAPATIKANA_DATA_SW } from "../lib/supabaseUiMessages";
import type { DayosisiRecord, FedhaRecord, IncomeManagementRecord, JimboRecord, KiongoziRecord, TawiRecord } from "../types";
import { safeArray } from "../lib/safe";
import type { DashboardKpiSnapshot } from "../services/dashboardKpiAggregatesService";
import { fetchAuditLogs, toTableRows } from "../services/auditLogService";
import { fetchNotificationsWithReadState } from "../services/notificationsService";
import { fetchSystemAlerts, syncSmartAlerts } from "../services/alertsService";
import type { PortalNotificationRow, SystemAlertRow } from "../types";
import { getSupabase, isSupabaseRealtimeEnabled } from "../lib/supabaseClient";
import { KMT_PORTAL_RELOAD_METRICS_EVENT } from "../lib/portalEvents";
import { priorityMeta } from "../components/notifications/notificationUi";
import { ResponsiveLazyImage } from "../components/common/ResponsiveLazyImage";
import {
  DASHBOARD_PENDING_APPROVALS_SUBMODULE,
  getDashboardDefaultSubmodule,
  getFirstSubmoduleForModule,
  normalizeDashboardSubmodule,
} from "../lib/dashboardSubmodules";
import { navigateToMasterBranchEngine } from "../lib/navigateToMasterBranchEngine";

const PUBLIC_RPC_ATTENDANCE_SCHEMA_BANNER_SW =
  "Ulinganisho wa KPI na RPC ya umma umegundua kuwa portal_public_dashboard_counts bado haijapata safu za mahudhurio kwenye database. Hesabu nyingine zilizolinganishwa na RPC bado halali; mahudhurio zinaendeshwa kutoka maswali ya moja kwa moja hadi migration husika ipakiwe.";

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
  const s = normalizeDashboardSubmodule(submodule);
  if (s === "Kadi za KPI") return "kpi";
  if (s === "Arifa") return "alerts";
  if (s === "Shughuli za hivi karibuni") return "activity";
  if (s === "Vibali vinavyosubiri") return "pending";
  return "overview";
}

/** Lebo ndefu hupata nafasi pana zaidi kwenye simu ili maandishi yasibanwe. */
function isLongModuleLabel(label: string): boolean {
  const t = label.trim();
  const words = t.split(/\s+/).filter(Boolean);
  const hasWidePunctuation = /[/&(),]/.test(t);
  const hasVeryLongWord = words.some((word) => word.length >= 11);

  if (t.length >= 24) return true;
  if (hasWidePunctuation && t.length >= 16) return true;
  if (hasVeryLongWord && t.length >= 18) return true;
  return words.length >= 4 && t.length >= 20;
}

/** Simu: fupi 3 kwa safu, ndefu 2 kwa safu; tablet/desktop hubaki adaptive. */
function moduleShortcutColSpan(label: string): string {
  if (isLongModuleLabel(label)) {
    return "col-span-3 md:col-span-4 xl:col-span-4";
  }
  return "col-span-2 md:col-span-3 xl:col-span-2";
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
  submodule = getDashboardDefaultSubmodule(),
  dayosisi: _dayosisi,
  majimbo,
  matawi,
  fedha,
  incomeManagement,
  auditLogCount = 0,
  securityCounts = { directory: 0, visibilityRules: 0, rbacMatrixRows: 0 },
  wauminiCounts = { families: 0, members: 0, activeMembers: 0, baptized: 0 },
  kpiLive,
  kpiRefreshing = false,
  kpiError = null,
}: Props) {
  const { about, site, canPortalViewModule, authInitialized, authUser, role } = usePortal();
  const mode = useMemo(() => resolveDashMode(submodule), [submodule]);
  const visibleModules = useMemo(() => modules.filter((m) => canPortalViewModule(m.key)), [canPortalViewModule]);
  const [identityRow, setIdentityRow] = useState<ChurchIdentityRow | null>(null);
  const [systemRow, setSystemRow] = useState<SystemSettingsRow | null>(null);
  const [recentAudit, setRecentAudit] = useState<ReturnType<typeof toTableRows>>([]);
  const [liveNotifications, setLiveNotifications] = useState<PortalNotificationRow[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<SystemAlertRow[]>([]);
  const [openAlertsCount, setOpenAlertsCount] = useState(0);

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
    window.addEventListener(KMT_PORTAL_RELOAD_METRICS_EVENT, onReload);
    return () => {
      cancelled = true;
      window.removeEventListener(KMT_PORTAL_RELOAD_METRICS_EVENT, onReload);
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
          setOpenAlertsCount(a.length);
        }
      } catch {
        if (!cancelled) {
          setLiveNotifications([]);
          setLiveAlerts([]);
          setOpenAlertsCount(0);
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
  const heroImageUrl = identityRow?.cover_image_url?.trim() || site.hero_image_url;
  const heroLogoUrl = identityRow?.logo_url?.trim() || about.logo_url || site.cross_image_url;
  const heroMotto = about.motto?.trim() || identityRow?.vision?.trim();
  const heroHeadquarters = identityRow?.headquarters?.trim() || about.headquarters;

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
    keys.some((k) => kpiFailedKeys.includes(k)) ? HAIJAPATIKANA_DATA_SW : value;

  const wauminiPerTawiLabel = useMemo(() => {
    if (kpiLive.matawiCount <= 0) return "—";
    const n = wauminiCounts.members / kpiLive.matawiCount;
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("sw-TZ", { maximumFractionDigits: 1 });
  }, [kpiLive.matawiCount, wauminiCounts.members]);

  const matawiKpiFailed = [
    "kpi.church_tawi.count",
    "kpi.church_tawi.count_active",
    "kpi.church_tawi.count_pending_status",
    "kpi.pending_count.church_tawi",
    "kpi.church_tawi.count_registry_verified",
    "kpi.church_tawi.count_registry_pending_review",
  ].some((k) => kpiFailedKeys.includes(k));

  const cards: readonly (readonly [string, string | number, string])[] = [
    ["Jumla ya Dayosisi", failedValue(kpiLive.dayosisiCount, ["kpi.dayosisi.count"]), "from-blue-600 to-blue-800"],
    ["Jumla ya Majimbo", failedValue(kpiLive.majimboCount, ["kpi.church_jimbo.count"]), "from-slate-700 to-slate-900"],
    ["Jumla ya Matawi / Vituo", failedValue(kpiLive.matawiCount, ["kpi.church_tawi.count"]), "from-amber-500 to-yellow-700"],
    [
      "Matawi active (operational)",
      failedValue(kpiLive.matawiActiveCount, ["kpi.church_tawi.count_active"]),
      "from-emerald-600 to-teal-800",
    ],
    [
      "Matawi pending (usajili)",
      failedValue(kpiLive.matawiPendingStatusCount, ["kpi.church_tawi.count_pending_status", "kpi.pending_count.church_tawi"]),
      "from-amber-600 to-orange-700",
    ],
    [
      "Matawi zilizothibitishwa (sajili)",
      failedValue(kpiLive.matawiRegistryVerifiedCount, ["kpi.church_tawi.count_registry_verified"]),
      "from-cyan-700 to-blue-900",
    ],
    [
      "Matawi zinasubiri uhakiki wa sajili (pending_review)",
      failedValue(kpiLive.matawiRegistryPendingReviewCount, ["kpi.church_tawi.count_registry_pending_review"]),
      "from-violet-600 to-purple-800",
    ],
    ["Jumla ya Viongozi", failedValue(kpiLive.viongoziCount, ["kpi.church_viongozi.count"]), "from-emerald-600 to-emerald-800"],
    ["KMK(T) Viongozi wa Ngazi Kuu", failedValue(kpiLive.viongoziNgaziKuuCount, ["kpi.church_viongozi.count_national"]), "from-[#0B1F3A] to-[#123C69]"],
    ["Viongozi wa Dayosisi", failedValue(kpiLive.viongoziDayosisiCount, ["kpi.church_viongozi.count_dayosisi"]), "from-blue-700 to-indigo-800"],
    ["Viongozi wa Majimbo", failedValue(kpiLive.viongoziMajimboCount, ["kpi.church_viongozi.count_majimbo"]), "from-cyan-700 to-blue-900"],
    ["Viongozi wa Matawi/Vituo", failedValue(kpiLive.viongoziMatawiCount, ["kpi.church_viongozi.count_matawi"]), "from-sky-600 to-indigo-700"],
    ["Active Leaders", failedValue(kpiLive.viongoziActiveCount, ["kpi.church_viongozi.count_active"]), "from-emerald-700 to-teal-900"],
    ["Pending Leaders", failedValue(kpiLive.viongoziPendingCount, ["kpi.church_viongozi.count_pending"]), "from-amber-600 to-orange-700"],
    ["Expiring Terms", failedValue(kpiLive.viongoziExpiringTermsCount, ["kpi.church_viongozi.count_expiring_terms"]), "from-rose-600 to-red-700"],
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
      "Wageni (mwezi)",
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
    ["Vibali vinavyosubiri", pending, "from-pink-600 to-rose-700"],
    ["Rekodi za Audit (jumla)", failedValue(String(auditLogCount), ["kpi.audit_logs.count"]), "from-zinc-700 to-zinc-900"],
    [
      "Watumiaji — directory",
      failedValue(String(securityCounts.directory), ["kpi.portal_directory_profiles.count"]),
      "from-red-700 to-rose-900",
    ],
    [
      "Sheria za mwonekano",
      failedValue(String(securityCounts.visibilityRules), ["kpi.portal_visibility_rules.count"]),
      "from-red-600 to-red-800",
    ],
    [
      "Seli za RBAC (matrix)",
      failedValue(String(securityCounts.rbacMatrixRows), ["kpi.portal_module_matrix.count"]),
      "from-rose-700 to-pink-900",
    ],
    ["System Health Alerts (Open)", openAlertsCount, "from-rose-700 to-red-900"],
    ["Failed Logins (Recent)", failedLoginsRecent, "from-amber-600 to-orange-800"],
    ["Realtime Sync Status", realtimeState, "from-cyan-700 to-blue-900"],
    ["Incomplete Profiles", incomplete, "from-cyan-600 to-cyan-800"],
    [
      "Jumla ya Mapato Leo",
      failedValue(`TZS ${formatMoneyTz(kpiLive.mapatoLeoTotal)}`, [
        "kpi.church_income_lines.sum_mapato_today",
        "kpi.church_finance_entries.sum_mapato_today",
      ]),
      "from-blue-700 to-indigo-900",
    ],
    [
      "Jumla ya Mapato Wiki Hii",
      failedValue(`TZS ${formatMoneyTz(kpiLive.mapatoWikiTotal)}`, [
        "kpi.church_income_lines.sum_mapato_week",
        "kpi.church_finance_entries.sum_mapato_week",
      ]),
      "from-slate-700 to-slate-900",
    ],
    [
      "Jumla ya Mapato Mwezi Huu",
      failedValue(`TZS ${formatMoneyTz(kpiLive.mapatoIncomeMwezi)}`, ["kpi.church_income_lines.sum_mapato_month"]),
      "from-amber-500 to-yellow-700",
    ],
    ["Jumla ya Zaka", failedValue(`TZS ${formatMoneyTz(kpiLive.jumlaZakaMwezi)}`, ["kpi.church_income_lines.sum_zaka_month"]), "from-emerald-600 to-emerald-800"],
    ["Jumla ya Sadaka", failedValue(`TZS ${formatMoneyTz(kpiLive.jumlaSadakaMwezi)}`, ["kpi.church_income_lines.sum_sadaka_month"]), "from-purple-600 to-indigo-700"],
    ["Jumla ya Ujenzi", failedValue(`TZS ${formatMoneyTz(kpiLive.jumlaUjenziMwezi)}`, ["kpi.church_income_lines.sum_ujenzi_month"]), "from-amber-500 to-amber-700"],
    [
      "Jumla ya Matoleo ya Makusudi",
      failedValue(`TZS ${formatMoneyTz(kpiLive.jumlaMatoleoMakusudiMwezi)}`, ["kpi.church_income_lines.sum_matoleo_makusudi_month"]),
      "from-rose-600 to-rose-800",
    ],
    ["Jumla ya Donations", failedValue(`TZS ${formatMoneyTz(kpiLive.jumlaDonationsMwezi)}`, ["kpi.church_income_lines.sum_donations_month"]), "from-teal-600 to-teal-800"],
    ["Pending Verifications", failedValue(pendingVerifLabel, ["kpi.church_income_lines.count_submitted", "kpi.church_income_lines.sum_submitted"]), "from-orange-500 to-orange-700"],
    ["Vibali vya mapato (mistari)", failedValue(pendingApprIncLabel, ["kpi.church_income_lines.count_verified", "kpi.church_income_lines.sum_verified"]), "from-indigo-600 to-indigo-800"],
    ["Restricted Funds Balance", failedValue(`TZS ${formatMoneyTz(kpiLive.restrictedFundBalance)}`, ["kpi.church_income_lines.sum_restricted_ytd"]), "from-green-600 to-green-800"],
    ["Unposted Collections", failedValue(unpostedLabel, ["kpi.church_income_lines.count_unposted", "kpi.church_income_lines.sum_unposted"]), "from-pink-600 to-rose-700"],
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
    if (canPortalViewModule("muundo") && kpiLive.matawiRegistryPendingReviewCount > 0) {
      items.push({
        label: "Matawi zinasubiri uhakiki wa sajili (pending_review)",
        count: kpiLive.matawiRegistryPendingReviewCount,
      });
    }
    return items;
  }, [pending, incomplete, unposted, pendingVerification, canPortalViewModule, kpiLive.matawiRegistryPendingReviewCount]);

  const showWaumini = mode === "overview" || mode === "alerts";
  const showEnterpriseCommand = mode === "overview";
  const showModuleShortcuts = mode === "activity";
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
        title: "Vibali vya fedha visivyokamilika",
        message: `Kuna rekodi ${pending} zinazosubiri hatua (ngazi mbalimbali za mfumo).`,
        priority: pending >= 10 ? "critical" : "warning",
        action_url: `/portal?module=dashboard&submodule=${encodeURIComponent(DASHBOARD_PENDING_APPROVALS_SUBMODULE)}`,
        metadata: { count: pending },
      });
    }
    if (kpiLive.mapatoIncomeMwezi <= 0) {
      out.push({
        type: "auto_rule.finance.low_income",
        module: "mapato_income",
        title: "Onyo: mapato ya mwezi ni chini",
        message: "Mapato ya mwezi huu yapo chini ya kiwango (au sifuri).",
        priority: "critical",
        action_url: "/portal?module=mapato_income",
      });
    }
    if (kpiLive.restrictedFundsCount > 0 && kpiLive.restrictedFundBalance < 0) {
      out.push({
        type: "auto_rule.finance.restricted_misuse",
        module: "fedha",
        title: "Jaribio la kutumia fedha zilizowekewa vikwazo",
        message: "Salio la restricted funds limeingia hasi; hakiki matumizi mara moja.",
        priority: "critical",
        action_url: "/portal?module=fedha",
      });
    }
    if (incomplete > 0) {
      out.push({
        type: "auto_rule.content.missing_reports",
        module: "viongozi",
        title: "Wasifu / ripoti zisizo kamili",
        message: `Kuna wasifu ${incomplete} wasio kamili wanaohitaji taarifa.`,
        priority: "warning",
        action_url: "/portal?module=viongozi",
      });
    }
    if (unposted > 0) {
      out.push({
        type: "auto_rule.content.failed_uploads",
        module: "fedha",
        title: "Makusanyo yasiyochapishwa kwenye ledger",
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
        title: "Kuingia kwa akaunti kumeshindikana",
        message: `Kuna matukio ${failedLogins} ya kuingia ambayo yameshindikana hivi karibuni.`,
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
        title: "Mabadiliko ya shaka ya ruhusa",
        message: `Mabadiliko ${suspiciousPerms} ya majukumu / ruhusa yameonekana kwenye kumbukumbu ya ukaguzi.`,
        priority: suspiciousPerms >= 3 ? "critical" : "warning",
        action_url: "/portal?module=usalama",
      });
    }
    if (kpiLive.matawiCount > 0 && wauminiCounts.activeMembers === 0) {
      out.push({
        type: "auto_rule.church.inactive_branches",
        module: "muundo",
        title: "Onyo: matawi bila waumini wanaohudhuria",
        message: "Matawi yapo lakini hakuna waumini hai; hakiki taarifa za mwezi.",
        priority: "warning",
        action_url: "/portal?module=muundo",
      });
    }
    if (canPortalViewModule("muundo") && kpiLive.matawiRegistryPendingReviewCount > 0) {
      out.push({
        type: "auto_rule.church.tawi_registry_pending_review",
        module: "muundo",
        title: "Sajili za tawi zinasubiri uhakiki",
        message: `Matawi ${kpiLive.matawiRegistryPendingReviewCount} yanasubiri uhakiki wa sajili kwenye mfumo.`,
        priority: kpiLive.matawiRegistryPendingReviewCount >= 5 ? "critical" : "warning",
        action_url: `/portal?module=dashboard&submodule=${encodeURIComponent(DASHBOARD_PENDING_APPROVALS_SUBMODULE)}`,
        metadata: { count: kpiLive.matawiRegistryPendingReviewCount },
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
    canPortalViewModule,
    kpiLive.matawiRegistryPendingReviewCount,
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
    return (
      <div className="space-y-4">
        <DashboardSubnav active={submodule} />
        {(role === "super_admin" || role === "chief_admin") && kpiLive.publicDashboardCountsAttendanceColumnsMissing ? (
          <p
            className="rounded-xl border border-sky-400/25 bg-sky-950/40 px-3 py-2 text-xs leading-relaxed text-sky-100/95"
            role="status"
          >
            {PUBLIC_RPC_ATTENDANCE_SCHEMA_BANNER_SW}
          </p>
        ) : null}
        <PendingApprovalsDashboard
          incomeManagement={incomeManagement}
          fedha={fedha}
          majimbo={majimbo}
          matawi={matawi}
          tawiRegistryPendingReviewKpi={kpiLive.matawiRegistryPendingReviewCount}
          tawiRegistryPendingReviewKpiFailed={Boolean(
            (kpiLive.failedKpis ?? {})["kpi.church_tawi.count_registry_pending_review"]
          )}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DashboardSubnav active={submodule} />

      {(role === "super_admin" || role === "chief_admin") && kpiLive.publicDashboardCountsAttendanceColumnsMissing ? (
        <p
          className="rounded-xl border border-sky-400/25 bg-sky-950/40 px-3 py-2 text-xs leading-relaxed text-sky-100/95"
          role="status"
        >
          {PUBLIC_RPC_ATTENDANCE_SCHEMA_BANNER_SW}
        </p>
      ) : null}

      {showEnterpriseCommand ? (
        <>
          <EnterpriseCommandPanel
            canViewModule={canPortalViewModule}
            kpiLive={kpiLive}
            wauminiCounts={wauminiCounts}
            onNavigateModule={(moduleKey, submodule) => {
              window.dispatchEvent(
                new CustomEvent("kmt-portal-navigate", {
                  detail: { moduleKey, submodule },
                })
              );
            }}
          />
          <section
            className="overflow-hidden rounded-[28px] border-2 border-amber-400/35 bg-gradient-to-br from-[#0B1F3A] via-[#123C69] to-emerald-950 p-4 text-white shadow-[0_20px_50px_rgba(15,23,42,.18)] sm:p-5"
            aria-label="Matawi — msingi wa mradi"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-amber-400/40 bg-amber-400/15 text-amber-100 shadow-inner">
                  <Building2 className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/95">Matawi ndiyo mama wa mradi</p>
                  <h2 className="mt-1 font-kmkt-display text-lg font-black tracking-tight sm:text-xl">Kituo cha uhai wa huduma na ripoti</h2>
                  <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-100/90 sm:text-sm">
                    Kila tawi na kituo ndicho kiini cha waumini, mahudhurio na mapato ya misingi. Vipimo hivi vinahesabiwa moja kwa moja kutoka Supabase (kulingana na ruhusa zako).
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-center backdrop-blur-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-200">Wastani wa waumini / tawi</p>
                  <p
                    className={`mt-0.5 font-kmkt-display text-xl font-black tabular-nums sm:text-2xl ${matawiKpiFailed ? "text-xs font-semibold text-amber-100" : ""}`}
                  >
                    {matawiKpiFailed ? HAIJAPATIKANA_DATA_SW : wauminiPerTawiLabel}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-2xl border border-amber-300/50 bg-gradient-to-r from-amber-200/95 to-amber-400/90 px-4 py-2.5 text-center text-xs font-bold text-[#0B1F3A] shadow-md transition hover:brightness-105"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("kmt-portal-navigate", {
                        detail: { moduleKey: "muundo", submodule: "Injini ya Ngazi — Executive" },
                      })
                    )
                  }
                >
                  Injini ya Ngazi — Executive
                </button>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {showWaumini ? (
      <section
        className="grid grid-cols-2 gap-2.5 rounded-2xl border border-slate-200/80 bg-gradient-to-r from-[#0B1F3A]/95 via-[#123C69]/95 to-[#0B1F3A]/95 p-3 text-white shadow-lg sm:gap-3 sm:p-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Muhtasari wa waumini na familia"
      >
        {[
          {
            label: "Familia",
            value: failedValue(wauminiCounts.families, ["kpi.church_families.count"]),
            source: "church_families",
            tone: "from-[#D4AF37] via-[#9E7A1A] to-[#0B1F3A]",
            border: "border-[#D4AF37]/55",
            subtitle: "text-amber-100/95",
          },
          {
            label: "Waumini wote",
            value: failedValue(wauminiCounts.members, ["kpi.church_members.count"]),
            source: "church_members",
            tone: "from-[#1D4ED8] via-[#123C69] to-[#0B1F3A]",
            border: "border-sky-300/55",
            subtitle: "text-blue-100/95",
          },
          {
            label: "Hali: hai",
            value: failedValue(wauminiCounts.activeMembers, ["kpi.church_members.count_active"]),
            source: "membership_status = active",
            tone: "from-[#15803D] via-[#0F766E] to-[#064E3B]",
            border: "border-emerald-300/55",
            subtitle: "text-emerald-100/95",
          },
          {
            label: "Waliobatizwa",
            value: failedValue(wauminiCounts.baptized, ["kpi.church_members.count_baptized"]),
            source: "is_baptized = true",
            tone: "from-[#7C3AED] via-[#0891B2] to-[#0B1F3A]",
            border: "border-cyan-300/55",
            subtitle: "text-cyan-100/95",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-2xl border bg-gradient-to-br px-3 py-4 shadow-lg transition-transform duration-200 hover:-translate-y-0.5 sm:rounded-3xl sm:px-4 sm:py-4 ${kpi.tone} ${kpi.border}`}
          >
            <div className="flex min-h-[112px] flex-col items-center justify-center gap-1.5 text-center sm:min-h-[120px]">
              <p className="hyphens-auto break-words text-[10px] font-bold uppercase leading-tight tracking-wider text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.55)] sm:text-[11px]">
                {kpi.label}
              </p>
              <p className="text-xl font-extrabold tabular-nums leading-tight text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.45)] sm:text-2xl md:text-[1.7rem]">
                {kpi.value}
              </p>
              <p
                className={`line-clamp-2 text-[10px] font-semibold leading-snug [text-shadow:0_1px_2px_rgba(0,0,0,0.45)] sm:text-xs ${kpi.subtitle}`}
              >
                {kpi.source}
              </p>
            </div>
          </div>
        ))}
      </section>
      ) : null}

      {showModuleShortcuts ? (
      <section className="rounded-3xl border border-slate-200 bg-white p-3.5 shadow-lg sm:p-5" aria-label="Moduli za mfumo">
        <h2 className="text-center text-sm font-bold text-[#0B1F3A] sm:text-left">Moduli za mfumo</h2>
        <p className="mt-2 text-center text-xs leading-relaxed text-slate-700 sm:text-left">
          Hizi ndizo moduli unazoweza kufungua kwa jukumu lako (RBAC). Kama &ldquo;Misaada ya Kanisa&rdquo; haipo hapa, angalia{" "}
          <strong>Usalama → Permissions</strong> au endesha migration ya <code className="rounded bg-slate-100 px-1 text-[11px]">aid_management</code> kwenye Supabase.
        </p>
        <div className="mt-4 grid grid-cols-6 gap-3 sm:gap-3.5 md:grid-cols-12 md:gap-4 xl:gap-4">
          {visibleModules.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("kmt-portal-navigate", {
                    detail: { moduleKey: m.key, submodule: getFirstSubmoduleForModule(m.key) },
                  })
                )
              }
              aria-label={`Fungua moduli ya ${m.label}`}
              className={`group relative flex w-full min-h-[7.25rem] flex-col items-center justify-center gap-2.5 rounded-3xl border border-white/20 bg-gradient-to-br px-2.5 py-4 text-center shadow-lg shadow-slate-900/10 ring-1 ring-white/10 transition-all duration-200 touch-manipulation active:scale-[0.98] sm:min-h-[7.75rem] sm:px-3.5 sm:py-5 md:min-h-[8rem] ${m.color} ${moduleShortcutColSpan(
                m.label
              )} hover:-translate-y-0.5 hover:shadow-xl hover:brightness-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]/80`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-inner backdrop-blur-sm sm:h-10 sm:w-10">
                <LayoutGrid className="h-5 w-5 text-white/95 drop-shadow-sm sm:h-5 sm:w-5" strokeWidth={2} aria-hidden />
              </span>
              <span className="flex w-full max-w-[98%] min-w-0 items-center justify-center hyphens-auto whitespace-normal text-center text-[clamp(0.68rem,2.7vw,0.82rem)] font-semibold leading-snug text-white [overflow-wrap:anywhere] [text-wrap:balance] sm:max-w-[96%] sm:text-[0.82rem] md:text-sm">
                {m.label}
              </span>
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
              <li>Open alerts: {openAlertsCount}</li>
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
        {heroImageUrl ? (
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <ResponsiveLazyImage
              src={heroImageUrl}
              alt=""

              className="absolute inset-0 h-full w-full"
              loading="eager"
              decoding="async"
              width={1600}
              height={900}

            />
          </div>
        ) : null}
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white drop-shadow md:text-2xl">
              {heroTitle || "Portal ya Kanisa — sanidi taarifa (Mipangilio → Kuhusu KMKT / Church Identity)"}
            </h1>
            <p className="text-base font-medium text-slate-100">OFISI YA NGAZI KUU · {heroAbbr || "—"}</p>
            {heroMotto ? (
              <p className="mt-2 max-w-2xl text-sm italic text-[#F5E6B4]">&ldquo;{heroMotto}&rdquo;</p>
            ) : null}
            <p className="mt-2 text-sm font-medium text-slate-100">Makao Makuu: {heroHeadquarters || "—"}</p>
          </div>
          {heroLogoUrl ? (
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-amber-400/50 bg-white/10 p-1 shadow-lg backdrop-blur">
              <ResponsiveLazyImage
                src={heroLogoUrl}
                alt="Nembo ya kanisa"

                className="h-full w-full"
                loading="eager"
                decoding="async"
                width={256}
                height={256}

              />
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
      {showKpiGrid && !kpiRefreshing && !kpiError ? (
        <p className="text-xs leading-relaxed text-slate-500" role="note">
          {isSupabaseRealtimeEnabled() ? (
            <>
              Sasisho la papo hapo: <span className="font-semibold text-emerald-700">limewashwa</span> — ukiwa kwenye Dashibodi,
              vipimo vinaweza kusasisha kiotomatiki baada ya mabadiliko ya data.
            </>
          ) : (
            <>
              Sasisho la papo hapo: <span className="font-semibold text-slate-600">limezimwa</span> — vipimo huwa vinasasishwa
              unaporudi Dashibodi, baada ya uhifadhi, au unaposogeza ukurasa.
              {role === "super_admin" || role === "chief_admin" ? (
                <>
                  {" "}
                  Chaguomsingi ya mradi ni Realtime imewashwa; ikiwa bado imezimwa, hakikisha env si{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px] text-slate-800">
                    VITE_SUPABASE_REALTIME_ENABLED=false
                  </code>{" "}
                  kwenye build ya seva.
                </>
              ) : null}
            </>
          )}
        </p>
      ) : null}
      {showKpiGrid && !kpiError && kpiFailedKeys.length > 0 ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 shadow-sm">
          <p className="font-medium">Baadhi ya KPI hazijapatikana kwa sasa — angalia Supabase, RLS, au migrations.</p>
          {(role === "super_admin" || role === "chief_admin") && kpiLive.failedKpis && Object.keys(kpiLive.failedKpis).length > 0 ? (
            <details className="mt-2 rounded-lg border border-blue-200/80 bg-white/60 px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold text-blue-950">Maelezo ya kiufundi (wasimamizi)</summary>
              <ul className="mt-2 max-h-52 list-inside list-disc space-y-1 overflow-y-auto text-xs text-blue-950/95">
                {Object.entries(kpiLive.failedKpis).map(([k, msg]) => (
                  <li key={k}>
                    <span className="font-mono text-[11px]">{k}</span>
                    <span className="text-slate-600"> — </span>
                    {msg}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
      {showKpiGrid ? (
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([title, value, gradient]) => {
          const matawiKpi = title.includes("Matawi");
          const openEngine = matawiKpi && canPortalViewModule("muundo");
          return (
            <GradientKpiCard
              key={title}
              title={title}
              value={value}
              gradient={gradient}
              onClick={openEngine ? () => navigateToMasterBranchEngine("executive") : undefined}
            />
          );
        })}
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
