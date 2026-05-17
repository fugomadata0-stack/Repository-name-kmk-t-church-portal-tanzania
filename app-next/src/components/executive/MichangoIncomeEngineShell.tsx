import { useMemo, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Coins, FileSpreadsheet, HandCoins, Landmark, Printer, TrendingUp } from "lucide-react";
import type { DashboardKpiSnapshot } from "../../services/dashboardKpiAggregatesService";
import { formatMoneyTz } from "../../lib/money";
import { navigatePortalModule } from "../../lib/navigatePortalModule";
import { DashboardHero } from "./DashboardHero";
import { PremiumKPICard } from "./PremiumKPICard";

export type MichangoPageStats = {
  grandTotal: number;
  thisMonthIncome: number;
  thisYearIncome: number;
  filteredRowCount: number;
  pendingAmount: number;
  restrictedBalance: number;
  topSource: string;
  topCategory: string;
};

type Props = {
  submodule?: string;
  kpiLive?: DashboardKpiSnapshot | null;
  stats: MichangoPageStats;
  onExportExcel: () => void | Promise<void>;
  onExportPdf: () => void | Promise<void>;
  onPrint: () => void;
  children: ReactNode;
};

/** Kichwa cha Michango / Mapato — hero, KPI za ukurasa, na vitendo vya ripoti. */
export function MichangoIncomeEngineShell({
  submodule,
  kpiLive,
  stats,
  onExportExcel,
  onExportPdf,
  onPrint,
  children,
}: Props) {
  const cards = useMemo(() => {
    const list: { title: string; value: string; hint?: string; icon?: ReactNode }[] = [
      {
        title: "Jumla (Uchujaji)",
        value: `TZS ${formatMoneyTz(stats.grandTotal)}`,
        hint: `${stats.filteredRowCount} mistari`,
        icon: <Coins className="h-4 w-4" aria-hidden />,
      },
      {
        title: "Mwezi / Mwaka",
        value: `TZS ${formatMoneyTz(stats.thisMonthIncome)} / ${formatMoneyTz(stats.thisYearIncome)}`,
        hint: "Kulingana na vichujio",
        icon: <TrendingUp className="h-4 w-4" aria-hidden />,
      },
      {
        title: "Inasubiri",
        value: `TZS ${formatMoneyTz(stats.pendingAmount)}`,
        hint: "Draft · Submitted · Verified",
        icon: <HandCoins className="h-4 w-4" aria-hidden />,
      },
      {
        title: "Restricted Fund",
        value: `TZS ${formatMoneyTz(stats.restrictedBalance)}`,
        hint: "Salio la kikomo",
        icon: <Coins className="h-4 w-4" aria-hidden />,
      },
      {
        title: "Chanzo Bora",
        value: stats.topSource,
        hint: stats.topCategory,
        icon: <TrendingUp className="h-4 w-4" aria-hidden />,
      },
    ];
    if (kpiLive) {
      list.splice(2, 0, {
        title: "Mapato Mwezi",
        value: `TZS ${formatMoneyTz(kpiLive.mapatoMweziTotal)}`,
        hint: "Dashibodi · live",
        icon: <Coins className="h-4 w-4" aria-hidden />,
      });
      list.splice(3, 0, {
        title: "Zaka / Sadaka",
        value: `TZS ${formatMoneyTz(kpiLive.jumlaZakaMwezi)} / ${formatMoneyTz(kpiLive.jumlaSadakaMwezi)}`,
        hint: "KPI rasmi",
        icon: <HandCoins className="h-4 w-4" aria-hidden />,
      });
    }
    return list;
  }, [kpiLive, stats]);

  return (
    <div className="w-full min-w-0 space-y-4">
      <DashboardHero
        title={`💰 Michango & Mapato${submodule ? ` — ${submodule}` : ""}`}
        subtitle="Injini ya mapato: vichujio, chati, ulinganisho wa benki, na orodha ya mistari — skrini nzima."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigatePortalModule("fedha", "Mapato / Income")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur hover:bg-white/15"
            >
              <Landmark className="h-4 w-4" aria-hidden />
              Injini ya Fedha
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => void onExportExcel()}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-400/90 to-amber-200/90 px-4 py-2 text-xs font-bold text-[#0a1628] shadow-md hover:brightness-105"
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
              Excel
            </button>
            <button
              type="button"
              onClick={() => void onExportPdf()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-[#0B1F3A] px-4 py-2 text-xs font-bold text-amber-200 shadow-md hover:bg-[#123C69]"
            >
              PDF
            </button>
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur hover:bg-white/15"
            >
              <Printer className="h-4 w-4" aria-hidden />
              Chapisha
            </button>
          </div>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4"
      >
        {cards.map((c, i) => (
          <PremiumKPICard
            key={c.title}
            title={c.title}
            value={c.value}
            hint={c.hint}
            icon={c.icon}
            index={i}
            live={Boolean(kpiLive)}
          />
        ))}
      </motion.div>

      {children}
    </div>
  );
}
