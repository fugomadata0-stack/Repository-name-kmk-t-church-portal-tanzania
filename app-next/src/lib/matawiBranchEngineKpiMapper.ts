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

  const waumini = r?.members_count ?? c.waumini;
  const attendance = r?.attendance_total ?? c.attendanceHeadcountMonth;
  const mapato = r?.finance_mapato ?? c.financeMapatoMwezi;
  const matumizi = r?.finance_matumizi ?? c.financeMatumiziMwezi;
  const saldo = r?.finance_saldo ?? c.financeSaldoMwezi;

  return {
    tawi: [
      ["Total Waumini", num(waumini), "Idadi yote ya waumini", "#22c55e"],
      ["Mahudhurio Mwezi", num(attendance), "Jumla ya mahudhurio", "#06b6d4"],
      ["Mapato Mwezi", tzs(mapato), "Mapato", "#16a34a"],
      ["Matumizi Mwezi", tzs(matumizi), "Matumizi", "#ef4444"],
      ["Saldo Mwezi", tzs(saldo), "Saldo", "#eab308"],
      ["Viongozi", num(c.viongozi), "Viongozi wa tawi", "#6366f1"],
      ["Vibali", num(c.pendingApprovals), "Inasubiri", "#f59e0b"],
      ["Mistari Mapato", num(c.incomeLinesMwezi), "Income lines", "#0ea5e9"],
    ],
    jimbo: [
      ["Matawi", num(c.matawi), "Branches under Jimbo", "#0ea5e9"],
      ["Matawi Active", num(c.matawiActive), "Operational", "#22c55e"],
      ["Waumini", num(waumini), "Members summary", "#22c55e"],
      ["Mahudhurio", num(attendance), "Attendance summary", "#06b6d4"],
      ["Finance", tzs(mapato), "Fedha kutoka matawi", "#16a34a"],
      ["Saldo", tzs(saldo), "Saldo mwezi", "#eab308"],
    ],
    dayosisi: [
      ["Majimbo", num(c.majimbo), "Majimbo under Dayosisi", "#f59e0b"],
      ["Matawi", num(c.matawi), "Total branches", "#0ea5e9"],
      ["Waumini", num(waumini), "Diocese members", "#22c55e"],
      ["Finance Summary", tzs(mapato), "Mapato consolidate", "#16a34a"],
      ["Mahudhurio", num(attendance), "Attendance", "#06b6d4"],
      ["Vibali", num(c.pendingApprovals), "Pending approvals", "#ef4444"],
    ],
    kmkt: [
      ["Dayosisi", num(c.dayosisi), "Official dioceses", "#0ea5e9"],
      ["Majimbo", num(c.majimbo), "Confirmed majimbo", "#22c55e"],
      ["Matawi", num(c.matawi), "Total branches", "#0ea5e9"],
      ["Matawi Active", num(c.matawiActive), "Operational", "#22c55e"],
      ["National Finance", tzs(mapato), "Mapato national", "#16a34a"],
      ["National Attendance", num(attendance), "Attendance all levels", "#06b6d4"],
      ["Waumini", num(waumini), "Wanachama", "#22c55e"],
      ["System Health", snapshot.ngazi ? "OK" : "Sync", "Realtime status", "#22c55e"],
    ],
  };
}
