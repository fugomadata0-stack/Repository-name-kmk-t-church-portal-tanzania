import type { MasterBranchEngineSnapshot } from "../services/masterBranchEngineService";
import type { MahudhurioPeriodTotals } from "../services/branchEngineMahudhurioService";
import type { PortalPublicDashboardCounts } from "../services/portalPublicDashboardService";
import type { DashboardKpiSnapshot } from "../services/dashboardKpiAggregatesService";
import { formatMoneyTz } from "./money";

export type MatawiDdKpiRow = [string, string, string, string];
export type MatawiDdKpis = {
  tawi: MatawiDdKpiRow[];
  jimbo: MatawiDdKpiRow[];
  dayosisi: MatawiDdKpiRow[];
  kmkt: MatawiDdKpiRow[];
};

const COLORS = [
  "#22c55e", "#0ea5e9", "#ec4899", "#6366f1", "#a855f7", "#10b981", "#06b6d4", "#0891b2",
  "#16a34a", "#ef4444", "#eab308", "#7c3aed", "#f59e0b", "#64748b", "#0f766e", "#be123c",
] as const;

function tzs(n: number): string {
  return new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 }).format(Math.max(0, n)) + " TZS";
}

function num(n: number): string {
  return new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 }).format(Math.max(0, n));
}

function pct(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

/** Lebo za UI — Salio (si Saldo). */
function kpiLabel(label: string): string {
  return label.replace(/\bSaldo\b/gi, "Salio");
}

/** Maelezo ya kawaida ya waumini — sawa kwa ngazi zote. */
const WAUMINI_HINT = "Waumini waliosajiliwa";

function row(label: string, value: string, hint: string, colorIndex: number): MatawiDdKpiRow {
  const hintFixed = hint.replace(/\bSaldo\b/gi, "Salio");
  return [kpiLabel(label), value, hintFixed, COLORS[colorIndex % COLORS.length]];
}

function ngaziLevel(snapshot: MasterBranchEngineSnapshot, ngazi: "tawi" | "jimbo" | "dayosisi" | "kitaifa") {
  return snapshot.ngazi?.levels.find((l) => l.ngazi === ngazi) ?? null;
}

function sumLevels(snapshot: MasterBranchEngineSnapshot, ngazi: "tawi" | "jimbo" | "dayosisi") {
  const rows = snapshot.ngazi?.levels.filter((l) => l.ngazi === ngazi) ?? [];
  return rows.reduce(
    (acc, l) => ({
      mapato: acc.mapato + l.finance_mapato,
      matumizi: acc.matumizi + l.finance_matumizi,
      saldo: acc.saldo + l.finance_saldo,
      attendance: acc.attendance + l.attendance_total,
      members: acc.members + (l.members_count ?? 0),
      incomeLines: acc.incomeLines + l.income_lines_total,
    }),
    { mapato: 0, matumizi: 0, saldo: 0, attendance: 0, members: 0, incomeLines: 0 },
  );
}

function resolveMahudhurio(
  mahudhurio: MahudhurioPeriodTotals | null | undefined,
  pub: PortalPublicDashboardCounts | null,
  monthFallback: number,
): MahudhurioPeriodTotals {
  if (mahudhurio) return mahudhurio;
  return {
    leo: pub?.attendanceSessionsToday ?? 0,
    wiki: 0,
    mwezi: monthFallback,
    mwaka: monthFallback,
    wageniMwezi: pub?.attendanceVisitorsMonth ?? 0,
  };
}

function mahudhurioBlock(m: MahudhurioPeriodTotals, start: number): MatawiDdKpiRow[] {
  return [
    row("Mahudhurio Leo", num(m.leo), "Leo (TZ)", start),
    row("Mahudhurio Wiki", num(m.wiki), "Wiki hii", start + 1),
    row("Mahudhurio Mwezi", num(m.mwezi), "Mwezi huu", start + 2),
    row("Mahudhurio Mwaka", num(m.mwaka), "Mwaka huu", start + 3),
    row("Wageni Mwezi", num(m.wageniMwezi), "Wageni walioandikwa", start + 4),
  ];
}

/** KPI 30+ za ukurasa wa umma (nje). */
export function flattenPublicExecutiveKpis(
  snapshot: MasterBranchEngineSnapshot,
  pub?: PortalPublicDashboardCounts | null,
  mahudhurio?: MahudhurioPeriodTotals | null,
): MatawiDdKpiRow[] {
  const kpis = snapshotToMatawiDdKpis(snapshot, pub, mahudhurio);
  const out: MatawiDdKpiRow[] = [];
  const seen = new Set<string>();
  for (const block of [kpis.kmkt, kpis.dayosisi, kpis.jimbo, kpis.tawi]) {
    for (const r of block) {
      const k = r[0].toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(r);
    }
  }
  return out;
}

/** KPI cards kwa HTML module — waumini (si familia), mahudhurio leo/wiki/mwezi/mwaka. */
export function snapshotToMatawiDdKpis(
  snapshot: MasterBranchEngineSnapshot,
  pub?: PortalPublicDashboardCounts | null,
  mahudhurio?: MahudhurioPeriodTotals | null,
): MatawiDdKpis {
  const c = snapshot.counts;
  const r = snapshot.ngazi?.rollup;
  const td = snapshot.tawiDetail;
  const p = pub ?? null;

  const waumini = td?.members.total ?? r?.members_count ?? c.waumini;
  const wanaume = td?.members.male ?? 0;
  const wanawake = td?.members.female ?? 0;
  const vijana = td?.members.youth ?? 0;
  const watoto = td?.members.children ?? 0;
  const katekumeni = td?.members.catechumen ?? 0;
  const waliobatizwa = td?.members.baptized ?? 0;
  const monthHeadcount = td?.attendanceHeadcountMonth ?? r?.attendance_total ?? c.attendanceHeadcountMonth;
  const mh = resolveMahudhurio(mahudhurio, p, monthHeadcount);
  const mapato = td?.finance.mapatoMwezi ?? r?.finance_mapato ?? c.financeMapatoMwezi;
  const mapatoLeo = td?.finance.mapatoLeo ?? 0;
  const mapatoWiki = td?.finance.mapatoWiki ?? 0;
  const matumizi = td?.finance.matumiziMwezi ?? r?.finance_matumizi ?? c.financeMatumiziMwezi;
  const saldo = td?.finance.saldoMwezi ?? r?.finance_saldo ?? c.financeSaldoMwezi;
  const viongoziTawi = td?.leadership.total ?? c.viongozi;
  const wazee = td?.leadership.elders ?? 0;
  const viongoziVijana = td?.leadership.jvLeaders ?? 0;
  const viongoziWanawake = td?.leadership.jwLeaders ?? 0;
  const pendingFin = td?.finance.pendingApprovals ?? c.pendingApprovals;
  const matawiInactive = Math.max(0, c.matawi - c.matawiActive);
  const tawiSum = sumLevels(snapshot, "tawi");
  const jimboSum = sumLevels(snapshot, "jimbo");
  const dayosisiSum = sumLevels(snapshot, "dayosisi");
  const nat = ngaziLevel(snapshot, "kitaifa");

  const tawi: MatawiDdKpiRow[] = [
    row("Jumla Waumini", num(waumini), WAUMINI_HINT, 0),
    row("Wanaume", num(wanaume), "Waumini — wanaume", 1),
    row("Wanawake", num(wanawake), "Waumini — wanawake", 2),
    row("Vijana", num(vijana), "Waumini — vijana", 3),
    row("Watoto", num(watoto), "Waumini — watoto", 4),
    row("Katekumeni", num(katekumeni), "Waumini — katekumeni", 5),
    row("Waliobatizwa", num(waliobatizwa), "Waumini — waliobatizwa", 6),
    ...mahudhurioBlock(mh, 7),
    row("Viongozi Tawi", num(viongoziTawi), "Viongozi", 12),
    row("Wazee / Washemasi", num(wazee), "Viongozi wazee", 13),
    row("Viongozi Vijana", num(viongoziVijana), "JVKMK(T)", 14),
    row("Viongozi Wanawake", num(viongoziWanawake), "Jumuiya ya wanawake", 15),
    row("Mapato Leo", tzs(mapatoLeo), "Fedha — leo", 16),
    row("Mapato Wiki", tzs(mapatoWiki), "Fedha — wiki", 17),
    row("Mapato Mwezi", tzs(mapato), "Fedha — mwezi", 18),
    row("Matumizi Mwezi", tzs(matumizi), "Matumizi", 19),
    row("Salio Mwezi", tzs(saldo), "Salio", 20),
    row("Mistari Mapato", num(c.incomeLinesMwezi), "Mistari ya mapato", 21),
    row("Vibali Fedha", num(pendingFin), "Inasubiri", 22),
    row("Mali (rekodi)", td?.placeholders.assetsTotal != null ? num(td.placeholders.assetsTotal) : "—", "Mali", 23),
    row("Miradi Hai", td?.placeholders.projectsActive != null ? num(td.placeholders.projectsActive) : "—", "Miradi", 24),
    row("Usajiri Imethibitishwa", p?.matawiRegistryVerified != null ? num(p.matawiRegistryVerified) : "—", "Tawi", 25),
    row("Sajili Inasubiri", p?.matawiRegistryPendingReview != null ? num(p.matawiRegistryPendingReview) : "—", "Uhakiki", 26),
    row("Jimbo", snapshot.sublabel ?? "—", "Muktadha", 27),
    row("Hali Tawi", c.matawiActive > 0 ? "Inaendelea" : "Angalia", "Uendeshaji", 28),
    row("Afya Data", snapshot.ngazi ? "Hai" : "Inasawazishwa", "Supabase", 29),
    row("Sasisho", new Date(snapshot.loadedAt).toLocaleString("sw-TZ", { hour: "2-digit", minute: "2-digit" }), "Muda halisi", 30),
  ];

  const jimbo: MatawiDdKpiRow[] = [
    row("Matawi", num(c.matawi), "Matawi chini ya jimbo", 0),
    row("Matawi Hai", num(c.matawiActive), "Yanayoendesha", 1),
    row("Matawi Hai %", pct(c.matawiActive, c.matawi), "Uendeshaji", 2),
    row("Matawi Haijatumika", num(matawiInactive), "Haijatumika", 3),
    row("Waumini", num(waumini), WAUMINI_HINT, 4),
    row("Viongozi", num(c.viongozi), "Viongozi", 5),
    ...mahudhurioBlock(mh, 6),
    row("Mapato", tzs(mapato), "Mapato mwezi", 11),
    row("Matumizi", tzs(matumizi), "Matumizi", 12),
    row("Salio", tzs(saldo), "Salio", 13),
    row("Mistari Mapato", num(c.incomeLinesMwezi), "Mistari ya mapato", 14),
    row("Vibali", num(c.pendingApprovals), "Inasubiri", 15),
    row("Mapato (ngazi jimbo)", tzs(jimboSum.mapato), "Jumla jimbo", 16),
    row("Mahudhurio (ngazi jimbo)", num(jimboSum.attendance), "Mwezi", 17),
    row("Waumini (ngazi jimbo)", num(jimboSum.members), "Jumla jimbo", 18),
    row("Wastani Waumini/Tawi", c.matawi > 0 ? num(Math.round(waumini / c.matawi)) : "0", "Wastani", 19),
    row("Nyaraka", p?.nyaraka != null ? num(p.nyaraka) : "—", "Taifa", 20),
    row("Matukio", p?.matukio != null ? num(p.matukio) : "—", "Taifa", 21),
    row("Sajili Inasubiri", p?.matawiRegistryPendingReview != null ? num(p.matawiRegistryPendingReview) : "—", "Sajili", 22),
    row("Imethibitishwa", p?.matawiRegistryVerified != null ? num(p.matawiRegistryVerified) : "—", "Imethibitishwa", 23),
    row("Matawi Inasubiri", p?.matawiPending != null ? num(p.matawiPending) : "—", "Hali", 24),
    row("Salio Ngazi", tzs(jimboSum.saldo), "Jimbo", 25),
    row("Afya Ngazi", snapshot.ngazi ? "Hai" : "Inasawazishwa", "Supabase", 26),
  ];

  const dayosisi: MatawiDdKpiRow[] = [
    row("Dayosisi", num(c.dayosisi), "Dayosisi", 0),
    row("Majimbo", num(c.majimbo), "Majimbo", 1),
    row("Matawi", num(c.matawi), "Matawi / vituo", 2),
    row("Matawi Hai", num(c.matawiActive), "Yanayoendesha", 3),
    row("Waumini", num(waumini), WAUMINI_HINT, 4),
    row("Viongozi", num(c.viongozi), "Viongozi", 5),
    ...mahudhurioBlock(mh, 6),
    row("Mapato", tzs(mapato), "Mapato", 11),
    row("Matumizi", tzs(matumizi), "Matumizi", 12),
    row("Salio", tzs(saldo), "Salio", 13),
    row("Vibali", num(c.pendingApprovals), "Inasubiri", 14),
    row("Mapato (ngazi)", tzs(dayosisiSum.mapato), "Jumla dayosisi", 15),
    row("Mahudhurio (ngazi)", num(dayosisiSum.attendance), "Mwezi", 16),
    row("Waumini (ngazi)", num(dayosisiSum.members), "Jumla dayosisi", 17),
    row("Wastani/Majimbo", c.majimbo > 0 ? num(Math.round(c.matawi / c.majimbo)) : "0", "Matawi kwa jimbo", 18),
    row("Nyaraka", p?.nyaraka != null ? num(p.nyaraka) : "—", "Taifa", 19),
    row("Matukio", p?.matukio != null ? num(p.matukio) : "—", "Taifa", 20),
    row("Sajili Inasubiri", p?.matawiRegistryPendingReview != null ? num(p.matawiRegistryPendingReview) : "—", "Sajili", 21),
    row("Afya Ngazi", snapshot.ngazi ? "Hai" : "Inasawazishwa", "Supabase", 22),
  ];

  const kmkt: MatawiDdKpiRow[] = [
    row("Dayosisi", num(c.dayosisi), "Rasmi", 0),
    row("Majimbo", num(c.majimbo), "Majimbo", 1),
    row("Matawi", num(c.matawi), "Matawi / vituo", 2),
    row("Matawi Hai", num(c.matawiActive), "Yanayoendesha", 3),
    row("Matawi Hai %", pct(c.matawiActive, c.matawi), "Kiwango", 4),
    row("Matawi Haijatumika", num(matawiInactive), "Haijatumika", 5),
    row("Waumini", num(waumini), WAUMINI_HINT, 6),
    row("Viongozi", num(c.viongozi), "Viongozi", 7),
    ...mahudhurioBlock(mh, 8),
    row("Mapato Kitaifa", tzs(mapato), "Mwezi", 13),
    row("Matumizi Kitaifa", tzs(matumizi), "Mwezi", 14),
    row("Salio Kitaifa", tzs(saldo), "Mwezi", 15),
    row("Mistari Mapato", num(c.incomeLinesMwezi), "Mistari ya mapato", 16),
    row("Vibali", num(c.pendingApprovals), "Inasubiri", 17),
    row("Nyaraka", p?.nyaraka != null ? num(p.nyaraka) : "—", "Nyaraka", 18),
    row("Matukio", p?.matukio != null ? num(p.matukio) : "—", "Matukio", 19),
    row("Sajili Inasubiri", p?.matawiRegistryPendingReview != null ? num(p.matawiRegistryPendingReview) : "—", "Sajili", 20),
    row("Imethibitishwa", p?.matawiRegistryVerified != null ? num(p.matawiRegistryVerified) : "—", "Imethibitishwa", 21),
    row("Matawi Inasubiri", p?.matawiPending != null ? num(p.matawiPending) : "—", "Hali", 22),
    row("Wastani Waumini/Tawi", c.matawi > 0 ? num(Math.round(waumini / c.matawi)) : "0", "Wastani", 23),
    row("Mapato (jumla)", tzs(nat?.finance_mapato ?? mapato), "Kitaifa", 24),
    row("Mahudhurio (jumla mwezi)", num(nat?.attendance_total ?? monthHeadcount), "Kitaifa", 25),
    row("Tawi — Jumla Waumini", num(tawiSum.members), "Ngazi tawi", 26),
    row("Jimbo — Jumla Waumini", num(jimboSum.members), "Ngazi jimbo", 27),
    row("Dayosisi — Jumla Waumini", num(dayosisiSum.members), "Ngazi dayosisi", 28),
    row("Afya ya Mfumo", snapshot.ngazi ? "Nzuri · Hai" : "Inasawazishwa", "Muda halisi", 29),
    row("Sasisho", new Date(snapshot.loadedAt).toLocaleString("sw-TZ", { hour: "2-digit", minute: "2-digit" }), "Muda halisi", 30),
  ];

  return { tawi, jimbo, dayosisi, kmkt };
}

function mergeKpiRows(base: MatawiDdKpiRow[], extras: MatawiDdKpiRow[]): MatawiDdKpiRow[] {
  const seen = new Set(base.map((r) => r[0].trim().toLowerCase()));
  const out = [...base];
  for (const e of extras) {
    const k = e[0].trim().toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

/** Unganisha KPI za dashibodi kuu (chanzo kimoja) na KPI za injini ya ngazi. */
export function mergeDashboardIntoMatawiDdKpis(
  kpis: MatawiDdKpis,
  dash?: DashboardKpiSnapshot | null,
): MatawiDdKpis {
  if (!dash) return kpis;
  const start = 31;
  const dashRows: MatawiDdKpiRow[] = [
    row("Sadaka Mwezi", formatMoneyTz(dash.jumlaSadakaMwezi), "Injini ya dashibodi", start),
    row("Zaka Mwezi", formatMoneyTz(dash.jumlaZakaMwezi), "Injini ya dashibodi", start + 1),
    row("Mapato Mwezi (Jumla)", formatMoneyTz(dash.mapatoMweziTotal), "Mapato + fedha", start + 2),
    row("Mapato Leo", formatMoneyTz(dash.mapatoLeoTotal), "Leo", start + 3),
    row("Mapato Wiki", formatMoneyTz(dash.mapatoWikiTotal), "Wiki", start + 4),
    row("Matumizi Mwezi (Jumla)", formatMoneyTz(dash.matumiziFedhaMwezi), "Fedha", start + 5),
    row("Pending Rekodi", num(dash.pendingRecordsCrossModule), "Ngazi zote", start + 6),
    row("Uhakiki Mapato", num(dash.pendingVerificationCount), `TZS ${formatMoneyTz(dash.pendingVerificationSum)}`, start + 7),
    row("Idhini Mapato", num(dash.pendingApprovalIncomeCount), `TZS ${formatMoneyTz(dash.pendingApprovalIncomeSum)}`, start + 8),
    row("Salio Restricted", formatMoneyTz(dash.restrictedFundBalance), "Restricted fund", start + 9),
    row("Makusudi Mwezi", formatMoneyTz(dash.jumlaMatoleoMakusudiMwezi), "Matoleo", start + 10),
    row("Donations Mwezi", formatMoneyTz(dash.jumlaDonationsMwezi), "Ruzuku", start + 11),
    row("Ukuaji Kanisa", dash.growthVsLastMonthLabel || "—", pctLabel(dash.growthVsLastMonthPercent), start + 12),
    row("Budget vs Actual", dash.budgetedVsActualLabel || "—", "Mwezi", start + 13),
    row("Viongozi Active", num(dash.viongoziActiveCount), `${dash.viongoziPendingCount} pending`, start + 14),
    row("Viongozi Expiring", num(dash.viongoziExpiringTermsCount), "Muda unaokwisha", start + 15),
    row("Mahudhurio Leo (DB)", num(dash.attendanceTodayCount), "Vikao", start + 16),
    row("Mahudhurio Wiki (DB)", num(dash.attendanceWeekCount), "Vikao", start + 17),
    row("Wageni Mwezi (DB)", num(dash.attendanceVisitorsMonth), "Wageni", start + 18),
    row("Matawi Pending Review", num(dash.matawiRegistryPendingReviewCount), "Sajili", start + 19),
    row("Unposted Collections", num(dash.unpostedCollectionsCount), `TZS ${formatMoneyTz(dash.unpostedCollectionsSum)}`, start + 20),
    row("YTD Mapato", formatMoneyTz(dash.yearToDateIncomeTotal), "Mwaka", start + 21),
  ];
  return {
    tawi: mergeKpiRows(kpis.tawi, dashRows.slice(0, 8)),
    jimbo: mergeKpiRows(kpis.jimbo, dashRows),
    dayosisi: mergeKpiRows(kpis.dayosisi, dashRows),
    kmkt: mergeKpiRows(kpis.kmkt, dashRows),
  };
}

function pctLabel(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}
