import { useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

interface Props {
  canBack?: boolean;
  className?: string;
}

/** ← Rudi Nyuma — sticky, glass, inafanya kazi kila moduli. */
export function GlobalBackButton({ canBack = true, className = "" }: Props) {
  const goBack = useCallback(() => {
    if (!canBack) return;
    window.dispatchEvent(new Event("kmt-portal-submodule-back"));
  }, [canBack]);

  useEffect(() => {
    if (!canBack) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canBack, goBack]);

  return (
    <motion.button
      type="button"
      disabled={!canBack}
      onClick={goBack}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={canBack ? { scale: 1.03 } : undefined}
      whileTap={canBack ? { scale: 0.97 } : undefined}
      className={`group sticky top-2 z-30 inline-flex items-center gap-2 rounded-full border border-white/20 bg-gradient-to-r from-[#061633]/95 to-[#123C69]/95 px-4 py-2 text-sm font-semibold text-white shadow-xl shadow-slate-900/30 backdrop-blur-md transition disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      title={canBack ? "Rudi nyuma (Alt+←)" : "Tayari kwenye ukurasa wa kwanza"}
      aria-label="Rudi nyuma"
    >
      <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" aria-hidden />
      Rudi Nyuma
    </motion.button>
  );
}
