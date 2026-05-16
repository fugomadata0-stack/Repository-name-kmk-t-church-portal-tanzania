import type { MasterBranchEngineSnapshot } from "../services/masterBranchEngineService";

export type MatawiDdKpiRow = [string, string, string, string];
export type MatawiDdKpis = {
  tawi: MatawiDdKpiRow[];
  jimbo: MatawiDdKpiRow[];
  dayosisi: MatawiDdKpiRow[];
  kmkt: MatawiDdKpiRow[];
};

function tzs(n: number): string {
  return (
    new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 }).format(Math.max(0, n)) + " TZS"
  );
}

function num(n: number): string {
  return new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 }).format(Math.max(0, n));
}

/** Badilisha snapshot ya portal kuwa muundo wa KPI cards kwenye HTML module. */
export function snapshotToMatawiDdKpis(snapshot: MasterBranchEngineSnapshot): MatawiDdKpis {
  const c = snapshot.counts;
  const r = snapshot.ngazi?.rollup;
  const td = snapshot.tawiDetail;

  const waumini = td?.members.total ?? r?.members_count ?? c.waumini;
  const wanaume = td?.members.male ?? 0;
  const wanawake = td?.members.female ?? 0;
  const vijana = td?.members.youth ?? 0;
  const watoto = td?.members.children ?? 0;
  const waliobatizwa = td?.members.baptized ?? 0;
  const attendanceSessions = td?.attendanceSessionsMonth ?? r?.attendance_sessions ?? c.attendanceSessionsMonth;
  const attendance = td?.attendanceHeadcountMonth ?? r?.attendance_total ?? c.attendanceHeadcountMonth;
  const mapato = td?.finance.mapatoMwezi ?? r?.finance_mapato ?? c.financeMapatoMwezi;
  const matumizi = td?.finance.matumiziMwezi ?? r?.finance_matumizi ?? c.financeMatumiziMwezi;
  const saldo = td?.finance.saldoMwezi ?? r?.finance_saldo ?? c.financeSaldoMwezi;
  const viongoziTawi = td?.leadership.total ?? c.viongozi;
  const pendingFin = td?.finance.pendingApprovals ?? c.pendingApprovals;

  return {
    tawi: [
      ["Jumla Waumini", num(waumini), "Idadi yote ya waumini", "#22c55e"],
      ["Wanaume", num(wanaume), "Wanaume", "#0ea5e9"],
      ["Wanawake", num(wanawake), "Wanawake", "#ec4899"],
      ["Vijana", num(vijana), "Vijana / JVKMK(T)", "#6366f1"],
      ["Watoto", num(watoto), "Watoto / Shule ya Jumapili", "#a855f7"],
      ["Waliobatizwa", num(waliobatizwa), "Waliobatizwa", "#10b981"],
      ["Vikao Mwezi", num(attendanceSessions), "Vikao vya mahudhurio", "#06b6d4"],
      ["Mahudhurio Mwezi", num(attendance), "Jumla ya mahudhurio", "#0891b2"],
      ["Mapato Mwezi", tzs(mapato), "Mapato", "#16a34a"],
      ["Matumizi Mwezi", tzs(matumizi), "Matumizi", "#ef4444"],
      ["Saldo Mwezi", tzs(saldo), "Saldo", "#eab308"],
      ["Viongozi", num(viongoziTawi), "Viongozi wa tawi", "#7c3aed"],
      ["Mistari Mapato", num(c.incomeLinesMwezi), "Income lines (mwezi)", "#0ea5e9"],
      ["Vibali Fedha", num(pendingFin), "Inasubiri uhakiki", "#f59e0b"],
      ["Familia", num(c.families), "Familia / nyumba", "#64748b"],
    ],
    jimbo: [
      ["Matawi", num(c.matawi), "Matawi chini ya jimbo", "#0ea5e9"],
      ["Matawi Active", num(c.matawiActive), "Yanayoendesha", "#22c55e"],
      ["Majimbo", num(c.majimbo), "—", "#f59e0b"],
      ["Waumini", num(waumini), "Muhtasari wa waumini", "#22c55e"],
      ["Vikao Mahudhurio", num(attendanceSessions), "Vikao (mwezi)", "#06b6d4"],
      ["Mahudhurio", num(attendance), "Jumla mahudhurio", "#0891b2"],
      ["Mapato", tzs(mapato), "Fedha kutoka matawi", "#16a34a"],
      ["Matumizi", tzs(matumizi), "Matumizi", "#ef4444"],
      ["Saldo", tzs(saldo), "Saldo mwezi", "#eab308"],
      ["Vibali", num(c.pendingApprovals), "Inasubiri", "#f59e0b"],
    ],
    dayosisi: [
      ["Majimbo", num(c.majimbo), "Majimbo chini ya dayosisi", "#f59e0b"],
      ["Matawi", num(c.matawi), "Matawi / vituo", "#0ea5e9"],
      ["Matawi Active", num(c.matawiActive), "Yanayoendesha", "#22c55e"],
      ["Waumini", num(waumini), "Waumini dayosisi", "#22c55e"],
      ["Familia", num(c.families), "Familia", "#64748b"],
      ["Mapato", tzs(mapato), "Mapato consolidated", "#16a34a"],
      ["Matumizi", tzs(matumizi), "Matumizi", "#ef4444"],
      ["Saldo", tzs(saldo), "Saldo", "#eab308"],
      ["Mahudhurio", num(attendance), "Mahudhurio", "#06b6d4"],
      ["Viongozi", num(c.viongozi), "Viongozi", "#7c3aed"],
      ["Vibali", num(c.pendingApprovals), "Pending approvals", "#ef4444"],
    ],
    kmkt: [
      ["Dayosisi", num(c.dayosisi), "Dayosisi rasmi", "#0ea5e9"],
      ["Majimbo", num(c.majimbo), "Majimbo", "#22c55e"],
      ["Matawi", num(c.matawi), "Matawi / vituo", "#0ea5e9"],
      ["Matawi Active", num(c.matawiActive), "Yanayoendesha", "#22c55e"],
      ["Waumini", num(waumini), "Wanachama", "#22c55e"],
      ["Familia", num(c.families), "Familia", "#64748b"],
      ["Mapato Kitaifa", tzs(mapato), "Mapato national", "#16a34a"],
      ["Matumizi Kitaifa", tzs(matumizi), "Matumizi", "#ef4444"],
      ["Saldo Kitaifa", tzs(saldo), "Saldo", "#eab308"],
      ["Mahudhurio Kitaifa", num(attendance), "Mahudhurio", "#06b6d4"],
      ["Vikao Mahudhurio", num(attendanceSessions), "Vikao (mwezi)", "#0891b2"],
      ["Viongozi", num(c.viongozi), "Viongozi", "#7c3aed"],
      ["Mistari Mapato", num(c.incomeLinesMwezi), "Income lines", "#0ea5e9"],
      ["Vibali", num(c.pendingApprovals), "Inasubiri", "#f59e0b"],
      ["Afya ya Mfumo", snapshot.ngazi ? "OK" : "Sync", "Realtime / RPC", "#22c55e"],
    ],
  };
}
