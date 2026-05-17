import { useMemo, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Church, TreePine } from "lucide-react";
import type { DashboardKpiSnapshot } from "../../services/dashboardKpiAggregatesService";
import type { DayosisiRecord, JimboRecord, TawiRecord } from "../../types";
import { formatMoneyTz } from "../../lib/money";
import { navigateToMasterBranchEngine } from "../../lib/navigateToMasterBranchEngine";
import type { MasterBranchNavigateTarget } from "../../lib/navigateToMasterBranchEngine";
import { DashboardHero } from "../executive/DashboardHero";
import { PremiumKPICard } from "../executive/PremiumKPICard";
import { HierarchyReportsExportBar } from "./HierarchyReportsExportBar";

export type HierarchyRegistryLevel = "dayosisi" | "jimbo" | "matawi";

const LEVEL_META: Record<
  HierarchyRegistryLevel,
  { title: string; emoji: string; engineTarget: MasterBranchNavigateTarget; icon: typeof Building2 }
> = {
  dayosisi: { title: "Dayosisi", emoji: "🏛️", engineTarget: "dayosisi", icon: Building2 },
  jimbo: { title: "Majimbo", emoji: "⛪", engineTarget: "jimbo", icon: Church },
  matawi: { title: "Matawi / Vituo", emoji: "🌿", engineTarget: "matawi", icon: TreePine },
};

type Props = {
  level: HierarchyRegistryLevel;
  kpi?: DashboardKpiSnapshot | null;
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
  children: ReactNode;
};

/** Ukurasa kamili wa orodha ya ngazi — ripoti + KPI + jedwali. */
export function HierarchyRegistryHub({ level, kpi, dayosisi, majimbo, matawi, children }: Props) {
  const meta = LEVEL_META[level];
  const Icon = meta.icon;

  const rowCount =
    level === "dayosisi" ? dayosisi.length : level === "jimbo" ? majimbo.length : matawi.length;

  const activeCount = useMemo(() => {
    const rows = level === "dayosisi" ? dayosisi : level === "jimbo" ? majimbo : matawi;
    return rows.filter((r) => {
      const s = String((r as { status?: string }).status ?? "").toLowerCase();
      return s !== "inactive" && s !== "archived" && s !== "suspended";
    }).length;
  }, [level, dayosisi, majimbo, matawi]);

  const kpiCards = useMemo(() => {
    if (!kpi) return [];
    const common = [
      { title: "Mapato Mwezi", value: formatMoneyTz(kpi.mapatoMweziTotal), hint: "Dashibodi" },
      { title: "Matumizi Mwezi", value: formatMoneyTz(kpi.matumiziFedhaMwezi), hint: "Fedha" },
      { title: "Pending", value: String(kpi.pendingRecordsCrossModule), hint: "Rekodi" },
      { title: "Viongozi", value: String(kpi.viongoziCount), hint: `${kpi.viongoziActiveCount} active` },
    ];
    if (level === "dayosisi") {
      return [
        { title: "Dayosisi", value: String(kpi.dayosisiCount), hint: "Rasmi" },
        { title: "Majimbo", value: String(kpi.majimboCount), hint: "Jimbo" },
        { title: "Matawi", value: String(kpi.matawiCount), hint: `${kpi.matawiActiveCount} active` },
        ...common,
      ];
    }
    if (level === "jimbo") {
      return [
        { title: "Majimbo", value: String(kpi.majimboCount), hint: "Rasmi" },
        { title: "Matawi", value: String(kpi.matawiCount), hint: `${kpi.matawiActiveCount} active` },
        { title: "Orodha (ukurasa)", value: String(rowCount), hint: `${activeCount} active` },
        ...common,
      ];
    }
    return [
      { title: "Matawi", value: String(kpi.matawiCount), hint: `${kpi.matawiActiveCount} active` },
      { title: "Sajili Inasubiri", value: String(kpi.matawiRegistryPendingReviewCount), hint: "Uhakiki" },
      { title: "Orodha (ukurasa)", value: String(rowCount), hint: `${activeCount} active` },
      ...common,
    ];
  }, [kpi, level, rowCount, activeCount]);

  return (
    <div className="w-full min-w-0 space-y-4">
      <DashboardHero
        title={`${meta.emoji} ${meta.title} — Orodha & Takwimu`}
        subtitle="Ripoti rasmi, KPI za dashibodi, na usimamizi wa rekodi — skrini nzima."
        actions={
          <button
            type="button"
            onClick={() => navigateToMasterBranchEngine(meta.engineTarget)}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-400/90 to-amber-200/90 px-4 py-2 text-xs font-bold text-[#0a1628] shadow-md hover:brightness-105"
          >
            <Icon className="h-4 w-4" aria-hidden />
            Injini ya Ngazi
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        }
      />

      {kpiCards.length > 0 ? (
        <div className="grid grid-cols-1 justify-items-center gap-3 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
          {kpiCards.map((c, i) => (
            <PremiumKPICard key={c.title} title={c.title} value={c.value} hint={c.hint} index={i} static live={false} />
          ))}
        </div>
      ) : null}

      <HierarchyReportsExportBar dayosisi={dayosisi} majimbo={majimbo} matawi={matawi} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="w-full min-w-0 [&_section]:w-full"
      >
        {children}
      </motion.div>
    </div>
  );
}
