import { memo } from "react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { safeHint, safeKpiValue } from "../../lib/portalHardening/safeDisplay";

const TONES = [
  "from-emerald-600/90 via-emerald-800/80 to-emerald-950 border-emerald-400/50 shadow-emerald-500/20",
  "from-sky-600/90 via-sky-800/80 to-slate-950 border-sky-400/50 shadow-sky-500/20",
  "from-amber-500/90 via-amber-700/80 to-amber-950 border-amber-300/55 shadow-amber-500/25",
  "from-violet-600/90 via-violet-800/80 to-violet-950 border-violet-400/50 shadow-violet-500/20",
  "from-rose-600/90 via-rose-800/80 to-rose-950 border-rose-400/50 shadow-rose-500/20",
  "from-cyan-600/90 via-cyan-800/80 to-cyan-950 border-cyan-400/50 shadow-cyan-500/20",
] as const;

type PremiumKPICardProps = {
  title: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  live?: boolean;
  onClick?: () => void;
  className?: string;
  index?: number;
};

function PremiumKPICardInner({
  title,
  value,
  hint,
  icon,
  live = true,
  onClick,
  className = "",
  index = 0,
}: PremiumKPICardProps) {
  const reducedMotion = usePrefersReducedMotion();
  const grad = TONES[index % TONES.length];
  const displayValue = safeKpiValue(value);
  const displayHint = safeHint(hint);
  const displayTitle = safeKpiValue(title, "Kipimo");

  const cardClass = `portal-kpi-card relative flex min-h-[7.25rem] w-full flex-col justify-center overflow-hidden rounded-2xl border bg-gradient-to-br p-4 text-center shadow-xl ${grad} ${onClick ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400" : ""}`;

  const inner = (
    <>
      {live && !reducedMotion ? (
        <span className="absolute right-3 top-3 h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#4ade80]" />
      ) : live ? (
        <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-emerald-400/90" />
      ) : null}
      {!reducedMotion ? (
        <motion.div
          className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl"
          animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.5, 0.35] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />
      ) : (
        <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" aria-hidden />
      )}
      <div className="relative z-[1] flex flex-col items-center gap-2">
        {icon ? <span className="text-white/90">{icon}</span> : null}
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/85">{displayTitle}</p>
      </div>
      <p className="relative z-[1] mt-3 text-2xl font-black tabular-nums tracking-tight text-white drop-shadow-sm">
        {displayValue}
      </p>
      {displayHint ? (
        <p className="relative z-[1] mx-auto mt-1.5 max-w-[18rem] text-[11px] leading-relaxed text-white/80">{displayHint}</p>
      ) : null}
    </>
  );

  const shellClass = `portal-kpi-shell w-full min-h-[7.5rem] max-w-sm justify-self-center ${className}`.trim();

  if (reducedMotion) {
    return (
      <div className={shellClass}>
        {onClick ? (
          <button type="button" onClick={onClick} data-kpi-live={live ? "true" : undefined} className={cardClass}>
            {inner}
          </button>
        ) : (
          <article data-kpi-live={live ? "true" : undefined} className={cardClass}>
            {inner}
          </article>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.2), duration: 0.28 }}
      whileHover={{ y: -2, scale: 1.01 }}
      className={shellClass}
    >
      {onClick ? (
        <button type="button" onClick={onClick} data-kpi-live={live ? "true" : undefined} className={cardClass}>
          {inner}
        </button>
      ) : (
        <article data-kpi-live={live ? "true" : undefined} className={cardClass}>
          {inner}
        </article>
      )}
    </motion.div>
  );
}

export const PremiumKPICard = memo(PremiumKPICardInner);
