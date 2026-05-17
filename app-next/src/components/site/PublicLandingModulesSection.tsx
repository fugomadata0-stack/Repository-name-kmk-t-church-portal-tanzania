import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { MODULE_SURFACE_THEMES } from "./publicLandingThemes";

export type PublicModuleCard = {
  title: string;
  desc: string;
  icon: LucideIcon;
};

export function PublicLandingModulesSection({
  modules,
  onModuleGate,
}: {
  modules: readonly PublicModuleCard[];
  onModuleGate: (title: string) => void;
}) {
  return (
    <section id="modules-overview" className="relative z-10 mx-auto w-full max-w-[min(100%,96rem)] px-4 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center md:text-left"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300/90">Maktaba ya moduli</p>
        <h3 className="font-kmkt-display text-xl font-bold text-white md:text-2xl">Vipengele vya mfumo</h3>
        <p className="mt-1 text-sm text-slate-400">
          Vinjari maktaba ya moduli kabla ya kuingia — kila kadi ina rangi yake. Bofya moduli ili kuona arifa ya ruhusa.
        </p>
      </motion.div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {modules.map((m, idx) => {
          const theme = MODULE_SURFACE_THEMES[idx % MODULE_SURFACE_THEMES.length];
          const Icon = m.icon;
          return (
            <motion.button
              key={m.title}
              type="button"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ delay: idx * 0.03, type: "spring", stiffness: 380, damping: 26 }}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onModuleGate(m.title)}
              className={`group relative w-full overflow-hidden rounded-2xl border ${theme.border} bg-gradient-to-br ${theme.bg} p-4 text-left shadow-lg ${theme.glow} backdrop-blur-md transition-shadow duration-300 hover:shadow-2xl`}
            >
              <motion.div
                className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10 blur-2xl"
                animate={{ opacity: [0.2, 0.45, 0.2] }}
                transition={{ duration: 4 + (idx % 3), repeat: Infinity }}
                aria-hidden
              />
              <div className="relative flex items-start gap-3">
                <div className={`rounded-xl bg-gradient-to-br p-2.5 text-white shadow-inner ${theme.icon}`}>
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm font-bold ${theme.heading}`}>{m.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${theme.badge}`}>
                      {theme.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-300/95">{m.desc}</p>
                </div>
              </div>
              <div className="relative mt-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 opacity-0 transition group-hover:opacity-100">
                <Lock className="h-3 w-3" aria-hidden />
                Ingia kufungua
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
