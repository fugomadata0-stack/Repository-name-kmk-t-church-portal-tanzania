import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import type { DayosisiRecord, JimboRecord, TawiRecord } from "../../types";
import { usePortal } from "../../context/PortalContext";
import {
  exportDioceseExecutivePdf,
  exportJimboSummaryPdf,
  exportTawiSummaryPdf,
} from "../../lib/kmktHierarchyReportsPdf";

type Props = {
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
};

export function MasterBranchPdfToolbar({ dayosisi, majimbo, matawi }: Props) {
  const { pushToast } = usePortal();
  const [pdfKind, setPdfKind] = useState<null | "dayosisi" | "jimbo" | "tawi">(null);
  const [pdfActiveOnly, setPdfActiveOnly] = useState(false);

  const active = (s: string) => {
    const x = String(s).toLowerCase();
    return x !== "inactive" && x !== "archived" && x !== "suspended";
  };

  const hasActiveDs = dayosisi.some((d) => active(d.status));
  const hasActiveJb = majimbo.some((j) => active(j.status));
  const hasActiveTw = matawi.some((t) => active(t.status));
  const pdfOpts = { activeOnly: pdfActiveOnly };

  async function runPdf(kind: "dayosisi" | "jimbo" | "tawi") {
    setPdfKind(kind);
    try {
      if (kind === "dayosisi") await exportDioceseExecutivePdf(dayosisi, majimbo, pdfOpts);
      else if (kind === "jimbo") await exportJimboSummaryPdf(dayosisi, majimbo, pdfOpts);
      else await exportTawiSummaryPdf(dayosisi, majimbo, matawi, pdfOpts);
      pushToast("PDF imepakuliwa.", "success");
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Imeshindikana kupakia PDF.", "error");
    } finally {
      setPdfKind(null);
    }
  }

  return (
    <details className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white backdrop-blur-sm">
      <summary className="cursor-pointer text-xs font-semibold text-amber-100">Ripoti PDF za ngazi (Dayosisi · Jimbo · Matawi)</summary>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <label className="flex cursor-pointer items-center gap-2 text-[11px] text-cyan-50">
          <input
            type="checkbox"
            checked={pdfActiveOnly}
            onChange={(e) => setPdfActiveOnly(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/30"
          />
          Active pekee
        </label>
        {(["dayosisi", "jimbo", "tawi"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            disabled={
              pdfKind !== null ||
              (kind === "dayosisi" && (pdfActiveOnly ? !hasActiveDs : dayosisi.length === 0)) ||
              (kind === "jimbo" && (pdfActiveOnly ? !hasActiveJb : majimbo.length === 0)) ||
              (kind === "tawi" && (pdfActiveOnly ? !hasActiveTw : matawi.length === 0))
            }
            onClick={() => void runPdf(kind)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold hover:bg-white/20 disabled:opacity-50"
          >
            {pdfKind === kind ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            PDF — {kind === "dayosisi" ? "Dayosisi" : kind === "jimbo" ? "Majimbo" : "Matawi"}
          </button>
        ))}
      </div>
    </details>
  );
}
