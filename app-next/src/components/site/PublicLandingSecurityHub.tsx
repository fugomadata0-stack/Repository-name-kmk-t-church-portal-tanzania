import { motion } from "framer-motion";
import { Fingerprint, KeyRound, ScrollText, ShieldCheck } from "lucide-react";
import { CONTENT_PANEL_THEMES } from "./publicLandingThemes";

const SECURITY_ITEMS = [
  {
    icon: KeyRound,
    title: "Roles & Permissions",
    text: "Ruhusa za mfumo zinadhibitiwa kwa ngazi (Roles & Permissions).",
  },
  {
    icon: ScrollText,
    title: "Audit Trail",
    text: "Audit Trail inarekodi mabadiliko muhimu kwa uwajibikaji.",
  },
  {
    icon: Fingerprint,
    title: "Data ya umma",
    text: "Data za umma zinaoneshwa kwa sera za Supabase na RLS.",
  },
] as const;

export function PublicLandingSecurityHub() {
  const theme = CONTENT_PANEL_THEMES.security;

  return (
    <section className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-8">
      <motion.article
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={`overflow-hidden rounded-2xl border ${theme.border} bg-gradient-to-br ${theme.bg} p-5 shadow-xl ${theme.glow} backdrop-blur-md`}
      >
        <div className="flex items-center gap-3">
          <span className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${theme.icon} text-white shadow-inner`}>
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-300/90">Usalama wa taasisi</p>
            <h4 className={`font-kmkt-display text-lg font-bold ${theme.heading}`}>Usalama, Roles & Permissions</h4>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {SECURITY_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -2 }}
                className={`rounded-xl border ${theme.itemBorder} ${theme.itemBg} p-4`}
              >
                <Icon className="h-5 w-5 text-indigo-300" aria-hidden />
                <p className="mt-2 text-sm font-bold text-white">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.text}</p>
              </motion.div>
            );
          })}
        </div>
      </motion.article>
    </section>
  );
}
