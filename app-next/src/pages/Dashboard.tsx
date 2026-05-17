/**
 * Dashibodi ya zamani imeondolewa — tumia Injini ya Ngazi (iframe) kupitia AppLayout.
 * Faili hii hubaki kwa ulinganifu wa viungo vya zamani (lazy import / bookmarks).
 */
import { useEffect } from "react";
import { MASTER_BRANCH_ENGINE_SUBMODULE } from "../lib/masterBranchEngineHub";

export function Dashboard() {
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("kmt-portal-navigate", {
        detail: { moduleKey: "dashboard", submodule: MASTER_BRANCH_ENGINE_SUBMODULE },
      }),
    );
  }, []);

  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl bg-[#f4f7fb] p-8 text-slate-600"
      role="status"
      aria-live="polite"
    >
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#0B3C5D] border-t-transparent" aria-hidden />
      <p className="text-sm font-medium">Inapakia Dashibodi Kuu mpya (Injini ya Ngazi)…</p>
    </div>
  );
}
