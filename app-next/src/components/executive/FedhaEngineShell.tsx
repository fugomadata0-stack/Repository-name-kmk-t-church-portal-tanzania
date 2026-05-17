import { useMemo, type ReactNode } from "react";
import {
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  FileSpreadsheet,
  HandCoins,
  Landmark,
  Printer,
  Scale,
  TrendingUp,
} from "lucide-react";
import type { DashboardKpiSnapshot } from "../../services/dashboardKpiAggregatesService";
import { formatMoneyTz } from "../../lib/money";
import { navigatePortalModule } from "../../lib/navigatePortalModule";
import { DashboardHero } from "./DashboardHero";
import { PremiumKPICard } from "./PremiumKPICard";

export type FedhaPageStats = {
  rowCount: number;
  mapatoTotal: number;
  matumiziTotal: number;
  michangoTotal: number;
  netBalance: number;
  pendingCount: number;
  topCategory: string;
};

type Props = {
  submodule?: string;
  kpiLive?: DashboardKpiSnapshot | null;
  stats: FedhaPageStats;
  onExportExcel: () => void | Promise<void>;
  onExportPdf: () => void | Promise<void>;
  onPrint: () => void;
  children: ReactNode;
};

/** Kichwa cha Fedha — hero, KPI za ukurasa, na vitendo vya ripoti. */
export function FedhaEngineShell({
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
        title: "Mapato (Uchujaji)",
        value: `TZS ${formatMoneyTz(stats.mapatoTotal)}`,
        hint: `${stats.rowCount} miamala`,
        icon: <ArrowUpCircle className="h-4 w-4" aria-hidden />,
      },
      {
        title: "Matumizi",
        value: `TZS ${formatMoneyTz(stats.matumiziTotal)}`,
        hint: "Mwezi / orodha",
        icon: <ArrowDownCircle className="h-4 w-4" aria-hidden />,
      },
      {
        title: "Salio Halisi",
        value: `TZS ${formatMoneyTz(stats.netBalance)}`,
        hint: "Mapato − matumizi",
        icon: <Scale className="h-4 w-4" aria-hidden />,
      },
      {
        title: "Michango",
        value: `TZS ${formatMoneyTz(stats.michangoTotal)}`,
        hint: stats.topCategory,
        icon: <Landmark className="h-4 w-4" aria-hidden />,
      },
      {
        title: "Inasubiri",
        value: String(stats.pendingCount),
        hint: "Hali isiyokamilika",
        icon: <TrendingUp className="h-4 w-4" aria-hidden />,
      },
    ];
    if (kpiLive) {
      list.splice(1, 0, {
        title: "Mapato Mwezi",
        value: `TZS ${formatMoneyTz(kpiLive.mapatoMweziTotal)}`,
        hint: "Dashibodi · live",
        icon: <ArrowUpCircle className="h-4 w-4" aria-hidden />,
      });
      list.splice(2, 0, {
        title: "Matumizi Mwezi",
        value: `TZS ${formatMoneyTz(kpiLive.matumiziFedhaMwezi)}`,
        hint: "KPI rasmi",
        icon: <ArrowDownCircle className="h-4 w-4" aria-hidden />,
      });
    }
    return list;
  }, [kpiLive, stats]);

  return (
    <div className="w-full min-w-0 space-y-4">
      <DashboardHero
        title={`🏦 Fedha & Miamala${submodule ? ` — ${submodule}` : ""}`}
        subtitle="Mapato, matumizi, michango — orodha, Excel/PDF, na ufuatiliaji wa ngazi."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigatePortalModule("mapato_income", "Sadaka za Kawaida")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur hover:bg-white/15"
            >
              <HandCoins className="h-4 w-4" aria-hidden />
              Michango & Mapato
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

      <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
        {cards.map((c, i) => (
          <PremiumKPICard
            key={c.title}
            title={c.title}
            value={c.value}
            hint={c.hint}
            icon={c.icon}
            index={i}
            static
            live={Boolean(kpiLive)}
          />
        ))}
      </div>

      {children}
    </div>
  );
}
