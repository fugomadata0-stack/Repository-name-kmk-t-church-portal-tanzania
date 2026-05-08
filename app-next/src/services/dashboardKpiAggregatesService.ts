/**
 * Hesabu za KPI za Dashibodi — zote kutoka Supabase (RLS inatumika kiotomatiki).
 *
 * --- MIFANO YA UGANI (KPI → jedwali → mantiki) ---
 * Jumla ya Dayosisi → dayosisi → count exact
 * Jumla ya Majimbo → church_jimbo → count exact
 * Jumla ya Matawi / Vituo → church_tawi → count exact
 * Jumla ya Viongozi → church_viongozi → count exact
 * Jumla ya Waumini → church_members → count exact
 * Jumla ya Jumuiya → portal_domain_entities → count (module_key=jumuiya, submodule_key≠Idara)
 * Jumla ya Idara → portal_domain_entities → count (module_key=jumuiya, submodule_key=Idara)
 * Jumla ya Taasisi → portal_domain_entities → count (module_key=taasisi)
 * Mapato ya Leo / Wiki / Mwezi / YTD → church_income_lines + church_finance_entries (Mapato) → sum amount_tz kwa tarehe & hali zilizokubaliwa
 * Jumla ya Zaka → church_income_lines → sum (mwezi huu, hali zilizokubaliwa, chanzo/kategoria ina "zaka")
 * Jumla ya Sadaka → church_income_lines → sum (mwezi, sadaka)
 * Matoleo ya Makusudi / Donations → church_income_lines → sum kwa main_category
 * Pending Verifications → church_income_lines → count (status=submitted)
 * Pending Approval Income → church_income_lines → count/sum (status=verified)
 * Restricted Fund Balance → church_income_lines → sum (restricted_fund=Yes, hali zilizokubaliwa) — matumizi ya restricted hayapo kwenye church_finance_entries
 * Unposted Collections → church_income_lines → count/sum (hali: active…approved — si posted_to_ledger / locked / reversed_cancelled)
 * Budgeted vs Actual → church_income_lines → mwezi: jumla mistari yenye budgeted=Yes dhidi ya jumla mapato yaliyokubaliwa (lebo inaonyesha TZS + %)
 * Ukuaji dhidi ya mwezi uliopita → (= mwezi huu − mwezi uliopita) / mwezi uliopita kwa mapato yaliyokubaliwa (mistari ya mapato + Mapato ya fedha)
 * Rekodi za Audit → audit_logs → count exact
 * Mapato kwa kategoria (mwezi) → church_finance_entries (kategoria) + church_income_lines (main_category / sub / chanzo) → jumlisha ndani ya seva ya mteja baada ya fetch
 */

import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabase } from "../lib/supabaseClient";
import { formatMoneyTz, parseMoneyTz } from "../lib/money";
import { formatPostgrestError } from "../lib/supabaseErrors";
import { unwrapList } from "../lib/supabaseResult";
import { safeSumAmount } from "../lib/safeAggregates";
import {
  monthEndIsoPortalTz,
  previousMonthYyyyMmPortalTz,
  todayIsoInPortalTz,
  weekMondaySundayIsoPortalTz,
} from "../lib/tzDates";

/** Mistari ya mapato yanayohesabiwa kama mapato halisi (pamoja na legacy: active). */
const ACTIVE_FINANCE_STATUSES = ["active", "approved", "posted_to_ledger", "locked", "verified", "submitted"] as const;
const INCOME_RECOGNIZED = ACTIVE_FINANCE_STATUSES;

/**
 * Mistari ambayo bado siyo posted_to_ledger / locked / reversed_cancelled.
 * Orodha wazi (si `.not in`) ili PostgREST iwe thabiti na RLS.
 */
const INCOME_UNPOSTED_STATUSES = [
  "active",
  "pending",
  "inactive",
  "archived",
  "needs_review",
  "draft",
  "submitted",
  "verified",
  "approved",
] as const;

export type MapatoKategoriaMweziRow = { label: string; amount: number };

export type DashboardKpiSnapshot = {
  dayosisiCount: number;
  majimboCount: number;
  matawiCount: number;
  viongoziCount: number;
  viongoziNgaziKuuCount: number;
  viongoziDayosisiCount: number;
  viongoziMajimboCount: number;
  viongoziMatawiCount: number;
  viongoziActiveCount: number;
  viongoziPendingCount: number;
  viongoziExpiringTermsCount: number;
  jumuiyaCount: number;
  idaraCount: number;
  hudumaCount: number;
  taasisiCount: number;
  documentsCount: number;
  totalFinanceSources: number;
  activeFinanceSources: number;
  customFinanceSources: number;
  restrictedFundsCount: number;
  mapatoFedhaMweziMapato: number;
  matumiziFedhaMwezi: number;
  /** Mapato halisi (mistari ya mapato) — mwezi huu. */
  mapatoIncomeMwezi: number;
  mapatoLeoTotal: number;
  mapatoWikiTotal: number;
  /** Mapato + Mapato ya fedha (pamoja) — mwezi huu. */
  mapatoMweziTotal: number;
  yearToDateIncomeTotal: number;
  jumlaZakaMwezi: number;
  jumlaSadakaMwezi: number;
  jumlaUjenziMwezi: number;
  jumlaMatoleoMakusudiMwezi: number;
  jumlaDonationsMwezi: number;
  pendingVerificationCount: number;
  pendingVerificationSum: number;
  pendingApprovalIncomeCount: number;
  pendingApprovalIncomeSum: number;
  restrictedFundBalance: number;
  unpostedCollectionsCount: number;
  unpostedCollectionsSum: number;
  budgetedVsActualLabel: string;
  growthVsLastMonthPercent: number | null;
  growthVsLastMonthLabel: string;
  pendingRecordsCrossModule: number;
  incompleteLeadersCount: number;
  /** Mapato kwa kategoria (mwezi huu) — fedha + mistari ya mapato, kulingana na RLS. */
  mapatoKwaKategoriaMwezi: MapatoKategoriaMweziRow[];
  incomeBySourceMwezi: MapatoKategoriaMweziRow[];
  /** True ikiwa idadi ya safu zilizopakiwa zilifikia kikomo (hesabu ya kategoria inaweza kuwa sehemu). */
  categoryBreakdownTruncated: boolean;
  /** KPI queries zilizoshindwa kwa sababu za Supabase (kwa diagnostics). */
  failedKpis: Record<string, string>;
  activeStructuresCount: number;
  pendingStructuresCount: number;
  attendanceTodayCount: number;
  attendanceWeekCount: number;
  attendanceMonthCount: number;
  attendanceVisitorsMonth: number;
};

export function emptyDashboardKpiSnapshot(): DashboardKpiSnapshot {
  return {
    dayosisiCount: 0,
    majimboCount: 0,
    matawiCount: 0,
    viongoziCount: 0,
    viongoziNgaziKuuCount: 0,
    viongoziDayosisiCount: 0,
    viongoziMajimboCount: 0,
    viongoziMatawiCount: 0,
    viongoziActiveCount: 0,
    viongoziPendingCount: 0,
    viongoziExpiringTermsCount: 0,
    jumuiyaCount: 0,
    idaraCount: 0,
    hudumaCount: 0,
    taasisiCount: 0,
    documentsCount: 0,
    totalFinanceSources: 0,
    activeFinanceSources: 0,
    customFinanceSources: 0,
    restrictedFundsCount: 0,
    mapatoFedhaMweziMapato: 0,
    matumiziFedhaMwezi: 0,
    mapatoIncomeMwezi: 0,
    mapatoLeoTotal: 0,
    mapatoWikiTotal: 0,
    mapatoMweziTotal: 0,
    yearToDateIncomeTotal: 0,
    jumlaZakaMwezi: 0,
    jumlaSadakaMwezi: 0,
    jumlaUjenziMwezi: 0,
    jumlaMatoleoMakusudiMwezi: 0,
    jumlaDonationsMwezi: 0,
    pendingVerificationCount: 0,
    pendingVerificationSum: 0,
    pendingApprovalIncomeCount: 0,
    pendingApprovalIncomeSum: 0,
    restrictedFundBalance: 0,
    unpostedCollectionsCount: 0,
    unpostedCollectionsSum: 0,
    budgetedVsActualLabel: "—",
    growthVsLastMonthPercent: null,
    growthVsLastMonthLabel: "—",
    pendingRecordsCrossModule: 0,
    incompleteLeadersCount: 0,
    mapatoKwaKategoriaMwezi: [],
    incomeBySourceMwezi: [],
    categoryBreakdownTruncated: false,
    failedKpis: {},
    activeStructuresCount: 0,
    pendingStructuresCount: 0,
    attendanceTodayCount: 0,
    attendanceWeekCount: 0,
    attendanceMonthCount: 0,
    attendanceVisitorsMonth: 0,
  };
}

let kpiFailureCollector: Record<string, string> | null = null;

type KpiQueryContext = {
  kpiName: string;
  tableName: string;
  queryPurpose: string;
};

function ctx(kpiName: string, tableName: string, queryPurpose: string): KpiQueryContext {
  return { kpiName, tableName, queryPurpose };
}

function buildIncomeBySourceMwezi(rows: { source_name?: string | null; amount_tz?: unknown }[]): MapatoKategoriaMweziRow[] {
  const acc = new Map<string, number>();
  for (const r of rows) {
    const label = String(r.source_name ?? "").trim() || "Haijabainishwa";
    const n = parseMoneyTz(r.amount_tz);
    acc.set(label, (acc.get(label) ?? 0) + (Number.isFinite(n) ? Math.round(n * 100) / 100 : 0));
  }
  return [...acc.entries()]
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 12);
}

function buildMapatoKwaKategoriaMwezi(
  finRows: { kategoria?: string | null; amount_tz?: unknown }[],
  incRows: { main_category?: string | null; sub_category?: string | null; source_name?: string | null; amount_tz?: unknown }[]
): MapatoKategoriaMweziRow[] {
  const acc = new Map<string, number>();
  for (const r of finRows) {
    const label = `Fedha · ${String(r.kategoria ?? "").trim() || "Haijabainishwa"}`;
    const n = parseMoneyTz(r.amount_tz);
    acc.set(label, (acc.get(label) ?? 0) + (Number.isFinite(n) ? Math.round(n * 100) / 100 : 0));
  }
  for (const r of incRows) {
    const raw =
      String(r.main_category ?? "").trim() ||
      String(r.sub_category ?? "").trim() ||
      String(r.source_name ?? "").trim() ||
      "Haijabainishwa";
    const label = `Mapato · ${raw}`;
    const n = parseMoneyTz(r.amount_tz);
    acc.set(label, (acc.get(label) ?? 0) + (Number.isFinite(n) ? Math.round(n * 100) / 100 : 0));
  }
  return [...acc.entries()]
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 14);
}

function assertNoPostgrestError(result: { error: PostgrestError | null }, context: KpiQueryContext): void {
  if (result.error) {
    const msg = formatPostgrestError(result.error, context.queryPurpose);
    if (kpiFailureCollector) kpiFailureCollector[context.kpiName] = msg;
    if (import.meta.env.DEV) {
      console.error(
        `[Dashboard KPI query failed] KPI=${context.kpiName} TABLE=${context.tableName} CODE=${result.error.code} MESSAGE=${result.error.message} DETAILS=${result.error.details ?? ""}`
      );
    }
  }
}

/** Hesabu ya kichwa (count: "exact") — lazima hakuna .error kabla ya kutumia count. */
function readCountFrom(result: { count?: number | null; error: PostgrestError | null }, context: KpiQueryContext): number {
  assertNoPostgrestError(result, context);
  if (result.error) return 0;
  return result.count ?? 0;
}

/**
 * Jumla salama ya amount_tz baada ya select rows za kawaida.
 */
function readSumFrom(result: { data: unknown; error: PostgrestError | null }, context: KpiQueryContext): number {
  assertNoPostgrestError(result, context);
  if (result.error) return 0;
  const data = Array.isArray(result.data) ? (result.data as Record<string, unknown>[]) : [];
  return Math.round(safeSumAmount(data, "amount_tz") * 100) / 100;
}

const FINANCE_RECOGNIZED = ACTIVE_FINANCE_STATUSES;

function safeUnwrapRows<T = Record<string, unknown>>(result: unknown, context: KpiQueryContext): T[] {
  try {
    return unwrapList(result as any, context.queryPurpose) as T[];
  } catch (error) {
    if (import.meta.env.DEV) console.warn(`[${context.queryPurpose}]`, error);
    return [];
  }
}

export async function fetchDashboardKpiAggregates(): Promise<DashboardKpiSnapshot> {
  const c = getSupabase();
  if (!c) return emptyDashboardKpiSnapshot();
  kpiFailureCollector = {};
  try {
  const today = todayIsoInPortalTz();
  const ym = today.slice(0, 7);
  const monthStart = `${ym}-01`;
  const monthEnd = monthEndIsoPortalTz(ym);
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const prevYm = previousMonthYyyyMmPortalTz();
  const prevMonthStart = `${prevYm}-01`;
  const prevMonthEnd = monthEndIsoPortalTz(prevYm);
  const { mon: wMon, sun: wSun } = weekMondaySundayIsoPortalTz();

  const recognizedIncome = Array.from(INCOME_RECOGNIZED);
  const recognizedFinance = Array.from(FINANCE_RECOGNIZED);
  const unpostedStatuses = Array.from(INCOME_UNPOSTED_STATUSES);

  const [
      dCount,
      jCount,
      tCount,
      vCount,
      vNkuuCount,
      vDayCount,
      vJimCount,
      vTawCount,
      vActiveCount,
      vPendingCount,
      vExpTermCount,
      jmCount,
      idCount,
      hdCount,
      taCount,
      muJmCount,
      muIdCount,
      muHdCount,
      muTaCount,
      docCount,
      srcAllCount,
      srcActiveCount,
      srcCustomCount,
      srcRestrictedCount,
      incLeaders,
      pDay,
      pJim,
      pTaw,
      pVio,
      pFin,
      sumIncToday,
      sumFinMapatoToday,
      sumIncWeek,
      sumFinMapatoWeek,
      sumIncMonth,
      sumFinMapatoMonth,
      sumIncYtd,
      sumFinMapatoYtd,
      sumIncPrev,
      sumFinMapatoPrev,
      zakaSum,
      sadakaSum,
      ujenziSum,
      makusudiSum,
      donationsSum,
      pendVerCnt,
      pendVerSum,
      pendApprCnt,
      pendApprSum,
      restrSum,
      unpcCnt,
      unpcSum,
      budgetSum,
      actualRecMonth,
      fedhaMapatoMwezi,
      matumiziMwezi,
      finCatRowsRes,
      incCatRowsRes,
      incBySourceRowsRes,
      structureActiveCnt,
      structurePendingCnt,
      attTodayCnt,
      attWeekCnt,
      attMonthCnt,
      attVisitorsMonthSum,
    ] = await Promise.all([
      c.from("dayosisi").select("*", { count: "exact", head: true }),
      c.from("church_jimbo").select("*", { count: "exact", head: true }),
      c.from("church_tawi").select("*", { count: "exact", head: true }),
      c.from("church_viongozi").select("*", { count: "exact", head: true }),
      c.from("church_viongozi").select("*", { count: "exact", head: true }),
      c.from("church_viongozi").select("*", { count: "exact", head: true }),
      c.from("church_viongozi").select("*", { count: "exact", head: true }),
      c.from("church_viongozi").select("*", { count: "exact", head: true }),
      c.from("church_viongozi").select("*", { count: "exact", head: true }),
      c.from("church_viongozi").select("*", { count: "exact", head: true }),
      c.from("church_viongozi").select("*", { count: "exact", head: true }),
      c.from("portal_domain_entities").select("*", { count: "exact", head: true }).eq("module_key", "jumuiya").not("submodule_key", "eq", "Idara"),
      c.from("portal_domain_entities").select("*", { count: "exact", head: true }).eq("module_key", "jumuiya").eq("submodule_key", "Idara"),
      c.from("portal_domain_entities").select("*", { count: "exact", head: true }).eq("module_key", "jumuiya").eq("submodule_key", "Huduma"),
      c.from("portal_domain_entities").select("*", { count: "exact", head: true }).eq("module_key", "taasisi"),
      c.from("portal_domain_entities").select("*", { count: "exact", head: true }).eq("module_key", "muundo").eq("submodule_key", "Jumuiya"),
      c.from("portal_domain_entities").select("*", { count: "exact", head: true }).eq("module_key", "muundo").eq("submodule_key", "Idara"),
      c.from("portal_domain_entities").select("*", { count: "exact", head: true }).eq("module_key", "muundo").eq("submodule_key", "Huduma"),
      c.from("portal_domain_entities").select("*", { count: "exact", head: true }).eq("module_key", "muundo").eq("submodule_key", "Taasisi"),
      c.from("documents").select("*", { count: "exact", head: true }),
      c.from("church_income_sources").select("*", { count: "exact", head: false }),
      c.from("church_income_sources").select("*", { count: "exact", head: false }).eq("status", "active"),
      c.from("church_income_sources").select("*", { count: "exact", head: false }),
      c.from("church_income_sources").select("*", { count: "exact", head: false }),
      c.from("church_viongozi").select("*", { count: "exact", head: true }).or("jimbo_id.is.null,status.eq.needs_review"),
      c.from("dayosisi").select("*", { count: "exact", head: true }).eq("status", "pending"),
      c.from("church_jimbo").select("*", { count: "exact", head: true }).eq("status", "pending"),
      c.from("church_tawi").select("*", { count: "exact", head: true }).eq("status", "pending"),
      c.from("church_viongozi").select("*", { count: "exact", head: true }).eq("status", "pending"),
      c.from("church_finance_entries").select("*", { count: "exact", head: false }).eq("status", "pending"),
      c
        .from("church_income_lines")
        .select("amount_tz")
        .not("collection_date", "is", null)
        .eq("collection_date", today)
        .in("status", recognizedIncome),
      c
        .from("church_finance_entries")
        .select("amount_tz")
        .eq("aina", "Mapato")
        .eq("entry_date", today)
        .in("status", recognizedFinance),
      c
        .from("church_income_lines")
        .select("amount_tz")
        .not("collection_date", "is", null)
        .gte("collection_date", wMon)
        .lte("collection_date", wSun)
        .in("status", recognizedIncome),
      c
        .from("church_finance_entries")
        .select("amount_tz")
        .eq("aina", "Mapato")
        .gte("entry_date", wMon)
        .lte("entry_date", wSun)
        .in("status", recognizedFinance),
      c
        .from("church_income_lines")
        .select("amount_tz")
        .not("collection_date", "is", null)
        .gte("collection_date", monthStart)
        .lte("collection_date", monthEnd)
        .in("status", recognizedIncome),
      c
        .from("church_finance_entries")
        .select("amount_tz")
        .eq("aina", "Mapato")
        .gte("entry_date", monthStart)
        .lte("entry_date", monthEnd)
        .in("status", recognizedFinance),
      c
        .from("church_income_lines")
        .select("amount_tz")
        .not("collection_date", "is", null)
        .gte("collection_date", yearStart)
        .lte("collection_date", today)
        .in("status", recognizedIncome),
      c
        .from("church_finance_entries")
        .select("amount_tz")
        .eq("aina", "Mapato")
        .gte("entry_date", yearStart)
        .lte("entry_date", today)
        .in("status", recognizedFinance),
      c
        .from("church_income_lines")
        .select("amount_tz")
        .not("collection_date", "is", null)
        .gte("collection_date", prevMonthStart)
        .lte("collection_date", prevMonthEnd)
        .in("status", recognizedIncome),
      c
        .from("church_finance_entries")
        .select("amount_tz")
        .eq("aina", "Mapato")
        .gte("entry_date", prevMonthStart)
        .lte("entry_date", prevMonthEnd)
        .in("status", recognizedFinance),
      c
        .from("church_income_lines")
        .select("amount_tz")
        .not("collection_date", "is", null)
        .gte("collection_date", monthStart)
        .lte("collection_date", monthEnd)
        .in("status", recognizedIncome)
        .or("source_name.ilike.%zaka%,main_category.ilike.%zaka%,sub_category.ilike.%zaka%"),
      c
        .from("church_income_lines")
        .select("amount_tz")
        .not("collection_date", "is", null)
        .gte("collection_date", monthStart)
        .lte("collection_date", monthEnd)
        .in("status", recognizedIncome)
        .or("source_name.ilike.%sadaka%,main_category.ilike.%sadaka%,sub_category.ilike.%sadaka%"),
      c
        .from("church_income_lines")
        .select("amount_tz")
        .not("collection_date", "is", null)
        .gte("collection_date", monthStart)
        .lte("collection_date", monthEnd)
        .in("status", recognizedIncome)
        .or("source_name.ilike.%ujenzi%,main_category.ilike.%ujenzi%,sub_category.ilike.%ujenzi%"),
      c
        .from("church_income_lines")
        .select("amount_tz")
        .not("collection_date", "is", null)
        .gte("collection_date", monthStart)
        .lte("collection_date", monthEnd)
        .in("status", recognizedIncome)
        .eq("main_category", "Matoleo ya Makusudi"),
      c
        .from("church_income_lines")
        .select("amount_tz")
        .not("collection_date", "is", null)
        .gte("collection_date", monthStart)
        .lte("collection_date", monthEnd)
        .in("status", recognizedIncome)
        .eq("main_category", "Ruzuku, Misaada na Donations"),
      c.from("church_income_lines").select("*", { count: "exact", head: false }).eq("status", "submitted"),
      c.from("church_income_lines").select("amount_tz").eq("status", "submitted").not("collection_date", "is", null),
      c.from("church_income_lines").select("*", { count: "exact", head: false }).eq("status", "verified"),
      c.from("church_income_lines").select("amount_tz").eq("status", "verified").not("collection_date", "is", null),
      c
        .from("church_income_lines")
        .select("amount_tz")
        .eq("restricted_fund", "Yes")
        .in("status", recognizedIncome)
        .not("collection_date", "is", null)
        .gte("collection_date", yearStart)
        .lte("collection_date", today),
      c.from("church_income_lines").select("*", { count: "exact", head: false }).in("status", unpostedStatuses),
      c
        .from("church_income_lines")
        .select("amount_tz")
        .not("collection_date", "is", null)
        .in("status", unpostedStatuses),
      c
        .from("church_income_lines")
        .select("amount_tz")
        .eq("budgeted", "Yes")
        .not("collection_date", "is", null)
        .gte("collection_date", monthStart)
        .lte("collection_date", monthEnd)
        .in("status", recognizedIncome),
      c
        .from("church_income_lines")
        .select("amount_tz")
        .not("collection_date", "is", null)
        .gte("collection_date", monthStart)
        .lte("collection_date", monthEnd)
        .in("status", recognizedIncome),
      c
        .from("church_finance_entries")
        .select("amount_tz")
        .eq("aina", "Mapato")
        .gte("entry_date", monthStart)
        .lte("entry_date", monthEnd)
        .in("status", recognizedFinance),
      c
        .from("church_finance_entries")
        .select("amount_tz")
        .eq("aina", "Matumizi")
        .gte("entry_date", monthStart)
        .lte("entry_date", monthEnd)
        .in("status", recognizedFinance),
      c
        .from("church_finance_entries")
        .select("kategoria, amount_tz")
        .eq("aina", "Mapato")
        .gte("entry_date", monthStart)
        .lte("entry_date", monthEnd)
        .in("status", recognizedFinance)
        .limit(15000),
      c
        .from("church_income_lines")
        .select("main_category, sub_category, source_name, amount_tz")
        .not("collection_date", "is", null)
        .gte("collection_date", monthStart)
        .lte("collection_date", monthEnd)
        .in("status", recognizedIncome)
        .limit(15000),
      c
        .from("church_income_lines")
        .select("source_name, amount_tz")
        .not("collection_date", "is", null)
        .gte("collection_date", monthStart)
        .lte("collection_date", monthEnd)
        .in("status", recognizedIncome)
        .limit(15000),
      Promise.resolve({ count: 0, error: null } as any),
      Promise.resolve({ count: 0, error: null } as any),
      Promise.resolve({ count: 0, error: null, data: [] } as any),
      Promise.resolve({ count: 0, error: null, data: [] } as any),
      Promise.resolve({ count: 0, error: null, data: [] } as any),
      Promise.resolve({ error: null, data: [] } as any),
    ]);

    const mapatoLeoTotal =
      readSumFrom(sumIncToday, ctx("kpi.church_income_lines.sum_mapato_today", "church_income_lines", "kpi.church_income_lines.sum_mapato_today")) +
      readSumFrom(sumFinMapatoToday, ctx("kpi.church_finance_entries.sum_mapato_today", "church_finance_entries", "kpi.church_finance_entries.sum_mapato_today"));
    const mapatoWikiTotal =
      readSumFrom(sumIncWeek, ctx("kpi.church_income_lines.sum_mapato_week", "church_income_lines", "kpi.church_income_lines.sum_mapato_week")) +
      readSumFrom(sumFinMapatoWeek, ctx("kpi.church_finance_entries.sum_mapato_week", "church_finance_entries", "kpi.church_finance_entries.sum_mapato_week"));
    const mapatoIncomeMwezi = readSumFrom(sumIncMonth, ctx("kpi.church_income_lines.sum_mapato_month", "church_income_lines", "kpi.church_income_lines.sum_mapato_month"));
    const mapatoFinanceMwezi = readSumFrom(sumFinMapatoMonth, ctx("kpi.church_finance_entries.sum_mapato_month", "church_finance_entries", "kpi.church_finance_entries.sum_mapato_month"));
    const mapatoMweziTotal = mapatoIncomeMwezi + mapatoFinanceMwezi;
    const yearToDateIncomeTotal =
      readSumFrom(sumIncYtd, ctx("kpi.church_income_lines.sum_mapato_ytd", "church_income_lines", "kpi.church_income_lines.sum_mapato_ytd")) +
      readSumFrom(sumFinMapatoYtd, ctx("kpi.church_finance_entries.sum_mapato_ytd", "church_finance_entries", "kpi.church_finance_entries.sum_mapato_ytd"));
    const lastMonthTotal =
      readSumFrom(sumIncPrev, ctx("kpi.church_income_lines.sum_mapato_prev_month", "church_income_lines", "kpi.church_income_lines.sum_mapato_prev_month")) +
      readSumFrom(sumFinMapatoPrev, ctx("kpi.church_finance_entries.sum_mapato_prev_month", "church_finance_entries", "kpi.church_finance_entries.sum_mapato_prev_month"));
    let growthVsLastMonthPercent: number | null = null;
    let growthVsLastMonthLabel = "—";
    if (lastMonthTotal > 0) {
      const rawGrowth = ((mapatoMweziTotal - lastMonthTotal) / lastMonthTotal) * 100;
      if (!Number.isFinite(rawGrowth)) {
        growthVsLastMonthPercent = null;
        growthVsLastMonthLabel = "—";
      } else {
        growthVsLastMonthPercent = Math.max(-9999, Math.min(9999, rawGrowth));
        growthVsLastMonthLabel = `${growthVsLastMonthPercent >= 0 ? "+" : ""}${growthVsLastMonthPercent.toFixed(1)}%`;
      }
    } else if (mapatoMweziTotal > 0 && lastMonthTotal === 0) {
      growthVsLastMonthPercent = 100;
      growthVsLastMonthLabel = "+100%";
    }

    const budget = readSumFrom(budgetSum, ctx("kpi.church_income_lines.sum_budgeted_month", "church_income_lines", "kpi.church_income_lines.sum_budgeted_month"));
    const actualIncomeMonth = readSumFrom(actualRecMonth, ctx("kpi.church_income_lines.sum_actual_recognized_month", "church_income_lines", "kpi.church_income_lines.sum_actual_recognized_month"));
    let budgetedVsActualLabel = "—";
    if (budget > 0) {
      const pct = Math.round((actualIncomeMonth / budget) * 100);
      const suffix = actualIncomeMonth > budget ? " (imezidi bajeti)" : "";
      budgetedVsActualLabel = `${pct}% · halisi TZS ${formatMoneyTz(actualIncomeMonth)} / bajeti TZS ${formatMoneyTz(budget)}${suffix}`;
    } else if (actualIncomeMonth > 0) {
      budgetedVsActualLabel = `Hakuna bajeti (DB) · halisi TZS ${formatMoneyTz(actualIncomeMonth)}`;
    }

    const pendingRecordsCrossModule =
      readCountFrom(pDay, ctx("kpi.pending_count.dayosisi", "dayosisi", "kpi.pending_count.dayosisi")) +
      readCountFrom(pJim, ctx("kpi.pending_count.church_jimbo", "church_jimbo", "kpi.pending_count.church_jimbo")) +
      readCountFrom(pTaw, ctx("kpi.pending_count.church_tawi", "church_tawi", "kpi.pending_count.church_tawi")) +
      readCountFrom(pVio, ctx("kpi.pending_count.church_viongozi", "church_viongozi", "kpi.pending_count.church_viongozi")) +
      readCountFrom(
        pFin,
        ctx("kpi.pending_count.church_finance_entries", "church_finance_entries", "kpi.pending_count.church_finance_entries")
      );

    const finCatRows = safeUnwrapRows(finCatRowsRes, ctx("church_finance_entries.mapato_by_category", "church_finance_entries", "church_finance_entries.mapato_by_category")) as {
      kategoria?: string | null;
      amount_tz?: unknown;
    }[];
    const incCatRows = safeUnwrapRows(incCatRowsRes, ctx("church_income_lines.mapato_by_category", "church_income_lines", "church_income_lines.mapato_by_category")) as {
      main_category?: string | null;
      sub_category?: string | null;
      source_name?: string | null;
      amount_tz?: unknown;
    }[];
    const mapatoKwaKategoriaMwezi = buildMapatoKwaKategoriaMwezi(finCatRows, incCatRows);
    const incBySourceRows = safeUnwrapRows(incBySourceRowsRes, ctx("church_income_lines.mapato_by_source", "church_income_lines", "church_income_lines.mapato_by_source")) as {
      source_name?: string | null;
      amount_tz?: unknown;
    }[];
    const incomeBySourceMwezi = buildIncomeBySourceMwezi(incBySourceRows);
    const categoryBreakdownTruncated = finCatRows.length >= 15000 || incCatRows.length >= 15000;

    return {
      dayosisiCount: readCountFrom(dCount, ctx("kpi.dayosisi.count", "dayosisi", "kpi.dayosisi.count")),
      majimboCount: readCountFrom(jCount, ctx("kpi.church_jimbo.count", "church_jimbo", "kpi.church_jimbo.count")),
      matawiCount: readCountFrom(tCount, ctx("kpi.church_tawi.count", "church_tawi", "kpi.church_tawi.count")),
      viongoziCount: readCountFrom(vCount, ctx("kpi.church_viongozi.count", "church_viongozi", "kpi.church_viongozi.count")),
      viongoziNgaziKuuCount: readCountFrom(vNkuuCount, ctx("kpi.church_viongozi.count_national", "church_viongozi", "kpi.church_viongozi.count_national")),
      viongoziDayosisiCount: readCountFrom(vDayCount, ctx("kpi.church_viongozi.count_dayosisi", "church_viongozi", "kpi.church_viongozi.count_dayosisi")),
      viongoziMajimboCount: readCountFrom(vJimCount, ctx("kpi.church_viongozi.count_majimbo", "church_viongozi", "kpi.church_viongozi.count_majimbo")),
      viongoziMatawiCount: readCountFrom(vTawCount, ctx("kpi.church_viongozi.count_matawi", "church_viongozi", "kpi.church_viongozi.count_matawi")),
      viongoziActiveCount: readCountFrom(vActiveCount, ctx("kpi.church_viongozi.count_active", "church_viongozi", "kpi.church_viongozi.count_active")),
      viongoziPendingCount: readCountFrom(vPendingCount, ctx("kpi.church_viongozi.count_pending", "church_viongozi", "kpi.church_viongozi.count_pending")),
      viongoziExpiringTermsCount: readCountFrom(vExpTermCount, ctx("kpi.church_viongozi.count_expiring_terms", "church_viongozi", "kpi.church_viongozi.count_expiring_terms")),
      jumuiyaCount:
        readCountFrom(jmCount, ctx("kpi.portal_domain_entities.jumuiya_non_idara.count", "portal_domain_entities", "kpi.portal_domain_entities.jumuiya_non_idara.count")) +
        readCountFrom(muJmCount, ctx("kpi.portal_domain_entities.muundo_jumuiya.count", "portal_domain_entities", "kpi.portal_domain_entities.muundo_jumuiya.count")),
      idaraCount:
        readCountFrom(idCount, ctx("kpi.portal_domain_entities.idara.count", "portal_domain_entities", "kpi.portal_domain_entities.idara.count")) +
        readCountFrom(muIdCount, ctx("kpi.portal_domain_entities.muundo_idara.count", "portal_domain_entities", "kpi.portal_domain_entities.muundo_idara.count")),
      hudumaCount:
        readCountFrom(hdCount, ctx("kpi.portal_domain_entities.huduma.count", "portal_domain_entities", "kpi.portal_domain_entities.huduma.count")) +
        readCountFrom(muHdCount, ctx("kpi.portal_domain_entities.muundo_huduma.count", "portal_domain_entities", "kpi.portal_domain_entities.muundo_huduma.count")),
      taasisiCount:
        readCountFrom(taCount, ctx("kpi.portal_domain_entities.taasisi.count", "portal_domain_entities", "kpi.portal_domain_entities.taasisi.count")) +
        readCountFrom(muTaCount, ctx("kpi.portal_domain_entities.muundo_taasisi.count", "portal_domain_entities", "kpi.portal_domain_entities.muundo_taasisi.count")),
      documentsCount: readCountFrom(docCount, ctx("kpi.documents.count", "documents", "kpi.documents.count")),
      totalFinanceSources: readCountFrom(srcAllCount, ctx("kpi.church_income_sources.count_all", "church_income_sources", "kpi.church_income_sources.count_all")),
      activeFinanceSources: readCountFrom(srcActiveCount, ctx("kpi.church_income_sources.count_active", "church_income_sources", "kpi.church_income_sources.count_active")),
      customFinanceSources: readCountFrom(srcCustomCount, ctx("kpi.church_income_sources.count_custom", "church_income_sources", "kpi.church_income_sources.count_custom")),
      restrictedFundsCount: readCountFrom(srcRestrictedCount, ctx("kpi.church_income_sources.count_restricted", "church_income_sources", "kpi.church_income_sources.count_restricted")),
      mapatoFedhaMweziMapato: readSumFrom(fedhaMapatoMwezi, ctx("kpi.church_finance_entries.sum_mapato_month_all", "church_finance_entries", "kpi.church_finance_entries.sum_mapato_month_all")),
      matumiziFedhaMwezi: readSumFrom(matumiziMwezi, ctx("kpi.church_finance_entries.sum_matumizi_month", "church_finance_entries", "kpi.church_finance_entries.sum_matumizi_month")),
      mapatoIncomeMwezi,
      mapatoLeoTotal,
      mapatoWikiTotal,
      mapatoMweziTotal,
      yearToDateIncomeTotal,
      jumlaZakaMwezi: readSumFrom(zakaSum, ctx("kpi.church_income_lines.sum_zaka_month", "church_income_lines", "kpi.church_income_lines.sum_zaka_month")),
      jumlaSadakaMwezi: readSumFrom(sadakaSum, ctx("kpi.church_income_lines.sum_sadaka_month", "church_income_lines", "kpi.church_income_lines.sum_sadaka_month")),
      jumlaUjenziMwezi: readSumFrom(ujenziSum, ctx("kpi.church_income_lines.sum_ujenzi_month", "church_income_lines", "kpi.church_income_lines.sum_ujenzi_month")),
      jumlaMatoleoMakusudiMwezi: readSumFrom(makusudiSum, ctx("kpi.church_income_lines.sum_matoleo_makusudi_month", "church_income_lines", "kpi.church_income_lines.sum_matoleo_makusudi_month")),
      jumlaDonationsMwezi: readSumFrom(donationsSum, ctx("kpi.church_income_lines.sum_donations_month", "church_income_lines", "kpi.church_income_lines.sum_donations_month")),
      pendingVerificationCount: readCountFrom(pendVerCnt, ctx("kpi.church_income_lines.count_submitted", "church_income_lines", "kpi.church_income_lines.count_submitted")),
      pendingVerificationSum: readSumFrom(pendVerSum, ctx("kpi.church_income_lines.sum_submitted", "church_income_lines", "kpi.church_income_lines.sum_submitted")),
      pendingApprovalIncomeCount: readCountFrom(pendApprCnt, ctx("kpi.church_income_lines.count_verified", "church_income_lines", "kpi.church_income_lines.count_verified")),
      pendingApprovalIncomeSum: readSumFrom(pendApprSum, ctx("kpi.church_income_lines.sum_verified", "church_income_lines", "kpi.church_income_lines.sum_verified")),
      restrictedFundBalance: readSumFrom(restrSum, ctx("kpi.church_income_lines.sum_restricted_ytd", "church_income_lines", "kpi.church_income_lines.sum_restricted_ytd")),
      unpostedCollectionsCount: readCountFrom(unpcCnt, ctx("kpi.church_income_lines.count_unposted", "church_income_lines", "kpi.church_income_lines.count_unposted")),
      unpostedCollectionsSum: readSumFrom(unpcSum, ctx("kpi.church_income_lines.sum_unposted", "church_income_lines", "kpi.church_income_lines.sum_unposted")),
      budgetedVsActualLabel: budgetedVsActualLabel,
      growthVsLastMonthPercent,
      growthVsLastMonthLabel,
      pendingRecordsCrossModule,
      incompleteLeadersCount: readCountFrom(incLeaders, ctx("kpi.church_viongozi.incomplete_count", "church_viongozi", "kpi.church_viongozi.incomplete_count")),
      mapatoKwaKategoriaMwezi,
      incomeBySourceMwezi,
      categoryBreakdownTruncated,
      failedKpis: kpiFailureCollector ?? {},
      activeStructuresCount: readCountFrom(structureActiveCnt, ctx("kpi.church_structure_entities.count_active", "church_structure_entities", "kpi.church_structure_entities.count_active")),
      pendingStructuresCount: readCountFrom(structurePendingCnt, ctx("kpi.church_structure_entities.count_pending", "church_structure_entities", "kpi.church_structure_entities.count_pending")),
      attendanceTodayCount: readCountFrom(attTodayCnt, ctx("kpi.attendance_sessions.count_today", "attendance_sessions", "kpi.attendance_sessions.count_today")),
      attendanceWeekCount: readCountFrom(attWeekCnt, ctx("kpi.attendance_sessions.count_week", "attendance_sessions", "kpi.attendance_sessions.count_week")),
      attendanceMonthCount: readCountFrom(attMonthCnt, ctx("kpi.attendance_sessions.count_month", "attendance_sessions", "kpi.attendance_sessions.count_month")),
      attendanceVisitorsMonth: readSumFrom(attVisitorsMonthSum, ctx("kpi.attendance_sessions.sum_visitors_month", "attendance_sessions", "kpi.attendance_sessions.sum_visitors_month")),
    };
  } catch (error) {
    if (import.meta.env.DEV) console.warn("[Dashboard KPI fetch fatal]", error);
    return {
      ...emptyDashboardKpiSnapshot(),
      failedKpis: kpiFailureCollector ?? { fatal: "Kipimo cha dashibodi kimeshindwa." },
    };
  } finally {
    kpiFailureCollector = null;
  }
}
