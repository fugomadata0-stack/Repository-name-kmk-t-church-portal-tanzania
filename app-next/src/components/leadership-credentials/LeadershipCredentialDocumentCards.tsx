import { motion } from "framer-motion";
import { Download, FileBadge, Loader2 } from "lucide-react";
import {
  ADVANCED_PDF_LABELS,
  type AdvancedLeadershipPdfKind,
} from "../../lib/leadershipPdfEngine";

type Props = {
  kinds: AdvancedLeadershipPdfKind[];
  busy: boolean;
  disabled?: boolean;
  activeKind?: AdvancedLeadershipPdfKind | null;
  onGenerate: (kind: AdvancedLeadershipPdfKind) => void;
};

export function LeadershipCredentialDocumentCards({
  kinds,
  busy,
  disabled,
  activeKind,
  onGenerate,
}: Props) {
  return (
    <motion.div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {kinds.map((kind, i) => {
        const meta = ADVANCED_PDF_LABELS[kind];
        const isActive = busy && activeKind === kind;
        return (
          <motion.button
            key={kind}
            type="button"
            disabled={disabled || busy}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            whileHover={disabled || busy ? undefined : { y: -3, scale: 1.01 }}
            whileTap={disabled || busy ? undefined : { scale: 0.99 }}
            onClick={() => onGenerate(kind)}
            className="group relative overflow-hidden rounded-2xl border border-[#0B1F3A]/12 bg-gradient-to-br from-white via-slate-50 to-amber-50/40 p-4 text-left shadow-sm transition hover:border-amber-400/50 hover:shadow-lg disabled:opacity-50"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-200/30 blur-2xl transition group-hover:bg-amber-300/40" />
            <div className="flex items-start justify-between gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1F3A] text-amber-200 shadow-md">
                {isActive ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileBadge className="h-5 w-5" />}
              </span>
              <Download className="h-4 w-4 text-slate-400 transition group-hover:text-[#0B1F3A]" />
            </div>
            <p className="mt-3 font-kmkt-display text-sm font-bold text-[#0B1F3A]">{meta.sw}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{meta.en}</p>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
