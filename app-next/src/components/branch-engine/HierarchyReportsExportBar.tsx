import { useCallback, useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { usePortal } from "../../context/PortalContext";
import {
  exportDioceseExecutivePdf,
  exportJimboSummaryPdf,
  exportTawiSummaryPdf,
} from "../../lib/kmktHierarchyReportsPdf";
import type { DayosisiRecord, JimboRecord, TawiRecord } from "../../types";

type Props = {
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
};

type ReportKey = "dayosisi" | "majimbo" | "matawi";

export function HierarchyReportsExportBar({ dayosisi, majimbo, matawi }: Props) {
  const { pushToast } = usePortal();
  const [activeOnly, setActiveOnly] = useState(true);
  const [busy, setBusy] = useState<ReportKey | null>(null);

  const runExport = useCallback(
    async (key: ReportKey, fn: () => Promise<void>) => {
      if (busy) return;
      setBusy(key);
      try {
        await fn();
        pushToast("Ripoti ya PDF imetengenezwa.", "success");
      } catch (err) {
        pushToast(err instanceof Error ? err.message : "Imeshindwa kutengeneza PDF.", "error");
      } finally {
        setBusy(null);
      }
    },
    [busy, pushToast],
  );

  const opts = { activeOnly };

  return (
    <motion.div
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      className="no-print mb-1 flex flex-wrap items-center gap-1.5 rounded-lg border border-[#D4AF37]/30 bg-white/95 px-2 py-1.5 shadow-sm sm:gap-2 sm:px-3"
      role="region"
      aria-label="Ripoti za PDF za muundo"
    >
      <span className="text-[10px] font-bold uppercase tracking-wide text-[#0B1F3A] sm:text-[11px]">
        Ripoti rasmi
      </span>
      <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-700 sm:text-xs">
        <input
          type="checkbox"
          className="rounded border-slate-300"
          checked={activeOnly}
          onChange={(e) => setActiveOnly(e.target.checked)}
          disabled={Boolean(busy)}
        />
        Active tu
      </label>
      {(
        [
          {
            key: "dayosisi" as const,
            label: "Dayosisi",
            fn: () => exportDioceseExecutivePdf(dayosisi, majimbo, opts),
          },
          {
            key: "majimbo" as const,
            label: "Majimbo",
            fn: () => exportJimboSummaryPdf(dayosisi, majimbo, opts),
          },
          {
            key: "matawi" as const,
            label: "Matawi",
            fn: () => exportTawiSummaryPdf(dayosisi, majimbo, matawi, opts),
          },
        ] as const
      ).map(({ key, label, fn }) => (
        <button
          key={key}
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void runExport(key, fn)}
          className="inline-flex items-center gap-1 rounded-lg border border-[#0B1F3A]/20 bg-[#0B1F3A] px-2 py-1 text-[10px] font-semibold text-[#D4AF37] hover:bg-[#123C69] disabled:opacity-60 sm:px-2.5 sm:text-xs"
        >
          {busy === key ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          ) : (
            <FileDown className="h-3 w-3 shrink-0" aria-hidden />
          )}
          {label}
        </button>
      ))}
    </motion.div>
  );
}
