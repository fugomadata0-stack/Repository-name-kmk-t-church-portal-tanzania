import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCircle2, Info, ShieldAlert, X } from "lucide-react";
import type { PublicLandingNotice, PublicLandingNoticeLevel } from "../../hooks/usePublicLandingNotices";

function levelStyles(level: PublicLandingNoticeLevel) {
  switch (level) {
    case "success":
      return {
        border: "border-emerald-400/50",
        bg: "bg-gradient-to-br from-emerald-950/95 via-[#061633]/95 to-[#0a1628]/95",
        icon: "text-emerald-300",
        Icon: CheckCircle2,
      };
    case "warn":
      return {
        border: "border-amber-400/50",
        bg: "bg-gradient-to-br from-amber-950/95 via-[#061633]/95 to-[#0a1628]/95",
        icon: "text-amber-300",
        Icon: ShieldAlert,
      };
    default:
      return {
        border: "border-sky-400/50",
        bg: "bg-gradient-to-br from-sky-950/95 via-[#061633]/95 to-[#0a1628]/95",
        icon: "text-sky-300",
        Icon: Info,
      };
  }
}

export function PublicLandingNoticeHost({
  notices,
  onDismiss,
}: {
  notices: PublicLandingNotice[];
  onDismiss: (id: string) => void;
}) {
  return (
    <motion.div
      className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-[min(100vw-2rem,22rem)] flex-col gap-2 sm:bottom-6 sm:right-6"
      aria-live="polite"
      aria-relevant="additions"
    >
      <AnimatePresence mode="popLayout">
        {notices.map((n) => {
          const s = levelStyles(n.level);
          const Icon = s.Icon;
          return (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: 24, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className={`pointer-events-auto overflow-hidden rounded-2xl border ${s.border} ${s.bg} p-3 shadow-2xl shadow-black/50 backdrop-blur-xl ring-1 ring-white/10`}
              role="status"
            >
              <motion.div
                className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                animate={{ opacity: [0.3, 0.9, 0.3] }}
                transition={{ duration: 2.2, repeat: Infinity }}
                aria-hidden
              />
              <motion.div className="flex gap-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 ${s.icon}`}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-300">{n.title}</p>
                  <p className="mt-0.5 text-sm leading-snug text-white">{n.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDismiss(n.id)}
                  className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Funga arifa"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {notices.length === 0 ? (
        <span className="sr-only">
          <Bell aria-hidden />
        </span>
      ) : null}
    </motion.div>
  );
}
