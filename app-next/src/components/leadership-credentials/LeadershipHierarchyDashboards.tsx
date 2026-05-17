import { useMemo } from "react";
import { motion } from "framer-motion";
import { Building2, Church, Crown, TreePine } from "lucide-react";
import type { DashboardKpiSnapshot } from "../../services/dashboardKpiAggregatesService";
import type { HierarchyLeadershipCounts, LeadershipCredentialHubStats } from "../../lib/leadershipCredentialAnalytics";
import { PremiumKPICard } from "../executive/PremiumKPICard";

type Props = {
  stats: LeadershipCredentialHubStats;
  kpiLive?: DashboardKpiSnapshot | null;
  activeLevel: string;
  onLevelChange: (level: string) => void;
};

const LEVELS = [
  { id: "national", label: "KMK(T) Kitaifa", icon: Crown, emoji: "👑" },
  { id: "dayosisi", label: "Dayosisi", icon: Building2, emoji: "🏛️" },
  { id: "jimbo", label: "Jimbo", icon: Church, emoji: "⛪" },
  { id: "tawi", label: "Tawi / Kituo", icon: TreePine, emoji: "🌿" },
] as const;

export function LeadershipHierarchyDashboards({ stats, kpiLive, activeLevel, onLevelChange }: Props) {
  const cards = useMemo(() => {
    const by = stats.byLevel;
    return LEVELS.map((lv) => ({
      ...lv,
      count: by[lv.id as keyof HierarchyLeadershipCounts] ?? 0,
    }));
  }, [stats.byLevel]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <motion.div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-800/90">Dashibodi za ngazi</p>
          <h3 className="font-kmkt-display text-lg font-bold text-[#0B1F3A]">Uongozi kwa kila kiwango</h3>
        </motion.div>
        {kpiLive ? (
          <p className="text-[10px] font-semibold text-emerald-700">
            Live · {kpiLive.viongoziCount} viongozi · {kpiLive.matawiCount} matawi
          </p>
        ) : null}
      </div>
      <motion.div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          const active = activeLevel === c.id;
          return (
            <motion.button
              key={c.id}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -2 }}
              onClick={() => onLevelChange(c.id)}
              className={`text-left ${active ? "ring-2 ring-amber-400/80 ring-offset-2 rounded-2xl" : ""}`}
            >
              <PremiumKPICard
                index={i}
                title={`${c.emoji} ${c.label}`}
                value={String(c.count)}
                hint="Viongozi katika ngazi"
                icon={<Icon className="h-4 w-4" aria-hidden />}
                live={Boolean(kpiLive)}
              />
            </motion.button>
          );
        })}
      </motion.div>
    </section>
  );
}
