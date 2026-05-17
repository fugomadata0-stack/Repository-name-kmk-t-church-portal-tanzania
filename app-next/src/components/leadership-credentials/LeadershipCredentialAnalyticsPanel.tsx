import { motion } from "framer-motion";
import { GraduationCap, LineChart, Timer } from "lucide-react";
import type { LeadershipCredentialAutoFill } from "../../lib/certificateEngine/autoFill";
import type {
  EducationKindStat,
  LeadershipCredentialHubStats,
  LeadershipGrowthPoint,
  ServiceDurationBucket,
} from "../../lib/leadershipCredentialAnalytics";

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <motion.div className="flex justify-between text-[10px] font-semibold text-slate-600">
        <span>{label}</span>
        <span className="tabular-nums text-[#0B1F3A]">{value}</span>
      </motion.div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-[#0B1F4D] via-[#123C69] to-amber-500"
        />
      </div>
    </div>
  );
}

type Props = {
  stats: LeadershipCredentialHubStats;
  serviceBuckets: ServiceDurationBucket[];
  educationStats: EducationKindStat[];
  growth: LeadershipGrowthPoint[];
  leaderName?: string;
  autoFill: LeadershipCredentialAutoFill | null;
};

export function LeadershipCredentialAnalyticsPanel({
  stats,
  serviceBuckets,
  educationStats,
  growth,
  leaderName,
  autoFill,
}: Props) {
  const maxService = Math.max(1, ...serviceBuckets.map((b) => b.count));
  const maxEdu = Math.max(1, ...educationStats.map((e) => e.count));

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <motion.article
        layout
        className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
      >
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0B1F3A]">
          <Timer className="h-4 w-4 text-amber-600" />
          Uzoefu wa huduma
        </p>
        <p className="mt-0.5 text-[10px] text-slate-500">
          {leaderName ? `— ${leaderName}` : "Chagua kiongozi kwa takwimu za mtu"}
        </p>
        <div className="mt-4 space-y-3">
          {serviceBuckets.map((b) => (
            <BarRow key={b.label} label={b.label} value={b.count} max={maxService} />
          ))}
        </div>
        {autoFill?.fields?.yearsInMinistry?.filled ? (
          <p className="mt-3 text-[10px] text-slate-500">
            Miaka katika huduma: <strong>{autoFill.fields.yearsInMinistry.display}</strong>
          </p>
        ) : null}
      </motion.article>

      <motion.article layout className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0B1F3A]">
          <GraduationCap className="h-4 w-4 text-sky-600" />
          Elimu
        </p>
        <div className="mt-4 space-y-3">
          {educationStats.map((e) => (
            <BarRow key={e.kind} label={e.label} value={e.count} max={maxEdu} />
          ))}
        </div>
      </motion.article>

      <motion.article layout className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0B1F3A]">
          <LineChart className="h-4 w-4 text-emerald-600" />
          Ukuaji wa uongozi
        </p>
        <p className="mt-0.5 text-[10px] text-slate-500">
          Jumla vyeti: {stats.officialCertsTotal} · Wastani ukamilifu: {stats.avgFillPercent}%
        </p>
        <div className="mt-4 space-y-3">
          {growth.map((g) => (
            <BarRow key={g.label} label={g.label} value={g.value} max={g.max} />
          ))}
        </div>
      </motion.article>
    </section>
  );
}
