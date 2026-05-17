import { useMemo, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Award, FileCheck2, RefreshCw, ShieldCheck, Users } from "lucide-react";
import type { DashboardKpiSnapshot } from "../../services/dashboardKpiAggregatesService";
import type { LeadershipCredentialHubStats } from "../../lib/leadershipCredentialAnalytics";
import { DashboardHero } from "../executive/DashboardHero";
import { PremiumKPICard } from "../executive/PremiumKPICard";

type Props = {
  kpiLive?: DashboardKpiSnapshot | null;
  stats: LeadershipCredentialHubStats;
  globalCertsTotal?: number;
  loading?: boolean;
  onRefresh: () => void;
  levelTabs: ReactNode;
  children: ReactNode;
};

export function LeadershipCredentialsEngineShell({
  kpiLive,
  stats,
  globalCertsTotal,
  loading,
  onRefresh,
  levelTabs,
  children,
}: Props) {
  const kpiCards = useMemo(
    () => [
      {
        title: "Viongozi",
        value: String(stats.totalLeaders),
        hint: kpiLive ? `${kpiLive.viongoziActiveCount} active (portal)` : "Ngazi zote",
        icon: <Users className="h-4 w-4" aria-hidden />,
      },
      {
        title: "Vyeti rasmi",
        value: String(globalCertsTotal ?? stats.officialCertsTotal),
        hint: `${stats.approvedCerts} verified/approved`,
        icon: <FileCheck2 className="h-4 w-4" aria-hidden />,
      },
      {
        title: "Inasubiri",
        value: String(stats.pendingApprovals),
        hint: "Uidhinishaji",
        icon: <ShieldCheck className="h-4 w-4" aria-hidden />,
      },
      {
        title: "Ukamilifu",
        value: `${stats.avgFillPercent}%`,
        hint: "Wastani wa auto-fill",
        icon: <Award className="h-4 w-4" aria-hidden />,
      },
    ],
    [stats, kpiLive, globalCertsTotal],
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <DashboardHero
        title="Cheti & CV — Injini ya Ngazi Kuu"
        subtitle="Vyeti vya kitaifa, dayosisi, jimbo na tawi — PDF ya kiwango cha juu, uhakiki wa umma, na workflow rasmi."
        actions={
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-white/15"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Sasisha
          </button>
        }
      />

      <motion.div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((c, i) => (
          <PremiumKPICard key={c.title} index={i} title={c.title} value={c.value} hint={c.hint} icon={c.icon} live={Boolean(kpiLive)} />
        ))}
      </motion.div>

      <div className="rounded-2xl border border-amber-200/40 bg-gradient-to-r from-[#0B1F3A]/5 via-white to-amber-50/30 p-3 shadow-sm">
        {levelTabs}
      </div>

      {children}
    </motion.div>
  );
}
