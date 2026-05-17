import { motion } from "framer-motion";
import { Activity, Shield } from "lucide-react";
import type { ReactNode } from "react";

/** Hero ya dashibodi / ukurasa wa kuingia — muonekano wa kiwango cha juu. */
export function DashboardHero({
  title,
  subtitle,
  liveAt,
  actions,
}: {
  title: string;
  subtitle?: string;
  liveAt?: string | null;
  actions?: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mb-6 overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#061633] via-[#123C69] to-[#061633] p-5 shadow-2xl sm:p-7"
    >
      <motion.div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-400/15 blur-3xl" />
      <motion.div
        className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-sky-400/10 blur-2xl"
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 5, repeat: Infinity }}
      />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-300/90">
            <Shield className="h-3.5 w-3.5" aria-hidden />
            KMK(T) — Enterprise Portal
          </p>
          <h1 className="font-kmkt-display mt-2 text-2xl font-black text-white sm:text-3xl lg:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-3xl text-sm text-blue-100/85 sm:text-base">{subtitle}</p> : null}
          {liveAt ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-100">
              <Activity className="h-3.5 w-3.5 animate-pulse" aria-hidden />
              <span data-kpi-live="true">Sync live</span>
              <span className="font-normal text-emerald-200/80">
                {new Date(liveAt).toLocaleString("sw-TZ", { dateStyle: "short", timeStyle: "short" })}
              </span>
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </motion.section>
  );
}
