import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { MasterBranchEngineCardDef } from "../../data/masterBranchEngineCards";

type Props = {
  card: MasterBranchEngineCardDef;
  disabled?: boolean;
  onOpen: () => void;
  index: number;
};

export function MasterBranchEngineCard({ card, disabled, onOpen, index }: Props) {
  const Icon = card.icon;
  return (
    <motion.button
      type="button"
      disabled={disabled}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.28 }}
      whileHover={disabled ? undefined : { y: -4, scale: 1.01 }}
      whileTap={disabled ? undefined : { scale: 0.99 }}
      onClick={onOpen}
      className={`group relative flex min-h-[118px] w-full flex-col overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br p-4 text-left text-white shadow-lg backdrop-blur-md transition ${
        card.gradient
      } ${disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer hover:shadow-xl"}`}
    >
      <motion.div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10"
        animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 transition group-hover:opacity-100"
        animate={{ x: ["-120%", "120%"] }}
        transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
      />
      <motion.div
        className="relative mb-3 grid h-10 w-10 place-items-center rounded-xl bg-white/15 shadow-inner"
        whileHover={{ rotate: [0, -6, 6, 0] }}
        transition={{ duration: 0.45 }}
      >
        <Icon className="h-5 w-5 text-amber-100" aria-hidden />
      </motion.div>
      <p className="relative text-sm font-bold leading-snug">{card.title}</p>
      <p className="relative mt-1 flex-1 text-[11px] leading-relaxed text-white/85">{card.subtitle}</p>
      <span className="relative mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-100/95">
        Fungua
        <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </span>
    </motion.button>
  );
}
