import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** Full-width executive container — hakuna nafasi tupu isiyolazimu. */
export function ExecutiveLayout({
  children,
  bleed = false,
  className = "",
}: {
  children: ReactNode;
  bleed?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={
        bleed
          ? `w-full min-w-0 max-w-[100%] ${className}`
          : `mx-auto w-full min-w-0 max-w-[100%] px-2 sm:px-3 md:px-4 lg:px-5 ${className}`
      }
    >
      {children}
    </motion.div>
  );
}
