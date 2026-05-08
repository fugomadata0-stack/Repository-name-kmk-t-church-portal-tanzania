import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function GlassPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/30 bg-white/70 shadow-lg backdrop-blur-md dark:bg-slate-900/40 ${className}`}
    >
      {children}
    </div>
  );
}

export function MotionCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      whileHover={{ scale: 1.012, boxShadow: "0 18px 40px rgba(11,60,93,0.12)" }}
      className={`rounded-xl transition-shadow ${className}`}
    >
      {children}
    </motion.div>
  );
}
