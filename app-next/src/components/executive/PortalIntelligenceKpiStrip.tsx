import { useMemo } from "react";
import {
  Activity,
  Building2,
  Church,
  Coins,
  HandCoins,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { emptyDashboardKpiSnapshot, type DashboardKpiSnapshot } from "../../services/dashboardKpiAggregatesService";
import { formatMoneyTz } from "../../lib/money";
import { safeKpiValue } from "../../lib/portalHardening/safeDisplay";
import { PremiumKPICard } from "./PremiumKPICard";

type Props = {
  kpi: DashboardKpiSnapshot | null | undefined;
  moduleKey: string;
  submodule?: string;
};

function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

/** KPI za kiwango cha juu — chanzo kimoja (dashibodi / Supabase). */
export function PortalIntelligenceKpiStrip({ kpi, moduleKey }: Props) {
  const snap = kpi ?? emptyDashboardKpiSnapshot();

  const cards = useMemo(() => {
    const base = [
      { title: "Viongozi", value: safeKpiValue(snap.viongoziCount), hint: `${safeKpiValue(snap.viongoziActiveCount, "0")} hai`, icon: <Users className="h-4 w-4" /> },
      { title: "Matawi", value: safeKpiValue(snap.matawiCount), hint: `${safeKpiValue(snap.matawiActiveCount, "0")} hai`, icon: <Church className="h-4 w-4" /> },
      { title: "Majimbo", value: safeKpiValue(snap.majimboCount), hint: "Majimbo yaliyosajiliwa", icon: <Building2 className="h-4 w-4" /> },
      { title: "Dayosisi", value: safeKpiValue(snap.dayosisiCount), hint: "Ngazi ya dayosisi", icon: <Building2 className="h-4 w-4" /> },
      { title: "Sadaka Leo", value: formatMoneyTz(snap.mapatoLeoTotal), hint: "Mapato ya leo", icon: <HandCoins className="h-4 w-4" /> },
      { title: "Zaka Wiki", value: formatMoneyTz(snap.mapatoWikiTotal), hint: "Wiki hii", icon: <Coins className="h-4 w-4" /> },
      { title: "Mapato Mwezi", value: formatMoneyTz(snap.mapatoMweziTotal), hint: "Mwezi huu", icon: <TrendingUp className="h-4 w-4" /> },
      { title: "Matumizi Mwezi", value: formatMoneyTz(snap.matumiziFedhaMwezi), hint: "Fedha", icon: <Coins className="h-4 w-4" /> },
      { title: "Rekodi Zinazosubiri", value: safeKpiValue(snap.pendingRecordsCrossModule), hint: "Ngazi zote", icon: <Activity className="h-4 w-4" /> },
      { title: "Afya ya Mfumo", value: Object.keys(snap.failedKpis ?? {}).length ? "Angalia" : "Nzuri", hint: "Usawazishaji KPI", icon: <Shield className="h-4 w-4" /> },
      { title: "Mahudhurio Mwezi", value: safeKpiValue(snap.attendanceMonthCount), hint: `Wageni ${safeKpiValue(snap.attendanceVisitorsMonth, "0")}`, icon: <Users className="h-4 w-4" /> },
      { title: "Mahudhurio Wiki", value: safeKpiValue(snap.attendanceWeekCount), hint: "Vikao wiki", icon: <Activity className="h-4 w-4" /> },
      { title: "Bajeti dhidi ya Halisi", value: safeKpiValue(snap.budgetedVsActualLabel), hint: "Mwezi", icon: <TrendingUp className="h-4 w-4" /> },
      { title: "Uhakiki Mapato", value: safeKpiValue(snap.pendingVerificationCount), hint: formatMoneyTz(snap.pendingVerificationSum), icon: <Shield className="h-4 w-4" /> },
      { title: "Viongozi Hai", value: safeKpiValue(snap.viongoziActiveCount), hint: `${safeKpiValue(snap.viongoziPendingCount, "0")} inasubiri`, icon: <Users className="h-4 w-4" /> },
      { title: "Ukuaji Mapato", value: pct(snap.growthVsLastMonthPercent), hint: snap.growthVsLastMonthLabel, icon: <TrendingUp className="h-4 w-4" /> },
      { title: "Mfuko Maalum", value: formatMoneyTz(snap.restrictedFundBalance), hint: "Salio", icon: <Coins className="h-4 w-4" /> },
      { title: "Haijachapishwa", value: safeKpiValue(snap.unpostedCollectionsCount), hint: formatMoneyTz(snap.unpostedCollectionsSum), icon: <HandCoins className="h-4 w-4" /> },
      { title: "Sajili Inasubiri", value: safeKpiValue(snap.matawiRegistryPendingReviewCount), hint: "Matawi", icon: <Church className="h-4 w-4" /> },
      { title: "Mahudhurio Leo", value: safeKpiValue(snap.attendanceTodayCount), hint: "Vikao leo", icon: <Activity className="h-4 w-4" /> },
    ];

    if (moduleKey === "fedha" || moduleKey === "mapato_income") {
      return base.filter((c) =>
        /Mapato|Matumizi|Sadaka|Zaka|subiri|Uhakiki|Mfuko|Haijachapishwa|Bajeti|Ukuaji/i.test(c.title),
      );
    }
    if (moduleKey === "muundo") {
      return base.filter((c) => /Matawi|Majimbo|Dayosisi|Sajili|Viongozi/i.test(c.title));
    }
    return base;
  }, [snap, moduleKey]);

  return (
    <section
      className="w-full min-w-0"
      aria-label="Vipimo vya uongozi"
    >
      <div className="mb-3 flex flex-col items-center gap-1 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600/90">
            Takwimu za ngazi
          </p>
          <p className="text-sm font-semibold text-[#0B1F3A]">
            Data hai kutoka injini ya dashibodi — Supabase
          </p>
        </div>
        <div className="hidden h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent sm:block" aria-hidden />
      </div>
      <div className="grid grid-cols-1 justify-items-center gap-3 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {cards.map((c, i) => (
          <PremiumKPICard
            key={c.title}
            title={c.title}
            value={c.value}
            hint={c.hint}
            icon={c.icon}
            index={i}
            live
          />
        ))}
      </div>
    </section>
  );
}
